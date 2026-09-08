import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import PosApp from '@/components/PosApp'
import LoginPage from '@/pages/LoginPage'
import OperatorLoginPage from '@/pages/OperatorLoginPage'
import OperatorDashboard from '@/pages/OperatorDashboard'
import { getSession } from '@/lib/auth'
import { getOperatorSession } from '@/lib/operator'
import StoreZone from './store/StoreZone'

// DNS로 두 도메인이 이 앱(같은 빌드)을 나눠 바라본다.
//   - pos.lapy.shop   → 점주/운영자(POS) 영역만
//   - order.lapy.shop → 고객용 QR 주문 영역만
// 그 외 호스트(로컬 개발 등)에서는 기존처럼 두 영역 모두 경로로 구분해 접근할 수 있다.
const POS_HOSTNAME = 'pos.lapy.shop'
const ORDER_HOSTNAME = 'order.lapy.shop'

function currentHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : ''
}

/** 진입점: 세션이 있으면 해당 주점 POS로, 없으면 로그인으로. */
function Home() {
  const session = getSession()
  return <Navigate to={session ? `/store/${session.storeId}` : '/login'} replace />
}

/**
 * 주점 POS 라우트 가드.
 * - 세션이 없으면 → /login?reason=auth
 * - 세션의 storeId 와 URL 의 storeId 가 다르면(=URL 조작) → /login?reason=forbidden
 * 매장명은 로그인 시 백엔드가 내려준 세션 값(storeName)을 사용한다.
 */
function StoreRoute() {
  const { storeId } = useParams<{ storeId: string }>()
  const session = getSession()

  if (!session) return <Navigate to="/login?reason=auth" replace />
  if (session.storeId !== storeId) return <Navigate to="/login?reason=forbidden" replace />

  return <PosApp storeId={session.storeId} storeName={session.storeName} />
}

/** 운영자 라우트 가드. 운영자 세션이 없으면 → /operator/login */
function OperatorRoute() {
  const session = getOperatorSession()
  if (!session) return <Navigate to="/operator/login?reason=auth" replace />
  return <OperatorDashboard />
}

/** order.lapy.shop 에서 "/", "/login" 등 POS 경로로 들어왔을 때(=QR 링크 오류) 보여줄 안내 화면. */
function CustomerDomainNotFound() {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-[12px] bg-[#f4f5f7] px-[40px] text-center">
      <p className="text-[20px] font-bold text-[#181a1f]">QR 코드를 다시 스캔해 주세요.</p>
      <p className="text-[14px] font-medium text-[#969ca3]">테이블 또는 포장 QR 코드로 접속해야 합니다.</p>
    </div>
  )
}

export default function App() {
  const hostname = currentHostname()
  // pos.lapy.shop 이 아니면(=order.lapy.shop 이거나 로컬 등) 고객용 라우트를 연다.
  const showCustomerRoutes = hostname !== POS_HOSTNAME
  // order.lapy.shop 이 아니면(=pos.lapy.shop 이거나 로컬 등) POS/운영자 라우트를 연다.
  const showPosRoutes = hostname !== ORDER_HOSTNAME

  return (
    <BrowserRouter>
      <Routes>
        {/* 점주 / 운영자 — pos.lapy.shop 전용 (그 외 호스트에서는 함께 열림) */}
        {showPosRoutes && <Route path="/" element={<Home />} />}
        {showPosRoutes && <Route path="/login" element={<LoginPage />} />}
        {showPosRoutes && <Route path="/store/:storeId" element={<StoreRoute />} />}
        {showPosRoutes && <Route path="/operator/login" element={<OperatorLoginPage />} />}
        {showPosRoutes && <Route path="/operator" element={<OperatorRoute />} />}

        {/* 고객용 QR 주문 — order.lapy.shop 전용 (그 외 호스트에서는 함께 열림) */}
        {showCustomerRoutes && <Route path="/order" element={<StoreZone />} />}
        {showCustomerRoutes && <Route path="/pickup" element={<StoreZone />} />}

        {/* order.lapy.shop 에서 POS 경로로 들어오면 안내 화면, 그 외에는 홈으로 */}
        <Route path="*" element={showPosRoutes ? <Navigate to="/" replace /> : <CustomerDomainNotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
