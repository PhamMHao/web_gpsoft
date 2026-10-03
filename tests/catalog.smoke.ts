/**
 * P2.1 — Smoke test "Danh mục 2 cấp" (hàm thuần, KHÔNG cần backend/DB).
 *
 * Chạy: `npm run test:catalog`
 *
 * Bao phủ 2 phía của tính năng:
 *  1. `server/catalog.ts` — bộ lọc dùng chung cho `GET /products`:
 *     danh mục cha **gom cả sản phẩm của danh mục con/cháu**, lọc được bằng **slug**
 *     (danh mục & thương hiệu), giá/tình trạng/từ khoá/sắp xếp, tham số rác không làm hỏng kết quả,
 *     danh mục lạ ⇒ 0 sản phẩm (không "quên" bộ lọc).
 *  2. `src/utils/catalog.ts` — dựng cây 2 cấp cho Navbar/`ProductsPage`/`CategoryPage`,
 *     sinh query lọc và phân trang cho `meta` của API.
 */
import {
  brandByIdOrSlug,
  categoryByIdOrSlug,
  categoryScopeIds,
  filterProducts,
  firstString,
  optionalNumber,
  sortProducts
} from '../server/catalog.ts';
import type { Brand, Category, Product } from '../server/types.ts';
import {
  buildCategoryTree,
  buildProductQuery,
  categoryChain,
  categoryDescendantIds,
  findCategory,
  paginationItems,
  paginationRange,
  priceRangeById,
  topLevelCategories
} from '../src/utils/catalog.ts';

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

/* ------------------------------------------------------------------ fixtures */
const category = (
  id: string,
  slug: string,
  name: string,
  parentId: string | null,
  sortOrder: number
): Category => ({ id, slug, name, parentId, sortOrder, isActive: true });

const CATEGORIES: Category[] = [
  category('cat-laptop', 'laptop', 'Laptop', null, 1),
  category('cat-laptop-gaming', 'laptop-gaming', 'Laptop Gaming', 'cat-laptop', 1),
  category('cat-laptop-acer-gaming', 'laptop-acer-gaming', 'Laptop Acer Gaming', 'cat-laptop-gaming', 1),
  category('cat-laptop-macbook', 'laptop-macbook', 'Laptop MacBook', 'cat-laptop', 2),
  category('cat-phone', 'dien-thoai', 'Điện thoại', null, 2)
];

const BRANDS: Brand[] = [
  { id: 'brand-apple', name: 'Apple', slug: 'apple', logo: '', country: 'USA', isActive: true },
  { id: 'brand-acer', name: 'Acer', slug: 'acer', logo: '', country: 'Taiwan', isActive: true }
];

const product = (
  id: string,
  categoryId: string,
  brandId: string,
  salePrice: number,
  createdDaysAgo: number,
  over: Partial<Product> = {}
): Product =>
  ({
    id,
    name: `Sản phẩm ${id}`,
    slug: id,
    sku: id.toUpperCase(),
    categoryId,
    brandId,
    originalPrice: salePrice + 1_000_000,
    salePrice,
    condition: 'new',
    stock: 5,
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
    createdAt: new Date(Date.UTC(2026, 8, 27) - createdDaysAgo * 86_400_000).toISOString(),
    ...over
  }) as Product;

const PRODUCTS: Product[] = [
  product('macbook-pro', 'cat-laptop-macbook', 'brand-apple', 40_000_000, 1, { isFeatured: true, viewCount: 90 }),
  product('acer-nitro', 'cat-laptop-acer-gaming', 'brand-acer', 25_000_000, 3, { viewCount: 30 }),
  product('laptop-gaming-x', 'cat-laptop-gaming', 'brand-acer', 18_000_000, 5, { condition: 'like_new' }),
  product('laptop-van-phong', 'cat-laptop', 'brand-acer', 12_000_000, 2),
  product('iphone-17', 'cat-phone', 'brand-apple', 30_000_000, 4, { isNew: true }),
  product('dien-thoai-re', 'cat-phone', 'brand-acer', 4_000_000, 6, { condition: 'used' })
];

const ids = (list: Product[]) => list.map(p => p.id);

/* ============================================ 1. server/catalog.ts — tra cứu */
console.log('\n== 1. Tra cứu danh mục / thương hiệu ==');
check('categoryByIdOrSlug theo id', categoryByIdOrSlug(CATEGORIES, 'cat-laptop')?.slug, 'laptop');
check('categoryByIdOrSlug theo slug', categoryByIdOrSlug(CATEGORIES, 'laptop')?.id, 'cat-laptop');
check('categoryByIdOrSlug không phân biệt hoa/thường', categoryByIdOrSlug(CATEGORIES, 'LAPTOP')?.id, 'cat-laptop');
check('categoryByIdOrSlug không tồn tại', categoryByIdOrSlug(CATEGORIES, 'khong-co') ?? null, null);
check('brandByIdOrSlug theo slug', brandByIdOrSlug(BRANDS, 'apple')?.id, 'brand-apple');
check('brandByIdOrSlug theo id', brandByIdOrSlug(BRANDS, 'brand-acer')?.name, 'Acer');

