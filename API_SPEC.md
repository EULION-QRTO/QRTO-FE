# QRTO API 연동 현황

이 문서는 **손님용 주문 앱(`src/`)이 실제로 호출하는 API**를 코드 기준으로 정리한다.
API의 정식 사양(요청/응답 스키마, 에러 코드 전체, 포스·관리자 API 포함)은 백엔드팀이 관리하는
**Notion "QRTO API 명세서"**가 소스오브트루스다 — 이 문서는 그 정본을 대체하지 않는다.

> ⚠️ 이 저장소의 이전 `API_SPEC.md`/`GEARING.md`는 백엔드 구현 전 "설계 제안" 단계에 프론트 혼자
> 작성한 문서였다(`?store=&table=` 쿼리 방식, `X-Store-Id` 헤더 등 — 전부 실제 구현과 다름).
> 명세서 v2 확정(2026-09-09) 이후 아래 내용으로 교체했고, 2026-09-13 결제 PG 전환(토스→페이앱)을
> 2026-09-14에 반영했다.

## Base URL

| 환경 | 값 |
| --- | --- |
| 운영 | `https://api.lapy.shop` — 명세서 문구와 무관하게 항상 이 값 ([`.env.production`](.env.production)) |
| 로컬 개발 | `http://localhost:8080` ([`src/lib/config.ts`](src/lib/config.ts) 기본값, `VITE_API_BASE_URL`로 덮어쓰기 가능) |
| WebSocket | `wss://api.lapy.shop/ws` (로컬 `ws://localhost:8080/ws`) — `VITE_WS_BASE_URL` 로 덮어쓰기 가능, 기본은 API_BASE_URL에서 자동 파생 |

> 명세서의 CORS 허용 오리진은 `https://lpay-order.vercel.app`(손님) — 실제 배포 도메인이 이거라면
> `.env.production`/배포 설정을 맞춰야 한다. 이 저장소 코드 자체는 특정 프론트 도메인을 하드코딩하지
> 않는다.

## 연동된 엔드포인트 (`/api/customer/**`, 전부 구현됨)

| 메서드 | 경로 | 프론트 함수 | 쓰이는 곳 |
| --- | --- | --- | --- |
| GET | `/api/customer/entry/table/{qrToken}` | `qrEntry` | [`session.tsx`](src/session.tsx) — QR `/order?token=` 진입 |
| GET | `/api/customer/entry/pickup/{pickupToken}` | `pickupEntry` | `session.tsx` — QR `/pickup?token=` 진입 |
| GET | `/api/customer/menu-board?token=` | `menuBoard` | [`StoreApp.tsx`](src/components/StoreApp.tsx) |
| POST | `/api/customer/orders` | `createOrder` | `StoreApp.tsx` — 주문 생성 |
| GET | `/api/customer/orders/{orderId}?token=` | `getOrder` | `StoreApp.tsx` — 페이앱 결제창에서 복귀(`?orderId=`) 시 주문 상태 확인 |
| GET | `/api/customer/orders/by-table?token=` | `ordersByTable` | `StoreApp.tsx` — 주문내역(테이블) |
| GET | `/api/customer/orders/by-phone?token=&phoneNumber=` | `ordersByPhone` | `StoreApp.tsx` — 주문내역(포장) |
| PATCH | `/api/customer/orders/{orderId}/cancel?token=` | `cancelOrder` | `StoreApp.tsx` — 결제대기 화면 이탈 시 자동 취소 |
| POST | `/api/customer/staff-calls` | `callStaff` | `StoreApp.tsx` — 직원 호출 |
| POST | `/api/customer/payments/request` | `requestPayment` | `StoreApp.tsx` — "결제하기" 버튼(결제 링크 발급) |

`payments/payapp/feedback`은 페이앱 서버가 우리 백엔드로 직접 호출하는 서버간 API라 프론트는 절대
호출하지 않는다(명세서에도 "손님앱·포스앱은 호출하지 않는다"고 명시).

전부 [`src/lib/endpoints.ts`](src/lib/endpoints.ts)에 있다. 요청/응답 타입은 [`src/lib/dto.ts`](src/lib/dto.ts).

