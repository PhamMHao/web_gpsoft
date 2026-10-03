/* =========================================================================
   PHÍ VẬN CHUYỂN — HÀM THUẦN DÙNG CHUNG (P1.8)
   =========================================================================
   Module này KHÔNG import express/db (chỉ import type + helper chuẩn hoá đã có)
   ⇒ test bằng node thuần: `npm run test:shipping`. `server/routes.ts` chỉ việc:

     GET  /shipping-methods   -> res.json(listBody(filterShippingMethods(db.getShippingMethods(), req.query), req.query));
     POST /orders             -> resolveShippingFee(methods, shippingMethodId, subtotal)

   Quy ước: **phí ship do server chốt** từ `shippingMethodId` + `subtotal` server tự tính
   (`freeFrom = 0` ⇒ luôn thu `fee`; `subtotal ≥ freeFrom` ⇒ 0đ). Client chọn phương thức
   chứ không gửi tiền ⇒ không thể “bơm” freeship từ trình duyệt.

   Mọi hàm đều KHÔNG sửa mảng/record đầu vào (trả bản mới) — dữ liệu nằm trong RAM của DB.
   ========================================================================= */
import type { ShippingMethod } from './types.js';
import type { QueryParams } from './pagination.js';
import { money } from './quote.js';
import { queryText } from './warranty.js';

/** Thứ tự hiển thị: `sortOrder` tăng dần, cùng mức thì theo tên. */
function bySortOrder(a: ShippingMethod, b: ShippingMethod): number {
  const diff = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
  return diff !== 0 ? diff : String(a.name).localeCompare(String(b.name), 'vi');
}

/** Chỉ các phương thức ĐANG BẬT, đã sắp xếp — dùng cho website. */
export function activeShippingMethods(methods: ShippingMethod[]): ShippingMethod[] {
  return methods.filter(m => m.isActive).sort(bySortOrder);
}

/** Bộ lọc danh sách cho CMS: `?q=` (tên/mô tả) · `?active=true|false`. */
export function filterShippingMethods(
  methods: ShippingMethod[],
  query: QueryParams = {}
): ShippingMethod[] {
  const q = queryText(query.q).toLowerCase();
  const active = queryText(query.active);

  return methods
    .filter(method => {
      if (q) {
        const haystack = `${method.name} ${method.description || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (active === 'true' && !method.isActive) return false;
      if (active === 'false' && method.isActive) return false;
      return true;
    })
    .sort(bySortOrder);
}

/**
 * Phí của 1 phương thức với giá trị hàng `subtotal`:
 * `freeFrom > 0 && subtotal ≥ freeFrom` ⇒ 0, ngược lại ⇒ `fee`.
 */
export function computeShippingFee(method: ShippingMethod | undefined, subtotal: number): number {
  if (!method) return 0;
  const freeFrom = money(method.freeFrom);
  const amount = money(subtotal);
  if (freeFrom > 0 && amount >= freeFrom) return 0;
  return money(method.fee);
}

/** Tìm theo id; không thấy (hoặc rỗng) ⇒ phương thức đầu tiên đang bật (an toàn cho form cũ). */
export function resolveShippingMethod(
  methods: ShippingMethod[],
  id?: unknown
): ShippingMethod | undefined {
  const wanted = queryText(id);
  const list = activeShippingMethods(methods);
  if (!wanted) return list[0];
  return list.find(m => m.id === wanted) || list[0];
}

/** Kết quả server dùng cho `POST /orders`: phương thức + phí đã chốt. */
export function resolveShippingFee(
  methods: ShippingMethod[],
  id: unknown,
  subtotal: number
): { method?: ShippingMethod; fee: number } {
  const method = resolveShippingMethod(methods, id);
  return { method, fee: computeShippingFee(method, subtotal) };
}

/** Nhãn ngắn cho UI: `Miễn phí` / `30.000đ` / `Miễn phí từ 1.000.000đ`. */
export function shippingFeeLabel(method: ShippingMethod, subtotal: number): string {
  const fee = computeShippingFee(method, subtotal);
  if (fee === 0) return 'Miễn phí';
  return `${fee.toLocaleString('vi-VN')}đ`;
}
