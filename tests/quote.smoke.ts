/**
 * P1.4/P1.5 — Smoke test logic báo giá + link chia sẻ (`server/quote.ts`).
 *
 * Chạy: `npm run test:quotes` (hàm thuần, KHÔNG cần backend/DB).
 * Nội dung kiểm tra: (1) tiền luôn tính lại ở server (`item.total`, `quote.total`);
 * (2) chuẩn hoá dòng rác (âm, chữ, quá 50 dòng, thiếu tên); (3) mã báo giá `BG-<năm>-<4 số>`;
 * (4) trạng thái tự chuyển `expired` khi quá `validUntil`; (5) lọc danh sách CMS;
 * (6) CSV có BOM + đúng số dòng; (7) link chia sẻ: tắt/hết hạn ⇒ invalid, sai mật khẩu ⇒ password;
 * (8) không sửa dữ liệu đầu vào.
 */
import {
  QUOTE_MAX_ITEMS,
  QUOTE_STATUSES,
  QUOTE_VALID_DAYS,
  buildQuoteCsv,
  checkQuoteLink,
  computeItemTotal,
  computeQuoteTotal,
  defaultValidUntil,
  effectiveQuoteStatus,
  filterQuotes,
  findQuote,
  generateQuoteCode,
  generateQuoteLinkCode,
  isQuoteExpired,
  money,
  normalizeLinkCode,
  normalizeQuoteItems,
  withEffectiveStatus
} from '../server/quote.ts';
import type { PriceQuote } from '../server/types.ts';

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

/* --- Fixture: mốc thời gian cố định ------------------------------------- */
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0); // 27/09/2026 10:00 UTC
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const makeQuote = (over: Partial<PriceQuote> = {}): PriceQuote => ({
  id: 'q-1',
  code: 'BG-2026-0001',
  title: 'Báo giá 3 bộ MacBook Pro 14" cho phòng IT',
  customerName: 'Nguyễn Văn Hùng',
  phone: '0977889900',
  company: 'Công ty CP Chứng khoán Việt Capital',
  items: [],
  total: 0,
  status: 'sent',
  validUntil: iso(15),
  createdBy: 'Nguyễn Quốc Bảo',
  createdAt: iso(-5),
  ...over
});

/* --- (1) Tiền tính ở server -------------------------------------------- */
check('computeItemTotal 3 × 45.990.000', computeItemTotal(3, 45990000), 137970000);
check('computeItemTotal qty âm ⇒ 0', computeItemTotal(-3, 45990000), 0);
check('computeItemTotal qty 0 ⇒ 0', computeItemTotal(0, 45990000), 0);
check('computeItemTotal qty thập phân ⇒ làm tròn xuống', computeItemTotal(2.9, 1000), 2000);
check('computeItemTotal chuỗi rác ⇒ 0', computeItemTotal('abc', 'xyz'), 0);
check('computeItemTotal chuỗi số ⇒ chấp nhận', computeItemTotal('3', '15000'), 45000);
check('computeItemTotal đơn giá thập phân ⇒ làm tròn đồng', computeItemTotal(1, 1999.6), 2000);
check('money(NaN) ⇒ 0', money(Number.NaN), 0);
check('money(-5) ⇒ 0', money(-5), 0);

// Đúng ca kiểm thử DoD: 3 dòng (3 × 45.990.000) + (3 × 5.990.000) + (1 × 1.500.000)
const dodItems = normalizeQuoteItems([
  { name: 'MacBook Pro 14 inch M3 Pro', unit: 'Chiếc', qty: 3, unitPrice: 45990000 },
  { name: 'AppleCare+ 36 tháng', unit: 'Gói', qty: 3, unitPrice: 5990000 },
  { name: 'Cài đặt & bàn giao', unit: 'Lần', qty: 1, unitPrice: 1500000 }
]);
check('DoD: tổng báo giá = Σ(qty × unitPrice)', computeQuoteTotal(dodItems), 157440000);
check('DoD: thành tiền dòng 1', dodItems[0].total, 137970000);
check('DoD: `total` client gửi bị bỏ qua', computeQuoteTotal([{ qty: 1, unitPrice: 1000, total: 999999 } as any]), 1000);


/* --- (2) Chuẩn hoá dòng ------------------------------------------------- */
const messy = normalizeQuoteItems([
  { name: '  ', qty: 5, unitPrice: 1000 },
  { name: 'Màn hình Dell U2723QE', spec: ' 4K IPS Black ', qty: -2, unitPrice: 12490000 },
  { name: 'Bàn phím cơ', unit: '', qty: '3', unitPrice: '890000' },
  null,
  'rác'
]);
check('bỏ dòng không có tên + phần tử không phải object', messy.length, 2);
check('qty âm kẹp về 0', messy[0].qty, 0);
check('spec được trim', messy[0].spec, '4K IPS Black');
check('unit rỗng ⇒ mặc định "Chiếc"', messy[1].unit, 'Chiếc');
check('qty/unitPrice dạng chuỗi số vẫn đọc được', messy[1].total, 2670000);

