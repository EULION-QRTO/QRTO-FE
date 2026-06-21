import StoreApp from './components/StoreApp'

export default function App() {
  // 데스크톱에서는 모바일 프레임을 가운데 정렬, 모바일에서는 화면을 가득 채운다.
  return (
    <div className="min-h-[100dvh] bg-[#e5e7eb] flex justify-center">
      <StoreApp />
    </div>
  )
}
