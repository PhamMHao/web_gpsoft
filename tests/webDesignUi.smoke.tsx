/**
 * P2.3 — Smoke test trang dịch vụ **"Thiết kế website"** `/thiet-ke-website`.
 *
 * Chạy: `npm run test:web-design-ui`
 *
 * Vì sao cần file này (`tests/routes.smoke.tsx` mới chỉ kiểm URL mẫu, `tests/utils.smoke.ts` không đụng
 * module này):
 * 1. **Route + render thật**: `/thiet-ke-website` phải render `WebDesignPage` (không rơi về trang chủ),
 *    và render được cả khi SSR (nội dung tĩnh ⇒ SEO tốt, không phụ thuộc backend).
 * 2. **Hợp đồng dữ liệu** (bảng giá · quy trình · portfolio · FAQ · select của form) là nguồn của khối
 *    nội dung, FAQPage JSON-LD **và** payload lead ⇒ chốt toàn vẹn dữ liệu/duy nhất khoá React.
 * 3. **Nguồn lead P2.3**: `buildWebDesignLead()` phải trả `source = 'web-design'` (khớp
 *    `LEAD_SOURCE.webDesign` + bộ lọc `LEAD_SOURCE_FILTERS` của tab Leads trong CMS) và `type = 'contact'`
 *    — sai chỗ này thì sale không lọc được lead theo nguồn.
 * 4. **Lối vào từ menu/footer**: render `App` ở `/` rồi soi `href` ⇒ trang không bị "mồ côi" như trước.
 *
 * KHÔNG test được ở đây (cần backend/browser — effect không chạy khi SSR):
 * - ghi đè tiêu đề/mô tả/quy trình bằng `Service` slug `thiet-ke-website` của CMS (`api.getService()`);
 * - `setSeo()` bơm `<meta>` + JSON-LD vào `document.head`, cuộn xuống form, `showToast`, `api.submitLead`.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../src/App.tsx';
import { AppProvider } from '../src/context/AppContext.tsx';
import { WebDesignPage } from '../src/components/website/WebDesignPage.tsx';
import { ROUTES, parsePath } from '../src/utils/url.ts';
import { formatVnd } from '../src/utils/format.ts';
import { DEFAULT_LEAD_SOURCE, LEAD_SOURCE, LEAD_SOURCE_FILTERS, leadSourceLabel } from '../src/utils/leadSource.ts';
import {
  EMPTY_WEB_DESIGN_FORM,
  WEB_DESIGN_BUDGETS,
  WEB_DESIGN_DEADLINES,
  WEB_DESIGN_FAQS,
  WEB_DESIGN_LEAD_SOURCE,
  WEB_DESIGN_MODULE_LABEL,
  WEB_DESIGN_PACKAGES,
  WEB_DESIGN_PAGE_TITLE,
  WEB_DESIGN_PORTFOLIO,
  WEB_DESIGN_SERVICE_SLUG,
  WEB_DESIGN_STATS,
  WEB_DESIGN_STEPS,
  WEB_DESIGN_TYPES,
  buildWebDesignLead,
  buildWebDesignMessage,
  buildWebDesignSubject,
  validateWebDesignForm,
  type WebDesignFormState
} from '../src/utils/webDesign.ts';

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

/** Assert HTML render ra chứa đủ `markers` và **không** chứa `absent` (VD marker của trang chủ). */
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

/** Render riêng trang (không qua `App`) để chốt hợp đồng render của file route P2.3. */
const renderPage = (path: string, node: ReactNode) =>
  stripComments(
    renderToString(
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>{node}</AppProvider>
      </MemoryRouter>
    )
  );

/* ── 0. Hằng số & hợp đồng nguồn lead ──────────────────────────────────────────────────────────── */
check('ROUTES.webDesign là URL sạch', ROUTES.webDesign, '/thiet-ke-website');
check('Nhãn module dùng chung (breadcrumb/SEO/nav)', WEB_DESIGN_MODULE_LABEL, 'Thiết kế website');
check('Slug `Service` để admin biên tập trong CMS', WEB_DESIGN_SERVICE_SLUG, 'thiet-ke-website');
check('Slug dịch vụ = segment URL (bỏ dấu gạch đầu)', ROUTES.webDesign.replace('/', ''), WEB_DESIGN_SERVICE_SLUG);

