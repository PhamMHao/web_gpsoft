/**
 * P1.7 — Smoke test logic mã giảm giá (`server/coupon.ts`).
 *
 * Chạy: `npm run test:coupons` (hàm thuần, KHÔNG cần backend/DB).
 * Nội dung kiểm tra: (1) chuẩn hoá mã; (2) thứ tự kiểm điều kiện (bật → thời gian → lượt dùng →
 * `minOrder` → phạm vi); (3) tiền giảm: `percent` có trần `maxDiscount`, `fixed`, kẹp `[0, subtotal]`;
 * (4) coupon theo danh mục/sản phẩm chỉ giảm trên phần hàng đủ điều kiện; (5) DoD của P1.7:
 * mã `GPSOFT500` hết hạn phải bị TỪ CHỐI và mã đã dùng hết lượt phải bị CHẶN;
 * (6) bộ lọc danh sách cho CMS; (7) không sửa dữ liệu đầu vào.
 */
import {
  COUPON_APPLY_TYPES,
  COUPON_DISCOUNT_TYPES,
  computeCouponDiscount,
  couponMessage,
  couponState,
  eligibleSubtotal,
  filterCoupons,
  findCoupon,
  isCouponApplyTo,
  isCouponDiscountType,
  itemsSubtotal,
  normalizeCouponCode,
  validateCoupon,
  vndText
} from '../server/coupon.ts';
import type { Coupon } from '../server/types.ts';

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

const makeCoupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: 'c-1',
  code: 'VIP10',
  name: 'Khách VIP giảm 10%',
  discountType: 'percent',
  value: 10,
  minOrder: 0,
  usageLimit: 0,
  usedCount: 0,
  applyTo: 'all',
  applyIds: [],
  isActive: true,
  createdAt: iso(-1),
  ...over
});

/* --- 1. Chuẩn hoá mã ----------------------------------------------------- */
check('normalizeCouponCode: bỏ khoảng trắng + in hoa', normalizeCouponCode('  gp soft500 '), 'GPSOFT500');
check('normalizeCouponCode: giữ dấu gạch', normalizeCouponCode('freeship-2026'), 'FREESHIP-2026');
check('normalizeCouponCode: rỗng', normalizeCouponCode(undefined), '');
check('isCouponDiscountType: hợp lệ', isCouponDiscountType('percent'), true);
check('isCouponDiscountType: rác', isCouponDiscountType('bogus'), false);
check('isCouponApplyTo: hợp lệ', isCouponApplyTo('category'), true);
check('isCouponApplyTo: rác', isCouponApplyTo('bogus'), false);
check('hằng kiểu giảm giá', COUPON_DISCOUNT_TYPES, ['percent', 'fixed']);
check('hằng phạm vi áp dụng', COUPON_APPLY_TYPES, ['all', 'category', 'product']);
check('vndText: phân cách nghìn', vndText(2000000), '2.000.000đ');

check('findCoupon: khớp không phân biệt hoa/thường', findCoupon([makeCoupon()], ' vip10 ')?.id, 'c-1');
check('findCoupon: không có mã', findCoupon([makeCoupon()], 'KHONGCO'), undefined);

/* --- 2. Trạng thái mã (thứ tự kiểm cố định) ------------------------------ */
check('couponState: bình thường', couponState(makeCoupon(), NOW), 'ok');
check('couponState: không tồn tại', couponState(undefined, NOW), 'invalid');
check('couponState: đang tắt', couponState(makeCoupon({ isActive: false }), NOW), 'inactive');
check('couponState: chưa tới startAt', couponState(makeCoupon({ startAt: iso(2) }), NOW), 'not_started');
check('couponState: quá endAt', couponState(makeCoupon({ endAt: iso(-1) }), NOW), 'expired');
check('couponState: hết lượt', couponState(makeCoupon({ usageLimit: 5, usedCount: 5 }), NOW), 'used_up');
check('couponState: usageLimit = 0 là vô hạn', couponState(makeCoupon({ usageLimit: 0, usedCount: 999 }), NOW), 'ok');
check(
  'couponState: hết hạn ưu tiên hơn hết lượt',
  couponState(makeCoupon({ endAt: iso(-1), usageLimit: 5, usedCount: 5 }), NOW),
  'expired'
);

