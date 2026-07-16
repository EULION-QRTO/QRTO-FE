# 을지포차 POS — 백엔드 API 명세서

프론트엔드(Next.js POS) 코드 구조를 분석하여 도출한, 백엔드가 제공해야 하는 API 목록입니다.
현재 프론트는 대부분의 데이터를 목업(`lib/mockData.ts`)과 클라이언트 상태로만 다루고 있으며, 이 문서는 그 목업/상태 조작을 실제 백엔드 API로 대체하기 위한 명세입니다.

---

## 1. 공통 규약

### 1.1 기본 정보
| 항목 | 값 |
| --- | --- |
| Base URL | `/api` |
| 프로토콜 | HTTPS |
| 요청/응답 포맷 | `application/json` (이미지 업로드는 `multipart/form-data`) |
| 문자셋 | UTF-8 |
| 시간 표기 | epoch milliseconds (숫자) — 프론트가 `Date.now()` 기반으로 처리 |
| 통화 | 원(KRW), 정수 |

### 1.2 인증 방식
- 로그인 성공 시 `pos_session` 쿠키(HMAC-SHA256 서명 토큰)를 발급한다.
- 쿠키 속성: `HttpOnly`, `SameSite=Lax`, `Secure`(운영), `Path=/`, `Max-Age=43200`(12시간).
- 토큰 페이로드: `{ storeId, exp }`. 서버는 매 요청마다 서명과 만료(`exp`)를 검증한다.
- **매장 격리(멀티테넌시):** 모든 매장 리소스 API는 토큰의 `storeId` 기준으로만 접근 가능하다. URL의 `storeId`와 토큰의 `storeId`가 불일치하면 `403`.

### 1.3 공통 응답 / 에러 포맷
성공:
```json
{ "data": { ... } }
```
에러:
```json
{ "error": "사람이 읽을 수 있는 메시지" }
```

| HTTP 상태 | 의미 |
| --- | --- |
| 200 | 성공 |
| 201 | 생성 성공 |
| 204 | 성공(본문 없음) |
| 400 | 잘못된 요청(유효성 실패) |
| 401 | 미인증(세션 없음/만료) |
| 403 | 권한 없음(다른 매장 리소스 접근) |
| 404 | 리소스 없음 |
| 409 | 상태 충돌(예: 이미 정리된 테이블) |
| 500 | 서버 오류 |

---

## 2. 데이터 모델

프론트 `lib/types.ts` / `lib/accounts.ts` 기준.

### Store (매장)
```ts
{
  storeId: string;      // 식별자(서브도메인/경로), 예: "euljiro"
  storeName: string;    // 표시명, 예: "을지로 본점"
  tableCount: number;   // 테이블 개수 (1~60)
}
```

### SettlementAccount (정산 계좌)
```ts
{
  bank: string;    // 은행명, 예: "국민은행"
  number: string;  // 계좌번호 ('-' 포함 가능, 숫자 위주)
  holder: string;  // 예금주
}
```

### MenuItem (메뉴)
```ts
{
  id: string;
  name: string;
  price: number;    // >= 0
  image?: string;   // 이미지 URL (업로드 결과)
}
```

### OrderItem (주문 항목)
```ts
{
  name: string;
  qty: number;    // >= 1
  price: number;  // 단가, 0 가능(서비스/기본 제공)
}
```

### Table (테이블)
```ts
{
  id: number;
  number: number;         // 테이블 번호
  order: TableOrder | null;   // null 이면 빈 테이블
}
// TableOrder: { items: OrderItem[]; startedAt: number /* epoch ms */ }
```

### WaitingOrder (대기 주문 — 주방/픽업 큐)
```ts
{
  id: string;
  type: "dine-in" | "takeout";
  tableNumber?: number;   // dine-in 일 때
  orderNo?: string;       // takeout 일 때 주문번호, 예: "P-1043"
  pickupAt?: number;      // takeout 픽업 예정 시각(epoch ms)
  items: OrderItem[];
  createdAt: number;
  stage: "received" | "preparing" | "cooked" | "picked-up";
}
```
- 상태 흐름
  - `dine-in`: `received → preparing → cooked`(완료 시 큐에서 제거)
  - `takeout`: `received → preparing → cooked → picked-up`(완료 시 큐에서 제거)

