# QRTO-FE

QR 테이블오더 프론트엔드 모노레포. npm workspaces로 두 개의 독립된 Vite + React 앱을 관리한다.

## 구성

| 앱 | 경로 | 설명 | 포트 |
| --- | --- | --- | --- |
| `qrto-store` | [`apps/store`](apps/store) | 고객용 QR 테이블오더 앱 | 5173 |
| `qrto-admin` | [`apps/admin`](apps/admin) | 점주용 POS / 운영자 대시보드 (구 QRTO_MA_FE) | 5174 |

각 앱은 자체 `package.json`, `vite.config.ts`, `tsconfig.json`을 가진 독립 프로젝트이며, 의존성만 루트 `node_modules`에 통합 설치된다(npm workspaces).

## 시작하기

```bash
npm install          # 루트에서 한 번만 실행하면 두 앱 의존성이 모두 설치된다
npm run dev:store     # 고객용 앱 (http://localhost:5173)
npm run dev:admin     # 관리자 앱 (http://localhost:5174)
```

## 빌드

```bash
npm run build:store   # apps/store/dist
npm run build:admin   # apps/admin/dist
npm run build          # 두 앱 모두 빌드
```

## 문서

- [`apps/store/API_SPEC.md`](apps/store/API_SPEC.md), [`apps/store/GEARING.md`](apps/store/GEARING.md) — 고객용 앱 백엔드 연동 규약
- [`apps/admin/DESIGN.md`](apps/admin/DESIGN.md) — 관리자 앱 디자인 시스템
