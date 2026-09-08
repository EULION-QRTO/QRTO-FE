# QRTO-FE

QR 테이블오더 프론트엔드. 고객용 주문 화면과 점주용 POS/운영자 대시보드를 **하나의 Vite + React SPA**로 서비스한다 (단일 포트, 단일 빌드).

## 경로 구성

경로(pathname)로 두 영역을 구분한다 — 백엔드 CORS 허용 origin이 `http://localhost:5173` 하나뿐이라 개발 서버 포트도 하나로 고정한다.

| 경로 | 영역 | 설명 |
| --- | --- | --- |
| `/order?token=...` | 고객용 | 테이블 QR 주문 |
| `/pickup?token=...` | 고객용 | 포장(픽업) 주문 |
| `/`, `/login`, `/store/:storeId` | 점주용 | POS 로그인 및 주문 화면 |
| `/operator/login`, `/operator` | 운영자용 | 매장 등록/모니터링 대시보드 |

## 소스 구조

```
src/
  App.tsx        # 라우터 — 위 표의 경로 분기
  main.tsx        # 엔트리포인트
  store/           # 고객용 주문 화면 (상대 경로 import)
  admin/            # 점주용 POS / 운영자 대시보드 ("@/*" → src/admin/* 별칭 사용)
```

두 영역은 원래 별개 프로젝트(QRTO-FE, QRTO_MA_FE)였던 코드를 그대로 옮겨온 것이라 내부 파일명(`api.ts`, `config.ts`, `Header.tsx` 등)이 겹치지만, 폴더가 분리되어 있어 충돌하지 않는다. 스타일도 각자 것을 그대로 쓴다 — `store`는 Tailwind, `admin`은 자체 디자인 시스템(`src/admin/index.css`).

> ⚠️ **패키지 매니저는 반드시 npm만 사용한다.** pnpm/yarn으로 설치하면 `preinstall` 훅(`only-allow`)이 즉시 막는다.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173 — 위 표의 경로로 두 영역 모두 접근 가능
npm run build     # dist/ 하나로 두 영역이 함께 빌드된다
npm run preview
```

## 문서

- [`DEV_GUIDE.md`](DEV_GUIDE.md) — 로컬 개발용 테스트 계정, 화면별 접속 경로, 고객용 QR 링크 얻는 법
- [`API_SPEC.md`](API_SPEC.md), [`GEARING.md`](GEARING.md) — 고객용 주문 백엔드 연동 규약 (`src/store/`)
- [`DESIGN.md`](DESIGN.md) — 점주용 POS 디자인 시스템 (`src/admin/`)
