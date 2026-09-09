# GEARING.md — QR 진입 · 세션 규약

손님용 주문 앱이 QR 스캔 URL을 해석해 **테이블 주문 / 포장(픽업) 주문**을 구분하는 방식을 정리한다.

> ⚠️ 이 문서의 이전 버전은 백엔드 구현 전 `?store=&table=` 쿼리 파라미터 방식으로 설계를 제안했던
> 문서였다 — 실제로 구현된 방식과 다르다. 아래는 현재 코드([`src/session.tsx`](src/session.tsx))
> 기준 실제 동작이다. API 상세는 [`API_SPEC.md`](API_SPEC.md)와 Notion "QRTO API 명세서 (v2)" 참고.

## QR URL 스킴

경로(path)로 주문 방식을, `?token=`으로 매장/테이블(또는 매장 픽업)을 식별한다 — 쿼리 파라미터로
매장을 지정하던 옛 방식과 달리, 토큰 자체가 매장·테이블을 가리키므로 별도 매장 식별자가 없다.

| 주문 방식 | URL | 백엔드 호출 |
| --- | --- | --- |
| 테이블(DINE_IN) | `https://lapy.shop/order?token={qrToken}` | `GET /api/customer/entry/table/{qrToken}` |
| 포장(TAKEOUT) | `https://lapy.shop/pickup?token={pickupToken}` | `GET /api/customer/entry/pickup/{pickupToken}` |

`token`이 없거나 진입 조회가 실패하면(유효하지 않은 QR, 영업 종료 등) "QR 코드를 다시 스캔해 주세요"
안내 화면을 보여준다 (`session.tsx`의 `parseEntry`/`SessionProvider`).

## 세션 모델

```ts
// src/session.tsx
type StoreSession =
  | { storeName: string; mode: 'table'; qrToken: string; tableName: string }
  | { storeName: string; mode: 'togo'; pickupToken: string; takeoutEnabled: boolean }
```

`storeId`/`tableId`는 세션에 없다 — 명세서 v2부터 손님 쪽 API는 `storeId` 없이 토큰만으로 동작한다
(메뉴판·주문·직원호출·주문내역 전부 `qrToken`/`pickupToken`을 그대로 넘긴다). API 호출 시 필요한
토큰은 `entryToken(session)` 헬퍼로 구한다.

## 전화번호(포장 주문) 처리

- 포장 주문은 손님이 전화번호를 입력해야 메뉴 화면에 진입할 수 있다 (`phoneGate`, `PhoneEntryModal`).
- 전체 번호는 **`sessionStorage`에만** 보관한다 (`qrto:phone:{pickupToken}` 키) — URL에는 절대 남기지
  않는다. 새로고침해도 같은 `pickupToken`이면 `sessionStorage`에서 복원되어 모달을 다시 안 띄운다.
- 주문 생성(`POST /api/customer/orders`)·주문내역 조회(`GET .../orders/by-phone`)에 전체 번호를
  그대로 실어 보낸다. 서버 응답의 `phoneNumber`는 마스킹(`**-****-5678`)되어 온다.
- 헤더에 보이는 라벨은 뒷 4자리만 노출한다 (`phoneLast4()`).

## 주문 흐름 요약

```
QR 스캔 → entry API로 세션 구성
  → (포장이면) 전화번호 입력 모달
  → 메뉴 → 장바구니 → 주문 생성
      · 합계 0원 → 바로 접수(RECEIVED), 결제 화면 건너뜀
      · 유료 → 결제대기(PENDING_PAYMENT) → "결제 완료" 버튼 → payments/confirm → 접수
  → 완료 화면 (WebSocket으로 상태 실시간 갱신: 조리중 → 조리완료 → 서빙/픽업)
```

결제대기 화면에서 뒤로가기를 누르면 서버에 남는 주문을 실제로 취소한다
(`PATCH /api/customer/orders/{id}/cancel`) — 화면만 바꾸고 서버 주문을 방치하지 않는다.