---

## 3. 인증 API

### 3.1 로그인
> 이미 구현됨: `app/api/login/route.ts`

`POST /api/login`

Request:
```json
{ "username": "euljiro", "password": "1234" }
```
Response `200`:
```json
{ "storeId": "euljiro", "storeName": "을지로 본점" }
```
- 성공 시 `pos_session` 쿠키 발급.
- 실패: `401 { "error": "아이디 또는 비밀번호가 올바르지 않습니다." }`
- 본문 파싱 실패: `400 { "error": "잘못된 요청입니다." }`

### 3.2 로그아웃
> 이미 구현됨: `app/api/logout/route.ts`

`POST /api/logout`

Response `200`: `{ "ok": true }` — `pos_session` 쿠키 만료 처리.

### 3.3 현재 세션 조회
`GET /api/session`

Response `200`:
```json
{ "storeId": "euljiro", "storeName": "을지로 본점" }
```
- 세션 없음/만료: `401`.
- 용도: 새로고침/진입 시 로그인 상태 확인(`app/page.tsx`, `app/store/[storeId]/page.tsx` 서버 검증 대체 또는 보완).

---

## 4. 매장 · 설정 API

### 4.1 매장 정보 조회
`GET /api/store`

Response `200`:
```json
{ "storeId": "euljiro", "storeName": "을지로 본점", "tableCount": 12 }
```
- 용도: `Header`의 매장명 표시, 초기 로드.

### 4.2 테이블 개수 변경
> 프론트 `PosApp.setTableCount` / `AdminPanel` 테이블 스테퍼 (1~60)

`PUT /api/store/tables/count`

Request:
```json
{ "count": 10 }
```
Response `200`:
```json
{ "tableCount": 10 }
```
- 유효성: `1 ≤ count ≤ 60`.
- **주의:** 개수를 줄이면 잘려나가는 뒷번호 테이블의 진행중 주문도 함께 삭제된다(프론트 안내 문구와 동일). 백엔드가 해당 테이블 주문을 정리해야 한다.

---

## 5. 정산 계좌 API

> 프론트 `AdminPanel` 정산 계좌 섹션. 고객 주문 후 송금 안내에 사용.

### 5.1 정산 계좌 조회
`GET /api/store/settlement-account`

Response `200`:
```json
{ "bank": "국민은행", "number": "12345678901234", "holder": "홍길동" }
```
- 미등록 시: `{ "bank": "", "number": "", "holder": "" }`.

### 5.2 정산 계좌 저장
`PUT /api/store/settlement-account`

Request:
```json
{ "bank": "국민은행", "number": "12345678901234", "holder": "홍길동" }
```
Response `200`: 저장된 계좌 객체.
- 유효성: `bank`, `number`, `holder` 모두 비어 있지 않아야 함(`400`).

---

## 6. 메뉴 관리 API

> 프론트 `AdminPanel` 메뉴 관리 / `PosApp` add·update·deleteMenuItem.

### 6.1 메뉴 목록 조회
`GET /api/menus`

Response `200`:
```json
{
  "menus": [
    { "id": "m1", "name": "소세지 야채볶음", "price": 8500, "image": null },
    { "id": "m2", "name": "김치찌개", "price": 9000, "image": null }
  ]
}
```

### 6.2 메뉴 추가
`POST /api/menus`

Request:
```json
{ "name": "제육볶음", "price": 11000, "image": "https://.../img.jpg" }
```
Response `201`: 생성된 `MenuItem`.
- 유효성: `name` 필수, `price ≥ 0`.

### 6.3 메뉴 수정
`PATCH /api/menus/{menuId}`

