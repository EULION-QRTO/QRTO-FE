# 로컬 개발 가이드

로컬에서 `http://localhost:5173/`으로 들어가면 **점주 POS 화면(로그인)이 기본**이다. 고객용 주문 화면은 별도 경로(`/order`, `/pickup`)로만 들어갈 수 있다 — 실제로도 손님은 QR을 스캔해 이 경로로 바로 진입하고, 매장 목록 같은 걸 브라우징하지 않기 때문이다.

## 1. 화면별 접속 경로

| 경로 | 화면 | 비고 |
| --- | --- | --- |
| `http://localhost:5173/` | (진입점) | POS 세션 있으면 `/store/:storeId`로, 없으면 `/login`으로 자동 이동 |
| `http://localhost:5173/login` | **점주 POS 로그인** | 로그인 성공 시 `/store/:storeId`로 이동 |
| `http://localhost:5173/store/:storeId` | 점주 POS (주문/테이블 현황) | 로그인 세션 필요, storeId가 세션과 다르면 로그인으로 튕김 |
| `http://localhost:5173/operator/login` | **운영자 로그인** | 전체 매장을 관리하는 서비스 운영자용 |
| `http://localhost:5173/operator` | 운영자 대시보드 | 운영자 세션 필요 |
| `http://localhost:5173/order?token=...` | **고객용 — 테이블 주문** | `token`은 테이블별 QR 토큰 (아래 3번 참고) |
| `http://localhost:5173/pickup?token=...` | **고객용 — 포장(픽업) 주문** | `token`은 매장별 포장 토큰 (아래 3번 참고) |

> 소스 기준: [`src/App.tsx`](src/App.tsx) 라우터. 코드 구조는 [`README.md`](README.md) 참고.

### 운영 도메인 분기 (`pos.lapy.shop` / `order.lapy.shop`)

두 도메인은 같은 빌드(같은 배포)를 공유하고, 접속한 **호스트네임**으로 프론트가 알아서 갈라진다 — 백엔드 재배포나 별도 빌드가 필요 없다.

| 호스트 | 열리는 라우트 | 그 외 경로로 들어오면 |
| --- | --- | --- |
| `pos.lapy.shop` | POS/운영자만 (`/`, `/login`, `/store/:id`, `/operator*`) | `/order`, `/pickup` 등은 `/`(POS 홈)로 리다이렉트 |
| `order.lapy.shop` | 고객용만 (`/order`, `/pickup`) | `/`, `/login` 등은 "QR 코드를 다시 스캔해 주세요" 안내 화면 (POS 로그인 화면이 노출되지 않음) |
| 그 외 (localhost 등) | 위 표에 있는 모든 경로 | 위 표대로 (로컬 개발용, 기존과 동일) |

## 2. 테스트 계정

### 점주 POS 로그인 (`/login`)
백엔드(QRTO-BE) 시드 데이터 기준 — `V8__seed_demo_data.sql`. **백엔드가 떠 있어야 로그인된다** (프론트에 계정이 없음).

| 매장 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 을지포차 (포장 운영 O) | `euljiro` | `1234` |
| 공대주점 (포장 운영 X, 매장 격리 확인용) | `gongdae` | `1234` |

### 운영자 로그인 (`/operator/login`)
백엔드 없이 **프론트 코드에 하드코딩**되어 있다 ([`src/admin/lib/operator.ts`](src/admin/lib/operator.ts)).

| 아이디 | 비밀번호 |
| --- | --- |
| `likelion_LPAY` | `eulji02140214` |

> ⚠️ 자격증명이 그대로 번들(JS)에 포함된다. 데모/로컬 전용이며, 실제 배포 전 백엔드 인증으로 교체가 필요하다고 코드 주석에도 명시되어 있다.

## 3. 고객용 화면 열기 (`/order`, `/pickup`)

테이블 QR 토큰·포장 토큰은 매장이 생성될 때 백엔드가 **랜덤 UUID**로 발급하므로(`stores.pickup_token`, `store_tables.qr_token`), 미리 정해진 고정 링크가 없다. 아래 순서로 실제 링크를 구해서 접속(또는 QR로 스캔)한다.

1. 위 운영자 계정으로 `/operator/login` 로그인
2. 운영자 대시보드에서 **QR 인쇄** 탭으로 이동 ([`QrPrintTab.tsx`](src/admin/pages/operator/QrPrintTab.tsx))
3. 매장 ID(또는 이름)를 입력 — 새로 seed한 로컬 DB라면 을지포차가 보통 `1`번
4. 테이블별 주문 링크(`/order?token=...`)와 포장 링크(`/pickup?token=...`)가 그대로 뜬다 → 클릭하거나 QR 코드를 스캔

## 4. 백엔드도 같이 띄우기

프론트 혼자서는 로그인/주문 화면이 대부분 동작하지 않는다 (거의 모든 화면이 API를 호출한다). QRTO-BE 기준:

```bash
cd ../QRTO-BE
docker compose up -d        # MySQL (localhost:3310)
./gradlew bootRun            # http://localhost:8080
```

- 프론트가 기본으로 바라보는 백엔드 주소는 `http://localhost:8080` (`VITE_API_BASE_URL` 환경변수로 덮어쓸 수 있음, 운영자 웹소켓은 `VITE_WS_BASE_URL`)
- 백엔드의 `qrto.front-base-url` 설정값이 `http://localhost:5173`로 맞춰져 있어야 QR 인쇄 탭에서 나오는 링크가 우리 프론트를 가리킨다 (기본값이 이미 이렇게 되어 있음)
- 결제는 기본 `mock` 모드라 토스 결제창 없이 자동 완료 처리된다

## 5. 참고 문서
- [`GEARING.md`](GEARING.md), [`API_SPEC.md`](API_SPEC.md) — 고객용 주문 흐름·API 상세
- [`DESIGN.md`](DESIGN.md) — 점주 POS 디자인 시스템
