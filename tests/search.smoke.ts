/**
 * P2.8 — Smoke test tìm kiếm toàn site (`/tim-kiem?q=...`).
 *
 * Chạy: `npm run test:search`
 *
 * Vì sao cần: P2.8 đổi chỗ tìm kiếm cũ (`/san-pham?q=`, chỉ lọc sản phẩm **trong trang**) thành một
 * trang kết quả **dùng chung** cho sản phẩm + bài viết + dịch vụ. Trang đó nhận toàn bộ trạng thái từ
 * URL (`?q=&tab=&sort=&page=`) nên có 2 rủi ro chỉ test logic thuần mới bắt được:
 * 1. **Tham số rác sinh URL rác** (`?tab=xyz`, `?page=-1`, `?sort=abc`) ⇒ Google index vô số biến thể
 *    trùng nội dung. `parseSearch*()` phải chuẩn hoá về mặc định và `searchPath()` phải **bỏ** tham số
 *    mặc định ⇒ mỗi kết quả chỉ có 1 URL duy nhất (share link/Back/Forward đều đúng).
 * 2. **Breadcrumb lệch JSON-LD**: dải hiển thị và `BreadcrumbList` phải sinh từ cùng một mảng `Crumb[]`
 *    (xem `src/utils/breadcrumb.ts`) ⇒ test chốt luôn phần này.
 *
 * Phần render thật (SearchPage/NotFoundPage/Breadcrumb/Navbar) ở `tests/searchUi.smoke.tsx`.
 */
import {
  SEARCH_GROUP_SIZE,
  SEARCH_MAX_LENGTH,
  SEARCH_MAX_PAGE,
  SEARCH_MIN_LENGTH,
  SEARCH_PAGE_SIZE,
  SEARCH_SUGGESTIONS,
  SEARCH_TABS,
  highlightSegments,
  isSearchableKeyword,
  matchPost,
  matchProduct,
  matchService,
  normalizeKeyword,
  paginateLocal,
  parseSearchPage,
  parseSearchSort,
  parseSearchTab,
  searchPath,
  searchSortParam,
  searchTabParam,
  searchTabPath
} from '../src/utils/search.ts';
import {
  ABOUT_CRUMB,
  CONTACT_CRUMB,
  HOME_CRUMB,
  NEWS_CRUMB,
  PRICE_LIST_CRUMB,
  PRODUCTS_CRUMB,
  SERVICES_CRUMB,
  WARRANTY_CRUMB,
  crumbJsonLd,
  crumbLabel,
  crumbTrail,
  missingCrumb,
  pendingCrumb,
  visibleCrumbs
} from '../src/utils/breadcrumb.ts';
import { DEFAULT_SITE_URL } from '../src/utils/seo.ts';
import { ROUTES } from '../src/utils/url.ts';
import type { Post, Product, Service } from '../src/types/index.ts';

let failed = 0;
let passed = 0;

