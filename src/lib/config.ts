/**
 * 런타임 설정.
 *
 * API_BASE_URL 은 백엔드(HTTP) 베이스 주소, WS_BASE_URL 은 STOMP(WebSocket) 주소.
 * 환경변수(VITE_API_BASE_URL)로 덮어쓸 수 있고, 없으면 로컬 개발 기본값을 쓴다.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/** REST 베이스 URL — 모든 엔드포인트는 이 뒤에 붙는다. */
export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? "http://localhost:8080";

/** STOMP(WebSocket) 브로커 URL — API_BASE_URL 의 http(s) → ws(s) 치환. */
export const WS_BASE_URL: string =
  env.VITE_WS_BASE_URL ?? `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
