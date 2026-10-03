/**
 * P2.1 — Smoke test 2 route mới của website: `/danh-muc/:slug` (danh mục 2 cấp) và
 * `/thuong-hieu/:slug` (thương hiệu).
 *
 * Chạy: `npm run test:catalog-ui`
 *
 * Vì sao cần riêng file này (ngoài `tests/catalog.smoke.ts` đã test hàm thuần):
 * 1. `App.tsx` **thật sự route** 2 URL đó vào `CategoryPage`/`BrandPage` (không rơi về HomePage) —
 *    đây là regression dễ xảy ra nhất khi thêm route mới (trước P2.1 hai URL này rơi về trang chủ).
 * 2. Component render **không ném lỗi** khi chưa có dữ liệu (SSR: effect fetch không chạy, context
 *    còn rỗng) ⇒ nhờ vậy `sourceReady === false` phải được xử lý riêng, không render lưới rỗng.
 * 3. **Hợp đồng URL** của P2.1: `pathFor()` ⇄ `parsePath()` round-trip đúng slug (kể cả slug có
 *    dấu tiếng Việt phải được encode/decode) và thiếu slug ⇒ về danh sách sản phẩm.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../src/App.tsx';
import { AppProvider } from '../src/context/AppContext.tsx';
import { CategoryPage } from '../src/components/website/CategoryPage.tsx';
import { BrandPage } from '../src/components/website/BrandPage.tsx';
import { PREFIX, ROUTES, parsePath, pathFor } from '../src/utils/url.ts';

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

/** Assert HTML render ra chứa đủ `markers` và **không** chứa `absent` (Vd marker của HomePage). */
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

/** Marker đặc trưng của `HomePage` — dùng để chứng minh URL không rơi về trang chủ. */
const HOME_MARKER = 'Danh Mục Công Nghệ Nổi Bật';

/**
 * React SSR chèn `<!-- -->` giữa các text node liền kề (VD `Đang tải {label}...` bị cắt thành
 * 3 node) ⇒ gỡ comment trước khi so khớp để marker đọc được như trên UI thật.
 */
const stripComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

/** Render `App` thật (điều hướng + provider) tại một URL rồi trả HTML SSR. */
const renderApp = (path: string) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    )
  );

/** Render riêng component trang (không qua `App`) để chốt hợp đồng render của từng file route. */
const renderPage = (path: string, node: ReactNode) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>{node}</AppProvider>
      </MemoryRouter>
    )
  );

/* ── 1. `App.tsx` route đúng trang (SSR: chưa có dữ liệu ⇒ hiện trạng thái “đang tải”) ───────── */
checkHtml('App /danh-muc/laptop ⇒ CategoryPage', renderApp('/danh-muc/laptop'), ['Đang tải danh mục...'], [
  HOME_MARKER
]);
checkHtml(
  'App /danh-muc/laptop-gaming (cấp 2) ⇒ CategoryPage',
  renderApp('/danh-muc/laptop-gaming'),
  ['Đang tải danh mục...'],
  [HOME_MARKER]
);
checkHtml('App /thuong-hieu/apple ⇒ BrandPage', renderApp('/thuong-hieu/apple'), [
  'Đang tải thương hiệu...'
], [HOME_MARKER]);

/* ── 2. Component tự render được khi context rỗng (không ném lỗi) ──────────────────────────── */
checkHtml('CategoryPage (context rỗng)', renderPage('/danh-muc/laptop', <CategoryPage />), [
  'Đang tải danh mục...'
]);
checkHtml('BrandPage (context rỗng)', renderPage('/thuong-hieu/apple', <BrandPage />), [
  'Đang tải thương hiệu...'
]);

/* ── 3. Hợp đồng URL: `pathFor()` ⇄ `parsePath()` (trang danh mục/thương hiệu là URL thật) ───── */
check('ROUTES.category khớp route map', ROUTES.category, '/danh-muc/:slug');
check('ROUTES.brand khớp route map', ROUTES.brand, '/thuong-hieu/:slug');
check('PREFIX.category', PREFIX.category, '/danh-muc');
check('PREFIX.brand', PREFIX.brand, '/thuong-hieu');

check('pathFor danh mục', pathFor('category', { categorySlug: 'laptop' }), '/danh-muc/laptop');
check(
  'pathFor danh mục cấp 2',
  pathFor('category', { categorySlug: 'laptop-gaming' }),
  '/danh-muc/laptop-gaming'
);
check('pathFor thương hiệu', pathFor('brand', { brandSlug: 'apple' }), '/thuong-hieu/apple');
check('pathFor danh mục thiếu slug ⇒ danh sách sản phẩm', pathFor('category'), ROUTES.products);
check('pathFor thương hiệu thiếu slug ⇒ danh sách sản phẩm', pathFor('brand'), ROUTES.products);

check('parsePath danh mục', parsePath('/danh-muc/laptop'), {
  page: 'category',
  categorySlug: 'laptop',
  matched: true
});
check('parsePath thương hiệu', parsePath('/thuong-hieu/apple'), {
  page: 'brand',
  brandSlug: 'apple',
  matched: true
});
check('parsePath /danh-muc (thiếu slug) ⇒ products', parsePath('/danh-muc'), {
  page: 'products',
  matched: true
});
check('parsePath /thuong-hieu (thiếu slug) ⇒ products', parsePath('/thuong-hieu'), {
  page: 'products',
  matched: true
});
check('parsePath bỏ qua query (bộ lọc do `useSearchParams` lo)', parsePath('/danh-muc/laptop?brand=apple&page=2'), {
  page: 'category',
  categorySlug: 'laptop',
  matched: true
});

// Slug tiếng Việt có dấu: URL phải encode khi sinh và decode lại y nguyên khi parse.
for (const slug of ['laptop-do-hoa', 'đồ-họa', 'phụ-kiện-gaming']) {
  for (const kind of ['category', 'brand'] as const) {
    const path = pathFor(kind, kind === 'category' ? { categorySlug: slug } : { brandSlug: slug });
    const parsed = parsePath(path);
    const roundTrip = kind === 'category' ? parsed.categorySlug : parsed.brandSlug;
    check(`round-trip slug "${slug}" (${kind})`, [path, parsed.page, roundTrip], [
      `/${kind === 'category' ? 'danh-muc' : 'thuong-hieu'}/${encodeURIComponent(slug)}`,
      kind,
      slug
    ]);
  }
}

console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt — route danh mục/thương hiệu (P2.1).` : `${failed} assertion KHONG dat (${passed} đạt).`}`);
process.exit(failed === 0 ? 0 : 1);
