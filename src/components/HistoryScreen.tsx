import Frame from './Frame'
import Header from './Header'
import backArrow from '../assets/back-arrow.svg'
import bagCross from '../assets/bag-cross.svg'

// 주문내역 화면 — 우상단 "주문내역" 버튼을 누르면 진입한다. (현재는 빈 상태)
export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  return (
    <Frame>
      <Header
        secondRow={
          <div className="flex items-center gap-[36px]">
            <button
              type="button"
              onClick={onBack}
              aria-label="뒤로 가기"
              className="flex h-[29px] w-[15px] items-center justify-center"
            >
              <img alt="" className="h-[15px] w-[9px] -scale-x-100" src={backArrow} />
            </button>
            <span className="rounded-[16px] bg-[#ffe5d5] px-[18px] py-[5px] text-[15px] font-bold text-[#ff6000]">
              주문내역
            </span>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[24px] px-[30px]">
        <img alt="" className="size-[96px]" src={bagCross} />
        <p className="text-center text-[24px] font-bold leading-[normal] text-[#959595]">
          주문내역이 없어요.
        </p>
      </main>
    </Frame>
  )
}
