/**
 * P1.1 — Smoke test logic bảo hành (`server/warranty.ts`).
 *
 * Chạy: `npm run test:warranty`
 * Cách hoạt động: gọi trực tiếp hàm thuần (không cần backend/DB) và kiểm tra
 * (1) tra cứu công khai đúng quy ước — khớp mã phiếu/serial, khớp hậu tố SĐT ≥ 4 số,
 *     KHÔNG cho tìm mờ theo tên; (2) `remainingDays`/`isExpired`; (3) lọc danh sách CMS;
 * (4) mã phiếu + cộng tháng (đầu/cuối tháng); (5) không sửa dữ liệu đầu vào.
 */
import {
  LOOKUP_MAX_RESULTS,
  LOOKUP_MIN_LENGTH,
  WARRANTY_PROCESSING_STATUSES,
  WARRANTY_STATUSES,
  addMonths,
  daysUntil,
  digitsOnly,
  filterWarranties,
  generateWarrantyCode,
  lookupWarranties,
  matchWarrantyLookup,
  queryText,
  withRemainingDays
} from '../server/warranty.ts';
import type { Warranty } from '../server/types.ts';

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

/* --- Fixture: 3 phiếu giống seed P1.1, mốc thời gian cố định -------------- */
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0); // 27/09/2026 10:00 UTC
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const makeWarranty = (over: Partial<Warranty>): Warranty => ({
  id: 'w-1',
  code: 'BH-2026-0001',
  customerName: 'Nguyễn Văn Hùng',
  phone: '0977889900',
  productId: 'prod-iphone-16-pro-max',
  productName: 'iPhone 16 Pro Max 256GB - Titan Tự Nhiên',
  warrantyMonths: 24,
  warrantyType: 'nha_san_xuat',
  status: 'received',
  issue: 'Vệt sáng dọc bên phải màn hình',
  purchaseDate: iso(-75),
  startDate: iso(-75),
  endDate: iso(655),
  createdAt: iso(-1),
  ...over
});

const w1 = makeWarranty({});
const w2 = makeWarranty({
  id: 'w-2',
  code: 'BH-2026-0002',
  customerName: 'Trần Thùy Linh',
  phone: '0912 345 678',
  productId: 'prod-macbook-pro-14-m3-pro',
  productName: 'MacBook Pro 14 inch M3 Pro (18GB / 512GB SSD)',
  serialNumber: 'MBP14M3P-4471902',
  status: 'repairing',
  endDate: iso(20)
});
const w3 = makeWarranty({
  id: 'w-3',
  code: 'BH-2026-0003',
  customerName: 'Hoàng Mai Phương',
  phone: '0933445566',
  productId: 'prod-sony-wh1000xm5',
  productName: 'Tai nghe chống ồn Sony WH-1000XM5',
  serialNumber: 'SONY-WH1000XM5-BLK',
  status: 'returned',
  warrantyType: 'mo_rong',
  endDate: iso(-135),
  returnedAt: iso(-140)
});
const list: Warranty[] = [w1, w2, w3];

/* --- queryText / digitsOnly --------------------------------------------- */
check('queryText: trim', queryText('  BH-2026-0001  '), 'BH-2026-0001');
check('queryText: query lặp lấy giá trị đầu', queryText(['a', 'b']), 'a');
check('queryText: undefined -> chuỗi rỗng', queryText(undefined), '');
check('queryText: null -> chuỗi rỗng', queryText(null), '');
check('queryText: số -> chuỗi', queryText(42), '42');
check('digitsOnly: bỏ dấu cách/chấm/gạch', digitsOnly('0912 345.678-9'), '09123456789');
check('digitsOnly: chuỗi chữ -> rỗng', digitsOnly('khong-co-so'), '');

/* --- daysUntil ----------------------------------------------------------- */
check('daysUntil: còn 655 ngày', daysUntil(iso(655), NOW), 655);
check('daysUntil: quá hạn 135 ngày', daysUntil(iso(-135), NOW), -135);
check('daysUntil: hôm nay -> 0', daysUntil(iso(0), NOW), 0);
check('daysUntil: rỗng -> null', daysUntil('', NOW), null);
check('daysUntil: undefined -> null', daysUntil(undefined, NOW), null);
check('daysUntil: ngày không hợp lệ -> null', daysUntil('khong-phai-ngay', NOW), null);

