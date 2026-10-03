/* =========================================================================
   MÃ GIẢM GIÁ — HÀM THUẦN DÙNG CHUNG (P1.7)
   =========================================================================
   Module này KHÔNG import express/db (chỉ import type + 2 helper chuẩn hoá đã có
   ở `server/quote.ts` / `server/warranty.ts`) ⇒ test bằng node thuần:
   `npm run test:coupons`. `server/routes.ts` chỉ việc map HTTP ↔ hàm:

     GET  /coupons            -> res.json(listBody(filterCoupons(db.getCoupons(), req.query), req.query));
     POST /coupons/validate   -> validateCoupon(db.getCoupons(), body)     // CÔNG KHAI
     POST /orders             -> validateCoupon(...) lần nữa + `usedCount += 1`

   Ba quy ước quan trọng:

   1. **Tiền luôn tính ở server.** Route `/coupons/validate` chỉ trả `{valid, discount, message}`;
      `POST /orders` validate LẠI từ `couponCode` (bỏ qua `discount` client gửi) rồi mới trừ tiền,
      nên không thể “bơm” giảm giá từ trình duyệt.
   2. **Điều kiện dùng mã kiểm theo thứ tự cố định**: tồn tại → đang bật → trong khoảng
      `startAt`/`endAt` → còn lượt (`usedCount < usageLimit`, `0` = vô hạn) → đủ `minOrder` →
      phạm vi áp dụng (`applyTo` + `applyIds`). Mỗi trạng thái có câu thông báo tiếng Việt riêng.
   3. **Coupon theo danh mục/sản phẩm chỉ giảm trên phần hàng ĐỦ ĐIỀU KIỆN** (`eligibleSubtotal`)
      ⇒ mã `LAPTOP15` cho giỏ có 1 laptop + 1 phụ kiện chỉ giảm trên tiền laptop.

   Mọi hàm đều KHÔNG sửa mảng/record đầu vào (trả bản mới) — dữ liệu nằm trong RAM của DB.
   ========================================================================= */
import type { Coupon, CouponApplyTo, CouponDiscountType, CouponValidation } from './types.js';
import type { QueryParams } from './pagination.js';
// P1.7 — dùng lại 2 helper chuẩn hoá đã có (không viết bản thứ hai).
import { money, nonNegativeInt } from './quote.js';
import { queryText } from './warranty.js';

export const COUPON_DISCOUNT_TYPES: CouponDiscountType[] = ['percent', 'fixed'];
export const COUPON_APPLY_TYPES: CouponApplyTo[] = ['all', 'category', 'product'];

/** Trạng thái của 1 mã tại thời điểm hiện tại (dùng cho cả validate lẫn bộ lọc CMS). */
export type CouponState =
  | 'ok'
  | 'invalid'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'used_up'
  | 'min_order'
  | 'out_of_scope';

/** 1 dòng hàng client gửi lên để kiểm phạm vi + tính phần tiền đủ điều kiện. */
export interface CouponItemInput {
  productId?: string;
  categoryId?: string;
  quantity?: number;
  price?: number;
}

export interface CouponCheckInput {
  code?: unknown;
  /** Tạm tính của giỏ (nếu bỏ trống ⇒ cộng từ `items`). */
  subtotal?: unknown;
  items?: CouponItemInput[];
  /** Thời điểm kiểm (test bơm mốc thời gian cố định). */
  now?: number | Date;
}

export function isCouponDiscountType(value: unknown): value is CouponDiscountType {
  return COUPON_DISCOUNT_TYPES.includes(queryText(value) as CouponDiscountType);
}

export function isCouponApplyTo(value: unknown): value is CouponApplyTo {
  return COUPON_APPLY_TYPES.includes(queryText(value) as CouponApplyTo);
}

/**
 * Chuẩn hoá mã khách nhập: bỏ mọi khoảng trắng và in hoa (`' gpsoft 500 '` → `'GPSOFT500'`).
 * Dấu `-`/`_` được giữ nguyên vì nhiều mã dùng chúng (`FREESHIP-2026`).
 */
export function normalizeCouponCode(value: unknown): string {
  return queryText(value).replace(/\s+/g, '').toUpperCase();
}

/** `21.000.000đ` — dùng cho thông báo tiếng Việt (không phụ thuộc `Intl` currency). */
export function vndText(value: number): string {
  return `${money(value).toLocaleString('vi-VN')}đ`;
}