const many = Array.from({ length: 80 }, (_, i) => ({ name: `Hàng ${i}`, qty: 1, unitPrice: 1000 }));
check(`cắt tối đa ${QUOTE_MAX_ITEMS} dòng`, normalizeQuoteItems(many).length, QUOTE_MAX_ITEMS);
check('items không phải mảng ⇒ []', normalizeQuoteItems(undefined), []);

/* --- (3) Mã báo giá ---------------------------------------------------- */
check('generateQuoteCode lấy max + 1', generateQuoteCode([{ code: 'BG-2026-0001' }, { code: 'BG-2026-0007' }], 2026), 'BG-2026-0008');
check('generateQuoteCode bỏ mã sai định dạng', generateQuoteCode([{ code: 'BG-2025-9999' }, { code: 'XYZ' }], 2026), 'BG-2026-10000');
check('generateQuoteCode danh sách rỗng', generateQuoteCode([], 2026), 'BG-2026-0001');
check('generateQuoteCode nhận mã viết thường', generateQuoteCode([{ code: 'bg-2026-0003' }], 2026), 'BG-2026-0004');
check('QUOTE_STATUSES đủ 5 trạng thái', QUOTE_STATUSES.length, 5);

/* --- (4) Hạn hiệu lực -------------------------------------------------- */
check('defaultValidUntil + 30 ngày', defaultValidUntil(NOW), iso(QUOTE_VALID_DAYS));
check('defaultValidUntil theo số ngày truyền vào', defaultValidUntil(NOW, 7), iso(7));
check('isQuoteExpired: còn 15 ngày ⇒ false', isQuoteExpired({ validUntil: iso(15) }, NOW), false);
check('isQuoteExpired: quá 1 ngày ⇒ true', isQuoteExpired({ validUntil: iso(-1) }, NOW), true);
check('isQuoteExpired: ngày rỗng ⇒ false', isQuoteExpired({}, NOW), false);

const pastQuote = makeQuote({ status: 'sent', validUntil: iso(-3) });
check('effectiveQuoteStatus: sent + quá hạn ⇒ expired', effectiveQuoteStatus(pastQuote, NOW), 'expired');
check('effectiveQuoteStatus: draft + quá hạn ⇒ expired', effectiveQuoteStatus(makeQuote({ status: 'draft', validUntil: iso(-3) }), NOW), 'expired');
check('effectiveQuoteStatus: accepted + quá hạn ⇒ giữ nguyên', effectiveQuoteStatus(makeQuote({ status: 'accepted', validUntil: iso(-3) }), NOW), 'accepted');

/* --- (6) CSV xuất Excel ------------------------------------------------ */
const csvQuote = makeQuote({
  items: [
    { name: 'MacBook Pro 14" M3 Pro', spec: 'M3 Pro / 18GB / 512GB', unit: 'Chiếc', qty: 3, unitPrice: 45990000, total: 137970000 },
    { name: 'Gói "AppleCare+" 36 tháng', unit: 'Gói', qty: 3, unitPrice: 5990000, total: 17970000 }
  ],
  total: 155940000
});
const csv = buildQuoteCsv([csvQuote, makeQuote({ id: 'q-empty', code: 'BG-2026-0002', items: [], total: 0 })]);
const csvLines = csv.split('\n').filter(Boolean);
check('CSV: bắt đầu bằng UTF-8 BOM', csv.charCodeAt(0), 0xfeff);
check('CSV: 1 header + 2 dòng hàng của quote 1 + 1 dòng của quote rỗng', csvLines.length, 4);
check('CSV: header có cột “Thành tiền (VNĐ)”', csvLines[0].includes('Thành tiền (VNĐ)'), true);
check('CSV: dấu " trong tên hàng được nhân đôi', csvLines[2].includes('"Gói ""AppleCare+"" 36 tháng"'), true);
check('CSV: dòng hàng có thành tiền đúng', csvLines[1].split(',').includes('137970000'), true);
check('CSV: báo giá rỗng vẫn xuất 1 dòng (không mất báo giá)', csvLines[3].startsWith('"BG-2026-0002"'), true);

/* --- (7) Link chia sẻ ------------------------------------------------- */
check('mã link luôn khác nhau (random cố định ⇒ lặp ký tự đầu bảng chữ)', generateQuoteLinkCode([], 4, () => 0), 'AAAA');
const takenCode = generateQuoteLinkCode([{ code: 'AAAA' }], 4, () => 0);
check('mã link tránh mã đã tồn tại (trả mã khác "AAAA")', takenCode !== 'AAAA', true);
check('khi hết lượt thử vẫn trả mã hợp lệ dạng BG...', takenCode.startsWith('BG'), true);
check('mã link không chứa ký tự dễ nhầm I/O/0/1', /[IO01]/.test(generateQuoteLinkCode([], 40, Math.random)), false);
check('normalizeLinkCode: bỏ khoảng trắng + viết hoa', normalizeLinkCode('  bg7k2m9q '), 'BG7K2M9Q');

