/**
 * P2.8 — Tìm kiếm toàn site (`/tim-kiem?q=...`).
 *
 * Trước P2.8 ô tìm kiếm trên Navbar chỉ lọc sản phẩm **trong trang** (`/san-pham?q=`) và không có
 * trang kết quả dùng chung ⇒ khách không tìm được bài viết/dịch vụ, không share được link kết quả,
 * Google cũng không thấy trang kết quả nào. Module này là **hợp đồng URL + logic thuần** cho trang
 * tìm kiếm:
 *
 *   /tim-kiem?q=laptop&tab=san-pham&page=2&sort=price_asc
 *            │        │            │          └─ sắp xếp (chỉ áp cho tab sản phẩm)
 *            │        │            └─ trang kết quả (phân trang phía server cho sản phẩm/bài viết)
 *            │        └─ tab: '' (tất cả) | 'san-pham' | 'bai-viet' | 'dich-vu'
 *            └─ từ khóa đã chuẩn hoá (`normalizeKeyword` gộp khoảng trắng, cắt 80 ký tự)
 *
 * Quy ước:
 * - Tham số rác (`?tab=xyz`, `?page=abc`, `?page=-1`) **chuẩn hoá về mặc định** ⇒ không sinh URL rác.
 * - Từ khóa < `SEARCH_MIN_LENGTH` ký tự ⇒ coi như chưa tìm (hiện gợi ý) vì API `/products?search=`
 *   yêu cầu từ 2 ký tự (xem `server/catalog.ts`).
 * - Sản phẩm trả về từ API đã có `?search=` của server (khớp cả tên/SKU/`shortDesc`); bài viết và
 *   dịch vụ **chưa có API tìm riêng** ⇒ lọc phía client bằng `matchPost()`/`matchService()` (thuần,
 *   test được trong `tests/search.smoke.ts`).
 * - `highlightSegments()` tô đậm từ khóa cho tiêu đề bài viết/dịch vụ (sản phẩm dùng `ProductCard`).
 */
import { CATALOG_SORT_OPTIONS } from './catalog.ts';
import { plainText } from './seo.ts';
import { ROUTES } from './url.ts';
import type { Post, Product, Service } from '../types/index.ts';

/** Từ khóa ngắn hơn mức này coi như "chưa tìm" — khớp yêu cầu `?search=` (≥ 2 ký tự) của server. */
export const SEARCH_MIN_LENGTH = 2;
/** Số kết quả mỗi trang ở trang tìm kiếm (chia hết cho lưới 3 cột). */
export const SEARCH_PAGE_SIZE = 12;
/** Số kết quả mỗi nhóm khi ở tab "Tất cả" (mỗi nhóm kèm link xem tiếp theo tab riêng). */
export const SEARCH_GROUP_SIZE = 6;
/** Độ dài tối đa của từ khóa giữ trên URL (chống URL rác dài vô hạn). */
export const SEARCH_MAX_LENGTH = 80;
/** Chặn số trang tối đa đọc từ URL (chống `?page=999999`). */
export const SEARCH_MAX_PAGE = 200;

/** 4 tab của trang tìm kiếm. `param` = giá trị trên URL (tab "Tất cả" dùng URL sạch). */
export type SearchTabId = 'all' | 'product' | 'post' | 'service';

export const SEARCH_TABS: Array<{ id: SearchTabId; label: string; param: string }> = [
  { id: 'all', label: 'Tất cả', param: '' },
  { id: 'product', label: 'Sản phẩm', param: 'san-pham' },
  { id: 'post', label: 'Bài viết', param: 'bai-viet' },
  { id: 'service', label: 'Dịch vụ', param: 'dich-vu' }
];

/** Gợi ý từ khóa hiển thị khi chưa nhập gì (trang tìm kiếm + trang 404). */
export const SEARCH_SUGGESTIONS: string[] = [
  'laptop',
  'macbook',
  'iphone',
  'màn hình',
  'phụ kiện',
  'bảo hành'
];

/** Chuẩn hoá từ khóa: gộp khoảng trắng, bỏ khoảng trắng đầu/cuối, cắt về `SEARCH_MAX_LENGTH`. */
export function normalizeKeyword(raw?: string | null): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}

/** Khóa so khớp không phân biệt hoa/thường (giữ nguyên dấu tiếng Việt như các util khác). */
export const searchKey = (value?: string | null): string => normalizeKeyword(value).toLowerCase();

/** `true` khi từ khóa đủ dài để thực sự tìm (≥ `SEARCH_MIN_LENGTH` ký tự). */
export const isSearchableKeyword = (keyword?: string | null): boolean =>
  normalizeKeyword(keyword).length >= SEARCH_MIN_LENGTH;

/** Tab đọc từ URL — giá trị lạ ⇒ tab "Tất cả". */
export function parseSearchTab(value?: string | null): SearchTabId {
  const raw = searchKey(value);
  return SEARCH_TABS.find(tab => tab.param === raw)?.id ?? 'all';
}

/** Giá trị URL của tab (`''` cho tab "Tất cả"). */
export const searchTabParam = (tab?: SearchTabId | null): string =>
  SEARCH_TABS.find(item => item.id === tab)?.param ?? '';

/** Kiểu sắp xếp đọc từ URL — giá trị lạ ⇒ `newest` (mặc định của `GET /products`). */
export function parseSearchSort(value?: string | null): string {
  const raw = searchKey(value);
  return CATALOG_SORT_OPTIONS.some(option => option.id === raw) ? raw : 'newest';
}

/** Chỉ trả về `?sort=` khi khác mặc định ⇒ URL kết quả sạch. */
export const searchSortParam = (sort?: string | null): string => {
  const id = parseSearchSort(sort);
  return id === 'newest' ? '' : id;
};

