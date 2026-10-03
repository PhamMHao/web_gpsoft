/**
 * P1.7 · P1.8 · P1.9 — Tiện ích thương mại dùng chung cho Website + CMS.
 *
 * Gồm 3 nhóm:
 *  - **Mã giảm giá**: nhãn/badge/phạm vi áp dụng + danh sách tab trạng thái cho `CouponsView`.
 *  - **Phí vận chuyển**: `computeShippingFee()` — **bản phản chiếu** của
 *    `server/shipping.ts` để giỏ hàng hiển thị đúng phí ngay khi khách chọn phương thức
 *    (server vẫn là nơi chốt phí khi tạo đơn: `POST /orders`).
 *  - **Chiến dịch**: nhãn/badge + `campaignCountdown()` đếm ngược theo `endAt`.
 *
 * Toàn bộ là hàm thuần (không gọi API, không phụ thuộc DOM) ⇒ test bằng node thuần:
 * `npm run test:commerce-ui`.
 */
import {
  CampaignState,
  CampaignType,
  Coupon,
  CouponApplyTo,
  CouponState,
  ShippingMethod
} from '../types/index.ts';
import { formatVnd } from './format.ts';

/* =========================================================================
   P1.7 — MÃ GIẢM GIÁ
   ========================================================================= */

export const COUPON_STATE_LABELS: Record<CouponState, string> = {
  ok: 'Đang chạy',
  invalid: 'Không tồn tại',
  inactive: 'Tạm dừng',
  not_started: 'Sắp chạy',
  expired: 'Hết hiệu lực',
  used_up: 'Hết lượt',
  min_order: 'Chưa đủ giá trị',
  out_of_scope: 'Ngoài phạm vi'
};

export const COUPON_STATE_BADGES: Record<CouponState, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  invalid: 'bg-slate-100 text-slate-600 border-slate-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  not_started: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  used_up: 'bg-orange-50 text-orange-700 border-orange-200',
  min_order: 'bg-amber-50 text-amber-700 border-amber-200',
  out_of_scope: 'bg-slate-100 text-slate-600 border-slate-200'
};

/** Tab lọc trạng thái ở `CouponsView` (giống cách `QUOTE_TABS`/`WARRANTY_TABS` làm). */
export const COUPON_TABS: { id: 'all' | CouponState; label: string; query: string }[] = [
  { id: 'all', label: 'Tất cả', query: '' },
  { id: 'ok', label: 'Đang chạy', query: 'ok' },
  { id: 'not_started', label: 'Sắp chạy', query: 'not_started' },
  { id: 'inactive', label: 'Tạm dừng', query: 'inactive' },
  { id: 'used_up', label: 'Hết lượt', query: 'used_up' },
  { id: 'expired', label: 'Hết hiệu lực', query: 'expired' }
];

export const COUPON_APPLY_LABELS: Record<CouponApplyTo, string> = {
  all: 'Toàn bộ đơn hàng',
  category: 'Theo danh mục',
  product: 'Theo sản phẩm'
};

/** `Giảm 10% (tối đa 2.000.000 ₫)` · `Giảm 500.000 ₫` — nhãn ngắn cho bảng CMS/giỏ hàng. */
export function couponDiscountLabel(coupon: Pick<Coupon, 'discountType' | 'value' | 'maxDiscount'>): string {
  if (coupon.discountType === 'percent') {
    const cap = coupon.maxDiscount && coupon.maxDiscount > 0 ? ` (tối đa ${formatVnd(coupon.maxDiscount)})` : '';
    return `Giảm ${coupon.value}%${cap}`;
  }
  return `Giảm ${formatVnd(coupon.value)}`;
}

/** Điều kiện áp dụng dạng 1 dòng cho bảng CMS: `Đơn từ 5.000.000 ₫ · Toàn bộ đơn hàng`. */
export function couponConditionLabel(
  coupon: Pick<Coupon, 'minOrder' | 'applyTo' | 'applyIds'>
): string {
  const parts: string[] = [];
  if (coupon.minOrder > 0) parts.push(`Đơn từ ${formatVnd(coupon.minOrder)}`);
  parts.push(COUPON_APPLY_LABELS[coupon.applyTo]);
  if (coupon.applyTo !== 'all' && coupon.applyIds.length > 0) {
    parts.push(`${coupon.applyIds.length} mục đã chọn`);
  }
  return parts.join(' · ');
}

