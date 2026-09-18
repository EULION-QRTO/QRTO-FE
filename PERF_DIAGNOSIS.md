# 성능 진단 및 개선 기록

2026-09-18, 실제 라이브 링크로 실측한 진단 결과와 해결 진행 상황을 기록한다.
대상: `https://lpay-order.vercel.app/order?token=250fd1cdf83a44208a04bd0d17c128af`
(QA주점 1번 테이블). 주문/결제처럼 부작용 있는 API는 호출하지 않고, 페이지 로드·조회성
API(entry, menu-board)만 직접 때려서 측정했다.

각 항목은 `상태: 미해결` → `상태: 해결`로 바뀌며, 해결되면 "해결 내용" 절이 추가된다.
**A → B → C 순서, 각 그룹 안에서도 번호 순서대로 하나씩만 처리하고, 처리할 때마다 보고 후
다음 지시를 기다린다** (여러 개를 한번에 처리하지 않는다).

---

## A. 확실한 병목 (실측 근거 있음)

### A-1. entry → menu-board API가 순차 실행(waterfall)

**상태: 해결**

`SessionProvider`가 진입 API(`GET /api/customer/entry/table|pickup/{token}`)를 끝내야
`StoreApp`이 마운트되고, 그제서야 메뉴판 API(`GET /api/customer/menu-board?token=`)를 부른다.
그런데 menu-board는 entry의 응답값이 전혀 필요 없고 **URL의 token만 있으면 바로 호출 가능**하다.
지금은 왕복 2회를 순서대로 기다리는데, 병렬로 쏘면 왕복 1회분(수십~수백ms)을 절약한다.

관련 코드: [`src/session.tsx`](src/session.tsx)(`SessionProvider`),
[`src/components/StoreApp.tsx`](src/components/StoreApp.tsx)(메뉴판 로드 `useEffect`).

**해결 내용**

- [`src/lib/endpoints.ts`](src/lib/endpoints.ts)의 `menuBoard()`에 token 기준 in-flight 요청
  캐시를 추가 — 같은 token으로 거의 동시에 여러 번 불러도 실제 HTTP 요청은 하나만 나간다
  (한 쪽이 실패하면 캐시에서 빼서 재시도 가능하게 함).
- [`src/session.tsx`](src/session.tsx)의 `SessionProvider`가 진입 API를 부르는 것과 **같은
  동기 실행 구간**에서 `menuBoard(entry.token)`을 미리 호출(prefetch)해두도록 수정. `StoreApp`은
  코드 변경 없이 그대로 `menuBoard(token)`을 부르지만, 이미 날아가 있는 같은 요청을 그대로
  넘겨받는다.
- 실제 백엔드(`api.lapy.shop`)로 직접 측정한 결과(동일 token, entry+menu-board 왕복 총합):
  **순차 195ms → 병렬 27ms** (약 168ms, 86% 단축).
- `npm run build`(tsc 타입체크 포함) 정상 통과.

---

### A-2. 정적 파일(JS/CSS) 캐시 헤더가 사실상 무의미

**상태: 해결 (배포 후 실측 재확인 예정)**

실측(`curl -I`):
```
/assets/index-Bx4B606r.js  →  Cache-Control: public, max-age=0, must-revalidate
```
파일명 자체가 콘텐츠 해시(`Bx4B606r`)라 내용이 바뀌면 파일명도 바뀌는데, `max-age=0`이라
**재방문마다 매번 서버에 "이거 최신 맞아?" 확인 요청**을 보낸다. 같은 테이블 QR을 하루에
여러 번 여는 손님(재주문·주문내역 확인 등)마다 불필요한 왕복이 생긴다.
`Cache-Control: public, max-age=31536000, immutable`로 바꾸면 재방문 시 네트워크 왕복 없이
즉시 로드된다.

관련 파일: [`vercel.json`](vercel.json) (현재 rewrites만 있고 headers 설정 없음).

**해결 내용**

- [`vercel.json`](vercel.json)에 `headers` 규칙 추가 — `/assets/(.*)` 경로에
  `Cache-Control: public, max-age=31536000, immutable`.
