export type ProductCondition = 'new' | 'like_new' | 'used';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cod' | 'bank_transfer';
export type LeadType = 'contact' | 'quote' | 'warranty' | 'newsletter';
export type LeadStatus = 'new' | 'contacted' | 'resolved' | 'cancelled';
/** P1.1 — Bảo hành: nguồn bảo hành và trạng thái phiếu tiếp nhận. */
export type WarrantyType = 'nha_san_xuat' | 'mo_rong';
export type WarrantyStatus = 'received' | 'inspecting' | 'repairing' | 'waiting_part' | 'done' | 'returned' | 'rejected';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'staff' | 'customer';
  permissions: string[];
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  country: string;
  website?: string;
  description?: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  originalPrice: number;
  salePrice: number;
  condition: ProductCondition;
  stock: number;
  shortDesc: string;
  description: string;
  specs: Record<string, string>;
  attributes: Array<{ name: string; options: string[] }>;
  variants: ProductVariant[];
  thumbnail: string;
  gallery: string[];
  isFeatured: boolean;
  isNew: boolean;
  status: 'active' | 'draft' | 'archived';
  seo: {
    metaTitle: string;
    metaDesc: string;
    metaKeywords: string;
  };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  title: string;
  sku: string;
  price: number;
  quantity: number;
  thumbnail: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  address: {
    province: string;
    district: string;
    ward: string;
    street: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  note?: string;
  /** P1.7 — mã giảm giá đã áp (server validate lại khi tạo đơn). */
  couponCode?: string;
  /** P1.8 — phương thức vận chuyển đã chọn (id + tên hiển thị). */
  shippingMethodId?: string;
  shippingMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  province?: string;
  totalSpent: number;
  orderCount: number;
  lastOrderAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  type: LeadType;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  interestedProduct?: string;
  /**
   * P2.3 — nguồn phát sinh lead (`website` mặc định, `web-design` cho form dịch vụ thiết kế
   * website). Dùng để hiển thị badge + lọc trong tab Leads của CMS.
   */
  source?: string;
  status: LeadStatus;
  adminNote?: string;
  createdAt: string;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  author: string;
  tags: string[];
  isFeatured: boolean;
  viewCount: number;
  seo: {
    metaTitle: string;
    metaDesc: string;
  };
  status: 'published' | 'draft';
  publishedAt: string;
  createdAt: string;
}

export type WebsitePage =
  | 'home'
  | 'products'
  | 'product-detail'
  /** P2.1 — trang danh mục riêng `/danh-muc/:slug` (danh mục 2 cấp). */
  | 'category'
  /** P2.1 — trang thương hiệu riêng `/thuong-hieu/:slug`. */
  | 'brand'
  | 'services'
  | 'price-list'
  | 'news'
  | 'about'
  | 'contact'
  | 'page'
  | 'warranty'
  /** P1.5/P1.6 — Link Báo Giá `/bao-gia/:code`. */
  | 'quote-detail'
  /** P2.2 — module "Phần mềm chấm công" `/phan-mem-cham-cong`. */
  | 'attendance'
  /** P2.3 — dịch vụ "Thiết kế website" `/thiet-ke-website`. */
  | 'web-design'
  /** P2.8 — trang kết quả tìm kiếm toàn site `/tim-kiem?q=` (từ khóa nằm ở query string). */
  | 'search'
  /**
   * P2.10 — form đăng nhập CMS `/login-admin`: cửa vào khu quản trị, URL ẩn (không Navbar/Footer,
   * không link/menu/sitemap nào trỏ tới).
   */
  | 'admin-login';

export type CmsTab =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'leads'
  | 'categories'
  | 'brands'
  | 'banners'
  | 'menus'
  | 'pages'
  | 'posts'
  | 'news'
  | 'services'
  | 'warranties'
  | 'quotes'
  | 'coupons'
  | 'shipping'
  | 'campaigns'
  | 'media'
  | 'files'
  | 'seo'
  | 'settings'
  | 'users';

export type ServiceFAQ = ServiceFaq;
export type SiteSettings = SystemSettings;
export type SeoConfig = SeoSettings;

export interface ServiceProcessStep {
  step: number;
  title: string;
  desc: string;
  /** P2.3 — thời lượng dự kiến của bước (trang "Thiết kế website" khai báo; CMS có thể để trống). */
  duration?: string;
}

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  content: string;
  icon: string;
  thumbnail: string;
  priceRange?: string;
  priceEstimate?: string;
  processSteps?: ServiceProcessStep[];
  process?: ServiceProcessStep[];
  faqs?: ServiceFaq[];
  faq?: ServiceFaq[];
  isFeatured?: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  image?: string;
  linkUrl?: string;
  link?: string;
  buttonText: string;
  position?: 'hero' | 'promo' | 'sidebar';
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  label?: string;
  title?: string;
  url: string;
  icon?: string;
  target?: string;
  position?: 'header' | 'footer' | string;
  sortOrder?: number;
  isExternal?: boolean;
  children?: Array<{ id: string; label: string; url: string }>;
}

