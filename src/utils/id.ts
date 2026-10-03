/**
 * P0.3 — Sinh ID dùng chung (client; cũng chạy được ở server vì không phụ thuộc DOM).
 *
 * Trước P0.3 có 3 biến thể inline khác nhau: `toast-${Date.now()}-${Math.random()}`,
 * `v-${Date.now()}` (variant), `red-${Date.now()}` (redirect rule).
 */

/**
 * ID dạng `<prefix>-<timestamp>-<8 ký tự random base36>`, ví dụ `genId('v')` → `v-1758931200000-k3f9a7zq`.
 * Duy nhất trong 1 phiên, sắp xếp được theo thời gian tạo, an toàn cho URL/React key.
 *
 * P0.4 — nâng phần random từ 4 → 8 ký tự (phát hiện khi chạy lặp `npm run test:utils`):
 * 4 ký tự = 36^4 ≈ 1,68 triệu ⇒ sinh 1000 id trong **cùng 1 ms** bị trùng tới ~13% số lần chạy,
 * thực tế 8/60 lần FAIL. 8 ký tự = 36^8 ≈ 2,8 nghìn tỉ ⇒ xác suất trùng ~1,8e-7 — an toàn cho
 * cả id ghi xuống DB (VD id đánh giá sản phẩm ở `server/routes.ts`).
 */

/** Sinh ID mới. `padEnd(8)` để độ dài luôn cố định (tránh trường hợp base36 ngắn bất thường). */
export const genId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;

