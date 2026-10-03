/**
 * P2.1 — Tiện ích danh mục 2 cấp dùng chung cho website (hàm thuần).
 *
 * `Category.parentId` đã có trong DB từ lâu nhưng **chưa nơi nào dựng cây**: Navbar chỉ liệt kê
 * danh mục phẳng, `ProductsPage` cũng vậy ⇒ không thể "click danh mục cha → hiện danh mục con".
 * Module này là bản duy nhất dựng cây + sinh query lọc, dùng cho:
 *   `Navbar` (mega menu) · `ProductsPage` (sidebar accordion) · `CategoryPage` · `BrandPage`.
 *
 * Test: `npm run test:catalog` (node thuần, không cần backend).
 */
import type { Brand, Category } from '../types/index.ts';

/** Danh mục kèm danh mục con trực tiếp (đã sắp xếp theo `sortOrder` rồi tới tên). */
export interface CategoryNode extends Category {
  children: Category[];
}

/** So khớp khoá danh mục: bỏ khoảng trắng + không phân biệt hoa/thường. */
export const catalogKey = (value?: string | null): string => (value || '').trim().toLowerCase();

/** Danh mục đang bật (mặc định ẩn danh mục `isActive === false`). */
export function activeCategories(categories: Category[]): Category[] {
  return categories.filter(c => c.isActive !== false);
}

/** Thứ tự hiển thị chuẩn: `sortOrder` tăng dần, cùng thứ tự thì theo tên A→Z. */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'vi')
  );
}

/** Tìm danh mục theo **id hoặc slug**. */
export function findCategory(categories: Category[], value?: string | null): Category | undefined {
  const key = catalogKey(value);
  if (!key) return undefined;
  return categories.find(c => catalogKey(c.id) === key || catalogKey(c.slug) === key);
}

/** Danh mục con trực tiếp của 1 danh mục (nhận cả `id` lẫn `slug` của cha). */
export function findChildren(categories: Category[], parent: Category): Category[] {
  return sortCategories(
    categories.filter(
      c =>
        c.id !== parent.id &&
        Boolean(c.parentId) &&
        (c.parentId === parent.id || c.parentId === parent.slug)
    )
  );
}

/** Danh mục gốc (không có `parentId`, hoặc `parentId` trỏ tới danh mục không tồn tại). */
export function topLevelCategories(categories: Category[]): Category[] {
  return sortCategories(
    categories.filter(c => !c.parentId || !findCategory(categories, c.parentId))
  );
}

/** Cây 2 cấp đầy đủ: danh mục gốc + danh mục con (dùng cho mega menu & sidebar). */
export function buildCategoryTree(
  categories: Category[],
  options: { includeInactive?: boolean } = {}
): CategoryNode[] {
  const source = options.includeInactive ? categories : activeCategories(categories);
  return topLevelCategories(source).map(category => ({
    ...category,
    children: findChildren(source, category)
  }));
}

/** Toàn bộ `id` của danh mục + con/cháu (chống lặp vòng). */
export function categoryDescendantIds(categories: Category[], value?: string | null): string[] {
  const root = findCategory(categories, value);
  if (!root) return [];
  const ids: string[] = [];
  const queue: Category[] = [root];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift() as Category;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    ids.push(current.id);
    queue.push(...findChildren(categories, current));
  }
  return ids;
}

