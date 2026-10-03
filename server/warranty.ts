/* =========================================================================
   BẢO HÀNH — HÀM THUẦN DÙNG CHUNG (P1.1)
   =========================================================================
   Module này KHÔNG import express/db (chỉ import type) ⇒ test bằng node thuần:
   `npm run test:warranty`. `server/routes.ts` chỉ việc:

     GET /warranties         -> res.json(listBody(filterWarranties(db.getWarranties(), req.query), req.query));
     GET /warranties/lookup  -> res.json({ success: true, count, data })  // data đã gắn `remainingDays`

   Ngoài ra 2 helper phục vụ POST/PUT: `generateWarrantyCode()` (sinh mã phiếu `BH-<năm>-<4 số>`)
   và `addMonths()` (tự suy `endDate` từ `startDate` + `warrantyMonths`, kẹp đúng cuối tháng).

   Quy ước tra cứu công khai (không cần token):
   - khớp CHÍNH XÁC `code` hoặc `serialNumber` (không phân biệt hoa/thường), HOẶC
   - khớp HẬU TỐ số điện thoại (khách hay gõ thiếu số 0 / có dấu cách, dấu chấm, gạch ngang).
   Không cho tìm mờ theo tên/SĐT ⇒ tránh lộ dữ liệu khách khác; kết quả tối đa
   `LOOKUP_MAX_RESULTS` dòng và luôn yêu cầu tối thiểu `LOOKUP_MIN_LENGTH` ký tự.

   Mọi hàm đều KHÔNG sửa mảng/record đầu vào (trả bản mới) — dữ liệu nằm trong RAM của DB.
   ========================================================================= */
import type { Warranty, WarrantyStatus } from './types.js';
import type { QueryParams } from './pagination.js';

export const WARRANTY_STATUSES: WarrantyStatus[] = [
  'received',
  'inspecting',
  'repairing',
  'waiting_part',
  'done',
  'returned',
  'rejected'
];

/** Nhóm “đang xử lý” — dùng cho tab *Đang xử lý* ở CMS (P1.2). */
export const WARRANTY_PROCESSING_STATUSES: WarrantyStatus[] = [
  'received',
  'inspecting',
  'repairing',
  'waiting_part'
];

/** Số ký tự tối thiểu của ô tra cứu (tránh khách gõ 1–2 số là ra cả danh sách). */
export const LOOKUP_MIN_LENGTH = 4;
export const LOOKUP_MAX_RESULTS = 20;

/** Ngày tính bằng ms cho tiện tính “còn bao nhiêu ngày”. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Đọc 1 query param thành chuỗi đã trim (express có thể trả mảng khi param lặp). */
export function queryText(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

/** Chỉ giữ chữ số: `'0912 345.678'` → `'0912345678'`. */
export function digitsOnly(value: unknown): string {
  return queryText(value).replace(/\D/g, '');
}

/** Số ngày còn lại tới `dateIso` (âm = đã hết hạn). `null` = rỗng hoặc ngày không hợp lệ. */
export function daysUntil(dateIso: string | undefined | null, now: number = Date.now()): number | null {
  if (!dateIso) return null;
  const end = new Date(dateIso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

/** Cộng `months` tháng và giữ đúng ngày (31/01 + 1 tháng → 28/02). Trả ISO hoặc `null`. */
export function addMonths(dateIso: string, months: number): string | null {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime()) || !Number.isFinite(months)) return null;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + Math.trunc(months));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

/** Mã phiếu kế tiếp dạng `BH-<năm>-<4 chữ số>`, lấy số lớn nhất đã có + 1. */
export function generateWarrantyCode(
  list: Array<{ code?: string }>,
  year: number = new Date().getFullYear()
): string {
  let max = 0;
  for (const item of list) {
    const match = /^BH-\d{4}-(\d+)$/.exec(queryText(item.code).toUpperCase());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `BH-${year}-${String(max + 1).padStart(4, '0')}`;
}

/** Truy vấn tra cứu công khai có khớp phiếu này không (xem quy ước ở đầu file). */
export function matchWarrantyLookup(w: Warranty, query: unknown): boolean {
  const q = queryText(query).toLowerCase();
  if (!q) return false;
  if (queryText(w.code).toLowerCase() === q || queryText(w.serialNumber).toLowerCase() === q) return true;
  const digits = digitsOnly(q);
  if (digits.length >= LOOKUP_MIN_LENGTH && digitsOnly(w.phone).endsWith(digits)) return true;
  return false;
}

/** Gắn `remainingDays` / `isExpired` (trả bản mới, không sửa record gốc). */
export function withRemainingDays<T extends { endDate?: string }>(
  w: T,
  now: number = Date.now()
): T & { remainingDays: number | null; isExpired: boolean } {
  const remainingDays = daysUntil(w.endDate, now);
  return { ...w, remainingDays, isExpired: remainingDays !== null && remainingDays < 0 };
}

/** Kết quả tra cứu công khai: khớp + gắn số ngày còn lại, tối đa `limit` dòng. */
export function lookupWarranties<T extends Warranty>(
  list: T[],
  query: unknown,
  now: number = Date.now(),
  limit: number = LOOKUP_MAX_RESULTS
): Array<T & { remainingDays: number | null; isExpired: boolean }> {
  return list
    .filter(w => matchWarrantyLookup(w, query))
    .slice(0, Math.max(0, limit))
    .map(w => withRemainingDays(w, now));
}

/**
 * Lọc danh sách cho CMS: `status` (1 giá trị hoặc nhiều giá trị cách nhau dấu phẩy),
 * `q` (mã/serial/tên khách/tên sản phẩm/SĐT) và `expired=true|false` (đã hết hạn hay chưa).
 * Giá trị lạ (VD `?expired=abc`) bị bỏ qua — không lọc, không trả 400 (giống P0.4).
 */
export function filterWarranties<T extends Warranty>(
  list: T[],
  query: QueryParams,
  now: number = Date.now()
): T[] {
  const statuses = queryText(query.status)
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const q = queryText(query.q).toLowerCase();
  const digits = digitsOnly(q);
  const expired = queryText(query.expired).toLowerCase();

  return list.filter(w => {
    if (statuses.length > 0 && !statuses.includes(queryText(w.status).toLowerCase())) return false;

    if (q) {
      const hitText = [w.code, w.serialNumber, w.customerName, w.productName, w.phone].some(
        v => queryText(v).toLowerCase().includes(q)
      );
      const hitPhone = digits.length >= LOOKUP_MIN_LENGTH && digitsOnly(w.phone).includes(digits);
      if (!hitText && !hitPhone) return false;
    }

    if (expired === 'true' || expired === 'false') {
      const remainingDays = daysUntil(w.endDate, now);
      const isExpired = remainingDays !== null && remainingDays < 0;
      if (expired === 'true' && !isExpired) return false;
      if (expired === 'false' && isExpired) return false;
    }

    return true;
  });
}