- `index.html`(파일명 고정, 해시 없음)은 건드리지 않음 — 새 배포마다 최신 번들 파일명을
  가리키는 index.html을 매번 새로 받아와야 하므로, 기존 `max-age=0, must-revalidate`를
  그대로 유지하는 게 맞다.
- 이 설정은 Vercel 배포 시에만 적용되는 헤더라 로컬 `npm run dev`/`vite build`로는
  검증할 수 없다 — **배포 후 `curl -I`로 재확인해 이 절을 갱신할 예정.**

---

### A-3. 백엔드(api.lapy.shop) 최초 연결이 느림 — 1.7초 관측

**상태: 프론트 완화책 해결 (근본 원인은 여전히 백엔드 인프라 영역 — 별도 확인 필요)**

실측:
```
첫 요청:  DNS 3ms → TCP connect 1.67초(!) → TLS +23ms → 첫 바이트 +14ms
이후 요청: TCP connect 15~100ms (정상)
```
DNS·TLS·서버 처리 시간은 다 빠른데 TCP connect 단계에서만 1.6초가 튀었다 — 유휴 상태에서
막 깨어나는 콜드스타트성 패턴으로 보인다. 축제 특성상 손님이 몰렸다 뜸했다 하므로, "한동안
조용하다 처음 스캔한 손님"이 이 지연을 그대로 떠안을 수 있다.

프론트에서 할 수 있는 완화책: `index.html`에 `api.lapy.shop`에 대한
`<link rel="preconnect">`를 추가해, JS 로딩과 병렬로 이 연결 설정을 미리 시작시켜 체감
지연을 줄인다. (완전한 해결은 아님 — 백엔드 쪽에 유휴 후 콜드스타트 여부 확인 권장.)

**해결 내용 (프론트 완화책)**

- [`index.html`](index.html)에 `<link rel="preconnect" href="https://api.lapy.shop" crossorigin />`
  추가 (기존 jsdelivr 폰트 CDN preconnect 옆에). `crossorigin` 속성은 실제 API 호출이
  자격증명 없는(anonymous) CORS 요청이라 맞춰서 넣었다 — 없으면 브라우저가 별도 연결을
  다시 맺을 수 있다.
- 이 태그는 `<head>`에서 **JS가 다운로드·파싱·실행되기 전에** 브라우저가 먼저 읽으므로,
  DNS·TCP·TLS 연결 설정이 JS 로딩과 겹쳐서 진행된다 — 지금까지는 JS가 실행되어 `fetch()`를
  호출하는 시점에야 연결 설정이 시작됐다.
- `npm run build` 정상 통과, 빌드 산출물(`dist/index.html`)과 dev 서버 응답 양쪽에서
  태그가 그대로 살아있는 것 확인.
- **한계**: `preconnect`는 브라우저 힌트라 실제 절감 시간은 curl로 측정할 수 없고 실제
  브라우저 네트워크 탭에서만 확인 가능하다 — 이 항목은 "완화책 적용 완료"이지 A-3의 근본
  원인(백엔드 콜드스타트)을 없앤 건 아니다. 백엔드 쪽에 유휴 후 첫 요청 지연 여부 확인을
  별도로 권장한다.

---

## B. 번들/로딩 최적화

### B-4. 초기 JS 번들에 `@stomp/stompjs`가 통째로 포함됨

**상태: 해결**

실시간 구독([`src/lib/realtime.ts`](src/lib/realtime.ts))은 주문을 "넣은 이후"에만 쓰는데,
코드 스플리팅 없이 첫 로드부터 다 받는다. 동적 `import()`로 분리하면 메뉴만 보는 손님이
받아야 할 초기 JS 용량이 줄어든다. (현재 전체 번들 203KB 원본 / 67KB br 압축)

**해결 내용**

