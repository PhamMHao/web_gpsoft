/**
 * P2.2 — Dữ liệu & helper cho module "Phần mềm chấm công" (`/phan-mem-cham-cong?tab=<id>`).
 *
 * Vì sao tách riêng file này:
 * 1. Trang public (`AttendanceSoftwarePage.tsx`) render từ dữ liệu tĩnh ⇒ SSR ra đủ nội dung
 *    (SEO tốt, không có màn hình trắng khi backend chậm); nội dung CMS chỉ **ghi đè** phần mô tả.
 * 2. CMS (`PagesView.tsx`) dùng **cùng** danh sách slug/title để tạo nhanh 4 trang nội dung
 *    `phan-mem-cham-cong-<tab>` ⇒ một nguồn sự thật duy nhất cho cả public lẫn CMS.
 * 3. Tab nằm trên URL (`?tab=`) nên cần hàm thuần `findAttendanceTab()` để validate tham số —
 *    test được bằng `npm run test:attendance-ui` mà không cần backend.
 */
import { ROUTES } from './url.ts';

/** Id = giá trị trên URL (`?tab=nhan-su`). Giá trị lạ ⇒ tab mặc định (`cham-cong`). */
export type AttendanceTabId = 'cham-cong' | 'nhan-su' | 'tien-luong' | 'kiem-xuong';

/** Gói dịch vụ hiển thị ở khối "bảng giá gói". `price: null` = báo giá theo quy mô. */
export interface AttendancePlan {
  id: string;
  name: string;
  /** Đơn giá VND/tháng; `null` ⇒ hiển thị `priceNote` thay cho số tiền. */
  price: number | null;
  priceNote: string;
  audience: string;
  /** Gói được đề xuất (viền + badge nổi bật). */
  highlight?: boolean;
  features: string[];
  /** Hạng mục gói này **không** có (hiển thị mờ, để khách biết cần nâng gói). */
  notIncluded?: string[];
}

export interface AttendanceMetric {
  value: string;
  label: string;
}

/** Một dòng trong danh sách tính năng (icon map ở component theo khoá `icon`). */
export interface AttendanceFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface AttendanceFaq {
  q: string;
  a: string;
}

/** Dòng dữ liệu của "ảnh chụp màn hình" dựng bằng CSS (không phụ thuộc file ảnh ngoài). */
export interface AttendanceMockRow {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'info';
}

export interface AttendanceMock {
  title: string;
  subtitle: string;
  rows: AttendanceMockRow[];
  footer: string;
}

/** Ô của bảng so sánh gói: `true` ⇒ có (✓), `false` ⇒ không (—), string ⇒ nội dung tự do. */
export type AttendanceCompareValue = string | boolean;

export interface AttendanceCompareRow {
  label: string;
  values: AttendanceCompareValue[];
}

export interface AttendanceTab {
  id: AttendanceTabId;
  label: string;
  /** Gợi ý ngắn hiển thị dưới nhãn tab trên thanh tab. */
  navHint: string;
  /** Tên đầy đủ (h1 + tiêu đề trang CMS) — VD "Phần mềm nhân sự". */
  cmsTitle: string;
  tagline: string;
  badges: string[];
  description: string[];
  metrics: AttendanceMetric[];
  features: AttendanceFeature[];
  mock: AttendanceMock;
  compare: AttendanceCompareRow[];
  plans: AttendancePlan[];
  faqs: AttendanceFaq[];
  /** Nội dung seed cho `Page.slug = phan-mem-cham-cong-<id>` (CMS sửa được, hiển thị plain-text). */
  cmsContent: string;
}

/** Tên gọi chung của module (dùng cho breadcrumb, badge, tiêu đề SEO). */
export const ATTENDANCE_MODULE_LABEL = 'Phần mềm chấm công';

/** Tiền tố slug trang nội dung CMS của từng tab (P2.2 §Bước 3). */
export const ATTENDANCE_CMS_SLUG_PREFIX = 'phan-mem-cham-cong-';

/** Tab mặc định — URL sạch `/phan-mem-cham-cong` (không kèm `?tab=`) trỏ về tab này. */
export const DEFAULT_ATTENDANCE_TAB_ID: AttendanceTabId = 'cham-cong';