const check = <T>(label: string, actual: T, expected: T) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${ok ? '' : `  (mong đợi ${JSON.stringify(expected)})`}`
  );
};

/* ───────────────────────────── 1. Dữ liệu mẫu ───────────────────────────── */
const product: Product = {
  id: 'p1',
  name: 'MacBook Air M3 16GB/512GB',
  slug: 'macbook-air-m3',
  sku: 'TP-MBA-M3',
  categoryId: 'laptop',
  brandId: 'apple',
  originalPrice: 32000000,
  salePrice: 28000000,
  condition: 'new',
  stock: 5,
  shortDesc: 'Laptop mỏng nhẹ cho dân văn phòng.',
  description: '<p>Chi tiết sản phẩm</p>',
  specs: { CPU: 'M3' },
  attributes: [],
  variants: [],
  thumbnail: '/uploads/mba.jpg',
  gallery: ['/uploads/mba-2.jpg'],
  isFeatured: true,
  isNew: true,
  status: 'active',
  seo: { metaTitle: 'MacBook Air M3 chính hãng', metaDesc: 'Giá tốt.', metaKeywords: 'macbook' },
  viewCount: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z'
};

const post: Post = {
  id: 'n1',
  title: 'Top 5 laptop đáng mua 2026',
  slug: 'top-5-laptop-2026',
  category: 'Tư vấn',
  excerpt: 'Danh sách laptop đáng mua nhất.',
  content: '<p>Nội dung rất dài</p>',
  thumbnail: '/uploads/post.jpg',
  author: 'Nguyễn Quốc Bảo',
  tags: ['laptop', 'tư vấn'],
  isFeatured: true,
  viewCount: 3,
  seo: { metaTitle: '', metaDesc: 'Gợi ý laptop đáng mua nhất 2026.' },
  status: 'published',
  publishedAt: '2026-03-01T02:00:00Z',
  createdAt: '2026-03-01T01:00:00Z'
};

const service: Service = {
  id: 's1',
  title: 'Sửa chữa laptop',
  slug: 'sua-chua-laptop',
  shortDesc: 'Sửa chữa laptop lấy ngay.',
  content: '<p>Quy trình sửa chữa</p>',
  icon: 'Wrench',
  thumbnail: '/uploads/service.jpg',
  priceRange: '200.000 – 2.000.000đ'
};

/* ───────────────────── 2. Chuẩn hoá từ khóa (hợp đồng với `?search=` của server) ───────────────────── */
check('ROUTES.search là /tim-kiem', ROUTES.search, '/tim-kiem');
check('SEARCH_MIN_LENGTH khớp yêu cầu `?search=` của server', SEARCH_MIN_LENGTH, 2);

check('normalizeKeyword gộp khoảng trắng + trim', normalizeKeyword('  macbook   air  '), 'macbook air');
check('normalizeKeyword(null) ⇒ chuỗi rỗng', normalizeKeyword(null), '');
check(
  `normalizeKeyword cắt về ${SEARCH_MAX_LENGTH} ký tự`,
  normalizeKeyword('a'.repeat(200)).length,
  SEARCH_MAX_LENGTH
);

check('isSearchableKeyword("") = false', isSearchableKeyword(''), false);
check('isSearchableKeyword(" ") = false', isSearchableKeyword(' '), false);
check('isSearchableKeyword("a") = false (dưới 2 ký tự)', isSearchableKeyword('a'), false);
check('isSearchableKeyword(" ab ") = true (đã trim)', isSearchableKeyword(' ab '), true);
check('isSearchableKeyword(null) = false', isSearchableKeyword(null), false);

/* ───────────────────────── 3. Tab / sắp xếp / số trang đọc từ URL ───────────────────────── */
check('tab: "san-pham" ⇒ product', parseSearchTab('san-pham'), 'product');
check('tab: "bai-viet" ⇒ post', parseSearchTab('bai-viet'), 'post');
check('tab: "dich-vu" ⇒ service', parseSearchTab('dich-vu'), 'service');
check('tab: rỗng ⇒ all', parseSearchTab(''), 'all');
check('tab: undefined ⇒ all', parseSearchTab(undefined), 'all');
check('tab rác "xyz" ⇒ all (không sinh URL rác)', parseSearchTab('xyz'), 'all');
check('searchTabParam(all) = "" (URL sạch)', searchTabParam('all'), '');
check('searchTabParam(product)', searchTabParam('product'), 'san-pham');

check('sort rác ⇒ newest', parseSearchSort('khong-co-that'), 'newest');
check('sort mặc định không lên URL', searchSortParam('newest'), '');

check('page: "abc" ⇒ 1', parseSearchPage('abc'), 1);
check('page: "0" ⇒ 1', parseSearchPage('0'), 1);
check('page: "-3" ⇒ 1', parseSearchPage('-3'), 1);
check('page: "3" ⇒ 3', parseSearchPage('3'), 3);
check(`page: "999999" bị chặn ở ${SEARCH_MAX_PAGE}`, parseSearchPage('999999'), SEARCH_MAX_PAGE);

/* ───────────────────────── 4. `searchPath()` — một kết quả = một URL ───────────────────────── */
check('không có từ khóa ⇒ URL trần (trang tìm kiếm)', searchPath(), ROUTES.search);
check('từ khóa chỉ toàn khoảng trắng ⇒ URL trần', searchPath('   '), ROUTES.search);
check('chỉ từ khóa', searchPath('laptop'), '/tim-kiem?q=laptop');
check('từ khóa được chuẩn hoá trước khi lên URL', searchPath('  MacBook Air  '), '/tim-kiem?q=MacBook+Air');
check('tab bài viết', searchPath('laptop', { tab: 'post' }), '/tim-kiem?q=laptop&tab=bai-viet');
check('tab dịch vụ', searchPath('laptop', { tab: 'service' }), '/tim-kiem?q=laptop&tab=dich-vu');
check(
  'tab sản phẩm + sắp xếp',
  searchPath('laptop', { tab: 'product', sort: 'price_asc' }),
  '/tim-kiem?q=laptop&tab=san-pham&sort=price_asc'
);
check(
  'sắp xếp bị bỏ khi tab không phải sản phẩm',
  searchPath('laptop', { tab: 'post', sort: 'price_asc' }),
  '/tim-kiem?q=laptop&tab=bai-viet'
);
check('tab all không lên URL (mặc định)', searchPath('laptop', { tab: 'all' }), '/tim-kiem?q=laptop');
check('trang 1 không lên URL (mặc định)', searchPath('laptop', { page: 1 }), '/tim-kiem?q=laptop');
check('trang 2 lên URL', searchPath('laptop', { page: 2 }), '/tim-kiem?q=laptop&page=2');
check(
  'tham số rác bị chuẩn hoá, không sinh URL rác',
  searchPath('laptop', { page: -5, sort: 'abc' }),
  '/tim-kiem?q=laptop'
);
check('tab rác bị chuẩn hoá về mặc định', searchPath('laptop', { tab: 'xyz' as never }), '/tim-kiem?q=laptop');
check('searchTabPath = searchPath theo tab', searchTabPath('laptop', 'product'), '/tim-kiem?q=laptop&tab=san-pham');

// Từ khóa tiếng Việt: URL phải encode khi sinh và giải mã lại y nguyên (link share/Back/Forward đúng).
for (const keyword of ['màn hình', 'sửa chữa laptop', 'phụ kiện gaming']) {
  const path = searchPath(keyword);
  const decoded = new URLSearchParams(path.split('?')[1]).get('q');
  check(`round-trip từ khóa "${keyword}"`, [path.startsWith(`${ROUTES.search}?`), decoded], [true, keyword]);
}


/* ───────── 5. Lọc bài viết/dịch vụ phía client (API 2 loại này chưa có `?search=`) ───────── */
check('matchProduct: khớp theo tên', matchProduct(product, 'macbook'), true);
check('matchProduct: khớp theo SKU (không phân biệt hoa/thường)', matchProduct(product, 'tp-mba'), true);
check('matchProduct: khớp trong mô tả HTML', matchProduct(product, 'văn phòng'), true);
check('matchProduct: không khớp ⇒ false', matchProduct(product, 'iphone'), false);
check('matchProduct: thiếu từ khóa ⇒ false', matchProduct(product, ''), false);
check('matchProduct: không có sản phẩm ⇒ false', matchProduct(null, 'macbook'), false);

check('matchPost: khớp tiêu đề', matchPost(post, 'laptop'), true);
check('matchPost: khớp tag', matchPost(post, 'tư vấn'), true);
check('matchPost: khớp nội dung đã bỏ HTML', matchPost(post, 'nội dung rất dài'), true);
check('matchPost: không khớp ⇒ false', matchPost(post, 'màn hình'), false);

check('matchService: khớp tiêu đề', matchService(service, 'sửa chữa'), true);
check('matchService: khớp khoảng giá', matchService(service, '2.000.000'), true);
check('matchService: không khớp ⇒ false', matchService(service, 'laptop gaming'), false);

/* ───────────────────────── 6. Tô đậm từ khóa trên kết quả ───────────────────────── */
check('highlightSegments: rỗng ⇒ []', highlightSegments('', 'laptop'), []);
check('highlightSegments: không có từ khóa ⇒ 1 đoạn không khớp', highlightSegments('Laptop cũ', ''), [
  { text: 'Laptop cũ', match: false }
]);
check('highlightSegments: tách đoạn khớp/không khớp', highlightSegments('Laptop cũ giá tốt', 'cũ'), [
  { text: 'Laptop ', match: false },
  { text: 'cũ', match: true },
  { text: ' giá tốt', match: false }
]);
check('highlightSegments: khớp nhiều lần (giữ nguyên nguồn, không phân biệt hoa/thường)', highlightSegments('LAPTOP và laptop', 'laptop'), [
  { text: 'LAPTOP', match: true },
  { text: ' và ', match: false },
  { text: 'laptop', match: true }
]);

/* ───────────────────────── 7. Phân trang phía client ───────────────────────── */
const twelve = Array.from({ length: 12 }, (_, index) => `item-${index + 1}`);
const firstPage = paginateLocal(twelve, 1, 6);
check('paginateLocal: cắt đúng trang đầu', firstPage.items, twelve.slice(0, 6));
check('paginateLocal: tổng bản ghi', firstPage.total, 12);
check('paginateLocal: tổng số trang', firstPage.totalPages, 2);
check('paginateLocal: trang vượt tổng ⇒ kéo về trang cuối', paginateLocal(twelve, 99, 6).page, 2);
check('paginateLocal: danh sách rỗng vẫn có 1 trang', [paginateLocal([], 1).total, paginateLocal([], 1).totalPages], [0, 1]);
check('SEARCH_PAGE_SIZE chia hết cho lưới 3 cột', [SEARCH_PAGE_SIZE % 3, SEARCH_GROUP_SIZE % 3], [0, 0]);

/* ───────────── 8. Tab + gợi ý từ khóa (dùng chung SearchPage & NotFoundPage) ───────────── */
check('SEARCH_TABS có 4 tab', SEARCH_TABS.length, 4);
check('SEARCH_TABS: tab "Tất cả" dùng URL sạch', SEARCH_TABS[0].param, '');
check(
  'SEARCH_TABS: mọi tab round-trip qua URL',
  SEARCH_TABS.map(tab => [tab.param, parseSearchTab(tab.param), searchTabParam(tab.id)]),
  SEARCH_TABS.map(tab => [tab.param, tab.id, tab.param])
);
check('SEARCH_SUGGESTIONS không rỗng', SEARCH_SUGGESTIONS.length > 0, true);
check(
  'mọi gợi ý đều đủ dài để bấm là tìm được',
  SEARCH_SUGGESTIONS.filter(suggestion => !isSearchableKeyword(suggestion)),
  []
);

/* ───────────────── 9. Breadcrumb dùng chung: UI ⇄ JSON-LD không thể lệch ───────────────── */
check('crumbTrail luôn bắt đầu bằng "Trang chủ"', crumbTrail(PRODUCTS_CRUMB)[0], HOME_CRUMB);
check('crumbTrail bỏ mắt rỗng (null/false)', crumbTrail(null, PRODUCTS_CRUMB, false).length, 2);
check('crumbTrail giữ thứ tự gốc → trang hiện tại', crumbTrail(PRODUCTS_CRUMB, NEWS_CRUMB).map(crumb => crumb.name), [
  'Trang chủ',
  'Sản phẩm',
  'Tin tức'
]);

const listCrumbs = crumbTrail(PRODUCTS_CRUMB, pendingCrumb('/san-pham/abc', 'MacBook Air M3'));
check('crumbLabel cắt nhãn dài cho vừa layout', crumbLabel('a'.repeat(100)).length <= 48, true);
check('crumbLabel rỗng ⇒ nhãn "đang tải"', crumbLabel(''), 'Đang tải…');
check('missingCrumb là mắt pending (không vào JSON-LD)', missingCrumb('/san-pham/abc', 'Không tìm thấy').pending, true);
check('visibleCrumbs bỏ mắt không có nhãn', visibleCrumbs([HOME_CRUMB, { name: '', path: '/x' }]).length, 1);

const listLd = crumbJsonLd(listCrumbs);
const listItems = listLd.itemListElement as Array<{ position: number; name: string; item: string }>;
check('crumbJsonLd @type', listLd['@type'], 'BreadcrumbList');
check('crumbJsonLd bỏ mắt pending khỏi structured data', listItems.length, 2);
check('crumbJsonLd position bắt đầu từ 1', listItems.map(item => item.position), [1, 2]);
check('crumbJsonLd item là URL tuyệt đối', listItems[0].item, `${DEFAULT_SITE_URL}/`);
check(
  'crumbJsonLd name khớp đúng nhãn đang hiển thị',
  listItems.map(item => item.name),
  visibleCrumbs(listCrumbs)
    .filter(crumb => !crumb.pending)
    .map(crumb => crumb.name)
);

/* ── Mắt cấp 2 của mọi trang cấp 1: phải trỏ vào route có thật và không đè nhau ── */
const PAGE_CRUMBS = [
  PRODUCTS_CRUMB,
  SERVICES_CRUMB,
  NEWS_CRUMB,
  PRICE_LIST_CRUMB,
  WARRANTY_CRUMB,
  ABOUT_CRUMB,
  CONTACT_CRUMB
];
const routePaths = Object.values(ROUTES) as string[];
check(
  'mọi mắt cấp 2 đều trỏ vào route có thật',
  PAGE_CRUMBS.filter(crumb => !routePaths.includes(crumb.path)),
  []
);
check('mắt cấp 2 không trùng path', new Set(PAGE_CRUMBS.map(crumb => crumb.path)).size, PAGE_CRUMBS.length);

/* ── P2.8: 2 trang vừa được thêm dải breadcrumb hiển thị — UI ⇄ JSON-LD phải khớp URL thật ── */
const aboutCrumbs = crumbTrail(ABOUT_CRUMB);
check('aboutCrumbs = Trang chủ › Giới thiệu', aboutCrumbs.map(crumb => crumb.name), ['Trang chủ', 'Giới thiệu']);
check(
  'aboutCrumbs JSON-LD khớp /gioi-thieu',
  (crumbJsonLd(aboutCrumbs).itemListElement as Array<{ item: string }>).map(item => item.item),
  [`${DEFAULT_SITE_URL}/`, `${DEFAULT_SITE_URL}${ROUTES.about}`]
);
const contactCrumbs = crumbTrail(CONTACT_CRUMB);
check('contactCrumbs = Trang chủ › Liên hệ', contactCrumbs.map(crumb => crumb.name), ['Trang chủ', 'Liên hệ']);
check(
  'contactCrumbs JSON-LD khớp /lien-he',
  (crumbJsonLd(contactCrumbs).itemListElement as Array<{ item: string }>).map(item => item.item),
  [`${DEFAULT_SITE_URL}/`, `${DEFAULT_SITE_URL}${ROUTES.contact}`]
);

console.log(
  `\n${failed === 0 ? `OK: ${passed} assertion đạt — tìm kiếm toàn site + breadcrumb dùng chung (P2.8).` : `${failed} assertion KHONG dat (${passed} đạt).`}`
);
process.exit(failed === 0 ? 0 : 1);

