# QRTO API 명세서

QRTO(QR 주문) 프론트엔드가 백엔드와 연동하기 위해 필요한 REST API 명세서다.
프론트엔드 코드(`src/store/`)의 동작을 근거로, 현재 목업(`src/store/data.ts`)으로 처리되는 부분과
QR URL 세션 해석(`src/store/session.tsx`), 화면 흐름(`src/store/components/*`)에서 도출되는
모든 연동 지점을 API로 정리했다.

> 관련 배경 문서: [`GEARING.md`](./GEARING.md) — QR URL 스킴/개인정보 정책/보안 고려사항.
> 이 문서는 그 위에서 **실제 호출 가능한 엔드포인트 스펙**을 정의한다.

---

## 목차

1. [공통 규약](#1-공통-규약)
2. [데이터 모델](#2-데이터-모델)
3. [API 목록 요약](#3-api-목록-요약)
4. [매장 컨텍스트 조회](#4-매장-컨텍스트-조회)
5. [메뉴 조회](#5-메뉴-조회)
6. [주문 생성](#6-주문-생성)
7. [주문 내역 조회](#7-주문-내역-조회)
8. [결제](#8-결제)
9. [직원 호출 · 0원(무료) 주문](#9-직원-호출--0원무료-주문)
10. [에러 코드](#10-에러-코드)
11. [프론트 매핑 표](#11-프론트-매핑-표)

---

## 1. 공통 규약

### Base URL

```
https://api.qrto.example.com
```

모든 경로는 `/api` 프리픽스를 사용한다.

### 공통 요청 헤더

| 헤더 | 필수 | 설명 |
| --- | --- | --- |
| `Content-Type` | POST/PUT 시 | `application/json` |
| `Accept` | 권장 | `application/json` |
| `X-Store-Id` | 선택 | 매장 식별자(경로 파라미터로도 전달, 중복 시 경로 우선) |

> 프론트엔드는 별도의 사용자 로그인/인증 토큰이 없다. 손님은 QR로만 진입하며,
> 매장·테이블·포장 컨텍스트는 URL 쿼리 파라미터(`store`, `table`, `togo`)로 전달된다.
> (인증 없이 접근 가능한 대신, 서버는 반드시 컨텍스트를 검증해야 한다 — [10. 에러 코드](#10-에러-코드) 참조)

### 공통 응답 형식

성공 응답은 각 API의 스키마를 그대로 반환한다. 에러는 다음 공통 형식을 따른다.

```json
{
  "error": {
    "code": "STORE_NOT_FOUND",
    "message": "존재하지 않는 매장입니다.",
    "detail": null
  }
}
```

### 공통 규칙

- **금액은 항상 서버가 재계산**한다. 프론트가 전송한 합계(`total`)를 신뢰하지 않는다.
- **금액 단위**: 원(KRW), 정수. 소수점 없음.
- **시간**: ISO 8601 (`2026-07-15T18:30:00+09:00`).
- **문자 인코딩**: UTF-8.

---

## 2. 데이터 모델

프론트 내부 타입(`src/store/data.ts`, `src/store/session.tsx`) 기준으로 매핑한다.

### Store (매장)

| 필드 | 타입 | 설명 | 프론트 소스 |
| --- | --- | --- | --- |
| `storeId` | string | 매장 식별자 (URL `store`) | `session.storeId` |
| `storeName` | string | 매장 표시명 | `session.storeName` (현재 `STORE_NAMES` 하드코딩) |

### Session (주문 컨텍스트)

QR URL에서 해석되는 세션. `mode`에 따라 필드가 달라진다.

```ts
// src/session.tsx
type StoreSession =
  | { storeId: string; storeName: string; mode: 'table'; tableNumber: number }
  | { storeId: string; storeName: string; mode: 'togo' }
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `mode` | `"table"` \| `"togo"` | 테이블 주문 / 포장(픽업) 주문 |
| `tableNumber` | number | `table` 모드에서만. 양의 정수 |
| `phone` | string | `togo` 모드. 전체 번호(예: `01012345678`). sessionStorage 보관 |
| `phoneLast4` | string | `togo` 모드. 전화번호 뒷 4자리(픽업 식별자). URL엔 이 값만 남음 |

### Product (상품)

```ts
// src/data.ts
type Product = {
  id: string
  name: string
  price: number      // 0원 가능 (직원 호출/물/수저)
  description: string
  image: string      // 로컬 import → API 연동 시 imageUrl(원격 URL)로 대체
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 상품 식별자 (예: `m1`, `e1`) |
| `name` | string | 상품명 |
| `price` | number | 가격(원). `0`이면 무료 상품 |
| `description` | string | 상품 설명 (프론트에서 2줄 말줄임 표시) |
| `imageUrl` | string | 상품 이미지 원격 URL |
| `soldOut` | boolean | 품절 여부 (신규 필드, 선택) |

### Tab (탭)

프론트는 `menu`(메뉴) / `etc`(기타) 두 탭으로 상품을 분류한다.

```ts
type TabKey = 'menu' | 'etc'
```

### CartItem / OrderItem (주문 항목)

```json
{ "itemId": "m1", "quantity": 2 }
```

수량이 1 이상인 항목만 주문에 포함된다(프론트 `CartScreen`이 0개 항목을 제외).

---

## 3. API 목록 요약

| # | 메서드 | 경로 | 설명 | 화면 |
| --- | --- | --- | --- | --- |
| 4 | GET | `/api/stores/{storeId}/context` | 매장/테이블/포장 컨텍스트 검증 | 앱 진입(`SessionProvider`) |
| 5 | GET | `/api/stores/{storeId}/menu` | 메뉴/기타 상품 목록 | `OrderScreen` |
| 6 | POST | `/api/stores/{storeId}/orders` | 주문 생성 | `CartScreen` → 결제 |
| 7 | GET | `/api/stores/{storeId}/orders` | 주문 내역 조회 | `HistoryScreen` |
| 8.1 | POST | `/api/orders/{orderId}/payment/confirm` | 결제 완료 처리 | `PayScreen` |
| 8.2 | GET | `/api/orders/{orderId}` | 단일 주문 상태 조회 | `PayScreen` 폴링(선택) |
| 9 | POST | `/api/stores/{storeId}/staff-calls` | 직원 호출(0원) | `OrderScreen` 기타 탭 |

---

## 4. 매장 컨텍스트 조회

QR 진입 직후(`SessionProvider`), URL 파라미터가 유효한지 검증하고 매장명/영업 상태를 받는다.
현재 프론트의 하드코딩 매장명(`STORE_NAMES`)과 기본값 폴백(`store=eulji`, `table=2`)을 대체한다.

### 요청

```
GET /api/stores/{storeId}/context
```

**테이블 주문**

```
GET /api/stores/eulji/context?table=2
```

**포장 주문**

```
GET /api/stores/eulji/context?mode=togo
```

| 쿼리 | 필수 | 값 | 설명 |
| --- | --- | --- | --- |
| `table` | 테이블 주문 시 | 양의 정수 | 테이블 번호 |
| `mode` | 포장 주문 시 | `togo` | 포장 주문 플래그 (`?togo`도 허용) |

### 응답 `200 OK`

```json
{
  "storeId": "eulji",
  "storeName": "을지포차",
  "mode": "table",
  "tableNumber": 2,
  "open": true,
  "acceptingOrders": true
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `storeName` | string | 헤더에 표시할 매장명 (프론트 `STORE_NAMES` 대체) |
| `mode` | `"table"` \| `"togo"` | 검증된 주문 방식 |
| `tableNumber` | number | `table` 모드에서만 |
| `open` | boolean | 영업 중 여부. `false`면 주문 차단 화면 노출 |
| `acceptingOrders` | boolean | 주문 접수 가능 여부(영업 중이어도 일시 중단 가능) |

### 에러

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 404 | `STORE_NOT_FOUND` | 존재하지 않는 매장 |
| 404 | `TABLE_NOT_FOUND` | 존재하지 않는 테이블 번호 |
| 409 | `STORE_CLOSED` | 영업 종료 매장 |

> ⚠️ 현재 프론트는 `store`/`table`을 검증 없이 신뢰한다. 실서비스에서는 이 API로
> 유효성/영업 여부를 반드시 검증하고, 무효 시 폴백하지 말고 에러 화면을 노출해야 한다.

---

## 5. 메뉴 조회

`src/store/data.ts`의 `MENU_ITEMS`/`ETC_ITEMS` 목업을 대체한다. `OrderScreen`이 탭별로 렌더링한다.

### 요청

```
GET /api/stores/{storeId}/menu
```

### 응답 `200 OK`

```json
{
  "tabs": [
    {
      "key": "menu",
      "label": "메뉴",
      "items": [
        {
          "id": "m1",
          "name": "소세지 야채볶음",
          "price": 8500,
          "description": "맛있는 소세지와 양파, 파프리카 등 각종 채소들로 건강하면서 맛있는 소세지 야채볶음.",
          "imageUrl": "https://cdn.qrto.example.com/eulji/food.png",
          "soldOut": false
        }
      ]
    },
    {
      "key": "etc",
      "label": "기타",
      "items": [
        {
          "id": "e1",
          "name": "직원 호출",
          "price": 0,
          "description": "팁 주세요.",
          "imageUrl": "https://cdn.qrto.example.com/eulji/staff-call.png",
          "soldOut": false
        },
        {
          "id": "e2",
          "name": "물",
          "price": 0,
          "description": "신선하고 깨끗한 탄천에서 건져올린 금붕어가 든 물. 개수 늘려서 추가 가능.",
          "imageUrl": "https://cdn.qrto.example.com/eulji/water.png",
          "soldOut": false
        }
      ]
    }
  ]
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `tabs[].key` | `"menu"` \| `"etc"` | 프론트 `TabKey`와 일치 |
| `tabs[].label` | string | 탭 표시명 (`메뉴` / `기타`) |
| `tabs[].items[]` | Product[] | 해당 탭 상품 목록 |

**주의**

- 프론트 `Product.image`(로컬 import)를 `imageUrl`(원격 URL)로 대체해야 한다.
- `price: 0` 항목(직원 호출/물/수저)은 무료 주문 흐름을 지원해야 한다([9](#9-직원-호출--0원무료-주문) 참조).

---

## 6. 주문 생성

`CartScreen`에서 "결제하기"를 누를 때 호출한다. `table`/`togo` 공통 엔드포인트이며
바디의 `mode`로 식별 컨텍스트를 구분한다. 금액은 **서버가 재계산**한다.

### 요청

```
POST /api/stores/{storeId}/orders
```

**테이블 주문**

```json
{
  "mode": "table",
  "tableNumber": 2,
  "items": [
    { "itemId": "m1", "quantity": 2 },
    { "itemId": "m2", "quantity": 1 }
  ]
}
```

**포장(togo) 주문**

```json
{
  "mode": "togo",
  "phone": "01012345678",
  "phoneLast4": "5678",
  "items": [
    { "itemId": "m1", "quantity": 1 }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `mode` | `"table"` \| `"togo"` | ✅ | 주문 방식 |
| `tableNumber` | number | `table`일 때 | 테이블 번호 |
| `phone` | string | `togo`일 때 | 전체 번호(`010` + 8자리). 프론트 sessionStorage 보관값 |
| `phoneLast4` | string | `togo`일 때 | 뒷 4자리(픽업 식별자) |
| `items` | array | ✅ | 수량 1 이상 항목만. 최소 1개 |

### 응답 `201 Created`

```json
{
  "orderId": "ord_01H...",
  "orderNo": "A-17",
  "amount": 17000,
  "paymentRequired": true,
  "status": "pending_payment"
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `orderId` | string | 주문 고유 ID (후속 결제/조회 키) |
| `orderNo` | string | 사람이 읽는 주문번호(픽업 호출용, 뒷자리 충돌 대비 병행 권장) |
| `amount` | number | **서버 재계산** 결제 금액(원) |
| `paymentRequired` | boolean | `true`면 결제 화면, `false`면 0원 주문 즉시 완료 |
| `status` | string | 주문 상태 ([상태값](#주문-상태값) 참조) |

### 주문 상태값

| status | 설명 |
| --- | --- |
| `pending_payment` | 결제 대기 (유료 주문) |
| `paid` | 결제 완료 |
| `preparing` | 준비 중 |
| `ready` | 픽업/서빙 준비 완료 |
| `completed` | 완료 |
| `canceled` | 취소 |

### 에러

| 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | `EMPTY_CART` | `items`가 비어 있음 |
| 404 | `ITEM_NOT_FOUND` | 존재하지 않는 상품 ID |
| 409 | `ITEM_SOLD_OUT` | 품절 상품 포함 |
| 409 | `STORE_NOT_ACCEPTING` | 주문 접수 중단 상태 |
| 422 | `INVALID_PHONE` | 포장 주문인데 전화번호 형식 오류 |

---

## 7. 주문 내역 조회

`HistoryScreen`용. 헤더 우상단 "주문내역" 버튼으로 진입한다.
테이블은 `tableNumber`, 포장은 `phoneLast4`(또는 전체 번호)로 조회한다.

### 요청

```
GET /api/stores/{storeId}/orders
```

**테이블 주문 내역**

```
GET /api/stores/eulji/orders?mode=table&tableNumber=2
```

**포장 주문 내역**

```
GET /api/stores/eulji/orders?mode=togo&phone=01012345678
```

| 쿼리 | 필수 | 설명 |
| --- | --- | --- |
| `mode` | ✅ | `table` \| `togo` |
| `tableNumber` | `table`일 때 | 테이블 번호 |
| `phone` | `togo`일 때 | 전체 번호(뒷자리 충돌 방지 위해 전체 번호 권장) |

### 응답 `200 OK`

```json
{
  "orders": [
    {
      "orderId": "ord_01H...",
      "orderNo": "A-17",
      "status": "preparing",
      "amount": 17000,
      "createdAt": "2026-07-15T18:30:00+09:00",
      "items": [
        {
          "itemId": "m1",
          "name": "소세지 야채볶음",
          "price": 8500,
          "quantity": 2,
          "imageUrl": "https://cdn.qrto.example.com/eulji/food.png"
        }
      ]
    }
  ]
}
```

주문이 없으면 `{ "orders": [] }`를 반환한다(프론트는 "주문내역이 없어요." 표시).

---

## 8. 결제

`PayScreen`은 현재 PG 연동 없는 "결제가 완료되면 결제 완료 버튼을 눌러주세요" 대기 화면이다.
아래는 최소 연동안이며, 실제 PG 연동 방식(리다이렉트/SDK/웹훅)은 확정 필요.

### 8.1 결제 완료 처리

`PayScreen`의 "결제 완료" 버튼(`onComplete`) 클릭 시 호출.

```
POST /api/orders/{orderId}/payment/confirm
```

요청 바디(예시 — PG 규약에 따라 달라짐):

```json
{
  "paymentMethod": "manual",
  "pgTransactionId": null
}
```

응답 `200 OK`:

```json
{
  "orderId": "ord_01H...",
  "status": "paid",
  "paidAt": "2026-07-15T18:32:10+09:00"
}
```

> ⚠️ "완료 버튼"만으로 결제를 신뢰하지 말 것. 실제로는 PG 웹훅/서버 검증으로
> `paid` 전이를 확정해야 한다(클라이언트 버튼은 UX 트리거일 뿐).

### 8.2 주문 상태 조회 (선택 — 폴링)

결제 완료 화면 전환을 서버 상태로 확정하려면 폴링/SSE로 상태를 확인한다.

```
GET /api/orders/{orderId}
```

응답:

```json
{
  "orderId": "ord_01H...",
  "orderNo": "A-17",
  "status": "paid",
  "amount": 17000
}
```

---

## 9. 직원 호출 · 0원(무료) 주문

기타 탭의 `직원 호출`/`물`/`수저`는 `price: 0`이다. 프론트 `handlePay`는
`total > 0`이면 결제 화면, `total === 0`이면 무료 주문으로 분기한다(현재 완료 화면 TODO).

**옵션 A — 통합 주문 API 사용 (권장)**

[6. 주문 생성](#6-주문-생성)을 그대로 사용하되, 서버가 `amount === 0`이면
`paymentRequired: false`, `status: "completed"`(또는 `ready`)로 즉시 처리한다.
프론트는 결제 화면을 건너뛰고 완료 화면으로 이동한다.

**옵션 B — 직원 호출 전용 API**

즉각적인 호출 알림(주방/홀 알림)이 필요하면 별도 엔드포인트를 둔다.

```
POST /api/stores/{storeId}/staff-calls
```

```json
{
  "mode": "table",
  "tableNumber": 2,
  "reason": "직원 호출"
}
```

응답 `202 Accepted`:

```json
{ "callId": "call_01H...", "acknowledged": true }
```

> 프론트는 아직 무료 주문 완료 화면이 미구현(`StoreApp.handlePay` TODO)이다.
> 완료 화면 디자인 확정 후 응답 규약을 맞춘다.

---

## 10. 에러 코드

| HTTP | code | 설명 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 요청 형식 오류 |
| 400 | `EMPTY_CART` | 주문 항목 없음 |
| 404 | `STORE_NOT_FOUND` | 매장 없음 |
| 404 | `TABLE_NOT_FOUND` | 테이블 없음 |
| 404 | `ITEM_NOT_FOUND` | 상품 없음 |
| 404 | `ORDER_NOT_FOUND` | 주문 없음 |
| 409 | `STORE_CLOSED` | 영업 종료 |
| 409 | `STORE_NOT_ACCEPTING` | 주문 접수 중단 |
| 409 | `ITEM_SOLD_OUT` | 품절 |
| 422 | `INVALID_PHONE` | 전화번호 형식 오류 |
| 429 | `RATE_LIMITED` | 요청 과다(QR 스팸 방지) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

에러 응답 형식:

```json
{
  "error": {
    "code": "STORE_CLOSED",
    "message": "영업이 종료되었습니다.",
    "detail": null
  }
}
```

---

## 11. 프론트 매핑 표

현재 프론트의 하드코딩/목업을 어떤 API가 대체하는지 정리한다.

| 프론트 위치 | 현재 상태 | 대체 API |
| --- | --- | --- |
| `src/store/session.tsx` `STORE_NAMES` | 매장명 하드코딩(`eulji → 을지포차`) | [4. 컨텍스트](#4-매장-컨텍스트-조회) `storeName` |
| `src/store/session.tsx` 기본값 폴백 | `store=eulji`, `table=2` | [4. 컨텍스트](#4-매장-컨텍스트-조회) 검증 후 무효 시 에러 |
| `src/store/data.ts` `MENU_ITEMS`/`ETC_ITEMS` | 상품 목업 | [5. 메뉴](#5-메뉴-조회) |
| `src/store/data.ts` `Product.image` | 로컬 import | 메뉴 응답 `imageUrl` |
| `CartScreen` → `handlePay` | 결제 화면 이동만 | [6. 주문 생성](#6-주문-생성) + [8. 결제](#8-결제) |
| `PayScreen` `onComplete` | 빈 콜백 | [8.1 결제 완료](#81-결제-완료-처리) |
| `HistoryScreen` | 빈 상태("주문내역이 없어요") | [7. 주문 내역](#7-주문-내역-조회) |
| `PhoneEntryModal` `onSubmit` | sessionStorage 저장 + URL 갱신 | 주문 생성 시 `phone`/`phoneLast4` 전송 |
| `handlePay` 0원 분기 TODO | 미구현 | [9. 무료 주문](#9-직원-호출--0원무료-주문) |

---

## 부록: 프론트 주문 흐름 요약

**테이블 주문**

```
QR 스캔(?store=&table=) → [4]컨텍스트 검증 → [5]메뉴 → 장바구니
  → [6]주문 생성 → [8]결제 → 완료
```

**포장(togo) 주문**

```
QR 스캔(?store=&togo) → [4]컨텍스트 검증 → 전화번호 입력 모달(010+8자리)
  → sessionStorage 전체번호 저장 + URL을 ?togo=5678로 갱신
  → [5]메뉴 → 장바구니 → [6]주문 생성(phone 포함) → [8]결제 → 완료
```

- 포장은 전화번호 입력 전까지 장바구니/결제/주문내역 진행 불가(`phoneGate = togo && !phone`).
- 헤더 라벨: 테이블 `홀 2번 테이블`, 포장 `5678-픽업`(입력 전 `NULL-픽업`).