/** 4 tab con. Thứ tự trong mảng = thứ tự hiển thị trên thanh tab + trong menu. */
export const ATTENDANCE_TABS: AttendanceTab[] = [
  {
    id: 'cham-cong',
    label: 'Chấm công',
    navHint: 'Face ID · Vân tay · GPS',
    cmsTitle: 'Phần mềm chấm công',
    tagline:
      'Chấm công đa phương thức cho mọi mô hình doanh nghiệp: nhận diện khuôn mặt AI, vân tay, thẻ từ, QR động và GPS cho nhân viên đi thị trường — tất cả ghi về một bảng công duy nhất.',
    badges: [
      'Nhận diện dưới 0,8 giây',
      'Chống chấm công hộ',
      'Đồng bộ máy ZKTeco / Hikvision',
      'Bảng công realtime'
    ],
    description: [
      'ThinkPro Attendance ghi nhận giờ vào/ra theo ca, theo vị trí và theo từng máy chấm công đặt tại showroom, văn phòng hay kho vận. Nhân viên văn phòng chấm bằng khuôn mặt, nhân viên kỹ thuật chấm bằng vân tay/thẻ từ, nhân viên kinh doanh chấm bằng QR động kèm GPS và ảnh xác thực.',
      'Dữ liệu công được tổng hợp realtime thành bảng công tháng: tự động trừ giờ đi muộn, cộng giờ làm thêm (OT), tính công ngày lễ và đẩy thẳng sang module Tiền lương để tính lương — không cần nhập tay bằng Excel.'
    ],
    metrics: [
      { value: '0,8 giây', label: 'Nhận diện khuôn mặt' },
      { value: '99,9%', label: 'Uptime hệ thống' },
      { value: '1.500+', label: 'Doanh nghiệp đang dùng' },
      { value: '24/7', label: 'Hỗ trợ kỹ thuật' }
    ],
    features: [
      {
        icon: 'ScanFace',
        title: 'Nhận diện khuôn mặt AI',
        desc: 'Điểm danh chỉ bằng một lần nhìn, chống ảnh chụp, chống video và chống chấm công hộ.'
      },
      {
        icon: 'Fingerprint',
        title: 'Vân tay, thẻ từ & mã PIN',
        desc: 'Kết nối trực tiếp máy chấm công ZKTeco, Hikvision, Ronald Jack đang dùng tại cửa hàng.'
      },
      {
        icon: 'QrCode',
        title: 'Mã QR động trên app',
        desc: 'QR đổi mỗi 30 giây, chấm công bằng điện thoại tại chi nhánh, kho hoặc điểm giao hàng.'
      },
      {
        icon: 'MapPin',
        title: 'GPS / WiFi cho nhân viên thị trường',
        desc: 'Chỉ cho phép chấm công khi ở trong bán kính cấu hình, kèm toạ độ và ảnh tại chỗ.'
      },
      {
        icon: 'CalendarClock',
        title: 'Ca làm việc & xoay ca',
        desc: '3 ca, ca gãy, ca qua đêm, đăng ký đổi ca trên app và duyệt theo cấp quản lý.'
      },
      {
        icon: 'BellRing',
        title: 'Cảnh báo realtime',
        desc: 'Thông báo đi muộn, về sớm, thiếu lượt chấm qua Zalo, Email và push app cho quản lý.'
      }
    ],
    mock: {
      title: 'Bảng chấm công hôm nay',
      subtitle: 'Showroom 182 Lê Duẩn · Ca sáng 08:00 – 17:00',
      rows: [
        { label: 'Nguyễn Minh Anh', value: '07:58 · Khuôn mặt', tone: 'ok' },
        { label: 'Trần Quốc Bảo', value: '08:00 · Vân tay', tone: 'ok' },
        { label: 'Lê Thu Hà', value: '08:12 · QR + GPS', tone: 'warn' },
        { label: 'Phạm Đức Long', value: '07:45 · Khuôn mặt', tone: 'ok' },
        { label: 'Vũ Hoàng Nam', value: 'Chưa chấm công', tone: 'info' }
      ],
      footer: '5/6 nhân sự đã điểm danh · 1 đi muộn · 1 chưa chấm công'
    },
    compare: [
      { label: 'Số nhân sự tối đa', values: ['30', '200', 'Không giới hạn'] },
      { label: 'Khuôn mặt · vân tay · QR', values: [true, true, true] },
      { label: 'GPS & ảnh xác thực cho nhân viên thị trường', values: [false, true, true] },
      { label: 'Ca xoay, ca gãy, ca qua đêm', values: ['3 ca', 'Không giới hạn', 'Không giới hạn'] },
      { label: 'Cảnh báo Zalo / SMS đi muộn', values: [false, true, true] },
      { label: 'API tích hợp HRM / ERP', values: [false, true, true] }
    ],
    plans: [
      {
        id: 'starter',
        name: 'Gói Khởi Nghiệp',
        price: 590000,
        priceNote: '/tháng · tối đa 30 nhân sự',
        audience: 'Cửa hàng, chuỗi 1 – 2 chi nhánh',
        features: [
          'Chấm công khuôn mặt, vân tay, QR',
          '3 ca làm việc & bảng công tháng',
          'App mobile cho nhân viên',
          'Xuất Excel / CSV bảng công'
        ],
        notIncluded: ['GPS nhân viên thị trường', 'API tích hợp HRM']
      },
      {
        id: 'business',
        name: 'Gói Doanh Nghiệp',
        price: 1490000,
        priceNote: '/tháng · 31 – 200 nhân sự',
        audience: 'Doanh nghiệp nhiều chi nhánh',
        highlight: true,
        features: [
          'Toàn bộ quyền lợi gói Khởi Nghiệp',
          'GPS + ảnh xác thực khi chấm công',
          'Ca xoay / ca gãy không giới hạn',
          'Cảnh báo đi muộn qua Zalo & SMS',
          'API, SSO tích hợp HRM đang dùng',
          'Báo cáo hợp nhất đa chi nhánh'
        ],
        notIncluded: ['Máy chấm công công nghiệp IP65']
      },
      {
        id: 'enterprise',
        name: 'Gói Tập Đoàn / Nhà Máy',
        price: null,
        priceNote: 'Báo giá theo quy mô triển khai',
        audience: 'Trên 200 nhân sự, nhà máy 3 ca',
        features: [
          'Toàn bộ quyền lợi gói Doanh Nghiệp',
          'Máy chấm công công nghiệp + đo thân nhiệt',
          'Chấm công theo công đoạn sản xuất',
          'Tích hợp ERP / MES hai chiều',
          'SLA 99,9% + kỹ thuật viên tại chỗ',
          'Triển khai & đào tạo on-site'
        ]
      }
    ],
    faqs: [
      {
        q: 'Doanh nghiệp đang dùng máy chấm công cũ có phải thay không?',
        a: 'Không. ThinkPro Attendance kết nối trực tiếp các dòng máy phổ biến (ZKTeco, Hikvision, Ronald Jack), đọc dữ liệu thô rồi đồng bộ hai chiều về hệ thống nên bạn giữ nguyên thiết bị đã đầu tư.'
      },
      {
        q: 'Nhân viên đi thị trường chấm công bằng cách nào?',
        a: 'Nhân viên mở app, quét mã QR động của ca và hệ thống kiểm tra đồng thời GPS + WiFi + ảnh selfie. Nếu ngoài bán kính cấu hình, lượt chấm công sẽ bị đánh dấu để quản lý duyệt thủ công.'
      },
      {
        q: 'Bảng công có tự tính làm thêm giờ và công ngày lễ không?',
        a: 'Có. Hệ thống áp dụng bộ quy tắc riêng cho từng chi nhánh: giờ vào/ra, khung OT theo ngày thường – cuối tuần – ngày lễ, thời gian nghỉ giữa ca và số phút đi muộn bị trừ công.'
      },
      {
        q: 'Dữ liệu lưu ở đâu và có xuất Excel không?',
        a: 'Dữ liệu lưu trên SQLite, MySQL hoặc SQL Server của doanh nghiệp (hoặc cloud GPSOFT). Bảng công, bảng OT và lịch sử điểm danh luôn xuất được ra Excel/CSV để lưu trữ hoặc gửi kiểm toán.'
      }
    ],
    cmsContent: `ThinkPro Attendance chấm công cho toàn bộ showroom, văn phòng, kho vận và nhân viên đi thị trường trên một hệ thống duy nhất.

Nhân viên chấm công bằng khuôn mặt AI, vân tay, thẻ từ, mã QR động trên app hoặc GPS/WiFi tuỳ vị trí làm việc. Mọi lượt chấm công đều được xác thực chống chấm công hộ và ghi lại ảnh, toạ độ cùng thời điểm.

Dữ liệu được tổng hợp realtime thành bảng công tháng: tự động trừ giờ đi muộn, cộng OT theo ngày thường – cuối tuần – ngày lễ, đối soát đơn xin nghỉ phép và đẩy thẳng sang module Tiền lương.

Quản lý theo dõi tình hình điểm danh mỗi sáng qua dashboard, nhận cảnh báo Zalo/SMS khi nhân sự đi muộn hoặc thiếu lượt chấm công, và xuất bảng công Excel/CSV chỉ với một cú nhấp.`
  },
  {
    id: 'nhan-su',
    label: 'Nhân sự',
    navHint: 'Hồ sơ · Hợp đồng · KPI',
    cmsTitle: 'Phần mềm nhân sự',
    tagline:
      'Quy trình nhân sự khép kín từ tuyển dụng, tiếp nhận, hợp đồng, đào tạo đến đánh giá KPI và nghỉ việc — mọi hồ sơ nằm trong một nơi, không còn file Excel rời rạc.',
    badges: [
      'Hồ sơ nhân sự 360°',
      'Hợp đồng & e-sign',
      'Luồng duyệt đa cấp',
      'Cổng nhân viên self-service'
    ],
    description: [
      'Module Nhân sự số hoá toàn bộ vòng đời của người lao động: hồ sơ cá nhân, giấy tờ tuỳ thân, bằng cấp, hợp đồng lao động và các phụ lục, quyết định tăng lương hay điều chuyển bộ phận. Mỗi thay đổi đều lưu vết ai duyệt, duyệt lúc nào.',
      'Nhân viên tự tra cứu trên cổng self-service: xem hợp đồng, ngày phép còn lại, phiếu lương, đăng ký nghỉ phép; quản lý duyệt ngay trên điện thoại. Dữ liệu nhân sự liên thông trực tiếp với module Chấm công và Tiền lương nên không phải nhập lại.'
    ],
    metrics: [
      { value: '100%', label: 'Hồ sơ được số hoá' },
      { value: '15 phút', label: 'Tiếp nhận nhân sự mới' },
      { value: '-70%', label: 'Thời gian lập báo cáo HR' },
      { value: '0 giấy tờ', label: 'Luồng duyệt online' }
    ],
    features: [
      {
        icon: 'UserPlus',
        title: 'Hồ sơ nhân sự 360°',
        desc: 'Thông tin cá nhân, hợp đồng, bằng cấp, quá trình công tác, khen thưởng – kỷ luật.'
      },
      {
        icon: 'FileText',
        title: 'Hợp đồng & phụ lục',
        desc: 'Mẫu hợp đồng theo loại hình lao động, cảnh báo hết hạn và nhắc ký lại tự động.'
      },
      {
        icon: 'GraduationCap',
        title: 'Tiếp nhận & đào tạo',
        desc: 'Checklist onboarding theo vị trí, giao khoá học nội bộ và theo dõi tiến độ hoàn thành.'
      },
      {
        icon: 'ClipboardCheck',
        title: 'Đánh giá KPI / OKR',
        desc: 'Bộ tiêu chí theo phòng ban, nhân viên tự chấm và quản lý chốt kỳ đánh giá.'
      },
      {
        icon: 'Network',
        title: 'Sơ đồ tổ chức & luồng duyệt',
        desc: 'Cây phòng ban nhiều cấp, phân quyền theo chức danh, duyệt đơn từ đa cấp.'
      },
      {
        icon: 'Smartphone',
        title: 'Cổng nhân viên self-service',
        desc: 'Xem phiếu lương, ngày phép, đăng ký nghỉ và cập nhật thông tin cá nhân trên app.'
      }
    ],
    mock: {
      title: 'Hồ sơ nhân sự — Lê Thu Hà',
      subtitle: 'Kinh doanh · Chi nhánh TP.HCM · Vào làm 12/03/2024',
      rows: [
        { label: 'Hợp đồng lao động', value: 'Đã ký · 24 tháng', tone: 'ok' },
        { label: 'Chứng chỉ & bằng cấp', value: '3 tệp đính kèm', tone: 'ok' },
        { label: 'KPI quý 3', value: '92% · Vượt chỉ tiêu', tone: 'ok' },
        { label: 'Khoá đào tạo nội bộ', value: '2/3 hoàn thành', tone: 'warn' },
        { label: 'Phép năm còn lại', value: '4,5 ngày', tone: 'info' }
      ],
      footer: 'Hồ sơ đầy đủ 12/12 mục bắt buộc · Ký số ngày 12/03/2024'
    },
    compare: [
      { label: 'Số nhân sự tối đa', values: ['30', '200', 'Không giới hạn'] },
      { label: 'Hồ sơ & hợp đồng số hoá', values: [true, true, true] },
      { label: 'Cổng nhân viên self-service', values: [true, true, true] },
      { label: 'Đánh giá KPI / OKR theo kỳ', values: [false, true, true] },
      { label: 'Luồng duyệt đa cấp & ký số', values: [false, true, true] },
      { label: 'API đồng bộ chấm công / tiền lương', values: ['Nội bộ', 'Nội bộ + API', 'ERP hai chiều'] }
    ],
    plans: [
      {
        id: 'starter',
        name: 'Gói Khởi Nghiệp',
        price: 690000,
        priceNote: '/tháng · tối đa 30 nhân sự',
        audience: 'Cửa hàng, chuỗi 1 – 2 chi nhánh',
        features: [
          'Hồ sơ nhân sự & hợp đồng số hoá',
          'Đăng ký – duyệt nghỉ phép trên app',
          'Phiếu lương điện tử cho nhân viên',
          'Danh sách nhân sự theo phòng ban'
        ],
        notIncluded: ['Đánh giá KPI / OKR', 'Luồng duyệt đa cấp & ký số']
      },
      {
        id: 'business',
        name: 'Gói Doanh Nghiệp',
        price: 1690000,
        priceNote: '/tháng · 31 – 200 nhân sự',
        audience: 'Doanh nghiệp nhiều chi nhánh',
        highlight: true,
        features: [
          'Toàn bộ quyền lợi gói Khởi Nghiệp',
          'Đánh giá KPI / OKR theo kỳ',
          'Luồng duyệt đa cấp + ký số hợp đồng',
          'Checklist onboarding theo vị trí',
          'Khoá đào tạo nội bộ & chứng chỉ',
          'API đồng bộ HRM đang dùng'
        ],
        notIncluded: ['Xây dựng khung năng lực riêng']
      },
      {
        id: 'enterprise',
        name: 'Gói Tập Đoàn / Nhà Máy',
        price: null,
        priceNote: 'Báo giá theo quy mô triển khai',
        audience: 'Trên 200 nhân sự, nhiều pháp nhân',
        features: [
          'Toàn bộ quyền lợi gói Doanh Nghiệp',
          'Quản lý nhiều pháp nhân & chi nhánh',
          'Khung năng lực, quy hoạch kế nhiệm',
          'Tích hợp ERP / HRM hai chiều',
          'SLA 99,9% + chuyên gia HR đồng hành',
          'Triển khai & đào tạo on-site'
        ]
      }
    ],
    faqs: [
      {
        q: 'Phần mềm nhân sự có dùng được cho nhiều chi nhánh không?',
        a: 'Có. Bạn khai báo nhiều pháp nhân, chi nhánh và phòng ban trong cùng một hệ thống; mỗi nhân sự thuộc một đơn vị, mỗi quản lý chỉ thấy đúng phạm vi được phân quyền.'
      },
      {
        q: 'Nhân viên có tự đăng ký nghỉ phép và xem phiếu lương được không?',
        a: 'Có. Cổng self-service cho phép nhân viên xem phiếu lương, số ngày phép còn lại, hợp đồng đã ký, đăng ký nghỉ phép — quản lý duyệt ngay trên app và hệ thống tự trừ vào bảng công, bảng lương.'
      },
      {
        q: 'Hợp đồng lao động có ký điện tử không?',
        a: 'Có. Từ gói Doanh Nghiệp trở lên, mẫu hợp đồng và phụ lục được tạo từ dữ liệu hồ sơ, gửi ký số cho nhân sự, lưu bản PDF kèm dấu vết thời gian ký để tra cứu khi cần thanh tra.'
      },
      {
        q: 'Dữ liệu nhân sự có đồng bộ sang chấm công và tiền lương không?',
        a: 'Có. Module Nhân sự là nguồn dữ liệu gốc: thêm – chuyển bộ phận – tăng lương chỉ cần nhập một lần, hệ thống áp dụng ngay cho ca làm việc, bảng công và công thức tính lương của nhân sự đó.'
      }
    ],
    cmsContent: `Module Nhân sự lưu trữ toàn bộ vòng đời người lao động trong một hồ sơ số duy nhất: thông tin cá nhân, giấy tờ tuỳ thân, bằng cấp, hợp đồng lao động và các phụ lục, quyết định tăng lương – điều chuyển – khen thưởng.

Quy trình tiếp nhận nhân sự mới được chuẩn hoá theo checklist của từng vị trí, giao khoá đào tạo nội bộ và theo dõi tiến độ hoàn thành. Kỳ đánh giá KPI / OKR diễn ra trên hệ thống, nhân viên tự chấm và quản lý trực tiếp chốt kết quả.

Cổng nhân viên self-service cho phép tra cứu hợp đồng, phiếu lương, ngày phép còn lại và đăng ký nghỉ phép ngay trên điện thoại; luồng duyệt đa cấp đảm bảo đúng người, đúng quyền.

Dữ liệu nhân sự liên thông trực tiếp với module Chấm công và Tiền lương: một lần nhập liệu, dùng chung cho ca làm việc, bảng công, công thức lương và mọi báo cáo quản trị.`
  },
  {
    id: 'tien-luong',
    label: 'Tiền lương',
    navHint: 'Bảng lương · Thuế · BHXH',
    cmsTitle: 'Phần mềm tính lương',
    tagline:
      'Tính lương chính xác đến từng đồng cho cả chuỗi: tự động gom bảng công, đơn nghỉ phép, doanh số bán hàng và hoa hồng rồi xuất phiếu lương, file chuyển khoản cùng báo cáo thuế – BHXH chỉ trong vài phút.',
    badges: [
      'Tự động tính từ bảng công',
      'Thuế TNCN & BHXH',
      'Phiếu lương điện tử',
      'Chuyển khoản theo lô'
    ],
    description: [
      'Module Tiền lương nhận dữ liệu công, phép, OT và doanh số từ các module trước đó rồi tính ra lương gross – net theo công thức cấu hình được: lương thời gian, lương sản phẩm, lương kinh doanh, hoa hồng, phụ cấp, thưởng nóng và các khoản khấu trừ.',
      'Hệ thống áp biểu thuế TNCN luỹ tiến, giảm trừ gia cảnh, mức đóng BHXH – BHYT – BHTN theo quy định hiện hành; xuất file chuyển khoản theo mẫu ngân hàng, phiếu lương PDF và báo cáo phục vụ kê khai, quyết toán thuế.',
      'Mọi thay đổi trên bảng lương đều được ghi vết: ai sửa, sửa lúc nào, vì sao sửa. Kỳ lương sau khi chốt sẽ bị khoá, đảm bảo số liệu đã trả không bị xê dịch ngoài ý muốn.'
    ],
    metrics: [
      { value: '5 phút', label: 'Chốt lương toàn chuỗi' },
      { value: '0 lỗi', label: 'Không nhập tay từ bảng công' },
      { value: '100%', label: 'Phiếu lương gửi tự động' },
      { value: '-80%', label: 'Thời gian làm báo cáo thuế' }
    ],
    features: [
      {
        icon: 'Calculator',
        title: 'Công thức lương tuỳ biến',
        desc: 'Lương thời gian, lương sản phẩm, lương khoán, phụ cấp, thưởng và khấu trừ — cấu hình theo công thức, không cần lập trình.'
      },
      {
        icon: 'Banknote',
        title: 'Lương kinh doanh & hoa hồng',
        desc: 'Ghép doanh số từ POS/ERP, tính hoa hồng theo nhóm sản phẩm và bậc doanh thu riêng của từng nhân viên.'
      },
      {
        icon: 'Landmark',
        title: 'Thuế TNCN & BHXH',
        desc: 'Biểu thuế luỹ tiến, giảm trừ gia cảnh, mức đóng BHXH – BHYT – BHTN; báo cáo PIT và bảng tổng hợp bảo hiểm.'
      },
      {
        icon: 'FileSpreadsheet',
        title: 'File chuyển khoản theo lô',
        desc: 'Sinh file đúng mẫu ngân hàng đang dùng, chi lương cho hàng trăm nhân sự trong một lượt và đối soát lại sau khi chuyển.'
      },
      {
        icon: 'Receipt',
        title: 'Phiếu lương điện tử',
        desc: 'Phiếu lương PDF gửi qua email/app, nhân viên xem chi tiết từng khoản và tra cứu lại các kỳ lương trước.'
      },
      {
        icon: 'Network',
        title: 'Phân quyền & khoá kỳ lương',
        desc: 'Chỉ kế toán trưởng và ban giám đốc xem được dữ liệu lương; khoá kỳ lương để chặn sửa đổi sau khi đã chốt.'
      }
    ],
    mock: {
      title: 'Bảng lương tháng 08/2026 — Khối kinh doanh',
      subtitle: '23 nhân sự · Đã chốt 31/08/2026 · Chờ chuyển khoản',
      rows: [
        { label: 'Nguyễn Văn Nam', value: '18.450.000 ₫', tone: 'ok' },
        { label: 'Trần Thị Mai · hoa hồng 12%', value: '21.780.000 ₫', tone: 'ok' },
        { label: 'Phạm Quốc Bảo · OT 18 giờ', value: '19.940.000 ₫', tone: 'ok' },
        { label: 'Lê Thu Hà', value: '15.120.000 ₫', tone: 'info' },
        { label: 'Đỗ Minh Anh · nghỉ 2 ngày', value: '13.260.000 ₫', tone: 'warn' }
      ],
      footer: 'Tổng chi lương 412.860.000 ₫ · Thuế TNCN 28.410.000 ₫ · BHXH 42.180.000 ₫'
    },
    compare: [
      { label: 'Số nhân sự tính lương', values: ['30', '200', 'Không giới hạn'] },
      { label: 'Tính lương từ bảng công & đơn phép', values: [true, true, true] },
      { label: 'Phiếu lương điện tử (PDF + email)', values: [true, true, true] },
      { label: 'Hoa hồng doanh số & lương kinh doanh', values: [false, true, true] },
      {
        label: 'File chuyển khoản theo mẫu ngân hàng',
        values: ['1 ngân hàng', '5 ngân hàng', 'Không giới hạn']
      },
      { label: 'Báo cáo thuế TNCN & BHXH', values: ['Cơ bản', 'Đầy đủ', 'Đầy đủ + quyết toán'] }
    ],
    plans: [
      {
        id: 'starter',
        name: 'Gói Khởi Nghiệp',
        price: 790000,
        priceNote: '/tháng · tối đa 30 nhân sự',
        audience: 'Cửa hàng, chuỗi 1 – 2 chi nhánh',
        features: [
          'Tính lương thời gian từ bảng công',
          'Phiếu lương điện tử cho nhân viên',
          'File chuyển khoản 1 ngân hàng',
          'Báo cáo thuế TNCN cơ bản'
        ],
        notIncluded: ['Hoa hồng doanh số & lương kinh doanh', 'Quyết toán thuế cuối năm']
      },
      {
        id: 'business',
        name: 'Gói Doanh Nghiệp',
        price: 1990000,
        priceNote: '/tháng · 31 – 200 nhân sự',
        audience: 'Doanh nghiệp nhiều chi nhánh',
        highlight: true,
        features: [
          'Toàn bộ quyền lợi gói Khởi Nghiệp',
          'Hoa hồng doanh số & lương kinh doanh',
          'Công thức lương tuỳ biến theo phòng ban',
          'File chuyển khoản đa ngân hàng',
          'Báo cáo BHXH – BHYT – BHTN đầy đủ',
          'Duyệt và khoá kỳ lương đa cấp'
        ],
        notIncluded: ['Quyết toán thuế đa pháp nhân']
      },
      {
        id: 'enterprise',
        name: 'Gói Tập Đoàn / Nhà Máy',
        price: null,
        priceNote: 'Báo giá theo quy mô triển khai',
        audience: 'Trên 200 nhân sự, nhiều pháp nhân',
        features: [
          'Toàn bộ quyền lợi gói Doanh Nghiệp',
          'Lương sản phẩm theo sản lượng ca',
          'Quyết toán thuế & BHXH đa pháp nhân',
          'Tích hợp ERP / POS hai chiều',
          'SLA 99,9% + chuyên gia kế toán đồng hành',
          'Triển khai và đào tạo on-site'
        ]
      }
    ],
    faqs: [
      {
        q: 'Hệ thống có tự tính lương từ dữ liệu chấm công không?',
        a: 'Có. Bảng công đã chốt của module Chấm công chính là đầu vào của bảng lương: số ngày công, giờ OT, đi muộn, nghỉ phép và nghỉ không lương được đẩy thẳng sang công thức lương nên kế toán không phải nhập tay lần hai.'
      },
      {
        q: 'Có hỗ trợ nhiều hình thức trả lương khác nhau không?',
        a: 'Có. Bạn cấu hình nhiều công thức song song: lương thời gian, lương sản phẩm, lương khoán, lương kinh doanh theo doanh số, hoa hồng theo nhóm sản phẩm, thưởng và các khoản khấu trừ — mỗi phòng ban dùng công thức riêng nếu cần.'
      },
      {
        q: 'Phiếu lương được gửi cho nhân viên bằng cách nào?',
        a: 'Hệ thống sinh phiếu lương PDF rồi gửi tự động qua email và thông báo trên app cho từng nhân sự. Nhân viên đăng nhập để xem chi tiết từng khoản và tra cứu lại phiếu lương của các kỳ trước.'
      },
      {
        q: 'Có xuất được file chuyển khoản và báo cáo thuế không?',
        a: 'Có. File chuyển khoản được sinh theo đúng mẫu của ngân hàng bạn đang dùng (một hoặc nhiều ngân hàng), kèm báo cáo thuế TNCN, bảng tổng hợp BHXH – BHYT – BHTN phục vụ kê khai và quyết toán.'
      },
      {
        q: 'Nhân sự vào giữa tháng hoặc thay đổi lương thì tính thế nào?',
        a: 'Hệ thống lưu lịch sử lương theo ngày hiệu lực: nhân sự mới vào ngày nào tính từ ngày đó, tăng lương giữa kỳ được tách theo tỷ lệ ngày trước và sau mốc hiệu lực, nhờ vậy bảng lương luôn đúng và có vết để giải trình.'
      }
    ],
    cmsContent: `Module Tiền lương biến dữ liệu công, phép, OT và doanh số thành bảng lương hoàn chỉnh mà không cần nhập tay: lương thời gian, lương sản phẩm, lương kinh doanh, hoa hồng, phụ cấp và các khoản khấu trừ theo công thức của từng phòng ban.

Hệ thống áp biểu thuế TNCN luỹ tiến, giảm trừ gia cảnh, mức đóng BHXH – BHYT – BHTN theo quy định hiện hành; tự động sinh phiếu lương PDF, file chuyển khoản theo mẫu ngân hàng và bộ báo cáo phục vụ kê khai, quyết toán thuế.

Mọi thay đổi trên bảng lương đều được ghi vết và kỳ lương sau khi chốt sẽ bị khoá, đảm bảo con số đã trả cho người lao động không bị xê dịch ngoài ý muốn. Quyền xem dữ liệu lương được giới hạn cho kế toán trưởng và ban giám đốc.

Bảng lương liên thông trực tiếp với module Chấm công và Nhân sự: một lần nhập liệu, dùng chung cho ca làm việc, bảng công, hợp đồng, công thức lương và toàn bộ báo cáo quản trị của doanh nghiệp.`
  },
  {
    id: 'kiem-xuong',
    label: 'Kiểm xưởng',
    navHint: 'Ca sản xuất · Sản lượng · Kho',
    cmsTitle: 'Phần mềm kiểm xưởng',
    tagline:
      'Kiểm soát toàn bộ xưởng sản xuất trên một màn hình: nhân công theo ca – tổ – chuyền, sản lượng thực tế so với kế hoạch, bàn giao ca, vật tư tiêu hao và cảnh báo an toàn lao động.',
    badges: [
      'Điểm danh theo tổ, ca, chuyền',
      'Sản lượng so kế hoạch',
      'Bàn giao ca điện tử',
      'Kho xưởng & định mức vật tư'
    ],
    description: [
      'Module Kiểm xưởng phục vụ nhà máy, xưởng lắp ráp và kho vận: quản lý nhiều kíp, chia tổ theo chuyền và máy, điểm danh công nhân đầu ca bằng khuôn mặt, thẻ từ hoặc QR ngay tại cổng xưởng và từng line sản xuất.',
      'Sản lượng khai báo tại line được tổng hợp realtime, so trực tiếp với kế hoạch ca; hiệu suất theo giờ, tỷ lệ lỗi và thời gian dừng máy nằm chung một dashboard để tổ trưởng xử lý ngay trong ca thay vì chờ báo cáo cuối ngày.',
      'Kho xưởng ghi nhận nhập – xuất nguyên vật liệu và thành phẩm, cảnh báo vượt định mức tiêu hao. Phiếu bàn giao ca chốt số liệu giữa các kíp, còn hồ sơ an toàn lao động và sự cố được lưu vết để phục vụ báo cáo, kiểm toán.'
    ],
    metrics: [
      { value: '200+', label: 'Công nhân theo ca trên một xưởng' },
      { value: '3 giây', label: 'Điểm danh vào ca bằng khuôn mặt' },
      { value: '+18%', label: 'Năng suất nhờ xử lý lỗi ngay trong ca' },
      { value: '0 thất thoát', label: 'Vật tư – thành phẩm có truy vết' }
    ],
    features: [
      {
        icon: 'Factory',
        title: 'Ca – tổ – chuyền sản xuất',
        desc: 'Khai báo nhiều kíp, chia tổ theo chuyền và máy, xếp nhân công vào đúng vị trí công việc từng ca.'
      },
      {
        icon: 'HardHat',
        title: 'Điểm danh công nhân tại xưởng',
        desc: 'Khuôn mặt AI, thẻ từ, vân tay hoặc QR tại cổng xưởng và từng line; tự đối chiếu với lịch sản xuất.'
      },
      {
        icon: 'Gauge',
        title: 'Sản lượng & hiệu suất thời gian thực',
        desc: 'Khai báo sản lượng tại line, so với kế hoạch ca, hiển thị hiệu suất theo giờ và thời gian dừng máy.'
      },
      {
        icon: 'Boxes',
        title: 'Kho xưởng & vật tư',
        desc: 'Nhập – xuất nguyên vật liệu, thành phẩm; cảnh báo vượt định mức tiêu hao hoặc tồn kho dưới mức an toàn.'
      },
      {
        icon: 'ClipboardCheck',
        title: 'Bàn giao ca điện tử',
        desc: 'Chốt sản lượng, tình trạng máy, sự cố và bàn giao giữa hai kíp trên cùng một phiếu số, không cần sổ giấy.'
      },
      {
        icon: 'TrendingUp',
        title: 'Lương khoán theo sản lượng',
        desc: 'Tổng hợp sản lượng theo từng công nhân, tổ và line để tính lương khoán, thưởng năng suất chính xác.'
      }
    ],
    mock: {
      title: 'Xưởng lắp ráp 2 — Ca sáng 06:00 – 14:00',
      subtitle: '128 công nhân · 6 tổ · Cập nhật lúc 11:15',
      rows: [
        { label: 'Tổ SMT 1 · line 3', value: 'Vượt kế hoạch 6%', tone: 'ok' },
        { label: 'Tổ Lắp ráp 2 · line 7', value: 'Đạt 94% kế hoạch', tone: 'info' },
        { label: 'Tổ Đóng gói', value: 'Thiếu 4 công nhân', tone: 'warn' },
        { label: 'Vật tư keo tản nhiệt', value: 'Còn 2 giờ sản xuất', tone: 'warn' },
        { label: 'Máy ép nhựa số 5', value: 'Bảo trì 40 phút', tone: 'info' }
      ],
      footer: 'Sản lượng ca 1.842/1.950 sản phẩm · Hiệu suất 94,5% · 2 cảnh báo đang mở'
    },
    compare: [
      { label: 'Số công nhân xưởng', values: ['50', '300', 'Không giới hạn'] },
      { label: 'Điểm danh theo ca – tổ – chuyền', values: [true, true, true] },
      { label: 'Sản lượng & hiệu suất thời gian thực', values: [true, true, true] },
      { label: 'Bàn giao ca điện tử', values: [false, true, true] },
      {
        label: 'Kho xưởng & định mức vật tư',
        values: ['Theo dõi cơ bản', 'Đầy đủ', 'Đầy đủ + truy vết lô']
      },
      { label: 'Thiết bị chấm công & cảm biến IoT', values: ['1 thiết bị', '10 thiết bị', 'Không giới hạn'] }
    ],
    plans: [
      {
        id: 'starter',
        name: 'Gói Khởi Nghiệp',
        price: 890000,
        priceNote: '/tháng · tối đa 50 công nhân',
        audience: 'Xưởng nhỏ, gia công một ca',
        features: [
          'Điểm danh công nhân theo ca – tổ',
          'Khai báo sản lượng theo line',
          'Báo cáo sản lượng và công cuối ca',
          'Lương khoán theo sản lượng'
        ],
        notIncluded: ['Bàn giao ca điện tử', 'Cảm biến IoT đếm sản phẩm']
      },
      {
        id: 'business',
        name: 'Gói Doanh Nghiệp',
        price: 2490000,
        priceNote: '/tháng · 51 – 300 công nhân',
        audience: 'Nhà máy chạy 2 – 3 kíp',
        highlight: true,
        features: [
          'Toàn bộ quyền lợi gói Khởi Nghiệp',
          'Bàn giao ca điện tử giữa các kíp',
          'Hiệu suất theo giờ & thời gian dừng máy',
          'Kho xưởng và định mức tiêu hao vật tư',
          'Hồ sơ an toàn lao động & PPE',
          'API nối ERP / MES đang dùng'
        ],
        notIncluded: ['Truy vết lô theo số serial']
      },
      {
        id: 'enterprise',
        name: 'Gói Tập Đoàn / Nhà Máy',
        price: null,
        priceNote: 'Báo giá theo quy mô triển khai',
        audience: 'Trên 300 công nhân, nhiều nhà máy',
        features: [
          'Toàn bộ quyền lợi gói Doanh Nghiệp',
          'Quản lý nhiều nhà máy, nhiều pháp nhân',
          'Truy vết lô và serial hai chiều với MES',
          'Cảm biến IoT đếm sản phẩm theo line',
          'SLA 99,9% + chuyên gia sản xuất đồng hành',
          'Triển khai và đào tạo on-site'
        ]
      }
    ],
    faqs: [
      {
        q: 'Công nhân làm theo kíp và tăng ca thì chấm công thế nào?',
        a: 'Mỗi kíp có khung giờ riêng, công nhân chỉ cần điểm danh một lần đầu ca (hoặc đầu mỗi line) bằng khuôn mặt, thẻ từ hay QR. Hệ thống tự nhận đúng kíp, cộng giờ tăng ca theo quy định và đẩy sang bảng công, bảng lương khoán.'
      },
      {
        q: 'Sản lượng khai báo ở xưởng có dùng ngay để tính lương khoán không?',
        a: 'Có. Sản lượng khai báo tại line được gắn với công nhân, tổ và ca sản xuất, sau khi tổ trưởng xác nhận cuối ca thì dữ liệu chảy thẳng vào công thức lương khoán và thưởng năng suất, không phải nhập lại vào Excel.'
      },
      {
        q: 'Có bàn giao ca giữa các kíp trên hệ thống không?',
        a: 'Có. Phiếu bàn giao ca ghi sản lượng đã làm, hàng dở dang, tình trạng máy, vật tư còn lại và sự cố phát sinh; kíp sau xác nhận trên app là hoàn tất, mọi thay đổi đều có vết theo thời gian.'
      },
      {
        q: 'Hệ thống nối được với máy móc hoặc phần mềm sản xuất đang dùng không?',
        a: 'Được. Hệ thống cung cấp API/Webhook để kết nối ERP, MES hoặc máy đếm sản phẩm; ở gói Tập Đoàn có thể gắn cảm biến IoT đếm sản phẩm theo line và truy vết lô, serial hai chiều.'
      },
      {
        q: 'Xưởng có internet chập chờn thì dùng được không?',
        a: 'Được. Máy chấm công và app khai báo sản lượng lưu dữ liệu ngay trên thiết bị, khi có mạng trở lại sẽ tự đồng bộ lên hệ thống nên không mất lượt điểm danh hay số liệu sản lượng.'
      }
    ],
    cmsContent: `Module Kiểm xưởng dành cho nhà máy, xưởng lắp ráp và kho vận: quản lý nhiều kíp, chia tổ theo chuyền và máy, điểm danh công nhân đầu ca bằng khuôn mặt AI, thẻ từ hoặc QR ngay tại cổng xưởng và từng line sản xuất.

Sản lượng khai báo tại line được tổng hợp theo thời gian thực và so trực tiếp với kế hoạch ca. Dashboard hiển thị hiệu suất theo giờ, tỷ lệ lỗi, thời gian dừng máy và các cảnh báo đang mở để tổ trưởng xử lý ngay trong ca.

Kho xưởng ghi nhận nhập – xuất nguyên vật liệu và thành phẩm, cảnh báo vượt định mức tiêu hao hoặc tồn dưới mức an toàn. Phiếu bàn giao ca điện tử chốt số liệu giữa các kíp, hồ sơ an toàn lao động và sự cố được lưu vết phục vụ báo cáo, kiểm toán.

Dữ liệu xưởng liên thông với module Chấm công, Nhân sự và Tiền lương: một lần ghi nhận, dùng chung cho bảng công, lương khoán theo sản lượng và toàn bộ báo cáo quản trị của doanh nghiệp.`
  },
  /* 4 tab con của module: Chấm công · Nhân sự · Tiền lương · Kiểm xưởng */
];

