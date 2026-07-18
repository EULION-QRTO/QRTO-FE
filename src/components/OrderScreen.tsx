import type { ReactNode } from 'react'
import { type Product, type TabKey } from '../data'
import Frame from './Frame'
import Header from './Header'
import BottomButton from './BottomButton'
import ProductCard from './ProductCard'
import staffCallImg from '../assets/staff-call.png'

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

// 직원 호출 카드 — 테이블 주문에서만 '기타' 탭 상단에 노출. 탭하면 즉시 직원 호출 API 호출.
function StaffCallCard({ onCall }: { onCall: () => void }) {
  return (
    <button
      type="button"
      onClick={onCall}
      className="relative flex min-h-[123px] shrink-0 items-center gap-[16px] overflow-hidden rounded-[16px] bg-[#fafbfc] p-[20px] text-left shadow-[0px_1px_4.9px_-1px_rgba(0,0,0,0.25)]"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[16px] font-bold leading-[normal] text-black">직원 호출</h3>
        <p className="mt-[8px] text-[16px] font-bold leading-[normal] text-[#ff6000]">호출하기</p>
        <p className="mt-[6px] line-clamp-2 text-[10px] font-semibold leading-[normal] text-[#969ca3]">
          도움이 필요하면 탭하세요. 직원이 테이블로 찾아갑니다.
        </p>
      </div>
      <img alt="" className="size-[87px] shrink-0 self-start rounded-[16px] object-cover" src={staffCallImg} />
    </button>
  )
}

export default function OrderScreen({
  tab,
  onTabChange,
  menuItems,
  etcItems,
  loading,
  quantities,
  onIncrement,
  onDecrement,
  total,
  hasSelection,
  onOpenCart,
  onOpenHistory,
  onStaffCall,
  overlay,
}: {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  menuItems: Product[]
  etcItems: Product[]
  loading: boolean
  quantities: Record<string, number>
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  total: number
  hasSelection: boolean
  onOpenCart: () => void
  onOpenHistory: () => void
  // 테이블 주문일 때만 전달 — '기타' 탭에 직원 호출 카드를 띄운다.
  onStaffCall?: () => void
  // 메뉴 화면 위에 띄우는 오버레이(예: 포장 주문 전화번호 입력 모달).
  overlay?: ReactNode
}) {
  const items = tab === 'menu' ? menuItems : etcItems

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
        {tab === 'etc' && onStaffCall && <StaffCallCard onCall={onStaffCall} />}

        {loading ? (
          <p className="mt-[80px] text-center text-[14px] font-medium text-[#969ca3]">
            메뉴를 불러오는 중…
          </p>
        ) : items.length === 0 ? (
          tab === 'menu' || !onStaffCall ? (
            <p className="mt-[80px] text-center text-[14px] font-medium text-[#969ca3]">
              등록된 메뉴가 없어요.
            </p>
          ) : null
        ) : (
          items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              quantity={quantities[item.id] ?? 0}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
            />
          ))
        )}
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
