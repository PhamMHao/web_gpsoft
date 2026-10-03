/**
 * P2.3 — Dữ liệu trang dịch vụ **Thiết kế website** `/thiet-ke-website`.
 *
 * Vì sao tách ra file util (không viết thẳng trong page):
 * 1. **Hợp đồng dữ liệu** (bảng giá · quy trình · dự án mẫu · FAQ · loại website/ngân sách/deadline) là
 *    nguồn của khối nội dung tĩnh, khối FAQ JSON-LD **và** payload lead gửi về CRM ⇒ smoke test
 *    (`tests/webDesignUi.smoke.tsx`) chốt được tính toàn vẹn dữ liệu mà không cần backend.
 * 2. `buildWebDesignLead()` là hàm thuần ⇒ cùng một chỗ kiểm "form yêu cầu ⇒ Lead có `source`
 *    `web-design`", tránh việc page tự ghép chuỗi rồi lệch với CMS.
 *
 * Trang này KHÔNG cần bảng DB mới: nội dung là tĩnh theo đặc tả, phần mô tả/dịch vụ có thể ghi đè
 * bằng `Service` slug `thiet-ke-website` do admin quản trị trong CMS (tab Dịch vụ kỹ thuật).
 */
import type { Lead } from '../types/index.ts';
import { formatVnd } from './format.ts';

/** Nhãn module dùng chung (Navbar/Footer/breadcrumb/SEO title). */
export const WEB_DESIGN_MODULE_LABEL = 'Thiết kế website';
/** Tiêu đề H1 mặc định (bị ghi đè nếu CMS có `Service` slug `thiet-ke-website`). */
export const WEB_DESIGN_PAGE_TITLE = 'Thiết Kế Website Chuyên Nghiệp Cho Doanh Nghiệp';
/** Mô tả dưới H1 mặc định (cũng là `shortDesc` của service seed ⇒ CMS sửa là trang đổi theo). */
export const WEB_DESIGN_PAGE_DESC =
  'GPSOFT thiết kế website chuẩn SEO, tối ưu chuyển đổi cho doanh nghiệp: từ website giới thiệu đến hệ thống thương mại điện tử nhiều kho — bàn giao đúng hạn, kèm CMS tự quản trị.';
/** `Service.slug` mà admin biên tập trong CMS ⇒ trang public đổi nội dung, không phải sửa code. */
export const WEB_DESIGN_SERVICE_SLUG = 'thiet-ke-website';
/** `Lead.source` — nguồn lead, hiển thị trong tab Leads của CMS. */
export const WEB_DESIGN_LEAD_SOURCE = 'web-design';
/** Chỉ số cam kết hiển thị ngay dưới hero (số dự án, thời gian, tỷ lệ hài lòng). */
export const WEB_DESIGN_STATS: Array<{ value: string; label: string }> = [
  { value: '320+', label: 'Website đã bàn giao' },
  { value: '3–6 tuần', label: 'Thời gian triển khai' },
  { value: '98%', label: 'Khách hàng hài lòng' },
  { value: '24/7', label: 'Hỗ trợ sau bàn giao' }
];

/** Gói dịch vụ thiết kế website (giá là giá khởi điểm, chưa VAT). */
export interface WebDesignPackage {
  id: string;
  name: string;
  tagline: string;
  /** Giá khởi điểm (VND); `null` ⇒ "Báo giá theo yêu cầu". */
  price: number | null;
  priceNote: string;
  duration: string;
  bestFor: string;
  /** Gói được đề xuất — hiển thị nổi bật và là CTA chính. */
  isHighlighted: boolean;
  features: Array<{ label: string; included: boolean }>;
}

