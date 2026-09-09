// 백엔드(HTTP) 베이스 주소. 운영 base URL은 명세서(v2) 기준 항상 https://api.lapy.shop —
// 로컬 개발 기본값(localhost:8080)만 VITE_API_BASE_URL 환경변수로 덮어쓸 수 있다.
// (.env.production 이 운영 빌드에 https://api.lapy.shop 을 박아 넣는다.)
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? 'http://localhost:8080'

// STOMP(WebSocket) 브로커 URL — API_BASE_URL 의 http(s) → ws(s) 치환 + /ws.
export const WS_BASE_URL: string =
  env.VITE_WS_BASE_URL ?? `${API_BASE_URL.replace(/^http/, 'ws')}/ws`

// 백엔드가 내려주는 상대 경로 이미지(/uploads/...)를 절대 URL로 만든다.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
