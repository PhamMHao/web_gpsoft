/**
 * P1.7/P1.8/P1.9 — Smoke test render 3 view CMS mới (SSR, không cần backend, không cần đăng nhập).
 *
 * Chạy: `npm run test:cms-commerce`
 *
 * Mỗi view là file lớn viết theo nhiều khối JSX ⇒ test này chốt **mọi khối chính render đủ**
 * (header · thẻ thống kê · tab trạng thái · ô tìm kiếm · bảng · trạng thái tải) và component
 * **không ném lỗi khi chưa có dữ liệu** (state ban đầu rỗng, effect fetch không chạy khi SSR).
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext.tsx';
import { CouponsView } from '../src/components/cms/CouponsView.tsx';
import { ShippingView } from '../src/components/cms/ShippingView.tsx';
import { CampaignsView } from '../src/components/cms/CampaignsView.tsx';
import { CAMPAIGN_TABS, COUPON_TABS } from '../src/utils/commerce.ts';

interface Group {
  label: string;
  component: React.ReactElement;
  markers: string[];
}

const view = (element: React.ReactElement) =>
  renderToString(
    <MemoryRouter initialEntries={['/']}>
      <AppProvider>{element}</AppProvider>
    </MemoryRouter>
  );

/* Mã thực thể `&amp;` trong HTML nên marker tách rời để không phụ thuộc cách escape. */
const groups: Group[] = [
  {
    label: 'CouponsView — header + nút tạo',
    component: <CouponsView />,
    markers: ['Mã Giảm Giá', 'Khuyến Mãi', 'Tạo mã giảm giá']
  },
  {
    label: 'CouponsView — 4 thẻ thống kê',
    component: <CouponsView />,
    markers: ['Tổng mã', 'Đang chạy', 'Đã hết lượt', 'Lượt đã dùng']
  },
  {
    label: 'CouponsView — tab trạng thái + tìm kiếm + trạng thái tải',
    component: <CouponsView />,
    markers: [
      ...COUPON_TABS.map(tab => tab.label),
      'Tìm theo mã hoặc tên chương trình giảm giá...',
      'Đang tải danh sách mã giảm giá...'
    ]
  },
  {
    label: 'CouponsView — bảng đủ 7 cột',
    component: <CouponsView />,
    markers: ['Mã / Chương trình', 'Mức giảm', 'Điều kiện', 'Lượt dùng', 'Thời gian', 'Trạng thái', 'Thao tác']
  },
  {
    label: 'ShippingView — header + nút thêm',
    component: <ShippingView />,
    markers: ['Phương Thức', 'Phí Vận Chuyển', 'Thêm phương thức']
  },
  {
    label: 'ShippingView — thẻ thống kê + tìm kiếm + trạng thái tải',
    component: <ShippingView />,
    markers: [
      'Tổng phương thức',
      'Đang bật',
      'Phí thấp nhất',
      'Freeship từ',
      'Đang tải danh sách phương thức vận chuyển...'
    ]
  },
  {
    label: 'ShippingView — bảng đủ 7 cột',
    component: <ShippingView />,
    markers: ['Phương thức', 'Phí giao', 'Freeship từ', 'Thời gian', 'Khu vực', 'Trạng thái', 'Thao tác']
  },
  {
    label: 'CampaignsView — header + nút tạo',
    component: <CampaignsView />,
    markers: ['Chiến Dịch', 'Flash Sale', 'Tạo chiến dịch']
  },
  {
    label: 'CampaignsView — tab trạng thái + tìm kiếm + trạng thái tải',
    component: <CampaignsView />,
    markers: [
      ...CAMPAIGN_TABS.map(tab => tab.label),
      'Tìm theo tên chiến dịch...',
      'Đang tải danh sách chiến dịch...'
    ]
  },
  {
    label: 'CampaignsView — bảng đủ 7 cột',
    component: <CampaignsView />,
    markers: ['Chiến dịch', 'Loại', 'Thời gian', 'Mức giảm', 'Sản phẩm', 'Trạng thái', 'Thao tác']
  }
];

let failed = 0;
const htmlCache = new Map<React.ReactElement, string>();

for (const group of groups) {
  if (!htmlCache.has(group.component)) htmlCache.set(group.component, view(group.component));
  const html = htmlCache.get(group.component) as string;
  const missing = group.markers.filter(marker => !html.includes(marker));
  if (missing.length > 0) failed += 1;
  console.log(
    `${missing.length === 0 ? 'PASS' : 'FAIL'}  ${group.label}  ->  ${group.markers.length} marker da kiem${
      missing.length > 0 ? `  << thieu: ${missing.join(' · ')}` : ''
    }`
  );
}

console.log(
  failed === 0
    ? '\nOK: CouponsView + ShippingView + CampaignsView render đủ mọi khối (P1.7–P1.9).'
    : `\n${failed} nhóm marker KHONG dat.`
);
process.exit(failed === 0 ? 0 : 1);
