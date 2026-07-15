import type { ReactNode } from 'react'
import { ETC_ITEMS, MENU_ITEMS, type TabKey } from '../data'
import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import ProductCard from './ProductCard'

function Tab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[16px] px-[18px] py-[5px] text-[15px] text-[#373737] transition-colors ${
        active ? 'bg-[#ededed] font-bold' : 'bg-transparent font-medium'
      }`}
    >
      {label}
    </button>
  )
}

export default function OrderScreen({
  tab,
  onTabChange,
  quantities,
  onIncrement,
  onDecrement,
  total,
  hasSelection,
  onOpenCart,
  onOpenHistory,
  overlay,
}: {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  quantities: Record<string, number>
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  total: number
  hasSelection: boolean
  onOpenCart: () => void
  onOpenHistory: () => void
  // 메뉴 화면 위에 띄우는 오버레이(예: 포장 주문 전화번호 입력 모달).
  overlay?: ReactNode
}) {
  const items = tab === 'menu' ? MENU_ITEMS : ETC_ITEMS

  return (
    <Frame>
      <Header
        onOrderHistory={onOpenHistory}
        secondRow={
          <div className="flex items-center gap-[10px]">
            <Tab label="메뉴" active={tab === 'menu'} onClick={() => onTabChange('menu')} />
            <Tab label="기타" active={tab === 'etc'} onClick={() => onTabChange('etc')} />
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[30px] pb-[110px] pt-[18px]">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            quantity={quantities[item.id] ?? 0}
            onIncrement={() => onIncrement(item.id)}
            onDecrement={() => onDecrement(item.id)}
          />
        ))}
      </main>

      <BottomButton
        label={`${total.toLocaleString()}원${hasSelection ? ' 장바구니 보기' : ''}`}
        active={hasSelection}
        showCartIcon
        disabled={!hasSelection}
        onClick={onOpenCart}
      />

      {overlay}
    </Frame>
  )
}
