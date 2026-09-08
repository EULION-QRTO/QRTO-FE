// QRTO-API 손님 도메인 엔드포인트 래퍼. 경로는 config.API_BASE_URL(기본 http://localhost:8080) 뒤에 붙는다.
import { http } from './api'
import type {
  QrEntryResponse,
  PickupEntryResponse,
  MenuBoardResponse,
  OrderResponse,
  CreateOrderRequest,
  PaymentConfigResponse,
  PaymentConfirmRequest,
  PaymentConfirmResponse,
  StaffCallResponse,
} from './dto'

/** 테이블 QR 진입 (/order?token=) */
export const qrEntry = (qrToken: string) => http.get<QrEntryResponse>(`/api/qr/${qrToken}`)

/** 픽업 QR 진입 (/pickup?token=) */
export const pickupEntry = (pickupToken: string) =>
  http.get<PickupEntryResponse>(`/api/qr/pickup/${pickupToken}`)

/** 손님 메뉴판 */
export const menuBoard = (storeId: number) =>
  http.get<MenuBoardResponse>(`/api/stores/${storeId}/menu-board`)

/** 주문 생성 */
export const createOrder = (req: CreateOrderRequest) =>
  http.post<OrderResponse>('/api/orders', { body: req })

/**
 * 주문 단건. `token`은 소유 증명 — DINE_IN이면 테이블 qrToken, TAKEOUT이면 매장 pickupToken을
 * 주문 생성 때 쓴 값 그대로 넘긴다(필수 쿼리, 없으면 400 C002).
 */
export const getOrder = (orderId: number, token: string) =>
  http.get<OrderResponse>(`/api/orders/${orderId}`, { query: { token } })

/** 테이블 주문 내역 (최신순) */
export const ordersByTable = (qrToken: string) =>
  http.get<OrderResponse[]>(`/api/orders/by-table/${qrToken}`)

/** 픽업 주문 내역 (매장 + 전화번호) */
export const ordersByPhone = (pickupToken: string, phoneNumber: string) =>
  http.get<OrderResponse[]>('/api/orders/by-phone', { query: { pickupToken, phoneNumber } })

/** 주문 취소 (결제대기 상태에서만). `token`은 getOrder와 동일한 소유 증명(필수 쿼리). */
export const cancelOrder = (orderId: number, token: string) =>
  http.patch<OrderResponse>(`/api/orders/${orderId}/cancel`, { query: { token } })

/** 결제창 설정 */
export const paymentConfig = () => http.get<PaymentConfigResponse>('/api/payments/config')

/** 결제 승인 */
export const confirmPayment = (req: PaymentConfirmRequest) =>
  http.post<PaymentConfirmResponse>('/api/payments/confirm', { body: req })

/** 직원 호출 (테이블 QR 토큰) */
export const callStaff = (qrToken: string) =>
  http.post<StaffCallResponse>('/api/staff-calls', { body: { qrToken } })
