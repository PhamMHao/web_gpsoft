/**
 * P1.9 — Smoke test logic chiến dịch / flash sale (`server/campaign.ts`).
 *
 * Chạy: `npm run test:campaigns` (hàm thuần, KHÔNG cần backend/DB).
 * Nội dung: (1) campaign đang chạy theo `startAt`/`endAt` (DoD: hết `endAt` ⇒ khối tự ẩn);
 * (2) trạng thái cho CMS (`running`/`scheduled`/`ended`/`paused`); (3) chọn sản phẩm theo
 * `productIds` hoặc tự chọn theo mức giảm; (4) sắp xếp theo `endAt` gần nhất; (5) bộ lọc CMS.
 */
import {
  CAMPAIGN_PRODUCT_LIMIT,
  CAMPAIGN_TYPES,
  activeCampaigns,
  campaignProducts,
  campaignState,
  filterCampaigns,
  isCampaignRunning,
  isCampaignType
} from '../server/campaign.ts';
import type { Campaign, Product } from '../server/types.ts';

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

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27, 10, 0, 0); // 27/09/2026 10:00 UTC
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const makeProduct = (id: string, over: Partial<Product> = {}): Product =>
  ({
    id,
    name: `Sản phẩm ${id}`,
    slug: id,
    sku: id.toUpperCase(),
    categoryId: 'cat-laptops',
    brandId: 'brand-1',
    originalPrice: 10_000_000,
    salePrice: 9_000_000,
    condition: 'new',
    stock: 10,
    shortDesc: '',
    description: '',
    specs: {},
    attributes: [],
    variants: [],
    thumbnail: '',
    gallery: [],
    isFeatured: false,
    isNew: false,
    status: 'active',
    seo: { metaTitle: '', metaDesc: '', metaKeywords: '' },
    viewCount: 0,
    createdAt: iso(-10),
    updatedAt: iso(-10),
    ...over
  }) as Product;

const makeCampaign = (over: Partial<Campaign> = {}): Campaign => ({
  id: 'camp-1',
  name: 'Giờ Vàng Săn Deal',
  type: 'flash_sale',
  startAt: iso(-1),
  endAt: iso(3),
  discountPercent: 32,
  productIds: [],
  isActive: true,
  createdAt: iso(-1),
  ...over
});

/* --- 1. Đang chạy / hết hạn (DoD P1.9) --------------------------------- */
check('isCampaignRunning: trong khoảng thời gian', isCampaignRunning(makeCampaign(), NOW), true);
check('isCampaignRunning: qua endAt ⇒ ẩn', isCampaignRunning(makeCampaign({ endAt: iso(-1) }), NOW), false);
check('isCampaignRunning: chưa tới startAt', isCampaignRunning(makeCampaign({ startAt: iso(1) }), NOW), false);
check('isCampaignRunning: đang tắt', isCampaignRunning(makeCampaign({ isActive: false }), NOW), false);
check(
  'isCampaignRunning: thiếu startAt/endAt ⇒ chạy vô hạn',
  isCampaignRunning(makeCampaign({ startAt: undefined, endAt: undefined }), NOW),
  true
);
check(
  'isCampaignRunning: endAt rác ⇒ coi như không giới hạn',
  isCampaignRunning(makeCampaign({ endAt: 'khong-phai-ngay' }), NOW),
  true
);
check('isCampaignType: hợp lệ', isCampaignType('flash_sale'), true);
check('isCampaignType: rác', isCampaignType('bogus'), false);
check('CAMPAIGN_TYPES', CAMPAIGN_TYPES, ['countdown', 'flash_sale', 'banner']);
check('CAMPAIGN_PRODUCT_LIMIT', CAMPAIGN_PRODUCT_LIMIT, 4);