const activeLink = { password: undefined, expiresAt: iso(10), isActive: true };
const passLink = { password: 'gpsoft', expiresAt: iso(10), isActive: true };
check('checkQuoteLink: link công khai ⇒ ok', checkQuoteLink(activeLink, undefined, NOW), 'ok');
check('checkQuoteLink: link không tồn tại ⇒ invalid', checkQuoteLink(undefined, 'x', NOW), 'invalid');
check('checkQuoteLink: link đã tắt ⇒ invalid', checkQuoteLink({ ...activeLink, isActive: false }, undefined, NOW), 'invalid');
check('checkQuoteLink: link hết hạn ⇒ invalid', checkQuoteLink({ ...activeLink, expiresAt: iso(-1) }, undefined, NOW), 'invalid');
check('checkQuoteLink: thiếu mật khẩu ⇒ password', checkQuoteLink(passLink, undefined, NOW), 'password');
check('checkQuoteLink: sai mật khẩu ⇒ password', checkQuoteLink(passLink, 'sai', NOW), 'password');
check('checkQuoteLink: đúng mật khẩu ⇒ ok', checkQuoteLink(passLink, 'gpsoft', NOW), 'ok');
check('checkQuoteLink: mật khẩu rỗng coi như không đặt', checkQuoteLink({ ...activeLink, password: '' }, undefined, NOW), 'ok');

/* --- Tổng kết ----------------------------------------------------------- */
console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `FAILED: ${failed} assertion sai, ${passed} đạt.`}`);
process.exit(failed === 0 ? 0 : 1);

check('effectiveQuoteStatus: sent + còn hạn ⇒ giữ nguyên', effectiveQuoteStatus(makeQuote(), NOW), 'sent');
const decorated = withEffectiveStatus(pastQuote, NOW);
check('withEffectiveStatus: isExpired', decorated.isExpired, true);
check('withEffectiveStatus: remainingDays', decorated.remainingDays, -3);
check('withEffectiveStatus: không đổi record gốc', pastQuote.status, 'sent');

/* --- (5) Tìm & lọc ----------------------------------------------------- */
check('findQuote theo id', findQuote([makeQuote()], 'q-1')?.code, 'BG-2026-0001');
check('findQuote theo code (không phân biệt hoa/thường)', findQuote([makeQuote()], 'bg-2026-0001')?.id, 'q-1');
check('findQuote không khớp ⇒ undefined', findQuote([makeQuote()], 'BG-9999-0001'), undefined);

const list = [
  makeQuote({ id: 'q-1', code: 'BG-2026-0001', status: 'sent' }),
  makeQuote({ id: 'q-2', code: 'BG-2026-0002', status: 'draft', customerName: 'Trần Thùy Linh', company: 'Trường THPT Nguyễn Du', phone: '0912 345 678', validUntil: iso(-10) }),
  makeQuote({ id: 'q-3', code: 'BG-2026-0003', status: 'accepted', customerName: 'Lê Minh Quân', company: '', phone: '0933445566', validUntil: iso(60) })
];
check('filterQuotes: không filter ⇒ giữ nguyên', filterQuotes(list, {}, NOW).length, 3);
check('filterQuotes: ?status=sent', filterQuotes(list, { status: 'sent' }, NOW).map(q => q.id), ['q-1']);
check('filterQuotes: ?status=draft,accepted', filterQuotes(list, { status: 'draft,accepted' }, NOW).map(q => q.id), ['q-2', 'q-3']);
check('filterQuotes: ?q=nguyễn du (không phân biệt hoa thường)', filterQuotes(list, { q: 'nguyễn du' }, NOW).map(q => q.id), ['q-2']);
check('filterQuotes: ?q=0933 (SĐT)', filterQuotes(list, { q: '0933' }, NOW).map(q => q.id), ['q-3']);
check('filterQuotes: ?expired=true', filterQuotes(list, { expired: 'true' }, NOW).map(q => q.id), ['q-2']);
check('filterQuotes: ?expired=false', filterQuotes(list, { expired: 'false' }, NOW).map(q => q.id), ['q-1', 'q-3']);
check('filterQuotes: giá trị rác bị bỏ qua', filterQuotes(list, { expired: 'abc', status: 'xyz' }, NOW).length, 3);
check('filterQuotes không sửa mảng đầu vào', [list.length, list[0].status], [3, 'sent']);
