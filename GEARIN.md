# GEARIN.md — 을지포차 POS 프로젝트 기록

QR 테이블오더 서비스의 **점주용 POS** 웹앱. `DESIGN.md`의 디자인 시스템을 기반으로 Next.js(App Router + TypeScript)로 구현했다. 이 문서는 지금까지 구축한 내용·구조·의사결정을 기록한다.

- **기준 기기**: iPad 11" landscape (1194 × 834pt) / 반응형 대응
- **테마**: 고객 화면 계승 — 오렌지 포인트(#FF6B2C), 화이트 카드, 라운드 코너, 미니멀 플랫
- **디자인 원본**: `DESIGN.md` 참조

---

## 1. 실행 방법

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 + 타입체크
```

**데모 계정** (아이디 / 비밀번호 = `1234`)

| storeId | 아이디 | 주점명 |
|---|---|---|
| euljiro | euljiro | 을지로 본점 |
| hongdae | hongdae | 홍대점 |
| gangnam | gangnam | 강남점 |

진입점 `/` → 세션 있으면 `/store/{storeId}`, 없으면 `/login` 으로 이동.

---

## 2. 인증 / 접근 제어 구조 (핵심)

각 주점 POS는 로그인해야 접근할 수 있고, **URL 조작으로 다른 주점 POS에 접근할 수 없다.**

```
로그인(/login)
  └─ /api/login : 아이디·비번 검증 → HMAC 서명 세션 쿠키(httpOnly) 발급
       └─ /store/[storeId] : 해당 주점 POS 화면
```

### 2중 방어

1. **`middleware.ts`** — `/store/*` 진입 시 세션 쿠키의 `storeId` 와 URL 의 `storeId` 를 대조.
   불일치·미로그인이면 서버 단에서 `/login` 으로 리다이렉트(클라이언트 우회 불가).
   - 미로그인 → `/login?reason=auth`
   - 타 주점 접근 → `/login?reason=forbidden`
2. **`app/store/[storeId]/page.tsx`** — 서버 컴포넌트에서 세션을 한 번 더 재검증.

### URL 조작 차단 원리
- 세션 쿠키는 `HMAC-SHA256` 으로 서명(`lib/session.ts`)되어 클라이언트가 `storeId` 를 위조할 수 없다.
- 로그인 시 `storeId` 는 사용자가 고르는 게 아니라 **계정 정보에서 결정** → 자기 주점 URL로만 연결.
- `crypto.subtle` 사용으로 Edge 미들웨어 / Node 라우트 핸들러 양쪽에서 동일하게 동작.

### 검증 완료 시나리오

| 시나리오 | 기대/결과 |
|---|---|
| 미로그인으로 `/store/euljiro` | 307 → `/login?reason=auth` ✅ |
| 미로그인으로 `/` | 307 → `/login` ✅ |
| 잘못된 비밀번호 | 401 ✅ |
| 정상 로그인 | 200 + 서명 쿠키 발급 ✅ |
| 본인 주점 `/store/euljiro` | 200 (POS 표시) ✅ |
| URL 조작으로 `/store/hongdae` | 307 → `/login?reason=forbidden` ✅ |

---

## 3. 화면 / 기능

### 3.1 테이블 현황 (메인)
- **테이블 그리드**: 빈 테이블(무채색, 번호만) / 사용중(오렌지 톤 + 좌측 바 + 주문 미리보기 "외 N건" + 합계). 60분+ 경과 시 경고 배지.
- 테이블 탭 → **주문 상세 모달** → `테이블 정리`(destructive) → 확인 다이얼로그 → 빈 테이블 복귀.
- `auto-fill minmax` 그리드로 매장별 테이블 수 대응.

### 3.2 사이드바 — 현장 / 포장 주문 대기
- 상/하 고정 2분할, 각 독립 스크롤, 실시간 배지 카운트.
- 신규 주문 도착 시 리스트 최상단 삽입 + 하이라이트 애니메이션(데모 시뮬레이션 20초 주기).
- **상태 변경은 드롭다운(`<select>`)** 으로, 상태별 색상 전환:
  - 현장(dine-in): `주문 접수 → 준비중 → 조리완료(완료 처리, 목록 제거)`
  - 포장(takeout): `주문 접수 → 준비중 → 조리완료 → 픽업완료(완료 처리, 목록 제거)`
  - 유형별 최종 상태(`TERMINAL_STAGE`) 선택 시 목록에서 제거.
- 시간 표시는 현장·포장 모두 **"N분 전"**(접수 후 경과), 15분+ 경고색.

### 3.3 관리자 탭
- **오늘 매출만** 표시(기간 필터 없음): 총 매출 + 현장/포장 매출 + 주문 건수 + 평균 객단가.
- **테이블 개수 설정**: 오렌지 스테퍼(− n +, 1~60). 번호 기준으로 기존 주문 유지, 줄이면 뒷번호 주문도 삭제.
- **메뉴 관리**: 추가 / 이름·가격 인라인 수정 / 삭제.
  - **사진 선택 첨부**: 44×44 썸네일 picker. `FileReader` → data URL 저장(데모). ✕ 로 제거.

### 3.4 헤더
- 좌: 로고(을지포차) + 주점명 / 우: 오늘 매출 위젯, 새로고침, 세그먼트 탭 `[테이블 현황][관리자]`, 로그아웃.

---

## 4. 반응형 (DESIGN.md §5)

| 브레이크포인트 | 레이아웃 |
|---|---|
| ≥ 1024px | 메인/사이드바 2컬럼, 테이블 4~5열 |
| 768–1023px | 테이블 3열, 사이드바 축소(min 280px) |
| < 768px | 세로 스택, 사이드바가 현장/포장 세그먼트 탭으로 전환, 테이블 2열 |

---

## 5. 파일 구조

```
app/
  layout.tsx              # 루트 레이아웃, Pretendard, 메타/뷰포트
  globals.css             # 디자인 토큰(:root) + 전 컴포넌트 스타일
  page.tsx                # 진입점: 세션 기반 리다이렉트(서버)
  login/page.tsx          # 로그인 화면(client)
  store/[storeId]/page.tsx# 주점 POS(server, 세션 재검증) → PosApp
  api/login/route.ts      # 로그인: 계정 검증 + 서명 쿠키 발급
  api/logout/route.ts     # 로그아웃: 쿠키 삭제
components/
  PosApp.tsx              # POS 전체 상태 오케스트레이션(client)
  Header.tsx              # 헤더 + 세그먼트 탭 + 로그아웃
  TableCard.tsx           # 테이블 카드(빈/사용중/경고)
  Sidebar.tsx             # 현장/포장 섹션 + 모바일 세그먼트 전환
  WaitingOrderCard.tsx    # 대기 주문 카드 + 상태 드롭다운
  OrderDetailModal.tsx    # 주문 상세 + 테이블 정리 확인
  AdminPanel.tsx          # 오늘 매출 / 테이블 설정 / 메뉴 관리(사진 picker)
lib/
  types.ts                # 도메인 타입 + 상태 라벨/전이 상수 + 포맷 유틸
  mockData.ts             # 초기 테이블/대기주문/메뉴 목업
  time.ts                 # 경과/시각 포맷 유틸
  accounts.ts             # 주점 계정 목업 "DB"
  session.ts              # HMAC 서명 세션 발급/검증
middleware.ts             # /store/* 접근 강제 검사
DESIGN.md                 # 디자인 시스템 원본
GEARIN.md                 # (본 문서) 프로젝트 기록
```

---

## 6. 디자인 토큰 요약 (`app/globals.css :root`)

- **컬러**: primary `#FF6B2C` / bg `#F5F5F7` / surface `#FFFFFF` / 상태(empty·occupied·new-order·warning·done·complete)
- **타이포**: display 28 / title 20 / body 16 / caption 13 / badge 12 (Pretendard)
- **라운드**: card 20px / pill 999px / chip 12px
- **스페이싱**: xs 4 / sm 8 / md 16 / lg 24 / xl 32
- 터치 타겟 최소 44×44

---

## 7. 데이터 모델 (`lib/types.ts`)

- `Table { id, number, order }`, `TableOrder { items, startedAt }`
- `OrderItem { name, qty, price }`
- `MenuItem { id, name, price, image? }` — `image` 는 선택 첨부(data URL)
- `WaitingOrder { id, type, tableNumber?/orderNo?/pickupAt?, items, createdAt, stage, isNew? }`
- `WaitStage = received | preparing | cooked | picked-up`
- `STAGES_BY_TYPE`, `TERMINAL_STAGE`, `STAGE_LABEL` 상수로 유형별 흐름 정의
- `StoreAccount { storeId, username, password, storeName }` (`lib/accounts.ts`)

---

## 8. 서버 연동 명세 (전체 기능 실서버化)

> 목표: 현재 in-memory 목업(`lib/mockData.ts` / `PosApp` 로컬 상태)으로 동작하는 **모든 기능**을 실서버와 연동한다.
> 주문·결제·매출·메뉴는 **서버가 단일 진실 원천(SSOT)**, 클라이언트(POS/고객앱) 로컬 상태는 서버 데이터의 캐시/뷰로만 취급한다.

### 8.0 서비스 구조 (핵심 전제)

**QR 선주문·선결제** 방식. 결제는 고객이 주문하는 순간 고객 앱에서 완료되며, **POS에는 결제 화면·정산 기능이 없다.**

```
[고객 주문 앱]  ← 별도 도메인 (예: order.example.com / {storeId}.order.example.com)
   │  ① QR 스캔 → 테이블 식별
   │  ② 메뉴 조회(POS가 등록한 메뉴/가격/사진을 그대로 노출)
   │  ③ 주문 + 선결제(PG) 를 한 트랜잭션으로 처리
   ▼
[공통 백엔드 / DB]  ← 메뉴·주문·결제·매출의 SSOT
   ▲                               │
   │ ⑤ 메뉴 등록/수정(POS→고객앱)    │ ④ 주문 생성/결제완료 push (고객앱→POS)
   │                               ▼
[점주용 POS]  ← 본 저장소 (별도 도메인, 예: pos.example.com / {storeId}.pos.example.com)
      · 실시간 주문 수신 · 조리상태 전이 · 메뉴 관리 · 매출 확인 · 테이블 정리
```

- **주문 흐름**: 고객앱이 주문+결제를 생성 → 백엔드 → POS로 실시간 push. POS는 주문을 **생성하지 않고 수신·처리(상태 전이)** 만 한다.
- **메뉴 흐름**: POS가 상품/가격/사진을 등록·수정 → 백엔드 → 고객 주문 페이지에 즉시 반영.
- **테이블 정리**: POS에서 테이블을 정리하면 **해당 테이블에 연결된 QR 세션의 주문 내역이 초기화**된다(다음 손님을 위한 리셋). 결제는 이미 주문 시점에 끝났으므로 정리는 정산이 아니라 **세션 리셋**이다.
- **도메인 분리**: 고객 앱과 POS는 서로 다른 도메인. 백엔드/DB만 공유. CORS·인증 경계를 도메인별로 구분.

### 8.0.1 연동 원칙

- **읽기/쓰기(CRUD)**: REST(JSON) — `/api/*` Route Handler를 백엔드 프록시 또는 자체 API로 구성.
- **실시간(신규 주문·상태 변경·정리)**: WebSocket 또는 SSE. 현재 20초 시뮬레이션(`PosApp` `sampleNewOrders`)을 **서버 push**로 교체.
- **인증**: 모든 API는 세션 쿠키(§2, HMAC)로 `storeId` 를 도출하고, **요청 body의 storeId를 신뢰하지 않는다**(URL·본문 조작 차단). 고객 앱은 QR 토큰으로 테이블/매장을 식별(POS 세션과 별개 인증 경계).
- **멱등성/정합성**: 정리·상태전이·주문생성은 서버 상태 기준으로 검증(이중 정리·중복 주문 방지). 쓰기 요청에 멱등키 권장.
- **금액 계산은 서버 권위**: `orderTotal` 등 프론트 계산은 표시용. 실제 결제·매출 금액은 서버가 확정(고객 결제 시점).

### 8.1 인증 / 세션 (현재: 목업 → 실서버)

| 항목 | 현재 | 연동 후 |
|---|---|---|
| 계정 저장소 | `lib/accounts.ts` 평문 배열 | **DB + bcrypt/argon2 해시** |
| 로그인 검증 | `findAccount()` 문자열 비교 | `POST /api/login` → 백엔드 인증 API |
| 세션 비밀키 | `lib/session.ts` dev fallback | `POS_SESSION_SECRET` 환경변수 (필수) |
| storeId 도출 | 계정 정보 | 동일. 서브도메인 전환 시 `middleware.ts` 에서 **host 기반 도출** |
| 접근 제어 | `middleware.ts` + 서버 컴포넌트 재검증 | 유지. API에도 동일 세션 검사 적용 |

- 관련 파일: `app/api/login/route.ts`, `app/api/logout/route.ts`, `lib/session.ts`, `lib/accounts.ts`, `middleware.ts`

### 8.2 API 엔드포인트 (제안)

경로는 백엔드가 소유하고, **POS 측 계약**과 **고객 앱 측 계약**을 구분한다. POS 경로는 세션의 `storeId` 스코프, 고객 앱 경로는 QR 토큰 스코프.

#### (A) POS 측 (본 저장소가 호출)

**테이블 / 매장 설정**
- `GET  /api/store/{storeId}/tables` — 테이블 목록 + 현재 주문(초기 로드, `initialTables` 대체)
- `PATCH /api/store/{storeId}/settings/table-count` `{ count }` — 테이블 개수 변경(`setTableCount` 대체). 축소 시 뒷번호 테이블 처리 규칙 확정
- `POST /api/store/{storeId}/tables/{tableId}/clear` — **테이블 정리 = QR 세션 리셋**(`clearTable` 대체). 서버가 해당 테이블에 연결된 QR 주문 세션의 주문 내역을 초기화 → 고객 앱의 해당 QR 주문 화면도 빈 상태로 전환. 결제는 이미 완료된 상태이므로 정산 아님

**주문 (수신·처리만 — POS는 생성하지 않음)**
- `GET  /api/store/{storeId}/orders?status=waiting` — 대기 주문 목록(`initialWaiting` 대체)
- `PATCH /api/store/{storeId}/orders/{orderId}/stage` `{ stage }` — 조리 상태 전이(`setStage` 대체). 유형별 흐름(`STAGES_BY_TYPE`)·최종 상태(`TERMINAL_STAGE`) 서버 검증
- 완료(`cooked`/`picked-up`) 처리 시 서버가 목록에서 제외
- ※ 주문 **생성**은 고객 앱 담당(§B). POS엔 주문 생성/결제 UI 없음

**메뉴 (POS가 등록 → 고객 앱에 반영되는 원본)**
- `GET  /api/store/{storeId}/menu` — 메뉴 목록(`initialMenu` 대체)
- `POST /api/store/{storeId}/menu` — 추가(`addMenuItem`)
- `PATCH /api/store/{storeId}/menu/{id}` — 이름·가격·이미지 수정(`updateMenuItem`)
- `DELETE /api/store/{storeId}/menu/{id}` — 삭제(`deleteMenuItem`). 고객 앱 노출/품절 처리 정책 확정(숨김 vs 삭제)
- `POST /api/store/{storeId}/uploads/menu-image` — **이미지 업로드**. 현재 `FileReader` data URL(`AdminPanel.readImage`) → **스토리지 업로드 후 URL 저장**으로 교체. `MenuItem.image` 를 data URL → 원격 URL로 변경
- 메뉴 변경 시 서버가 고객 앱 캐시 무효화/실시간 반영 트리거

**정산 계좌 (매장 설정 — POS가 등록 → 고객 송금 안내로 노출)**
- `GET  /api/store/{storeId}/settings/account` — 등록된 정산 계좌 조회(초기 로드, `initialAccount` 대체)
- `PATCH /api/store/{storeId}/settings/account` `{ bank, number, holder }` — 정산 계좌 저장(`AdminPanel` 저장 버튼 → `onSaveAccount` 대체). 서버 유효성 검증(은행/계좌번호/예금주 필수, 계좌번호 형식). 저장 성공 시 고객 앱 송금 안내에 즉시 반영
- 계좌번호는 민감정보 — **저장 시 마스킹/암호화, 응답 시 부분 마스킹** 정책 확정. 고객 앱엔 송금에 필요한 형태로만 노출
- 계좌 변경 시 서버가 고객 앱 캐시 무효화

**매출 / 통계**
- `GET  /api/store/{storeId}/sales/today` — 오늘 매출 요약(총/현장/포장/건수/객단가). 현재 `salesSummary` 프론트 집계 → **서버 집계**로 이관(고객 결제 확정 기준이라야 정확)
- (확장) `GET /api/store/{storeId}/sales?from&to` — 기간 통계(현재 UI엔 없음, 서버 준비 권장)

#### (B) 고객 주문 앱 측 (별도 도메인 — 본 저장소 밖, 계약만 기록)

- `GET  /api/qr/{qrToken}/session` — QR 스캔 시 매장/테이블 식별 + 현재 주문 세션(정리되면 빈 상태)
- `GET  /api/qr/{qrToken}/menu` — 고객에게 노출할 메뉴(POS가 등록한 §A 메뉴 원본)
- `GET  /api/qr/{qrToken}/account` — **송금 안내용 정산 계좌**(POS가 등록한 §A 계좌). 주문 후 송금 화면에 은행/계좌번호/예금주 표시
- `POST /api/qr/{qrToken}/orders` `{ items }` — **주문 + 결제를 한 트랜잭션으로 처리**. 결제 방식이 **계좌 송금**이면 주문 생성 후 위 정산 계좌로 송금 안내 → 입금 확인(수동/PG 가상계좌) 후 확정, PG 간편결제면 승인 성공 시 확정. 확정된 주문만 POS로 push
- 결제수단(계좌 송금/카드·간편결제), 입금 확인·취소·환불, 영수증 발급은 **고객 앱/백엔드 책임**(POS 무관)

### 8.3 실시간 이벤트 (WebSocket / SSE)

`PosApp` 의 시뮬레이션·폴링을 서버 push로 대체. 채널은 `storeId` 스코프.

| 이벤트 | 방향 | 페이로드 | POS 반영 |
|---|---|---|---|
| `order.created` | 고객앱→POS | WaitingOrder(결제 완료 상태) | 대기 리스트 최상단 삽입 + `isNew` 하이라이트, 현장이면 테이블 카드에도 반영 |
| `order.stage_changed` | 서버→POS | `{ orderId, stage }` | 카드 상태/색상 갱신, 최종 상태면 제거 |
| `table.cleared` | POS→서버→고객앱 | `{ tableId }` | POS 테이블 빈 상태 복귀, 고객 QR 주문 화면 초기화 |
| `menu.updated` | POS→서버→고객앱 | MenuItem[] 또는 delta | POS·고객앱 양쪽 메뉴 목록 갱신 |
| `account.updated` | POS→서버→고객앱 | SettlementAccount | 고객앱 송금 안내 계좌 갱신(주로 캐시 무효화로 충분) |
| `sales.updated` | 서버→POS | SalesSummary | 오늘 매출 위젯 갱신(결제/정리 발생 시) |

- 결제 완료(PG 승인)는 고객 앱/백엔드에서 처리되고, POS는 그 결과인 `order.created` 만 수신한다(POS는 결제 이벤트를 직접 다루지 않음).
- 연결 관리(재접속·백오프), 오프라인 시 REST 폴백, 이벤트 순서/중복 처리(서버 시퀀스·버전) 고려.

### 8.4 프론트 교체 지점 (파일별 체크리스트)

- [ ] `lib/mockData.ts` — `initialTables` / `initialWaiting` / `initialMenu` / `sampleNewOrders` 전부 제거, 서버 fetch로 대체
- [ ] `components/PosApp.tsx`
  - [ ] 초기 상태 `useState(initial…)` → 서버 로드(서버 컴포넌트 prefetch 또는 SWR/React Query)
  - [ ] `setStage` → `PATCH …/stage` 호출 + 낙관적 업데이트/롤백
  - [ ] `clearTable` → `POST …/clear`(QR 세션 리셋 = 고객 주문 내역 초기화)
  - [ ] `setTableCount` → `PATCH …/table-count`
  - [ ] `addMenuItem`/`updateMenuItem`/`deleteMenuItem` → 각 메뉴 API
  - [ ] `account`/`onSaveAccount` → `GET`/`PATCH …/settings/account` 연동(초기 로드 + 저장)
  - [ ] 신규 주문 시뮬레이션 `useEffect` 제거 → 실시간 구독으로 교체
  - [ ] `salesSummary` 프론트 집계 → 서버 매출 API 결과 사용
- [ ] `components/AdminPanel.tsx`
  - [ ] `readImage`(data URL) → 업로드 API 호출로 교체
  - [ ] 정산 계좌 저장 → 서버 저장 + 실패/성공 처리(현재 로컬 커밋만)
- [ ] `lib/accounts.ts` → DB 인증으로 대체(파일 제거 가능)
- [ ] 에러/로딩/빈 상태 UI, 요청 실패 토스트, 재시도 처리 추가

### 8.5 데이터 모델 정합 (`lib/types.ts` ↔ 서버)

- `MenuItem.image`: data URL → **원격 URL**(주석 갱신)
- `Table.id`/`number`: 서버 PK와 매핑(현재 number == id). 서버 UUID 사용 시 매핑 계층 필요
- `WaitingOrder.id`: 현재 `sim-*` 로컬 생성 → 서버 발급 ID. 고객 결제 완료 정보(결제ID/시각)를 참조 필드로 포함 검토
- `TableOrder.startedAt`/`createdAt`: 서버 시간(epoch ms) 기준으로 통일(클라이언트 시계 편차 주의)
- QR 연결: `Table` 에 QR 세션/토큰 식별자 매핑 필요(테이블↔QR↔주문). POS `clear` 시 이 세션을 리셋
- 결제 정보는 고객 앱/백엔드 소유. POS 타입에는 표시용(결제완료 여부·금액) 정도만 두고 PG 상세는 두지 않음
- `SettlementAccount { bank, number, holder }`(`lib/types.ts`): 매장별 1건 설정값으로 서버 저장. 계좌번호는 민감정보 — 서버 저장/전송 시 암호화·마스킹 정책 적용

### 8.6 환경변수 / 인프라

- `POS_SESSION_SECRET` (필수) — 세션 서명키
- `API_BASE_URL` — 백엔드 API 오리진
- `WS_URL` / `SSE_URL` — 실시간 채널
- `STORAGE_*` — 메뉴 이미지 스토리지(S3 등) 자격/버킷
- 서브도메인 전환 시 host→storeId 매핑 및 쿠키 도메인 설정
- 고객 앱/POS **도메인 분리** — CORS 허용 오리진, 도메인별 쿠키/인증 경계 설정
- (PG 연동 키는 **고객 앱/백엔드** 환경변수. POS 저장소엔 불필요)

### 8.7 마이그레이션 순서(권장)

1. 인증 DB화(§8.1) + 세션 시크릿 확정
2. **메뉴·정산 계좌 연동 먼저**(POS CRUD + 이미지 업로드 + 계좌 저장) — 고객 앱이 노출할 원본 데이터(메뉴·송금 계좌) 확보
3. 읽기 API 연동(테이블/주문/매출 GET) — POS 화면 렌더 서버 데이터화
4. 쓰기 API 연동(조리 상태전이·테이블 정리(QR 세션 리셋)·테이블수)
5. 실시간 채널 도입 — 시뮬레이션 제거, 고객 주문 push 수신 + 정리/메뉴 반영
6. 고객 앱 연동 검증(QR 스캔→메뉴→주문+결제(정산 계좌 송금 안내)→POS 반영, 정리→고객 화면 초기화 왕복)
7. 매출 서버 집계 전환, 기간 통계 등 부가 기능

### 8.8 남은 디자인 확정(참고)

- [ ] 정확한 컬러 HEX(Figma 대조), 신규 주문 알림 방식(사운드/애니메이션) 확정 — `DESIGN.md §7`
- [ ] POS엔 결제 화면 없음(고객 앱에서 선결제). 매장 QR↔테이블 매핑 관리 UI 필요 여부 검토
