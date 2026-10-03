/**
 * P1.8 — Smoke test logic phí vận chuyển (`server/shipping.ts`).
 *
 * Chạy: `npm run test:shipping` (hàm thuần, KHÔNG cần backend/DB).
 * Nội dung: (1) phí theo `fee`/`freeFrom` (đúng DoD “đổi `freeFrom` trong CMS ⇒ phí đổi theo”);
 * (2) chỉ trả phương thức ĐANG BẬT cho website; (3) sắp xếp theo `sortOrder`;
 * (4) chọn phương thức an toàn khi thiếu/không có `shippingMethodId`; (5) bộ lọc CMS;
 * (6) không sửa dữ liệu đầu vào.
 */
import {
  activeShippingMethods,
  computeShippingFee,
  filterShippingMethods,
  resolveShippingFee,
  resolveShippingMethod,
  shippingFeeLabel
} from '../server/shipping.ts';
import type { ShippingMethod } from '../server/types.ts';

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

const makeMethod = (over: Partial<ShippingMethod> = {}): ShippingMethod => ({
  id: 'ship-standard',
  name: 'Giao tiêu chuẩn toàn quốc',
  description: 'GHN / Viettel Post',
  fee: 30000,
  freeFrom: 1000000,
  estimatedDays: '2–4 ngày',
  regions: [],
  isActive: true,
  sortOrder: 1,
  ...over
});

const standard = makeMethod();
const express = makeMethod({
  id: 'ship-express',
  name: 'Giao hỏa tốc 2 giờ',
  description: 'Nội thành Hà Nội & TP.HCM',
  fee: 60000,
  freeFrom: 20000000,
  regions: ['TP. Hồ Chí Minh', 'Hà Nội'],
  sortOrder: 2
});
const pickup = makeMethod({
  id: 'ship-store',
  name: 'Nhận tại showroom',
  description: 'Giữ hàng 24 giờ',
  fee: 0,
  freeFrom: 0,
  sortOrder: 3
});
const disabled = makeMethod({
  id: 'ship-install',
  name: 'Lắp đặt B2B',
  description: 'Kỹ thuật viên tới tận nơi',
  fee: 150000,
  isActive: false,
  sortOrder: 4
});
const catalog = [disabled, pickup, express, standard];

/* --- 1. Phí theo freeFrom (DoD P1.8) ------------------------------------ */
check('computeShippingFee: dưới ngưỡng ⇒ thu phí', computeShippingFee(standard, 500_000), 30000);
check('computeShippingFee: đúng ngưỡng ⇒ freeship', computeShippingFee(standard, 1_000_000), 0);
check('computeShippingFee: trên ngưỡng ⇒ freeship', computeShippingFee(standard, 32_000_000), 0);
check('computeShippingFee: freeFrom = 0 ⇒ luôn thu phí', computeShippingFee(pickup, 32_000_000), 0);
check('computeShippingFee: hỏa tốc cần 20tr mới freeship', computeShippingFee(express, 5_000_000), 60000);
check('computeShippingFee: hỏa tốc freeship ở 20tr', computeShippingFee(express, 20_000_000), 0);
check('computeShippingFee: không có phương thức ⇒ 0', computeShippingFee(undefined, 5_000_000), 0);
check('shippingFeeLabel: có phí', shippingFeeLabel(standard, 500_000), '30.000đ');
check('shippingFeeLabel: miễn phí', shippingFeeLabel(standard, 1_500_000), 'Miễn phí');

/* --- 2. Website chỉ thấy phương thức đang bật --------------------------- */
check('activeShippingMethods: loại phương thức đang tắt', activeShippingMethods(catalog).map(m => m.id), [
  'ship-standard',
  'ship-express',
  'ship-store'
]);
check('activeShippingMethods: sắp theo sortOrder', activeShippingMethods(catalog).map(m => m.sortOrder), [1, 2, 3]);
check('activeShippingMethods: không sửa mảng gốc', catalog.map(m => m.id), [
  'ship-install',
  'ship-store',
  'ship-express',
  'ship-standard'
]);

/* --- 3. Chọn phương thức khi tạo đơn ----------------------------------- */
check('resolveShippingMethod: theo id', resolveShippingMethod(catalog, 'ship-express')?.id, 'ship-express');
check('resolveShippingMethod: id rỗng ⇒ phương thức đầu tiên đang bật', resolveShippingMethod(catalog, '')?.id, 'ship-standard');
check('resolveShippingMethod: id lạ ⇒ fallback phương thức đầu', resolveShippingMethod(catalog, 'ship-khong-co')?.id, 'ship-standard');
check('resolveShippingMethod: id phương thức đang tắt ⇒ fallback', resolveShippingMethod(catalog, 'ship-install')?.id, 'ship-standard');

check(
  'resolveShippingFee: chọn hỏa tốc, đơn 5tr ⇒ 60.000đ',
  resolveShippingFee(catalog, 'ship-express', 5_000_000),
  { method: express, fee: 60000 }
);
check(
  'resolveShippingFee: không gửi id ⇒ dùng phương thức đầu (30.000đ / freeship 1tr)',
  resolveShippingFee(catalog, undefined, 500_000).fee,
  30000
);
check(
  'resolveShippingFee: cùng phương thức nhưng đơn 2tr ⇒ 0đ',
  resolveShippingFee(catalog, undefined, 2_000_000).fee,
  0
);

/* --- 4. Bộ lọc CMS ------------------------------------------------------ */
check('filterShippingMethods: có cả phương thức đang tắt', filterShippingMethods(catalog).length, 4);
check('filterShippingMethods: ?active=true', filterShippingMethods(catalog, { active: 'true' }).length, 3);
check('filterShippingMethods: ?active=false', filterShippingMethods(catalog, { active: 'false' }).map(m => m.id), [
  'ship-install'
]);
check(
  'filterShippingMethods: ?q= hỏa tốc',
  filterShippingMethods(catalog, { q: 'hỏa tốc' }).map(m => m.id),
  ['ship-express']
);
check(
  'filterShippingMethods: ?q= khớp cả mô tả',
  filterShippingMethods(catalog, { q: 'ghn' }).map(m => m.id),
  ['ship-standard']
);

console.log(
  failed === 0
    ? `\nOK: ${passed}/${passed} assertion PASS (P1.8 — server/shipping.ts).`
    : `\n${failed} assertion KHONG dat (${passed} PASS).`
);
process.exit(failed === 0 ? 0 : 1);