/* --- 3. Tiền giảm ------------------------------------------------------- */
check('computeCouponDiscount: percent', computeCouponDiscount(makeCoupon(), 10_000_000), 1_000_000);
check(
  'computeCouponDiscount: percent bị kẹp bởi maxDiscount',
  computeCouponDiscount(makeCoupon({ maxDiscount: 300_000 }), 10_000_000),
  300_000
);
check(
  'computeCouponDiscount: fixed',
  computeCouponDiscount(makeCoupon({ discountType: 'fixed', value: 500_000 }), 10_000_000),
  500_000
);
check(
  'computeCouponDiscount: không vượt quá tạm tính',
  computeCouponDiscount(makeCoupon({ discountType: 'fixed', value: 900_000 }), 500_000),
  500_000
);
check('computeCouponDiscount: giỏ rỗng ⇒ 0', computeCouponDiscount(makeCoupon(), 0), 0);
check(
  'computeCouponDiscount: percent > 100 bị kẹp 100',
  computeCouponDiscount(makeCoupon({ value: 150 }), 1_000_000),
  1_000_000
);

const couponItems = [
  { productId: 'p-laptop', categoryId: 'cat-laptops', quantity: 1, price: 30_000_000 },
  { productId: 'p-mouse', categoryId: 'cat-accessories', quantity: 2, price: 1_000_000 }
];
check('itemsSubtotal: Σ qty × price', itemsSubtotal(couponItems), 32_000_000);
check(
  'eligibleSubtotal: applyTo = all ⇒ cả giỏ',
  eligibleSubtotal(makeCoupon(), couponItems, 32_000_000),
  32_000_000
);
check(
  'eligibleSubtotal: theo danh mục ⇒ chỉ phần laptop',
  eligibleSubtotal(makeCoupon({ applyTo: 'category', applyIds: ['cat-laptops'] }), couponItems, 32_000_000),
  30_000_000
);
check(
  'eligibleSubtotal: theo sản phẩm ⇒ chỉ dòng phụ kiện',
  eligibleSubtotal(makeCoupon({ applyTo: 'product', applyIds: ['p-mouse'] }), couponItems, 32_000_000),
  2_000_000
);
check(
  'eligibleSubtotal: không có items ⇒ 0 (không chứng minh được)',
  eligibleSubtotal(makeCoupon({ applyTo: 'category', applyIds: ['cat-laptops'] }), [], 32_000_000),
  0
);

/* --- 4. validateCoupon: DoD P1.7 ---------------------------------------- */
const laptopCoupon = makeCoupon({
  id: 'c-laptop',
  code: 'LAPTOP15',
  discountType: 'percent',
  value: 15,
  maxDiscount: 3_000_000,
  minOrder: 10_000_000,
  usageLimit: 20,
  usedCount: 20,
  startAt: iso(-20),
  endAt: iso(20),
  applyTo: 'category',
  applyIds: ['cat-laptops']
});

check(
  'validate: LAPTOP15 (đã hết lượt) BỊ CHẶN',
  validateCoupon([laptopCoupon], { code: 'LAPTOP15', subtotal: 32_000_000, items: couponItems, now: NOW }),
  { valid: false, discount: 0, message: 'Mã ưu đãi đã hết lượt sử dụng.' }
);

const expireCoupon = makeCoupon({
  id: 'c-old',
  code: 'GPSOFT500',
  discountType: 'fixed',
  value: 500_000,
  minOrder: 3_000_000,
  usageLimit: 100,
  usedCount: 100,
  startAt: iso(-60),
  endAt: iso(-3)
});
check(
  'validate: GPSOFT500 (hết hiệu lực) bị TỪ CHỐI',
  validateCoupon([expireCoupon], { code: 'GPSOFT500', subtotal: 32_000_000, items: couponItems, now: NOW }),
  { valid: false, discount: 0, message: 'Mã ưu đãi đã hết hiệu lực.' }
);

const voucher = makeCoupon({ id: 'c-ok', code: 'VIP10', minOrder: 5_000_000, maxDiscount: 2_000_000 });
const voucherOk = validateCoupon([voucher], {
  code: ' vip10 ',
  subtotal: 32_000_000,
  items: couponItems,
  now: NOW
});
check('validate: hợp lệ ⇒ valid', voucherOk.valid, true);
check('validate: hợp lệ ⇒ 10% của 32tr nhưng kẹp trần 2tr', voucherOk.discount, 2_000_000);
check('validate: thông báo có số tiền giảm', voucherOk.message.includes('2.000.000đ'), true);

