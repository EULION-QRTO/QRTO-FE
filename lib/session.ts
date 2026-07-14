/**
 * HMAC-SHA256 로 서명한 세션 토큰.
 * Web Crypto (crypto.subtle) 사용 → Edge 미들웨어 / Node 라우트 핸들러 양쪽에서 동작.
 * 서명이 있으므로 클라이언트가 쿠키를 위조해 다른 storeId 로 접근할 수 없다.
 */
export const SESSION_COOKIE = "pos_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12시간

const SECRET = process.env.POS_SESSION_SECRET || "dev-secret-change-me-in-prod";
const encoder = new TextEncoder();

interface SessionPayload {
  storeId: string;
  exp: number;
}

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Uint8Array → 정확히 그 내용만 담은 ArrayBuffer (crypto.subtle 인자용) */
function buf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    buf(encoder.encode(SECRET)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(storeId: string): Promise<string> {
  const payload: SessionPayload = { storeId, exp: Date.now() + TTL_MS };
  const data = toB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), buf(encoder.encode(data)));
  return `${data}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      buf(fromB64Url(sig)),
      buf(encoder.encode(data))
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(data))) as SessionPayload;
    if (!payload.storeId || typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = TTL_MS / 1000;
