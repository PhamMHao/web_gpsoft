/**
 * P1.4/P1.5/P1.6 — Nhãn + helper dùng chung cho báo giá.
 *
 * §D.9: trạng thái/thứ tự/nhãn của một domain chỉ khai báo **một chỗ**; `QuotesView` (CMS),
 * `QuoteViewPage` (public `/bao-gia/:code`) và `PriceListPage` (tab "Link Báo Giá") đều import
 * từ đây — không component nào tự viết lại `Record<PriceQuoteStatus, string>`.
 *
 * `amountInWords()` dùng cho phiếu báo giá in ra (tổng tiền bằng chữ) — có test riêng trong
 * `tests/quoteUi.smoke.ts` vì đây là logic dễ sai (mười một / hai mươi mốt / lẻ / tư / lăm).
 */
import type { PriceQuote, PriceQuoteItem, PriceQuoteStatus } from '../types/index.ts';

export const QUOTE_STATUS_LABELS: Record<PriceQuoteStatus, string> = {
  draft: 'Bản nháp',
  sent: 'Đã gửi khách',
  accepted: 'Khách đồng ý',
  rejected: 'Khách từ chối',
  expired: 'Hết hiệu lực'
};

/** Class Tailwind cho badge — giữ đúng tông màu đang dùng ở các View khác. */
export const QUOTE_STATUS_BADGES: Record<PriceQuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-sky-50 text-sky-700 border-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200'
};

export const QUOTE_STATUS_ORDER: PriceQuoteStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
];

/** Sub-tab danh sách ở CMS: `all` + 5 trạng thái. */
export const QUOTE_TABS: { id: 'all' | PriceQuoteStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  ...QUOTE_STATUS_ORDER.map(status => ({ id: status, label: QUOTE_STATUS_LABELS[status] }))
];

/** Trạng thái “đang chờ khách phản hồi” — dùng cho thẻ thống kê “Cần theo dõi”. */
export const QUOTE_PENDING_STATUSES: PriceQuoteStatus[] = ['draft', 'sent'];

/** Đơn vị tính gợi ý trong form (vẫn cho nhập tự do). */
export const QUOTE_UNITS = ['Chiếc', 'Bộ', 'Gói', 'Lần', 'Cái', 'Hộp', 'Tháng'];

/**
 * P1.6 — Sub-tab “Báo giá tổng” của `/bang-gia`: gợi ý cấu hình theo **mức giá** để khách
 * hình dung nhanh nên chọn máy nào (nội dung tĩnh, không phụ thuộc API; admin có thể thay
 * bằng dữ liệu thật khi cần — xem ROADMAP P2.x nếu muốn cấu hình được từ CMS).
 */
export interface QuoteConfigTier {
  id: string;
  label: string;
  priceRange: string;
  cpu: string;
  ram: string;
  storage: string;
  note: string;
}

export const QUOTE_CONFIG_TIERS: QuoteConfigTier[] = [
  {
    id: 'tier-office',
    label: 'Văn phòng / Học tập',
    priceRange: 'Dưới 15 triệu',
    cpu: 'Intel Core i3 / Ryzen 3',
    ram: '8GB',
    storage: '256GB SSD',
    note: 'Word, Excel, Zoom, học online — đủ dùng, máy mát và pin lâu.'
  },
  {
    id: 'tier-mainstream',
    label: 'Phổ thông',
    priceRange: '15 – 25 triệu',
    cpu: 'Intel Core i5 / Ryzen 5',
    ram: '16GB',
    storage: '512GB SSD',
    note: 'Lập trình nhẹ, Photoshop cơ bản, mở nhiều tab — cấu hình đáng tiền nhất.'
  },
  {
    id: 'tier-pro',
    label: 'Chuyên nghiệp',
    priceRange: '25 – 40 triệu',
    cpu: 'Core i7 / Ryzen 7 / Apple M3',
    ram: '16 – 32GB',
    storage: '512GB – 1TB SSD',
    note: 'Dựng video 4K, CAD, chạy máy ảo nhiều lớp.'
  },
  {
    id: 'tier-flagship',
    label: 'Cao cấp / Đồ hoạ',
    priceRange: 'Trên 40 triệu',
    cpu: 'Core i9 / Ryzen 9 / Apple M3 Pro – Max',
    ram: '32GB trở lên',
    storage: '1TB SSD trở lên',
    note: 'Render 3D, dựng phim chuyên nghiệp, AI/ML tại chỗ — kèm bảo hành mở rộng.'
  }
];

