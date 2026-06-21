import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import backArrow from '../assets/back-arrow.svg'
import money from '../assets/money.svg'

// 결제(결재)대기 화면 — 유료 상품이 있는 주문에서 "결제하기"를 누르면 진입한다.
export default function PayScreen({
  onBack,
  onComplete,
  onOpenHistory,
}: {
  onBack: () => void
  onComplete: () => void
  onOpenHistory: () => void
}) {
  return (
    <Frame>
      <Header
        onOrderHistory={onOpenHistory}
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
            <span className="rounded-[16px] bg-[#ededed] px-[18px] py-[5px] text-[15px] font-bold text-[#373737]">
              결제대기
            </span>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[40px] px-[30px] pb-[110px]">
        <img alt="" className="size-[96px]" src={money} />
        <p className="text-center text-[24px] font-bold leading-[normal] text-black">
          결제가 완료되면
          <br />
          결제 완료 버튼을 눌러주세요.
        </p>
      </main>

      <BottomButton label="결제 완료" active onClick={onComplete} />
    </Frame>
  )
}