export const ATTENDANCE_TAB_IDS: AttendanceTabId[] = ATTENDANCE_TABS.map(tab => tab.id);

/** Tab mặc định — lấy muộn (hàm) để không phụ thuộc thứ tự khởi tạo mảng ở trên. */
export const defaultAttendanceTab = (): AttendanceTab =>
  ATTENDANCE_TABS.find(tab => tab.id === DEFAULT_ATTENDANCE_TAB_ID) ?? ATTENDANCE_TABS[0];

/**
 * Đọc tham số `?tab=` → tab tương ứng; **không** bao giờ trả `null`.
 * Chấp nhận 3 dạng giá trị: id (`nhan-su`), slug CMS (`phan-mem-cham-cong-nhan-su`), hoa/thường.
 */
export const findAttendanceTab = (value?: string | null): AttendanceTab | null => {
  const raw = (value || '').trim().toLowerCase();
  if (!raw) return null;
  const key = raw.startsWith(ATTENDANCE_CMS_SLUG_PREFIX)
    ? raw.slice(ATTENDANCE_CMS_SLUG_PREFIX.length)
    : raw;
  return ATTENDANCE_TABS.find(tab => tab.id === key || tab.id === raw) ?? null;
};

/** Như `findAttendanceTab()` nhưng có fallback ⇒ dùng trực tiếp trong component. */
export const attendanceTab = (value?: string | null): AttendanceTab =>
  findAttendanceTab(value) ?? defaultAttendanceTab();

