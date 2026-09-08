import StoreApp from './components/StoreApp'
import { SessionProvider } from './session'

export default function App() {
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
