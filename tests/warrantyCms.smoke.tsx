/**
 * P1.2 — Smoke test render CMS `WarrantyView` (SSR, không cần backend, không cần đăng nhập).
 *
 * Chạy: `npm run test:cms-warranty`
 *
 * Vì sao cần test riêng: `WarrantyView.tsx` là file lớn (~1.180 dòng, viết theo nhiều khối JSX) —
 * test này chốt lại rằng **mọi khối chính đều render đủ** (header · 4 thẻ thống kê · 4 sub-tab ·
 * ô tìm kiếm · bảng phiếu) và component **không ném lỗi khi chưa có dữ liệu** (state ban đầu rỗng).
 * Effect (fetch API) không chạy khi SSR nên `loading` vẫn `true` ⇒ bảng hiện dòng “Đang tải…”.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext.tsx';
import { WarrantyView } from '../src/components/cms/WarrantyView.tsx';
import { WARRANTY_TABS } from '../src/utils/warranty.ts';

const html = renderToString(
  <MemoryRouter initialEntries={['/']}>
    <AppProvider>
      <WarrantyView />
    </AppProvider>
  </MemoryRouter>
);

interface Group {
  label: string;
  markers: string[];
}

const groups: Group[] = [
  {
    label: 'header + 4 thẻ thống kê',
    markers: [
      // Không assert kèm dấu `&` ở giữa: SSR escape thành `&amp;`.
      'Tiếp Nhận Sửa Chữa',
      'Tiếp nhận bảo hành',
      'Tổng phiếu',
      'Đang xử lý',
      'Đã trả khách',
      'Hết bảo hành'
    ]
  },
  {
    label: '4 sub-tab + ô tìm kiếm + trạng thái tải',
    markers: [
      ...WARRANTY_TABS.map(tab => tab.label),
      'Tìm theo mã phiếu, serial, SĐT, tên khách hoặc tên sản phẩm...',
      'Đang tải danh sách phiếu bảo hành...'
    ]
  },
  {
    label: 'bảng phiếu đủ 7 cột',
    markers: [
      'Phiếu',
      'Khách hàng',
      'Sản phẩm / Serial',
      'Thời hạn bảo hành',
      'Tiến độ xử lý',
      'Kỹ thuật viên',
      'Thao tác'
    ]
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

console.log(failed === 0 ? '\nOK: WarrantyView render đủ mọi khối (P1.2).' : `\n${failed} nhóm marker KHONG dat.`);
process.exit(failed === 0 ? 0 : 1);
