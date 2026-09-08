/**
 * 운영자(서비스 모니터링 관리자) 세션.
 *
 * 주점 로그인(백엔드 JWT)과 별개로, 운영자 계정은 백엔드가 없어 프론트에서 검증한다.
 * 로그인 성공 시 localStorage 에 운영자 세션 플래그를 저장한다.
 * (주의: 클라이언트 검증이라 자격증명이 번들에 포함된다. 운영 배포 전 백엔드 인증으로 대체 권장.)
 */
const OPERATOR_KEY = "operator_session";
const WATCH_KEY = "operator_watch_stores";

/** 운영자 자격증명 (요청에 따라 하드코딩) */
const OPERATOR_USERNAME = "likelion_LPAY";
const OPERATOR_PASSWORD = "eulji02140214";

/** 세션 유효기간 12시간 */
const TTL_MS = 12 * 60 * 60 * 1000;

export interface OperatorSession {
  loggedInAt: number;
  expiresAt: number;
}

/** 자격증명 검증 후 세션 저장. 실패 시 false. */
export function operatorLogin(username: string, password: string): boolean {
  if (username.trim() !== OPERATOR_USERNAME || password !== OPERATOR_PASSWORD) return false;
  const now = Date.now();
  const session: OperatorSession = { loggedInAt: now, expiresAt: now + TTL_MS };
  localStorage.setItem(OPERATOR_KEY, JSON.stringify(session));
  return true;
}

export function getOperatorSession(): OperatorSession | null {
  try {
    const raw = localStorage.getItem(OPERATOR_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as OperatorSession;
    if (!s || typeof s.expiresAt !== "number" || Date.now() >= s.expiresAt) {
      localStorage.removeItem(OPERATOR_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function operatorLogout(): void {
  localStorage.removeItem(OPERATOR_KEY);
}

/* ── 관리 매장 목록 (localStorage 영속) ── */

/**
 * 운영자가 관리하는 매장. 백엔드에 '전체 매장 목록/운영단체' API 가 없어
 * id 외 name·org(운영단체)는 로컬 메타데이터로 보관한다. (name 은 백엔드 조회로 보강됨)
 */
export interface ManagedStore {
  id: string;
  name?: string;
  org?: string;
  takeoutEnabled?: boolean;
  /** 주점 로그인 아이디 (참조용). 비밀번호는 로컬에 저장하지 않는다. */
  username?: string;
  /** 서버에 저장(동기화)됐는지. false 면 로컬 전용(서버 API 부재/오류). */
  synced?: boolean;
}

/** 관리 매장 목록. 기본값 [{ id: "1" }]. 구버전(string[]) 자동 마이그레이션. */
export function getManagedStores(): ManagedStore[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [{ id: "1" }];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [{ id: "1" }];
    return arr
      .map((item): ManagedStore => (typeof item === "string" ? { id: item } : (item as ManagedStore)))
      .filter((s) => s && String(s.id).trim() !== "");
  } catch {
    return [{ id: "1" }];
  }
}

export function setManagedStores(list: ManagedStore[]): void {
  // id 기준 중복 제거 + 순서 유지
  const seen = new Set<string>();
  const uniq = list.filter((s) => {
    const id = String(s.id).trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  localStorage.setItem(WATCH_KEY, JSON.stringify(uniq));
}

/** 관리 매장 ID 목록만 (KPI 집계 등에서 사용) */
export function getManagedStoreIds(): string[] {
  return getManagedStores().map((s) => s.id);
}

/** 관리 매장 추가/갱신 (id 기준 upsert) */
export function upsertManagedStore(store: ManagedStore): void {
  const list = getManagedStores();
  const idx = list.findIndex((s) => s.id === store.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...store };
  else list.push(store);
  setManagedStores(list);
}

/** 관리 매장 제거 */
export function removeManagedStore(id: string): void {
  setManagedStores(getManagedStores().filter((s) => s.id !== id));
}