export interface Menu {
  id: string;
  title: string;
  location: 'header' | 'footer' | 'quick_links';
  items: MenuItem[];
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished?: boolean;
  seo?: {
    metaTitle: string;
    metaDesc: string;
  };
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  filename?: string;
  originalName?: string;
  name?: string;
  mimeType?: string;
  size: number | string;
  url: string;
  category?: 'image' | 'document' | 'other';
  uploadedAt?: string;
  createdAt?: string;
  provider?: 'local' | 'cloudinary';
}

export interface SystemSettings {
  companyName: string;
  slogan: string;
  logo: string;
  favicon: string;
  hotline: string;
  hotline2: string;
  email: string;
  supportEmail: string;
  address: string;
  showroom: string;
  googleMapsEmbedUrl: string;
  socials: {
    facebook: string;
    zalo: string;
    youtube: string;
    tiktok: string;
  };
  bankInfo: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolder: string;
    branch: string;
    qrTemplate?: string;
  };
  footerBio?: string;
  copyright?: string;
}

export interface RedirectRule {
  id: string;
  fromPath?: string;
  from?: string;
  toPath?: string;
  to?: string;
  code?: 301 | 302;
  statusCode?: 301 | 302;
  isActive: boolean;
}

export interface SeoSettings {
  defaultTitle?: string;
  metaTitle?: string;
  defaultDescription?: string;
  metaDescription?: string;
  defaultKeywords?: string;
  metaKeywords?: string;
  ogImage: string;
  robotsTxt: string;
  sitemapAuto?: boolean;
  redirects: RedirectRule[];
}

export interface DashboardStats {
  totalRevenue: number;
  orderCount: number;
  pendingOrders: number;
  customerCount: number;
  leadCount: number;
  newLeads: number;
  productCount: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  recentOrders: Order[];
  statusCounts: Record<string, number>;
  last7Days: Array<{ date: string; revenue: number; orderCount: number }>;
}

export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  variantTitle?: string;
  tags?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  adminReply?: {
    author: string;
    content: string;
    createdAt: string;
  };
  createdAt: string;
}

export interface Warranty {
  id: string;
  /** Mã phiếu in cho khách, VD `BH-2026-0004`. */
  code: string;
  customerName: string;
  phone: string;
  email?: string;
  productId: string;
  productName: string;
  serialNumber?: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  warrantyMonths: number;
  warrantyType: WarrantyType;
  status: WarrantyStatus;
  issue: string;
  diagnosis?: string;
  resolution?: string;
  technician?: string;
  cost?: number;
  receivedAt?: string;
  returnedAt?: string;
  createdAt: string;
}

/**
 * P1.1 — Kết quả tra cứu công khai (`GET /api/warranties/lookup?q=`).
 * Kèm `remainingDays` để trang `/bao-hanh` (P1.3) vẽ badge còn hạn / sắp hết / đã hết.
 */
export interface WarrantyLookupItem extends Warranty {
  /** Số ngày còn lại tới `endDate` (âm = đã hết hạn, `null` = ngày không hợp lệ). */
  remainingDays: number | null;
  isExpired: boolean;
  /** Thông tin sản phẩm để vẽ card (có thể không tìm thấy sản phẩm trong DB). */
  product?: {
    id: string;
    name: string;
    slug: string;
    thumbnail: string;
    salePrice: number;
  } | null;
}

/** P1.4 — vòng đời báo giá: nháp → đã gửi → khách chấp nhận/từ chối → hết hiệu lực. */
export type PriceQuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/** P1.4 — 1 dòng hàng trong báo giá. */
export interface PriceQuoteItem {
  name: string;
  /** Quy cách / cấu hình: `M3 Pro 11-core CPU / 18GB / 512GB`. */
  spec?: string;
  unit: string;
  qty: number;
  unitPrice: number;
  /** = `qty × unitPrice` (server luôn tính lại). */
  total: number;
}