export const WEB_DESIGN_PACKAGES: WebDesignPackage[] = [
  {
    id: 'web-start',
    name: 'Gói Khởi Nghiệp',
    tagline: 'Website giới thiệu gọn nhẹ, chạy được ngay trong 2 tuần',
    price: 4900000,
    priceNote: 'Giá khởi điểm, chưa VAT',
    duration: '2 – 3 tuần',
    bestFor: 'Cửa hàng mới, cá nhân kinh doanh, hồ sơ năng lực doanh nghiệp nhỏ',
    isHighlighted: false,
    features: [
      { label: 'Thiết kế 5 – 7 trang theo bộ nhận diện sẵn có', included: true },
      { label: 'Chuẩn responsive mobile / tablet / desktop', included: true },
      { label: 'Form liên hệ đổ về email + CRM GPSOFT', included: true },
      { label: 'Chuẩn SEO on-page cơ bản (title, meta, sitemap)', included: true },
      { label: 'Tên miền + hosting 1 năm', included: true },
      { label: 'Tích hợp giỏ hàng & thanh toán online', included: false },
      { label: 'Đa ngôn ngữ (Việt – Anh)', included: false }
    ]
  },
  {
    id: 'web-business',
    name: 'Gói Doanh Nghiệp',
    tagline: 'Website bán hàng chuyên nghiệp, tối ưu chuyển đổi và SEO',
    price: 12900000,
    priceNote: 'Giá khởi điểm, chưa VAT',
    duration: '3 – 5 tuần',
    bestFor: 'Doanh nghiệp cần quản lý sản phẩm, tin tức, khách hàng và đo lường marketing',
    isHighlighted: true,
    features: [
      { label: 'Thiết kế không giới hạn trang trên CMS riêng (GPSOFT CMS)', included: true },
      { label: 'Giỏ hàng, mã giảm giá, phí vận chuyển, thanh toán VietQR/COD', included: true },
      { label: 'Quản trị sản phẩm – đơn hàng – khách hàng – tin tức', included: true },
      { label: 'Blog chuẩn SEO + dữ liệu có cấu trúc schema.org', included: true },
      { label: 'Tích hợp Google Analytics 4 & Search Console', included: true },
      { label: 'Tối ưu tốc độ (Lighthouse ≥ 90) + sao lưu định kỳ', included: true },
      { label: 'Đa ngôn ngữ (Việt – Anh)', included: false }
    ]
  },
  {
    id: 'web-ecommerce',
    name: 'Gói Thương Mại Điện Tử',
    tagline: 'Hệ thống TMĐT quy mô lớn, nhiều kho và nhiều kênh bán hàng',
    price: 25900000,
    priceNote: 'Hoặc báo giá theo khối lượng tính năng',
    duration: '5 – 8 tuần',
    bestFor: 'Chuỗi bán lẻ, sàn TMĐT nội bộ, doanh nghiệp cần tích hợp ERP/kho vận',
    isHighlighted: false,
    features: [
      { label: 'Toàn bộ tính năng của gói Doanh Nghiệp', included: true },
      { label: 'Đa kho, đa chi nhánh, phân quyền theo vai trò', included: true },
      { label: 'Đồng bộ tồn kho & đơn hàng với ERP/hệ thống kế toán', included: true },
      { label: 'Đa ngôn ngữ (Việt – Anh) + đa tiền tệ', included: true },
      { label: 'Tích hợp vận chuyển (GHN, GHTK, Viettel Post) và Zalo/SMS', included: true },
      { label: 'Báo cáo doanh thu, phễu chuyển đổi, hành vi khách hàng', included: true },
      { label: 'Cam kết SLA hỗ trợ 4 giờ, bảo trì 12 tháng', included: true }
    ]
  }
];

/** Một bước trong quy trình triển khai website. */
export interface WebDesignStep {
  step: number;
  title: string;
  desc: string;
  duration: string;
}

