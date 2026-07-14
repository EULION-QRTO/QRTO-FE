import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** 진입점: 로그인 세션이 있으면 해당 주점 POS로, 없으면 로그인으로. */
export default async function Home() {
  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (session) {
    redirect(`/store/${session.storeId}`);
  }
  redirect("/login");
}
