/**
 * P1.7/P1.8/P1.9 — Smoke test tiện ích thương mại dùng chung cho FE (`src/utils/commerce.ts`).
 *
 * Chạy: `npm run test:commerce-ui` (hàm thuần, KHÔNG cần backend/DOM).
 * Nội dung: nhãn mức giảm/điều kiện/lượt dùng của mã giảm giá · phí ship + gợi ý freeship
 * (phải KHỚP công thức `server/shipping.ts`) · đồng hồ đếm ngược campaign (`endAt` ⇒ ẩn khối)
 * · bộ nhãn/badge/tab mà 3 view CMS + CartDrawer đang dùng.
 */
import {
  CAMPAIGN_STATE_BADGES,
  CAMPAIGN_STATE_LABELS,
  CAMPAIGN_TABS,
  CAMPAIGN_TYPE_LABELS,
  COUPON_APPLY_LABELS,
  COUPON_STATE_BADGES,
  COUPON_STATE_LABELS,
  COUPON_TABS,
  campaignCountdown,
  campaignCountdownLabel,
  computeShippingFee,
  couponConditionLabel,
  couponDiscountLabel,
  couponUsageLabel,
  shippingFeeLabel,
  shippingFreeHint
} from '../src/utils/commerce.ts';
import type { Coupon, ShippingMethod } from '../src/types/index.ts';

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

/** Nhãn tiền chỉ cần chứa nhóm chữ số (không phụ thuộc ký tự khoảng trắng của `Intl`). */
function checkMoney(label: string, text: string, needle: string) {
  check(label, text.includes(needle), true);
}

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: 'c-1',
  code: 'VIP10',
  name: 'Khách VIP',
  discountType: 'percent',
  value: 10,
  minOrder: 5_000_000,
  usageLimit: 50,
  usedCount: 12,
  applyTo: 'all',
  applyIds: [],
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over
});

const method = (over: Partial<ShippingMethod> = {}): ShippingMethod => ({
  id: 'ship-standard',
  name: 'Giao tiêu chuẩn toàn quốc',
  fee: 30000,
  freeFrom: 1000000,
  estimatedDays: '2–4 ngày',
  regions: [],
  isActive: true,
  sortOrder: 1,
  ...over
});

/* --- P1.7 — nhãn mã giảm giá ------------------------------------------- */
checkMoney('couponDiscountLabel: percent', couponDiscountLabel(coupon({ maxDiscount: 2_000_000 })), 'Giảm 10%');
checkMoney('couponDiscountLabel: percent + trần', couponDiscountLabel(coupon({ maxDiscount: 2_000_000 })), '2.000.000');
checkMoney(
  'couponDiscountLabel: percent không trần',
  couponDiscountLabel(coupon({ maxDiscount: undefined })),
  'Giảm 10%'
);
checkMoney(
  'couponDiscountLabel: fixed',
  couponDiscountLabel(coupon({ discountType: 'fixed', value: 500_000 })),
  '500.000'
);
checkMoney('couponConditionLabel: có minOrder', couponConditionLabel(coupon()), 'Đơn từ 5.000.000');
check('couponConditionLabel: phạm vi toàn bộ', couponConditionLabel(coupon()).includes('Toàn bộ đơn hàng'), true);
check(
  'couponConditionLabel: phạm vi danh mục + số mục',
  couponConditionLabel(coupon({ applyTo: 'category', applyIds: ['cat-laptops', 'cat-phones'], minOrder: 0 })),
  'Theo danh mục · 2 mục đã chọn'
);
check('couponUsageLabel: có giới hạn', couponUsageLabel(coupon()), '12/50 lượt');
check(
  'couponUsageLabel: không giới hạn',
  couponUsageLabel(coupon({ usageLimit: 0, usedCount: 7 })),
  '7 lượt · không giới hạn'
);
check('COUPON_APPLY_LABELS: đủ 3 khoá', Object.keys(COUPON_APPLY_LABELS).length, 3);
check('COUPON_TABS: có tab Hết lượt', COUPON_TABS.map(t => t.label).includes('Hết lượt'), true);
check('COUPON_STATE_LABELS: hết lượt', COUPON_STATE_LABELS.used_up, 'Hết lượt');
check('COUPON_STATE_BADGES: đang chạy dùng màu emerald', COUPON_STATE_BADGES.ok.includes('emerald'), true);