/* --- 2. Trạng thái cho CMS --------------------------------------------- */
check('campaignState: running', campaignState(makeCampaign(), NOW), 'running');
check('campaignState: scheduled', campaignState(makeCampaign({ startAt: iso(2) }), NOW), 'scheduled');
check('campaignState: ended', campaignState(makeCampaign({ endAt: iso(-2) }), NOW), 'ended');
check('campaignState: paused', campaignState(makeCampaign({ isActive: false }), NOW), 'paused');
check(
  'campaignState: đã kết thúc ưu tiên hơn tạm dừng',
  campaignState(makeCampaign({ endAt: iso(-2), isActive: false }), NOW),
  'ended'
);

/* --- 3. Danh sách campaign đang chạy ---------------------------------- */
const campaigns: Campaign[] = [
  makeCampaign({ id: 'camp-later', name: 'Hết sau 3 ngày', endAt: iso(3) }),
  makeCampaign({ id: 'camp-sooner', name: 'Hết sau 1 ngày', endAt: iso(1) }),
  makeCampaign({ id: 'camp-ended', name: 'Đã xong', endAt: iso(-1) }),
  makeCampaign({ id: 'camp-off', name: 'Đang tắt', isActive: false })
];
check('activeCampaigns: chỉ campaign đang chạy', activeCampaigns(campaigns, NOW).map(c => c.id), [
  'camp-sooner',
  'camp-later'
]);
check('activeCampaigns: sắp theo endAt gần nhất', activeCampaigns(campaigns, NOW)[0].id, 'camp-sooner');
check('activeCampaigns: không sửa mảng gốc', campaigns.length, 4);

/* --- 4. Sản phẩm của campaign ----------------------------------------- */
const products: Product[] = [
  makeProduct('p-1', { originalPrice: 10_000_000, salePrice: 7_000_000 }),
  makeProduct('p-2', { originalPrice: 10_000_000, salePrice: 9_000_000 }),
  makeProduct('p-3', { originalPrice: 10_000_000, salePrice: 5_000_000 }),
  makeProduct('p-4', { status: 'draft' }),
  makeProduct('p-5', { originalPrice: 10_000_000, salePrice: 6_000_000 })
];

// Mức giảm: p-3 = 5tr · p-5 = 4tr · p-1 = 3tr · p-2 = 1tr ⇒ tự chọn theo đúng thứ tự giảm dần này.
check(
  'campaignProducts: khai productIds ⇒ theo đúng danh sách',
  campaignProducts(makeCampaign({ productIds: ['p-2', 'p-5'] }), products).map(p => p.id),
  ['p-2', 'p-5']
);
check(
  'campaignProducts: bỏ qua id không tồn tại',
  campaignProducts(makeCampaign({ productIds: ['p-2', 'khong-co'] }), products).map(p => p.id),
  ['p-2']
);
check(
  'campaignProducts: rỗng ⇒ tự chọn theo mức giảm giảm dần',
  campaignProducts(makeCampaign({ productIds: [] }), products).map(p => p.id),
  ['p-3', 'p-5', 'p-1', 'p-2']
);
check('campaignProducts: tôn trọng limit', campaignProducts(makeCampaign({ productIds: [] }), products, 2).length, 2);
check('campaignProducts: loại sản phẩm draft', campaignProducts(makeCampaign({ productIds: ['p-4'] }), products).length, 0);

/* --- 5. Bộ lọc CMS ----------------------------------------------------- */
check('filterCampaigns: theo tên', filterCampaigns(campaigns, { q: 'hết sau 1' }).map(c => c.id), ['camp-sooner']);
check('filterCampaigns: theo type', filterCampaigns(campaigns, { type: 'flash_sale' }).length, 4);
check('filterCampaigns: theo type không khớp', filterCampaigns(campaigns, { type: 'banner' }).length, 0);
check('filterCampaigns: state = ended', filterCampaigns(campaigns, { state: 'ended' }, NOW).map(c => c.id), ['camp-ended']);
check('filterCampaigns: state = all', filterCampaigns(campaigns, { state: 'all' }).length, 4);

console.log(
  failed === 0
    ? `\nOK: ${passed}/${passed} assertion PASS (P1.9 — server/campaign.ts).`
    : `\n${failed} assertion KHONG dat (${passed} PASS).`
);
process.exit(failed === 0 ? 0 : 1);
