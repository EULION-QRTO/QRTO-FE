// 토스페이먼츠 v2 표준결제 SDK 로더 + 결제 요청/복귀 헬퍼.
//
// live 모드에서만 쓴다. (mock 모드는 SDK 없이 /api/payments/confirm 만 호출)
// 토스 결제창은 "리다이렉트" 방식이라 결제 후 앱이 새로 로드된다.
//  - 결제 성공 → successUrl 로 이동하며 뒤에 ?paymentKey=&orderId=&amount= 가 붙는다.
//  - 이탈 전 결제 대상(주문ID·금액·tossOrderId)을 sessionStorage 에 보관했다가 복귀 시 이어서 승인한다.

const SDK_URL = 'https://js.tosspayments.com/v2/standard'
// 비회원(익명) 결제용 고객 키.
const ANONYMOUS = 'ANONYMOUS'

type PaymentInstance = {
  requestPayment: (opts: Record<string, unknown>) => Promise<void>
}
type TossPaymentsInstance = {
  payment: (opts: { customerKey: string }) => PaymentInstance
}
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance
  }
}

let sdkPromise: Promise<void> | null = null
function loadSdk(): Promise<void> {
  if (window.TossPayments) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SDK_URL
    s.onload = () => resolve()
    s.onerror = () => {
      sdkPromise = null
      reject(new Error('토스 결제 모듈을 불러오지 못했습니다.'))
    }
    document.head.appendChild(s)
  })
  return sdkPromise
}

// ── 결제 대기(리다이렉트 이탈~복귀) 보관 ──
const PENDING_KEY = 'qrto:pay:pending'

export interface PendingPay {
  orderId: number // 백엔드 주문 ID
  amount: number
  tossOrderId: string // 토스에 넘긴 주문 문자열 ID
  orderName: string
}

export function savePending(p: PendingPay): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p))
  } catch {
    /* 저장 실패는 무시 — 복귀 시 승인만 불가, 결제 자체는 진행됨 */
  }
}

export function readPending(): PendingPay | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingPay) : null
  } catch {
    return null
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* noop */
  }
}

// 6~64자 영숫자/-/_ 규격을 만족하는 토스 orderId 생성.
export function makeTossOrderId(backendOrderId: number): string {
  return `qrto-${backendOrderId}-${Date.now()}`
}

export interface RequestParams {
  clientKey: string
  tossOrderId: string
  orderName: string
  amount: number
  successUrl: string
  failUrl: string
  customerName?: string
}

// 토스 결제창 요청. 성공하면 successUrl 로 리다이렉트된다(이 함수는 사실상 반환 없이 페이지 이탈).
export async function requestTossPayment(p: RequestParams): Promise<void> {
  await loadSdk()
  const toss = window.TossPayments!(p.clientKey)
  const payment = toss.payment({ customerKey: ANONYMOUS })
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: p.amount },
    orderId: p.tossOrderId,
    orderName: p.orderName,
    successUrl: p.successUrl,
    failUrl: p.failUrl,
    card: {
      useEscrow: false,
      flowMode: 'DEFAULT',
      useCardPoint: false,
      useAppCardOnly: false,
    },
  })
}

// 토스 리다이렉트 복귀 파라미터.
export interface TossReturn {
  paymentKey: string
  tossOrderId: string
  amount: number
}

// 현재 URL 에서 토스 성공 파라미터를 읽는다(없으면 null).
export function parseTossReturn(search = window.location.search): TossReturn | null {
  const q = new URLSearchParams(search)
  const paymentKey = q.get('paymentKey')
  const tossOrderId = q.get('orderId')
  const amount = q.get('amount')
  if (!paymentKey || !tossOrderId || !amount) return null
  return { paymentKey, tossOrderId, amount: Number(amount) }
}

// URL 에서 토스 파라미터만 제거하고 나머지(토큰 등)는 유지 — 히스토리를 깔끔히 정리한다.
export function stripTossParams(): void {
  const q = new URLSearchParams(window.location.search)
  q.delete('paymentKey')
  q.delete('orderId')
  q.delete('amount')
  const qs = q.toString()
  const clean = window.location.pathname + (qs ? `?${qs}` : '')
  window.history.replaceState(null, '', clean)
}
