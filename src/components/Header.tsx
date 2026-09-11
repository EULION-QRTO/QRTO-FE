import type { ReactNode } from 'react'
import lapyLogo from '../assets/lapy_logo.svg'
import { useSession } from '../session'

function BrandMark() {
  // SVG 뷰박스를 실제 글자 영역(원본 100x100 중 22,37~81,66)으로 잘라내서 뒀기 때문에
  // 폭은 자연 비율(auto)로 두고, 높이만 매장명 텍스트(24px)보다 살짝 크게 맞춘다.
  return <img alt="Lapy" className="h-[28px] w-auto shrink-0" src={lapyLogo} />
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
