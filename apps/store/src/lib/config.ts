// 백엔드(HTTP) 베이스 주소. 환경변수 VITE_API_BASE_URL 로 덮어쓸 수 있고, 없으면 로컬 기본값.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? 'http://localhost:8080'

// 백엔드가 내려주는 상대 경로 이미지(/uploads/...)를 절대 URL로 만든다.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
