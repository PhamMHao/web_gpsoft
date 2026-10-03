/* =========================================================================
   PHÂN TRANG CHO CÁC ENDPOINT LIST (P0.4)
   =========================================================================
   Hợp đồng API (giữ tương thích ngược 100%):
   - Không truyền `page` và `limit`  → trả TOÀN BỘ danh sách như trước, KHÔNG có `meta`.
   - Có `page` hoặc `limit`          → trả đúng 1 trang + `meta: { page, limit, total, totalPages }`.
   - `limit` mặc định 20, tối đa 100 (vượt → kẹp về 100); `page` mặc định 1.
   - `page` vượt quá số trang → kẹp về trang cuối (UI không bị màn hình trắng).
   - Tham số rác (`?page=abc`, `?limit=-5`, `?limit=`) → dùng mặc định, KHÔNG trả 400.
   - `?page=2&page=3` (query lặp) → lấy giá trị đầu tiên (giống express `qs`).

   Module này là hàm thuần (không import express/db) nên test được bằng node thuần:
   `npm run test:pagination`. `server/routes.ts` chỉ việc `res.json(listBody(list, req.query))`.
   ========================================================================= */

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageResult<T> {
  items: T[];
  /** Chỉ có khi request thực sự yêu cầu phân trang. */
  meta?: PageMeta;
}

export interface ListResponse<T> {
  success: true;
  /** Số phần tử trả về trong response (1 trang). */
  count: number;
  /** Tổng số phần tử sau khi filter (bằng `data.length` khi không phân trang). */
  total: number;
  data: T[];
  meta?: PageMeta;
}

/** Query param lấy từ express (`req.query`) — nhận cả giá trị đơn và mảng (query lặp). */
export type QueryParams = Record<string, unknown>;

/** Đọc số nguyên ≥ 1; giá trị rỗng/không parse được/bé hơn 1 ⇒ dùng `fallback`. */
export function positiveInt(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 1 ? i : fallback;
}

/** Chuẩn hoá `page`/`limit` từ query. `requested` = client có ý định phân trang hay không. */
export function parsePaging(query: QueryParams): { requested: boolean; page: number; limit: number } {
  const requested = query.page !== undefined || query.limit !== undefined;
  const limit = Math.min(positiveInt(query.limit, DEFAULT_PAGE_LIMIT), MAX_PAGE_LIMIT);
  const page = positiveInt(query.page, 1);
  return { requested, page, limit };
}

/** Cắt 1 trang dữ liệu từ danh sách **đã filter/sort**. Không sửa mảng đầu vào. */
export function paginateList<T>(list: T[], query: QueryParams): PageResult<T> {
  const { requested, page, limit } = parsePaging(query);
  if (!requested) return { items: list };

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: list.slice(start, start + limit),
    meta: { page: safePage, limit, total, totalPages }
  };
}

/** Body JSON thống nhất cho mọi endpoint list: `{ success, count, total, data, meta? }`. */
export function listBody<T>(list: T[], query: QueryParams): ListResponse<T> {
  const { items, meta } = paginateList(list, query);
  return {
    success: true,
    count: items.length,
    total: meta ? meta.total : list.length,
    ...(meta ? { meta } : {}),
    data: items
  };
}
