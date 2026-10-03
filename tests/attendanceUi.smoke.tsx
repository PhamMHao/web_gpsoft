/**
 * P2.2 — Smoke test module "Phần mềm chấm công" `/phan-mem-cham-cong?tab=<id>`.
 *
 * Chạy: `npm run test:attendance-ui`
 *
 * Vì sao cần file này (`tests/routes.smoke.tsx` mới chỉ kiểm 2 URL mẫu):
 * 1. **Cả 4 tab** render đúng nội dung khi vào bằng URL `?tab=` và **không** lẫn dữ liệu của tab khác
 *    (assert `mock.title` của 3 tab còn lại phải VẮNG trong HTML).
 * 2. **Hợp đồng URL ↔ tab**: `attendanceTabPath()` · `findAttendanceTab()` · `?tab=` rác ⇒ tab mặc định
 *    (tab mặc định dùng URL sạch ⇒ không tồn tại 2 URL cho cùng nội dung = canonical đúng).
 * 3. **Lối vào từ Navbar/Footer**: render `App` ở `/` rồi soi `href` của 4 tab. `Footer` render đủ 4 link
 *    nên SSR kiểm được; `Navbar` đọc cùng nguồn `ATTENDANCE_TABS` cho dropdown desktop + menu mobile.
 * 4. **Nội dung CMS**: `attendanceCmsSlug()` / `attendanceCmsPages()` khớp quy ước
 *    `phan-mem-cham-cong-<tab>` mà trang public đang gọi `api.getPage(slug)` ⇒ bấm "Tạo 4 trang Module
 *    Chấm công" trong `PagesView` là trang public tự đổi nội dung, không phải sửa code.
 * 5. **Toàn vẹn dữ liệu 4 tab** (features/compare/plans/faqs) — dữ liệu là hợp đồng của cả trang public
 *    lẫn nội dung seed CMS, và là nguồn của FAQPage JSON-LD (`faqs` hiển thị thật nên hợp lệ với Google).
 *
 * KHÔNG test được ở đây (cần backend/browser — effect không chạy khi SSR):
 * - ghi đè khối mô tả bằng nội dung `Page` của CMS (`api.getPage()` trong `useEffect`);
 * - chuẩn hoá URL `?tab=` rác bằng `setSearchParams(..., { replace: true })`.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../src/App.tsx';
import { AppProvider } from '../src/context/AppContext.tsx';
import { AttendanceSoftwarePage, FEATURE_ICONS } from '../src/components/website/AttendanceSoftwarePage.tsx';
import { ROUTES } from '../src/utils/url.ts';
import {
  ATTENDANCE_CMS_SLUG_PREFIX,
  ATTENDANCE_MODULE_LABEL,
  ATTENDANCE_TABS,
  ATTENDANCE_TAB_IDS,
  DEFAULT_ATTENDANCE_TAB_ID,
  attendanceCmsPages,
  attendanceCmsSlug,
  attendanceTab,
  attendanceTabPath,
  findAttendanceTab
} from '../src/utils/attendance.ts';

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

/** Assert HTML render ra chứa đủ `markers` và **không** chứa `absent` (VD nội dung của tab khác). */
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

/** Render riêng trang (không qua `App`) để chốt hợp đồng render của file route P2.2. */
const renderPage = (path: string, node: ReactNode) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>{node}</AppProvider>
      </MemoryRouter>
    )
  );

/* ── 0. Hằng số module ─────────────────────────────────────────────────────────────────────────── */
check('ATTENDANCE_TABS có đúng 4 tab', ATTENDANCE_TABS.length, 4);
check('Thứ tự 4 tab hiển thị (thanh tab + menu)', ATTENDANCE_TAB_IDS, [
  'cham-cong',
  'nhan-su',
  'tien-luong',
  'kiem-xuong'
]);
check('ROUTES.attendance là URL sạch', ROUTES.attendance, '/phan-mem-cham-cong');
check('Tab mặc định là "cham-cong"', DEFAULT_ATTENDANCE_TAB_ID, 'cham-cong');
check('Nhãn module dùng chung (breadcrumb/nav)', ATTENDANCE_MODULE_LABEL, 'Phần mềm chấm công');
check('Tiền tố slug CMS', ATTENDANCE_CMS_SLUG_PREFIX, 'phan-mem-cham-cong-');