/** `27/09/2026` — thông báo “mã áp dụng từ/đến ngày…”. */
export function dateText(value: unknown): string {
  const iso = queryText(value);
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Tìm coupon theo mã đã chuẩn hoá (không phân biệt hoa/thường, bỏ khoảng trắng). */
export function findCoupon(coupons: Coupon[], code: unknown): Coupon | undefined {
  const wanted = normalizeCouponCode(code);
  if (!wanted) return undefined;
  return coupons.find(c => normalizeCouponCode(c.code) === wanted);
}

/** Giá trị hàng tính từ `items` (dùng khi client không gửi `subtotal`). */
export function itemsSubtotal(items: CouponItemInput[] = []): number {
  return items.reduce(
    (sum, item) => sum + money(item?.price) * nonNegativeInt(item?.quantity, 1),
    0
  );
}

/**
 * Phần tiền hàng ĐỦ ĐIỀU KIỆN của mã:
 * - `all`      ⇒ toàn bộ tạm tính;
 * - `product`  ⇒ Σ các dòng có `productId` nằm trong `applyIds`;
 * - `category` ⇒ Σ các dòng có `categoryId` nằm trong `applyIds`.
 * Có giới hạn phạm vi mà client không gửi `items` ⇒ 0 (không thể chứng minh đủ điều kiện).
 */
export function eligibleSubtotal(
  coupon: Coupon,
  items: CouponItemInput[] = [],
  fallbackSubtotal = 0
): number {
  if (coupon.applyTo === 'all') {
    const fromItems = itemsSubtotal(items);
    return fromItems > 0 ? fromItems : money(fallbackSubtotal);
  }
  const ids = (coupon.applyIds || []).filter(Boolean);
  if (ids.length === 0 || items.length === 0) return 0;
  const key = coupon.applyTo === 'product' ? 'productId' : 'categoryId';
  return items.reduce((sum, item) => {
    const owner = queryText((item as Record<string, unknown>)?.[key]);
    if (!owner || !ids.includes(owner)) return sum;
    return sum + money(item?.price) * nonNegativeInt(item?.quantity, 1);
  }, 0);
}

/**
 * Tính tiền giảm: `percent` (có trần `maxDiscount`) hoặc `fixed` — luôn kẹp trong
 * `[0, subtotal]` để tổng đơn không bao giờ âm.
 */
export function computeCouponDiscount(coupon: Coupon, subtotal: number): number {
  const base = money(subtotal);
  if (base <= 0) return 0;
  let discount: number;
  if (coupon.discountType === 'percent') {
    const percent = Math.min(100, nonNegativeInt(coupon.value));
    discount = Math.round((base * percent) / 100);
  } else {
    discount = money(coupon.value);
  }
  if (coupon.maxDiscount && coupon.maxDiscount > 0) {
    discount = Math.min(discount, money(coupon.maxDiscount));
  }
  return Math.max(0, Math.min(discount, base));
}

/** Trạng thái mã tại `now` (chưa xét tới tiền hàng). */
export function couponState(coupon: Coupon | undefined, now: number | Date = Date.now()): CouponState {
  if (!coupon) return 'invalid';
  if (!coupon.isActive) return 'inactive';
  const at = now instanceof Date ? now.getTime() : now;
  if (coupon.startAt) {
    const start = new Date(coupon.startAt).getTime();
    if (Number.isFinite(start) && at < start) return 'not_started';
  }
  if (coupon.endAt) {
    const end = new Date(coupon.endAt).getTime();
    if (Number.isFinite(end) && at > end) return 'expired';
  }
  const limit = nonNegativeInt(coupon.usageLimit);
  if (limit > 0 && nonNegativeInt(coupon.usedCount) >= limit) return 'used_up';
  return 'ok';
}

/** Thông báo tiếng Việt cho từng trạng thái — hiển thị thẳng cho khách. */
export function couponMessage(coupon: Coupon | undefined, state: CouponState, discount = 0): string {
  switch (state) {
    case 'inactive':
      return 'Mã ưu đãi đang tạm dừng. Vui lòng liên hệ GPSOFT để được hỗ trợ.';
    case 'not_started':
      return `Mã ưu đãi chỉ áp dụng từ ${dateText(coupon?.startAt)}.`;
    case 'expired':
      return 'Mã ưu đãi đã hết hiệu lực.';
    case 'used_up':
      return 'Mã ưu đãi đã hết lượt sử dụng.';
    case 'min_order':
      return `Mã chỉ áp dụng cho đơn hàng từ ${vndText(coupon?.minOrder || 0)}.`;
    case 'out_of_scope':
      return 'Mã ưu đãi không áp dụng cho sản phẩm đang có trong giỏ hàng.';
    case 'ok':
      return `Áp dụng mã ${normalizeCouponCode(coupon?.code)} thành công, giảm ${vndText(discount)}!`;
    default:
      return 'Mã ưu đãi không tồn tại hoặc đã hết hạn.';
  }
}

/**
 * Validate đầy đủ 1 mã cho 1 giỏ hàng. Trả `{ valid, discount, message }` — dùng chung cho
 * route công khai `POST /coupons/validate` và cho `POST /orders` (server tính lại tiền đơn).
 */
export function validateCoupon(coupons: Coupon[], input: CouponCheckInput): CouponValidation {
  if (!normalizeCouponCode(input?.code)) {
    return { valid: false, discount: 0, message: 'Vui lòng nhập mã ưu đãi.' };
  }

  const coupon = findCoupon(coupons, input?.code);
  const items = Array.isArray(input?.items) ? input.items : [];
  const subtotal = money(input?.subtotal) || itemsSubtotal(items);

  const base = couponState(coupon, input?.now ?? Date.now());
  if (base !== 'ok' || !coupon) {
    return { valid: false, discount: 0, message: couponMessage(coupon, base) };
  }

  if (money(coupon.minOrder) > subtotal) {
    return { valid: false, discount: 0, message: couponMessage(coupon, 'min_order') };
  }

  const discount = computeCouponDiscount(coupon, eligibleSubtotal(coupon, items, subtotal));
  if (discount <= 0) {
    return { valid: false, discount: 0, message: couponMessage(coupon, 'out_of_scope') };
  }

  return { valid: true, discount, message: couponMessage(coupon, 'ok', discount) };
}

/** Bộ lọc danh sách cho CMS: `?q=` (mã/tên) · `?state=` · `?applyTo=`. */
export function filterCoupons(coupons: Coupon[], query: QueryParams = {}): Coupon[] {
  const q = queryText(query.q).toLowerCase();
  const state = queryText(query.state);
  const applyTo = queryText(query.applyTo);

  return coupons.filter(coupon => {
    if (q) {
      const haystack = `${coupon.code} ${coupon.name}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (applyTo && coupon.applyTo !== applyTo) return false;
    if (state && state !== 'all' && couponState(coupon) !== state) return false;
    return true;
  });
}
