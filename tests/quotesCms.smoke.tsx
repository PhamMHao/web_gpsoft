/**
 * P1.5 — Smoke test render CMS `QuotesView` (SSR, không cần backend, không cần đăng nhập).
 *
 * Chạy: `npm run test:cms-quotes`
 *
 * `QuotesView.tsx` là file lớn viết theo nhiều khối JSX ⇒ test này chốt **mọi khối chính render đủ**
 * (header · 4 thẻ thống kê · 6 sub-tab trạng thái · ô tìm kiếm · bảng 7 cột · nút Xuất CSV / Tạo báo giá)
 * và component **không ném lỗi khi chưa có dữ liệu** (state ban đầu rỗng, effect fetch không chạy khi SSR).
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext.tsx';
import { QuotesView } from '../src/components/cms/QuotesView.tsx';
import { QUOTE_TABS } from '../src/utils/quote.ts';

const html = renderToString(
  <MemoryRouter initialEntries={['/']}>
    <AppProvider>
      <QuotesView />
    </AppProvider>
  </MemoryRouter>
);

interface Group {
  label: string;
  markers: string[];
}

const groups: Group[] = [
  {
    label: 'header + 2 nút hành động',
    markers: ['Báo Giá &amp; Link Chia Sẻ', 'Tạo báo giá', 'Xuất CSV']
  },
  {
    label: '4 thẻ thống kê',
    markers: ['Tổng báo giá', 'Cần theo dõi', 'Khách đồng ý', 'Giá trị đã chốt']
  },
  {
    label: '6 sub-tab trạng thái (all + 5 trạng thái)',
    // Chỉ assert nhãn hiển thị — mã trạng thái (`draft|sent|…`) chỉ xuất hiện trong `<option>`
    // của modal tạo/sửa (modal chưa mở khi render lần đầu).
    markers: [...QUOTE_TABS.map(tab => tab.label), 'Bản nháp', 'Hết hiệu lực']
  },
  {
    label: 'ô tìm kiếm + trạng thái tải',
    markers: [
      'Tìm theo mã báo giá, tiêu đề, tên khách, công ty hoặc SĐT...',
      'Đang tải danh sách báo giá...'
    ]
  },
  {
    label: 'bảng báo giá đủ 7 cột',
    markers: ['Báo giá', 'Khách hàng', 'Dòng hàng', 'Hiệu lực', 'Tổng tiền', 'Trạng thái', 'Thao tác']
  }
];

let failed = 0;

for (const group of groups) {
  const missing = group.markers.filter(marker => !html.includes(marker));
  if (missing.length > 0) failed += 1;
  console.log(
    `${missing.length === 0 ? 'PASS' : 'FAIL'}  ${group.label}  ->  ${group.markers.length} marker da kiem${
      missing.length > 0 ? `  << thieu: ${missing.join(' · ')}` : ''
    }`
  );
}

console.log(failed === 0 ? '\nOK: QuotesView render đủ mọi khối (P1.5).' : `\n${failed} nhóm marker KHONG dat.`);
process.exit(failed === 0 ? 0 : 1);