console.log('\n== 1b. Phạm vi danh mục (cha + con + cháu) ==');
check('danh mục gốc + 3 hậu duệ', categoryScopeIds(CATEGORIES, 'laptop'), [
  'cat-laptop',
  'cat-laptop-gaming',
  'cat-laptop-macbook',
  'cat-laptop-acer-gaming'
]);
check('danh mục con chỉ gồm chính nó + cháu', categoryScopeIds(CATEGORIES, 'laptop-gaming'), [
  'cat-laptop-gaming',
  'cat-laptop-acer-gaming'
]);
check('không truyền danh mục ⇒ null (không lọc)', categoryScopeIds(CATEGORIES, null), null);
check('danh mục lạ ⇒ [] (0 sản phẩm)', categoryScopeIds(CATEGORIES, 'danh-muc-la'), []);

/* ================================== 2. server/catalog.ts — lọc sản phẩm */
console.log('\n== 2. Lọc sản phẩm cho GET /products ==');
check(
  'lọc theo SLUG danh mục cha ⇒ gom cả SP danh mục con/cháu',
  ids(filterProducts(PRODUCTS, { category: 'laptop' }, CATEGORIES, BRANDS)),
  ['macbook-pro', 'laptop-van-phong', 'acer-nitro', 'laptop-gaming-x']
);
check(
  'lọc theo ID danh mục con',
  ids(filterProducts(PRODUCTS, { category: 'cat-laptop-macbook' }, CATEGORIES, BRANDS)),
  ['macbook-pro']
);
check(
  'danh mục lạ ⇒ rỗng (không bỏ qua bộ lọc)',
  ids(filterProducts(PRODUCTS, { category: 'khong-ton-tai' }, CATEGORIES, BRANDS)),
  []
);
check(
  'không có dữ liệu danh mục ⇒ khớp thẳng categoryId (tương thích ngược)',
  ids(filterProducts(PRODUCTS, { category: 'cat-phone' })),
  ['iphone-17', 'dien-thoai-re']
);
check(
  'lọc thương hiệu theo SLUG',
  ids(filterProducts(PRODUCTS, { brand: 'apple' }, CATEGORIES, BRANDS)),
  ['macbook-pro', 'iphone-17']
);
check(
  'lọc thương hiệu + danh mục cha kết hợp',
  ids(filterProducts(PRODUCTS, { brand: 'brand-acer', category: 'laptop' }, CATEGORIES, BRANDS)),
  ['laptop-van-phong', 'acer-nitro', 'laptop-gaming-x']
);
check(
  'khoảng giá 5–15 triệu',
  ids(filterProducts(PRODUCTS, { minPrice: '5000000', maxPrice: '15000000' }, CATEGORIES, BRANDS)),
  ['laptop-van-phong']
);
check(
  'tình trạng like_new',
  ids(filterProducts(PRODUCTS, { condition: 'like_new' }, CATEGORIES, BRANDS)),
  ['laptop-gaming-x']
);
check(
  'nổi bật / hàng mới',
  [
    ids(filterProducts(PRODUCTS, { featured: 'true' }, CATEGORIES, BRANDS)),
    ids(filterProducts(PRODUCTS, { isNew: 'true' }, CATEGORIES, BRANDS))
  ],
  [['macbook-pro'], ['iphone-17']]
);
check(
  'tìm theo tên/SKU/slug (không phân biệt hoa thường)',
  ids(filterProducts(PRODUCTS, { search: 'ACER-NITRO' }, CATEGORIES, BRANDS)),
  ['acer-nitro']
);
check(
  'sắp xếp giá tăng dần',
  ids(filterProducts(PRODUCTS, { sort: 'price-asc' }, CATEGORIES, BRANDS)),
  ['dien-thoai-re', 'laptop-van-phong', 'laptop-gaming-x', 'acer-nitro', 'iphone-17', 'macbook-pro']
);
check(
  'sắp xếp theo lượt xem',
  ids(filterProducts(PRODUCTS, { sort: 'views' }, CATEGORIES, BRANDS)),
  ['macbook-pro', 'acer-nitro', 'laptop-gaming-x', 'laptop-van-phong', 'iphone-17', 'dien-thoai-re']
);
check(
  'mặc định: mới lên kệ trước',
  ids(filterProducts(PRODUCTS, {}, CATEGORIES, BRANDS)),
  ['macbook-pro', 'laptop-van-phong', 'acer-nitro', 'iphone-17', 'laptop-gaming-x', 'dien-thoai-re']
);
check(
  'tham số rác bị bỏ qua, KHÔNG ném lỗi',
  ids(
    filterProducts(
      PRODUCTS,
      { minPrice: 'abc', maxPrice: '', featured: '1', sort: 'gia-tang', condition: ' ' },
      CATEGORIES,
      BRANDS
    )
  ),
  ['macbook-pro', 'laptop-van-phong', 'acer-nitro', 'iphone-17', 'laptop-gaming-x', 'dien-thoai-re']
);
check('firstString lấy giá trị đầu của query lặp', firstString(['a', 'b']), 'a');
check('optionalNumber chặn số âm', optionalNumber('-5') ?? null, null);
check(
  'sortProducts không sửa mảng gốc',
  [sortProducts(PRODUCTS, 'price-asc')[0].id, PRODUCTS[0].id],
  ['dien-thoai-re', 'macbook-pro']
);
/* ===================================== 3. src/utils/catalog.ts — dựng cây 2 cấp */
console.log('\n== 3. Dựng cây danh mục cho Navbar / sidebar ==');
check(
  'buildCategoryTree: 2 gốc, laptop có 2 con (sắp theo sortOrder)',
  buildCategoryTree(CATEGORIES).map(node => [node.slug, node.children.map(c => c.slug)]),
  [
    ['laptop', ['laptop-gaming', 'laptop-macbook']],
    ['dien-thoai', []]
  ]
);
check(
  'danh mục ẩn bị loại khỏi menu (mặc định)',
  buildCategoryTree([
    ...CATEGORIES,
    { ...category('cat-hidden', 'an', 'Danh mục ẩn', null, 9), isActive: false }
  ]).map(n => n.slug),
  ['laptop', 'dien-thoai']
);
check(
  'CMS vẫn thấy danh mục ẩn khi includeInactive',
  buildCategoryTree([{ ...CATEGORIES[4], isActive: false }], { includeInactive: true }).map(
    n => n.slug
  ),
  ['dien-thoai']
);
check(
  'danh mục mồ côi (parentId trỏ sai) được coi là gốc',
  topLevelCategories([
    ...CATEGORIES,
    category('cat-orphan', 'mo-coi', 'Mồ côi', 'khong-ton-tai', 3)
  ]).map(c => c.slug),
  ['laptop', 'dien-thoai', 'mo-coi']
);
check('findCategory theo slug', findCategory(CATEGORIES, 'laptop-macbook')?.id, 'cat-laptop-macbook');
check('categoryDescendantIds gồm cả cháu', categoryDescendantIds(CATEGORIES, 'laptop').length, 4);
check(
  'categoryChain đủ 3 cấp cho breadcrumb',
  categoryChain(CATEGORIES, 'laptop-acer-gaming').map(c => c.name),
  ['Laptop', 'Laptop Gaming', 'Laptop Acer Gaming']
);
check('categoryChain danh mục không tồn tại ⇒ []', categoryChain(CATEGORIES, 'la'), []);