/**
 * URL của một tab: tab mặc định ⇒ `/phan-mem-cham-cong` (URL sạch, canonical),
 * tab khác ⇒ `/phan-mem-cham-cong?tab=<id>`.
 */
export const attendanceTabPath = (value?: string | null): string => {
  const tab = attendanceTab(value);
  return tab.id === DEFAULT_ATTENDANCE_TAB_ID
    ? ROUTES.attendance
    : `${ROUTES.attendance}?tab=${tab.id}`;
};

/** Slug `Page` quản lý nội dung của một tab (VD `phan-mem-cham-cong-nhan-su`). */
export const attendanceCmsSlug = (value?: string | null): string =>
  `${ATTENDANCE_CMS_SLUG_PREFIX}${attendanceTab(value).id}`;

export interface AttendanceCmsSeed {
  title: string;
  slug: string;
  content: string;
  seo: { metaTitle: string; metaDesc: string };
}

/**
 * Nội dung mặc định của 4 trang CMS — `PagesView` dùng để **tạo nhanh** những trang còn thiếu
 * (idempotent: trang đã tồn tại thì bỏ qua, không ghi đè nội dung admin đã sửa).
 */
export const attendanceCmsPages = (): AttendanceCmsSeed[] =>
  ATTENDANCE_TABS.map(tab => ({
    title: tab.cmsTitle,
    slug: attendanceCmsSlug(tab.id),
    content: tab.cmsContent,
    seo: { metaTitle: `${tab.cmsTitle} — GPSOFT`, metaDesc: tab.tagline }
  }));
