import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import PosApp from "@/components/PosApp";
import LoginPage from "@/pages/LoginPage";
import { findStore } from "@/lib/accounts";
import { getSession } from "@/lib/auth";

/** 진입점: 세션이 있으면 해당 주점 POS로, 없으면 로그인으로. (기존 app/page.tsx) */
function Home() {
  const session = getSession();
  return <Navigate to={session ? `/store/${session.storeId}` : "/login"} replace />;
}

/**
 * 주점 POS 라우트 가드. (기존 middleware.ts + app/store/[storeId]/page.tsx)
 * - 세션이 없으면 → /login?reason=auth
 * - 세션의 storeId 와 URL 의 storeId 가 다르면(=URL 조작) → /login?reason=forbidden
 */
function StoreRoute() {
  const { storeId } = useParams<{ storeId: string }>();
  const session = getSession();

  if (!session) return <Navigate to="/login?reason=auth" replace />;
  if (session.storeId !== storeId) return <Navigate to="/login?reason=forbidden" replace />;

  const store = findStore(storeId);
  if (!store) return <Navigate to="/login?reason=forbidden" replace />;

  return <PosApp storeName={store.storeName} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/store/:storeId" element={<StoreRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
