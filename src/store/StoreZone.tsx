import StoreApp from './components/StoreApp'
import { SessionProvider } from './session'

// 고객용 QR 주문 영역 진입점 ("/order", "/pickup"). 최상위 App.tsx의 라우트에서 렌더된다.
export default function StoreZone() {
  // 데스크톱에서는 모바일 프레임을 가운데 정렬, 모바일에서는 화면을 가득 채운다.
  // SessionProvider는 QR URL(매장 / 테이블·포장)을 해석해 앱 전체에 공급한다.
  return (
    <SessionProvider>
      <div className="min-h-[100dvh] bg-[#e5e7eb] flex justify-center">
        <StoreApp />
      </div>
    </SessionProvider>
  )
}