check(
  'validate: dưới minOrder ⇒ từ chối',
  validateCoupon([voucher], { code: 'VIP10', subtotal: 3_000_000, items: couponItems, now: NOW }).message,
  'Mã chỉ áp dụng cho đơn hàng từ 5.000.000đ.'
);
check(
  'validate: rỗng mã ⇒ nhắc nhập',
  validateCoupon([voucher], { code: '   ', subtotal: 32_000_000, now: NOW }),
  { valid: false, discount: 0, message: 'Vui lòng nhập mã ưu đãi.' }
);
check(
  'validate: mã không tồn tại',
  validateCoupon([voucher], { code: 'KHONGCO', subtotal: 32_000_000, now: NOW }).message,
  'Mã ưu đãi không tồn tại hoặc đã hết hạn.'
);
check(
  'validate: mã giới hạn danh mục mà giỏ không có sản phẩm phù hợp',
  validateCoupon([makeCoupon({ applyTo: 'category', applyIds: ['cat-cameras'] })], {
    code: 'VIP10',
    subtotal: 32_000_000,
    items: couponItems,
    now: NOW
  }).message,
  'Mã ưu đãi không áp dụng cho sản phẩm đang có trong giỏ hàng.'
);
check(
  'validate: giỏ 0đ ⇒ không hợp lệ',
  validateCoupon([voucher], { code: 'VIP10', subtotal: 0, items: [], now: NOW }).valid,
  false
);

/* --- 5. Thông báo + bộ lọc CMS ------------------------------------------ */
check(
  'couponMessage: tạm dừng',
  couponMessage(makeCoupon(), 'inactive'),
  'Mã ưu đãi đang tạm dừng. Vui lòng liên hệ GPSOFT để được hỗ trợ.'
);
check(
  'couponMessage: chưa tới ngày',
  couponMessage(makeCoupon({ startAt: iso(3) }), 'not_started').startsWith('Mã ưu đãi chỉ áp dụng từ '),
  true
);

const catalog: Coupon[] = [
  makeCoupon({ id: 'c-a', code: 'VIP10', name: 'Khách VIP' }),
  makeCoupon({
    id: 'c-b',
    code: 'PHUKIEN200',
    name: 'Phụ kiện',
    discountType: 'fixed',
    value: 200_000,
    applyTo: 'category',
    applyIds: ['cat-accessories']
  }),
  makeCoupon({ id: 'c-c', code: 'HETHAN', name: 'Mã cũ', endAt: iso(-1) }),
  makeCoupon({ id: 'c-d', code: 'TAMNGUNG', name: 'Đang tắt', isActive: false })
];
check('filterCoupons: từ khoá không dấu không khớp tên có dấu', filterCoupons(catalog, { q: 'phu kien' }).length, 0);
check('filterCoupons: theo mã', filterCoupons(catalog, { q: 'vip' }).map(c => c.code), ['VIP10']);
check('filterCoupons: state = expired', filterCoupons(catalog, { state: 'expired' }).map(c => c.code), ['HETHAN']);
check(
  'filterCoupons: state = ok (bỏ mã tắt + hết hạn)',
  filterCoupons(catalog, { state: 'ok' }).map(c => c.code),
  ['VIP10', 'PHUKIEN200']
);
check(
  'filterCoupons: applyTo = category',
  filterCoupons(catalog, { applyTo: 'category' }).map(c => c.code),
  ['PHUKIEN200']
);
check('filterCoupons: state = all trả hết', filterCoupons(catalog, { state: 'all' }).length, 4);
check('filterCoupons: không truyền query ⇒ trả hết', filterCoupons(catalog).length, 4);

/* --- 6. Không sửa dữ liệu đầu vào --------------------------------------- */
const frozen = [makeCoupon({ id: 'frozen', usedCount: 3 })];
validateCoupon(frozen, { code: 'VIP10', subtotal: 10_000_000, items: couponItems, now: NOW });
check('validateCoupon: không sửa record đầu vào', frozen[0].usedCount, 3);

console.log(
  failed === 0
    ? `\nOK: ${passed}/${passed} assertion PASS (P1.7 — server/coupon.ts).`
    : `\n${failed} assertion KHONG dat (${passed} PASS).`
);
process.exit(failed === 0 ? 0 : 1);
