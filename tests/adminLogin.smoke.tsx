/**
 * P2.10 — Smoke test **cửa vào CMS ẩn** (`/login-admin`).
 *
 * Chạy: `npm run test:admin-login`
 *
 * Bối cảnh: trước P2.10 website có thanh trên cùng với 2 nút **"Giao diện Website" / "Quản trị CMS"**
 * ⇒ bất kỳ khách nào cũng thấy lối vào khu quản trị, và trang đăng nhập in thẳng `admin / admin123`.
 * File này chốt lại 4 hợp đồng của cách làm mới:
 * 1. **URL**: `/login-admin` parse ra trang thật (`matched: true`), `pathFor('admin-login')` sinh đúng
 *    URL, và các URL "gần giống" (`/admin`, `/login_admin`, `/quantri`…) **không** mở được cửa này.
 * 2. **Không lộ thông tin**: `LoginView` không còn khối "Tài khoản demo" (`admin / admin123`).
 * 3. **Không có lối vào công khai**: HTML SSR của `/` (và các trang công khai khác) **không** chứa chuỗi
 *    `/login-admin`; `/login-admin` render riêng, không Navbar/Footer/thanh hotline.
 * 4. **Không lọt index**: `robots.txt` luôn có `Disallow: /login-admin` và `server.ts` không đưa cửa này
 *    vào `sitemap.xml`.
 *
 * KHÔNG test được ở đây (cần browser — effect/hooks không chạy khi SSR): luồng `login()` chuyển
 * `viewMode` sang `'cms'`, điều hướng về trang chủ khi rời CMS từ `/login-admin`, `setSeo()` ghi
 * `<meta name="robots">`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.tsx';
import { AppProvider } from '../src/context/AppContext.tsx';
import { LoginView } from '../src/components/cms/LoginView.tsx';
import { ROUTES, parsePath, pathFor } from '../src/utils/url.ts';
import { buildRobotsTxt } from '../server/robots.ts';

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

/** Marker đặc trưng của `HomePage` — chứng minh URL render đúng trang chứ không rơi về đâu khác. */
const HOME_MARKER = 'Danh Mục Công Nghệ Nổi Bật';
/** Nút cũ trên `ModeSwitcherBar` — đã bị xoá ở P2.10; lọt lại ⇒ có ai đó khôi phục lối vào CMS. */
const OLD_MODE_BUTTONS = ['Quản trị CMS', 'Giao diện Website'];

/** React SSR chèn `<!-- -->` giữa các text node liền kề ⇒ gỡ comment trước khi so khớp marker. */
const stripComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

/** Render `App` thật (routing + provider) tại một URL rồi trả HTML SSR. */
const renderApp = (path: string) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    )
  );

/** Render `LoginView` riêng (không qua `App`) để chốt hợp đồng nội dung của form đăng nhập. */
const renderLoginView = () =>
  stripComments(
    renderToString(
      <MemoryRouter>
        <AppProvider>
          <LoginView />
        </AppProvider>
      </MemoryRouter>
    )
  );

/* ── 0. Hợp đồng URL ─────────────────────────────────────────────────────────────────────────── */
check('ROUTES.adminLogin là URL ẩn', ROUTES.adminLogin, '/login-admin');
check('pathFor("admin-login")', pathFor('admin-login'), '/login-admin');
check('parsePath("/login-admin")', parsePath('/login-admin'), { page: 'admin-login', matched: true });
check('parsePath("/login-admin?utm=a") bỏ query', parsePath('/login-admin?utm=a'), {
  page: 'admin-login',
  matched: true
});
check('parsePath("/login-admin#top") bỏ hash', parsePath('/login-admin#top'), {
  page: 'admin-login',
  matched: true
});
check('parsePath("/login-admin/") (dấu / cuối)', parsePath('/login-admin/'), {
  page: 'admin-login',
  matched: true
});
check(
  'cửa vào CMS không trùng route công khai nào',
  Object.entries(ROUTES)
    .filter(([, value]) => value === ROUTES.adminLogin)
    .map(([key]) => key),
  ['adminLogin']
);
check(
  'URL gần giống KHÔNG mở được CMS (vẫn là 404 của P2.8)',
  ['/admin', '/login_admin', '/loginadmin', '/quantri', '/cms'].map(path => parsePath(path)),
  Array.from({ length: 5 }, () => ({ page: 'home', matched: false }))
);

/* ── 1. Form đăng nhập không lộ tài khoản/mật khẩu ───────────────────────────────────────────── */
checkHtml('LoginView: form đăng nhập đầy đủ, KHÔNG có thông tin đăng nhập mẫu', renderLoginView(), [
  'Đăng nhập vào hệ thống quản trị',
  'Tên đăng nhập hoặc Email',
  'Mật khẩu',
  'Đăng Nhập',
  'placeholder="Tên đăng nhập hoặc email"'
], ['Tài khoản demo', 'admin123', 'placeholder="admin"', 'Hotline tư vấn', ...OLD_MODE_BUTTONS]);