/** Số trang đọc từ URL — luôn ≥ 1 và ≤ `SEARCH_MAX_PAGE` (tham số rác ⇒ 1). */
export function parseSearchPage(value?: string | number | null): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 2) return 1;
  return Math.min(parsed, SEARCH_MAX_PAGE);
}

export interface SearchQueryParams {
  tab?: SearchTabId | null;
  page?: number | null;
  sort?: string | null;
}

/**
 * URL của trang tìm kiếm (`/tim-kiem?q=...`).
 * Bỏ hẳn tham số mặc định (`tab=all`, `page=1`, `sort=newest`) để mỗi kết quả chỉ có 1 URL duy
 * nhất — tránh nội dung trùng lặp khi Google crawl.
 */
export function searchPath(keyword?: string | null, params: SearchQueryParams = {}): string {
  const clean = normalizeKeyword(keyword);
  const query = new URLSearchParams();
  if (clean) query.set('q', clean);

  const tabParam = searchTabParam(params.tab ?? 'all');
  if (tabParam) query.set('tab', tabParam);

  // Sắp xếp chỉ áp cho sản phẩm (tab "Tất cả" hoặc tab sản phẩm).
  const sortParam = searchSortParam(params.sort);
  if (sortParam && (tabParam === '' || tabParam === 'san-pham')) query.set('sort', sortParam);

  const page = parseSearchPage(params.page);
  if (page > 1) query.set('page', String(page));

  const qs = query.toString();
  return qs ? `${ROUTES.search}?${qs}` : ROUTES.search;
}

/** URL của một tab kết quả (dùng cho chip tab + link "xem tất cả" của từng nhóm). */
export const searchTabPath = (keyword?: string | null, tab?: SearchTabId | null): string =>
  searchPath(keyword, { tab });

/** `true` khi chuỗi `haystack` chứa từ khóa (không phân biệt hoa/thường, giữ dấu tiếng Việt). */
const containsKeyword = (haystack: unknown, key: string): boolean =>
  String(haystack ?? '').toLowerCase().includes(key);

/** Gộp mọi trường văn bản có thể tìm của sản phẩm (dùng cho lọc offline & test). */
export const productSearchText = (product?: Product | null): string[] =>
  product ? [product.name, product.sku, product.slug, product.shortDesc, plainText(product.description)] : [];

/** Khớp sản phẩm theo tên/SKU/slug/mô tả — phản chiếu `GET /products?search=` của server. */
export function matchProduct(product?: Product | null, keyword?: string | null): boolean {
  const key = searchKey(keyword);
  if (!product || !key) return false;
  return productSearchText(product).some(field => containsKeyword(field, key));
}

/** Khớp bài viết: tiêu đề, mô tả, danh mục, slug, tác giả, tag và nội dung (đã bỏ HTML). */
export function matchPost(post?: Post | null, keyword?: string | null): boolean {
  const key = searchKey(keyword);
  if (!post || !key) return false;
  return [
    post.title,
    post.excerpt,
    post.category,
    post.slug,
    post.author,
    ...(post.tags ?? []),
    plainText(post.content)
  ].some(field => containsKeyword(field, key));
}

/** Khớp dịch vụ: tiêu đề, mô tả ngắn, nội dung, slug, khoảng giá. */
export function matchService(service?: Service | null, keyword?: string | null): boolean {
  const key = searchKey(keyword);
  if (!service || !key) return false;
  return [
    service.title,
    service.shortDesc,
    service.slug,
    service.priceRange,
    service.priceEstimate,
    plainText(service.content)
  ].some(field => containsKeyword(field, key));
}

export interface HighlightSegment {
  text: string;
  /** `true` = đoạn khớp từ khóa ⇒ component bọc `<mark>`. */
  match: boolean;
}

/**
 * Cắt chuỗi thành các đoạn khớp/không khớp từ khóa để tô đậm trên UI
 * (sản phẩm đã có `ProductCard`, chỉ bài viết/dịch vụ cần tô tay).
 */
export function highlightSegments(text?: string | null, keyword?: string | null): HighlightSegment[] {
  const source = String(text ?? '');
  const key = searchKey(keyword);
  if (!source) return [];
  if (!key) return [{ text: source, match: false }];

  const haystack = source.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const found = haystack.indexOf(key, cursor);
    if (found === -1) {
      segments.push({ text: source.slice(cursor), match: false });
      break;
    }
    if (found > cursor) segments.push({ text: source.slice(cursor, found), match: false });
    segments.push({ text: source.slice(found, found + key.length), match: true });
    cursor = found + key.length;
  }

  return segments.filter(segment => segment.text.length > 0);
}

export interface LocalPage<T> {
  items: T[];
  /** Tổng số bản ghi (trước khi cắt trang). */
  total: number;
  totalPages: number;
  /** Trang đã chuẩn hoá (nằm trong `1..totalPages`). */
  page: number;
}

/**
 * Phân trang phía client cho bài viết/dịch vụ (các API này **chưa có** tìm kiếm + phân trang theo
 * từ khóa như `/products`) ⇒ lọc trước rồi cắt trang. Trang vượt tổng số trang được kéo về trang
 * cuối thay vì trả mảng rỗng (không hiện "0 kết quả" sai).
 */
export function paginateLocal<T>(list: T[], page = 1, pageSize = SEARCH_PAGE_SIZE): LocalPage<T> {
  const safeList = Array.isArray(list) ? list : [];
  const size = Math.max(1, Math.floor(pageSize) || SEARCH_PAGE_SIZE);
  const total = safeList.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: safeList.slice(start, start + size),
    total,
    totalPages,
    page: safePage
  };
}



