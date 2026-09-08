/**
 * 백엔드(QRTO-API) 응답/요청 DTO.
 *
 * 모든 REST 응답은 공통 envelope 로 감싸진다:
 *   { "success": true,  "data": <T> }
 *   { "success": false, "error": { "code": "A002", "message": "..." } }
 * (단, 이미지 바이트/일부 배열 응답 예외는 endpoints 계층에서 처리한다.)
 */

/** 공통 응답 envelope */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/* ── 인증 ── */
export interface LoginResponse {
  accessToken: string;
  /** 만료까지 남은 초 (기본 12h = 43200) */
  expiresIn: number;
  storeId: number;
  storeName: string;
}

/* ── 매장 ── */
/**
 * 매장 생성 요청 (총관리자). POST /api/stores — 헤더 X-Admin-Password 필요(storeAdminApi.create).
 * `org`는 백엔드 필드가 아니라 프론트 로컬 메타데이터(ManagedStore)에만 쓰인다 — 서버에 보내지 않는다.
 */
export interface CreateStoreRequest {
  /** 매장명 (길이 0~100) */
  name: string;
  /** 포스 로그인 아이디 (전체 매장에서 유일, 길이 0~50) */
  username: string;
  /** 포스 로그인 비밀번호 */
  password: string;
  /** 로고 이미지 URL (길이 0~500) */
  logoUrl?: string;
  /** 포장(픽업) 운영 여부 */
  takeoutEnabled?: boolean;
  /** 테이블 개수(표시용 — 실제 테이블 행은 생성하지 않음) */
  tableCount?: number;
  /** 정산 은행명 (길이 0~50) */
  bankName?: string;
  /** 정산 계좌번호 (길이 0~50) */
  accountNumber?: string;
  /** 예금주 (길이 0~50) */
  accountHolder?: string;
}

/** GET /api/stores — 공개 요약 목록 (정산계좌·pickupToken 등 민감정보 없음) */
export interface StoreSummaryResponse {
  id: number;
  name: string;
  logoUrl: string | null;
  takeoutEnabled: boolean;
  open: boolean;
  tableCount: number;
}

export interface StoreResponse {
  id: number;
  name: string;
  logoUrl: string | null;
  takeoutEnabled: boolean;
  /** 영업 중 여부 — PATCH /api/stores/{storeId}/open 으로 변경 */
  open: boolean;
  tableCount: number;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  pickupToken: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PATCH /api/stores/{storeId} — 전 필드 선택 */
export interface UpdateStoreRequest {
  name?: string;
  logoUrl?: string | null;
  takeoutEnabled?: boolean;
  tableCount?: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

/** PATCH /api/stores/{storeId}/open */
export interface StoreOpenRequest {
  open: boolean;
}

/** PATCH /api/admin/stores/open — 총관리자 전체 매장 일괄 토글 */
export interface AdminStoresOpenRequest {
  /** 총관리자 비밀번호 (설정값 qrto.admin.password) */
  password: string;
  open: boolean;
}
export interface AdminStoresOpenResponse {
  open: boolean;
  updatedCount: number;
}

/* ── 카테고리 ── */
export interface CategoryResponse {
  id: number;
  storeId: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/* ── 메뉴 ── */
export interface MenuResponse {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  soldOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuRequest {
  categoryId: number;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
}

export interface UpdateMenuRequest {
  categoryId?: number;
  name?: string;
  price?: number;
  description?: string | null;
  imageUrl?: string | null;
}

/* ── 테이블 ── */
export interface TableResponse {
  id: number;
  storeId: number;
  name: string;
  qrToken: string;
  qrUrl: string;
  qrImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

/* ── 포스 메인: 테이블 현황 ── */
export interface TableStatusItemSummary {
  menuName: string;
  quantity: number;
  unitPrice: number;
}

export interface TableStatusResponse {
  tableId: number;
  name: string;
  occupied: boolean;
  /** ISO 문자열, 빈 테이블이면 null */
  startedAt: string | null;
  elapsedMinutes: number | null;
  totalPrice: number;
  orderCount: number;
  itemSummary: TableStatusItemSummary[];
  orderIds: number[];
  staffCallActive: boolean;
}

/** PUT /api/stores/{storeId}/tables/bulk — 응답 data 는 갱신된 테이블 배열 그 자체 */
export type TableBulkResponse = TableResponse[];

/** POST .../tables/{tableId}/clear */
export interface ClearTableResponse {
  tableId: number;
  clearedOrderIds: number[];
  clearedCount: number;
  resolvedStaffCalls: number;
}

/* ── 주문 ── */
export type OrderType = "DINE_IN" | "TAKEOUT";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "RECEIVED"
  | "PREPARING"
  | "COOKED"
  | "SERVED"
  | "PICKED_UP"
  | "CANCELED";

export interface OrderItemResponse {
  menuId: number;
  menuName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderResponse {
  id: number;
  storeId: number;
  orderType: OrderType;
  orderTypeLabel: string;
  tableId: number | null;
  /** 테이블명 스냅샷 — 테이블이 삭제돼도 과거 주문엔 남는다 */
  tableName?: string | null;
  phoneNumber: string | null;
  pickupNo: string | number | null;
  status: OrderStatus;
  statusLabel: string;
  totalPrice: number;
  items: OrderItemResponse[];
  createdAt: string;
}

/* ── 직원 호출 ── */
export type StaffCallStatus = "CALLED" | "RESOLVED";
export interface StaffCallResponse {
  id: number;
  storeId: number;
  tableId: number;
  status: StaffCallStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

/* ── 매출 ── */
export interface SalesSummaryResponse {
  date: string;
  dineInSales: number;
  takeoutSales: number;
  totalSales: number;
  orderCount: number;
  dineInOrderCount: number;
  takeoutOrderCount: number;
  avgOrderPrice: number;
  canceledCount: number;
  /** date와 무관한 개장 이후 전체 누적 매출 */
  cumulativeSales: number;
}

/* ── 실시간(STOMP) 이벤트 ── */
export interface OrderEvent {
  storeId: number;
  type: "NEW_ORDER" | "STATUS_CHANGED";
  order: OrderResponse;
}

export interface StaffCallEvent {
  storeId: number;
  type: "CALLED" | "RESOLVED";
  call: StaffCallResponse;
}
