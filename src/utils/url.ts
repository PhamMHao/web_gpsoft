/**
 * P0.1 — Định tuyến URL thật cho website.
 *
 * Trước P0.1 điều hướng website là state thuần (`AppContext.websitePage`) ⇒ không share được link,
 * Back/Forward hỏng, không thể tạo "Link Báo Giá", SEO ≈ 0. Module này là **nguồn sự thật duy nhất**
 * cho URL: mọi điều hướng đi qua `pathFor()`, mọi trạng thái trang được suy ra từ `parsePath()`.
 *
 * Route map chuẩn (xem ROADMAP.md §P0.1):
 *   /                     home              /tin-tuc/:slug        news detail
 *   /san-pham             products          /gioi-thieu           about
 *   /san-pham/:slug       product-detail    /lien-he              contact
 *   /danh-muc/:slug       category          /trang/:slug          page
 *   /thuong-hieu/:slug    brand             /bao-hanh             warranty
 *   /bang-gia             price-list        /bao-gia/:code        P1.5
 *   /dich-vu              services          /tim-kiem?q=          P2.8 (tìm kiếm)
 *   /login-admin          P2.10 — cửa vào CMS (URL ẩn: không link/menu/sitemap nào trỏ tới, `noindex`)
 *   *                                           P2.8 (404 — mọi URL không khớp route nào)
 *
 * Không cần sửa backend: Vite dev middleware (`server.ts:83`) và production (`server.ts:88`) đều
 * fallback SPA về `index.html`.
 */
import type { WebsitePage } from '../types/index.ts';

/** Đường dẫn đầy đủ của từng route (dạng template với `:param`). */
export const ROUTES = {
  home: '/',
  products: '/san-pham',
  /** P2.1 — trang danh mục riêng (2 cấp) — `WebsitePage 'category'`. */
  category: '/danh-muc/:slug',
  /** P2.1 — trang thương hiệu riêng — `WebsitePage 'brand'`. */
  brand: '/thuong-hieu/:slug',
  services: '/dich-vu',
  priceList: '/bang-gia',
  news: '/tin-tuc',
  about: '/gioi-thieu',
  contact: '/lien-he',
  page: '/trang/:slug',
  /** P1.3 — tra cứu bảo hành (trang công khai cho khách). */
  warranty: '/bao-hanh',
  /** P1.5 — xem báo giá theo mã (Link Báo Giá) */
  quoteDetail: '/bao-gia/:code',
  /** P2.2 — module "Phần mềm chấm công" (4 tab con qua `?tab=`). */
  attendance: '/phan-mem-cham-cong',
  /** P2.3 — trang dịch vụ "Thiết kế website". */
  webDesign: '/thiet-ke-website',
  /** P2.8 — trang kết quả tìm kiếm toàn site: `/tim-kiem?q=<từ khóa>&tab=&page=&sort=`. */
  search: '/tim-kiem',
  /**
   * P2.10 — cửa vào khu quản trị (ẩn). Website **không** còn nút "Quản trị CMS": chỉ khi mở đúng URL
   * này mới hiện form đăng nhập. Route này không nằm trong Navbar/Footer/`sitemap.xml` và luôn bị
   * `Disallow` trong `robots.txt` (`server/robots.ts`) — đừng thêm link công khai trỏ về đây.
   */
  adminLogin: '/login-admin'
} as const;

/** Tiền tố segment đầu tiên, dùng để nhận dạng nhóm route. */
export const PREFIX = {
  products: '/san-pham',
  category: '/danh-muc',
  brand: '/thuong-hieu',
  services: '/dich-vu',
  news: '/tin-tuc',
  page: '/trang',
  /** P2.2 — module phần mềm (chấm công...). */
  software: '/phan-mem',
  /** P2.8 — tìm kiếm toàn site (từ khóa nằm ở `?q=`). */
  search: '/tim-kiem'
} as const;

export interface RouteParams {
  productSlug?: string;
  postSlug?: string;
  serviceSlug?: string;
  pageSlug?: string;
  categorySlug?: string;
  brandSlug?: string;
  /** P1.5 — mã link chia sẻ báo giá (VD `BG7K2M9Q`). */
  quoteCode?: string;
}

export interface ParsedRoute extends RouteParams {
  page: WebsitePage;
  /**
   * `false` khi URL không khớp route nào ⇒ `App.tsx` render `NotFoundPage` (P2.8).
   * Vẫn trả `page: 'home'` để state nội bộ luôn hợp lệ (`WebsitePage` không có nhánh 404).
   */
  matched: boolean;
}

const encodeSegment = (value: string): string => encodeURIComponent(value);

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Sinh URL cho một trang. Dùng thay cho `setWebsitePage()` khi cần gắn param
 * (slug sản phẩm/bài viết/danh mục...).
 */
