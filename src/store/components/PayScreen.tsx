import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import backArrow from '../assets/back-arrow.svg'
import money from '../assets/money.svg'

// 결제(결재)대기 화면 — 유료 상품이 있는 주문에서 "결제하기"를 누르면 진입한다.
//
// [데모] 진입 즉시 자동으로 결제가 완료 처리된다(토스 없이 mock confirm).
// 아래 "결제 완료" 버튼은 자동 처리가 지연될 때를 위한 수동 폴백이다.
export default function PayScreen({
  amount,
  placing,
  onBack,
  onComplete,
  onOpenHistory,
}: {
  amount: number
  placing: boolean
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
          {amount.toLocaleString()}원
          <br />
          결제를 완료하고 있어요…
        </p>
      </main>

      <BottomButton
        label={placing ? '결제 완료 중…' : '결제 완료'}
        active={!placing}
        disabled={placing}
        onClick={onComplete}
      />
    </Frame>
  )
}
