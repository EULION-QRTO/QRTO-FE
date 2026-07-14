import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * /store/[storeId] 접근 보호.
 * - 세션이 없으면 → /login
 * - 세션의 storeId 와 URL 의 storeId 가 다르면(=URL 조작) → /login 으로 강제 이동
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const match = pathname.match(/^\/store\/([^/]+)/);
  if (!match) return NextResponse.next();

  const requestedStoreId = decodeURIComponent(match[1]);
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session || session.storeId !== requestedStoreId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (!session) url.searchParams.set("reason", "auth");
    else url.searchParams.set("reason", "forbidden");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/store/:path*"],
};
