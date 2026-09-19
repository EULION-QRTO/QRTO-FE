import type { ReactNode } from 'react'
import lpayLogo from '../assets/lpay_new_logo.svg'
import { useSession } from '../session'

function BrandMark() {
  // 이 SVG는 캔버스(뷰박스) 전체에 여백을 두고 그려져 있어서(실제 로고는 뷰박스 높이의
  // 약 61%만 차지) 체감 크기가 컨테이너 높이보다 작게 보인다(40 × 0.61 ≈ 24 — 매장명
  // 텍스트(24px)와 비슷한 높이). 헤더 줄이 items-center라 커져도 다른 요소를 가리거나
  // 줄을 넘치지 않는다.
  return <img alt="Lpay" className="h-[40px] w-auto shrink-0" src={lpayLogo} />
}

// 모든 화면이 공유하는 상단 헤더. 두 번째 줄(탭 / 뒤로가기·제목)은 secondRow로 주입한다.
// onOrderHistory가 있으면 우상단 "주문내역" 버튼을 노출한다(주문내역 화면 자체에서는 숨김).
export default function Header({
  secondRow,
  onOrderHistory,
}: {
  secondRow: ReactNode
  onOrderHistory?: () => void
}) {
  const { session, locationLabel } = useSession()
  return (
    <header className="z-20 shrink-0 bg-[#fafbfc] shadow-[0px_1px_10.5px_-3px_rgba(0,0,0,0.25)]">
      <div className="px-[24px] pb-[14px] pt-[calc(env(safe-area-inset-top)+44px)]">
        <div className="flex min-h-[33px] items-center">
          <BrandMark />
          <h1 className="ml-[12px] text-[24px] font-bold leading-none text-[#181a1f]">
            {session.storeName}
          </h1>
          <span className="ml-auto whitespace-nowrap text-[13px] font-semibold text-[#969ca3]">
            {locationLabel}
          </span>
          {onOrderHistory && (
            <button
              type="button"
              onClick={onOrderHistory}
              className="ml-[12px] whitespace-nowrap rounded-[16px] bg-[#ffe5d5] px-[16px] py-[5px] text-[15px] font-bold text-[#ff6000]"
            >
              주문내역
            </button>
          )}
        </div>
        <div className="mt-[31px] pl-[6px]">{secondRow}</div>
      </div>
    </header>
  )
}