/* --- withRemainingDays --------------------------------------------------- */
const e1 = withRemainingDays(w1, NOW);
check('withRemainingDays: phiếu còn hạn', [e1.remainingDays, e1.isExpired], [655, false]);
const e3 = withRemainingDays(w3, NOW);
check('withRemainingDays: phiếu hết hạn', [e3.remainingDays, e3.isExpired], [-135, true]);
check('withRemainingDays: trả object mới', e1 !== w1, true);
check('withRemainingDays: không thêm field vào record gốc', 'remainingDays' in w1, false);
check('withRemainingDays: giữ nguyên dữ liệu gốc', [e1.code, e1.phone], ['BH-2026-0001', '0977889900']);

/* --- addMonths (hạn bảo hành) ------------------------------------------- */
check('addMonths: 31/01 + 1 tháng -> 28/02', addMonths('2026-01-31T00:00:00.000Z', 1), '2026-02-28T00:00:00.000Z');
check('addMonths: 29/02/2024 + 12 tháng -> 28/02/2025', addMonths('2024-02-29T00:00:00.000Z', 12), '2025-02-28T00:00:00.000Z');
check('addMonths: 15/03 + 24 tháng', addMonths('2026-03-15T08:30:00.000Z', 24), '2028-03-15T08:30:00.000Z');
check('addMonths: +0 tháng giữ nguyên mốc', addMonths('2026-03-15T08:30:00.000Z', 0), '2026-03-15T08:30:00.000Z');
check('addMonths: ngày không hợp lệ -> null', addMonths('khong-phai-ngay', 12), null);

/* --- generateWarrantyCode ----------------------------------------------- */
check('generateWarrantyCode: danh sách rỗng', generateWarrantyCode([], 2026), 'BH-2026-0001');
check('generateWarrantyCode: lấy max + 1', generateWarrantyCode([{ code: 'BH-2026-0003' }, { code: 'BH-2026-0001' }], 2026), 'BH-2026-0004');
check('generateWarrantyCode: bỏ qua mã sai định dạng', generateWarrantyCode([{ code: 'XYZ' }, { code: '' }, {}], 2026), 'BH-2026-0001');
check('generateWarrantyCode: số của năm cũ vẫn được tôn trọng', generateWarrantyCode([{ code: 'BH-2025-0007' }], 2026), 'BH-2026-0008');

/* --- matchWarrantyLookup (route công khai, không cần token) -------------- */
check('lookup: khớp mã phiếu (không phân biệt hoa/thường)', matchWarrantyLookup(w2, 'bh-2026-0002'), true);
check('lookup: khớp mã phiếu có khoảng trắng thừa', matchWarrantyLookup(w2, '  BH-2026-0002 '), true);
check('lookup: khớp serial', matchWarrantyLookup(w2, 'mbp14m3p-4471902'), true);
check('lookup: khớp SĐT đầy đủ', matchWarrantyLookup(w2, '0912345678'), true);
check('lookup: khớp SĐT có dấu cách', matchWarrantyLookup(w2, '0912 345 678'), true);
check('lookup: khớp SĐT thiếu số 0 đầu', matchWarrantyLookup(w2, '912345678'), true);
check('lookup: khớp 4 số cuối', matchWarrantyLookup(w2, '5678'), true);
check('lookup: 3 số -> KHÔNG khớp (dưới ngưỡng 4)', matchWarrantyLookup(w2, '678'), false);
check('lookup: chuỗi rỗng -> không khớp', matchWarrantyLookup(w2, ''), false);
check('lookup: undefined -> không khớp', matchWarrantyLookup(w2, undefined), false);
check('lookup: SĐT của khách khác -> không khớp', matchWarrantyLookup(w2, '0977889900'), false);
check('lookup: KHÔNG tìm mờ theo tên khách', matchWarrantyLookup(w2, 'Linh'), false);
check('lookup: mã phiếu gần giống -> không khớp', matchWarrantyLookup(w2, 'BH-2026-000'), false);

/* --- lookupWarranties ---------------------------------------------------- */
const found = lookupWarranties(list, '0912 345 678', NOW);
check('lookupWarranties: đúng 1 phiếu', found.length, 1);
check('lookupWarranties: đúng id', found[0]?.id, 'w-2');
check('lookupWarranties: kèm remainingDays/isExpired', [found[0]?.remainingDays, found[0]?.isExpired], [20, false]);
const expiredHit = lookupWarranties(list, 'BH-2026-0003', NOW);
check('lookupWarranties: phiếu hết hạn -> isExpired = true', [expiredHit.length, expiredHit[0]?.isExpired], [1, true]);
check('lookupWarranties: không khớp -> mảng rỗng', lookupWarranties(list, '0987654321', NOW), []);
check('lookupWarranties: không sửa mảng gốc', list.length, 3);