export function pathFor(page: WebsitePage, params: RouteParams = {}): string {
  switch (page) {
    case 'home':
      return ROUTES.home;
    case 'products':
      return params.categorySlug
        ? `${PREFIX.category}/${encodeSegment(params.categorySlug)}`
        : ROUTES.products;
    case 'category':
      // P2.1 — trang danh mục riêng `/danh-muc/:slug` (thiếu slug ⇒ về danh sách sản phẩm).
      return params.categorySlug
        ? `${PREFIX.category}/${encodeSegment(params.categorySlug)}`
        : ROUTES.products;
    case 'brand':
      // P2.1 — trang thương hiệu riêng `/thuong-hieu/:slug` (thiếu slug ⇒ về danh sách sản phẩm).
      return params.brandSlug
        ? `${PREFIX.brand}/${encodeSegment(params.brandSlug)}`
        : ROUTES.products;
    case 'attendance':
      // P2.2 — module "Phần mềm chấm công" (tab con chọn bằng `?tab=`).
      return ROUTES.attendance;
    case 'web-design':
      // P2.3 — dịch vụ "Thiết kế website".
      return ROUTES.webDesign;
    case 'search':
      // P2.8 — trang tìm kiếm: từ khóa/tab/trang nằm ở query string (`?q=`) do component đọc.
      return ROUTES.search;
    case 'product-detail':
      return params.productSlug
        ? `${PREFIX.products}/${encodeSegment(params.productSlug)}`
        : ROUTES.products;
    case 'services':
      return params.serviceSlug
        ? `${PREFIX.services}/${encodeSegment(params.serviceSlug)}`
        : ROUTES.services;
    case 'news':
      return params.postSlug
        ? `${PREFIX.news}/${encodeSegment(params.postSlug)}`
        : ROUTES.news;
    case 'price-list':
      return ROUTES.priceList;
    case 'about':
      return ROUTES.about;
    case 'contact':
      return ROUTES.contact;
    case 'warranty':
      return ROUTES.warranty;
    case 'quote-detail':
      // P1.5/P1.6 — Link Báo Giá: `/bao-gia/<mã link>` (không có mã ⇒ về trang bảng giá).
      return params.quoteCode
        ? `${ROUTES.quoteDetail.replace(':code', encodeSegment(params.quoteCode))}`
        : ROUTES.priceList;
    case 'page':
      return params.pageSlug ? `${PREFIX.page}/${encodeSegment(params.pageSlug)}` : ROUTES.home;
    case 'admin-login':
      // P2.10 — URL duy nhất để vào CMS (không có tham số nào).
      return ROUTES.adminLogin;
    default:
      return ROUTES.home;
  }
}

/**
 * Phân tích `location.pathname` → trang + param tương ứng.
 * Query string (`?q=...`) được xử lý riêng ở component bằng `useSearchParams`.
 */
export function parsePath(pathname: string): ParsedRoute {
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const segments = cleanPath
    .split('/')
    .map(segment => decodeSegment(segment.trim()))
    .filter(segment => segment.length > 0);

  if (segments.length === 0) {
    return { page: 'home', matched: true };
  }

  const [root, second] = segments;

  switch (root) {
    case 'san-pham':
      return second
        ? { page: 'product-detail', productSlug: second, matched: true }
        : { page: 'products', matched: true };
    case 'danh-muc':
      // P2.1 — `/danh-muc/:slug` là **trang danh mục riêng** (2 cấp); thiếu slug ⇒ danh sách sản phẩm.
      return second
        ? { page: 'category', categorySlug: second, matched: true }
        : { page: 'products', matched: true };
    case 'thuong-hieu':
      // P2.1 — `/thuong-hieu/:slug` là trang thương hiệu riêng; thiếu slug ⇒ danh sách sản phẩm.
      return second
        ? { page: 'brand', brandSlug: second, matched: true }
        : { page: 'products', matched: true };
    case 'phan-mem-cham-cong':
      // P2.2 — module "Phần mềm chấm công" (tab con qua `?tab=`). Bản `/phan-mem/*` → 404.
      return { page: 'attendance', matched: true };
    case 'thiet-ke-website':
      // P2.3 — dịch vụ "Thiết kế website" (bảng giá + quy trình + portfolio + form liên hệ).
      return { page: 'web-design', matched: true };
    case 'tim-kiem':
      // P2.8 — `/tim-kiem?q=...` (từ khóa đọc bằng `useSearchParams`; pathname chỉ có 1 segment).
      return { page: 'search', matched: true };
    case 'dich-vu':
      return second
        ? { page: 'services', serviceSlug: second, matched: true }
        : { page: 'services', matched: true };
    case 'tin-tuc':
      return second
        ? { page: 'news', postSlug: second, matched: true }
        : { page: 'news', matched: true };
    case 'trang':
      return second
        ? { page: 'page', pageSlug: second, matched: true }
        : { page: 'home', matched: false };
    case 'bang-gia':
      return { page: 'price-list', matched: true };
    case 'gioi-thieu':
      return { page: 'about', matched: true };
    case 'lien-he':
      return { page: 'contact', matched: true };
    case 'bao-hanh':
      return { page: 'warranty', matched: true };
    case 'bao-gia':
      // P1.5 — Link Báo Giá: `/bao-gia/:code` (thiếu mã ⇒ trang bảng giá, không phải 404).
      return second
        ? { page: 'quote-detail', quoteCode: second, matched: true }
        : { page: 'price-list', matched: true };
    case 'login-admin':
      // P2.10 — cửa vào CMS. Phải `matched: true` (khác URL rác) để `App` render form đăng nhập thay
      // vì trang 404; AI gõ `/login-admin` cũng thấy y hệt.
      return { page: 'admin-login', matched: true };
    default:
      // P2.8 — URL không khớp route nào ⇒ `matched: false` và `App.tsx` render `NotFoundPage`
      // (trước P2.8 rơi về `home` nên khách tưởng trang vẫn tồn tại — SEO cũng sai vì 200 OK).
      return { page: 'home', matched: false };
  }
}
