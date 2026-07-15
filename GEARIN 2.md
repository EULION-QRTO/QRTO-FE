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

## 8. 프로덕션 전환 시 TODO (현재는 데모)

- [ ] 계정을 **DB + 해시 비밀번호(bcrypt 등)** 로 이전 (현재 평문 목업)
- [ ] `POS_SESSION_SECRET` 환경변수 설정 (현재 dev fallback 존재)
- [ ] "각 주점별 도메인" — 지금은 `/store/[storeId]` 경로. 실제 서브도메인(`euljiro.pos.example.com`) 매핑 시 미들웨어에서 **host 기반 storeId 도출**로 조정
- [ ] POS 상태를 실서버 연동(주문 API / 실시간 소켓)으로 교체 — 현재 in-memory 목업
- [ ] 메뉴 사진을 data URL → **스토리지 업로드 + URL 저장**으로 전환 (용량/성능)
- [ ] 메뉴 데이터를 실제 주문 등록 플로우와 연결
- [ ] 정확한 컬러 HEX(Figma 대조), 신규 주문 알림 방식(사운드/애니메이션) 확정 — `DESIGN.md §7`