export const WEB_DESIGN_STEPS: WebDesignStep[] = [
  {
    step: 1,
    title: 'Khảo sát & Tư vấn giải pháp',
    desc: 'Phân tích ngành hàng, đối thủ và mục tiêu kinh doanh; chốt sitemap, luồng người dùng và chỉ số đo lường thành công.',
    duration: '1 – 3 ngày'
  },
  {
    step: 2,
    title: 'Thiết kế UI/UX & Kịch bản nội dung',
    desc: 'Dựng wireframe rồi thiết kế giao diện Figma theo bộ nhận diện thương hiệu; thống nhất nội dung, hình ảnh và điểm nhấn chuyển đổi.',
    duration: '4 – 7 ngày'
  },
  {
    step: 3,
    title: 'Lập trình & Nhập liệu',
    desc: 'Phát triển frontend/backend, cấu hình CMS để khách tự quản trị, nhập dữ liệu mẫu và tối ưu hiển thị trên mọi kích thước màn hình.',
    duration: '1 – 3 tuần'
  },
  {
    step: 4,
    title: 'Kiểm thử & Bàn giao',
    desc: 'Test đa trình duyệt, kiểm tra tốc độ – bảo mật – SEO kỹ thuật, đào tạo admin và bàn giao tài khoản, mã nguồn, tài liệu.',
    duration: '2 – 4 ngày'
  },
  {
    step: 5,
    title: 'Bảo trì, SEO & Đồng hành sau bàn giao',
    desc: 'Theo dõi uptime 24/7, sao lưu định kỳ, hỗ trợ cập nhật nội dung miễn phí 12 tháng và tối ưu SEO theo từ khoá ngành.',
    duration: '12 tháng'
  }
];

/** Dự án mẫu đã bàn giao (portfolio hiển thị thật, có link demo để khách xem nhanh). */
export interface WebDesignPortfolioItem {
  id: string;
  title: string;
  industry: string;
  image: string;
  demoUrl: string;
  result: string;
  tags: string[];
}

export const WEB_DESIGN_PORTFOLIO: WebDesignPortfolioItem[] = [
  {
    id: 'wd-proj-1',
    title: 'GPSOFT Store — Website bán lẻ công nghệ',
    industry: 'Bán lẻ công nghệ',
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/san-pham',
    result: 'Tăng 42% tỷ lệ chuyển đổi sau 3 tháng nhờ tối ưu trang sản phẩm.',
    tags: ['CMS riêng', 'VietQR', 'SEO kỹ thuật']
  },
  {
    id: 'wd-proj-2',
    title: 'Nova Clinic — Hệ thống đặt lịch khám',
    industry: 'Y tế & Sức khoẻ',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/lien-he',
    result: 'Giảm 60% cuộc gọi đặt lịch, bác sĩ tự quản lý ca khám.',
    tags: ['Đặt lịch', 'Đa chi nhánh', 'Zalo OA']
  },
  {
    id: 'wd-proj-3',
    title: 'An Phát Logistics — Website dịch vụ vận tải',
    industry: 'Vận tải & Logistics',
    image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/dich-vu',
    result: 'Traffic tự nhiên tăng 3,1 lần nhờ 120 bài viết chuẩn SEO.',
    tags: ['Blog SEO', 'Đa ngôn ngữ', 'Máy tính phí']
  },
  {
    id: 'wd-proj-4',
    title: 'Mộc House — Nội thất & Landing báo giá',
    industry: 'Nội thất',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/lien-he',
    result: 'Chi phí quảng cáo trên mỗi lead giảm 28%.',
    tags: ['Landing page', 'Form báo giá', 'GA4']
  },
  {
    id: 'wd-proj-5',
    title: 'Bếp Việt Catering — Đặt tiệc trực tuyến',
    industry: 'F&B',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/lien-he',
    result: '70% đơn tiệc được chốt online, không cần gọi xác nhận.',
    tags: ['Giỏ hàng', 'Thanh toán online', 'Mobile-first']
  },
  {
    id: 'wd-proj-6',
    title: 'EduSmart Academy — Website khoá học',
    industry: 'Giáo dục',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    demoUrl: '/tin-tuc',
    result: 'Tuyển sinh online chiếm 55% tổng học viên mới.',
    tags: ['Khoá học', 'Video bài giảng', 'CRM']
  }
];