/** Mức chiết khấu gợi ý cho khách doanh nghiệp (hiển thị ở tab “Báo giá tổng”). */
export const QUOTE_BULK_TIERS: { quantity: string; benefit: string }[] = [
  { quantity: 'Từ 5 – 9 sản phẩm', benefit: 'Chiết khấu 2 – 4% + miễn phí cài đặt & bàn giao' },
  { quantity: 'Từ 10 – 29 sản phẩm', benefit: 'Chiết khấu 5 – 8% + bảo trì tận nơi 12 tháng' },
  { quantity: 'Từ 30 sản phẩm', benefit: 'Giá dự án riêng + hợp đồng khung, có hoá đơn VAT theo tiến độ' }
];


export const emptyQuoteItem = (): PriceQuoteItem => ({
  name: '',
  spec: '',
  unit: 'Chiếc',
  qty: 1,
  unitPrice: 0,
  total: 0
});

/** Thành tiền 1 dòng (khớp công thức server: `qty × unitPrice`, luôn ≥ 0). */
export function quoteItemTotal(qty: number, unitPrice: number): number {
  const q = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
  const p = Number.isFinite(unitPrice) && unitPrice > 0 ? Math.round(unitPrice) : 0;
  return q * p;
}

/** Σ thành tiền toàn bộ dòng — dùng để cộng tổng realtime trong modal tạo/sửa. */
export function quoteSubtotal(items: PriceQuoteItem[]): number {
  return items.reduce((sum, item) => sum + quoteItemTotal(item.qty, item.unitPrice), 0);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số ngày còn lại tới `validUntil` (âm = hết hiệu lực, `null` = ngày không hợp lệ). */
export function quoteDaysLeft(validUntil?: string, now: number = Date.now()): number | null {
  if (!validUntil) return null;
  const end = new Date(validUntil).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

export function quoteIsExpired(quote: Pick<PriceQuote, 'validUntil'>, now: number = Date.now()): boolean {
  const left = quoteDaysLeft(quote.validUntil, now);
  return left !== null && left < 0;
}

/** Đếm theo trạng thái cho 4 thẻ thống kê ở CMS (không sửa mảng đầu vào). */
export function countQuotesByStatus(
  quotes: PriceQuote[]
): Record<PriceQuoteStatus, number> & { total: number } {
  const counts = { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0, total: quotes.length };
  for (const quote of quotes) counts[quote.status] += 1;
  return counts;
}


/* -------------------------------------------------------------------------
   TỔNG TIỀN BẰNG CHỮ (P1.6 — phiếu báo giá in ra cần dòng “Bằng chữ”)
   ------------------------------------------------------------------------- */
const ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

/**
 * Đọc 1 nhóm 3 chữ số (0–999).
 * `full = true` ⇒ nhóm nằm giữa dãy nên phải đọc đủ “không trăm lẻ …” (VD 1.005.000).
 */
function readTriple(n: number, full: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const out: string[] = [];

  if (hundreds > 0 || full) out.push(`${ONES[hundreds]} trăm`);

  if (tens === 0) {
    if (units > 0 && (hundreds > 0 || full)) out.push('lẻ');
  } else if (tens === 1) {
    out.push('mười');
  } else {
    out.push(`${ONES[tens]} mươi`);
  }

  if (units > 0) {
    if (tens > 1 && units === 1) out.push('mốt');
    else if (tens >= 1 && units === 5) out.push('lăm');
    else if (tens > 1 && units === 4) out.push('tư');
    else out.push(ONES[units]);
  }

  return out.join(' ').trim();
}

/**
 * Số tiền (VNĐ) → chữ tiếng Việt, viết hoa chữ đầu + hậu tố “đồng”.
 * VD `157440000` → `Một trăm năm mươi bảy triệu bốn trăm bốn mươi nghìn đồng`.
 */
export function amountInWords(amount: number): string {
  const value = Number.isFinite(amount) ? Math.round(Math.abs(amount)) : 0;
  if (value === 0) return 'Không đồng';

  const groups: number[] = [];
  let rest = Math.floor(value);
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    if (group === 0) continue;
    const scale = SCALES[i] || '';
    const read = readTriple(group, i < groups.length - 1);
    words.push(scale ? `${read} ${scale}` : read);
  }

  const sentence = words.join(' ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

/** Nhãn tiếng Việt cho số ngày còn lại — dùng ở bảng CMS + phiếu in. */
export function quoteValidityLabel(validUntil?: string, now: number = Date.now()): string {
  const days = quoteDaysLeft(validUntil, now);
  if (days === null) return 'Không xác định';
  if (days < 0) return `Hết hiệu lực ${Math.abs(days)} ngày trước`;
  if (days === 0) return 'Hết hiệu lực hôm nay';
  return `Còn ${days} ngày`;
}