export interface PriceQuote {
  id: string;
  /** Mã báo giá in cho khách, VD `BG-2026-0001`. */
  code: string;
  title: string;
  customerName: string;
  phone: string;
  email?: string;
  company?: string;
  note?: string;
  items: PriceQuoteItem[];
  /** Σ(qty × unitPrice) — server tính. */
  total: number;
  status: PriceQuoteStatus;
  /** Hạn hiệu lực (ISO). */
  validUntil: string;
  createdBy: string;
  createdAt: string;
  /** Server trả kèm khi qua `withEffectiveStatus()` — số ngày còn lại tới `validUntil`. */
  remainingDays?: number | null;
  /** `true` ⇒ quá `validUntil` mà chưa chốt (server tự suy, không lưu trong DB). */
  isExpired?: boolean;
}

/**
 * P1.5 — Link chia sẻ báo giá (`quote_links`). Khách mở `/bao-gia/<code>`:
 * link phải đang bật, chưa quá `expiresAt`, và nếu có `password` thì phải nhập đúng.
 */
export interface QuoteLink {
  id: string;
  /** Mã ngắn trên URL chia sẻ, VD `BG7K2M9Q`. */
  code: string;
  quoteId: string;
  /** Rỗng/không có ⇒ link công khai, ai có URL cũng xem được. */
  password?: string;
  expiresAt: string;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
}

/** P1.5 — `GET /quote-links/:code` trả kèm báo giá để trang public render luôn. */
export interface QuoteLinkView {
  link: QuoteLink;
  quote: PriceQuote;
  /** `true` ⇒ đang chờ nhập mật khẩu (client hiện form, chưa lộ dữ liệu báo giá). */
  requiresPassword: boolean;
}

/* =========================================================================
   P1.7 / P1.8 / P1.9 — THƯƠNG MẠI: mã giảm giá · phí vận chuyển · chiến dịch
   ========================================================================= */

/** P1.7 — kiểu giảm giá: theo % (`percent`) hoặc số tiền cố định (`fixed`). */
export type CouponDiscountType = 'percent' | 'fixed';

/** P1.7 — phạm vi áp dụng: toàn bộ / theo danh mục / theo từng sản phẩm. */
export type CouponApplyTo = 'all' | 'category' | 'product';

/** P1.7 — mã giảm giá (CMS quản lý trong `CouponsView`). */
export interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  /** 0 = không giới hạn lượt dùng. */
  usageLimit: number;
  usedCount: number;
  startAt?: string;
  endAt?: string;
  applyTo: CouponApplyTo;
  applyIds: string[];
  isActive: boolean;
  createdAt: string;
}

/** P1.7 — kết quả `POST /coupons/validate` (route công khai, không lộ `usageLimit`). */
export interface CouponValidation {
  valid: boolean;
  discount: number;
  message: string;
}

/** P1.7 — mã giảm giá ĐANG áp trong giỏ (state dùng chung ở `AppContext`). */
export interface AppliedCoupon {
  code: string;
  name: string;
  discount: number;
}

/** P1.8 — phương thức vận chuyển (`shipping_methods`). */
export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  fee: number;
  /** Miễn phí khi giá trị hàng ≥ mức này; 0 = luôn thu phí. */
  freeFrom: number;
  estimatedDays: string;
  regions: string[];
  isActive: boolean;
  sortOrder: number;
}

/** P1.9 — loại chiến dịch khuyến mãi. */
export type CampaignType = 'countdown' | 'flash_sale' | 'banner';

/** P1.9 — chiến dịch khuyến mãi (`campaigns`) hiển thị ở `HomePage`. */
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  startAt?: string;
  endAt?: string;
  discountPercent?: number;
  productIds: string[];
  bannerImage?: string;
  ctaText?: string;
  ctaUrl?: string;
  isActive: boolean;
  createdAt: string;
}

/** P1.7 — trạng thái mã giảm giá tại thời điểm hiện tại (server tính, CMS hiển thị badge). */
export type CouponState =
  | 'ok'
  | 'invalid'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'used_up'
  | 'min_order'
  | 'out_of_scope';

/** P1.7 — `GET /coupons` trả kèm `state` để CMS vẽ badge + lọc theo tab trạng thái. */
export interface CouponView extends Coupon {
  state: CouponState;
}

/** P1.9 — trạng thái campaign tại thời điểm hiện tại (`running`/`scheduled`/`ended`/`paused`). */
export type CampaignState = 'running' | 'scheduled' | 'ended' | 'paused';

/** P1.9 — `GET /campaigns` trả kèm `state`. */
export interface CampaignView extends Campaign {
  state: CampaignState;
}

/** P1.9 — `GET /campaigns/active` trả kèm sản phẩm đã giải cho khối flash sale trang chủ. */
export interface ActiveCampaignView extends CampaignView {
  products: Product[];
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  recommendedPercentage: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