/* ── 1. Hợp đồng URL ↔ tab ─────────────────────────────────────────────────────────────────────── */
const TAB_PATHS: Record<string, string> = {
  'cham-cong': '/phan-mem-cham-cong',
  'nhan-su': '/phan-mem-cham-cong?tab=nhan-su',
  'tien-luong': '/phan-mem-cham-cong?tab=tien-luong',
  'kiem-xuong': '/phan-mem-cham-cong?tab=kiem-xuong'
};

for (const tab of ATTENDANCE_TABS) {
  check(`attendanceTabPath("${tab.id}")`, attendanceTabPath(tab.id), TAB_PATHS[tab.id]);
}
check('attendanceTabPath("") ⇒ URL sạch (tab mặc định)', attendanceTabPath(''), ROUTES.attendance);
check('attendanceTabPath(undefined) ⇒ URL sạch', attendanceTabPath(undefined), ROUTES.attendance);
check("attendanceTabPath('tab rác') ⇒ tab mặc định", attendanceTabPath('khong-ton-tai'), ROUTES.attendance);

check('findAttendanceTab theo id', findAttendanceTab('nhan-su')?.id, 'nhan-su');
check('findAttendanceTab theo slug CMS', findAttendanceTab('phan-mem-cham-cong-kiem-xuong')?.id, 'kiem-xuong');
check('findAttendanceTab chấp nhận HOA/thường', findAttendanceTab(' TIEN-LUONG ')?.id, 'tien-luong');
check('findAttendanceTab giá trị rác ⇒ null', findAttendanceTab('xyz'), null);
check('findAttendanceTab rỗng ⇒ null', findAttendanceTab('   '), null);
check('attendanceTab giá trị rác ⇒ tab mặc định', attendanceTab('xyz').id, DEFAULT_ATTENDANCE_TAB_ID);
check('attendanceCmsSlug("nhan-su")', attendanceCmsSlug('nhan-su'), 'phan-mem-cham-cong-nhan-su');

// Slug CMS cũng là `?tab=` hợp lệ (link từ CMS/kết quả tìm kiếm dán vào vẫn đúng tab).
check(
  'findAttendanceTab chấp nhận slug CMS cho cả 4 tab',
  ATTENDANCE_TABS.map(t => findAttendanceTab(attendanceCmsSlug(t.id))?.id),
  ATTENDANCE_TAB_IDS
);

/* ── 2. App render đúng tab theo URL và không lẫn dữ liệu tab khác ─────────────────────────────── */
for (const tab of ATTENDANCE_TABS) {
  const path = attendanceTabPath(tab.id);
  const otherMockTitles = ATTENDANCE_TABS.filter(item => item.id !== tab.id).map(item => item.mock.title);
  checkHtml(
    `App ${path} ⇒ tab "${tab.label}"`,
    renderApp(path),
    [
      tab.cmsTitle, // h1 của tab
      tab.tagline, // mô tả ngắn (tĩnh, CMS có thể ghi đè)
      tab.mock.title, // dashboard demo của tab
      tab.mock.footer, // footer dashboard — chứng minh render cả ảnh chụp giao diện
      tab.features[0].title, // khối tính năng
      tab.compare[0].label, // bảng so sánh gói
      tab.plans[0].name, // gói giá đầu tiên
      tab.faqs[0].q, // FAQ (khớp FAQPage JSON-LD)
      'Nhận demo miễn phí', // CTA ⇒ QuoteModal
      'Nhận demo gói này'
    ],
    [HOME_MARKER, ...otherMockTitles]
  );
}

