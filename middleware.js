// PG(페이앱 등)가 결제 완료 후 손님 브라우저를 GET 리다이렉트가 아니라 자동 제출 POST 폼으로
// 되돌려보내는 경우가 있다. 이 프로젝트는 정적 SPA(vercel.json rewrite)라 POST 요청엔 정적 파일을
// 서빙할 수 없어 405가 나고, 그 결과 "도메인만 바뀌고 화면이 아무것도 안 뜨는" 증상이 생긴다.
//
// 여기서 그 POST 를 가로채 같은 URL(쿼리스트링 — token/orderId — 그대로)로 303 리다이렉트한다.
// 303은 "메서드를 GET으로 바꿔서 다시 요청하라"는 의미라 브라우저가 정상적으로 GET 재요청하고,
// 그 이후는 기존에 이미 동작 중인 SPA 진입 경로(session.tsx의 ?orderId= 처리)로 그대로 이어진다.
export const config = {
  matcher: ['/order', '/pickup'],
}

export default function middleware(request) {
  if (request.method !== 'POST') return
  const url = new URL(request.url)
  if (url.pathname !== '/order' && url.pathname !== '/pickup') return
  return Response.redirect(url, 303)
}
