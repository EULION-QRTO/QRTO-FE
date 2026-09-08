/**
 * QRTO-API 명세서(포스 도메인) 엔드포인트 래퍼.
 * 경로는 모두 config.API_BASE_URL(기본 http://localhost:8080) 뒤에 붙는다.
 */
import { http, fetchImageObjectUrl } from "./api";
import type {
  LoginResponse,
  StoreResponse,
  UpdateStoreRequest,
  CategoryResponse,
  MenuResponse,
  CreateMenuRequest,
  UpdateMenuRequest,
  TableResponse,
  TableStatusResponse,
  ClearTableResponse,
  OrderResponse,
  OrderStatus,
  OrderType,
  StaffCallResponse,
  SalesSummaryResponse,
  CreateStoreRequest,
} from "./dto";

const base = (storeId: string | number) => `/api/stores/${storeId}`;

/* ── 인증 ── */
export const authApi = {
  /** POST /api/auth/login */
  login: (username: string, password: string) =>
    http.post<LoginResponse>("/api/auth/login", { body: { username, password }, auth: false }),
  /** GET /api/auth/me — 현재 토큰이 가리키는 매장 정보(+토큰 재발급) */
  me: () => http.get<LoginResponse>("/api/auth/me"),
};

/* ── 매장 ── */
export const storeApi = {
  /** GET /api/stores/{storeId} */
  get: (storeId: string | number) => http.get<StoreResponse>(base(storeId)),
  /** PATCH /api/stores/{storeId} — 보낸 필드만 변경 */
  update: (storeId: string | number, patch: UpdateStoreRequest) =>
    http.patch<StoreResponse>(base(storeId), { body: patch }),
};

/* ── 매장 관리(운영자) — 백엔드 구현 예정 ── */
export const storeAdminApi = {
  /** GET /api/stores — 전체 매장 목록 */
  list: () => http.get<StoreResponse[]>("/api/stores"),
  /** POST /api/stores — 매장 생성 */
  create: (req: CreateStoreRequest) => http.post<StoreResponse>("/api/stores", { body: req }),
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
  /** POST /api/stores/{storeId}/menus/images — multipart (2-step: URL 발급 후 메뉴에 연결) */
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
  /** PUT /api/stores/{storeId}/tables/bulk — 개수 일괄 설정(1~60) */
  bulk: (storeId: string | number, count: number) =>
    http.put<{ tableCount: number; created: number; deleted: number; tables: TableResponse[] }>(
      `${base(storeId)}/tables/bulk`,
      { body: { count } },
    ),
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
};