// Nguồn lead của trang phải là hằng số dùng chung, không phải chuỗi tự do trong component.
check('Nguồn lead của trang khớp `LEAD_SOURCE.webDesign`', WEB_DESIGN_LEAD_SOURCE, LEAD_SOURCE.webDesign);
check('Nguồn lead khác nguồn mặc định (website)', WEB_DESIGN_LEAD_SOURCE !== DEFAULT_LEAD_SOURCE, true);
check('Nhãn hiển thị của nguồn lead (tab Leads CMS)', leadSourceLabel(WEB_DESIGN_LEAD_SOURCE), 'Thiết kế website');
check(
  'Bộ lọc nguồn của tab Leads có mục web-design (lọc được lead của trang này)',
  LEAD_SOURCE_FILTERS.some(item => item.value === WEB_DESIGN_LEAD_SOURCE),
  true
);

/* ── 1. Route: `/thiet-ke-website` (kèm anchor của footer) ────────────────────────────────────── */
check('parsePath("/thiet-ke-website")', parsePath('/thiet-ke-website'), { page: 'web-design', matched: true });
check('parsePath("/thiet-ke-website#bang-gia") — bỏ hash', parsePath('/thiet-ke-website#bang-gia'), {
  page: 'web-design',
  matched: true
});
check('parsePath("/thiet-ke-website?utm=a") — bỏ query', parsePath('/thiet-ke-website?utm=a'), {
  page: 'web-design',
  matched: true
});
check('parsePath("/thiet-ke-website/abc") vẫn là trang web-design (không 404)', parsePath('/thiet-ke-website/abc').page, 'web-design');
check('URL rác ⇒ `matched=false` (P2.8 sẽ render 404)', parsePath('/khong-ton-tai').matched, false);

/* ── 2. `App` render đúng trang theo URL (không rơi về trang chủ) ──────────────────────────────── */
const PAGE_HTML = renderApp(ROUTES.webDesign);
const BOXED = WEB_DESIGN_PACKAGES.find(pkg => pkg.isHighlighted)!;
const PRICED = WEB_DESIGN_PACKAGES.find(pkg => pkg.price !== null)!;

/** React escape text node (`&` → `&amp;`, `<` → `&lt;`) ⇒ escape marker lấy từ dữ liệu trước khi so khớp. */
const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

checkHtml(
  `App ${ROUTES.webDesign} ⇒ trang "Thiết kế website"`,
  PAGE_HTML,
  [
    WEB_DESIGN_PAGE_TITLE, // h1 hero (mặc định, CMS có thể ghi đè)
    `Dịch vụ ${WEB_DESIGN_MODULE_LABEL}`, // nhãn trên hero
    // Anchor của từng khối — footer deep-link tới các id này.
    'id="bang-gia"',
    'id="du-an"',
    'id="quy-trinh"',
    'id="faq"',
    'id="dang-ky"',
    ...WEB_DESIGN_STATS.map(stat => escapeHtmlText(stat.value)), // chỉ số cam kết
    ...WEB_DESIGN_PACKAGES.map(pkg => escapeHtmlText(pkg.name)), // 3 gói dịch vụ
    ...WEB_DESIGN_PACKAGES.map(pkg => escapeHtmlText(pkg.tagline)),
    formatVnd(PRICED.price as number), // giá đã format vi-VN (không ghép thêm "đ" ⇒ tránh "₫đ")
    'Bảng giá dịch vụ', // badge khối bảng giá
    'Quy trình triển khai', // badge khối quy trình
    `Đăng ký ${escapeHtmlText(BOXED.name)}`, // CTA chính của gói đề xuất
    escapeHtmlText(WEB_DESIGN_STEPS[0].title), // bước 1 quy trình
    escapeHtmlText(WEB_DESIGN_STEPS[WEB_DESIGN_STEPS.length - 1].duration), // thời gian của bước cuối
    escapeHtmlText(WEB_DESIGN_PORTFOLIO[0].title), // portfolio thật
    escapeHtmlText(WEB_DESIGN_PORTFOLIO[0].result),
    escapeHtmlText(WEB_DESIGN_FAQS[0].q), // FAQ (khớp FAQPage JSON-LD)
    escapeHtmlText(WEB_DESIGN_FAQS[0].a.slice(0, 40)),
    'Nhận báo giá miễn phí', // CTA hero ⇒ cuộn xuống form
    'Họ tên người liên hệ *',
    'Số điện thoại *',
    'Gửi yêu cầu &amp; nhận báo giá'
  ],
  [HOME_MARKER]
);

