import { useState } from 'react'
import { ALL_ITEMS, type TabKey } from '../data'
import { useSession } from '../session'
import OrderScreen from './OrderScreen'
import CartScreen from './CartScreen'
import PayScreen from './PayScreen'
import HistoryScreen from './HistoryScreen'
import PhoneEntryModal from './PhoneEntryModal'

type View = 'order' | 'cart' | 'pay' | 'history'

export default function StoreApp() {
  const { session, phone, setPhone } = useSession()
  const [view, setView] = useState<View>('order')
  // 주문내역 화면에서 뒤로가기 시 돌아갈 화면
  const [historyReturn, setHistoryReturn] = useState<View>('order')
  const [tab, setTab] = useState<TabKey>('menu')
  // 모든 화면이 공유하는 장바구니 수량 (초기에는 빈 장바구니)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const increment = (id: string) =>
    setQuantities((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }))
  const decrement = (id: string) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }))

  const total = ALL_ITEMS.reduce(
    (sum, item) => sum + (quantities[item.id] ?? 0) * item.price,
    0,
  )
  // 0원 상품만 담아도 "선택된 상품"이 있으면 장바구니/결제로 진행할 수 있어야 한다.
  const hasSelection = ALL_ITEMS.some((item) => (quantities[item.id] ?? 0) > 0)

  // 주문내역 버튼을 누른 화면을 기억했다가, 뒤로가기 시 그 화면으로 복귀한다.
  const openHistory = () => {
    setHistoryReturn(view)
    setView('history')
  }

  const handlePay = () => {
    if (total > 0) {
      // 유료 상품이 있는 주문 → 결제(결재)대기 화면
      setView('pay')
    } else {
      // 전부 0원(무료) 상품만 담긴 주문 → 별도 화면 (디자인 확정 후 연결)
      // TODO: 무료 주문 완료 화면으로 분기
    }
  }

  // 포장(togo) 주문은 전화번호를 먼저 입력해야 한다.
  // 메뉴 화면 위에 전화번호 입력 모달을 띄우고, 입력 전까지는 다른 화면으로 넘어가지 않는다.
  const phoneGate = session.mode === 'togo' && !phone

  if (!phoneGate && view === 'history') {
    return <HistoryScreen onBack={() => setView(historyReturn)} />
  }

  if (!phoneGate && view === 'pay') {
    return (
      <PayScreen
        onBack={() => setView('cart')}
        onComplete={() => {
          /* 결제 완료 후 화면은 아직 디자인 전 — 추후 연결 */
        }}
        onOpenHistory={openHistory}
      />
    )
  }

  if (!phoneGate && view === 'cart') {
    return (
      <CartScreen
        quantities={quantities}
        onIncrement={increment}
        onDecrement={decrement}
        total={total}
        onBack={() => setView('order')}
        onPay={handlePay}
        onOpenHistory={openHistory}
      />
    )
  }

  return (
    <OrderScreen
      tab={tab}
      onTabChange={setTab}
      quantities={quantities}
      onIncrement={increment}
      onDecrement={decrement}
      total={total}
      hasSelection={hasSelection}
      onOpenCart={() => setView('cart')}
      onOpenHistory={openHistory}
      overlay={phoneGate ? <PhoneEntryModal onSubmit={setPhone} /> : undefined}
    />
  )
}
