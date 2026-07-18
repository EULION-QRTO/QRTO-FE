import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import type { OrderResponse } from '../lib/dto'

// 주문 완료 화면 — 결제 승인(또는 0원 주문 접수) 후 진입한다.
export default function DoneScreen({
  order,
  onMore,
  onOpenHistory,
}: {
  order: OrderResponse | null
  onMore: () => void
  onOpenHistory: () => void
}) {
  return (
    <Frame>
      <Header
        onOrderHistory={onOpenHistory}
        secondRow={
          <span className="rounded-[16px] bg-[#e5f7e5] px-[18px] py-[5px] text-[15px] font-bold text-[#2e9e2e]">
            주문 완료
          </span>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[24px] px-[30px] pb-[110px]">
        <div className="flex size-[96px] items-center justify-center rounded-full bg-[#e5f7e5] text-[48px] font-bold text-[#2e9e2e]">
          ✓
        </div>
        <p className="text-center text-[24px] font-bold leading-[normal] text-black">
          주문이 접수되었어요!
        </p>
        {order && (
          <div className="w-full rounded-[16px] bg-[#fafbfc] p-[20px] shadow-[0px_1px_4.9px_-1px_rgba(0,0,0,0.25)]">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-[14px]">
                <span className="text-[#373737]">
                  {it.menuName} <span className="text-[#969ca3]">x{it.quantity}</span>
                </span>
                <span className="font-medium text-[#373737]">{it.lineTotal.toLocaleString()}원</span>
              </div>
            ))}
            <div className="mt-[12px] flex items-center justify-between border-t border-[#ededed] pt-[12px]">
              <span className="text-[14px] font-bold text-black">합계</span>
              <span className="text-[16px] font-bold text-[#ff6000]">
                {order.totalPrice.toLocaleString()}원
              </span>
            </div>
          </div>
        )}
      </main>

      <BottomButton label="메뉴 더 보기" active onClick={onMore} />
    </Frame>
  )
}
