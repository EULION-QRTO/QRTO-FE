/**
 * 클라이언트 세션.
 *
 * 순수 React SPA 에는 서버가 없으므로, 기존의 HMAC 서명 httpOnly 쿠키 +
 * 미들웨어 방식(서버 검증)을 클라이언트 인증으로 대체한다.
 * - 자격 증명은 목업 계정(accounts)으로 클라이언트에서 검증한다.
 * - 세션(storeId)은 localStorage 에 보관하고, 라우트 가드가 접근을 통제한다.
 *
 * ⚠️ 데모/프론트엔드용. 실제 서비스에서는 백엔드 API + 서버 세션으로 대체해야 한다.
 */
import { findAccount } from "@/lib/accounts";

const SESSION_KEY = "pos_session";

export interface Session {
  storeId: string;
}

/** 로그인 시도 → 성공 시 세션 저장 후 반환, 실패 시 null */
export function login(username: string, password: string): Session | null {
  const account = findAccount(username.trim(), password);
  if (!account) return null;
  const session: Session = { storeId: account.storeId };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed && typeof parsed.storeId === "string" ? parsed : null;
  } catch {
    return null;
  }
}