const manySamePhone: Warranty[] = Array.from({ length: 25 }, (_, i) =>
  makeWarranty({ id: `dup-${i}`, code: `BH-2026-9${i}`, phone: '0900000000' })
);
check('lookupWarranties: giới hạn LOOKUP_MAX_RESULTS', lookupWarranties(manySamePhone, '0900000000', NOW).length, LOOKUP_MAX_RESULTS);

/* --- filterWarranties (danh sách cho CMS) -------------------------------- */
const ids = (rows: Warranty[]) => rows.map(w => w.id);
check('filter: không tham số -> đủ 3 phiếu', ids(filterWarranties(list, {}, NOW)), ['w-1', 'w-2', 'w-3']);
check('filter: trả mảng mới (không phải mảng gốc)', filterWarranties(list, {}, NOW) !== list, true);
check('filter: ?status=repairing', ids(filterWarranties(list, { status: 'repairing' }, NOW)), ['w-2']);
check('filter: ?status=RECEIVED (không phân biệt hoa/thường)', ids(filterWarranties(list, { status: 'RECEIVED' }, NOW)), ['w-1']);
check('filter: ?status=received,returned (nhiều giá trị)', ids(filterWarranties(list, { status: 'received,returned' }, NOW)), ['w-1', 'w-3']);
check('filter: ?status=received, returned, (có khoảng trắng/dấu phẩy thừa)', ids(filterWarranties(list, { status: 'received, returned, ' }, NOW)), ['w-1', 'w-3']);
check('filter: ?status=khong-ton-tai -> rỗng', ids(filterWarranties(list, { status: 'khong-ton-tai' }, NOW)), []);
check('filter: ?q=macbook (tên sản phẩm)', ids(filterWarranties(list, { q: 'macbook' }, NOW)), ['w-2']);
check('filter: ?q=sony (không phân biệt hoa/thường)', ids(filterWarranties(list, { q: 'sony' }, NOW)), ['w-3']);
check('filter: ?q=hùng (tên khách)', ids(filterWarranties(list, { q: 'hùng' }, NOW)), ['w-1']);
check('filter: ?q=mã phiếu', ids(filterWarranties(list, { q: 'BH-2026-0003' }, NOW)), ['w-3']);
check('filter: ?q=5678 (hậu tố SĐT)', ids(filterWarranties(list, { q: '5678' }, NOW)), ['w-2']);
check('filter: ?q=không-có-gì -> rỗng', ids(filterWarranties(list, { q: 'zzz-khong-co' }, NOW)), []);
check('filter: ?expired=true -> phiếu đã hết hạn', ids(filterWarranties(list, { expired: 'true' }, NOW)), ['w-3']);
check('filter: ?expired=false -> phiếu còn hạn', ids(filterWarranties(list, { expired: 'false' }, NOW)), ['w-1', 'w-2']);
check('filter: ?expired=abc (giá trị lạ) -> bỏ qua, không lọc', ids(filterWarranties(list, { expired: 'abc' }, NOW)), ['w-1', 'w-2', 'w-3']);
check('filter: kết hợp status + expired', ids(filterWarranties(list, { status: 'returned', expired: 'true' }, NOW)), ['w-3']);
check('filter: kết hợp status rộng + q', ids(filterWarranties(list, { status: 'received,returned', q: 'BH-2026-0001' }, NOW)), ['w-1']);

/* --- Hằng số hợp đồng ---------------------------------------------------- */
check('LOOKUP_MIN_LENGTH = 4', LOOKUP_MIN_LENGTH, 4);
check('LOOKUP_MAX_RESULTS = 20', LOOKUP_MAX_RESULTS, 20);
check('WARRANTY_STATUSES: đủ 7 trạng thái', WARRANTY_STATUSES, ['received', 'inspecting', 'repairing', 'waiting_part', 'done', 'returned', 'rejected']);
check('WARRANTY_PROCESSING_STATUSES: nhóm “đang xử lý”', WARRANTY_PROCESSING_STATUSES, ['received', 'inspecting', 'repairing', 'waiting_part']);

/* --- Tổng kết ----------------------------------------------------------- */
console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `FAILED: ${failed} assertion sai, ${passed} đạt.`}`);
process.exit(failed === 0 ? 0 : 1);
