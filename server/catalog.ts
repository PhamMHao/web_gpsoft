/* =========================================================================
   P2.1 — DANH MỤC 2 CẤP: LỌC SẢN PHẨM DÙNG CHUNG (hàm thuần)
   =========================================================================
   Trước P2.1 route `GET /products` tự viết chuỗi `if` lọc inline và **khớp danh mục
   theo đúng `categoryId`** ⇒ danh mục cha không bao giờ hiện sản phẩm của danh mục
   con, và không lọc được bằng slug (`/danh-muc/laptop-macbook` ⇒ 0 kết quả).

   Module này gom toàn bộ việc lọc/sắp xếp ra hàm thuần (test bằng node thuần:
   `npm run test:catalog`); `server/routes.ts` chỉ việc:

     res.json(listBody(filterProducts(db.getProducts(), req.query, db.getCategories()), req.query));

   Quy ước:
   - `category`: nhận **id hoặc slug**, tự mở rộng xuống toàn bộ danh mục con/cháu.
   - Danh mục truyền vào nhưng KHÔNG tồn tại ⇒ trả về rỗng (không "quên" bộ lọc).
   - Tham số rác (`?minPrice=abc`, `?featured=1`) ⇒ bỏ qua, KHÔNG ném lỗi/400.
   ========================================================================= */

import type { Brand, Category, Product } from './types.js';

/** Query param thô từ express (`?category=...&sort=...`). */
export interface CatalogQuery {
  category?: unknown;
  brand?: unknown;
  condition?: unknown;
  search?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  featured?: unknown;
  isNew?: unknown;
  sort?: unknown;
}

/** Các kiểu sắp xếp website/CMS đang dùng (giữ nguyên giá trị cũ để không phá call site). */
export const CATALOG_SORTS = ['newest', 'price-asc', 'price-desc', 'views'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** Đọc giá trị string đầu tiên của 1 query param (query lặp ⇒ lấy giá trị đầu như express `qs`). */
export function firstString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  return text.length > 0 ? text : undefined;
}

/** Số hữu hạn ≥ 0 từ query (`''`, `abc`, `-1` ⇒ `undefined` = bỏ qua bộ lọc). */
export function optionalNumber(value: unknown): number | undefined {
  const text = firstString(value);
  if (text === undefined) return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Chuẩn hoá khoá tra cứu: bỏ khoảng trắng + không phân biệt hoa/thường. */
export const catalogKey = (value: string): string => value.trim().toLowerCase();

/** Tìm danh mục theo **id hoặc slug** (không phân biệt hoa/thường). */
export function categoryByIdOrSlug(
  categories: Category[],
  value?: string | null
): Category | undefined {
  const key = value ? catalogKey(value) : '';
  if (!key) return undefined;
  return categories.find(c => catalogKey(c.id) === key || catalogKey(c.slug || '') === key);
}

/** Tìm thương hiệu theo **id hoặc slug** (không phân biệt hoa/thường). */
export function brandByIdOrSlug(brands: Brand[], value?: string | null): Brand | undefined {
  const key = value ? catalogKey(value) : '';
  if (!key) return undefined;
  return brands.find(b => catalogKey(b.id) === key || catalogKey(b.slug || '') === key);
}

/** Danh mục con trực tiếp của 1 danh mục (so khớp cả `id` lẫn `slug` của cha). */
export function childCategories(categories: Category[], parent: Category): Category[] {
  return categories.filter(
    c => c.id !== parent.id && c.parentId && (c.parentId === parent.id || c.parentId === parent.slug)
  );
}

/**
 * `id` của danh mục + **toàn bộ danh mục con/cháu** (đệ quy, chống lặp vòng).
 * - Không truyền danh mục ⇒ `null` (nghĩa là KHÔNG lọc theo danh mục).
 * - Danh mục không tồn tại ⇒ `[]` (nghĩa là 0 sản phẩm — không bỏ qua bộ lọc).
 */
export function categoryScopeIds(categories: Category[], value?: string | null): string[] | null {
  if (!value) return null;
  const root = categoryByIdOrSlug(categories, value);
  if (!root) return [];

  const ids: string[] = [];
  const queue: Category[] = [root];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift() as Category;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    ids.push(current.id);
    queue.push(...childCategories(categories, current));
  }

  return ids;
}

/** Sắp xếp danh sách sản phẩm theo `sort` (giá trị lạ ⇒ mới nhất trước như cũ). */
export function sortProducts(list: Product[], sort?: string): Product[] {
  const sorted = [...list];
  if (sort === 'price-asc') {
    sorted.sort((a, b) => a.salePrice - b.salePrice);
  } else if (sort === 'price-desc') {
    sorted.sort((a, b) => b.salePrice - a.salePrice);
  } else if (sort === 'views') {
    sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  } else {
    sorted.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }
  return sorted;
}

/**
 * Lọc + sắp xếp sản phẩm cho website/CMS. Đây là **bản duy nhất** dùng cho `GET /products`
 * (route không còn tự viết `if`) ⇒ mọi bộ lọc (danh mục 2 cấp · hãng · giá · tình trạng ·
 * từ khoá · nổi bật · mới) luôn nhất quán giữa các trang.
 */
export function filterProducts(
  products: Product[],
  query: CatalogQuery,
  categories: Category[] = [],
  brands: Brand[] = []
): Product[] {
  let list = [...products];

  const categoryValue = firstString(query.category);
  if (categoryValue) {
    // Không có dữ liệu danh mục (ví dụ nơi gọi chỉ truyền sản phẩm) ⇒ khớp thẳng `categoryId`
    // để không phá vỡ hành vi cũ.
    const scope = categories.length === 0 ? null : categoryScopeIds(categories, categoryValue);
    if (scope === null) {
      // Không có dữ liệu danh mục ⇒ lọc theo đúng giá trị client gửi (tương thích ngược).
      const fallback = catalogKey(categoryValue);
      list = list.filter(p => catalogKey(p.categoryId) === fallback);
    } else {
      const allowed = new Set(scope.map(catalogKey));
      list = list.filter(p => allowed.has(catalogKey(p.categoryId)));
    }
  }

  const brandValue = firstString(query.brand);
  if (brandValue) {
    // Ưu tiên quy đổi slug → id (trang `/thuong-hieu/:slug` gửi slug); không tra được thì
    // lọc theo đúng giá trị client gửi (tương thích ngược với `?brand=<id>`).
    const matchedBrand = brandByIdOrSlug(brands, brandValue);
    const key = catalogKey(matchedBrand ? matchedBrand.id : brandValue);
    list = list.filter(p => catalogKey(p.brandId) === key);
  }

  const condition = firstString(query.condition);
  if (condition) {
    list = list.filter(p => p.condition === condition);
  }

  if (firstString(query.featured) === 'true') {
    list = list.filter(p => p.isFeatured);
  }
  if (firstString(query.isNew) === 'true') {
    list = list.filter(p => p.isNew);
  }

  const minPrice = optionalNumber(query.minPrice);
  if (minPrice !== undefined) {
    list = list.filter(p => p.salePrice >= minPrice);
  }
  const maxPrice = optionalNumber(query.maxPrice);
  if (maxPrice !== undefined) {
    list = list.filter(p => p.salePrice <= maxPrice);
  }

  const search = firstString(query.search);
  if (search) {
    const needle = catalogKey(search);
    list = list.filter(
      p =>
        catalogKey(p.name).includes(needle) ||
        catalogKey(p.sku || '').includes(needle) ||
        catalogKey(p.slug || '').includes(needle)
    );
  }

  return sortProducts(list, firstString(query.sort));
}
