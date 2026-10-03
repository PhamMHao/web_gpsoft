/**
 * P0.2 — Smoke test SEO: JSON-LD builders + `setSeo()` ghi `<head>`.
 *
 * Chạy: `npm run test:seo`
 * Không cài thêm jsdom: file này dựng một **DOM tối giản** đủ dùng cho `setSeo()`
 * (head/appendChild/querySelector/remove) rồi assert đúng các thẻ `<title>`, meta, canonical, JSON-LD.
 */
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  countJsonLdBlocks,
  DEFAULT_SITE_URL,
  faqJsonLd,
  getSiteUrl,
  organizationJsonLd,
  plainText,
  productJsonLd,
  serviceJsonLd,
  setSeo,
  truncate,
  websiteJsonLd
} from '../src/utils/seo.ts';
import type { Post, Product, ReviewStats, Service, SystemSettings } from '../src/types/index.ts';

let failed = 0;
let passed = 0;

const check = <T>(label: string, actual: T, expected: T) => {
  const ok = actual === expected;
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${ok ? '' : `  (mong đợi ${JSON.stringify(expected)})`}`
  );
};

// ───────────────────────── DOM tối giản ─────────────────────────
interface FakeNode {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  parent: FakeHead | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  remove(): void;
}

class FakeElement implements FakeNode {
  tagName: string;
  attributes: Record<string, string> = {};
  textContent = '';
  parent: FakeHead | null = null;

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  remove() {
    if (this.parent) {
      const parent = this.parent;
      parent.children = parent.children.filter(child => child !== this);
      this.parent = null;
    }
  }
}

/** Khớp selector dạng `meta[name="description"]`, `link[rel="canonical"]`, `script[data-seo-jsonld]`. */
const matchesSelector = (element: FakeElement, selector: string): boolean => {
  const withValue = /^([a-z]+)\[([\w-]+)="([^"]*)"\]$/i.exec(selector);
  if (withValue) {
    const [, tag, attr, value] = withValue;
    return element.tagName === tag.toLowerCase() && element.getAttribute(attr) === value;
  }
  const attrOnly = /^([a-z]+)\[([\w-]+)\]$/i.exec(selector);
  if (attrOnly) {
    const [, tag, attr] = attrOnly;
    return element.tagName === tag.toLowerCase() && element.getAttribute(attr) !== null;
  }
  return element.tagName === selector.toLowerCase();
};

class FakeHead {
  children: FakeElement[] = [];

  appendChild(element: FakeElement) {
    element.parent = this;
    this.children.push(element);
    return element;
  }

  querySelector(selector: string): FakeElement | null {
    return this.children.find(child => matchesSelector(child, selector)) ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    return this.children.filter(child => matchesSelector(child, selector));
  }
}

const installFakeDom = () => {
  const head = new FakeHead();
  const fakeDocument = {
    title: '',
    head,
    createElement: (tagName: string) => new FakeElement(tagName),
    querySelector: (selector: string) => head.querySelector(selector),
    querySelectorAll: (selector: string) => head.querySelectorAll(selector)
  };
  (globalThis as { document?: unknown }).document = fakeDocument;
  return { head, fakeDocument };
};

const head = () => (globalThis as unknown as { document: { head: FakeHead } }).document.head;
const docTitle = () => (globalThis as unknown as { document: { title: string } }).document.title;
const metaContent = (attr: 'name' | 'property', key: string) =>
  head().querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
const canonicalHref = () => head().querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
const jsonLdPayload = (): unknown => {
  const script = head().querySelector('script[data-seo-jsonld]');
  return script?.textContent ? JSON.parse(script.textContent) : null;
};


// ───────────────────────── Fixtures ─────────────────────────
const settings: SystemSettings = {
  companyName: 'GPSOFT Store',
  slogan: 'Công nghệ chính hãng',
  logo: '/uploads/logo.png',
  favicon: '/favicon.ico',
  hotline: '1900 6868',
  hotline2: '028 7777 6868',
  email: 'info@gpsoft.vn',
  supportEmail: 'support@gpsoft.vn',
  address: '123 Nguyễn Trãi, Q.1',
  showroom: 'TP. Hồ Chí Minh',
  googleMapsEmbedUrl: 'https://maps.google.com/embed',
  socials: {
    facebook: 'https://facebook.com/gpsoft',
    zalo: '',
    youtube: 'https://youtube.com/@gpsoft',
    tiktok: ''
  },
  bankInfo: { bankName: 'VCB', bankCode: 'VCB', accountNumber: '123', accountHolder: 'TECHRO', branch: 'Q1' },
  footerBio: 'GPSOFT — bán lẻ thiết bị công nghệ chính hãng.',
  copyright: '© GPSOFT'
};

const product: Product = {
  id: 'p1',
  name: 'MacBook Air M3 16GB/512GB',
  slug: 'macbook-air-m3',
  sku: 'TP-MBA-M3',
  categoryId: 'laptop',
  brandId: 'apple',
  originalPrice: 32000000,
  salePrice: 28000000,
  condition: 'new',
  stock: 5,
  shortDesc: 'Laptop mỏng nhẹ cho dân văn phòng.',
  description: '<p>Chi tiết sản phẩm</p>',
  specs: { CPU: 'M3' },
  attributes: [],
  variants: [],
  thumbnail: '/uploads/mba.jpg',
  gallery: ['/uploads/mba-2.jpg'],
  isFeatured: true,
  isNew: true,
  status: 'active',
  seo: {
    metaTitle: 'MacBook Air M3 chính hãng',
    metaDesc: 'MacBook Air M3 16GB/512GB giá tốt.',
    metaKeywords: 'macbook air m3'
  },
  viewCount: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z'
};

const outOfStockProduct: Product = { ...product, id: 'p2', slug: 'macbook-cu', stock: 0, condition: 'like_new' };

const stats: ReviewStats = {
  averageRating: 4.6,
  totalReviews: 12,
  recommendedPercentage: 95,
  ratingDistribution: { 5: 8, 4: 3, 3: 1, 2: 0, 1: 0 }
};

const post: Post = {
  id: 'n1',
  title: 'Top 5 laptop đáng mua 2026',
  slug: 'top-5-laptop-2026',
  category: 'Tư vấn',
  excerpt: 'Danh sách laptop đáng mua nhất.',
  content: '<p>Nội dung rất dài</p>',
  thumbnail: '/uploads/post.jpg',
  author: 'Nguyễn Quốc Bảo',
  tags: ['laptop', 'tư vấn'],
  isFeatured: true,
  viewCount: 3,
  seo: { metaTitle: '', metaDesc: 'Gợi ý laptop đáng mua nhất 2026.' },
  status: 'published',
  publishedAt: '2026-03-01T02:00:00Z',
  createdAt: '2026-03-01T01:00:00Z'
};

const service: Service = {
  id: 's1',
  title: 'Sửa chữa laptop',
  slug: 'sua-chua-laptop',
  shortDesc: 'Sửa chữa laptop lấy ngay.',
  content: '<p>Quy trình sửa chữa</p>',
  icon: 'Wrench',
  thumbnail: '/uploads/service.jpg',
  priceRange: '200.000 – 2.000.000đ'
};

// ───────────────────────── 1. Helper thuần ─────────────────────────
check('getSiteUrl() ngoài browser → DEFAULT_SITE_URL', getSiteUrl(), DEFAULT_SITE_URL);
check('absoluteUrl("/san-pham")', absoluteUrl('/san-pham'), `${DEFAULT_SITE_URL}/san-pham`);
check(
  'absoluteUrl(URL tuyệt đối) giữ nguyên',
  absoluteUrl('https://cdn.gpsoft.vn/a.jpg'),
  'https://cdn.gpsoft.vn/a.jpg'
);
check('plainText bỏ HTML + gộp space', plainText('<p>Xin&nbsp;  chào</p>'), 'Xin chào');
check('truncate cắt còn 160 ký tự', truncate('a'.repeat(300)).length, 160);
check('truncate giữ nguyên chuỗi ngắn', truncate('ngắn'), 'ngắn');

// Nhánh fallback: không có `VITE_APP_URL` (dev/staging) nhưng có `window` → canonical theo origin.
(globalThis as { window?: unknown }).window = {
  location: { origin: 'http://localhost:3100', pathname: '/tin-tuc' }
};
check('getSiteUrl() fallback theo window.location.origin', getSiteUrl(), 'http://localhost:3100');
check('absoluteUrl("/bang-gia") theo origin', absoluteUrl('/bang-gia'), 'http://localhost:3100/bang-gia');
delete (globalThis as { window?: unknown }).window;
check('bỏ window → quay lại DEFAULT_SITE_URL', getSiteUrl(), DEFAULT_SITE_URL);

// ───────────────────────── 2. JSON-LD builders ─────────────────────────
const org = organizationJsonLd(settings);
check('organizationJsonLd @type', org['@type'], 'Organization');
check('organizationJsonLd name từ settings', org.name, 'GPSOFT Store');
check('organizationJsonLd telephone', org.telephone, '1900 6868');
check('organizationJsonLd logo tuyệt đối', org.logo, `${DEFAULT_SITE_URL}/uploads/logo.png`);
check('organizationJsonLd sameAs bỏ link rỗng', (org.sameAs as string[]).length, 2);
check('organizationJsonLd address country', (org.address as { addressCountry: string }).addressCountry, 'VN');
check('organizationJsonLd không truyền settings → tên mặc định', organizationJsonLd(null).name, 'GPSOFT Store & Enterprise');

const website = websiteJsonLd();
check('websiteJsonLd @type', website['@type'], 'WebSite');
check(
  'P2.8 — websiteJsonLd SearchAction trỏ trang tìm kiếm toàn site /tim-kiem?q=',
  (website.potentialAction as { target: string }).target,
  `${DEFAULT_SITE_URL}/tim-kiem?q={search_term_string}`
);

const crumbs = breadcrumbJsonLd([
  { name: 'Trang chủ', path: '/' },
  { name: 'Sản phẩm', path: '/san-pham' }
]);
const crumbItems = crumbs.itemListElement as Array<{ position: number; item: string; name: string }>;
check('breadcrumbJsonLd số item', crumbItems.length, 2);
check('breadcrumbJsonLd position bắt đầu từ 1', crumbItems[0].position, 1);
check('breadcrumbJsonLd item tuyệt đối', crumbItems[1].item, `${DEFAULT_SITE_URL}/san-pham`);

const productLd = productJsonLd(product, { brandName: 'Apple', categoryName: 'Laptop' });
const offer = productLd.offers as Record<string, unknown>;
check('productJsonLd @type', productLd['@type'], 'Product');
check('productJsonLd sku', productLd.sku, 'TP-MBA-M3');
check('productJsonLd giá = salePrice', offer.price, 28000000);
check('productJsonLd tiền tệ', offer.priceCurrency, 'VND');
check('productJsonLd máy mới → NewCondition', offer.itemCondition, 'https://schema.org/NewCondition');
check('productJsonLd còn hàng → InStock', offer.availability, 'https://schema.org/InStock');
check('productJsonLd ảnh tuyệt đối (thumbnail + gallery)', (productLd.image as string[]).length, 2);
check('productJsonLd offer.url', offer.url, `${DEFAULT_SITE_URL}/san-pham/macbook-air-m3`);
check('productJsonLd brand theo tên tra được', (productLd.brand as { name: string }).name, 'Apple');
check('productJsonLd chưa có review → không aggregateRating', productLd.aggregateRating, undefined);

const rating = productJsonLd(product, { stats }).aggregateRating as Record<string, unknown>;
check('productJsonLd AggregateRating.ratingValue', rating.ratingValue, 4.6);
check('productJsonLd AggregateRating.reviewCount', rating.reviewCount, 12);
check(
  'productJsonLd totalReviews = 0 → bỏ AggregateRating',
  productJsonLd(product, { stats: { ...stats, totalReviews: 0 } }).aggregateRating,
  undefined
);

const outLd = productJsonLd(outOfStockProduct);
check('productJsonLd hết hàng → OutOfStock', (outLd.offers as Record<string, unknown>).availability, 'https://schema.org/OutOfStock');
check(
  'productJsonLd Like New → RefurbishedCondition',
  (outLd.offers as Record<string, unknown>).itemCondition,
  'https://schema.org/RefurbishedCondition'
);

const articleLd = articleJsonLd(post, { categoryName: 'Tư vấn' });
check('articleJsonLd @type', articleLd['@type'], 'Article');
check('articleJsonLd datePublished', articleLd.datePublished, '2026-03-01T02:00:00Z');
check('articleJsonLd articleSection', articleLd.articleSection, 'Tư vấn');
check('articleJsonLd keywords', articleLd.keywords, 'laptop, tư vấn');
check(
  'articleJsonLd mainEntityOfPage',
  (articleLd.mainEntityOfPage as { '@id': string })['@id'],
  `${DEFAULT_SITE_URL}/tin-tuc/top-5-laptop-2026`
);

const serviceLd = serviceJsonLd(service);
check('serviceJsonLd @type', serviceLd['@type'], 'Service');
check('serviceJsonLd url', serviceLd.url, `${DEFAULT_SITE_URL}/dich-vu/sua-chua-laptop`);
check(
  'serviceJsonLd offers.description = priceRange',
  (serviceLd.offers as { description: string }).description,
  '200.000 – 2.000.000đ'
);

const faqLd = faqJsonLd([
  { question: 'Câu 1?', answer: '<b>Đáp</b> án 1' },
  { question: 'Câu 2?', answer: 'Đáp án 2' },
  { question: '', answer: 'Thiếu câu hỏi → bị lọc' }
]);
const faqItems = faqLd.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
check('faqJsonLd @type', faqLd['@type'], 'FAQPage');
check('faqJsonLd lọc item thiếu question', faqItems.length, 2);
check('faqJsonLd bỏ HTML trong đáp án', faqItems[0].acceptedAnswer.text, 'Đáp án 1');

// ───────────────────────── 3. setSeo() ghi <head> (DOM tối giản) ─────────────────────────
installFakeDom();

check('trước khi setSeo: <title> rỗng', docTitle(), '');
check('trước khi setSeo: chưa có JSON-LD', countJsonLdBlocks(), 0);

setSeo({
  title: 'MacBook Air M3 — Giá Tốt',
  description: 'Mô tả sản phẩm',
  canonicalPath: '/san-pham/macbook-air-m3',
  ogImage: '/uploads/mba.jpg',
  ogType: 'product',
  jsonLd: [productJsonLd(product, { stats }), breadcrumbJsonLd([{ name: 'Trang chủ', path: '/' }])]
});

check('setSeo ghi <title>', docTitle(), 'MacBook Air M3 — Giá Tốt');
check('setSeo ghi meta description', metaContent('name', 'description'), 'Mô tả sản phẩm');
check('setSeo ghi canonical tuyệt đối', canonicalHref(), `${DEFAULT_SITE_URL}/san-pham/macbook-air-m3`);
check('setSeo ghi og:title', metaContent('property', 'og:title'), 'MacBook Air M3 — Giá Tốt');
check('setSeo ghi og:type = product', metaContent('property', 'og:type'), 'product');
check('setSeo ghép ảnh OG thành URL tuyệt đối', metaContent('property', 'og:image'), `${DEFAULT_SITE_URL}/uploads/mba.jpg`);
check('setSeo ghi og:url = canonical', metaContent('property', 'og:url'), `${DEFAULT_SITE_URL}/san-pham/macbook-air-m3`);
check('setSeo ghi og:site_name', metaContent('property', 'og:site_name'), 'GPSOFT Store & Enterprise');
check('setSeo ghi twitter:card', metaContent('name', 'twitter:card'), 'summary_large_image');
check('setSeo inject đúng 1 thẻ JSON-LD', countJsonLdBlocks(), 1);

const payload = jsonLdPayload() as Array<Record<string, unknown>>;
check('JSON-LD gộp 2 block thành mảng', Array.isArray(payload) && payload.length === 2, true);
check('JSON-LD block 1 = Product', payload[0]['@type'], 'Product');
check('JSON-LD block 2 = BreadcrumbList', payload[1]['@type'], 'BreadcrumbList');
check('JSON-LD Product có AggregateRating', (payload[0].aggregateRating as { reviewCount: number }).reviewCount, 12);

// Gọi lại lần 2 (điều hướng client-side) ⇒ không nhân bản thẻ
setSeo({ title: 'Trang chủ', description: 'Mô tả mới', canonicalPath: '/', jsonLd: websiteJsonLd() });
check('gọi lại lần 2: <title> thay mới', docTitle(), 'Trang chủ');
check('gọi lại lần 2: canonical thay mới', canonicalHref(), `${DEFAULT_SITE_URL}/`);
check('gọi lại lần 2: không nhân bản meta description', head().querySelectorAll('meta[name="description"]').length, 1);
check('gọi lại lần 2: không nhân bản canonical', head().querySelectorAll('link[rel="canonical"]').length, 1);
check('gọi lại lần 2: JSON-LD cũ bị thay (không cộng dồn)', countJsonLdBlocks(), 1);
const singlePayload = jsonLdPayload() as Record<string, unknown>;
check('1 block → JSON-LD là object đơn (không bọc mảng)', Array.isArray(singlePayload), false);
check('1 block → đúng WebSite', singlePayload['@type'], 'WebSite');

// Bỏ canonical (VD vào CMS) + thêm robots noindex
setSeo({ title: 'Quản trị CMS', robots: 'noindex,nofollow' });
check('không truyền canonical → thẻ canonical bị xoá', canonicalHref(), null);
check('ghi meta robots', metaContent('name', 'robots'), 'noindex,nofollow');
check('không truyền jsonLd → xoá hết JSON-LD', countJsonLdBlocks(), 0);

setSeo({ title: 'Trang sản phẩm', description: 'x', canonicalPath: '/san-pham' });
check('bỏ robots ở lần sau → thẻ robots bị xoá', metaContent('name', 'robots'), null);

// Không có DOM (SSR/prerender) phải là no-op, không ném lỗi
delete (globalThis as { document?: unknown }).document;
let ssrError = '';
try {
  setSeo({ title: 'SSR', description: 'không có document' });
} catch (error) {
  ssrError = (error as Error).message;
}
check('setSeo() khi không có document: không ném lỗi', ssrError, '');
check('countJsonLdBlocks() khi không có document = 0', countJsonLdBlocks(), 0);

console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `${failed} assertion KHONG dat (${passed} đạt).`}`);
process.exit(failed === 0 ? 0 : 1);
