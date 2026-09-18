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

**상태: 미해결**

`SessionProvider`가 진입 API(`GET /api/customer/entry/table|pickup/{token}`)를 끝내야
`StoreApp`이 마운트되고, 그제서야 메뉴판 API(`GET /api/customer/menu-board?token=`)를 부른다.
그런데 menu-board는 entry의 응답값이 전혀 필요 없고 **URL의 token만 있으면 바로 호출 가능**하다.
지금은 왕복 2회를 순서대로 기다리는데, 병렬로 쏘면 왕복 1회분(수십~수백ms)을 절약한다.

관련 코드: [`src/session.tsx`](src/session.tsx)(`SessionProvider`),
[`src/components/StoreApp.tsx`](src/components/StoreApp.tsx)(메뉴판 로드 `useEffect`).

---

### A-2. 정적 파일(JS/CSS) 캐시 헤더가 사실상 무의미

**상태: 미해결**

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

---

### A-3. 백엔드(api.lapy.shop) 최초 연결이 느림 — 1.7초 관측

**상태: 미해결 (프론트에서 부분 완화만 가능, 근본 해결은 백엔드 인프라 영역)**

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

---

## B. 번들/로딩 최적화

### B-4. 초기 JS 번들에 `@stomp/stompjs`가 통째로 포함됨

**상태: 미해결**

실시간 구독([`src/lib/realtime.ts`](src/lib/realtime.ts))은 주문을 "넣은 이후"에만 쓰는데,
코드 스플리팅 없이 첫 로드부터 다 받는다. 동적 `import()`로 분리하면 메뉴만 보는 손님이
받아야 할 초기 JS 용량이 줄어든다. (현재 전체 번들 203KB 원본 / 67KB br 압축)

### B-5. `api.lapy.shop`에 대한 preconnect 힌트 없음

**상태: 미해결**

`index.html`엔 폰트 CDN(jsdelivr)만 `<link rel="preconnect">` 되어 있고, 정작 첫 API 호출
대상인 백엔드 도메인엔 없다. (A-3의 완화책과 동일한 작업이라 A-3에서 같이 처리 예정)

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
