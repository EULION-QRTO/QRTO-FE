import Frame from './Frame'
import Header from './Header'

// 결제 확인 중 화면. 두 경로로 들어온다:
// 1) 페이앱 결제창에서 ?orderId=로 정상 복귀 — 이 경우 결제는 이미 끝났거나 끝나는 중.
// 2) 결제창을 새 탭에서 연 직후(이 탭은 그대로 남아있음) — 새 탭에서 페이앱→PG사(토스/카카오페이/
//    네이버페이 등)로 넘어가면, 그 이후로는 뒤로가기가 우리 쪽으로 돌아온다는 보장이 없다(각
//    PG가 자체적으로 히스토리를 제어하거나 앱으로 넘어가 버림). 그래서 이 탭에 "취소" 버튼을
//    항상 띄워둬서, 다른 탭 상태와 무관하게 손님이 언제든 확실하게 취소하고 돌아올 수 있게 한다.
// 결제 완료 판정은 페이앱 서버가 우리 서버로 통보해야 이루어지므로, 손님앱은 그 결과가
// WebSocket(/topic/orders/{orderId})으로 도착할 때까지 여기서 잠깐 기다린다 — 보통 몇 초 이내.
export default function PaymentCheckScreen({
  onOpenHistory,
  onCancel,
}: {
  onOpenHistory: () => void
  /** 있으면 "취소하고 장바구니로" 버튼을 보여준다 */
  onCancel?: () => void
}) {
  return (
    <Frame>
      <Header
        onOrderHistory={onOpenHistory}
        secondRow={
          <span className="rounded-[16px] bg-[#ededed] px-[18px] py-[5px] text-[15px] font-bold text-[#373737]">
            결제 확인 중
          </span>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[16px] px-[30px] pb-[110px] text-center">
        <p className="text-[20px] font-bold leading-[normal] text-black">결제를 확인하고 있어요…</p>
        <p className="text-[14px] font-medium text-[#969ca3]">
          잠시만 기다려 주세요. 결제가 확인되면 자동으로 넘어가요.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-[8px] text-[14px] font-semibold text-[#969ca3] underline underline-offset-2"
          >
            결제를 취소하고 장바구니로 돌아갈게요
          </button>
        )}
      </main>
    </Frame>
  )
}