/* ================================ 4. src/utils/catalog.ts — query & phân trang */
console.log('\n== 4. Sinh query lọc + phân trang ==');
check('buildProductQuery rỗng khi không lọc gì', buildProductQuery(), {});
check(
  'buildProductQuery gộp danh mục + hãng + giá + sắp xếp + từ khoá',
  buildProductQuery({
    category: 'laptop',
    brand: 'apple',
    condition: 'new',
    priceRange: '15m_30m',
    sort: 'price_desc',
    search: '  macbook  ',
    page: 2,
    limit: 20
  }),
  {
    category: 'laptop',
    brand: 'apple',
    condition: 'new',
    minPrice: 15_000_000,
    maxPrice: 30_000_000,
    sort: 'price-desc',
    search: 'macbook',
    page: 2,
    limit: 20
  }
);
check(
  'sắp xếp mặc định (newest) không đưa lên URL',
  buildProductQuery({ sort: 'newest', priceRange: 'all', page: 1 }),
  {}
);
check(
  'khoảng giá theo id (id lạ ⇒ không lọc)',
  [priceRangeById('under_5m').max ?? null, priceRangeById('abc').id],
  [5_000_000, 'all']
);
check(
  'paginationRange tính đúng khoảng bản ghi',
  [
    paginationRange({ page: 3, limit: 20, total: 63 }),
    paginationRange({ page: 1, limit: 20, total: 0 })
  ],
  [
    { from: 41, to: 60 },
    { from: 0, to: 0 }
  ]
);
check('paginationItems: ít trang thì liệt kê hết', paginationItems(5, 3), [1, 2, 3, 4, 5]);
check('paginationItems: nhiều trang thì rút gọn bằng -1', paginationItems(20, 10), [
  1, -1, 8, 9, 10, 11, 12, -1, 20
]);
check('paginationItems luôn có ít nhất trang 1', paginationItems(0, 0), [1]);

/* --------------------------------------------------------------------- tổng kết */
console.log(
  failed === 0
    ? `\nOK: ${passed} kiem tra dat — Danh muc 2 cap (P2.1) loc dung o cha/con, slug, phan trang.`
    : `\n${failed}/${passed + failed} kiem tra KHONG dat.`
);
process.exit(failed === 0 ? 0 : 1);