Request(부분 수정 허용):
```json
{ "name": "제육볶음(특)", "price": 12000, "image": "https://.../img2.jpg" }
```
Response `200`: 수정된 `MenuItem`.
- `image`를 `null`로 보내면 이미지 제거.

### 6.4 메뉴 삭제
`DELETE /api/menus/{menuId}`

Response `204`.

### 6.5 메뉴 이미지 업로드
> 현재 프론트는 이미지를 data URL로 인라인 저장. 운영에서는 파일 업로드 후 URL 반환 권장.

`POST /api/uploads/menu-image`  (`multipart/form-data`, 필드명 `file`, `image/*`)

Response `200`:
```json
{ "url": "https://cdn.../menu/abc.jpg" }
```

---

## 7. 테이블 · 현장(dine-in) 주문 API

> 프론트 `TableCard`, `OrderDetailModal`, `PosApp.tables`.

### 7.1 테이블 현황 목록
`GET /api/tables`

Response `200`:
```json
{
  "tables": [
    { "id": 1, "number": 1, "order": {
        "items": [{ "name": "소세지 야채볶음", "qty": 1, "price": 8500 }],
        "startedAt": 1700000000000
    }},
    { "id": 2, "number": 2, "order": null }
  ]
}
```
- 용도: 테이블 그리드, 사용중/전체 카운트, 현장 매출 합계 계산.

### 7.2 특정 테이블 주문 상세
`GET /api/tables/{tableId}`

Response `200`: 단일 `Table` 객체(주문 항목 + `startedAt`).
- 용도: `OrderDetailModal`.

### 7.3 테이블 정리(주문 종료/결제 완료)
> 프론트 `PosApp.clearTable`, `OrderDetailModal` "테이블 정리".

`POST /api/tables/{tableId}/clear`

Response `200`:
```json
{ "id": 5, "number": 5, "order": null }
```
- 주문을 종료하고 매출/정산에 확정 반영, 테이블을 빈 상태로 전환.
- 이미 빈 테이블: `409`.

---

## 8. 대기 주문(주방/픽업 큐) API

> 프론트 `Sidebar`, `WaitingOrderCard`, `PosApp.waiting` / `setStage`.

### 8.1 대기 주문 목록
`GET /api/orders/waiting`

Query(선택): `?type=dine-in|takeout`

Response `200`:
```json
{
  "orders": [
    {
      "id": "w1", "type": "dine-in", "tableNumber": 3,
      "items": [{ "name": "소세지 야채볶음", "qty": 1, "price": 8500 }],
      "createdAt": 1700000000000, "stage": "received"
    },
    {
      "id": "t1", "type": "takeout", "orderNo": "P-1043",
      "pickupAt": 1700000900000,
      "items": [{ "name": "제육볶음 도시락", "qty": 2, "price": 9000 }],
      "createdAt": 1700000000000, "stage": "received"
    }
  ]
}
```
- 완료 상태(`dine-in=cooked`, `takeout=picked-up`)에 도달한 주문은 목록에서 제외.
- `createdAt` 내림차순(최신 우선) 정렬 권장.

### 8.2 대기 주문 상태 변경
> 프론트 `WaitingOrderCard` 상태 셀렉트 → `setStage`.

`PATCH /api/orders/{orderId}/stage`

Request:
```json
{ "stage": "preparing" }
```
Response `200`: 갱신된 `WaitingOrder`.
- 허용값: 주문 `type`에 따라 `STAGES_BY_TYPE`
  - `dine-in`: `received | preparing | cooked`
  - `takeout`: `received | preparing | cooked | picked-up`
- 완료 상태(`cooked` for dine-in, `picked-up` for takeout)로 전이 시 큐에서 제거됨(응답에 `{ "removed": true }` 포함 권장).
- 허용되지 않는 상태값: `400`.

### 8.3 (고객용) 신규 주문 생성
> 현재 프론트는 `sampleNewOrders`로 신규 주문 도착을 시뮬레이션. 실제로는 고객 QR 주문이 이 엔드포인트로 유입되어 대기 큐에 쌓인다.

`POST /api/orders`

