/**
 * P0.3 — Smoke test utility dùng chung (`src/utils/format.ts`, `src/utils/id.ts`).
 *
 * Chạy: `npm run test:utils`
 * Cách hoạt động: đối chiếu output của util với **chính implementation inline cũ**
 * (copy nguyên văn từ component trước P0.3) ⇒ chứng minh refactor không đổi 1 ký tự nào.
 */
import { formatVnd, formatNumber, formatDate, formatBytes, slugify, toDateInput, fromDateInput } from '../src/utils/format.ts';
import { genId } from '../src/utils/id.ts';

let failed = 0;
let passed = 0;

function check<T>(label: string, actual: T, expected: T) {
  const ok = actual === expected;
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${ok ? '' : `  (mong đợi ${JSON.stringify(expected)})`}`
  );
}

// ── 1. formatVnd: giống hệt `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`
const legacyPrice = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

for (const value of [0, 999, 19990000, 1234567890, -5000, 1234.56]) {
  check(`formatVnd(${value}) == code cũ`, formatVnd(value), legacyPrice(value));
}

// ── 2. formatDate: 3 biến thể inline cũ (CustomerReviews / FileManagerView / UsersView)
const legacyShort = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const legacyDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const legacyDateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN');
const iso = '2026-09-27T14:05:00+07:00';

check('formatDate(iso) [mặc định] == code cũ', formatDate(iso), legacyShort(iso));
check("formatDate(iso, 'date') == code cũ", formatDate(iso, 'date'), legacyDate(iso));
check("formatDate(iso, 'datetime') == code cũ", formatDate(iso, 'datetime'), legacyDateTime(iso));
check('formatDate(undefined) -> —', formatDate(undefined), '—');
check("formatDate('') -> —", formatDate(''), '—');
check("formatDate(null, 'date', 'chưa có')", formatDate(null, 'date', 'chưa có'), 'chưa có');

// ── 3. formatBytes: giống hệt `formatSize()` cũ của FileManagerView
const legacySize = (size: number | string): string => {
  const bytes = typeof size === 'string' ? Number(size) : size;
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

for (const size of [0, '0', 512, 1536, 3145728, '2048', 'abc'] as Array<number | string>) {
  check(`formatBytes(${JSON.stringify(size)}) == code cũ`, formatBytes(size), legacySize(size));
}

// ── 4. formatNumber (vi-VN, dùng cho số lượng/doanh số ở các task sau)
check('formatNumber(1234567)', formatNumber(1234567), '1.234.567');
check('formatNumber(12.5, 1 chữ số thập phân)', formatNumber(12.5, { maximumFractionDigits: 1 }), '12,5');

// ── 5. slugify: khớp code cũ ở trường hợp không dấu, sửa lỗi ở trường hợp có dấu
const legacySlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

check('slugify không dấu == code cũ', slugify('MacBook Air M3'), legacySlug('MacBook Air M3'));
check('slugify("Laptop Đồ Họa")', slugify('Laptop Đồ Họa'), 'laptop-do-hoa');
check('slugify("Ốp lưng iPhone 15 Pro Max")', slugify('Ốp lưng iPhone 15 Pro Max'), 'op-lung-iphone-15-pro-max');
check('slugify("  Điện thoại -- Samsung  ")', slugify('  Điện thoại -- Samsung  '), 'dien-thoai-samsung');
check('slugify("")', slugify(''), '');
check('code cũ làm mất chữ có dấu (bug đã sửa)', legacySlug('Ốp lưng'), '-p-l-ng');

// ── 6. genId: đúng định dạng + duy nhất
check("genId('toast') đúng định dạng (8 ký tự random)", /^toast-\d+-[a-z0-9]{8}$/.test(genId('toast')), true);
check("genId('v') tiền tố đúng", genId('v').startsWith('v-'), true);
// P0.4 — trước đây chỉ 4 ký tự random ⇒ 1000 id sinh trong cùng 1 ms bị trùng (~13% số lần chạy).
// Nay 8 ký tự (36^8) ⇒ 5000 id liên tiếp vẫn phải duy nhất, kể cả khi `Date.now()` không đổi.
check('genId duy nhất trong 5000 lần gọi (kể cả cùng 1 ms)', new Set(Array.from({ length: 5000 }, () => genId('x'))).size, 5000);

// ── 7. P1.2 — toDateInput/fromDateInput (dùng cho `<input type="date">` của WarrantyView)
// Dùng ngày **giờ địa phương** nên assertion không phụ thuộc timezone của máy chạy test.
check('toDateInput(Date) -> YYYY-MM-DD', toDateInput(new Date(2026, 8, 27, 14, 5)), '2026-09-27');
check('toDateInput đệm 0 cho tháng/ngày', toDateInput(new Date(2026, 0, 5)), '2026-01-05');
check('toDateInput(undefined)', toDateInput(undefined), '');
check('toDateInput(null)', toDateInput(null), '');
check("toDateInput('')", toDateInput(''), '');
check('toDateInput ngày rác -> fallback', toDateInput('khong-phai-ngay', '2000-01-01'), '2000-01-01');
check('fromDateInput -> ISO nửa đêm địa phương', fromDateInput('2026-09-27'), new Date(2026, 8, 27).toISOString());
check('fromDateInput round-trip', toDateInput(fromDateInput('2026-09-27')), '2026-09-27');
check("fromDateInput('')", fromDateInput(''), undefined);
check("fromDateInput('27/09/2026') không đúng ISO", fromDateInput('27/09/2026'), undefined);
check('fromDateInput(undefined)', fromDateInput(undefined), undefined);

console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `${failed} assertion KHONG dat (${passed} đạt).`}`);
process.exit(failed === 0 ? 0 : 1);