// Select của form phải render thật các lựa chọn (khách chọn được loại website/ngân sách/tiến độ).
checkHtml(
  'Form đặt yêu cầu render đủ select loại website · ngân sách · tiến độ',
  PAGE_HTML,
  [WEB_DESIGN_TYPES[2], WEB_DESIGN_BUDGETS[3], WEB_DESIGN_DEADLINES[2]].map(option => `<option value="${option}"`)
);
check(
  'Select ngân sách: lựa chọn mặc định của form được render ở trạng thái `selected`',
  new RegExp(`<option value="${WEB_DESIGN_BUDGETS[1]}"[^>]*selected`).test(PAGE_HTML),
  true
);


/* ── 3. Trang tự render được khi SSR/context rỗng (nội dung tĩnh ⇒ SEO tốt) ─────────────────────── */
checkHtml(
  'WebDesignPage (context rỗng) vẫn đủ hero + bảng giá + form',
  renderPage(ROUTES.webDesign, <WebDesignPage />),
  [WEB_DESIGN_PAGE_TITLE, BOXED.name, WEB_DESIGN_FAQS[0].q, 'Gửi yêu cầu &amp; nhận báo giá'],
  [HOME_MARKER]
);

/* ── 4. Toàn vẹn dữ liệu (hợp đồng của page + JSON-LD + payload lead) ─────────────────────────── */
check('Có đúng 3 gói dịch vụ', WEB_DESIGN_PACKAGES.length, 3);
check(
  'Gói dịch vụ: id/tên/thời gian/giá khởi điểm không rỗng và khoá danh sách duy nhất',
  [
    new Set(WEB_DESIGN_PACKAGES.map(pkg => pkg.id)).size === WEB_DESIGN_PACKAGES.length,
    new Set(WEB_DESIGN_PACKAGES.map(pkg => pkg.name)).size === WEB_DESIGN_PACKAGES.length,
    WEB_DESIGN_PACKAGES.every(
      pkg => !!pkg.tagline.trim() && !!pkg.duration.trim() && !!pkg.bestFor.trim() && !!pkg.priceNote.trim()
    ),
    WEB_DESIGN_PACKAGES.every(pkg => pkg.price === null || (pkg.price > 0 && Number.isInteger(pkg.price))),
    WEB_DESIGN_PACKAGES.every(pkg => pkg.features.length >= 5 && new Set(pkg.features.map(f => f.label)).size === pkg.features.length),
    WEB_DESIGN_PACKAGES.every(pkg => pkg.features.some(f => f.included))
  ],
  [true, true, true, true, true, true]
);
check(
  'Đúng 1 gói được đề xuất (`isHighlighted`) — CTA chính không bị mơ hồ',
  WEB_DESIGN_PACKAGES.filter(pkg => pkg.isHighlighted).length,
  1
);
check(
  'Gói rẻ nhất là gói Khởi Nghiệp, gói đề xuất nằm giữa khoảng giá',
  [
    Math.min(...WEB_DESIGN_PACKAGES.map(pkg => pkg.price ?? Number.MAX_SAFE_INTEGER)) === WEB_DESIGN_PACKAGES[0].price,
    BOXED.price !== null &&
      BOXED.price > WEB_DESIGN_PACKAGES[0].price! &&
      BOXED.price < WEB_DESIGN_PACKAGES[2].price!
  ],
  [true, true]
);

check('Quy trình 5 bước đánh số liên tục 1..5', WEB_DESIGN_STEPS.map(step => step.step), [1, 2, 3, 4, 5]);
check(
  'Bước quy trình: tiêu đề/mô tả/thời gian không rỗng, tiêu đề duy nhất',
  [
    WEB_DESIGN_STEPS.every(step => !!step.title.trim() && step.desc.trim().length > 40 && !!step.duration.trim()),
    new Set(WEB_DESIGN_STEPS.map(step => step.title)).size === WEB_DESIGN_STEPS.length
  ],
  [true, true]
);

