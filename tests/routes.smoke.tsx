/**
 * P0.1 — Smoke test định tuyến: kiểm tra mỗi URL render đúng trang tương ứng.
 *
 * Chạy: `npm run test:routes`
 * Cách hoạt động: render phía server (SSR) `App` trong `MemoryRouter` với từng URL rồi assert
 * marker đặc trưng của trang. Effect (fetch API) không chạy khi SSR nên test không cần backend.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.tsx';

interface RouteCase {
  path: string;
  expect: string;
  /** P1.3 — assert thêm cho trang nhiều khối: chắc chắn render đủ, không chỉ đúng h1. */
  alsoExpect?: string[];
  /** Marker **không** được xuất hiện (VD: chứng minh URL lạ không rơi về trang chủ). */
  absent?: string[];
  note?: string;
}

const cases: RouteCase[] = [
  { path: '/', expect: 'Danh Mục Công Nghệ Nổi Bật' },
  { path: '/san-pham', expect: 'Đang tải danh sách sản phẩm...' },
  { path: '/san-pham/macbook-air-m3', expect: 'Đang tải thông tin sản phẩm...' },
  // P2.1 — `/danh-muc/:slug` và `/thuong-hieu/:slug` nay là **trang riêng** (không còn rơi về HomePage).
  // SSR chưa fetch danh mục/hãng nên trang hiện trạng thái “đang tải”; nội dung thật kiểm ở
  // `tests/catalog.smoke.ts` (dữ liệu) + `tests/catalogUi.smoke.tsx` (route + hợp đồng URL).
  { path: '/danh-muc/laptop', expect: 'Đang tải danh mục...' },
  { path: '/danh-muc/laptop-gaming', expect: 'Đang tải danh mục...', note: 'danh mục cấp 2' },
  { path: '/thuong-hieu/apple', expect: 'Đang tải thương hiệu...' },
  { path: '/tin-tuc', expect: 'Đang tải tin tức công nghệ...' },
  { path: '/tin-tuc/bai-viet-abc', expect: 'Đang tải tin tức công nghệ...' },
  { path: '/dich-vu', expect: 'Đang tải thông tin dịch vụ...' },
  { path: '/dich-vu/sua-chua-laptop', expect: 'Đang tải thông tin dịch vụ...' },
  { path: '/bang-gia', expect: 'Bảng Giá Niêm Yết Thiết Bị Công Nghệ 2025' },
  // P2.8 — 2 trang này trước đây chỉ có `BreadcrumbList` JSON-LD mà **không** hiển thị dải breadcrumb
  // (Google khuyến nghị structured data phải khớp nội dung nhìn thấy) ⇒ nay assert cả dải hiển thị.
  {
    path: '/gioi-thieu',
    expect: 'Kiến Tạo Chuẩn Mực Bán Lẻ',
    alsoExpect: ['aria-label="Breadcrumb"', '>Giới thiệu</span>'],
    note: 'P2.8 → breadcrumb dùng chung'
  },
  {
    path: '/lien-he',
    expect: 'Liên Hệ Với Đội Ngũ GPSOFT',
    alsoExpect: ['aria-label="Breadcrumb"', '>Liên hệ</span>'],
    note: 'P2.8 → breadcrumb dùng chung'
  },
  // P2.8 — trang dịch vụ thiết kế website: mắt cuối breadcrumb = tên module (khớp `crumbJsonLd`).
  {
    path: '/thiet-ke-website',
    expect: 'Nhận báo giá miễn phí',
    alsoExpect: ['aria-label="Breadcrumb"', '>Thiết kế website</span>'],
    note: 'P2.8 → breadcrumb + JSON-LD cùng nguồn'
  },
  { path: '/trang/chinh-sach-bao-hanh', expect: 'Đang tải nội dung trang...' },
  // P1.3 — trang tra cứu bảo hành công khai (SSR: form + khối chính sách + FAQ hiển thị thật, chưa có kết quả).
  // `alsoExpect` cố ý kiểm cả 3 khối nằm ở 3 đoạn khác nhau của file ⇒ phát hiện sớm nếu 1 khối bị mất khi sửa.
  {
    path: '/bao-hanh',
    expect: 'Tra Cứu Bảo Hành',
    alsoExpect: [
      'Nhập số điện thoại, số serial hoặc mã phiếu',
      'Chính Sách Bảo Hành GPSOFT',
      'Câu Hỏi Thường Gặp Về Bảo Hành'
    ]
  },
  // P1.6 — Link Báo Giá công khai: SSR chưa fetch nên hiện trạng thái “đang tải phiếu báo giá”.
  {
    path: '/bao-gia/BG7K2M9Q',
    expect: 'Đang tải phiếu báo giá...'
  },
  // P2.2 — module "Phần mềm chấm công": dữ liệu tĩnh nên SSR render đủ hero + 4 tab (SEO tốt).
  // Tab mặc định = URL sạch; `?tab=` đổi sang tab khác (URL là nguồn sự thật của tab).
  {
    path: '/phan-mem-cham-cong',
    expect: 'Phần mềm chấm công',
    // P2.8 — dải breadcrumb nay dùng component chung (`Trang chủ › Phần mềm chấm công › <tab>`).
    alsoExpect: [
      'Chấm công',
      'Nhân sự',
      'Tiền lương',
      'Kiểm xưởng',
      'Nhận demo miễn phí',
      'aria-label="Breadcrumb"'
    ],
    note: 'tab mặc định (URL sạch)'
  },
  {
    path: '/phan-mem-cham-cong?tab=nhan-su',
    expect: 'Phần mềm nhân sự',
    alsoExpect: ['Quy trình nhân sự khép kín', 'Nhận demo miễn phí', '>Nhân sự</span>'],
    note: 'P2.2 → tab qua `?tab=`'
  },
  // P2.8 — tìm kiếm toàn site `/tim-kiem?q=` (dữ liệu lấy từ API nên SSR chỉ có khung + breadcrumb).
  {
    path: '/tim-kiem',
    expect: 'Tìm kiếm toàn site',
    alsoExpect: ['Nhập tên sản phẩm, bài viết hoặc dịch vụ bạn cần tìm.'],
    note: 'P2.8 → chưa có từ khóa'
  },
  {
    path: '/tim-kiem?q=laptop',
    expect: 'Kết quả cho',
    alsoExpect: ['Tìm thấy 0 kết quả trong sản phẩm, bài viết và dịch vụ.'],
    note: 'P2.8 → từ khóa ở query string'
  },
  // P2.8 — URL không khớp route nào render **trang 404** (trước P2.8 rơi về trang chủ ⇒ khách tưởng
  // mình gõ đúng link + Google thấy trùng lặp nội dung với `/`). `absent` chốt đúng lỗi cũ đó.
  {
    path: '/khong-ton-tai-404',
    expect: 'Lỗi 404 — Trang không tồn tại',
    alsoExpect: ['Không tìm thấy trang bạn cần', 'Tìm kiếm sản phẩm, bài viết, dịch vụ'],
    absent: ['Danh Mục Công Nghệ Nổi Bật'],
    note: 'P2.8 → trang 404'
  },
  // P2.10 — cửa vào CMS là URL **ẩn** `/login-admin`: render form đăng nhập, KHÔNG Navbar/Footer và
  // không lộ chuỗi lối vào. SSR chưa chạy effect nên hiện màn hình "đang kiểm tra phiên".
  {
    path: '/login-admin',
    expect: 'Đang kiểm tra phiên đăng nhập',
    absent: ['Danh Mục Công Nghệ Nổi Bật', 'Hotline tư vấn', 'Quản trị CMS', 'Tài khoản demo'],
    note: 'P2.10 → cửa vào CMS (URL ẩn)'
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    // React SSR chèn `<!-- -->` giữa các text node liền kề ⇒ gỡ comment để marker khớp như UI thật.
    const html = renderToString(
      <MemoryRouter initialEntries={[testCase.path]}>
        <App />
      </MemoryRouter>
    ).replace(/<!--[\s\S]*?-->/g, '');
    const markers = [testCase.expect, ...(testCase.alsoExpect ?? [])];
    const missing = markers.filter(marker => !html.includes(marker));
    // Marker cấm xuất hiện (VD marker HomePage ở URL lạ) — bắt hồi quy "rơi về trang chủ".
    const leaked = (testCase.absent ?? []).filter(marker => html.includes(marker));
    // P2.8 — bất biến toàn site: mỗi trang chỉ được render **một** dải breadcrumb (`<Breadcrumb>` dùng
    // chung). Trang có 2 nhánh (`NewsPage` chi tiết/danh sách) cũng chỉ được lọt 1 dải ra HTML.
    const breadcrumbs = (html.match(/aria-label="Breadcrumb"/g) ?? []).length;
    const passed = missing.length === 0 && leaked.length === 0 && breadcrumbs <= 1;
    if (!passed) failed += 1;
    console.log(
      `${passed ? 'PASS' : 'FAIL'}  ${testCase.path}  ->  ${markers.join(' | ')}${testCase.note ? `  (${testCase.note})` : ''}${
        passed
          ? ''
          : `  << thieu: ${missing.join(' · ')}${leaked.length ? ` | lot: ${leaked.join(' · ')}` : ''}${
              breadcrumbs > 1 ? ` | breadcrumb lap x${breadcrumbs}` : ''
            }`
      }`
    );
  } catch (error) {
    failed += 1;
    console.log(`ERROR ${testCase.path} -> ${(error as Error).message}`);
  }
}

console.log(
  failed === 0 ? '\nOK: mọi URL render đúng trang.' : `\n${failed} URL KHONG dat.`
);
process.exit(failed === 0 ? 0 : 1);
