# QRTO API 연동 현황

이 문서는 **손님용 주문 앱(`src/`)이 실제로 호출하는 API**를 코드 기준으로 정리한다.
API의 정식 사양(요청/응답 스키마, 에러 코드 전체, 포스·관리자 API 포함)은 백엔드팀이 관리하는
**Notion "QRTO API 명세서 (v2)"**가 소스오브트루스다 — 이 문서는 그 정본을 대체하지 않는다.

> ⚠️ 이 저장소의 이전 `API_SPEC.md`/`GEARING.md`는 백엔드 구현 전 "설계 제안" 단계에 프론트 혼자
> 작성한 문서였다(`?store=&table=` 쿼리 방식, `X-Store-Id` 헤더 등 — 전부 실제 구현과 다름).
> 명세서 v2 확정(2026-09-09) 이후 아래 내용으로 교체했다.

## Base URL

| 환경 | 값 |
| --- | --- |
| 운영 | `https://api.lapy.shop` — 명세서 문구와 무관하게 항상 이 값 ([`.env.production`](.env.production)) |
| 로컬 개발 | `http://localhost:8080` ([`src/lib/config.ts`](src/lib/config.ts) 기본값, `VITE_API_BASE_URL`로 덮어쓰기 가능) |
| WebSocket | `wss://api.lapy.shop/ws` (로컬 `ws://localhost:8080/ws`) — `VITE_WS_BASE_URL` 로 덮어쓰기 가능, 기본은 API_BASE_URL에서 자동 파생 |

## 연동된 엔드포인트 (`/api/customer/**`, 전부 구현됨)

| 메서드 | 경로 | 프론트 함수 | 쓰이는 곳 |
| --- | --- | --- | --- |
| GET | `/api/customer/entry/table/{qrToken}` | `qrEntry` | [`session.tsx`](src/session.tsx) — QR `/order?token=` 진입 |
| GET | `/api/customer/entry/pickup/{pickupToken}` | `pickupEntry` | `session.tsx` — QR `/pickup?token=` 진입 |
| GET | `/api/customer/menu-board?token=` | `menuBoard` | [`StoreApp.tsx`](src/components/StoreApp.tsx) |
| POST | `/api/customer/orders` | `createOrder` | `StoreApp.tsx` — 주문 생성 |
| GET | `/api/customer/orders/{orderId}?token=` | `getOrder` | (현재 화면에서 직접 호출 안 함 — 명세서 정의 함수만 준비됨) |
| GET | `/api/customer/orders/by-table?token=` | `ordersByTable` | `StoreApp.tsx` — 주문내역(테이블) |
| GET | `/api/customer/orders/by-phone?token=&phoneNumber=` | `ordersByPhone` | `StoreApp.tsx` — 주문내역(포장) |
| PATCH | `/api/customer/orders/{orderId}/cancel?token=` | `cancelOrder` | `StoreApp.tsx` — 결제대기 화면 이탈 시 자동 취소 |
| POST | `/api/customer/staff-calls` | `callStaff` | `StoreApp.tsx` — 직원 호출 |
| GET | `/api/customer/payments/config` | `paymentConfig` | (준비됨, 현재 화면에서 mode 분기는 안 함 — mock 전제) |
| POST | `/api/customer/payments/confirm` | `confirmPayment` | `StoreApp.tsx` — "결제 완료" 버튼 |

전부 [`src/lib/endpoints.ts`](src/lib/endpoints.ts)에 있다. 요청/응답 타입은 [`src/lib/dto.ts`](src/lib/dto.ts).

## WebSocket (손님 — 내 주문 상태 실시간)

[`src/lib/realtime.ts`](src/lib/realtime.ts)의 `subscribeOrderStatus(entryToken, orderId, onUpdate)`.
`StoreApp.tsx`가 주문이 생성되는 즉시 구독을 시작해서, 결제 확정(RECEIVED) → 조리중 → 조리완료 →
서빙/픽업 · 취소 · 청산까지의 상태 변화를 `DoneScreen`/`HistoryScreen`에 그대로 반영한다.

## 메뉴 사진 (2026-09-11 명세서 "사진 업로드 API" 반영)

메뉴 사진 업로드(`POST /api/pos/menus/{menuId}/image`)는 **POS 쪽 API**라 이 저장소(손님용 앱) 범위 밖이다
(POS/관리자 화면은 별도 레포에서 작업 중). 이 저장소가 신경 쓰는 건 **읽는 쪽**뿐이고, 이미 대응되어 있다:

- `menu-board` 응답의 `imageUrl`은 이제 S3 절대 URL(`https://…s3.ap-northeast-2.amazonaws.com/…`)이다.
  [`assetUrl()`](src/lib/config.ts)이 `https://`로 시작하는 값은 그대로 통과시키므로 코드 변경 불필요.
- `imageUrl`이 `null`이면 명세서는 "플레이스홀더"를 제안하지만, 이 앱은 **사진 박스 자체를 생략**한다
  (의도적 결정 — [`ProductCard.tsx`](src/components/ProductCard.tsx) 참고).

## 명시적으로 안 하는 것

- **결제 live 모드(실제 PG)**: `payments/config`의 `mode`가 `live`여도 분기하지 않는다 — 현재는 항상
  mock 흐름(주문 생성 → "결제 완료" 버튼 → `payments/confirm`)만 탄다. 실제 PG 연동(Toss SDK 등)이
  필요해지면 별도 작업.
- **포스(`/api/pos/**`)·관리자(`/api/admin/**`) API**: 이 저장소는 손님용 주문 앱만 포함한다.

## 에러 코드

응답 envelope `{ success:false, error:{ code, message } }`의 `message`를 그대로 사용자에게 보여준다
([`src/lib/api.ts`](src/lib/api.ts)의 `ApiError`). 코드 전체 목록·의미는 Notion 명세서 참고.