Request(dine-in):
```json
{
  "type": "dine-in",
  "tableNumber": 7,
  "items": [
    { "name": "김치찌개", "qty": 1, "price": 9000 },
    { "name": "공기밥", "qty": 1, "price": 1000 }
  ]
}
```
Request(takeout):
```json
{
  "type": "takeout",
  "pickupAt": 1700001200000,
  "items": [{ "name": "골뱅이무침", "qty": 1, "price": 15000 }]
}
```
Response `201`: 생성된 `WaitingOrder`(서버가 `id`, `createdAt`, `stage="received"`, takeout이면 `orderNo` 발급).
- dine-in 주문 생성 시 해당 테이블(`order`)에도 반영.

---

## 9. 매출 · 통계 API

> 프론트 `AdminPanel` "오늘 매출", `Header` 오늘 매출. 현재는 테이블/대기 주문에서 클라이언트가 계산.

### 9.1 오늘 매출 요약
`GET /api/stats/sales/today`

Response `200`:
```json
{
  "dineInSales": 250000,
  "takeoutSales": 84000,
  "totalSales": 334000,
  "orderCount": 14,
  "averageOrderValue": 23857
}
```
- `totalSales = dineInSales + takeoutSales`
- `averageOrderValue = round(totalSales / orderCount)`(`orderCount=0`이면 0)
- 용도: 관리자 요약 카드 및 헤더 오늘 매출.

---

## 10. 실시간 신규 주문 알림 (선택/권장)

> 프론트 `PosApp`가 `setInterval`로 신규 주문 도착을 폴링/시뮬레이션 중. 실제 서비스에서는 서버 푸시로 대체 권장.

옵션 A — Server-Sent Events:
`GET /api/orders/stream` → `text/event-stream`
```
event: order.created
data: { WaitingOrder }

event: order.updated
data: { WaitingOrder }

event: table.updated
data: { Table }
```

옵션 B — WebSocket: `wss://.../ws?storeId=...`, 위와 동일한 이벤트 페이로드 전송.

폴백: 실시간 채널을 두지 않을 경우 프론트는 `GET /api/tables`와 `GET /api/orders/waiting`를 주기적으로(예: 15초) 폴링.

---

## 11. 엔드포인트 요약

| 메서드 | 경로 | 설명 | 상태 |
| --- | --- | --- | --- |
| POST | `/api/login` | 로그인 | ✅ 구현됨 |
| POST | `/api/logout` | 로그아웃 | ✅ 구현됨 |
| GET | `/api/session` | 현재 세션 조회 | 신규 |
| GET | `/api/store` | 매장 정보 | 신규 |
| PUT | `/api/store/tables/count` | 테이블 개수 변경 | 신규 |
| GET | `/api/store/settlement-account` | 정산 계좌 조회 | 신규 |
| PUT | `/api/store/settlement-account` | 정산 계좌 저장 | 신규 |
| GET | `/api/menus` | 메뉴 목록 | 신규 |
| POST | `/api/menus` | 메뉴 추가 | 신규 |
| PATCH | `/api/menus/{menuId}` | 메뉴 수정 | 신규 |
| DELETE | `/api/menus/{menuId}` | 메뉴 삭제 | 신규 |
| POST | `/api/uploads/menu-image` | 메뉴 이미지 업로드 | 신규 |
| GET | `/api/tables` | 테이블 현황 목록 | 신규 |
| GET | `/api/tables/{tableId}` | 테이블 주문 상세 | 신규 |
| POST | `/api/tables/{tableId}/clear` | 테이블 정리 | 신규 |
| GET | `/api/orders/waiting` | 대기 주문 목록 | 신규 |
| PATCH | `/api/orders/{orderId}/stage` | 대기 주문 상태 변경 | 신규 |
| POST | `/api/orders` | 신규 주문 생성(고객) | 신규 |
| GET | `/api/stats/sales/today` | 오늘 매출 요약 | 신규 |
| GET | `/api/orders/stream` | 실시간 주문 스트림(SSE) | 선택 |
