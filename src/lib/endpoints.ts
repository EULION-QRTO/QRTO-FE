// QRTO-API 손님 도메인(`/api/customer/**`) 엔드포인트 래퍼 — 명세서 v2 기준.
// 경로는 config.API_BASE_URL(운영 https://api.lapy.shop, 로컬 http://localhost:8080) 뒤에 붙는다.
import { http } from './api'
import type {
  QrEntryResponse,
  PickupEntryResponse,
  MenuBoardResponse,
  OrderResponse,
  CreateOrderRequest,
  PaymentRequestRequest,
  PaymentResponse,
  StaffCallResponse,
} from './dto'

/** 테이블 QR 진입 (/order?token=) */
export const qrEntry = (qrToken: string) =>
  http.get<QrEntryResponse>(`/api/customer/entry/table/${qrToken}`)

/** 픽업 QR 진입 (/pickup?token=) */
export const pickupEntry = (pickupToken: string) =>
  http.get<PickupEntryResponse>(`/api/customer/entry/pickup/${pickupToken}`)

// menuBoard 진행중 요청 캐시 — 같은 token으로 거의 동시에 여러 번(진입 시 selfe prefetch +
// StoreApp 마운트 시) 부르더라도 실제 HTTP 요청은 하나만 나가게 한다. 페이지 하나짜리 세션 동안만
// 살아있는 메모리 캐시라 별도 TTL/무효화는 필요 없다(새로고침하면 모듈이 다시 로드되어 비워진다).
const menuBoardInFlight = new Map<string, Promise<MenuBoardResponse>>()

/**
 * 손님 메뉴판. token 은 qrToken(DINE_IN) 또는 pickupToken(TAKEOUT).
 * entry API 응답을 기다릴 필요가 없어서, session.tsx가 진입 API와 동시에(prefetch) 이 함수를
 * 미리 한 번 불러둔다 — StoreApp이 실제로 호출할 때 이미 진행 중인 요청을 그대로 재사용한다.
 */
export const menuBoard = (token: string) => {
  let p = menuBoardInFlight.get(token)
  if (!p) {
    p = http.get<MenuBoardResponse>('/api/customer/menu-board', { query: { token } })
    menuBoardInFlight.set(token, p)
    // 실패하면 캐시에서 빼서 다음 호출(예: 재시도)이 새 요청을 낼 수 있게 한다.
    p.catch(() => menuBoardInFlight.delete(token))
  }
  return p
}

/** 주문 생성 */
export const createOrder = (req: CreateOrderRequest) =>
  http.post<OrderResponse>('/api/customer/orders', { body: req })

/**
 * 주문 단건. `token`은 소유 증명 — DINE_IN이면 테이블 qrToken, TAKEOUT이면 매장 pickupToken을
 * 주문 생성 때 쓴 값 그대로 넘긴다(필수 쿼리, 없으면 400 C002).
 */
export const getOrder = (orderId: number, token: string) =>
  http.get<OrderResponse>(`/api/customer/orders/${orderId}`, { query: { token } })

/** 테이블 주문 내역 (청산 전, 최신순) */
export const ordersByTable = (qrToken: string) =>
  http.get<OrderResponse[]>('/api/customer/orders/by-table', { query: { token: qrToken } })

/** 픽업 주문 내역 (매장 픽업 토큰 + 전화번호) */
export const ordersByPhone = (pickupToken: string, phoneNumber: string) =>
  http.get<OrderResponse[]>('/api/customer/orders/by-phone', {
    query: { token: pickupToken, phoneNumber },
  })

/** 주문 취소 (결제대기 상태에서만). `token`은 getOrder와 동일한 소유 증명(필수 쿼리). */
export const cancelOrder = (orderId: number, token: string) =>
  http.patch<OrderResponse>(`/api/customer/orders/${orderId}/cancel`, { query: { token } })

/** 직원 호출 (테이블 QR 토큰, 테이블 주문만 가능) */
export const callStaff = (qrToken: string) =>
  http.post<StaffCallResponse>('/api/customer/staff-calls', { body: { qrToken } })

/**
 * 결제 요청 (페이앱) — 결제대기 주문의 결제 링크를 발급한다. 멱등(REQUESTED/PAID 상태면 그 값을 그대로 반환).
 * mock 모드는 외부 호출 없이 즉시 status:"PAID" (payUrl 없음). live 모드는 status:"REQUESTED" + payUrl —
 * 이 URL로 페이지 이동시켜야 페이앱 결제창이 뜬다. 결제 완료는 페이앱 서버가 통보하므로, 이후 상태는
 * WebSocket(/topic/orders/{orderId}) 구독이나 주문 재조회로 확인한다.
 */
export const requestPayment = (req: PaymentRequestRequest) =>
  http.post<PaymentResponse>('/api/customer/payments/request', { body: req })