// `?tab=` rác / slug CMS / HOA-thường đều trỏ về đúng tab nhờ `findAttendanceTab()`.
const KEM_XUONG = attendanceTab('kiem-xuong');
const NHAN_SU = attendanceTab('nhan-su');
checkHtml(
  'App ?tab=slug-CMS (HOA/thường) ⇒ tab kiểm xưởng',
  renderApp('/phan-mem-cham-cong?tab=PHAN-MEM-CHAM-CONG-KIEM-XUONG'),
  [KEM_XUONG.cmsTitle, KEM_XUONG.mock.title],
  [HOME_MARKER, NHAN_SU.mock.title]
);
checkHtml(
  'App ?tab=<giá trị rác> ⇒ tab mặc định (không trắng trang)',
  renderApp('/phan-mem-cham-cong?tab=khong-ton-tai'),
  [attendanceTab(DEFAULT_ATTENDANCE_TAB_ID).mock.title, 'Nhận demo miễn phí'],
  [HOME_MARKER, KEM_XUONG.mock.title]
);

/* ── 3. Trang tự render được khi SSR/context rỗng (nội dung tĩnh ⇒ SEO tốt) ─────────────────────── */
checkHtml(
  'AttendanceSoftwarePage (context rỗng) ở ?tab=tien-luong',
  renderPage('/phan-mem-cham-cong?tab=tien-luong', <AttendanceSoftwarePage />),
  [attendanceTab('tien-luong').cmsTitle, attendanceTab('tien-luong').mock.title],
  [HOME_MARKER]
);

/* ── 4. Icon khối tính năng: mọi khoá `icon` trong dữ liệu phải có icon thật ────────────────────── */
const missingIcons = ATTENDANCE_TABS.flatMap(tab =>
  tab.features.filter(feature => !FEATURE_ICONS[feature.icon]).map(feature => `${tab.id}:${feature.icon}`)
);
check('FEATURE_ICONS phủ hết khoá icon của 4 tab', missingIcons, []);

/* ── 5. Toàn vẹn dữ liệu 4 tab (nguồn của trang public + FAQPage JSON-LD + seed CMS) ────────────── */
for (const tab of ATTENDANCE_TABS) {
  const label = `tab "${tab.id}"`;
  check(`${label}: đủ 3 gói giá`, tab.plans.length, 3);
  check(`${label}: gói cuối KHÔNG niêm yết giá (Liên hệ báo giá)`, tab.plans[2].price, null);
  check(
    `${label}: 2 gói đầu có giá niêm yết`,
    tab.plans.slice(0, 2).map(plan => typeof plan.price === 'number' && plan.price > 0),
    [true, true]
  );
  check(
    `${label}: mỗi dòng so sánh đủ 3 giá trị (khớp 3 gói)`,
    tab.compare.filter(row => row.values.length !== tab.plans.length).map(row => row.label),
    []
  );
  check(
    `${label}: >= 4 tính năng, mỗi tính năng đủ icon/title/desc`,
    [
      tab.features.length >= 4,
      tab.features.every(feature => !!feature.icon.trim() && !!feature.title.trim() && !!feature.desc.trim())
    ],
    [true, true]
  );
  check(
    `${label}: >= 3 FAQ có đủ câu hỏi + câu trả lời`,
    [tab.faqs.length >= 3, tab.faqs.every(faq => !!faq.q.trim() && !!faq.a.trim())],
    [true, true]
  );
  check(
    `${label}: dashboard demo >= 3 dòng, tone hợp lệ`,
    [
      tab.mock.rows.length >= 3,
      tab.mock.rows.every(
        row => !!row.value.trim() && (row.tone === undefined || ['ok', 'warn', 'info'].includes(row.tone))
      )
    ],
    [true, true]
  );
  check(`${label}: metrics đủ value+label`, tab.metrics.every(item => !!item.value.trim() && !!item.label.trim()), true);
  check(`${label}: badges + description không rỗng`, [...tab.badges, ...tab.description].every(text => !!text.trim()), true);
  check(`${label}: cmsContent đủ dài để CMS biên tập`, tab.cmsContent.trim().length > 200, true);
  check(
    `${label}: cmsTitle/navHint sẵn sàng cho menu + CMS`,
    [tab.cmsTitle.startsWith('Phần mềm'), !!tab.navHint.trim()],
    [true, true]
  );
  // Khoá React (`key`) của các danh sách phải duy nhất, nếu không React sẽ cảnh báo trùng key khi render.
  check(
    `${label}: khoá danh sách duy nhất (mock/compare/features/plans)`,
    [
      new Set(tab.mock.rows.map(row => row.label)).size === tab.mock.rows.length,
      new Set(tab.compare.map(row => row.label)).size === tab.compare.length,
      new Set(tab.features.map(feature => feature.title)).size === tab.features.length,
      new Set(tab.plans.map(plan => plan.id)).size === tab.plans.length
    ],
    [true, true, true, true]
  );
}

