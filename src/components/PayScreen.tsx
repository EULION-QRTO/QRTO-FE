import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import backArrow from '../assets/back-arrow.svg'
import money from '../assets/money.svg'

// 결제 화면 — 유료 주문에서 "결제하기"를 누르면 진입한다.
//  - 기본: "N원 결제하기" → 서버에 결제 링크를 요청하고 페이앱 결제창(payUrl)으로 이동한다.
//  - waiting(결제창에서 돌아왔는데 아직 결제대기): 서버 통보를 기다리며 상태를 확인 중. "다시 결제하기"로 같은 링크 재진입.
export default function PayScreen({
  amount,
  placing,
  waiting,
  onBack,
  onPay,
  onOpenHistory,
}: {
  amount: number
  placing: boolean
  waiting: boolean
  onBack: () => void
  onPay: () => void
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
              {waiting ? '결제 확인 중' : '결제대기'}
            </span>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[40px] px-[30px] pb-[110px]">
        <img alt="" className="size-[96px]" src={money} />
        {waiting ? (
          <p className="text-center text-[24px] font-bold leading-[normal] text-black">
            결제를 확인하고 있어요.
            <br />
            <span className="text-[16px] font-medium text-[#969ca3]">
              잠시만 기다려 주세요. 결제창을 닫았다면
              <br />
              아래 버튼으로 다시 결제할 수 있어요.
            </span>
          </p>
        ) : (
          <p className="text-center text-[24px] font-bold leading-[normal] text-black">
            {amount.toLocaleString()}원
            <br />
            <span className="text-[16px] font-medium text-[#969ca3]">
              결제하기를 누르면 결제창으로 이동해요.
              <br />
              카드 · 카카오페이 · 네이버페이 · 토스페이
            </span>
          </p>
        )}
      </main>

      <BottomButton
        label={
          placing
            ? '결제창으로 이동 중…'
            : waiting
              ? '다시 결제하기'
              : `${amount.toLocaleString()}원 결제하기`
        }
        active={!placing}
        disabled={placing}
        onClick={onPay}
      />
    </Frame>
  )
}
