import { useCallback, useEffect, useMemo, useState } from 'react'
import { type Product, type TabKey, splitMenuBoard } from '../data'
import { useSession } from '../session'
import { ApiError } from '../lib/api'
import {
  menuBoard,
  createOrder,
  confirmPayment,
  callStaff,
  ordersByTable,
  ordersByPhone,
} from '../lib/endpoints'
import type { OrderResponse } from '../lib/dto'
import OrderScreen from './OrderScreen'
import CartScreen from './CartScreen'
import PayScreen from './PayScreen'
import HistoryScreen from './HistoryScreen'
import DoneScreen from './DoneScreen'
import PhoneEntryModal from './PhoneEntryModal'

type View = 'order' | 'cart' | 'pay' | 'history' | 'done'

export default function StoreApp() {
  const { session, phone, setPhone } = useSession()
  const [view, setView] = useState<View>('order')
  const [historyReturn, setHistoryReturn] = useState<View>('order')
  const [tab, setTab] = useState<TabKey>('menu')

  // 메뉴판 (API)
  const [menu, setMenu] = useState<{ menu: Product[]; etc: Product[] } | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)

  // 장바구니: menuId(string) → 수량
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // 주문/결제
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [placing, setPlacing] = useState(false)

  // 주문내역
  const [history, setHistory] = useState<OrderResponse[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [notice, setNotice] = useState<string | null>(null)
  const flash = useCallback((msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }, [])

  // 메뉴판 로드
  useEffect(() => {
    let alive = true
    setMenuLoading(true)
    menuBoard(session.storeId)
      .then((board) => {
        if (alive) setMenu(splitMenuBoard(board))
      })
      .catch((e) => {
        if (alive) flash(e instanceof ApiError ? e.message : '메뉴를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (alive) setMenuLoading(false)
      })
    return () => {
      alive = false
    }
  }, [session.storeId, flash])

  const allItems = useMemo(() => (menu ? [...menu.menu, ...menu.etc] : []), [menu])
  const priceById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const it of allItems) m.set(it.id, it)
    return m
  }, [allItems])

  const increment = (id: string) => {
    if (priceById.get(id)?.soldOut) return
    setQuantities((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }))
  }
  const decrement = (id: string) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }))

  const total = allItems.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.price, 0)
  const hasSelection = allItems.some((item) => (quantities[item.id] ?? 0) > 0)

  const openHistory = () => {
    setHistoryReturn(view)
    setView('history')
    void loadHistory()
  }

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      let list: OrderResponse[] = []
      if (session.mode === 'table') {
        list = await ordersByTable(session.qrToken)
      } else if (phone) {
        list = await ordersByPhone(session.pickupToken, phone)
      }
      setHistory(list)
    } catch (e) {
      flash(e instanceof ApiError ? e.message : '주문내역을 불러오지 못했습니다.')
    } finally {
      setHistoryLoading(false)
    }
  }, [session, phone, flash])

  // 주문 생성 → (유료면) 결제대기, (0원이면) 즉시 완료
  const placeOrder = async () => {
    if (!hasSelection || placing) return
    const items = allItems
      .filter((it) => (quantities[it.id] ?? 0) > 0)
      .map((it) => ({ menuId: Number(it.id), quantity: quantities[it.id] }))

    setPlacing(true)
    try {
      const created =
        session.mode === 'table'
          ? await createOrder({ orderType: 'DINE_IN', qrToken: session.qrToken, items })
          : await createOrder({
              orderType: 'TAKEOUT',
              pickupToken: session.pickupToken,
              phoneNumber: phone,
              items,
            })
      setOrder(created)
      if (created.status === 'RECEIVED') {
        // 합계 0원 → 결제 없이 즉시 접수
        setQuantities({})
        setView('done')
      } else {
        setView('pay')
      }
    } catch (e) {
      flash(e instanceof ApiError ? e.message : '주문에 실패했습니다.')
    } finally {
      setPlacing(false)
    }
  }

  // 결제 승인 (mock)
  const confirm = async () => {
    if (!order || placing) return
    setPlacing(true)
    try {
      const res = await confirmPayment({ orderId: order.id, amount: order.totalPrice })
      setOrder(res.order)
      setQuantities({})
      setView('done')
    } catch (e) {
      flash(e instanceof ApiError ? e.message : '결제에 실패했습니다.')
    } finally {
      setPlacing(false)
    }
  }

  const staffCall = async () => {
    if (session.mode !== 'table') return
    try {
      await callStaff(session.qrToken)
      flash('직원을 호출했어요. 잠시만 기다려 주세요.')
    } catch (e) {
      flash(e instanceof ApiError ? e.message : '직원 호출에 실패했습니다.')
    }
  }

  const handlePay = () => {
    if (!hasSelection) return
    void placeOrder()
  }

  // 포장(togo) 주문은 전화번호를 먼저 입력해야 한다.
  const phoneGate = session.mode === 'togo' && !phone

  const noticeBar = notice ? (
    <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[16px] bg-[rgba(28,28,28,0.9)] px-[18px] py-[10px] text-[13px] font-semibold text-white">
      {notice}
    </div>
  ) : null

  if (!phoneGate && view === 'done') {
    return (
      <>
        <DoneScreen
          order={order}
          onMore={() => {
            setOrder(null)
            setView('order')
          }}
          onOpenHistory={openHistory}
        />
        {noticeBar}
      </>
    )
  }

  if (!phoneGate && view === 'history') {
    return (
      <>
        <HistoryScreen orders={history} loading={historyLoading} onBack={() => setView(historyReturn)} />
        {noticeBar}
      </>
    )
  }

  if (!phoneGate && view === 'pay') {
    return (
      <>
        <PayScreen
          amount={order?.totalPrice ?? total}
          placing={placing}
          onBack={() => setView('cart')}
          onComplete={confirm}
          onOpenHistory={openHistory}
        />
        {noticeBar}
      </>
    )
  }

  if (!phoneGate && view === 'cart') {
    return (
      <>
        <CartScreen
          items={allItems}
          quantities={quantities}
          onIncrement={increment}
          onDecrement={decrement}
          total={total}
          placing={placing}
          onBack={() => setView('order')}
          onPay={handlePay}
          onOpenHistory={openHistory}
        />
        {noticeBar}
      </>
    )
  }

  return (
    <>
      <OrderScreen
        tab={tab}
        onTabChange={setTab}
        menuItems={menu?.menu ?? []}
        etcItems={menu?.etc ?? []}
        loading={menuLoading}
        quantities={quantities}
        onIncrement={increment}
        onDecrement={decrement}
        total={total}
        hasSelection={hasSelection}
        onOpenCart={() => setView('cart')}
        onOpenHistory={openHistory}
        onStaffCall={session.mode === 'table' ? staffCall : undefined}
        overlay={phoneGate ? <PhoneEntryModal onSubmit={setPhone} /> : undefined}
      />
      {noticeBar}
    </>
  )
}