/** `12/50 lượt` hoặc `7 lượt · không giới hạn` khi `usageLimit = 0`. */
export function couponUsageLabel(coupon: Pick<Coupon, 'usageLimit' | 'usedCount'>): string {
  if (!coupon.usageLimit || coupon.usageLimit <= 0) return `${coupon.usedCount} lượt · không giới hạn`;
  return `${coupon.usedCount}/${coupon.usageLimit} lượt`;
}

/* =========================================================================
   P1.8 — PHÍ VẬN CHUYỂN
   ========================================================================= */

/**
 * Phí của 1 phương thức với giá trị hàng `subtotal` (`freeFrom > 0` và `subtotal ≥ freeFrom` ⇒ 0).
 * Giữ ĐÚNG công thức của server (`server/shipping.ts`) để giỏ hàng không lệch với đơn đã lưu.
 */
export function computeShippingFee(method: ShippingMethod | undefined, subtotal: number): number {
  if (!method) return 0;
  if (method.freeFrom > 0 && subtotal >= method.freeFrom) return 0;
  return method.fee > 0 ? method.fee : 0;
}

/** `Miễn phí` · `30.000 ₫` — nhãn cho danh sách chọn phương thức. */
export function shippingFeeLabel(method: ShippingMethod, subtotal: number): string {
  return computeShippingFee(method, subtotal) === 0 ? 'Miễn phí' : formatVnd(method.fee);
}

/** Gợi ý “miễn phí từ X” hiển thị dưới tên phương thức (rỗng khi không có ngưỡng). */
export function shippingFreeHint(method: ShippingMethod, subtotal: number): string {
  if (computeShippingFee(method, subtotal) === 0) return 'Đơn này được miễn phí giao hàng';
  return method.freeFrom > 0 ? `Miễn phí giao hàng cho đơn từ ${formatVnd(method.freeFrom)}` : '';
}

/* =========================================================================
   P1.9 — CHIẾN DỊCH / FLASH SALE
   ========================================================================= */

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  countdown: 'Đếm ngược',
  flash_sale: 'Flash sale',
  banner: 'Banner'
};

export const CAMPAIGN_STATE_LABELS: Record<CampaignState, string> = {
  running: 'Đang chạy',
  scheduled: 'Sắp chạy',
  ended: 'Đã kết thúc',
  paused: 'Tạm dừng'
};

export const CAMPAIGN_STATE_BADGES: Record<CampaignState, string> = {
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  ended: 'bg-slate-100 text-slate-600 border-slate-200',
  paused: 'bg-rose-50 text-rose-700 border-rose-200'
};

/** Tab lọc campaign ở `CampaignsView`. */
export const CAMPAIGN_TABS: { id: 'all' | CampaignState; label: string; query: string }[] = [
  { id: 'all', label: 'Tất cả', query: '' },
  { id: 'running', label: 'Đang chạy', query: 'running' },
  { id: 'scheduled', label: 'Sắp chạy', query: 'scheduled' },
  { id: 'paused', label: 'Tạm dừng', query: 'paused' },
  { id: 'ended', label: 'Đã kết thúc', query: 'ended' }
];

export interface Countdown {
  /** Còn bao nhiêu ms (0 khi đã hết hoặc không khai `endAt`). */
  remaining: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** `true` ⇒ quá `endAt` (khối flash sale phải tự ẩn). */
  ended: boolean;
}

/**
 * Đếm ngược tới `endAt` (ISO). Không có `endAt` hoặc ngày không hợp lệ ⇒ `ended: false`
 * nhưng `remaining = 0` (campaign chạy vô hạn vẫn hiện khối, chỉ không có đồng hồ).
 */
export function campaignCountdown(endAt?: string, now: number = Date.now()): Countdown {
  const empty = { remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: false };
  if (!endAt) return empty;
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(end)) return empty;
  if (now >= end) return { ...empty, ended: true };

  const totalSeconds = Math.floor((end - now) / 1000);
  return {
    remaining: end - now,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    ended: false
  };
}

/** `2 ngày 05:42:19` — chú thích dưới đồng hồ đếm ngược. */
export function campaignCountdownLabel(endAt?: string, now: number = Date.now()): string {
  const left = campaignCountdown(endAt, now);
  if (left.ended) return 'Chương trình đã kết thúc';
  if (left.remaining === 0) return 'Đang diễn ra';
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`;
  return left.days > 0 ? `${left.days} ngày ${clock}` : clock;
}
