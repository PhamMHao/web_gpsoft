/**
 * P0.2 — SEO động phía client.
 *
 * Trước P0.2 toàn bộ website dùng chung `<title>`/meta tĩnh trong `index.html` ⇒ Google chỉ thấy
 * 1 tiêu đề cho mọi URL, không có canonical, không có structured data. Module này là **nơi duy nhất**
 * ghi vào `<head>`: mỗi page gọi `setSeo()` một lần trong `useEffect` với dữ liệu của chính nó.
 *
 * Quy ước:
 * - Domain lấy từ `VITE_APP_URL` (build production) → `window.location.origin` → `DEFAULT_SITE_URL`
 *   (server dùng `APP_URL` trong `.env` cho `sitemap.xml`/`robots.txt`).
 * - `setSeo()` chạy được cả khi KHÔNG có DOM (SSR smoke test, prerender) — khi đó là no-op.
 * - JSON-LD cũ bị xoá trước khi inject ⇒ không nhân bản thẻ khi đổi trang.
 */
import { ROUTES } from './url.ts';
import type { Post, Product, ReviewStats, SeoSettings, Service, SystemSettings } from '../types/index.ts';

export const DEFAULT_SITE_URL = 'https://gpsoft.vn';
export const DEFAULT_SITE_NAME = 'GPSOFT Store & Enterprise';
export const DEFAULT_DESCRIPTION =
  'GPSOFT Store — hệ thống bán lẻ thiết bị công nghệ chính hãng: iPhone, MacBook, laptop, màn hình, phụ kiện. Bảo hành 12–24 tháng, trả góp 0%, giao hỏa tốc 2 giờ.';
/** TODO(P0.2): thay bằng ảnh OG thật của shop (VD `/og-cover.jpg` trong `public/`). */
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80';

