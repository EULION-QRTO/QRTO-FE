import Frame from './Frame'
import Header from './Header'

// 결제 확인 중 화면 — 페이앱 결제창에서 돌아왔을 때 보여준다(?orderId= 로 진입).
// 결제 완료 판정은 페이앱 서버가 우리 서버로 통보해야 이루어지므로, 손님앱은 그 결과가
// WebSocket(/topic/orders/{orderId})으로 도착할 때까지 여기서 잠깐 기다린다 — 보통 몇 초 이내.
export default function PaymentCheckScreen({ onOpenHistory }: { onOpenHistory: () => void }) {
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
      </main>
    </Frame>
  )
}