/* ── 2. Mặc định là website + bất biến "không lộ cửa vào CMS" trên mọi trang công khai ───────── */
checkHtml('Trang chủ (mặc định) là giao diện website, không còn nút đổi chế độ', renderApp('/'), [
  HOME_MARKER,
  'Hotline tư vấn',
  'Tra cứu tình trạng đơn hàng'
], [...OLD_MODE_BUTTONS, ROUTES.adminLogin]);

const PUBLIC_PATHS = ['/', '/san-pham', '/lien-he', '/dich-vu', '/bao-hanh', '/thiet-ke-website', '/tim-kiem?q=dell'];
const publicPages = PUBLIC_PATHS.map(path => [path, renderApp(path)] as const);
check(
  'không trang công khai nào nhúng URL cửa vào CMS',
  publicPages.filter(([, html]) => html.includes(ROUTES.adminLogin)).map(([path]) => path),
  []
);
check(
  'không trang công khai nào còn nút đổi chế độ CMS',
  publicPages
    .filter(([, html]) => OLD_MODE_BUTTONS.some(label => html.includes(label)))
    .map(([path]) => path),
  []
);

/* ── 3. `/login-admin` là cửa riêng: không Navbar/Footer/thanh hotline ────────────────────────── */
// SSR chưa chạy effect (chưa biết có phiên hay không) ⇒ đúng ra phải thấy màn hình chờ, KHÔNG phải
// form đăng nhập nháy lên rồi biến mất khi đang còn phiên (F5 trong CMS).
checkHtml('/login-admin: cửa vào CMS đứng riêng, không layout công khai', renderApp(ROUTES.adminLogin), [
  'Đang kiểm tra phiên đăng nhập'
], [HOME_MARKER, 'Hotline tư vấn', 'Tra cứu tình trạng đơn hàng', 'aria-label="Breadcrumb"', ...OLD_MODE_BUTTONS, 'Tài khoản demo']);

/* ── 4. robots.txt: luôn chặn cửa vào CMS, luôn có sitemap ───────────────────────────────────── */
check(
  'robots.txt mặc định (DB trống): nhóm chặn CMS đứng đầu + sitemap theo APP_URL',
  buildRobotsTxt(undefined, 'https://gpsoft.vn'),
  `User-agent: *\nDisallow: ${ROUTES.adminLogin}\n\nUser-agent: *\nAllow: /\n\nSitemap: https://gpsoft.vn/sitemap.xml\n`
);
const DB_ROBOTS = 'User-agent: *\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://gpsoft.vn/sitemap.xml';
const dbRobotsOut = buildRobotsTxt(DB_ROBOTS, 'https://gpsoft.vn');
check('robots.txt: giữ nguyên nội dung admin nhập ở CMS', dbRobotsOut.includes(DB_ROBOTS), true);
check('robots.txt: nhóm chặn CMS luôn đứng đầu tệp', dbRobotsOut.startsWith(`User-agent: *\nDisallow: ${ROUTES.adminLogin}\n\n`), true);
check('robots.txt: không thêm Sitemap lần 2', (dbRobotsOut.match(/^sitemap\s*:/gim) ?? []).length, 1);
const ALREADY = 'User-agent: *\nDisallow: /login-admin\nDisallow: /api/';
const alreadyOut = buildRobotsTxt(ALREADY, 'https://gpsoft.vn/');
check('robots.txt: đã có dòng chặn ⇒ không thêm trùng', (alreadyOut.match(/disallow:\s*\/login-admin\s*$/gim) ?? []).length, 1);
check('robots.txt: appUrl có "/" cuối không tạo "//"', alreadyOut.includes('Sitemap: https://gpsoft.vn/sitemap.xml'), true);

/* ── 5. server.ts: cửa vào CMS không được đưa lên sitemap.xml ────────────────────────────────── */
const serverSource = readFileSync(fileURLToPath(new URL('../server.ts', import.meta.url)), 'utf8');
check('server.ts dùng buildRobotsTxt (1 nguồn duy nhất cho robots.txt)', serverSource.includes('buildRobotsTxt('), true);
// Mọi URL của sitemap đều đi qua `urlEntry(...)` (`server.ts`) ⇒ không entry nào được trỏ vào cửa CMS.
const sitemapEntries = serverSource.match(/urlEntry\([^)]*/g) ?? [];
check(
  'sitemap.xml không có entry nào trỏ vào cửa CMS',
  sitemapEntries.filter(entry => entry.includes('adminLogin') || entry.includes(ROUTES.adminLogin)),
  []
);
check(
  'server.ts không tham chiếu ROUTES.adminLogin (chỉ frontend mở cửa này)',
  serverSource.includes('ROUTES.adminLogin'),
  false
);
check('server.ts tách module server/robots.ts', serverSource.includes('./server/robots.js'), true);

console.log(
  `\n${
    failed === 0
      ? `OK: ${passed} assertion đạt — cửa vào CMS ẩn \`${ROUTES.adminLogin}\` (P2.10).`
      : `${failed} assertion KHONG dat (${passed} đạt).`
  }`
);
process.exit(failed === 0 ? 0 : 1);