- [`src/components/StoreApp.tsx`](src/components/StoreApp.tsx)에서 `import { subscribeOrderStatus }
  from '../lib/realtime'`(정적 import)를 지우고, 주문 상태 구독 `useEffect` 안에서
  `import('../lib/realtime')`(동적 import)로 바꿈 — 이 effect는 `order`가 생긴 뒤에만
  실행되므로(`if (!order) return`), `@stomp/stompjs`를 포함한 `realtime.ts`는 실제로
  주문을 넣은 손님만 내려받는다. 동적 import가 아직 안 끝난 상태에서 effect가 클린업되는
  경우(주문 취소 등)를 대비해 `cancelled` 플래그로 늦게 도착한 구독을 무시하도록 처리.
- Vite/Rollup이 이 모듈을 정적으로 참조하는 곳이 더는 없다는 걸 인식하고 자동으로 별도
  청크(`realtime-*.js`)로 분리함 — 별도 설정 불필요.
- `npm run build` 산출물로 실측 (`dist/assets/*.js`, gzip/brotli 직접 압축해 비교):

  | | 이전(메인 청크 하나) | 이후(메인) | 이후(realtime, 지연 로드) |
  |---|---|---|
  | 원본 | 203KB | 181.27KB | 23.26KB |
  | br 압축 | 67KB | 50.48KB | 6.01KB |

  메뉴만 보는 손님이 첫 로드에 받는 JS가 원본 기준 약 22KB(11%), br 압축 기준 약 16.5KB(25%)
  줄었다. `@stomp/stompjs` 코드는 `grep "STOMP" dist/assets/index-*.js`로 0건, 새로 생긴
  `dist/assets/realtime-*.js`에서만 검출되는 것으로 확인 — 메인 청크에서 완전히 빠졌다.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` 모두 정상 통과.

### B-5. `api.lapy.shop`에 대한 preconnect 힌트 없음

**상태: 해결 (A-3에서 함께 처리됨)**

`index.html`엔 폰트 CDN(jsdelivr)만 `<link rel="preconnect">` 되어 있고, 정작 첫 API 호출
대상인 백엔드 도메인엔 없다. (A-3의 완화책과 동일한 작업이라 A-3에서 같이 처리 예정)

**해결 내용**

A-3 해결 내용과 동일 — [`index.html`](index.html)에 추가한
`<link rel="preconnect" href="https://api.lapy.shop" crossorigin />`가 이 항목이 지적한
문제를 그대로 해결한다. 별도 커밋 없이 A-3 작업(커밋 `f71dbc0`)에 이미 포함되어 있었는데,
이 문서에는 상태 갱신이 누락되어 있었다 — B-4 작업과 함께 바로잡음.

---

## C. 이미지

### C-6. 메뉴 사진에 `loading="lazy"` 없음

**상태: 미해결**

[`src/components/ProductCard.tsx`](src/components/ProductCard.tsx)의 `<img>`에 `loading`
속성이 없다. 메뉴가 길어지면 화면 밖 사진까지 한 번에 다 받아온다.

### C-7. (참고, 백엔드 영역) 업로드 사진 원본 크기 대비 표시 크기 차이

**상태: 보류(참고용) — 이 레포 범위 밖**

업로드 사진은 서버에서 긴 변 최대 1200px로 저장되는데, 화면엔 87×87px로만 표시된다.
지금 테스트 매장엔 사진이 없어서 실측은 못 했다 — 사진 등록된 매장으로 재확인 권장.
프론트에서 임의로 리사이즈 API를 만들 수 없어(백엔드가 그런 엔드포인트를 제공하지 않음)
당장은 손댈 수 없고, 필요하면 백엔드에 썸네일 변형 제공을 요청해야 한다.

---

## D. 이미 양호한 것 (참고, 작업 대상 아님)

- Brotli 압축 정상 동작 (`Accept-Encoding` 보내면 `content-encoding: br`로 응답)
- WebSocket은 주문 생성 "이후"에만 연결 — 조기 연결 없음
- 화면 전환마다 재구독하지 않도록 이미 `viewRef` 패턴으로 방지되어 있음
  ([`src/components/StoreApp.tsx`](src/components/StoreApp.tsx))
- 단순 GET 호출이라 CORS 프리플라이트(OPTIONS) 발생 안 함