/* ── 6. Nội dung CMS: `PagesView` seed đúng slug mà trang public gọi `api.getPage()` ───────────── */
const seeds = attendanceCmsPages();
check('attendanceCmsPages() trả 4 trang', seeds.length, 4);
check(
  'Slug seed khớp `attendanceCmsSlug()` của từng tab',
  seeds.map(seed => seed.slug),
  ATTENDANCE_TABS.map(tab => attendanceCmsSlug(tab.id))
);
check('Slug seed không trùng nhau', new Set(seeds.map(seed => seed.slug)).size, seeds.length);
check(
  'Tiêu đề trang CMS = `cmsTitle` của tab',
  seeds.map(seed => seed.title),
  ATTENDANCE_TABS.map(tab => tab.cmsTitle)
);
check(
  'Nội dung seed = `cmsContent` của tab (nội dung tĩnh, admin sửa được)',
  seeds.every((seed, index) => seed.content === ATTENDANCE_TABS[index].cmsContent && seed.content.trim().length > 200),
  true
);
check(
  'SEO seed đủ metaTitle (có tên tab) + metaDesc (= tagline)',
  seeds.every(
    (seed, index) =>
      seed.seo.metaTitle.includes(ATTENDANCE_TABS[index].cmsTitle) &&
      seed.seo.metaDesc === ATTENDANCE_TABS[index].tagline
  ),
  true
);
check(
  'Slug seed đúng quy ước `phan-mem-cham-cong-<tab>` (idempotent theo slug)',
  seeds.every(seed => seed.slug === attendanceCmsSlug(seed.slug.slice(ATTENDANCE_CMS_SLUG_PREFIX.length))),
  true
);

/* ── 7. Lối vào từ menu/footer: Navbar có mục "Phần mềm", Footer liệt kê đủ 4 tab ───────────────── */
const homeHtml = renderApp('/');
checkHtml('Trang chủ có lối vào module + 4 tab (Navbar/Footer)', homeHtml, [
  ATTENDANCE_MODULE_LABEL, // Footer: nhãn module
  '<span>Phần mềm</span>', // Navbar: trigger dropdown "Phần mềm"
  `href="${ROUTES.attendance}"`, // tab mặc định (URL sạch, canonical)
  'href="/phan-mem-cham-cong?tab=nhan-su"',
  'href="/phan-mem-cham-cong?tab=tien-luong"',
  'href="/phan-mem-cham-cong?tab=kiem-xuong"'
]);

// Trang module cũng phải nằm trong Navbar/Footer như mọi trang khác của website.
checkHtml('Trang module vẫn có Navbar + Footer (layout chung)', renderApp(ROUTES.attendance), [
  ATTENDANCE_MODULE_LABEL,
  '<span>Phần mềm</span>'
]);

console.log(
  `\n${
    failed === 0
      ? `OK: ${passed} assertion đạt — module "Phần mềm chấm công" (P2.2).`
      : `${failed} assertion KHONG dat (${passed} đạt).`
  }`
);
process.exit(failed === 0 ? 0 : 1);
