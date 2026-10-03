/* =========================================================================
   BÁO GIÁ — HÀM THUẦN DÙNG CHUNG (P1.4 + P1.5)
   =========================================================================
   Module này KHÔNG import express/db (chỉ import type) ⇒ test bằng node thuần:
   `npm run test:quotes`. `server/routes.ts` chỉ việc map HTTP ↔ hàm:

     GET  /price-quotes        -> res.json(listBody(filterQuotes(db.getPriceQuotes(), req.query), req.query));
     POST /price-quotes        -> normalizeQuoteItems() + computeQuoteTotal()  // KHÔNG tin `total` từ client
     GET  /price-quotes/export.csv -> buildQuoteCsv()
     GET  /quote-links/:code?pass= -> checkQuoteLink()

   Hai quy ước quan trọng:

   1. **Tiền luôn tính ở server.** Client chỉ gửi `qty` + `unitPrice` từng dòng; `item.total`
      và `quote.total` do `normalizeQuoteItems()` / `computeQuoteTotal()` sinh ra. Số âm, số lẻ,
      chuỗi `"12abc"` hay `qty = 0` đều bị chuẩn hoá ⇒ không thể “bơm” tổng tiền từ trình duyệt.

   2. **Link chia sẻ là dữ liệu công khai** (ai có URL cũng mở) nên phải kiểm 3 điều kiện trước khi
      trả báo giá: link tồn tại → đang bật → chưa quá `expiresAt`; nếu có `password` thì khớp mật khẩu
      mới trả dữ liệu. Sai/thiếu ⇒ trả `'invalid'` (route trả 404) hoặc `'password'` (route trả 401 +
      `requiresPassword: true` để trang public hiện form nhập lại), **không** lộ thông tin báo giá.

   Mọi hàm đều KHÔNG sửa mảng/record đầu vào (trả bản mới) — dữ liệu nằm trong RAM của DB.
   ========================================================================= */
import type { PriceQuote, PriceQuoteItem, PriceQuoteStatus, QuoteLink } from './types.js';
import type { QueryParams } from './pagination.js';
import { queryText, daysUntil } from './warranty.js';

export const QUOTE_STATUSES: PriceQuoteStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
];

/** Trạng thái coi như “còn sống”: tự chuyển `expired` khi quá `validUntil`. */
export const QUOTE_OPEN_STATUSES: PriceQuoteStatus[] = ['draft', 'sent'];

/** Chặn báo giá quá dài (client gửi mảng 10.000 dòng ⇒ chặn ngay từ server). */
export const QUOTE_MAX_ITEMS = 50;

/** Báo giá mặc định có hiệu lực 30 ngày kể từ lúc tạo. */
export const QUOTE_VALID_DAYS = 30;

/** Số lần thử sinh mã link chia sẻ trước khi bỏ cuộc (chống trùng mã). */
const LINK_CODE_ATTEMPTS = 50;
const LINK_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function isQuoteStatus(value: unknown): value is PriceQuoteStatus {
  return QUOTE_STATUSES.includes(queryText(value) as PriceQuoteStatus);
}

/** Số nguyên ≥ 0 (làm tròn xuống); giá trị rác/âm ⇒ `fallback` (mặc định 0). */
export function nonNegativeInt(value: unknown, fallback = 0): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** Tiền: làm tròn tới đồng, không nhận NaN/âm. */
export function money(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** Thành tiền 1 dòng = `qty × unitPrice` (nguồn sự thật duy nhất). */
export function computeItemTotal(qty: unknown, unitPrice: unknown): number {
  return money(nonNegativeInt(qty) * money(unitPrice));
}

/** Σ thành tiền toàn bộ dòng. */
export function computeQuoteTotal(items: Array<{ qty?: unknown; unitPrice?: unknown }>): number {
  return items.reduce((sum, item) => sum + computeItemTotal(item.qty, item.unitPrice), 0);
}

/**
 * Chuẩn hoá 1 dòng do client gửi: bỏ dòng không có tên, kẹp `qty`/`unitPrice`,
 * **luôn tính lại** `total` (không dùng `total` client gửi).
 */
export function normalizeQuoteItem(raw: Record<string, unknown>): PriceQuoteItem {
  const qty = nonNegativeInt(raw.qty);
  const unitPrice = money(raw.unitPrice);
  return {
    name: queryText(raw.name),
    spec: queryText(raw.spec) || undefined,
    unit: queryText(raw.unit) || 'Chiếc',
    qty,
    unitPrice,
    total: computeItemTotal(qty, unitPrice)
  };
}

/** Chuẩn hoá cả bảng dòng: tối đa `QUOTE_MAX_ITEMS`, bỏ dòng rỗng tên. */
export function normalizeQuoteItems(raw: unknown): PriceQuoteItem[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, QUOTE_MAX_ITEMS)
    .map(normalizeQuoteItem)
    .filter(item => item.name.length > 0);
}

