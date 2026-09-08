import { type Product } from '../data'
import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import ProductCard from './ProductCard'
import backArrow from '../assets/back-arrow.svg'

export default function CartScreen({
  items,
  quantities,
  onIncrement,
  onDecrement,
  total,
  placing,
  onBack,
  onPay,
  onOpenHistory,
}: {
  items: Product[]
  quantities: Record<string, number>
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  total: number
  placing: boolean
  onBack: () => void
  onPay: () => void
  onOpenHistory: () => void
}) {
  // 장바구니에는 수량이 1개 이상인 항목만 표시한다.
  const cartItems = items.filter((item) => (quantities[item.id] ?? 0) > 0)
  // 0원 상품만 담겨 있어도 담긴 상품이 있으면 결제로 진행할 수 있어야 한다.
  const hasSelection = cartItems.length > 0

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
              장바구니
            </span>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[30px] pb-[110px] pt-[18px]">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              quantity={quantities[item.id] ?? 0}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
            />
          ))
        ) : (
          <p className="mt-[80px] text-center text-[14px] font-medium text-[#969ca3]">
            장바구니가 비어 있어요.
          </p>
        )}
      </main>

      <BottomButton
        label={placing ? '주문 처리 중…' : `${total.toLocaleString()}원 결제하기`}
        active={hasSelection && !placing}
        disabled={!hasSelection || placing}
        onClick={onPay}
      />
    </Frame>
  )
}
