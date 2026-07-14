import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PosApp from "@/components/PosApp";
import { findStore } from "@/lib/accounts";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * 주점 POS 화면.
 * 미들웨어가 1차로 세션·storeId 일치를 강제하지만,
 * 여기서도 서버에서 재검증하여 방어를 이중화한다.
 */
export default async function StorePosPage({
  params,
}: {
  params: { storeId: string };
}) {
  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.storeId !== params.storeId) {
    redirect("/login?reason=forbidden");
  }

  const store = findStore(params.storeId);
  if (!store) {
    redirect("/login?reason=forbidden");
  }

  return <PosApp storeName={store.storeName} />;
}
