/**
 * P0.3 — Utility format dùng chung cho cả Website và CMS.
 *
 * Trước P0.3, mỗi component tự khai báo `formatPrice()` / `formatDate()` / `formatSize()`
 * (17 file trùng lặp gần như y hệt). Các hàm dưới đây giữ **đúng output như code cũ**
 * (thuần refactor ⇒ UI không đổi), nên có thể thay thế trực tiếp tại chỗ.
 *
 * Quy ước (ROADMAP §0.6): tiếng Việt có dấu, tiền tệ `Intl.NumberFormat('vi-VN')`.
 */

/**
 * Đơn giá VND: `19990000` → `19.990.000 ₫`
 * (giống hệt `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`).
 */
export const formatVnd = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

/**
 * Số theo định dạng `vi-VN`. Mặc định phân cách nghìn: `formatNumber(1234567)` → `1.234.567`.
 * Truyền `options` khi cần định dạng khác (`{ minimumFractionDigits: 1 }`, `{ style: 'percent' }`…).
 */
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat('vi-VN', options).format(value);

export type DateFormatStyle = 'short' | 'date' | 'datetime';

/**
 * Ngày/giờ theo `vi-VN`.
 * - `short`    (mặc định): `27/09/2026`   — `toLocaleDateString` với day/month/year 2 chữ số
 * - `date`               : `27/9/2026`    — `toLocaleDateString('vi-VN')` mặc định
 * - `datetime`           : `27/9/2026 14:05:00` — `toLocaleString('vi-VN')` mặc định
 *
 * Giá trị rỗng ⇒ trả `fallback` (mặc định `'—'`); không parse được ⇒ trả lại nguyên input
 * (đúng như các hàm inline trước đây).
 */
export const formatDate = (
  value?: string | number | Date | null,
  style: DateFormatStyle = 'short',
  fallback = '—'
): string => {
  if (value === undefined || value === null || value === '') return fallback;

  try {
    const date = new Date(value);
    if (style === 'date') return date.toLocaleDateString('vi-VN');
    if (style === 'datetime') return date.toLocaleString('vi-VN');
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(value);
  }
};

/** Dung lượng file: `0`/rỗng → `—` · `1536` → `2 KB` · `3145728` → `3.0 MB`. */
export const formatBytes = (size: number | string): string => {
  const bytes = typeof size === 'string' ? Number(size) : size;
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Chuẩn hoá chuỗi thành slug URL: bỏ dấu tiếng Việt, chỉ còn `a-z0-9` và `-`.
 *
 * `slugify('Laptop Đồ Họa')` → `'laptop-do-hoa'`
 * `slugify('Ốp lưng iPhone 15 Pro Max')` → `'op-lung-iphone-15-pro-max'`
 *
 * Lưu ý: regex cũ `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')` ở 6 chỗ trong CMS
 * **làm mất chữ có dấu** (`'Ốp lưng'` → `'-p-l-ng'`) và để lại dấu `-` ở đầu/cuối.
 * Hàm này sửa lỗi đó nên slug sinh tự động (khi admin để trống ô slug) mới đúng;
 * slug đã lưu trong DB không bị đổi.
 */
export const slugify = (text: string): string =>
  String(text || '')
    .normalize('NFD') // "ồ" → "o" + dấu tổ hợp
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tổ hợp
    .replace(/[đĐ]/g, 'd') // "đ" không tách được bằng NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * P1.2 — Chuyển ngày ISO (hoặc `Date`) thành giá trị cho `<input type="date">` (`YYYY-MM-DD`, giờ địa phương).
 * Không parse được ⇒ trả `fallback` (mặc định `''`) để form không hiện `Invalid Date`.
 */
export const toDateInput = (value?: string | number | Date | null, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * P1.2 — Ngược lại `toDateInput()`: `'2026-09-27'` → ISO string (nửa đêm **giờ địa phương**).
 * Rỗng hoặc không đúng định dạng `YYYY-MM-DD` ⇒ `undefined` (field optional sẽ bị bỏ qua, không gửi `Invalid Date`).
 */
export const fromDateInput = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
