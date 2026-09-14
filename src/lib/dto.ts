// 백엔드(QRTO-API) 손님 도메인(`/api/customer/**`) DTO — QRTO API 명세서 v2 기준.
// 모든 응답은 { success, data, error } envelope (PNG 이미지 응답 제외, 손님 도메인엔 없음).

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

/** GET /api/customer/entry/table/{qrToken} — 테이블 QR 진입 (항상 DINE_IN) */
export interface QrEntryResponse {
  orderType: 'DINE_IN'
  storeName: string
  tableName: string
}

/** GET /api/customer/entry/pickup/{pickupToken} — 픽업 QR 진입 (TAKEOUT) */
export interface PickupEntryResponse {
  orderType: 'TAKEOUT'
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

/** GET /api/customer/menu-board?token= — 카테고리별 그룹 */
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
  /** 테이블명 스냅샷(DINE_IN) — 테이블이 삭제돼도 과거 주문엔 남는다 */
  tableName?: string | null
  /** TAKEOUT. 손님 응답은 마스킹(`**-****-5678`)되어 온다 */
  phoneNumber: string | null
  /** TAKEOUT 4자리 */
  pickupNo: string | number | null
  status: OrderStatus
  statusLabel: string
  totalPrice: number
  items: OrderItemResponse[]
  createdAt: string
}

/** POST /api/customer/orders 요청 */
export interface CreateOrderRequest {
  orderType: OrderType
  /** [DINE_IN] 필수 */
  qrToken?: string
  /** [TAKEOUT] 필수 */
  pickupToken?: string
  /** [TAKEOUT] 필수, 숫자 10~11자리 */
  phoneNumber?: string
  /** 1~50개, menuId 중복 불가 */
  items: { menuId: number; quantity: number }[]
}

/* ── 결제 (페이앱, 2026-09-13~) ──
 * 결제 완료 판정은 손님앱이 아니라 페이앱 서버의 통보(payapp/feedback, 서버간 호출)로 이루어진다.
 * 손님앱은 링크만 발급받아 이동시키고, 이후는 WebSocket(/topic/orders/{orderId})으로 상태를 받는다.
 */
export interface PaymentRequestRequest {
  orderId: number
  /** 소유 증명 토큰 — 주문 생성 때 쓴 값 그대로(DINE_IN=qrToken, TAKEOUT=pickupToken) */
  token: string
}

export interface PaymentResponse {
  paymentId: number
  orderId: number
  amount: number
  /** live: REQUESTED(결제창으로 이동해야 함) | PAID. mock: 항상 PAID(즉시) */
  status: 'REQUESTED' | 'PAID' | string
  /** 'PAYAPP' | 'MOCK' */
  method: string
  payType: string | null
  /** live 이고 REQUESTED 일 때만 값이 있다 — 이 URL로 이동시키면 페이앱 결제창이 뜬다. mock 은 null. */
  payUrl: string | null
  approvedAt: string | null
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

/* ── 실시간(STOMP) — 손님(내 주문 상태) ── */
/** /topic/orders/{orderId} 로 오는 이벤트. phoneNumber 는 마스킹된 채로 온다. */
export interface OrderStatusEvent {
  orderId: number
  type: 'STATUS_CHANGED'
  order: OrderResponse
}