/** Mã báo giá kế tiếp dạng `BG-<năm>-<4 chữ số>`, lấy số lớn nhất đã có + 1. */
export function generateQuoteCode(
  list: Array<{ code?: string }>,
  year: number = new Date().getFullYear()
): string {
  let max = 0;
  for (const item of list) {
    const match = /^BG-\d{4}-(\d+)$/.exec(queryText(item.code).toUpperCase());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `BG-${year}-${String(max + 1).padStart(4, '0')}`;
}

/** Ngày hết hiệu lực mặc định = hôm nay + `QUOTE_VALID_DAYS` ngày (ISO). */
export function defaultValidUntil(
  now: number = Date.now(),
  days: number = QUOTE_VALID_DAYS
): string {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Báo giá đã quá `validUntil` chưa (ngày không hợp lệ ⇒ coi như không hết hạn). */
export function isQuoteExpired(quote: { validUntil?: string }, now: number = Date.now()): boolean {
  const remaining = daysUntil(quote.validUntil, now);
  return remaining !== null && remaining < 0;
}

/** Trạng thái hiển thị: báo giá còn “mở” mà quá hạn ⇒ `expired` (không đổi record gốc). */
export function effectiveQuoteStatus(quote: PriceQuote, now: number = Date.now()): PriceQuoteStatus {
  if (QUOTE_OPEN_STATUSES.includes(quote.status) && isQuoteExpired(quote, now)) return 'expired';
  return quote.status;
}

/** Gắn trạng thái hiệu lực + số ngày còn lại (trả bản mới). */
export function withEffectiveStatus<T extends PriceQuote>(
  quote: T,
  now: number = Date.now()
): T & { status: PriceQuoteStatus; remainingDays: number | null; isExpired: boolean } {
  const remainingDays = daysUntil(quote.validUntil, now);
  return {
    ...quote,
    status: effectiveQuoteStatus(quote, now),
    remainingDays,
    isExpired: remainingDays !== null && remainingDays < 0
  };
}

/** Tìm báo giá theo `id` hoặc `code` (không phân biệt hoa/thường). */
export function findQuote<T extends PriceQuote>(list: T[], idOrCode: unknown): T | undefined {
  const value = queryText(idOrCode).toLowerCase();
  if (!value) return undefined;
  return list.find(q => q.id.toLowerCase() === value || queryText(q.code).toLowerCase() === value);
}

/**
 * Lọc danh sách cho CMS: `status` (1 giá trị hoặc nhiều giá trị cách nhau dấu phẩy),
 * `q` (mã / tiêu đề / tên khách / công ty / SĐT) và `expired=true|false` (theo `validUntil`).
 * Giá trị lạ bị bỏ qua — không lọc, không trả 400 (giống P0.4).
 */
export function filterQuotes<T extends PriceQuote>(
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
  const expired = queryText(query.expired).toLowerCase();

  return list.filter(quote => {
    if (statuses.length > 0 && !statuses.includes(queryText(quote.status).toLowerCase())) return false;

    if (q) {
      const hit = [quote.code, quote.title, quote.customerName, quote.company, quote.phone].some(
        v => queryText(v).toLowerCase().includes(q)
      );
      if (!hit) return false;
    }

    if (expired === 'true' || expired === 'false') {
      const isExpired = isQuoteExpired(quote, now);
      if (expired === 'true' && !isExpired) return false;
      if (expired === 'false' && isExpired) return false;
    }

    return true;
  });
}

/** Escape 1 ô CSV: bọc `"` + nhân đôi `"` bên trong. */
function csvCell(value: unknown): string {
  return `"${queryText(value).replace(/"/g, '""')}"`;
}

/**
 * CSV chi tiết: **1 dòng / 1 dòng hàng** để kế toán dùng được ngay trong Excel
 * (UTF-8 BOM giống `/export/price-list.csv`). Báo giá không có dòng nào ⇒ vẫn xuất 1 dòng
 * với cột hàng để trống, tránh việc “mất” báo giá khi đối chiếu số lượng.
 */
export function buildQuoteCsv(quotes: PriceQuote[]): string {
  let csv = '\uFEFF';
  csv +=
    'Mã báo giá,Tiêu đề,Khách hàng,Công ty,SĐT,Email,Trạng thái,Hiệu lực đến,Tên hàng,Quy cách,ĐVT,Số lượng,Đơn giá (VNĐ),Thành tiền (VNĐ),Tổng báo giá (VNĐ)\n';

  for (const quote of quotes) {
    const head = [
      csvCell(quote.code),
      csvCell(quote.title),
      csvCell(quote.customerName),
      csvCell(quote.company),
      csvCell(quote.phone),
      csvCell(quote.email),
      csvCell(quote.status),
      csvCell(quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('vi-VN') : '')
    ];

    if (quote.items.length === 0) {
      csv += [...head, csvCell(''), csvCell(''), csvCell(''), 0, 0, 0, quote.total].join(',') + '\n';
      continue;
    }

    for (const item of quote.items) {
      csv +=
        [
          ...head,
          csvCell(item.name),
          csvCell(item.spec),
          csvCell(item.unit),
          item.qty,
          item.unitPrice,
          computeItemTotal(item.qty, item.unitPrice),
          quote.total
        ].join(',') + '\n';
    }
  }

  return csv;
}

/** Mã link chia sẻ: chữ + số, bỏ ký tự dễ nhầm (I, O, 0, 1) — khách gõ tay vẫn đúng. */
export function generateQuoteLinkCode(
  list: Array<{ code?: string }>,
  length = 8,
  random: () => number = Math.random
): string {
  const taken = new Set(list.map(l => queryText(l.code).toUpperCase()));
  for (let attempt = 0; attempt < LINK_CODE_ATTEMPTS; attempt += 1) {
    let candidate = '';
    for (let i = 0; i < Math.max(4, length); i += 1) {
      candidate += LINK_ALPHABET[Math.floor(random() * LINK_ALPHABET.length) % LINK_ALPHABET.length];
    }
    if (!taken.has(candidate)) return candidate;
  }
  // Cực hiếm (bị inject `random` xấu trong test) ⇒ ghép mốc thời gian cho chắc chắn khác nhau.
  return `BG${Date.now().toString(36).toUpperCase()}`;
}

/** Chuẩn hoá mã link khách gõ/dán: bỏ khoảng trắng, viết hoa. */
export function normalizeLinkCode(value: unknown): string {
  return queryText(value).replace(/\s+/g, '').toUpperCase();
}

export type QuoteLinkCheck = 'ok' | 'password' | 'invalid';

/**
 * Kiểm tra quyền xem báo giá qua link chia sẻ. Thứ tự kiểm tra cố định để không rò rỉ thông tin:
 * không có link / tắt / hết hạn ⇒ `invalid`; có mật khẩu mà sai/thiếu ⇒ `password`; còn lại `ok`.
 */
export function checkQuoteLink(
  link: Pick<QuoteLink, 'password' | 'expiresAt' | 'isActive'> | undefined | null,
  pass: unknown,
  now: number = Date.now()
): QuoteLinkCheck {
  if (!link) return 'invalid';
  if (!link.isActive) return 'invalid';
  const remaining = daysUntil(link.expiresAt, now);
  if (remaining !== null && remaining < 0) return 'invalid';

  const expected = queryText(link.password);
  if (!expected) return 'ok';
  return queryText(pass) === expected ? 'ok' : 'password';
}