check('Portfolio có ít nhất 3 dự án mẫu', WEB_DESIGN_PORTFOLIO.length >= 3, true);
check(
  'Portfolio: id/tiêu đề duy nhất, ảnh + demoUrl + kết quả đầy đủ (tránh khối rỗng)',
  [
    new Set(WEB_DESIGN_PORTFOLIO.map(item => item.id)).size === WEB_DESIGN_PORTFOLIO.length,
    new Set(WEB_DESIGN_PORTFOLIO.map(item => item.title)).size === WEB_DESIGN_PORTFOLIO.length,
    WEB_DESIGN_PORTFOLIO.every(
      item =>
        !!item.industry.trim() &&
        item.image.startsWith('https://') &&
        item.demoUrl.startsWith('/') &&
        item.result.trim().length > 20 &&
        item.tags.length > 0
    )
  ],
  [true, true, true]
);

check('FAQ có ít nhất 4 câu', WEB_DESIGN_FAQS.length >= 4, true);
check(
  'FAQ: câu hỏi duy nhất, câu trả lời đủ dài để lên FAQPage JSON-LD',
  [
    new Set(WEB_DESIGN_FAQS.map(faq => faq.q)).size === WEB_DESIGN_FAQS.length,
    WEB_DESIGN_FAQS.every(faq => faq.q.trim().endsWith('?') && faq.a.trim().length > 60)
  ],
  [true, true]
);

check('Chỉ số cam kết hero: 4 chỉ số, value + label đầy đủ', WEB_DESIGN_STATS.length, 4);
check('Chỉ số cam kết không rỗng', WEB_DESIGN_STATS.every(s => !!s.value.trim() && !!s.label.trim()), true);

check(
  'Select của form: loại website / ngân sách / tiến độ đều có lựa chọn và không trùng',
  [
    WEB_DESIGN_TYPES.length > 0,
    WEB_DESIGN_BUDGETS.length > 0,
    WEB_DESIGN_DEADLINES.length > 0,
    new Set(WEB_DESIGN_TYPES).size === WEB_DESIGN_TYPES.length,
    new Set(WEB_DESIGN_BUDGETS).size === WEB_DESIGN_BUDGETS.length,
    new Set(WEB_DESIGN_DEADLINES).size === WEB_DESIGN_DEADLINES.length
  ],
  [true, true, true, true, true, true]
);
check(
  'Giá trị mặc định của form nằm trong danh sách lựa chọn (select không bị rỗng option)',
  [
    WEB_DESIGN_TYPES.includes(EMPTY_WEB_DESIGN_FORM.websiteType),
    WEB_DESIGN_BUDGETS.includes(EMPTY_WEB_DESIGN_FORM.budget),
    WEB_DESIGN_DEADLINES.includes(EMPTY_WEB_DESIGN_FORM.deadline),
    EMPTY_WEB_DESIGN_FORM.name === '' && EMPTY_WEB_DESIGN_FORM.phone === ''
  ],
  [true, true, true, true]
);

/* ── 5. Form ⇒ Lead: validate + payload gửi CRM (điểm cốt lõi của P2.3) ────────────────────────── */
const VALID_FORM: WebDesignFormState = {
  ...EMPTY_WEB_DESIGN_FORM,
  name: '  Nguyễn Văn A  ',
  phone: '0912 345 678',
  email: '  a@congty.vn  ',
  websiteType: WEB_DESIGN_TYPES[1],
  budget: WEB_DESIGN_BUDGETS[2],
  deadline: WEB_DESIGN_DEADLINES[0],
  message: '  Cần website bán hàng 200 sản phẩm, thanh toán online.  '
};

check('Form hợp lệ ⇒ không có lỗi (cho phép gửi)', validateWebDesignForm(VALID_FORM), []);
check(
  'Form rỗng ⇒ đúng 2 lỗi bắt buộc (họ tên + SĐT)',
  validateWebDesignForm(EMPTY_WEB_DESIGN_FORM).length,
  2
);
check(
  'SĐT quá ngắn / quá dài đều bị chặn',
  [
    validateWebDesignForm({ ...VALID_FORM, phone: '12345' }).length,
    validateWebDesignForm({ ...VALID_FORM, phone: '1234567890123' }).length
  ],
  [1, 1]
);
check(
  'SĐT có khoảng trắng / mã +84 vẫn hợp lệ (chuẩn hoá trước khi đếm)',
  validateWebDesignForm({ ...VALID_FORM, phone: '+84 912 345 678' }),
  []
);
check(
  'Email sai định dạng ⇒ báo lỗi; bỏ trống email thì không bắt buộc',
  [
    validateWebDesignForm({ ...VALID_FORM, email: 'khong-co-a-cong' }),
    validateWebDesignForm({ ...VALID_FORM, email: '' })
  ],
  [['Email chưa hợp lệ.'], []]
);
check(
  'Mô tả ngắn (< 10 ký tự) ⇒ yêu cầu viết rõ hơn; mô tả trống vẫn gửi được',
  [
    validateWebDesignForm({ ...VALID_FORM, message: 'ngắn' }).length,
    validateWebDesignForm({ ...VALID_FORM, message: '' }).length
  ],
  [1, 0]
);