/** Câu hỏi thường gặp — hiển thị thật và khớp `FAQPage` JSON-LD. */
export const WEB_DESIGN_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Chi phí thiết kế website đã bao gồm tên miền và hosting chưa?',
    a: 'Gói Khởi Nghiệp đã bao gồm tên miền quốc tế và hosting 1 năm. Với gói Doanh Nghiệp và Thương Mại Điện Tử, GPSOFT tư vấn cấu hình VPS/Cloud phù hợp lưu lượng và báo giá minh bạch theo tháng, không phát sinh chi phí ẩn.'
  },
  {
    q: 'Tôi có tự cập nhật nội dung website sau khi bàn giao không?',
    a: 'Có. Mọi website GPSOFT triển khai đều kèm trang quản trị riêng (GPSOFT CMS) để bạn tự thêm sản phẩm, bài viết, banner, mã giảm giá và xem dữ liệu khách hàng gửi về. Bạn được đào tạo trực tiếp 1 buổi cùng tài liệu hướng dẫn tiếng Việt.'
  },
  {
    q: 'Thời gian hoàn thành một website là bao lâu?',
    a: 'Website giới thiệu thường 2 – 3 tuần, website bán hàng 3 – 5 tuần, hệ thống TMĐT nhiều kho 5 – 8 tuần. Tiến độ theo dõi qua bảng công việc chung và khách hàng xem trước bản demo ở từng mốc để duyệt nhanh.'
  },
  {
    q: 'Website có chuẩn SEO và chạy quảng cáo được ngay không?',
    a: 'GPSOFT cấu hình sẵn SEO on-page (title, meta description, canonical, sitemap.xml, robots.txt, dữ liệu có cấu trúc schema.org) và gắn Google Analytics 4, Google Tag Manager, Meta Pixel. Bàn giao là chạy quảng cáo và đo lường được ngay.'
  },
  {
    q: 'Sau bàn giao có được hỗ trợ bảo trì không?',
    a: 'Có. GPSOFT bảo hành kỹ thuật 12 tháng: theo dõi uptime, sao lưu định kỳ, xử lý lỗi phát sinh và hỗ trợ cập nhật nội dung miễn phí. Yêu cầu thêm tính năng mới được báo giá riêng theo khối lượng.'
  }
];

/** Loại website cho form đặt yêu cầu (giá trị gửi lên nằm trong `subject`/`message` của lead). */
export const WEB_DESIGN_TYPES: string[] = [
  'Website giới thiệu doanh nghiệp',
  'Website bán hàng / Thương mại điện tử',
  'Landing page bán hàng',
  'Website dịch vụ / Đặt lịch',
  'Hệ thống web app / Quản trị nội bộ',
  'Thiết kế lại website đang dùng'
];

/** Khoảng ngân sách dự kiến của khách. */
export const WEB_DESIGN_BUDGETS: string[] = [
  'Dưới 5 triệu',
  '5 – 15 triệu',
  '15 – 30 triệu',
  'Trên 30 triệu',
  'Cần GPSOFT tư vấn thêm'
];

/** Tiến độ mong muốn. */
export const WEB_DESIGN_DEADLINES: string[] = [
  'Gấp (dưới 2 tuần)',
  '2 – 4 tuần',
  '1 – 2 tháng',
  'Chưa gấp, linh hoạt'
];

/** Trạng thái form đặt yêu cầu (khớp đúng các ô nhập trên trang). */
export interface WebDesignFormState {
  name: string;
  phone: string;
  email: string;
  websiteType: string;
  budget: string;
  deadline: string;
  message: string;
}

export const EMPTY_WEB_DESIGN_FORM: WebDesignFormState = {
  name: '',
  phone: '',
  email: '',
  websiteType: WEB_DESIGN_TYPES[0],
  budget: WEB_DESIGN_BUDGETS[1],
  deadline: WEB_DESIGN_DEADLINES[1],
  message: ''
};

/**
 * Kiểm tra form trước khi gửi — trả về mảng thông báo lỗi (rỗng ⇒ hợp lệ).
 * Tách khỏi component để smoke test chốt được luật validate (SĐT Việt Nam 9 – 11 số).
 */
export function validateWebDesignForm(form: WebDesignFormState): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Vui lòng nhập họ tên người liên hệ.');
  const phone = form.phone.replace(/[^\d]/g, '');
  if (!phone) errors.push('Vui lòng nhập số điện thoại.');
  else if (phone.length < 9 || phone.length > 11) errors.push('Số điện thoại chưa hợp lệ (9 – 11 số).');
  if (form.email.trim() && !form.email.includes('@')) errors.push('Email chưa hợp lệ.');
  if (form.message.trim().length > 0 && form.message.trim().length < 10) {
    errors.push('Mô tả dự án cần ít nhất 10 ký tự.');
  }
  return errors;
}

