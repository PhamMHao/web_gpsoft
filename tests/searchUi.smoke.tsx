/**
 * P2.8 — Smoke test **render** của tìm kiếm toàn site + trang 404 + breadcrumb dùng chung.
 *
 * Chạy: `npm run test:search-ui`
 *
 * Vì sao cần riêng file này (ngoài `tests/search.smoke.ts` đã test hàm thuần):
 * 1. `SearchPage` đọc trạng thái từ URL (`?q=&tab=&sort=`) và **sinh link thật** cho từng tab/sắp xếp ⇒
 *    test chốt đúng `href` render ra, tránh hồi quy "đổi tab mất từ khóa" hoặc "link về trang sản phẩm cũ".
 * 2. `NotFoundPage` phải là trang 404 **thật sự có lối thoát** (ô tìm kiếm + link nhanh + gợi ý từ khóa),
 *    không phải màn hình trắng — và các nút đó phải trỏ tới `/tim-kiem?q=`.
 * 3. `Breadcrumb` dùng chung cho mọi trang: mắt `pending` (đang tải/không tìm thấy) phải render dạng chữ
 *    **không kèm link** (tránh link chết), mắt cuối là `aria-current="page"`, dải rỗng thì không render gì.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../src/App.tsx';
import { AppProvider } from '../src/context/AppContext.tsx';
import { SearchPage } from '../src/components/website/SearchPage.tsx';
import { NotFoundPage } from '../src/components/website/NotFoundPage.tsx';
import { Breadcrumb } from '../src/components/common/Breadcrumb.tsx';
import { PRODUCTS_CRUMB, crumbTrail, pendingCrumb } from '../src/utils/breadcrumb.ts';
import { SEARCH_SUGGESTIONS, searchPath } from '../src/utils/search.ts';

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

/** Assert HTML render ra chứa đủ `markers` và **không** chứa `absent`. */
function checkHtml(label: string, html: string, markers: string[], absent: string[] = []) {
  const missing = markers.filter(marker => !html.includes(marker));
  const leaked = absent.filter(marker => html.includes(marker));
  const ok = missing.length === 0 && leaked.length === 0;
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${markers.join(' | ')}${
      ok ? '' : `  (thiếu: ${missing.join(' · ')}${leaked.length ? ` | lọt: ${leaked.join(' · ')}` : ''})`
    }`
  );
}

/**
 * React SSR escape `&` trong thuộc tính thành `&amp;` ⇒ chuyển URL thật sang dạng xuất hiện trong HTML,
 * nhờ vậy assertion đọc đúng `href` mà người dùng thấy (VD `/tim-kiem?q=laptop&tab=san-pham`).
 */
const hrefIn = (path: string) => `href="${path.replace(/&/g, '&amp;')}"`;

/** Đếm số lần `needle` xuất hiện trong HTML (VD số mắt breadcrumb). */
const countOf = (html: string, needle: string) => html.split(needle).length - 1;

/** Lấy các thẻ mở `<a ...>` trong HTML để assert thuộc tính nằm **đúng link** (VD `aria-current`). */
const anchorsWith = (html: string, needle: string) =>
  (html.match(/<a\b[^>]*>/g) ?? []).filter(tag => tag.includes(needle));

/** React SSR chèn `<!-- -->` giữa các text node liền kề ⇒ gỡ để marker khớp như UI thật. */
const stripComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

/** Render `App` thật (điều hướng + provider) tại một URL. */
const renderApp = (path: string) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    )
  );

/** Render riêng component trang (không qua `App`) với context rỗng như SSR thật. */
const renderPage = (path: string, node: ReactNode) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>{node}</AppProvider>
      </MemoryRouter>
    )
  );

/* ───────────────── 1. `/tim-kiem` — chưa có từ khóa (không được là trang trắng) ───────────────── */
const emptySearch = renderPage('/tim-kiem', <SearchPage />);
checkHtml('SearchPage chưa có từ khóa: h1 + breadcrumb + gợi ý', emptySearch, [
  'Tìm kiếm toàn site',
  'aria-label="Breadcrumb"',
  'Nhập tên sản phẩm, bài viết hoặc dịch vụ bạn cần tìm.',
  'Từ khóa phổ biến'
]);
check(
  'SearchPage: mọi gợi ý từ khóa là link `/tim-kiem?q=`',
  SEARCH_SUGGESTIONS.filter(suggestion => !emptySearch.includes(hrefIn(searchPath(suggestion)))),
  []
);
checkHtml('SearchPage chưa có từ khóa: không hiện nút "Xóa từ khóa"/sắp xếp', emptySearch, [], [
  'Xóa từ khóa',
  'Sắp xếp'
]);

/* ───────────── 2. `/tim-kiem?q=&tab=&sort=` — link tab/sắp xếp phải giữ từ khóa ───────────── */
const keyword = 'laptop';
const searchUrl = '/tim-kiem?q=laptop&tab=san-pham&sort=price_asc';
const keywordSearch = renderPage(searchUrl, <SearchPage />);
checkHtml('SearchPage có từ khóa: tiêu đề + số kết quả + nút xóa', keywordSearch, [
  'Kết quả cho',
  'Tìm thấy 0 kết quả trong sản phẩm, bài viết và dịch vụ.',
  hrefIn('/tim-kiem'),
  'Xóa từ khóa'
]);
checkHtml(
  'SearchPage: 4 tab đều là link thật giữ từ khóa',
  keywordSearch,
  [
    hrefIn(searchPath(keyword, { tab: 'all' })),
    hrefIn(searchPath(keyword, { tab: 'product' })),
    hrefIn(searchPath(keyword, { tab: 'post' })),
    hrefIn(searchPath(keyword, { tab: 'service' }))
  ],
  []
);
// `aria-current="page"` xuất hiện 2 lần: mắt cuối breadcrumb (`<span>`) + **tab đang xem** (`<a>`).
check(
  'SearchPage: chỉ tab đang xem là link có aria-current="page"',
  anchorsWith(keywordSearch, 'tab=san-pham').filter(tag => tag.includes('aria-current="page"')).length,
  1
);
check(
  'SearchPage: không tab nào khác tự nhận aria-current',
  (keywordSearch.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? []).length,
  1
);
checkHtml('SearchPage: sắp xếp chỉ hiện ở tab sản phẩm (link giữ từ khóa)', keywordSearch, [
  'Sắp xếp',
  hrefIn(searchPath(keyword, { tab: 'product', sort: 'price_asc' })),
  'Giá: Thấp đến Cao'
]);
checkHtml('SearchPage: tab bài viết ẩn khối sắp xếp', renderPage('/tim-kiem?q=laptop&tab=bai-viet', <SearchPage />), [], [
  'Sắp xếp'
]);

/* ───────────────── 3. Trang 404 — luôn có lối thoát cho khách ───────────────── */
const wrongPath = '/khong-ton-tai-xin-chao';
const notFound = renderPage(wrongPath, <NotFoundPage />);
checkHtml('NotFoundPage: mã lỗi + tiêu đề + đường dẫn sai', notFound, [
  'Lỗi 404 — Trang không tồn tại',
  '404',
  'Không tìm thấy trang bạn cần',
  wrongPath
]);
checkHtml('NotFoundPage: ô tìm kiếm trỏ về tìm kiếm toàn site', notFound, [
  'Tìm kiếm sản phẩm, bài viết, dịch vụ',
  'Từ khóa phổ biến'
]);
check(
  'NotFoundPage: mọi gợi ý từ khóa là link `/tim-kiem?q=`',
  SEARCH_SUGGESTIONS.filter(suggestion => !notFound.includes(hrefIn(searchPath(suggestion)))),
  []
);
check('NotFoundPage: có link nhanh về trang sản phẩm', notFound.includes(hrefIn('/san-pham')), true);
check('NotFoundPage: có link nhanh về trang chủ', notFound.includes(hrefIn('/')), true);


/* ───────────────── 4. Breadcrumb dùng chung — mắt "đang tải" không sinh link chết ───────────────── */
const crumbs = crumbTrail(PRODUCTS_CRUMB, pendingCrumb('/san-pham/abc', 'MacBook Air M3'));
const plainCrumb = renderPage('/san-pham/abc', <Breadcrumb items={crumbs} />);
checkHtml('Breadcrumb: đủ mắt + mắt cuối là trang hiện tại', plainCrumb, [
  'aria-label="Breadcrumb"',
  'Trang chủ',
  'Sản phẩm',
  'MacBook Air M3',
  'aria-current="page"'
]);
check('Breadcrumb: số mắt = số `<li>`', countOf(plainCrumb, '<li'), 3);
check('Breadcrumb: mắt "đang tải" KHÔNG phải link', plainCrumb.includes(hrefIn('/san-pham/abc')), false);
check('Breadcrumb: mắt cha là link thật', plainCrumb.includes(hrefIn('/san-pham')), true);
check('Breadcrumb: chỉ mắt cuối có aria-current', countOf(plainCrumb, 'aria-current="page"'), 1);

const headerCrumb = renderPage('/san-pham/abc', <Breadcrumb items={crumbs} variant="header" />);
check('Breadcrumb variant="header": mắt cuối đậm theo tông chữ', headerCrumb.includes('text-slate-800'), true);
const pillCrumb = renderPage('/san-pham/abc', <Breadcrumb items={crumbs} variant="pill" />);
check('Breadcrumb variant="pill": card nổi bo tròn', pillCrumb.includes('rounded-2xl'), true);
// `lucide-react` render icon Home thành `lucide-house` (Home là alias cũ) ⇒ nhận cả 2 tên class.
check('Breadcrumb variant="pill": có icon nhà ở mắt đầu', /lucide-(house|home)/.test(pillCrumb), true);
check('Breadcrumb variant="plain": không thêm icon nhà', /lucide-(house|home)/.test(plainCrumb), false);
check('Breadcrumb rỗng ⇒ không render gì', renderPage('/', <Breadcrumb items={[]} />), '');

/* ───────────────── 5. Navbar: header desktop gọn gàng (đã bỏ nút/ô tìm kiếm + nút so sánh) ───────────────── */
const home = renderApp('/');
checkHtml('Navbar: header hiển thị thương hiệu và menu', home, [
  'GPSOFT',
  'Bảng giá'
], [
  'Tìm iPhone 16 Pro Max, MacBook M3, phụ kiện...'
]);
check(
  'Navbar: không còn form tìm kiếm trên desktop header (đóng menu mobile)',
  countOf(home, 'role="search"'),
  0
);
checkHtml('Navbar: không rò rỉ kết quả tìm kiếm trên header', home, [], [
  'Xem tất cả kết quả cho'
]);

console.log(
  `\n${failed === 0 ? `OK: ${passed} assertion đạt — render tìm kiếm toàn site + 404 + breadcrumb (P2.8).` : `${failed} assertion KHONG dat (${passed} đạt).`}`
);
process.exit(failed === 0 ? 0 : 1);