/* --- P1.8 — phí ship (phải khớp công thức server) ---------------------- */
const standard = method();
const pickup = method({ id: 'ship-store', name: 'Nhận tại showroom', fee: 0, freeFrom: 0 });
check('computeShippingFee: dưới ngưỡng', computeShippingFee(standard, 500_000), 30000);
check('computeShippingFee: đúng ngưỡng ⇒ 0', computeShippingFee(standard, 1_000_000), 0);
check('computeShippingFee: freeFrom = 0 ⇒ luôn miễn phí', computeShippingFee(pickup, 500_000), 0);
check('computeShippingFee: không có phương thức ⇒ 0', computeShippingFee(undefined, 500_000), 0);
check('shippingFeeLabel: chưa đủ ngưỡng nên KHÔNG phải "Miễn phí"', shippingFeeLabel(standard, 500_000) === 'Miễn phí', false);
checkMoney('shippingFeeLabel: có phí hiển thị số tiền', shippingFeeLabel(standard, 500_000), '30.000');
check('shippingFeeLabel: miễn phí', shippingFeeLabel(standard, 1_500_000), 'Miễn phí');
check('shippingFreeHint: đang được freeship', shippingFreeHint(standard, 1_500_000), 'Đơn này được miễn phí giao hàng');
checkMoney('shippingFreeHint: gợi ý ngưỡng', shippingFreeHint(standard, 500_000), '1.000.000');
check(
  'shippingFreeHint: phương thức phí 0 ⇒ báo miễn phí cho đơn này',
  shippingFreeHint(pickup, 500_000),
  'Đơn này được miễn phí giao hàng'
);
const flatFee = method({ id: 'ship-flat', name: 'Giao tiết kiệm', fee: 25000, freeFrom: 0 });
check('shippingFreeHint: luôn thu phí, không ngưỡng ⇒ rỗng', shippingFreeHint(flatFee, 500_000), '');

/* --- P1.9 — đếm ngược campaign ---------------------------------------- */
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0); // 27/09/2026 10:00 UTC
const DAY_MS = 24 * 60 * 60 * 1000;
const target = new Date(NOW + 2 * DAY_MS + 3 * 3600_000 + 5 * 60_000 + 9_000).toISOString();
check('campaignCountdown: còn 2 ngày 03:05:09', campaignCountdown(target, NOW), {
  remaining: 2 * DAY_MS + 3 * 3600_000 + 5 * 60_000 + 9_000,
  days: 2,
  hours: 3,
  minutes: 5,
  seconds: 9,
  ended: false
});
check(
  'campaignCountdown: qua endAt ⇒ ended (khối flash sale tự ẩn)',
  campaignCountdown(new Date(NOW - 60_000).toISOString(), NOW),
  { remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
);
check(
  'campaignCountdown: không có endAt ⇒ không ended, remaining 0',
  campaignCountdown(undefined, NOW),
  { remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: false }
);
check(
  'campaignCountdown: endAt rác ⇒ không ended',
  campaignCountdown('khong-phai-ngay', NOW),
  { remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: false }
);
check(
  'campaignCountdownLabel: đã kết thúc',
  campaignCountdownLabel(new Date(NOW - 60_000).toISOString(), NOW),
  'Chương trình đã kết thúc'
);
check('campaignCountdownLabel: chạy vô hạn', campaignCountdownLabel(undefined, NOW), 'Đang diễn ra');
check('campaignCountdownLabel: có ngày ⇒ "2 ngày hh:mm:ss"', campaignCountdownLabel(target, NOW), '2 ngày 03:05:09');
check(
  'campaignCountdownLabel: dưới 1 ngày ⇒ chỉ giờ:phút:giây',
  campaignCountdownLabel(new Date(NOW + 5 * 60_000 + 4_000).toISOString(), NOW),
  '00:05:04'
);
check('CAMPAIGN_TABS: 5 tab trạng thái', CAMPAIGN_TABS.length, 5);
check('CAMPAIGN_TYPE_LABELS: flash sale', CAMPAIGN_TYPE_LABELS.flash_sale, 'Flash sale');
check('CAMPAIGN_STATE_LABELS: tạm dừng', CAMPAIGN_STATE_LABELS.paused, 'Tạm dừng');
check('CAMPAIGN_STATE_BADGES: đã kết thúc dùng màu slate', CAMPAIGN_STATE_BADGES.ended.includes('slate'), true);

console.log(
  failed === 0
    ? `\nOK: ${passed}/${passed} assertion PASS (P1.7–P1.9 — src/utils/commerce.ts).`
    : `\n${failed} assertion KHONG dat (${passed} PASS).`
);
process.exit(failed === 0 ? 0 : 1);

