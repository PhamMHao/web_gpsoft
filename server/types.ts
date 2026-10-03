export type ProductCondition = 'new' | 'like_new' | 'used';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cod' | 'bank_transfer';
/** P1.3 — thêm `warranty`: lead sinh ra từ nút “Gửi yêu cầu bảo hành” ở trang `/bao-hanh`. */
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
  passwordHash?: string;
  lastLoginAt?: string;
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
  title: string; // e.g. "Titan Đen - 256GB"
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>; // { "Màu sắc": "Titan Đen", "Bộ nhớ": "256GB" }
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
  /** P1.7 — mã giảm giá đã áp (đã validate lại ở server trước khi lưu). */
  couponCode?: string;
  /** P1.8 — phương thức vận chuyển đã chọn (id + tên để CMS/hoá đơn hiển thị). */
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
   * P2.3 — nguồn phát sinh lead, do form gửi lên (`website` khi form không khai báo,
   * `web-design` cho form nhận báo giá dịch vụ thiết kế website). Giúp sale biết lead
   * đến từ trang nào và dùng để lọc trong tab Leads của CMS.
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
  priceRange: string;
  processSteps: ServiceProcessStep[];
  faqs: ServiceFaq[];
  isFeatured: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  buttonText: string;
  position: 'hero' | 'promo' | 'sidebar';
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  target?: string;
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
  isPublished: boolean;
  seo: {
    metaTitle: string;
    metaDesc: string;
  };
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  category: 'image' | 'document' | 'other';
  uploadedAt: string;
  provider: 'local' | 'cloudinary';
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
    qrTemplate: string;
  };
  footerBio: string;
  copyright: string;
}

export interface RedirectRule {
  id: string;
  fromPath: string;
  toPath: string;
  code: 301 | 302;
  isActive: boolean;
}

export interface SeoSettings {
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  ogImage: string;
  robotsTxt: string;
  sitemapAuto: boolean;
  redirects: RedirectRule[];
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

/** P1.4 — vòng đời báo giá: nháp → đã gửi → khách chấp nhận/từ chối → hết hiệu lực. */
export type PriceQuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/** P1.4 — 1 dòng hàng trong báo giá (bảng con `price_quote_items`). */
export interface PriceQuoteItem {
  name: string;
  /** Quy cách / cấu hình: `M3 Pro 11-core CPU / 18GB / 512GB`. */
  spec?: string;
  /** Đơn vị tính: Chiếc / Gói / Lần / Bộ. */
  unit: string;
  qty: number;
  unitPrice: number;
  /** Luôn = `qty × unitPrice` — server tính lại, KHÔNG tin số client gửi. */
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
  /** Σ(qty × unitPrice) trên toàn bộ `items` — server tính, không nhận từ client. */
  total: number;
  status: PriceQuoteStatus;
  /** Hạn hiệu lực của báo giá (ISO). Quá ngày mà chưa chốt ⇒ coi như hết hiệu lực. */
  validUntil: string;
  createdBy: string;
  createdAt: string;
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

/** P1.7 — kiểu giảm giá: theo % (`percent`) hoặc số tiền cố định (`fixed`). */
export type CouponDiscountType = 'percent' | 'fixed';

/** P1.7 — phạm vi áp dụng: toàn bộ / theo danh mục / theo từng sản phẩm. */
export type CouponApplyTo = 'all' | 'category' | 'product';

/**
 * P1.7 — mã giảm giá (`coupons`). Là dữ liệu CÔNG KHAI một phần: khách gọi
 * `POST /coupons/validate` nên route chỉ trả `{ valid, discount, message }`, không lộ
 * `usageLimit`/`usedCount`. `usedCount` do server tăng khi đơn được tạo thành công.
 */
export interface Coupon {
  id: string;
  /** Mã khách nhập, luôn lưu ở dạng CHUẨN HOÁ (`GPSOFT500`, bỏ khoảng trắng, in hoa). */
  code: string;
  name: string;
  discountType: CouponDiscountType;
  /** `percent` ⇒ 1–100 (%) · `fixed` ⇒ số tiền VND. */
  value: number;
  /** Giá trị hàng tối thiểu để dùng được (0 = không yêu cầu). */
  minOrder: number;
  /** Trần giảm cho coupon `percent` (bỏ trống = không giới hạn). */
  maxDiscount?: number;
  /** 0 = không giới hạn lượt dùng. */
  usageLimit: number;
  usedCount: number;
  startAt?: string;
  endAt?: string;
  applyTo: CouponApplyTo;
  /** `categoryId` hoặc `productId` tuỳ `applyTo`; rỗng khi `applyTo = 'all'`. */
  applyIds: string[];
  isActive: boolean;
  createdAt: string;
}

/** Kết quả validate mã giảm giá — dùng cho `POST /coupons/validate` và order (P1.7). */
export interface CouponValidation {
  valid: boolean;
  /** Số tiền được giảm (0 khi không hợp lệ hoặc coupon không áp được cho giỏ này). */
  discount: number;
  /** Thông báo tiếng Việt hiển thị thẳng cho khách. */
  message: string;
}

/** P1.8 — phương thức vận chuyển (`shipping_methods`). */
export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  /** Phí giao hàng (VND). */
  fee: number;
  /** Miễn phí khi giá trị hàng ≥ mức này; 0 = luôn thu phí. */
  freeFrom: number;
  /** Thời gian dự kiến, VD `Trong 2 giờ` / `1–2 ngày`. */
  estimatedDays: string;
  /** Khu vực áp dụng, VD `['TP. Hồ Chí Minh', 'Hà Nội']`; rỗng = toàn quốc. */
  regions: string[];
  isActive: boolean;
  sortOrder: number;
}

/** P1.9 — loại chiến dịch: đếm ngược / flash sale / banner. */
export type CampaignType = 'countdown' | 'flash_sale' | 'banner';

/**
 * P1.9 — chiến dịch khuyến mãi (`campaigns`). Trang chủ đọc campaign đang chạy để vẽ
 * khối flash sale + đếm ngược theo `endAt` (hết `endAt` ⇒ khối tự ẩn).
 */
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  startAt?: string;
  endAt?: string;
  /** % giảm hiển thị trên badge (chỉ để hiển thị, không tự tính giá). */
  discountPercent?: number;
  /** Sản phẩm thuộc chiến dịch; rỗng ⇒ lấy sản phẩm đang giảm giá nhiều nhất. */
  productIds: string[];
  bannerImage?: string;
  ctaText?: string;
  ctaUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  roles: Role[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  reviews: ProductReview[];
  orders: Order[];
  customers: Customer[];
  leads: Lead[];
  warranties: Warranty[];
  priceQuotes: PriceQuote[];
  quoteLinks: QuoteLink[];
  coupons: Coupon[];
  shippingMethods: ShippingMethod[];
  campaigns: Campaign[];
  postCategories: PostCategory[];
  posts: Post[];
  services: Service[];
  banners: Banner[];
  menus: Menu[];
  pages: Page[];
  mediaFiles: MediaFile[];
  settings: SystemSettings;
  seoSettings: SeoSettings;
}