const LEAD = buildWebDesignLead(VALID_FORM);
check('Lead type = "contact"', LEAD.type, 'contact');
check('Lead source = "web-design" (lọc được trong tab Leads)', LEAD.source, WEB_DESIGN_LEAD_SOURCE);
check('Lead KHÔNG gửi `status` (server luôn gán "new")', LEAD.status, undefined);
check(
  'Lead trim dữ liệu khách nhập (họ tên · SĐT · email)',
  [LEAD.name, LEAD.phone, LEAD.email],
  ['Nguyễn Văn A', '0912 345 678', 'a@congty.vn']
);
check('Tiêu đề lead gắn loại website để sale đọc nhanh', LEAD.subject, `[Thiết kế website] ${WEB_DESIGN_TYPES[1]}`);
check(
  'Nội dung lead có đủ loại website · ngân sách · tiến độ · mô tả',
  [
    (LEAD.message || '').includes(WEB_DESIGN_TYPES[1]),
    (LEAD.message || '').includes(WEB_DESIGN_BUDGETS[2]),
    (LEAD.message || '').includes(WEB_DESIGN_DEADLINES[0]),
    (LEAD.message || '').includes('Cần website bán hàng 200 sản phẩm, thanh toán online.')
  ],
  [true, true, true, true]
);
check(
  'Khách bỏ trống phần tuỳ chọn ⇒ lead không rò "undefined"/"null"',
  /undefined|null/.test(
    buildWebDesignLead({ ...EMPTY_WEB_DESIGN_FORM, name: 'Trần Thị B', phone: '0912345678' }).message || ''
  ),
  false
);
check(
  'Thiếu loại website/ngân sách/tiến độ ⇒ subject & message có câu chữ thay thế',
  [
    buildWebDesignSubject({ ...EMPTY_WEB_DESIGN_FORM, websiteType: '' }),
    buildWebDesignMessage({ ...EMPTY_WEB_DESIGN_FORM, websiteType: '', budget: '', deadline: '', message: '' })
  ],
  [
    '[Thiết kế website] Chưa chọn loại website',
    'Loại website: Chưa chọn\nNgân sách dự kiến: Chưa chọn\nThời gian mong muốn: Chưa chọn\nMô tả dự án: (khách chưa mô tả thêm)'
  ]
);

/* ── 6. Lối vào từ menu/footer: trang không còn "mồ côi" (Navbar + Footer + deep-link) ───────────── */
const homeHtml = renderApp(ROUTES.home);
checkHtml('Trang chủ có lối vào "Thiết kế website" (Navbar/Footer)', homeHtml, [
  WEB_DESIGN_MODULE_LABEL, // nhãn module ở Navbar + Footer
  `href="${ROUTES.webDesign}"`, // Navbar (desktop + mobile) + Footer "Tổng quan dịch vụ"
  `href="${ROUTES.webDesign}#bang-gia"`,
  `href="${ROUTES.webDesign}#du-an"`,
  `href="${ROUTES.webDesign}#quy-trinh"`,
  `href="${ROUTES.webDesign}#faq"`,
  `href="${ROUTES.webDesign}#dang-ky"`
]);
checkHtml('Trang dịch vụ vẫn có Navbar + Footer (layout chung)', PAGE_HTML, [
  WEB_DESIGN_MODULE_LABEL,
  `href="${ROUTES.services}"` // link "Xem toàn bộ dịch vụ" ở hero
]);

console.log(
  `\n${
    failed === 0
      ? `OK: ${passed} assertion đạt — trang dịch vụ "Thiết kế website" (P2.3).`
      : `${failed} assertion KHONG dat (${passed} đạt).`
  }`
);
process.exit(failed === 0 ? 0 : 1);