/** Khoảng giá dùng chung cho sidebar `ProductsPage` + filter `CategoryPage`/`BrandPage`. */
export interface PriceRange {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_RANGES: PriceRange[] = [
  { id: 'all', label: 'Tất cả mức giá' },
  { id: 'under_5m', label: 'Dưới 5 triệu', max: 5_000_000 },
  { id: '5m_15m', label: 'Từ 5 - 15 triệu', min: 5_000_000, max: 15_000_000 },
  { id: '15m_30m', label: 'Từ 15 - 30 triệu', min: 15_000_000, max: 30_000_000 },
  { id: 'above_30m', label: 'Trên 30 triệu', min: 30_000_000 }
];

/** Khoảng giá theo id (`'all'` hoặc id lạ ⇒ khoảng "tất cả", không lọc). */
export function priceRangeById(id?: string | null): PriceRange {
  return PRICE_RANGES.find(range => range.id === id) || PRICE_RANGES[0];
}

/** Tình trạng sản phẩm dùng chung cho mọi bộ lọc (nhãn hiển thị tiếng Việt). */
export const CONDITION_FILTERS = [
  { id: '', label: 'Tất cả tình trạng' },
  { id: 'new', label: 'Mới 100% Nguyên Seal' },
  { id: 'like_new', label: 'Like New 99% Siêu Lướt' },
  { id: 'used', label: 'Đã qua sử dụng 98%' }
] as const;

/** Kiểu sắp xếp dùng chung (`value` = tham số `?sort=` gửi lên API). */
export const CATALOG_SORT_OPTIONS = [
  { id: 'newest', label: 'Mới nhất', value: 'newest' },
  { id: 'price_asc', label: 'Giá: Thấp đến Cao', value: 'price-asc' },
  { id: 'price_desc', label: 'Giá: Cao đến Thấp', value: 'price-desc' },
  { id: 'views', label: 'Xem nhiều nhất', value: 'views' }
] as const;

/** Tham số lọc đã chuẩn hoá của 1 trang danh sách sản phẩm. */
export interface CatalogFilterInput {
  /** id hoặc slug danh mục. */
  category?: string | null;
  /** id hoặc slug thương hiệu. */
  brand?: string | null;
  condition?: string | null;
  priceRange?: string | null;
  sort?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

/** Query gửi lên `GET /products` (bỏ hẳn tham số rỗng để URL/`meta` sạch). */
export function buildProductQuery(
  input: CatalogFilterInput = {}
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (input.category) query.category = input.category;
  if (input.brand) query.brand = input.brand;
  if (input.condition) query.condition = input.condition;

  const range = priceRangeById(input.priceRange);
  if (range.min !== undefined) query.minPrice = range.min;
  if (range.max !== undefined) query.maxPrice = range.max;

  const sort = CATALOG_SORT_OPTIONS.find(option => option.id === input.sort);
  if (sort && sort.value !== 'newest') query.sort = sort.value;

  const search = (input.search || '').trim();
  if (search) query.search = search;
  if (input.page && input.page > 1) query.page = Math.floor(input.page);
  if (input.limit && input.limit > 0) query.limit = Math.floor(input.limit);

  return query;
}

/** Khoảng bản ghi đang hiển thị (`1–20 / 63`) để in dưới lưới sản phẩm. */
export function paginationRange(meta?: { page: number; limit: number; total: number }): {
  from: number;
  to: number;
} {
  if (!meta || meta.total === 0) return { from: 0, to: 0 };
  const from = (meta.page - 1) * meta.limit + 1;
  return { from, to: Math.min(from + meta.limit - 1, meta.total) };
}

/** Danh sách số trang cần vẽ (`meta.totalPages` trang, có dấu `-1` = rút gọn `...`). */
export function paginationItems(totalPages: number, current: number, span = 2): number[] {
  const pages = Math.max(1, Math.floor(totalPages) || 1);
  const active = Math.min(Math.max(1, Math.floor(current) || 1), pages);
  if (pages <= span * 2 + 3) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }
  const items: number[] = [1];
  const start = Math.max(2, active - span);
  const end = Math.min(pages - 1, active + span);
  if (start > 2) items.push(-1);
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < pages - 1) items.push(-1);
  items.push(pages);
  return items;
}

/** Đường dẫn cha → con của 1 danh mục (breadcrumb + tiêu đề trang danh mục). */
export function categoryChain(categories: Category[], value?: string | null): Category[] {
  const start = findCategory(categories, value);
  if (!start) return [];
  const chain: Category[] = [start];
  let current = start;
  const seen = new Set<string>([start.id]);
  while (current.parentId) {
    const parent = findCategory(categories, current.parentId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Danh mục cha trực tiếp (`undefined` khi là danh mục gốc hoặc không tìm thấy). */
export function categoryParent(categories: Category[], value?: string | null): Category | undefined {
  const current = findCategory(categories, value);
  if (!current || !current.parentId) return undefined;
  return findCategory(categories, current.parentId);
}

/**
 * Danh mục anh/em cùng cấp — dùng cho dải chip ở trang danh mục con
 * ("Laptop Gaming · Laptop Văn phòng - Đồ họa") để nhảy ngang giữa các danh mục 2 cấp.
 */
export function siblingCategories(categories: Category[], value?: string | null): Category[] {
  const current = findCategory(categories, value);
  if (!current) return [];
  const parent = categoryParent(categories, value);
  const source = parent ? findChildren(categories, parent) : topLevelCategories(categories);
  return source.filter(category => category.id !== current.id);
}

/* ------------------------------------------------------------------ P2.1: thương hiệu */

/** Thương hiệu đang bật (mặc định ẩn thương hiệu `isActive === false`). */
export function activeBrands(brands: Brand[]): Brand[] {
  return brands.filter(brand => brand.isActive !== false);
}

/** Thứ tự hiển thị thương hiệu: tên A→Z theo tiếng Việt. */
export function sortBrands(brands: Brand[]): Brand[] {
  return [...brands].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/** Tìm thương hiệu theo **id hoặc slug** (slug trùng tên ⇒ vẫn khớp đúng 1 kết quả). */
export function findBrand(brands: Brand[], value?: string | null): Brand | undefined {
  const key = catalogKey(value);
  if (!key) return undefined;
  return brands.find(brand => catalogKey(brand.id) === key || catalogKey(brand.slug) === key);
}

/* ------------------------------------------------------------------ P2.1: URL bộ lọc */

/**
 * Giữ nguyên đường dẫn hiện tại và **thay toàn bộ** query string bằng bộ lọc truyền vào ⇒ mỗi tổ
 * hợp lọc là một URL thật: F5 / Back-Forward / copy link chia sẻ đều giữ đúng bộ lọc, và mỗi chip
 * lọc render thành `<a href>` crawl được (SEO).
 *
 * Quy ước dọn URL: bỏ tham số rỗng/`null`/`undefined` và bỏ `page <= 1` (trang 1 là mặc định).
 */
export function catalogHref(
  path: string,
  params: Record<string, string | number | null | undefined> = {}
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (key === 'page' && Number(value) <= 1) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Bật/tắt một chip lọc: giá trị đang chọn ⇒ trả `''` (bỏ lọc khi truyền vào `catalogHref`),
 * chưa chọn ⇒ trả giá trị mới.
 */
export function filterToggleValue(current: string | null | undefined, value: string): string {
  return catalogKey(current) === catalogKey(value) ? '' : value;
}

