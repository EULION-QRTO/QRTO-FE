import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Product, type TabKey, splitMenuBoard } from '../data'
import { useSession, entryToken, stripOrderIdParam } from '../session'
import { ApiError } from '../lib/api'
import {
  menuBoard,
  createOrder,
  requestPayment,
  callStaff,
  ordersByTable,
  ordersByPhone,
  cancelOrder,
  getOrder,
} from '../lib/endpoints'
import type { OrderResponse } from '../lib/dto'
import { readPendingPayment, writePendingPayment } from '../lib/pendingPayment'
import OrderScreen from './OrderScreen'
import CartScreen from './CartScreen'
import PayScreen from './PayScreen'
import PaymentCheckScreen from './PaymentCheckScreen'
import HistoryScreen from './HistoryScreen'
import DoneScreen from './DoneScreen'
import PhoneEntryModal from './PhoneEntryModal'

type View = 'order' | 'cart' | 'pay' | 'pay-check' | 'history' | 'done'

export default function StoreApp() {
  const { session, phone, setPhone, returnOrderId } = useSession()
  const [view, setView] = useState<View>(returnOrderId != null ? 'pay-check' : 'order')
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

  const token = entryToken(session)

  // 최신 view를 실시간 이벤트 핸들러(아래) 안에서 참조하기 위한 ref — 구독을 view 변경마다 끊고
  // 다시 맺지 않기 위해 의존성 배열에는 넣지 않는다.
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // 메뉴판 로드
  useEffect(() => {
    let alive = true
    setMenuLoading(true)
    menuBoard(token)
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
  }, [token, flash])

  // 페이앱 결제창에서 돌아온 경우(?orderId=) — 그 주문을 조회해 현재 상태로 화면을 맞춘다.
  // 결제가 아직 안 끝났으면(PENDING_PAYMENT) '결제 확인 중' 화면에서 실시간 구독(아래)이 이어받는다.
  useEffect(() => {
    if (returnOrderId == null) return
    // 결제를 끝내고 정상적으로 돌아온 경우 — 뒤로가기 복구용 마커는 더 이상 필요 없다.
    writePendingPayment(token, null)
    let alive = true
    ;(async () => {
      try {
        const o = await getOrder(returnOrderId, token)
        if (!alive) return
        setOrder(o)
        if (o.status === 'CANCELED') {
          flash('결제가 취소됐어요. 다시 주문해 주세요.')
          setView('order')
        } else if (o.status === 'PENDING_PAYMENT') {
          setView('pay-check')
        } else {
          setQuantities({})
          setView('done')
        }
      } catch (e) {
        if (!alive) return
        flash(e instanceof ApiError ? e.message : '주문 정보를 불러오지 못했습니다.')
        setView('order')
      } finally {
        stripOrderIdParam()
      }
    })()
    return () => {
      alive = false
    }
    // returnOrderId/token은 세션당 한 번만 정해지고 바뀌지 않는다 — 최초 1회만 실행하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnOrderId])

  // 결제 도중(페이앱→PG사 등 여러 단계를 거쳤더라도) 뒤로가기로 돌아온 경우 — 결제를 끝내지
  // 않고 돌아온 것이므로 결제대기 주문을 취소하고 장바구니로 되돌린다. 정상적으로 결제를 마치고
  // 돌아온 경우(위 returnOrderId 효과, ?orderId=)라면 그 효과가 먼저 마커를 지우므로 여기선
  // 아무 일도 하지 않는다.
  const recoverFromAbandonedPayment = useCallback(
    (pending: ReturnType<typeof readPendingPayment>) => {
      if (!pending) return
      writePendingPayment(token, null)
      void cancelOrder(pending.orderId, token).catch(() => {})
      setOrder(null)
      setQuantities(pending.quantities)
      setView('cart')
    },
    [token],
  )

  useEffect(() => {
    if (returnOrderId != null) return // 정상 복귀 — 위 효과가 처리
    recoverFromAbandonedPayment(readPendingPayment(token))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 페이지가 언로드되지 않고 브라우저 bfcache에 보관됐다가 뒤로가기로 복원되는 경우
    // (흔한 케이스) — 컴포넌트가 다시 마운트되지 않으므로 위 마운트 시점 체크로는 못 잡는다.
    // pageshow의 event.persisted가 그 신호다.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      recoverFromAbandonedPayment(readPendingPayment(token))
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [recoverFromAbandonedPayment, token])

  // 결제대기/확인중 주문의 실시간 상태 구독 — 결제 확정(RECEIVED) → 조리중 → 완료 → 서빙/픽업,
  // 취소·청산까지 전부 STATUS_CHANGED 로 온다. order.status/statusLabel 을 그대로 갱신하고,
  // 결제대기/확인중 화면에 있었다면 결과에 따라 완료 화면(또는 취소 시 메뉴 화면)으로 넘긴다.
  useEffect(() => {
    if (!order) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    // '../lib/realtime'(@stomp/stompjs 포함)는 주문이 생긴 이후에만 필요하므로, 여기서 동적
    // import로 분리해둔다 — 메뉴만 보는 손님은 이 코드를 아예 받지 않는다(별도 청크).
    import('../lib/realtime').then(({ subscribeOrderStatus }) => {
      if (cancelled) return
      unsubscribe = subscribeOrderStatus(token, order.id, (updated) => {
        setOrder(updated)
        const waitingForPayment = viewRef.current === 'pay' || viewRef.current === 'pay-check'
        if (!waitingForPayment) return
        if (updated.status === 'CANCELED') {
          flash('결제가 취소됐어요.')
          setQuantities({})
          setView('order')
        } else if (updated.status !== 'PENDING_PAYMENT') {
          setQuantities({})
          setView('done')
        }
      })
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [order?.id, token, flash])

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

  // 결제 요청(페이앱) — mock은 즉시 완료, live는 현재 탭을 결제창(payUrl)으로 이동시킨다.
  // 이동 직전에 뒤로가기 복구용 마커(주문 id + 장바구니 스냅샷)를 남겨둔다 — 페이앱→PG사 등
  // 여러 단계를 거치더라도 결제를 끝내지 않고 뒤로가기로 돌아오면 위쪽 효과들이 이걸로
  // 감지해 결제대기 주문을 취소하고 장바구니를 복원한다. 결제를 마치고 정상적으로 돌아오면
  // (?orderId=) 그 흐름에서 마커를 지운다.
  const startPayment = async () => {
    if (!order || placing) return
    setPlacing(true)
    try {
      const res = await requestPayment({ orderId: order.id, token })
      if (res.status === 'PAID') {
        setOrder(res.order)
        setQuantities({})
        setView('done')
      } else if (res.payUrl) {
        writePendingPayment(token, { orderId: order.id, quantities })
        window.location.href = res.payUrl
        return // 페이지 이동 — placing 해제 불필요(언마운트됨)
      } else {
        flash('결제 페이지를 여는 데 실패했습니다.')
      }
    } catch (e) {
      flash(e instanceof ApiError ? e.message : '결제 요청에 실패했습니다.')
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

  // 결제대기 화면에서 뒤로 가기 — 서버에 남는 결제대기 주문을 실제로 취소한다(PENDING_PAYMENT 에서만 가능).
  // 실패해도(이미 결제 확정 등) 어차피 화면은 장바구니로 돌아간다 — 손님이 다시 시도할 수 있게.
  const backFromPay = () => {
    if (order) void cancelOrder(order.id, token).catch(() => {})
    setOrder(null)
    setView('cart')
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

  if (!phoneGate && view === 'pay-check') {
    return (
      <>
        <PaymentCheckScreen onOpenHistory={openHistory} />
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
          onBack={backFromPay}
          onComplete={startPayment}
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
