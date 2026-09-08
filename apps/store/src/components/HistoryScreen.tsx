import Frame from './Frame'
import Header from './Header'
import backArrow from '../assets/back-arrow.svg'
import bagCross from '../assets/bag-cross.svg'
import type { OrderResponse, OrderStatus } from '../lib/dto'

// 진행중/완료 상태별 배지 색.
const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-[#ededed] text-[#969ca3]',
  RECEIVED: 'bg-[#ffe5d5] text-[#ff6000]',
  PREPARING: 'bg-[#ffe5d5] text-[#ff6000]',
  COOKED: 'bg-[#d5f0ff] text-[#0080c0]',
  SERVED: 'bg-[#e5f7e5] text-[#2e9e2e]',
  PICKED_UP: 'bg-[#e5f7e5] text-[#2e9e2e]',
  CANCELED: 'bg-[#f7e5e5] text-[#b3261e]',
}

function clock(iso: string): string {
  const ms = Date.parse(iso.replace(/(\.\d{3})\d+$/, '$1'))
  if (Number.isNaN(ms)) return ''
  return new Date(ms).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function OrderCard({ order }: { order: OrderResponse }) {
  return (
    <div className="shrink-0 rounded-[16px] bg-[#fafbfc] p-[20px] shadow-[0px_1px_4.9px_-1px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-[16px] px-[12px] py-[4px] text-[13px] font-bold ${STATUS_STYLE[order.status]}`}
        >
          {order.statusLabel}
        </span>
        <span className="text-[12px] font-medium text-[#969ca3]">{clock(order.createdAt)}</span>
      </div>
      <div className="mt-[12px] flex flex-col gap-[4px]">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-[14px]">
            <span className="text-[#373737]">
              {it.menuName} <span className="text-[#969ca3]">x{it.quantity}</span>
            </span>
            <span className="font-medium text-[#373737]">{it.lineTotal.toLocaleString()}원</span>
          </div>
        ))}
      </div>
      <div className="mt-[12px] flex items-center justify-between border-t border-[#ededed] pt-[12px]">
        <span className="text-[14px] font-bold text-black">합계</span>
        <span className="text-[16px] font-bold text-[#ff6000]">{order.totalPrice.toLocaleString()}원</span>
      </div>
    </div>
  )
}

// 주문내역 화면 — 우상단 "주문내역" 버튼을 누르면 진입한다.
export default function HistoryScreen({
  orders,
  loading,
  onBack,
}: {
  orders: OrderResponse[]
  loading: boolean
  onBack: () => void
}) {
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

      {loading ? (
        <main className="flex min-h-0 flex-1 items-center justify-center px-[30px]">
          <p className="text-[14px] font-medium text-[#969ca3]">불러오는 중…</p>
        </main>
      ) : orders.length === 0 ? (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[24px] px-[30px]">
          <img alt="" className="size-[96px]" src={bagCross} />
          <p className="text-center text-[24px] font-bold leading-[normal] text-[#959595]">
            주문내역이 없어요.
          </p>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto px-[30px] pb-[40px] pt-[18px]">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </main>
      )}
    </Frame>
  )
}
