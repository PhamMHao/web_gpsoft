/**
 * P1.4/P1.5/P1.6 — Smoke test util báo giá phía FE (`src/utils/quote.ts`).
 *
 * Chạy: `npm run test:quote-ui` (hàm thuần, KHÔNG cần backend/DOM).
 * Trọng tâm là `amountInWords()` — dòng “Bằng chữ” trên phiếu báo giá in ra: các ca đọc số
 * đặc thù tiếng Việt (mười một / hai mươi mốt / hai mươi tư / lăm / lẻ / đủ nhóm nghìn–triệu).
 * Ngoài ra khoá lại HỢP ĐỒNG nhãn trạng thái (schema `PriceQuoteStatus` ⇄ nhãn hiển thị) để
 * CMS và trang public không lệch nhau.
 */
import {
  QUOTE_BULK_TIERS,
  QUOTE_CONFIG_TIERS,
  QUOTE_PENDING_STATUSES,
  QUOTE_STATUS_BADGES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_ORDER,
  QUOTE_TABS,
  QUOTE_UNITS,
  amountInWords,
  countQuotesByStatus,
  emptyQuoteItem,
  quoteDaysLeft,
  quoteIsExpired,
  quoteItemTotal,
  quoteSubtotal,
  quoteValidityLabel
} from '../src/utils/quote.ts';
import type { PriceQuote, PriceQuoteStatus } from '../src/types/index.ts';

let failed = 0;
let passed = 0;

