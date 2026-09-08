/**
 * 인증. 백엔드 로그인 API 로 JWT 를 발급받아 세션에 저장한다.
 *
 * 이전(목업 accounts 클라이언트 검증)을 대체한다:
 * - login(): POST /api/auth/login → 토큰/매장정보 저장
 * - me():    GET  /api/auth/me   → 토큰 유효성 확인 + 매장정보 갱신
 * - logout(): 서버 로그아웃은 없음(JWT stateless). 클라이언트 토큰만 제거한다.
 */
import { authApi } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";
import { saveSession, clearSession, getSession, type Session } from "@/lib/session";

export type { Session } from "@/lib/session";
export { getSession } from "@/lib/session";

function toSession(res: { accessToken: string; expiresIn: number; storeId: number; storeName: string }): Session {
  return {
    storeId: String(res.storeId),
    storeName: res.storeName,
    accessToken: res.accessToken,
    expiresAt: Date.now() + res.expiresIn * 1000,
  };
}

/**
 * 로그인 시도.
 * - 성공: 세션 저장 후 반환
 * - 자격증명 오류(401 A001, 아이디 없음·비번 틀림 구분 없이 동일): null 반환
 *   (LoginPage 가 "아이디/비밀번호 오류" 표시 — 계정 열거 방지를 위해 서버도 구분하지 않는다)
 * - 그 외(400 C002 검증 실패 · 429 A006 과다 시도 · 네트워크/타임아웃/5xx):
 *   ApiError 를 그대로 throw — LoginPage 가 서버가 내려준 message 를 그대로 보여준다.
 */
export async function login(username: string, password: string): Promise<Session | null> {
  try {
    const res = await authApi.login(username.trim(), password);
    const session = toSession(res);
    saveSession(session);
    return session;
  } catch (e) {
    if (e instanceof ApiError && e.code === "A001") return null;
    throw e;
  }
}

/** 현재 토큰 유효성 확인 + 매장정보 갱신. 실패 시 세션 제거 후 null */
export async function refreshMe(): Promise<Session | null> {
  const current = getSession();
  if (!current) return null;
  try {
    const res = await authApi.me(current.storeId);
    const session = toSession(res);
    saveSession(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function logout(): void {
  clearSession();
}

export { getSession as currentSession };