## 결제 흐름 (페이앱, 2026-09-13 PG 전환 반영)

토스 목업 방식(`payments/config`+`payments/confirm`, 손님앱이 직접 결제완료 판정)이 완전히
사라지고, 결제 완료는 **페이앱 서버의 통보로만** 이루어지는 구조로 바뀌었다. 손님앱에는 PG
SDK·클라이언트 키가 없다.

```
StoreApp "결제하기" 클릭
  → POST /api/customer/payments/request { orderId, token }
    · mock: 외부 이동 없이 즉시 { status:"PAID" } → DoneScreen
    · live: { status:"REQUESTED", payUrl } → window.location.href = payUrl 로 전체 페이지 이동
        (페이앱 결제창에서 카드·카카오페이·네이버페이·토스페이 결제)
  → 결제 완료 시 페이앱이 서버로 통보(payapp/feedback, 우리가 관여 안 함)
    → 주문 RECEIVED 전환
  → 페이앱이 {front}/order?token={qrToken}&orderId={id} (포장은 /pickup) 로 브라우저를 되돌려보냄
  → session.tsx 가 ?orderId= 를 감지 → StoreApp이 그 주문을 조회해 상태 확인
    · PENDING_PAYMENT면 PaymentCheckScreen("결제 확인 중")에서 대기
    · WebSocket(/topic/orders/{orderId})으로 STATUS_CHANGED 수신 즉시 DoneScreen으로 전환
    · CANCELED면 안내 후 메뉴 화면으로
```

관련 코드: [`src/lib/dto.ts`](src/lib/dto.ts)(`PaymentRequestRequest`/`PaymentResponse`),
[`src/session.tsx`](src/session.tsx)(`parseEntry`의 `orderId`, `stripOrderIdParam`),
[`src/components/StoreApp.tsx`](src/components/StoreApp.tsx),
[`src/components/PaymentCheckScreen.tsx`](src/components/PaymentCheckScreen.tsx).

1,000원 미만 유료 주문은 `400 P005`로 거부된다(페이앱 최소 결제금액). 0원 주문(물·수저 등)은 원래대로
결제 없이 생성 즉시 `RECEIVED`.

## WebSocket (손님 — 내 주문 상태 실시간)

[`src/lib/realtime.ts`](src/lib/realtime.ts)의 `subscribeOrderStatus(entryToken, orderId, onUpdate)`.
`StoreApp.tsx`가 주문이 생성되는 즉시(또는 결제창 복귀 시) 구독을 시작해서, 결제 확정(RECEIVED) →
조리중 → 조리완료 → 서빙/픽업 · 취소 · 청산까지의 상태 변화를 화면에 그대로 반영한다.

## 메뉴 사진 (2026-09-11 명세서 "사진 업로드 API" 반영)

메뉴 사진 업로드(`POST /api/pos/menus/{menuId}/image`)는 **POS 쪽 API**라 이 저장소(손님용 앱) 범위 밖이다
(POS/관리자 화면은 별도 레포에서 작업 중). 이 저장소가 신경 쓰는 건 **읽는 쪽**뿐이고, 이미 대응되어 있다:

- `menu-board` 응답의 `imageUrl`은 이제 S3 절대 URL(`https://…s3.ap-northeast-2.amazonaws.com/…`)이다.
  [`assetUrl()`](src/lib/config.ts)이 `https://`로 시작하는 값은 그대로 통과시키므로 코드 변경 불필요.
- `imageUrl`이 `null`이면 명세서는 "플레이스홀더"를 제안하지만, 이 앱은 **사진 박스 자체를 생략**한다
  (의도적 결정 — [`ProductCard.tsx`](src/components/ProductCard.tsx) 참고).

## 명시적으로 안 하는 것

- **포스(`/api/pos/**`)·관리자(`/api/admin/**`) API**: 이 저장소는 손님용 주문 앱만 포함한다.

## 에러 코드

응답 envelope `{ success:false, error:{ code, message } }`의 `message`를 그대로 사용자에게 보여준다
([`src/lib/api.ts`](src/lib/api.ts)의 `ApiError`). 코드 전체 목록·의미는 Notion 명세서 참고.