export interface SeoInput {
  title: string;
  description?: string;
  /** Đường dẫn nội bộ (`/san-pham/abc`). Bỏ trống ⇒ **xoá** thẻ canonical cũ (VD khi vào CMS). */
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  /** VD `'noindex,nofollow'` cho khu vực quản trị. Bỏ trống ⇒ xoá meta robots. */
  robots?: string;
  /** Object hoặc mảng object JSON-LD (`Organization`, `Product`, `BreadcrumbList`…). */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/** Domain của site (không có `/` ở cuối). */
export const getSiteUrl = (): string => {
  // `import.meta.env` chỉ tồn tại khi qua Vite (browser/build). Trong Node (test, prerender)
  // nó là `undefined` nên phải đọc qua optional chaining để không ném lỗi.
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const envUrl = env?.VITE_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return DEFAULT_SITE_URL;
};

/** Ghép đường dẫn nội bộ thành URL tuyệt đối (URL tuyệt đối truyền vào được giữ nguyên). */
export const absoluteUrl = (path?: string): string => {
  const site = getSiteUrl();
  if (!path) return `${site}/`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${site}${path.startsWith('/') ? '' : '/'}${path}`;
};

/** Bỏ HTML tag + gộp khoảng trắng (dùng cho meta description lấy từ nội dung bài viết). */
export const plainText = (html?: string): string =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Cắt ngắn chuỗi an toàn cho SEO (mặc định 160 ký tự như khuyến nghị của Google). */
export const truncate = (text?: string, max = 160): string => {
  const clean = plainText(text);
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

/** 3 giá trị mặc định lấy từ CMS (SeoView) — page nào cũng nên dùng làm fallback. */
export const seoDefaults = (seoSettings?: SeoSettings | null, fallbackTitle = DEFAULT_SITE_NAME) => ({
  title: seoSettings?.metaTitle || seoSettings?.defaultTitle || fallbackTitle,
  description: seoSettings?.metaDescription || seoSettings?.defaultDescription || DEFAULT_DESCRIPTION,
  ogImage: seoSettings?.ogImage || DEFAULT_OG_IMAGE
});

const JSONLD_ATTR = 'data-seo-jsonld';

const upsertMeta = (attr: 'name' | 'property', key: string, content?: string): void => {
  const head = document.head;
  let tag = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertLink = (rel: string, href?: string): void => {
  const head = document.head;
  let tag = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    head.appendChild(tag);
  }
  tag.setAttribute('href', href);
};

/**
 * Ghi toàn bộ thẻ SEO của trang hiện tại vào `<head>`.
 * Gọi trong `useEffect` của page (chạy lại mỗi khi dữ liệu/URL đổi).
 */
export function setSeo(input: SeoInput): void {
  if (typeof document === 'undefined') return; // SSR / prerender: không có <head> để ghi

  const title = input.title?.trim() || DEFAULT_SITE_NAME;
  const description = truncate(input.description) || DEFAULT_DESCRIPTION;
  const canonical = input.canonicalPath === undefined ? undefined : absoluteUrl(input.canonicalPath);
  const ogImage = absoluteUrl(input.ogImage || DEFAULT_OG_IMAGE);
  const ogType = input.ogType || 'website';
  const pageUrl =
    canonical || absoluteUrl(typeof window !== 'undefined' ? window.location.pathname : '/');

  document.title = title;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', input.robots || undefined);

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', pageUrl);
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:site_name', DEFAULT_SITE_NAME);
  upsertMeta('property', 'og:locale', 'vi_VN');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', ogImage);

  upsertLink('canonical', canonical);

  // JSON-LD: xoá thẻ cũ trước khi inject (tránh trùng lặp khi điều hướng client-side).
  document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).forEach(el => el.remove());
  const blocks = (input.jsonLd ? (Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd]) : []).filter(
    (block): block is Record<string, unknown> => Boolean(block && Object.keys(block).length > 0)
  );
  if (blocks.length > 0) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(JSONLD_ATTR, 'true');
    script.textContent = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
    document.head.appendChild(script);
  }
}

/** Số thẻ JSON-LD đang có trong `<head>` (dùng cho test/bảo trì). */
export const countJsonLdBlocks = (): number =>
  typeof document === 'undefined' ? 0 : document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).length;

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD builders (schema.org) — dùng kèm trong `setSeo({ jsonLd: [...] })`
// ─────────────────────────────────────────────────────────────────────────────

const ORGANIZATION = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: DEFAULT_SITE_NAME,
  url: absoluteUrl('/')
});

/** `Organization` cho trang chủ — đọc từ `settings` (CMS → Settings) nếu có. */
export function organizationJsonLd(settings?: SystemSettings | null): Record<string, unknown> {
  const sameAs = [
    settings?.socials?.facebook,
    settings?.socials?.zalo,
    settings?.socials?.youtube,
    settings?.socials?.tiktok
  ].filter((link): link is string => Boolean(link));

  const logo = settings?.logo?.trim();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.companyName?.trim() || DEFAULT_SITE_NAME,
    url: absoluteUrl('/'),
    description: truncate(settings?.footerBio || DEFAULT_DESCRIPTION, 250),
    ...(logo ? { logo: absoluteUrl(logo) } : {}),
    ...(settings?.hotline ? { telephone: settings.hotline } : {}),
    ...(settings?.email || settings?.supportEmail
      ? { email: settings.email || settings.supportEmail }
      : {}),
    ...(settings?.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: settings.address,
            addressLocality: settings.showroom || '',
            addressCountry: 'VN'
          }
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {})
  };
}

/**
 * `WebSite` + SearchAction (ô tìm kiếm toàn site `/tim-kiem?q=`) — gắn ở trang chủ.
 * P2.8: target đổi từ `/san-pham?q=` sang `/tim-kiem?q=` vì từ P2.8 trang tìm kiếm trả cả
 * sản phẩm + bài viết + dịch vụ (Google Sitelinks Search Box trỏ đúng trang kết quả).
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: DEFAULT_SITE_NAME,
    url: absoluteUrl('/'),
    inLanguage: 'vi-VN',
    publisher: ORGANIZATION(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl(ROUTES.search)}?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** `BreadcrumbList` — truyền theo thứ tự từ gốc tới trang hiện tại. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

const PRODUCT_CONDITION_SCHEMA: Record<Product['condition'], string> = {
  new: 'https://schema.org/NewCondition',
  like_new: 'https://schema.org/RefurbishedCondition',
  used: 'https://schema.org/UsedCondition'
};

/**
 * `Product` + `Offer` (+ `AggregateRating` khi đã có review).
 * Ảnh được chuyển thành URL tuyệt đối vì JSON-LD bị crawl từ domain khác sẽ không hiểu path tương đối.
 */
export function productJsonLd(
  product: Product,
  options: { brandName?: string; categoryName?: string; stats?: ReviewStats | null } = {}
): Record<string, unknown> {
  const productUrl = absoluteUrl(`${ROUTES.products}/${product.slug || product.id}`);
  const images = [product.thumbnail, ...(product.gallery || [])]
    .filter((image): image is string => Boolean(image))
    .map(image => absoluteUrl(image));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncate(product.seo?.metaDesc || product.shortDesc || plainText(product.description)),
    sku: product.sku,
    ...(images.length > 0 ? { image: images } : {}),
    ...(options.brandName || product.brandId
      ? { brand: { '@type': 'Brand', name: options.brandName || product.brandId } }
      : {}),
    ...(options.categoryName ? { category: options.categoryName } : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'VND',
      price: product.salePrice,
      itemCondition: PRODUCT_CONDITION_SCHEMA[product.condition] || 'https://schema.org/NewCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: ORGANIZATION()
    },
    ...(options.stats && options.stats.totalReviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: options.stats.averageRating,
            reviewCount: options.stats.totalReviews,
            bestRating: 5,
            worstRating: 1
          }
        }
      : {})
  };
}

/** `Article` cho trang chi tiết tin tức. */
export function articleJsonLd(
  post: Post,
  options: { categoryName?: string } = {}
): Record<string, unknown> {
  const postUrl = absoluteUrl(`${ROUTES.news}/${post.slug || post.id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: truncate(post.title, 110),
    description: truncate(post.seo?.metaDesc || post.excerpt || plainText(post.content)),
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    ...(post.thumbnail ? { image: [absoluteUrl(post.thumbnail)] } : {}),
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.createdAt || post.publishedAt,
    ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
    publisher: { ...ORGANIZATION(), logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE } },
    ...(options.categoryName ? { articleSection: options.categoryName } : {}),
    ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {})
  };
}

/** `Service` cho trang dịch vụ. */
export function serviceJsonLd(service: Service): Record<string, unknown> {
  const price = service.priceRange || service.priceEstimate;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    serviceType: service.title,
    description: truncate(service.shortDesc || plainText(service.content)),
    url: absoluteUrl(`${ROUTES.services}/${service.slug || service.id}`),
    ...(service.thumbnail ? { image: absoluteUrl(service.thumbnail) } : {}),
    areaServed: { '@type': 'Country', name: 'Việt Nam' },
    provider: ORGANIZATION(),
    ...(price ? { offers: { '@type': 'Offer', priceCurrency: 'VND', description: price } } : {})
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** `FAQPage` — câu hỏi/đáp phải **hiển thị thật** trên trang (Google yêu cầu), không chỉ nằm trong JSON-LD. */
export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .filter(item => item.question && item.answer)
      .map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) }
      }))
  };
}