/** Tiêu đề lead: gắn loại website để nhân viên CRM đọc là biết ngay nhu cầu. */
export function buildWebDesignSubject(form: WebDesignFormState): string {
  return `[Thiết kế website] ${form.websiteType || 'Chưa chọn loại website'}`;
}

/** Nội dung lead: gom loại website · ngân sách · tiến độ · mô tả chi tiết. */
export function buildWebDesignMessage(form: WebDesignFormState): string {
  return [
    `Loại website: ${form.websiteType || 'Chưa chọn'}`,
    `Ngân sách dự kiến: ${form.budget || 'Chưa chọn'}`,
    `Thời gian mong muốn: ${form.deadline || 'Chưa chọn'}`,
    `Mô tả dự án: ${form.message.trim() || '(khách chưa mô tả thêm)'}`
  ].join('\n');
}

/**
 * Payload gửi `POST /api/leads` ⇒ lead xuất hiện trong tab Leads của CMS với
 * `source = 'web-design'`. Không gửi `status` (server luôn gán `new`).
 */
export function buildWebDesignLead(form: WebDesignFormState): Partial<Lead> {
  return {
    type: 'contact',
    source: WEB_DESIGN_LEAD_SOURCE,
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    subject: buildWebDesignSubject(form),
    message: buildWebDesignMessage(form)
  };
}

/** Các gói có giá cụ thể (bỏ gói "Báo giá riêng") — dùng cho khung giá của service seed. */
const WEB_DESIGN_PACKAGE_PRICES: number[] = WEB_DESIGN_PACKAGES.map(pkg => pkg.price).filter(
  (price): price is number => price !== null
);

/** Khung giá hiển thị trong CMS/public (`Service.priceRange`) — suy ra từ bảng giá, không gõ tay. */
export const WEB_DESIGN_SERVICE_PRICE_RANGE = `Từ ${formatVnd(
  Math.min(...WEB_DESIGN_PACKAGE_PRICES)
)} - ${formatVnd(Math.max(...WEB_DESIGN_PACKAGE_PRICES))}`;

/**
 * `Service` seed cho `WEB_DESIGN_SERVICE_SLUG` — **một nguồn duy nhất** cho 2 đường:
 * 1. `server/db.ts` seed cho cài đặt mới (DB cũ thì admin bấm nút trong CMS, idempotent);
 * 2. `ServicesView` nút "Tạo dịch vụ Thiết kế website" ⇒ `api.createService(WEB_DESIGN_SERVICE_SEED)`.
 *
 * Quy trình/FAQ **suy ra từ `WEB_DESIGN_STEPS` / `WEB_DESIGN_FAQS`** ⇒ chỉnh nội dung tĩnh một chỗ là cả
 * trang public lẫn dữ liệu CMS đổi theo, không thể lệch nhau.
 */
export const WEB_DESIGN_SERVICE_SEED = {
  id: 'srv-web-design',
  title: WEB_DESIGN_PAGE_TITLE,
  slug: WEB_DESIGN_SERVICE_SLUG,
  shortDesc: WEB_DESIGN_PAGE_DESC,
  content: `Chúng tôi nhận thiết kế website trọn gói từ khâu tư vấn chiến lược nội dung, thiết kế giao diện theo bộ nhận diện thương hiệu đến lập trình, tối ưu tốc độ và bàn giao CMS để doanh nghiệp tự cập nhật.

Mọi dự án đều được tối ưu Core Web Vitals, cấu trúc dữ liệu schema chuẩn SEO và đo lường chuyển đổi bằng Google Analytics 4 — kèm bảo trì 12 tháng, sao lưu định kỳ và hỗ trợ kỹ thuật 24/7.`,
  icon: 'LayoutTemplate',
  thumbnail: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&auto=format&fit=crop&q=80',
  priceRange: WEB_DESIGN_SERVICE_PRICE_RANGE,
  processSteps: WEB_DESIGN_STEPS.map(step => ({
    step: step.step,
    title: step.title,
    desc: step.desc,
    duration: step.duration
  })),
  faqs: WEB_DESIGN_FAQS.map(faq => ({ q: faq.q, a: faq.a })),
  isFeatured: true
};
