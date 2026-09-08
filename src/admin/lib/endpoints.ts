/**
 * QRTO-API 명세서(포스 도메인) 엔드포인트 래퍼.
 * 경로는 모두 config.API_BASE_URL(기본 http://localhost:8080) 뒤에 붙는다.
 */
import { http, fetchImageObjectUrl, fetchBlob } from "./api";
import type {
  LoginResponse,
  StoreResponse,
  StoreSummaryResponse,
  UpdateStoreRequest,
  StoreOpenRequest,
  CategoryResponse,
  MenuResponse,
  CreateMenuRequest,
  UpdateMenuRequest,
  TableResponse,
  TableBulkResponse,
  TableStatusResponse,
  ClearTableResponse,
  OrderResponse,
  OrderStatus,
  OrderType,
  StaffCallResponse,
  SalesSummaryResponse,
  CreateStoreRequest,
  AdminStoresOpenRequest,
  AdminStoresOpenResponse,
} from "./dto";

const base = (storeId: string | number) => `/api/stores/${storeId}`;

/* ── 인증 ── */
export const authApi = {
  /** POST /api/auth/login */
  login: (username: string, password: string) =>
    http.post<LoginResponse>("/api/auth/login", { body: { username, password }, auth: false }),
  /** GET /api/auth/me?storeId= — 현재 토큰이 가리키는 매장 정보 확인(토큰 재발급 아님, 잔여 TTL 그대로) */
  me: (storeId: string | number) =>
    http.get<LoginResponse>("/api/auth/me", { query: { storeId } }),
};

/* ── 매장 ── */
export const storeApi = {
  /** GET /api/stores/{storeId} */
  get: (storeId: string | number) => http.get<StoreResponse>(base(storeId)),
  /** PATCH /api/stores/{storeId} — 보낸 필드만 변경 */
  update: (storeId: string | number, patch: UpdateStoreRequest) =>
    http.patch<StoreResponse>(base(storeId), { body: patch }),
  /** PATCH /api/stores/{storeId}/open — 장사 시작/종료 */
  setOpen: (storeId: string | number, req: StoreOpenRequest) =>
    http.patch<StoreResponse>(`${base(storeId)}/open`, { body: req }),
};

/* ── 매장 관리(총관리자) ── */
export const storeAdminApi = {
  /** GET /api/stores — 공개 요약 목록 (인증 불필요) */
  list: () => http.get<StoreSummaryResponse[]>("/api/stores", { auth: false }),
  /** POST /api/stores — 매장 생성. X-Admin-Password 헤더 필요. */
  create: (req: CreateStoreRequest, adminPassword: string) =>
    http.post<StoreResponse>("/api/stores", {
      body: req,
      auth: false,
      headers: { "X-Admin-Password": adminPassword },
    }),
};

/* ── 총관리자 ── */
export const adminApi = {
  /** PATCH /api/admin/stores/open — 전체 매장 영업 상태 일괄 변경 (비밀번호는 본문) */
  setStoresOpen: (req: AdminStoresOpenRequest) =>
    http.patch<AdminStoresOpenResponse>("/api/admin/stores/open", { body: req, auth: false }),
};

/* ── 카테고리 ── */
export const categoryApi = {
  list: (storeId: string | number) =>
    http.get<CategoryResponse[]>(`${base(storeId)}/categories`),
  create: (storeId: string | number, name: string, sortOrder: number) =>
    http.post<CategoryResponse>(`${base(storeId)}/categories`, { body: { name, sortOrder } }),
  update: (storeId: string | number, categoryId: number, patch: { name?: string; sortOrder?: number }) =>
    http.patch<CategoryResponse>(`${base(storeId)}/categories/${categoryId}`, { body: patch }),
  remove: (storeId: string | number, categoryId: number) =>
    http.delete<null>(`${base(storeId)}/categories/${categoryId}`),
};