function check<T>(label: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${ok ? '' : `  (mong đợi ${JSON.stringify(expected)})`}`
  );
}

const ALL_STATUSES: PriceQuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

/* --- Nhãn / badge / tab (§D.9: khai báo 1 chỗ) -------------------------- */
check('QUOTE_STATUS_ORDER đủ 5 trạng thái', QUOTE_STATUS_ORDER, ALL_STATUSES);
check('QUOTE_STATUS_LABELS phủ hết trạng thái', ALL_STATUSES.map(s => typeof QUOTE_STATUS_LABELS[s] === 'string'), [true, true, true, true, true]);
check('QUOTE_STATUS_LABELS[draft]', QUOTE_STATUS_LABELS.draft, 'Bản nháp');
check('QUOTE_STATUS_LABELS[expired]', QUOTE_STATUS_LABELS.expired, 'Hết hiệu lực');
check('QUOTE_STATUS_BADGES có class Tailwind cho mọi trạng thái', ALL_STATUSES.every(s => QUOTE_STATUS_BADGES[s].includes('bg-')), true);
check('QUOTE_TABS = Tất cả + 5 trạng thái', QUOTE_TABS.map(t => t.id), ['all', ...ALL_STATUSES]);
check('QUOTE_PENDING_STATUSES', QUOTE_PENDING_STATUSES, ['draft', 'sent']);
check('QUOTE_UNITS có Chiếc/Gói/Lần', ['Chiếc', 'Gói', 'Lần'].every(u => QUOTE_UNITS.includes(u)), true);

/* --- Dòng hàng / tổng tiền -------------------------------------------- */
check('emptyQuoteItem mặc định', emptyQuoteItem(), { name: '', spec: '', unit: 'Chiếc', qty: 1, unitPrice: 0, total: 0 });
const item = { ...emptyQuoteItem(), name: 'MacBook Pro 14', qty: 3, unitPrice: 45990000 };
check('quoteItemTotal 3 × 45.990.000', quoteItemTotal(item.qty, item.unitPrice), 137970000);
check('quoteItemTotal qty âm ⇒ 0', quoteItemTotal(-3, 1000), 0);
check('quoteItemTotal giá thập phân ⇒ làm tròn đồng', quoteItemTotal(1, 1999.6), 2000);
check('quoteSubtotal = Σ(3 dòng)', quoteSubtotal([item, { ...item, qty: 3, unitPrice: 5990000 }, { ...item, qty: 1, unitPrice: 1500000 }]), 157440000);
check('quoteSubtotal mảng rỗng ⇒ 0', quoteSubtotal([]), 0);

/* --- Hạn hiệu lực ------------------------------------------------------ */
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0);
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();
check('quoteDaysLeft còn 15 ngày', quoteDaysLeft(iso(15), NOW), 15);
check('quoteDaysLeft quá hạn 3 ngày', quoteDaysLeft(iso(-3), NOW), -3);
check('quoteDaysLeft ngày rác ⇒ null', quoteDaysLeft('không-phải-ngày', NOW), null);
check('quoteIsExpired quá hạn ⇒ true', quoteIsExpired({ validUntil: iso(-1) }, NOW), true);
check('quoteIsExpired còn hạn ⇒ false', quoteIsExpired({ validUntil: iso(1) }, NOW), false);
check('quoteValidityLabel còn hạn', quoteValidityLabel(iso(15), NOW), 'Còn 15 ngày');
check('quoteValidityLabel hôm nay hết hạn', quoteValidityLabel(iso(0), NOW), 'Hết hiệu lực hôm nay');
check('quoteValidityLabel đã hết hạn', quoteValidityLabel(iso(-5), NOW), 'Hết hiệu lực 5 ngày trước');
check('quoteValidityLabel ngày rỗng', quoteValidityLabel(undefined, NOW), 'Không xác định');

/* --- Thẻ thống kê CMS ------------------------------------------------- */
const quoteAt = (id: string, status: PriceQuoteStatus): PriceQuote => ({
  id,
  code: `BG-2026-000${id.slice(-1)}`,
  title: 'Test',
  customerName: 'Khách',
  phone: '0900000000',
  items: [],
  total: 0,
  status,
  validUntil: iso(10),
  createdBy: 'Admin',
  createdAt: iso(-1)
});
const stats = countQuotesByStatus([
  quoteAt('q-1', 'draft'),
  quoteAt('q-2', 'sent'),
  quoteAt('q-3', 'sent'),
  quoteAt('q-4', 'accepted')
]);
check('countQuotesByStatus: total', stats.total, 4);
check('countQuotesByStatus: theo trạng thái', [stats.draft, stats.sent, stats.accepted, stats.rejected, stats.expired], [1, 2, 1, 0, 0]);

/* --- Tổng tiền bằng chữ (dòng “Bằng chữ” trên phiếu in) ---------------- */
check('amountInWords: 0', amountInWords(0), 'Không đồng');
check('amountInWords: 1.000', amountInWords(1000), 'Một nghìn đồng');
check('amountInWords: 15.000 (lăm)', amountInWords(15000), 'Mười lăm nghìn đồng');
check('amountInWords: 21.000 (mốt)', amountInWords(21000), 'Hai mươi mốt nghìn đồng');
check('amountInWords: 24.000 (tư)', amountInWords(24000), 'Hai mươi tư nghìn đồng');
check('amountInWords: 25.000', amountInWords(25000), 'Hai mươi lăm nghìn đồng');
check('amountInWords: 11.000 (mười một)', amountInWords(11000), 'Mười một nghìn đồng');
check('amountInWords: 500.000', amountInWords(500000), 'Năm trăm nghìn đồng');
check('amountInWords: 1.500.000', amountInWords(1500000), 'Một triệu năm trăm nghìn đồng');
check('amountInWords: 1.005.000 (không trăm lẻ)', amountInWords(1005000), 'Một triệu không trăm lẻ năm nghìn đồng');
check('amountInWords: 105 (một trăm lẻ năm)', amountInWords(105), 'Một trăm lẻ năm đồng');
check('amountInWords: 157.440.000 (seed quote-1)', amountInWords(157440000), 'Một trăm năm mươi bảy triệu bốn trăm bốn mươi nghìn đồng');
check('amountInWords: 463.700.000 (seed quote-2)', amountInWords(463700000), 'Bốn trăm sáu mươi ba triệu bảy trăm nghìn đồng');
check('amountInWords: 1.000.000.000 (tỷ)', amountInWords(1000000000), 'Một tỷ đồng');
check('amountInWords: 1.234.567.890 (đủ nhóm)', amountInWords(1234567890), 'Một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng');
check('amountInWords: làm tròn số lẻ', amountInWords(1999.6), 'Hai nghìn đồng');
check('amountInWords: số âm dùng trị tuyệt đối', amountInWords(-2000), 'Hai nghìn đồng');
check('amountInWords: NaN ⇒ Không đồng', amountInWords(Number.NaN), 'Không đồng');

/* --- P1.6: tab “Báo giá tổng” dùng chung dữ liệu cấu hình ------------------ */
check('QUOTE_CONFIG_TIERS có 4 nhóm nhu cầu', QUOTE_CONFIG_TIERS.length, 4);
check(
  'QUOTE_CONFIG_TIERS: id duy nhất',
  new Set(QUOTE_CONFIG_TIERS.map(tier => tier.id)).size,
  QUOTE_CONFIG_TIERS.length
);
check(
  'QUOTE_CONFIG_TIERS: mọi nhóm đều có đủ CPU/RAM/ổ cứng/mức giá',
  QUOTE_CONFIG_TIERS.every(tier => !!(tier.cpu && tier.ram && tier.storage && tier.priceRange && tier.label && tier.note)),
  true
);
check('QUOTE_CONFIG_TIERS[0] là nhóm rẻ nhất', QUOTE_CONFIG_TIERS[0].priceRange.toLowerCase().includes('triệu'), true);
check('QUOTE_BULK_TIERS có 3 mức số lượng', QUOTE_BULK_TIERS.length, 3);
check('QUOTE_BULK_TIERS: mọi mức đều có mô tả quyền lợi', QUOTE_BULK_TIERS.every(tier => tier.benefit.length > 10), true);

/* --- Tổng kết ----------------------------------------------------------- */
console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `FAILED: ${failed} assertion sai, ${passed} đạt.`}`);
process.exit(failed === 0 ? 0 : 1);

check('countQuotesByStatus: mảng rỗng', countQuotesByStatus([]), { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0, total: 0 });
