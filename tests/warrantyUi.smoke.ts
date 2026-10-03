/**
 * P1.2 + P1.3 — Smoke test nhãn/badge + tiện ích hiển thị phiếu bảo hành (`src/utils/warranty.ts`).
 *
 * Chạy: `npm run test:warranty-ui`
 * Cách hoạt động: gọi trực tiếp hàm thuần (không cần backend/DB/trình duyệt) và kiểm tra
 * (1) enum trạng thái khớp **1-1** với `server/types.ts`/`WARRANTY_STATUSES` (ROADMAP §D mục 9)
 *     ⇒ thêm trạng thái mới mà quên nhãn/badge là test đỏ ngay;
 * (2) 3 dải màu badge hạn bảo hành (> 30 / 1–30 / quá hạn) + mốc biên 0 ngày;
 * (3) timeline 5 bước và nhánh `rejected`; (4) đếm phiếu; (5) preview hạn BH kẹp cuối tháng.
 */
import { WARRANTY_STATUSES } from '../server/warranty.ts';
import type { Warranty, WarrantyStatus } from '../src/types/index.ts';
import {
  WARRANTY_PROGRESS,
  WARRANTY_STATUS_BADGES,
  WARRANTY_STATUS_LABELS,
  WARRANTY_STATUS_ORDER,
  WARRANTY_TABS,
  WARRANTY_TYPE_LABELS,
  countExpiredWarranties,
  countProcessingWarranties,
  countWarrantiesByStatus,
  warrantyDaysLeft,
  warrantyEndDatePreview,
  warrantyRemainingBadge,
  warrantyTabById,
  warrantyTimeline
} from '../src/utils/warranty.ts';

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

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0);
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const makeWarranty = (over: Partial<Warranty>): Warranty => ({
  id: 'w-1',
  code: 'BH-2026-0001',
  customerName: 'Nguyễn Văn A',
  phone: '0905123456',
  productId: 'p-1',
  productName: 'MacBook Pro 14 M3',
  serialNumber: 'C02XT1ABCD',
  purchaseDate: iso(-200),
  startDate: iso(-200),
  endDate: iso(365),
  warrantyMonths: 12,
  warrantyType: 'nha_san_xuat',
  status: 'received',
  issue: 'Máy không lên nguồn',
  cost: 0,
  receivedAt: iso(-2),
  createdAt: iso(-2),
  ...over
});

/* ── 1. Enum ↔ nhãn/badge/progress phải khớp 1-1 (3 nơi theo ROADMAP §D mục 9) ─────── */
check('số trạng thái khớp server WARRANTY_STATUSES', WARRANTY_STATUS_ORDER.length, WARRANTY_STATUSES.length);
check(
  'mọi trạng thái server đều có trong WARRANTY_STATUS_ORDER',
  [...WARRANTY_STATUSES].sort(),
  [...WARRANTY_STATUS_ORDER].sort()
);
check(
  'mọi trạng thái đều có nhãn tiếng Việt',
  WARRANTY_STATUS_ORDER.filter(status => !WARRANTY_STATUS_LABELS[status]),
  []
);
check(
  'mọi trạng thái đều có badge màu',
  WARRANTY_STATUS_ORDER.filter(status => !WARRANTY_STATUS_BADGES[status]),
  []
);
check(
  'mọi trạng thái đều có % tiến độ',
  WARRANTY_STATUS_ORDER.filter(status => typeof WARRANTY_PROGRESS[status] !== 'number'),
  []
);
check(
  'nhãn tiếng Việt (received/returned/rejected)',
  [WARRANTY_STATUS_LABELS.received, WARRANTY_STATUS_LABELS.returned, WARRANTY_STATUS_LABELS.rejected],
  ['Đã tiếp nhận', 'Đã trả khách', 'Từ chối bảo hành']
);
check('nhãn 2 loại bảo hành', [WARRANTY_TYPE_LABELS.nha_san_xuat, WARRANTY_TYPE_LABELS.mo_rong], [
  'Bảo hành nhà sản xuất',
  'Bảo hành mở rộng'
]);

/* ── 2. Tab CMS ⇒ tham số API đúng như server P1.1 hỗ trợ ──────────────────────────── */
check('4 sub-tab', WARRANTY_TABS.map(tab => tab.id), ['all', 'processing', 'returned', 'expired']);
check('tab all: không lọc gì', warrantyTabById('all').query, {});
check('tab processing: status nhiều giá trị', warrantyTabById('processing').query, {
  status: 'received,inspecting,repairing,waiting_part'
});
check('tab returned: status=returned', warrantyTabById('returned').query, { status: 'returned' });
check('tab expired: expired=true', warrantyTabById('expired').query, { expired: true });
check('tab id lạ -> fallback tab đầu', warrantyTabById('khong-ton-tai' as never).id, 'all');

/* ── 3. warrantyDaysLeft: khớp quy ước `daysUntil()` (tròn lên, âm = quá hạn) ─────── */
check('còn 30 ngày', warrantyDaysLeft(iso(30), NOW), 30);
check('còn 0.5 ngày -> 1 (tròn lên)', warrantyDaysLeft(new Date(NOW + DAY / 2).toISOString(), NOW), 1);
check('quá hạn 1 ngày', warrantyDaysLeft(iso(-1), NOW), -1);
check('quá hạn nửa ngày -> 0', warrantyDaysLeft(new Date(NOW - DAY / 2).toISOString(), NOW), 0);
check('thiếu endDate -> null', warrantyDaysLeft(undefined, NOW), null);
check('endDate rác -> null', warrantyDaysLeft('khong-phai-ngay', NOW), null);