/* ── 메뉴 ── */
export const menuApi = {
  list: (storeId: string | number, categoryId?: number) =>
    http.get<MenuResponse[]>(`${base(storeId)}/menus`, { query: { categoryId } }),
  get: (storeId: string | number, menuId: number) =>
    http.get<MenuResponse>(`${base(storeId)}/menus/${menuId}`),
  create: (storeId: string | number, req: CreateMenuRequest) =>
    http.post<MenuResponse>(`${base(storeId)}/menus`, { body: req }),
  update: (storeId: string | number, menuId: number, patch: UpdateMenuRequest) =>
    http.patch<MenuResponse>(`${base(storeId)}/menus/${menuId}`, { body: patch }),
  setSoldOut: (storeId: string | number, menuId: number, soldOut: boolean) =>
    http.patch<MenuResponse>(`${base(storeId)}/menus/${menuId}/sold-out`, { body: { soldOut } }),
  remove: (storeId: string | number, menuId: number) =>
    http.delete<null>(`${base(storeId)}/menus/${menuId}`),
  /**
   * POST /api/stores/{storeId}/menus/images — multipart (2-step: URL 발급 후 메뉴에 연결).
   * ⚠️ 2026-09-08 기준 공식 API 명세서(Swagger 자동생성, 47개 엔드포인트)에 이 경로가 없다.
   * 백엔드에 실제로 없다면 404가 난다 — 메뉴 사진 첨부 기능을 계속 쓸지, 이미지 URL 직접 입력
   * 방식으로 바꿀지 백엔드 담당자와 확인 필요.
   */
  uploadImage: (storeId: string | number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<{ imageUrl: string }>(`${base(storeId)}/menus/images`, { form });
  },
};

/* ── 테이블 · QR ── */
export const tableApi = {
  list: (storeId: string | number) => http.get<TableResponse[]>(`${base(storeId)}/tables`),
  get: (storeId: string | number, tableId: number) =>
    http.get<TableResponse>(`${base(storeId)}/tables/${tableId}`),
  create: (storeId: string | number, name: string) =>
    http.post<TableResponse>(`${base(storeId)}/tables`, { body: { name } }),
  rename: (storeId: string | number, tableId: number, name: string) =>
    http.patch<TableResponse>(`${base(storeId)}/tables/${tableId}`, { body: { name } }),
  remove: (storeId: string | number, tableId: number) =>
    http.delete<null>(`${base(storeId)}/tables/${tableId}`),
  /** PUT /api/stores/{storeId}/tables/bulk — 개수 일괄 설정(0~100). 응답 data 는 테이블 배열 그 자체. */
  bulk: (storeId: string | number, count: number) =>
    http.put<TableBulkResponse>(`${base(storeId)}/tables/bulk`, { body: { count } }),
  /** 테이블 QR PNG object URL */
  qrImageUrl: (storeId: string | number, tableId: number) =>
    fetchImageObjectUrl(`${base(storeId)}/tables/${tableId}/qr-image`),
  /** 매장 픽업 QR PNG object URL */
  pickupQrImageUrl: (storeId: string | number) =>
    fetchImageObjectUrl(`${base(storeId)}/pickup-qr-image`),
  /** POST .../tables/{tableId}/clear — 테이블 정리(청산) */
  clear: (storeId: string | number, tableId: number) =>
    http.post<ClearTableResponse>(`${base(storeId)}/tables/${tableId}/clear`),
};

/* ── 포스 메인: 테이블 현황 ── */
export const tableStatusApi = {
  /** GET /api/stores/{storeId}/table-status — data 가 배열(래핑 아님) */
  list: (storeId: string | number) =>
    http.get<TableStatusResponse[]>(`${base(storeId)}/table-status`),
};

/* ── 주문 ── */
export const orderApi = {
  list: (storeId: string | number, filter?: { status?: OrderStatus; type?: OrderType }) =>
    http.get<OrderResponse[]>(`${base(storeId)}/orders`, { query: { ...filter } }),
  setStatus: (storeId: string | number, orderId: number, status: OrderStatus) =>
    http.patch<OrderResponse>(`${base(storeId)}/orders/${orderId}/status`, { body: { status } }),
};

/* ── 직원 호출 ── */
export const staffCallApi = {
  list: (storeId: string | number, onlyActive = false) =>
    http.get<StaffCallResponse[]>(`${base(storeId)}/staff-calls`, { query: { onlyActive } }),
  resolve: (storeId: string | number, callId: number) =>
    http.patch<StaffCallResponse>(`${base(storeId)}/staff-calls/${callId}/resolve`),
};

/* ── 매출 ── */
export const salesApi = {
  /** GET /api/stores/{storeId}/sales/summary — date 생략 시 오늘(Asia/Seoul) */
  summary: (storeId: string | number, date?: string) =>
    http.get<SalesSummaryResponse>(`${base(storeId)}/sales/summary`, { query: { date } }),
  /** GET /api/stores/{storeId}/sales/orders — 개장 이후 결제 확정 주문 전체(명세서) */
  orders: (storeId: string | number, type?: OrderType) =>
    http.get<OrderResponse[]>(`${base(storeId)}/sales/orders`, { query: { type } }),
  /** GET /api/stores/{storeId}/sales/export — CSV(text/csv;charset=UTF-8+BOM, envelope 아님) */
  exportCsv: (storeId: string | number, type?: OrderType) =>
    fetchBlob(`${base(storeId)}/sales/export`, { type }),
};
