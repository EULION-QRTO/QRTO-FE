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

/* ── 결제 (페이앱 링크 결제, 2026-09-13) ── */
/** POST /api/customer/payments/request 요청 — token 은 주문을 넣을 때 쓴 진입 토큰(qrToken/pickupToken) */
export interface PaymentRequestRequest {
  orderId: number
  token: string
}

export type PaymentStatus = 'REQUESTED' | 'PAID' | 'CANCELED'

/**
 * 결제 요청 응답.
 *  - status REQUESTED → payUrl(페이앱 결제창)로 손님을 보낸다. 결제 완료는 페이앱이 서버에 통보하고,
 *    주문이 RECEIVED 로 바뀌면 WebSocket /topic/orders/{id} 또는 주문 조회로 알 수 있다.
 *  - status PAID → 이미 결제됨(운영 mock 모드 즉시 승인, 또는 재요청). payUrl 없음.
 */
export interface PaymentResponse {
  paymentId: number
  orderId: number
  amount: number
  status: PaymentStatus
  /** PAYAPP | MOCK */
  method: string
  /** 페이앱 결제수단 코드(1 카드, 15 카카오페이 …). 결제 완료 전엔 null */
  payType: string | null
  /** REQUESTED 일 때만 */
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