/* ── 4. Badge 3 dải màu + mốc biên ───────────────────────────────────────────────── */
const tone = (offsetDays: number) => warrantyRemainingBadge(iso(offsetDays), NOW).tone;
check('còn 365 ngày -> xanh', tone(365), 'green');
check('còn 31 ngày -> xanh (biên dưới dải xanh)', tone(31), 'green');
check('còn 30 ngày -> vàng (biên trên dải vàng)', tone(30), 'amber');
check('còn 1 ngày -> vàng', tone(1), 'amber');
check('hết hạn hôm nay -> vàng', tone(0), 'amber');
check('quá hạn 1 ngày -> đỏ', tone(-1), 'red');
check('thiếu hạn -> xám', warrantyRemainingBadge(null, NOW).tone, 'gray');
check('nhãn khi quá hạn', warrantyRemainingBadge(iso(-9), NOW).label, 'Đã hết hạn 9 ngày');
check('nhãn khi còn 12 ngày', warrantyRemainingBadge(iso(12), NOW).label, 'Còn 12 ngày');
check(
  'badge có class Tailwind (nền + chữ + viền)',
  warrantyRemainingBadge(iso(365), NOW).className.split(' ').length,
  3
);

/* ── 5. Timeline ─────────────────────────────────────────────────────────────────── */
const stepKeys = (status: WarrantyStatus) =>
  warrantyTimeline(status).map(step => `${step.key}:${step.done ? 1 : 0}${step.active ? '*' : ''}`);
check('timeline khi vừa tiếp nhận', stepKeys('received'), [
  'received:1*',
  'inspecting:0',
  'repairing:0',
  'done:0',
  'returned:0'
]);
check('timeline khi đang chờ linh kiện (bước 3 đang chạy)', stepKeys('waiting_part'), [
  'received:1',
  'inspecting:1',
  'repairing:1*',
  'done:0',
  'returned:0'
]);
check('timeline khi đã trả khách', stepKeys('returned'), [
  'received:1',
  'inspecting:1',
  'repairing:1',
  'done:1',
  'returned:1*'
]);
check('timeline nhánh từ chối bảo hành', stepKeys('rejected'), ['received:1', 'rejected:1*']);

/* ── 6. Đếm phiếu cho 4 thẻ thống kê ─────────────────────────────────────────────── */
const fixture: Warranty[] = [
  makeWarranty({ id: 'w-1', status: 'received', endDate: iso(400) }),
  makeWarranty({ id: 'w-2', status: 'waiting_part', endDate: iso(10) }),
  makeWarranty({ id: 'w-3', status: 'returned', endDate: iso(-5) }),
  makeWarranty({ id: 'w-4', status: 'rejected', endDate: iso(-60) })
];
check('đếm theo trạng thái', countWarrantiesByStatus(fixture), {
  received: 1,
  inspecting: 0,
  repairing: 0,
  waiting_part: 1,
  done: 0,
  returned: 1,
  rejected: 1
});
check('đếm đang xử lý', countProcessingWarranties(fixture), 2);
check('đếm đã hết hạn', countExpiredWarranties(fixture, NOW), 2);
check(
  'phiếu thiếu endDate không tính là hết hạn',
  countExpiredWarranties([makeWarranty({ endDate: undefined })], NOW),
  0
);

/* ── 7. Preview hạn bảo hành (kẹp cuối tháng như `addMonths()` server) ───────────── */
// Dựng input/so sánh theo **giờ địa phương** để test không phụ thuộc timezone máy chạy.
const localIso = (year: number, month: number, day: number) => new Date(year, month - 1, day).toISOString();
const localDate = (value: string | null) => {
  if (!value) return value;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
check(
  '31/01/2026 + 1 tháng -> 28/02/2026 (không phải 03/03)',
  localDate(warrantyEndDatePreview(localIso(2026, 1, 31), 1)),
  '2026-02-28'
);
check('31/01/2024 + 1 tháng -> 29/02/2024 (năm nhuận)', localDate(warrantyEndDatePreview(localIso(2024, 1, 31), 1)), '2024-02-29');
check('27/09/2026 + 12 tháng -> 27/09/2027', localDate(warrantyEndDatePreview(localIso(2026, 9, 27), 12)), '2027-09-27');
check('thiếu startDate -> null', warrantyEndDatePreview(null, 12), null);
check('startDate rác -> null', warrantyEndDatePreview('khong-phai-ngay', 12), null);

/* ── 8. Không sửa dữ liệu đầu vào ───────────────────────────────────────────────── */
const before = JSON.stringify(fixture);
countWarrantiesByStatus(fixture);
countProcessingWarranties(fixture);
countExpiredWarranties(fixture, NOW);
warrantyTimeline('returned');
check('fixture không bị thay đổi', JSON.stringify(fixture), before);

console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `${failed} assertion KHONG dat (${passed} đạt).`}`);
process.exit(failed === 0 ? 0 : 1);
