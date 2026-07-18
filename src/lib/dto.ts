// 백엔드(QRTO-API) 손님 도메인 DTO. 모든 응답은 { success, data, error } envelope.

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

/** GET /api/qr/{qrToken} — 테이블 QR 진입 (항상 DINE_IN) */
export interface QrEntryResponse {
  orderType: 'DINE_IN'
  storeId: number
  storeName: string
  tableId: number
  tableName: string
}

/** GET /api/qr/pickup/{pickupToken} — 픽업 QR 진입 (TAKEOUT) */
export interface PickupEntryResponse {
  orderType: 'TAKEOUT'
  storeId: number
  storeName: string
  takeoutEnabled: boolean
}

/** 메뉴 단건 */
export interface MenuResponse {
  id: number
  storeId: number
  categoryId: number
  name: string
  price: number
  description: string | null
  imageUrl: string | null
  soldOut: boolean
  createdAt: string
  updatedAt: string
}

/** GET /api/stores/{storeId}/menu-board — 카테고리별 그룹 */
export interface MenuBoardResponse {
  categories: {
    categoryId: number
    categoryName: string
    sortOrder: number
    menus: MenuResponse[]
  }[]
}

/* ── 주문 ── */
export type OrderType = 'DINE_IN' | 'TAKEOUT'
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'RECEIVED'
  | 'PREPARING'
  | 'COOKED'
  | 'SERVED'
  | 'PICKED_UP'
  | 'CANCELED'

export interface OrderItemResponse {
  menuId: number
  menuName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderResponse {
  id: number
  storeId: number
  orderType: OrderType
  orderTypeLabel: string
  tableId: number | null
  tableName?: string | null
  phoneNumber: string | null
  pickupNo: string | number | null
  status: OrderStatus
  statusLabel: string
  totalPrice: number
  items: OrderItemResponse[]
  createdAt: string
}

/** POST /api/orders 요청 */
export interface CreateOrderRequest {
  orderType: OrderType
  qrToken?: string
  pickupToken?: string
  phoneNumber?: string
  items: { menuId: number; quantity: number }[]
}

/* ── 결제 ── */
export interface PaymentConfigResponse {
  clientKey: string
  mode: 'mock' | 'live' | string
}

export interface PaymentConfirmRequest {
  orderId: number
  amount: number
  paymentKey?: string
  tossOrderId?: string
}

export interface PaymentConfirmResponse {
  paymentId: number
  orderId: number
  amount: number
  status: string
  method: string
  approvedAt: string
  order: OrderResponse
}

/* ── 직원 호출 ── */
export interface StaffCallResponse {
  id: number
  storeId: number
  tableId: number
  status: 'CALLED' | 'RESOLVED'
  createdAt: string
}
