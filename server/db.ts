import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DatabaseSchema, Product, ProductReview, Order, Customer, Lead, Warranty, PriceQuote, PriceQuoteItem, QuoteLink, Coupon, ShippingMethod, Campaign, Category, Brand, Post, PostCategory, Service, Banner, Menu, Page, MediaFile, SystemSettings, SeoSettings, User, Role } from './types.js';
import { getStore } from './database/index.js';
// P2.3 — seed service cho trang `/thiet-ke-website`: dùng CHUNG hằng số với client (nút seed trong CMS)
// để nội dung tĩnh của trang và dữ liệu CMS không bao giờ lệch nhau.
import { WEB_DESIGN_SERVICE_SEED } from '../src/utils/webDesign.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Quản trị viên tối cao (Super Admin)',
    description: 'Toàn quyền truy cập mọi tính năng CMS, cấu hình hệ thống và tài khoản.',
    permissions: ['all', 'products.*', 'orders.*', 'customers.*', 'content.*', 'settings.*', 'users.*']
  },
  {
    id: 'role-editor',
    name: 'Biên tập viên nội dung (Content Editor)',
    description: 'Quản lý tin tức, bài viết, dịch vụ, trang tĩnh và banner.',
    permissions: ['content.view', 'content.create', 'content.edit', 'content.delete', 'products.view']
  },
  {
    id: 'role-staff',
    name: 'Nhân viên bán hàng & kho (Sales Staff)',
    description: 'Xử lý đơn hàng, cập nhật tồn kho sản phẩm, phản hồi leads, khách hàng, phiếu bảo hành, báo giá và khuyến mãi.',
    permissions: ['orders.view', 'orders.edit', 'products.view', 'products.stock', 'customers.view', 'leads.view', 'leads.edit', 'warranty.view', 'warranty.create', 'warranty.edit', 'quotes.view', 'quotes.create', 'quotes.edit', 'coupon.view', 'coupon.create', 'coupon.edit', 'shipping.view', 'shipping.edit', 'campaign.view', 'campaign.create', 'campaign.edit']
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    fullName: 'Nguyễn Quốc Bảo',
    email: 'admin@gpsoft.vn',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    permissions: ['all'],
    createdAt: '2025-01-01T08:00:00Z'
  },
  {
    id: 'usr-editor-1',
    username: 'editor_linh',
    fullName: 'Trần Thùy Linh',
    email: 'linh.tran@gpsoft.vn',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'editor',
    permissions: ['content.*', 'products.view'],
    createdAt: '2025-01-10T09:30:00Z'
  },
  {
    id: 'usr-staff-1',
    username: 'sales_tuan',
    fullName: 'Lê Anh Tuấn',
    email: 'tuan.sales@gpsoft.vn',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'staff',
    permissions: ['orders.*', 'leads.*', 'customers.*'],
    createdAt: '2025-02-01T10:00:00Z'
  }
];

/**
 * P2.1 — Danh mục **cấp 2** (con của danh mục cha bên dưới).
 *
 * `Category.parentId` đã có trong schema từ trước nhưng chưa từng có dữ liệu ⇒ mega menu / sidebar
 * không có gì để mở rộng. Khối này là dữ liệu mẫu cho cây 2 cấp:
 * - Laptop & MacBook → MacBook · Laptop Gaming · Laptop Văn phòng - Đồ họa
 * - Điện thoại Smartphone → iPhone · Samsung Galaxy
 *
 * DB đã tồn tại từ trước P2.1 được nâng cấp tự động trong `GPSOFTDatabase.init()`
 * (xem `ensureDemoSubcategories()`) nên không cần xoá `data/gpsoft.sqlite` thủ công.
 */
const INITIAL_SUBCATEGORIES: Category[] = [
  {
    id: 'cat-laptops-macbook',
    name: 'MacBook',
    slug: 'macbook',
    icon: 'Laptop',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    description: 'MacBook Air M2/M3 và MacBook Pro M3/M4 chip Apple Silicon, bảo hành 12 tháng.',
    parentId: 'cat-laptops',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'cat-laptops-gaming',
    name: 'Laptop Gaming',
    slug: 'laptop-gaming',
    icon: 'Gamepad2',
    image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600&auto=format&fit=crop&q=80',
    description: 'Asus ROG, Acer Nitro, MSI GF66 với card đồ họa rời RTX — chơi game và render mượt.',
    parentId: 'cat-laptops',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'cat-laptops-office',
    name: 'Laptop Văn phòng - Đồ họa',
    slug: 'laptop-van-phong-do-hoa',
    icon: 'Briefcase',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
    description: 'Dell XPS, Asus ZenBook, ThinkPad mỏng nhẹ pin lâu cho dân văn phòng và thiết kế.',
    parentId: 'cat-laptops',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'cat-phones-iphone',
    name: 'iPhone',
    slug: 'iphone',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=600&auto=format&fit=crop&q=80',
    description: 'iPhone 16 Pro Max, iPhone 15 series VN/A chính hãng, trợ giá thu cũ lên đời.',
    parentId: 'cat-phones',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'cat-phones-samsung',
    name: 'Samsung Galaxy',
    slug: 'samsung-galaxy',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
    description: 'Galaxy S24 Ultra, Z Fold màn hình gập — bảo hành 12 tháng chính hãng Samsung VN.',
    parentId: 'cat-phones',
    sortOrder: 2,
    isActive: true
  }
];

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-phones',
    name: 'Điện thoại Smartphone',
    slug: 'dien-thoai-smartphone',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    description: 'iPhone, Samsung Galaxy, Xiaomi chính hãng, bảo hành 24 tháng, trợ giá thu cũ đổi mới.',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'cat-laptops',
    name: 'Laptop & MacBook',
    slug: 'laptop-macbook',
    icon: 'Laptop',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    description: 'MacBook Pro, Dell XPS, Asus ROG, ThinkPad hiệu năng cao phục vụ lập trình, đồ họa.',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'cat-tablets',
    name: 'Máy tính bảng Tablet',
    slug: 'may-tinh-bang-tablet',
    icon: 'Tablet',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
    description: 'iPad Pro M4, iPad Air, Galaxy Tab S9 màn hình sắc nét hỗ trợ bút cảm ứng.',
    sortOrder: 3,
    isActive: true
  },
  {
    id: 'cat-smartwatches',
    name: 'Đồng hồ thông minh',
    slug: 'dong-ho-thong-minh',
    icon: 'Watch',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
    description: 'Apple Watch Ultra, Garmin Forerunner, Galaxy Watch đo nhịp tim, thể thao cao cấp.',
    sortOrder: 4,
    isActive: true
  },
  {
    id: 'cat-audio',
    name: 'Tai nghe & Âm thanh',
    slug: 'tai-nghe-am-thanh',
    icon: 'Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    description: 'AirPods Pro, Sony WH-1000XM5, Marshall, loa bluetooth chống ồn chủ động cao cấp.',
    sortOrder: 5,
    isActive: true
  },
  {
    id: 'cat-cameras',
    name: 'Máy ảnh & Ống kính',
    slug: 'may-anh-ong-kinh',
    icon: 'Camera',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
    description: 'Fujifilm X-T5, Sony Alpha, Canon EOS R chụp ảnh quay phim 4K/8K đỉnh cao.',
    sortOrder: 6,
    isActive: true
  },
  {
    id: 'cat-monitors',
    name: 'Màn hình máy tính',
    slug: 'man-hinh-may-tinh',
    icon: 'Monitor',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    description: 'LG UltraFine, Dell UltraSharp 4K, Asus ProArt chuyên nghiệp chuẩn màu 100% sRGB.',
    sortOrder: 7,
    isActive: true
  },
  {
    id: 'cat-accessories',
    name: 'Phụ kiện cao cấp',
    slug: 'phu-kien-cao-cap',
    icon: 'Cpu',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    description: 'Bàn phím cơ Logitech, chuột MX Master 3S, sạc nhanh GaN 100W, củ cáp Anker chính hãng.',
    sortOrder: 8,
    isActive: true
  },
  // P2.1 — nối danh mục cấp 2 vào cuối danh sách cha (giữ nguyên id/slug cũ ⇒ không phá link đã có).
  ...INITIAL_SUBCATEGORIES
];

/**
 * P2.1 — Chuyển sản phẩm mẫu từ danh mục **cha** xuống danh mục **con** để trang danh mục cấp 2
 * có dữ liệu thật. Chỉ áp dụng cho DB đã tạo trước P2.1 (lúc đó chưa có danh mục con) và chỉ khi
 * sản phẩm vẫn đang nằm ở danh mục cha ban đầu ⇒ không ghi đè danh mục admin đã sửa trong CMS.
 */
const DEMO_SUBCATEGORY_ASSIGNMENTS: Array<{ productId: string; from: string; to: string }> = [
  { productId: 'prod-iphone-16-pro-max', from: 'cat-phones', to: 'cat-phones-iphone' },
  { productId: 'prod-samsung-s24-ultra', from: 'cat-phones', to: 'cat-phones-samsung' },
  { productId: 'prod-macbook-pro-14-m3-pro', from: 'cat-laptops', to: 'cat-laptops-macbook' },
  { productId: 'prod-macbook-air-m2-used', from: 'cat-laptops', to: 'cat-laptops-macbook' },
  { productId: 'prod-dell-xps-13-plus', from: 'cat-laptops', to: 'cat-laptops-office' }
];

const INITIAL_BRANDS: Brand[] = [
  {
    id: 'brand-apple',
    name: 'Apple',
    slug: 'apple',
    logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&auto=format&fit=crop&q=80',
    country: 'Mỹ',
    website: 'https://apple.com',
    description: 'Hãng công nghệ hàng đầu thế giới với hệ sinh thái iPhone, Mac, iPad, Apple Watch.',
    isActive: true
  },
  {
    id: 'brand-samsung',
    name: 'Samsung',
    slug: 'samsung',
    logo: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100&auto=format&fit=crop&q=80',
    country: 'Hàn Quốc',
    website: 'https://samsung.com',
    description: 'Tập đoàn điện tử tiên phong với dòng màn hình gập Galaxy Z Fold, Galaxy S Ultra.',
    isActive: true
  },
  {
    id: 'brand-sony',
    name: 'Sony',
    slug: 'sony',
    logo: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=100&auto=format&fit=crop&q=80',
    country: 'Nhật Bản',
    website: 'https://sony.com.vn',
    description: 'Đỉnh cao công nghệ âm thanh chống ồn, máy ảnh không gương lật Alpha và PlayStation.',
    isActive: true
  },
  {
    id: 'brand-dell',
    name: 'Dell',
    slug: 'dell',
    logo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100&auto=format&fit=crop&q=80',
    country: 'Mỹ',
    website: 'https://dell.com',
    description: 'Thương hiệu máy trạm & laptop doanh nhân Dell XPS, Latitude bền bỉ hàng đầu.',
    isActive: true
  },
  {
    id: 'brand-asus',
    name: 'Asus',
    slug: 'asus',
    logo: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100&auto=format&fit=crop&q=80',
    country: 'Đài Loan',
    website: 'https://asus.com',
    description: 'Tiên phong thiết kế ZenBook thanh lịch và cỗ máy gaming ROG số 1 thị trường.',
    isActive: true
  },
  {
    id: 'brand-logitech',
    name: 'Logitech',
    slug: 'logitech',
    logo: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=100&auto=format&fit=crop&q=80',
    country: 'Thụy Sĩ',
    website: 'https://logitech.com',
    description: 'Phụ kiện văn phòng đỉnh cao MX Master, MX Keys và gaming gear Logitech G.',
    isActive: true
  },
  {
    id: 'brand-fujifilm',
    name: 'Fujifilm',
    slug: 'fujifilm',
    logo: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=100&auto=format&fit=crop&q=80',
    country: 'Nhật Bản',
    website: 'https://fujifilm-x.com',
    description: 'Thương hiệu máy ảnh hoài cổ với hệ màu giả lập phim Film Simulation lừng danh.',
    isActive: true
  },
  {
    id: 'brand-lg',
    name: 'LG Electronics',
    slug: 'lg',
    logo: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=100&auto=format&fit=crop&q=80',
    country: 'Hàn Quốc',
    website: 'https://lg.com',
    description: 'Dẫn đầu công nghệ tấm nền OLED, màn hình đồ họa UltraFine và tivi cao cấp.',
    isActive: true
  }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-iphone-16-pro-max',
    name: 'iPhone 16 Pro Max 256GB - Titan Tự Nhiên',
    slug: 'iphone-16-pro-max-256gb-titan-tu-nhien',
    sku: 'IP16PM-256-NAT',
    categoryId: 'cat-phones-iphone',
    brandId: 'brand-apple',
    originalPrice: 34990000,
    salePrice: 31990000,
    condition: 'new',
    stock: 28,
    shortDesc: 'Chip A18 Pro 3nm vượt trội, khung viền Titanium siêu bền, nút Camera Control thế hệ mới.',
    description: `iPhone 16 Pro Max sở hữu màn hình Super Retina XDR 6.9 inch lớn nhất từng có, viền màn hình siêu mỏng tuyệt mỹ. Trang bị chip Apple A18 Pro mạnh mẽ hỗ trợ Apple Intelligence toàn diện, camera 48MP Fusion thế hệ 2 kèm camera tele 5x Tetraprism. Thời lượng pin dài nhất trên mọi thế hệ iPhone.`,
    specs: {
      'Màn hình': '6.9 inch Super Retina XDR OLED, 120Hz ProMotion',
      'Vi xử lý': 'Apple A18 Pro (6 nhân CPU, 6 nhân GPU)',
      'RAM': '8GB',
      'Bộ nhớ trong': '256GB / 512GB / 1TB',
      'Camera sau': 'Chính 48MP + Góc siêu rộng 48MP + Tele 5x 12MP',
      'Camera trước': '12MP TrueDepth Face ID',
      'Pin & Sạc': 'Thời lượng xem video tới 33h, sạc nhanh MagSafe 25W',
      'Chất liệu': 'Khung viền Titan Cấp 5, mặt kính Ceramic Shield'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Titan Tự Nhiên', 'Titan Đen', 'Titan Trắng', 'Titan Sa Mạc'] },
      { name: 'Dung lượng', options: ['256GB', '512GB', '1TB'] }
    ],
    variants: [
      {
        id: 'var-16pm-256-nat',
        title: 'Titan Tự Nhiên - 256GB',
        sku: 'IP16PM-256-NAT',
        price: 31990000,
        originalPrice: 34990000,
        stock: 12,
        attributes: { 'Màu sắc': 'Titan Tự Nhiên', 'Dung lượng': '256GB' }
      },
      {
        id: 'var-16pm-512-nat',
        title: 'Titan Tự Nhiên - 512GB',
        sku: 'IP16PM-512-NAT',
        price: 37990000,
        originalPrice: 40990000,
        stock: 8,
        attributes: { 'Màu sắc': 'Titan Tự Nhiên', 'Dung lượng': '512GB' }
      },
      {
        id: 'var-16pm-256-blk',
        title: 'Titan Đen - 256GB',
        sku: 'IP16PM-256-BLK',
        price: 31990000,
        originalPrice: 34990000,
        stock: 8,
        attributes: { 'Màu sắc': 'Titan Đen', 'Dung lượng': '256GB' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: true,
    status: 'active',
    seo: {
      metaTitle: 'Mua iPhone 16 Pro Max 256GB Titan Chính Hãng VN/A Giá Tốt',
      metaDesc: 'iPhone 16 Pro Max 256GB VN/A giá rẻ nhất, sẵn hàng titan tự nhiên, hỗ trợ trả góp 0%, thu cũ đổi mới trợ giá 2 triệu đồng.',
      metaKeywords: 'iphone 16 pro max, mua iphone 16 pro max, iphone titan tu nhien, apple vn/a'
    },
    viewCount: 4210,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-02-15T14:30:00Z'
  },
  {
    id: 'prod-macbook-pro-14-m3-pro',
    name: 'MacBook Pro 14 inch M3 Pro (18GB / 512GB SSD) - Space Black',
    slug: 'macbook-pro-14-inch-m3-pro-18gb-512gb-space-black',
    sku: 'MBP14-M3P-18-512',
    categoryId: 'cat-laptops-macbook',
    brandId: 'brand-apple',
    originalPrice: 49990000,
    salePrice: 46490000,
    condition: 'new',
    stock: 15,
    shortDesc: 'Màn hình Liquid Retina XDR 120Hz, chip M3 Pro 11 nhân CPU, 14 nhân GPU, màu Đen Không Gian cực đẹp.',
    description: `MacBook Pro 14 inch với chip M3 Pro mang lại hiệu năng phi thường cho các tác vụ lập trình full-stack, dựng video 4K đa luồng và thiết kế đồ họa 3D. Vỏ nhôm nguyên khối Space Black chống bám vân tay đột phá, thời lượng pin lên đến 18 giờ liên tục.`,
    specs: {
      'Màn hình': '14.2 inch Liquid Retina XDR (3024 x 1964), 120Hz Promotion, 1600 nits',
      'Vi xử lý': 'Apple M3 Pro (11 nhân CPU, 14 nhân GPU)',
      'RAM': '18GB Unified Memory',
      'Ổ cứng': '512GB SSD tốc độ cao',
      'Cổng kết nối': '3x Thunderbolt 4, HDMI, khe thẻ nhớ SDXC, MagSafe 3',
      'Trọng lượng': '1.61 kg',
      'Pin': 'Lên tới 18 giờ, sạc nhanh 70W USB-C'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Space Black', 'Silver'] },
      { name: 'Bộ nhớ RAM', options: ['18GB', '36GB'] }
    ],
    variants: [
      {
        id: 'var-mbp14-18-blk',
        title: 'Space Black - 18GB RAM - 512GB SSD',
        sku: 'MBP14-M3P-18-512-BLK',
        price: 46490000,
        originalPrice: 49990000,
        stock: 10,
        attributes: { 'Màu sắc': 'Space Black', 'Bộ nhớ RAM': '18GB' }
      },
      {
        id: 'var-mbp14-36-blk',
        title: 'Space Black - 36GB RAM - 512GB SSD',
        sku: 'MBP14-M3P-36-512-BLK',
        price: 54990000,
        originalPrice: 58990000,
        stock: 5,
        attributes: { 'Màu sắc': 'Space Black', 'Bộ nhớ RAM': '36GB' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'MacBook Pro 14 M3 Pro 18GB 512GB Space Black Giá Tốt',
      metaDesc: 'Mua MacBook Pro 14 M3 Pro chính hãng bảo hành Apple Care 12 tháng, giao hàng hỏa tốc trong 2h tại Hà Nội & TP.HCM.',
      metaKeywords: 'macbook pro 14 m3 pro, macbook m3 pro, laptop apple, space black'
    },
    viewCount: 3150,
    createdAt: '2025-01-05T09:00:00Z',
    updatedAt: '2025-02-18T11:00:00Z'
  },
  {
    id: 'prod-samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra 5G 12GB/256GB - Like New 99%',
    slug: 'samsung-galaxy-s24-ultra-5g-12gb-256gb-like-new',
    sku: 'SS-S24U-256-LN',
    categoryId: 'cat-phones-samsung',
    brandId: 'brand-samsung',
    originalPrice: 33990000,
    salePrice: 22890000,
    condition: 'like_new',
    stock: 9,
    shortDesc: 'Máy lướt đẹp 99% nguyên bản chưa qua sửa chữa, tích hợp Galaxy AI thông minh, camera mắt thần bóng đêm 200MP.',
    description: `Sản phẩm Galaxy S24 Ultra hình thức tuyển chọn 99% đẹp như mới, pin hoàn hảo 98-100%, bảo hành 12 tháng 1 đổi 1 trong 30 ngày. Khung viền Titanium phẳng, bút S-Pen tích hợp, chip Snapdragon 8 Gen 3 for Galaxy tối ưu hóa chơi game mượt mà.`,
    specs: {
      'Màn hình': '6.8 inch Dynamic AMOLED 2X, QHD+, 120Hz, 2600 nits chống lóa',
      'Vi xử lý': 'Snapdragon 8 Gen 3 for Galaxy',
      'RAM': '12GB',
      'Bộ nhớ trong': '256GB',
      'Camera': '200MP + 50MP (5x) + 10MP (3x) + 12MP (Góc rộng)',
      'Pin': '5000 mAh, sạc nhanh 45W'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Xám Titan', 'Đen Titan', 'Vàng Titan'] }
    ],
    variants: [
      {
        id: 'var-s24u-gray',
        title: 'Xám Titan - 256GB (Like New 99%)',
        sku: 'SS-S24U-256-LN-GRY',
        price: 22890000,
        originalPrice: 33990000,
        stock: 5,
        attributes: { 'Màu sắc': 'Xám Titan' }
      },
      {
        id: 'var-s24u-blk',
        title: 'Đen Titan - 256GB (Like New 99%)',
        sku: 'SS-S24U-256-LN-BLK',
        price: 22890000,
        originalPrice: 33990000,
        stock: 4,
        attributes: { 'Màu sắc': 'Đen Titan' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'Samsung Galaxy S24 Ultra Cũ Like New 99% Giá Rẻ Bảo Hành 12T',
      metaDesc: 'Mua Samsung Galaxy S24 Ultra like new 99% nguyên zin, camera 200MP, Galaxy AI, tặng đầy đủ củ sạc nhanh 45W.',
      metaKeywords: 's24 ultra cu, samsung s24 ultra 99%, galaxy s24 ultra like new'
    },
    viewCount: 1890,
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2025-02-10T16:00:00Z'
  },
  {
    id: 'prod-dell-xps-13-plus',
    name: 'Dell XPS 13 Plus 9320 (Core i7-1360P / 16GB / 512GB / OLED 3.5K Touch)',
    slug: 'dell-xps-13-plus-9320-i7-16gb-512gb-oled',
    sku: 'DELL-XPS13P-OLED',
    categoryId: 'cat-laptops-office',
    brandId: 'brand-dell',
    originalPrice: 42990000,
    salePrice: 36990000,
    condition: 'new',
    stock: 7,
    shortDesc: 'Thiết kế tương lai với bàn phím tràn viền, thanh chức năng cảm ứng vô cực và màn hình OLED 3.5K tuyệt mỹ.',
    description: `Dell XPS 13 Plus đại diện cho đỉnh cao thiết kế Ultrabook hiện đại. Bàn di chuột kính tàng hình haptic feedback, màn hình OLED độ sáng cao hiển thị màu đen sâu thẳm, trọng lượng chỉ 1.23kg cực kỳ gọn nhẹ cho doanh nhân.`,
    specs: {
      'Màn hình': '13.4 inch 3.5K OLED (3456 x 2160) Cảm ứng, 100% DCI-P3',
      'Vi xử lý': 'Intel Core i7-1360P (12 nhân, 16 luồng, Turbo 5.0 GHz)',
      'RAM': '16GB LPDDR5 6000MHz',
      'Ổ cứng': '512GB PCIe Gen 4 NVMe SSD',
      'Đồ họa': 'Intel Iris Xe Graphics',
      'Trọng lượng': '1.23 kg'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Platinum Silver', 'Graphite'] }
    ],
    variants: [
      {
        id: 'var-xps13-plt',
        title: 'Platinum Silver - i7 / 16GB / 512GB OLED',
        sku: 'DELL-XPS13P-OLED-PLT',
        price: 36990000,
        originalPrice: 42990000,
        stock: 5,
        attributes: { 'Màu sắc': 'Platinum Silver' }
      },
      {
        id: 'var-xps13-grp',
        title: 'Graphite - i7 / 16GB / 512GB OLED',
        sku: 'DELL-XPS13P-OLED-GRP',
        price: 36990000,
        originalPrice: 42990000,
        stock: 2,
        attributes: { 'Màu sắc': 'Graphite' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: false,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'Dell XPS 13 Plus 9320 OLED Chính Hãng Giá Tốt Nhất',
      metaDesc: 'Bán laptop Dell XPS 13 Plus 9320 OLED cảm ứng, bảo hành Dell ProSupport 12 tháng tận nơi.',
      metaKeywords: 'dell xps 13 plus, dell xps oled, laptop mong nhe cao cap'
    },
    viewCount: 1420,
    createdAt: '2025-01-12T14:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'prod-sony-wh1000xm5',
    name: 'Tai nghe chống ồn Sony WH-1000XM5 Hi-Res Audio',
    slug: 'tai-nghe-chong-on-sony-wh-1000xm5-hi-res',
    sku: 'SONY-WH1000XM5-BLK',
    categoryId: 'cat-audio',
    brandId: 'brand-sony',
    originalPrice: 8990000,
    salePrice: 6990000,
    condition: 'new',
    stock: 45,
    shortDesc: 'Khả năng chống ồn chủ động ANC hàng đầu thế giới với 2 bộ vi xử lý và 8 micro chuyên dụng.',
    description: `Sony WH-1000XM5 tái định nghĩa trải nghiệm âm thanh không dây cao cấp. Củ loa 30mm carbon composite đem lại âm bass trầm ấm uy lực và chi tiết cao. Thời lượng pin 30 giờ, sạc nhanh 3 phút nghe được 3 giờ.`,
    specs: {
      'Kiểu tai nghe': 'Over-ear Chụp tai',
      'Kết nối': 'Bluetooth 5.2, LDAC, jack 3.5mm, Multipoint kết nối 2 thiết bị',
      'Chống ồn': 'Bộ xử lý tích hợp V1 + Bộ xử lý HD QN1',
      'Thời lượng pin': '30 giờ (bật ANC), 40 giờ (tắt ANC)',
      'Trọng lượng': '250g'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Đen', 'Bạc Ánh Kim', 'Xanh Midnight Blue'] }
    ],
    variants: [
      {
        id: 'var-xm5-blk',
        title: 'Màu Đen (Black)',
        sku: 'SONY-XM5-BLK',
        price: 6990000,
        originalPrice: 8990000,
        stock: 25,
        attributes: { 'Màu sắc': 'Đen' }
      },
      {
        id: 'var-xm5-slv',
        title: 'Bạc Ánh Kim (Silver)',
        sku: 'SONY-XM5-SLV',
        price: 6990000,
        originalPrice: 8990000,
        stock: 20,
        attributes: { 'Màu sắc': 'Bạc Ánh Kim' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'Tai nghe Sony WH-1000XM5 Chính Hãng Giá Ưu Đãi Nhất',
      metaDesc: 'Tai nghe chụp tai Sony WH-1000XM5 chính hãng, âm thanh Hi-Res, chống ồn đỉnh cao, bảo hành 12 tháng Sony VN.',
      metaKeywords: 'sony wh 1000xm5, tai nghe chong on sony, tai nghe sony bluetooth'
    },
    viewCount: 2640,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-02-14T11:00:00Z'
  },
  {
    id: 'prod-fujifilm-xt5',
    name: 'Máy ảnh Mirrorless Fujifilm X-T5 Body - Silver Classic',
    slug: 'may-anh-mirrorless-fujifilm-x-t5-body-silver',
    sku: 'FUJI-XT5-SLV',
    categoryId: 'cat-cameras',
    brandId: 'brand-fujifilm',
    originalPrice: 42900000,
    salePrice: 38900000,
    condition: 'new',
    stock: 6,
    shortDesc: 'Cảm biến X-Trans CMOS 5 HR 40.2MP, chống rung IBIS 7 stops, quay video 6.2K/30p, giả lập 19 màu film kinh điển.',
    description: `Fujifilm X-T5 là biểu tượng nhiếp ảnh kết hợp hoàn hảo giữa nét hoài cổ cơ học và công nghệ hình ảnh tân tiến nhất. Thân máy nhỏ gọn với vòng xoay cơ học kim loại cao cấp, hệ thống lấy nét AI nhận diện chủ thể tự động.`,
    specs: {
      'Cảm biến': '40.2 Megapixels APS-C X-Trans CMOS 5 HR',
      'Bộ xử lý': 'X-Processor 5 lấy nét AI cực nhanh',
      'Chống rung': 'IBIS 5 trục trong thân máy lên đến 7 stops',
      'Quay phim': '6.2K 30fps 10-bit 4:2:2, 4K 60fps',
      'Màn hình': 'LCD 3 chiều cảm ứng 1.84 triệu điểm',
      'Trọng lượng': '557g (kèm pin và thẻ nhớ)'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Bạc Classic', 'Đen Black'] }
    ],
    variants: [
      {
        id: 'var-xt5-slv',
        title: 'Bạc Classic (Silver)',
        sku: 'FUJI-XT5-BODY-SLV',
        price: 38900000,
        originalPrice: 42900000,
        stock: 4,
        attributes: { 'Màu sắc': 'Bạc Classic' }
      },
      {
        id: 'var-xt5-blk',
        title: 'Đen Black',
        sku: 'FUJI-XT5-BODY-BLK',
        price: 38900000,
        originalPrice: 42900000,
        stock: 2,
        attributes: { 'Màu sắc': 'Đen Black' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: true,
    status: 'active',
    seo: {
      metaTitle: 'Fujifilm X-T5 Body Bạc Chính Hãng Giá Tốt Nhất',
      metaDesc: 'Mua máy ảnh Fujifilm X-T5 cảm biến 40.2MP chống rung 7 stops, tặng thẻ nhớ SD 64GB và túi đựng máy cao cấp.',
      metaKeywords: 'fujifilm x-t5, fuji xt5, may anh mirrorless fujifilm'
    },
    viewCount: 1980,
    createdAt: '2025-01-18T10:00:00Z',
    updatedAt: '2025-02-12T15:00:00Z'
  },
  {
    id: 'prod-logitech-mx-master-3s',
    name: 'Chuột không dây công thái học Logitech MX Master 3S',
    slug: 'chuot-khong-day-logitech-mx-master-3s',
    sku: 'LOGI-MXM3S-GRY',
    categoryId: 'cat-accessories',
    brandId: 'brand-logitech',
    originalPrice: 2490000,
    salePrice: 1990000,
    condition: 'new',
    stock: 65,
    shortDesc: 'Cuộn siêu tốc MagSpeed 1000 dòng/giây, click êm ái giảm 90% tiếng ồn, cảm biến 8000 DPI trên mọi bề mặt kính.',
    description: `MX Master 3S là vũ khí tối thượng của giới lập trình viên, designer và dân văn phòng. Tương thích đồng thời Windows và macOS, chuyển đổi mượt mà giữa 3 thiết bị qua công nghệ Logitech Flow.`,
    specs: {
      'Cảm biến': 'Darkfield độ chính xác cao 8000 DPI',
      'Nút bấm': 'Quiet Clicks siêu êm, 7 nút tùy biến',
      'Kết nối': 'Bluetooth Low Energy & USB Bolt Receiver',
      'Pin': 'Dùng tới 70 ngày một lần sạc, sạc nhanh USB-C'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Xám Graphite', 'Trắng Pale Grey'] }
    ],
    variants: [
      {
        id: 'var-mx3s-grp',
        title: 'Xám Graphite',
        sku: 'LOGI-MXM3S-GRP',
        price: 1990000,
        originalPrice: 2490000,
        stock: 45,
        attributes: { 'Màu sắc': 'Xám Graphite' }
      },
      {
        id: 'var-mx3s-wht',
        title: 'Trắng Pale Grey',
        sku: 'LOGI-MXM3S-WHT',
        price: 1990000,
        originalPrice: 2490000,
        stock: 20,
        attributes: { 'Màu sắc': 'Trắng Pale Grey' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: false,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'Chuột Logitech MX Master 3S Chính Hãng Bảo Hành 12 Tháng',
      metaDesc: 'Mua chuột công thái học Logitech MX Master 3S giá rẻ nhất, cảm biến 8000 DPI, cuộn MagSpeed siêu mượt.',
      metaKeywords: 'logitech mx master 3s, chuot cong thai hoc, chuot logitech'
    },
    viewCount: 3820,
    createdAt: '2025-01-02T10:00:00Z',
    updatedAt: '2025-02-17T11:00:00Z'
  },
  {
    id: 'prod-ipad-pro-m4-11',
    name: 'iPad Pro 11 inch M4 256GB Wi-Fi - Siêu Mỏng Ultra Retina Tandem OLED',
    slug: 'ipad-pro-11-inch-m4-256gb-wifi',
    sku: 'IPAD-M4-11-256',
    categoryId: 'cat-tablets',
    brandId: 'brand-apple',
    originalPrice: 28990000,
    salePrice: 26490000,
    condition: 'new',
    stock: 14,
    shortDesc: 'Thiết kế mỏng kỷ lục 5.3mm, chip Apple M4 đột phá cho AI, màn hình 2 lớp OLED Ultra Retina XDR siêu sáng.',
    description: `iPad Pro M4 mang đến bước nhảy vọt về màn hình với công nghệ Tandem OLED tiên tiến, độ tương phản 2.000.000:1. Hỗ trợ Apple Pencil Pro với cử chỉ bóp và phản hồi rung xúc giác tinh tế.`,
    specs: {
      'Màn hình': '11 inch Ultra Retina XDR Tandem OLED, 120Hz ProMotion, 1600 nits đỉnh',
      'Vi xử lý': 'Apple M4 (9 nhân CPU, 10 nhân GPU, 16 nhân Neural Engine)',
      'RAM': '8GB',
      'Bộ nhớ': '256GB',
      'Độ mỏng': '5.3 mm siêu nhẹ 444g',
      'Camera': '12MP Wide + Cảm biến LiDAR scanner'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Đen Không Gian (Space Black)', 'Bạc (Silver)'] }
    ],
    variants: [
      {
        id: 'var-ipad-m4-blk',
        title: 'Đen Không Gian - 256GB Wi-Fi',
        sku: 'IPAD-M4-11-256-BLK',
        price: 26490000,
        originalPrice: 28990000,
        stock: 9,
        attributes: { 'Màu sắc': 'Đen Không Gian (Space Black)' }
      },
      {
        id: 'var-ipad-m4-slv',
        title: 'Bạc - 256GB Wi-Fi',
        sku: 'IPAD-M4-11-256-SLV',
        price: 26490000,
        originalPrice: 28990000,
        stock: 5,
        attributes: { 'Màu sắc': 'Bạc (Silver)' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: true,
    status: 'active',
    seo: {
      metaTitle: 'iPad Pro 11 M4 256GB WiFi Chính Hãng Apple VN Giá Tốt',
      metaDesc: 'iPad Pro M4 màn hình OLED siêu mỏng 5.3mm, chip Apple M4 thế hệ mới, hỗ trợ Pencil Pro trả góp 0%.',
      metaKeywords: 'ipad pro m4, ipad pro oled, mua ipad pro 11 m4'
    },
    viewCount: 2910,
    createdAt: '2025-01-22T10:00:00Z',
    updatedAt: '2025-02-18T10:00:00Z'
  },
  {
    id: 'prod-apple-watch-ultra-2',
    name: 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium - Dây Ocean Band',
    slug: 'apple-watch-ultra-2-gps-cellular-49mm-titanium-ocean',
    sku: 'AW-ULTRA2-49-OCN',
    categoryId: 'cat-smartwatches',
    brandId: 'brand-apple',
    originalPrice: 21990000,
    salePrice: 19890000,
    condition: 'new',
    stock: 11,
    shortDesc: 'Khung vỏ Titan 49mm cấp hàng không, màn hình sáng 3000 nits, định vị GPS kép chuẩn quân đội, chống nước 100m.',
    description: `Chiếc smartwatch thể thao dã ngoại bền bỉ và mạnh mẽ nhất của Apple. Tích hợp còi báo động khẩn cấp 86dB, đo độ sâu khi lặn nông 40m, thời lượng pin lên đến 72 giờ ở chế độ tiết kiệm năng lượng.`,
    specs: {
      'Màn hình': '49mm Retina LTPO OLED, độ sáng 3000 nits cao nhất',
      'Chất liệu': 'Vỏ Titanium Cấp hàng không vũ trụ, mặt kính Sapphire',
      'Định vị': 'GPS tần số kép chuẩn xác L1 & L5',
      'Chống nước': '100m (chứng nhận EN13319 lặn sâu 40m)',
      'Pin': 'Lên tới 36 giờ sử dụng thông thường, 72 giờ tiết kiệm pin'
    },
    attributes: [
      { name: 'Màu dây', options: ['Xanh Dương Ocean', 'Cam Trail Loop', 'Đen Alpine'] }
    ],
    variants: [
      {
        id: 'var-awu2-ocean',
        title: 'Titanium Tự Nhiên - Dây Ocean Xanh',
        sku: 'AW-U2-49-OCN-BLU',
        price: 19890000,
        originalPrice: 21990000,
        stock: 6,
        attributes: { 'Màu dây': 'Xanh Dương Ocean' }
      },
      {
        id: 'var-awu2-trail',
        title: 'Titanium Tự Nhiên - Dây Trail Cam',
        sku: 'AW-U2-49-TRL-ORG',
        price: 19890000,
        originalPrice: 21990000,
        stock: 5,
        attributes: { 'Màu dây': 'Cam Trail Loop' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: true,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'Apple Watch Ultra 2 49mm Titanium Chính Hãng VN Giá Tốt',
      metaDesc: 'Mua Apple Watch Ultra 2 vỏ titan, màn hình 3000 nits, pin trâu 72h cho chạy bộ trekking lặn biển.',
      metaKeywords: 'apple watch ultra 2, aw ultra 2, dong ho the thao apple'
    },
    viewCount: 1670,
    createdAt: '2025-01-25T11:00:00Z',
    updatedAt: '2025-02-15T09:00:00Z'
  },
  {
    id: 'prod-macbook-air-m2-used',
    name: 'MacBook Air 13 inch M2 (8GB RAM / 256GB SSD) - Cũ 98% Giá Rẻ',
    slug: 'macbook-air-13-inch-m2-8gb-256gb-used',
    sku: 'MBA-M2-8-256-USED',
    categoryId: 'cat-laptops-macbook',
    brandId: 'brand-apple',
    originalPrice: 24990000,
    salePrice: 16490000,
    condition: 'used',
    stock: 5,
    shortDesc: 'Máy thanh lý nguyên bản 98%, pin tốt 92-95%, bảo hành 6 tháng toàn diện lỗi 1 đổi 1.',
    description: `Lựa chọn kinh tế hoàn hảo cho sinh viên và dân văn phòng. Màn hình Liquid Retina 13.6 inch siêu nét, sạc MagSafe 3 tiện lợi, loa âm thanh vòm sống động, trọng lượng chỉ 1.24kg.`,
    specs: {
      'Màn hình': '13.6 inch Liquid Retina IPS 500 nits',
      'Vi xử lý': 'Apple M2 (8 nhân CPU, 8 nhân GPU)',
      'RAM': '8GB',
      'Ổ cứng': '256GB SSD',
      'Tình trạng pin': 'Khoảng 92% - 95%, sạc dưới 100 lần'
    },
    attributes: [
      { name: 'Màu sắc', options: ['Midnight (Xanh Đen)', 'Starlight (Vàng Ánh Sao)'] }
    ],
    variants: [
      {
        id: 'var-mba-m2-mid',
        title: 'Midnight - 8GB / 256GB (Cũ 98%)',
        sku: 'MBA-M2-8-256-MID-U',
        price: 16490000,
        originalPrice: 24990000,
        stock: 3,
        attributes: { 'Màu sắc': 'Midnight (Xanh Đen)' }
      },
      {
        id: 'var-mba-m2-stl',
        title: 'Starlight - 8GB / 256GB (Cũ 98%)',
        sku: 'MBA-M2-8-256-STL-U',
        price: 16490000,
        originalPrice: 24990000,
        stock: 2,
        attributes: { 'Màu sắc': 'Starlight (Vàng Ánh Sao)' }
      }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80'
    ],
    isFeatured: false,
    isNew: false,
    status: 'active',
    seo: {
      metaTitle: 'MacBook Air M2 Cũ 98% Giá Rẻ Nhất Hà Nội & TP.HCM',
      metaDesc: 'MacBook Air M2 cũ giá rẻ bảo hành 6 tháng, tặng kèm sạc zin MagSafe và balo chống sốc xịn.',
      metaKeywords: 'macbook air m2 cu, macbook m2 cu gia re, mua macbook air'
    },
    viewCount: 2210,
    createdAt: '2025-02-01T15:00:00Z',
    updatedAt: '2025-02-18T10:00:00Z'
  }
];

const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-repair-upgrade',
    title: 'Sửa chữa & Nâng cấp phần cứng chuyên nghiệp',
    slug: 'sua-chua-nang-cap-phan-cung',
    shortDesc: 'Nâng cấp RAM, ổ cứng SSD tốc độ cao, thay pin chính hãng, sửa mainboard lấy ngay trong 30 phút.',
    content: `GPSOFT sở hữu phòng lab kỹ thuật đạt chuẩn ESD chống tĩnh điện hiện đại bậc nhất. Chúng tôi chuyên tiếp nhận nâng cấp dung lượng lưu trữ SSD NVMe, nâng cấp RAM cho laptop/MacBook, thay thế màn hình hiển thị chuẩn màu và sửa chữa bo mạch chủ phức tạp với chế độ bảo hành 12 tháng.`,
    icon: 'Wrench',
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    priceRange: 'Từ 250.000đ - 2.500.000đ',
    processSteps: [
      { step: 1, title: 'Tiếp nhận & Kiểm tra toàn diện', desc: 'Kỹ thuật viên test toàn bộ chức năng, ghi nhận hiện trạng và ký tên lên linh kiện của khách hàng.' },
      { step: 2, title: 'Báo giá & Phương án tối ưu', desc: 'Tư vấn phương án sửa chữa minh bạch, báo giá chi tiết linh kiện và thời gian hoàn tất.' },
      { step: 3, title: 'Tiến hành thao tác trực tiếp', desc: 'Khách hàng có thể ngồi xem trực tiếp kỹ thuật viên thao tác trong phòng kỹ thuật kính trong suốt.' },
      { step: 4, title: 'Bàn giao, Viết phiếu bảo hành', desc: 'Kiểm tra lại toàn diện trước mặt khách hàng, xuất hóa đơn và kích hoạt bảo hành điện tử.' }
    ],
    faqs: [
      { q: 'Thay pin hoặc nâng cấp SSD có mất dữ liệu không?', a: 'Đối với nâng cấp ổ cứng, GPSOFT hỗ trợ sao chép (clone) nguyên vẹn 100% hệ điều hành và dữ liệu của bạn sang ổ mới, mở máy lên là dùng ngay.' },
      { q: 'Thời gian bảo hành dịch vụ sửa chữa là bao lâu?', a: 'Tất cả linh kiện thay thế tại GPSOFT được bảo hành từ 6 đến 36 tháng đổi mới tùy chủng loại.' }
    ],
    isFeatured: true
  },
  {
    id: 'srv-software-cleaning',
    title: 'Vệ sinh máy chuyên sâu & Cài đặt hệ điều hành',
    slug: 've-sinh-may-chuyen-sau-cai-dat-he-dieu-hanh',
    shortDesc: 'Vệ sinh tra keo tản nhiệt cao cấp Honeywell PTM7950, cài đặt macOS, Windows bản quyền và phần mềm đồ họa.',
    content: `Sau 6-12 tháng sử dụng, laptop thường bị tích tụ bụi bẩn ở quạt tản nhiệt gây nóng máy, tụt xung và giảm tuổi thọ CPU/GPU. Dịch vụ spa máy tính của GPSOFT sử dụng keo tản nhiệt gốm dẫn nhiệt cao giúp giảm 10 - 15 độ C ngay tức thì.`,
    icon: 'ShieldCheck',
    thumbnail: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    priceRange: '150.000đ - 350.000đ',
    processSteps: [
      { step: 1, title: 'Đo nhiệt độ & Đánh giá hiệu năng ban đầu', desc: 'Chạy stress test kiểm tra nhiệt độ khi máy hoạt động hết công suất.' },
      { step: 2, title: 'Tháo chi tiết quạt tản nhiệt & Bo mạch', desc: 'Hút sạch bụi bẩn buồng tản nhiệt, tra dầu trục quạt êm ái.' },
      { step: 3, title: 'Làm sạch bề mặt & Tra keo tản nhiệt cao cấp', desc: 'Lau sạch keo cũ bị khô, phủ keo Honeywell / Arctic MX-4 dẫn nhiệt xịn.' },
      { step: 4, title: 'Lắp ráp & Cài đặt tinh chỉnh phần mềm', desc: 'Tối ưu hóa startup, xóa rác hệ thống và kiểm tra lại nhiệt độ giảm rõ rệt.' }
    ],
    faqs: [
      { q: 'Nên vệ sinh laptop bao lâu một lần?', a: 'Khuyến nghị từ 6 tháng đến 1 năm một lần để máy luôn chạy mát mẻ, êm ái và kéo dài tuổi thọ bo mạch.' }
    ],
    isFeatured: true
  },
  {
    id: 'srv-trade-in',
    title: 'Thu cũ đổi mới - Trợ giá lên đời tới 2.000.000đ',
    slug: 'thu-cu-doi-moi-tro-gia-len-doi',
    shortDesc: 'Thủ tục định giá nhanh chóng trong 5 phút, không phân biệt nguồn gốc máy, trợ giá cực lớn.',
    content: `Chương trình Trade-in tại GPSOFT cho phép bạn mang máy cũ của mọi thương hiệu (kể cả máy xách tay, máy đã hết hạn bảo hành) đến định giá và bù khoản chênh lệch để nhận ngay siêu phẩm công nghệ đời mới nhất.`,
    icon: 'RefreshCw',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0a67e5572248?w=800&auto=format&fit=crop&q=80',
    priceRange: 'Định giá theo máy + Trợ giá 2.000.000đ',
    processSteps: [
      { step: 1, title: 'Nhập thông tin máy cũ trên website hoặc tại quầy', desc: 'Cung cấp tên model, dung lượng, tình trạng ngoại hình máy cũ.' },
      { step: 2, title: 'Kỹ thuật viên thẩm định máy trong 5 phút', desc: 'Kiểm tra màn hình, cảm ứng, pin, camera và các chức năng phần cứng.' },
      { step: 3, title: 'Báo mức giá thu mua cao nhất thị trường', desc: 'Cộng thêm voucher trợ giá nâng cấp thiết bị mới.' },
      { step: 4, title: 'Bù chênh lệch & Nhận máy mới liền tay', desc: 'Hỗ trợ chuyển dữ liệu miễn phí từ máy cũ sang máy mới.' }
    ],
    faqs: [
      { q: 'Máy bị trầy xước viền có được thu mua không?', a: 'Có. GPSOFT thu mua linh hoạt theo thang điểm ngoại hình, cam kết giá thu cạnh tranh và hợp lý nhất.' }
    ],
    isFeatured: true
  },
  {
    id: 'srv-enterprise-rental',
    title: 'Cho thuê thiết bị công nghệ cho Doanh nghiệp & Sự kiện',
    slug: 'cho-thue-thiet-bi-doanh-nghiep-su-kien',
    shortDesc: 'Cung cấp dàn MacBook, Laptop Dell, iPad đồng bộ số lượng lớn cho đào tạo, hội thảo, quay phim chụp ảnh.',
    content: `Dịch vụ cho thuê thiết bị trọn gói của GPSOFT đáp ứng nhu cầu từ 5 đến 100 máy cấu hình cao, hỗ trợ cài sẵn hệ thống phần mềm doanh nghiệp, có kỹ thuật viên túc trực hỗ trợ suốt thời gian diễn ra sự kiện.`,
    icon: 'Building2',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    priceRange: 'Từ 100.000đ/máy/ngày',
    processSteps: [
      { step: 1, title: 'Tiếp nhận yêu cầu số lượng & Cấu hình', desc: 'Tư vấn số lượng máy tính, màn hình phù hợp với ngân sách và mục tiêu sự kiện.' },
      { step: 2, title: 'Chuẩn bị thiết bị & Cài đặt đồng bộ', desc: 'Cài đặt hệ điều hành, tài liệu và cấu hình mạng nội bộ theo yêu cầu.' },
      { step: 3, title: 'Vận chuyển & Lắp đặt tận nơi', desc: 'Bàn giao thiết bị trước giờ G, chạy thử kiểm tra hoạt động trơn tru.' },
      { step: 4, title: 'Thu hồi thiết bị & Xóa sạch dữ liệu bảo mật', desc: 'Nghiệm thu thiết bị và xóa trắng bảo mật dữ liệu khách hàng theo chuẩn quốc tế.' }
    ],
    faqs: [
      { q: 'Có xuất hóa đơn VAT điện tử hợp lệ không?', a: 'Có. GPSOFT cung cấp đầy đủ hợp đồng kinh tế, biên bản bàn giao và hóa đơn VAT theo quy định.' }
    ],
    isFeatured: false
  },
  // P2.3 — service nuôi trang public `/thiet-ke-website` — nguồn duy nhất ở `src/utils/webDesign.ts` (dùng chung với nút seed trong CMS).
  WEB_DESIGN_SERVICE_SEED
];

const INITIAL_POST_CATEGORIES: PostCategory[] = [
  { id: 'pcat-tech', name: 'Tin Công Nghệ', slug: 'tin-cong-nghe', description: 'Cập nhật tin tức công nghệ thế giới và Việt Nam mới nhất.' },
  { id: 'pcat-reviews', name: 'Đánh Giá & Review', slug: 'danh-gia-review', description: 'Trải nghiệm chi tiết, so sánh thông số và đánh giá thực tế.' },
  { id: 'pcat-guides', name: 'Thủ Thuật & Hướng Dẫn', slug: 'thu-thuat-huong-dan', description: 'Mẹo sử dụng máy tính, mẹo kéo dài tuổi thọ pin và tối ưu phần mềm.' },
  { id: 'pcat-promos', name: 'Khuyến Mãi & Sự Kiện', slug: 'khuyen-mai-su-kien', description: 'Các chương trình ưu đãi, flash sale giảm giá sốc hàng tuần.' }
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'Đánh giá chi tiết iPhone 16 Pro Max sau 3 tháng sử dụng thực tế',
    slug: 'danh-gia-chi-tiet-iphone-16-pro-max-sau-3-thang',
    category: 'Đánh Giá & Review',
    excerpt: 'Khám phá xem nút Camera Control có thực sự tiện lợi, thời lượng pin 33 tiếng có đúng như công bố và màn hình 6.9 inch đem lại trải nghiệm ra sao.',
    content: `Sau hơn 90 ngày sử dụng iPhone 16 Pro Max làm máy chính, đây là tổng kết chi tiết về thiết bị đầu bảng của Apple trong năm nay.
    
1. Về thiết kế và cảm giác cầm nắm:
Dù màn hình nâng lên 6.9 inch, nhưng nhờ viền bezel mỏng chỉ 1.15mm, máy không to hơn đáng kể so với người tiền nhiệm 15 Pro Max. Chất liệu Titan Cấp 5 qua xử lý phay xước vi mô giúp hạn chế tối đa vết bám vân tay và mồ hôi.

2. Nút Camera Control thế hệ mới:
Camera Control là điểm nhấn gây nhiều tranh luận. Khi chụp ảnh ngang bằng 2 tay, việc bấm nhẹ để khóa nét và vuốt đổi tiêu cự zoom 5x diễn ra rất mượt mà. Tuy nhiên cần mất từ 2-3 ngày để làm quen với lực ấn haptic feedback.

3. Thời lượng pin ấn tượng nhất lịch sử:
Với viên pin lớn cùng con chip A18 Pro tiến trình 3nm N3P tối ưu nhiệt độ, máy trụ vững từ 7h sáng đến 23h đêm với hơn 8.5 tiếng On-screen tác vụ hỗn hợp 4G/Wifi.`,
    thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    author: 'Trần Thùy Linh',
    tags: ['iPhone 16 Pro Max', 'Apple', 'Review', 'Smartphone'],
    isFeatured: true,
    viewCount: 4890,
    seo: {
      metaTitle: 'Đánh giá iPhone 16 Pro Max chi tiết sau 3 tháng sử dụng',
      metaDesc: 'Bài review chân thực về pin, camera, hiệu năng nút Camera Control trên iPhone 16 Pro Max.'
    },
    status: 'published',
    publishedAt: '2025-01-20T08:00:00Z',
    createdAt: '2025-01-20T08:00:00Z'
  },
  {
    id: 'post-2',
    title: 'Top 5 laptop đồ họa và lập trình đáng mua nhất đầu năm 2025',
    slug: 'top-5-laptop-do-hoa-va-lap-trinh-dang-mua-nhat-2025',
    category: 'Tin Công Nghệ',
    excerpt: 'Tổng hợp danh sách các cỗ máy bền bỉ, màn hình chuẩn màu, tản nhiệt mát mẻ dành riêng cho coder và nhà thiết kế chuyên nghiệp.',
    content: `Việc lựa chọn một chiếc laptop vừa phục vụ công việc viết code, render đồ họa 3D vừa đảm bảo tính cơ động là bài toán khiến nhiều người đau đầu. Dưới đây là 5 cái tên sáng giá nhất:
    
1. MacBook Pro 14 M3 Pro: Lựa chọn số 1 về pin và độ ổn định Unix cho lập trình viên.
2. Dell XPS 13 Plus / 15: Màn hình OLED rực rỡ, thiết kế sang trọng cho doanh nhân.
3. Asus ROG Zephyrus G14: Cân bằng hoàn hảo giữa chơi game AAA và làm việc đồ họa.
4. ThinkPad X1 Carbon Gen 12: Bàn phím số 1 thế giới cho người gõ phím liên tục nhiều giờ.
5. LG Gram 16: Trọng lượng siêu nhẹ chỉ 1.1kg cùng màn hình 2.5K rộng rãi.`,
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    author: 'Nguyễn Quốc Bảo',
    tags: ['Laptop', 'MacBook', 'Dell XPS', 'Lập trình', 'Đồ họa'],
    isFeatured: true,
    viewCount: 3240,
    seo: {
      metaTitle: 'Top 5 Laptop Lập Trình & Đồ Họa Đáng Mua Nhất 2025',
      metaDesc: 'Khám phá các mẫu laptop tốt nhất năm 2025 cho lập trình viên, designer: MacBook Pro M3, Dell XPS.'
    },
    status: 'published',
    publishedAt: '2025-01-25T14:30:00Z',
    createdAt: '2025-01-25T14:30:00Z'
  },
  {
    id: 'post-3',
    title: 'Hướng dẫn tối ưu hóa tuổi thọ pin Laptop & Điện thoại bền bỉ trên 3 năm',
    slug: 'huong-dan-toi-uu-hoa-tuoi-tho-pin-laptop-dien-thoai',
    category: 'Thủ Thuật & Hướng Dẫn',
    excerpt: 'Những nguyên tắc khoa học về chu kỳ nạp xả pin Li-ion, cơ chế ngắt sạc thông minh và mẹo tránh chai pin hiệu quả.',
    content: `Pin Lithium-ion trên thiết bị điện tử có tuổi thọ trung bình từ 500 đến 1000 chu kỳ sạc. Để giữ dung lượng pin trên 85% sau 3 năm, bạn nên áp dụng các thói quen sau:
    
- Giữ mức pin trong khoảng 20% - 80%: Đây là vùng điện thế an toàn giúp màng ngăn hóa học ít bị thoái hóa nhất.
- Bật tính năng 'Giới hạn sạc 80%' có sẵn trên iOS 18 và macOS Sequoia.
- Không để máy trong môi trường nhiệt độ cao (như cốp xe máy hoặc dưới trời nắng gắt).
- Sử dụng củ sạc đạt chuẩn GaN chứng chỉ PD/PPS chính hãng để dòng điện luôn ổn định.`,
    thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    author: 'Lê Anh Tuấn',
    tags: ['Mẹo hay', 'Pin', 'Thủ thuật', 'Bảo quản máy'],
    isFeatured: false,
    viewCount: 1980,
    seo: {
      metaTitle: 'Cách Tối Ưu Tuổi Thọ Pin Laptop Điện Thoại Dùng Trên 3 Năm',
      metaDesc: 'Mẹo giữ pin không bị chai, sạc pin đúng cách cho iPhone, MacBook và laptop Windows.'
    },
    status: 'published',
    publishedAt: '2025-02-05T09:15:00Z',
    createdAt: '2025-02-05T09:15:00Z'
  }
];

const INITIAL_BANNERS: Banner[] = [
  {
    id: 'ban-hero-1',
    title: 'Khai Xuân Công Nghệ - Giảm Sốc Tới 40%',
    subtitle: 'Hàng ngàn siêu phẩm iPhone, MacBook, Tai nghe chính hãng sẵn kho giao hỏa tốc 2 giờ',
    imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=80',
    linkUrl: '/products?sale=true',
    buttonText: 'Khám Phá Ưu Đãi Ngay',
    position: 'hero',
    sortOrder: 1,
    isActive: true
  },
  {
    id: 'ban-hero-2',
    title: 'iPhone 16 Pro Max Titan Sẵn Hàng - Đủ Màu Đủ Dung Lượng',
    subtitle: 'Trợ giá thu cũ đổi mới lên tới 2.000.000đ - Trả góp lãi suất 0% xét duyệt 5 phút',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1600&auto=format&fit=crop&q=80',
    linkUrl: '/products/iphone-16-pro-max-256gb-titan-tu-nhien',
    buttonText: 'Mua Ngay Giá Tốt',
    position: 'hero',
    sortOrder: 2,
    isActive: true
  },
  {
    id: 'ban-hero-3',
    title: 'Hệ Sinh Thái MacBook M3 & Dell XPS Đồ Họa Cực Đỉnh',
    subtitle: 'Miễn phí bảo dưỡng trọn đời máy, tặng kèm túi chống sốc cao cấp & chuột không dây',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&auto=format&fit=crop&q=80',
    linkUrl: '/products?category=cat-laptops',
    buttonText: 'Xem Bộ Sưu Tập',
    position: 'hero',
    sortOrder: 3,
    isActive: true
  }
];

const INITIAL_MENUS: Menu[] = [
  {
    id: 'menu-header',
    title: 'Menu Chính Trên Cùng',
    location: 'header',
    items: [
      { id: 'm-home', label: 'Trang chủ', url: '/' },
      {
        id: 'm-products',
        label: 'Sản phẩm',
        url: '/products',
        children: [
          { id: 'm-cat-phones', label: 'Điện thoại Smartphone', url: '/products?category=cat-phones' },
          { id: 'm-cat-laptops', label: 'Laptop & MacBook', url: '/products?category=cat-laptops' },
          { id: 'm-cat-tablets', label: 'Máy tính bảng Tablet', url: '/products?category=cat-tablets' },
          { id: 'm-cat-audio', label: 'Tai nghe & Âm thanh', url: '/products?category=cat-audio' },
          { id: 'm-cat-cameras', label: 'Máy ảnh & Ống kính', url: '/products?category=cat-cameras' },
          { id: 'm-cat-accessories', label: 'Phụ kiện cao cấp', url: '/products?category=cat-accessories' }
        ]
      },
      { id: 'm-services', label: 'Dịch vụ kỹ thuật', url: '/services' },
      { id: 'm-price-list', label: 'Bảng giá & Báo giá', url: '/price-list' },
      { id: 'm-news', label: 'Tin tức & Review', url: '/news' },
      { id: 'm-about', label: 'Giới thiệu', url: '/about' },
      { id: 'm-contact', label: 'Liên hệ & Bản đồ', url: '/contact' }
    ]
  },
  {
    id: 'menu-footer',
    title: 'Menu Chân Trang',
    location: 'footer',
    items: [
      { id: 'f-policy-warranty', label: 'Chính sách bảo hành 24 tháng', url: '/pages/chinh-sach-bao-hanh' },
      { id: 'f-policy-return', label: 'Chính sách đổi trả 30 ngày', url: '/pages/chinh-sach-doi-tra' },
      { id: 'f-policy-shipping', label: 'Chính sách giao hàng toàn quốc', url: '/pages/chinh-sach-giao-hang' },
      { id: 'f-terms', label: 'Điều khoản dịch vụ', url: '/pages/dieu-khoan-dich-vu' }
    ]
  }
];

const INITIAL_PAGES: Page[] = [
  {
    id: 'page-about',
    title: 'Giới thiệu về GPSOFT Store & Enterprise',
    slug: 'gioi-thieu',
    content: `Chào mừng bạn đến với GPSOFT - Hệ thống bán lẻ thiết bị công nghệ chính hãng và cung cấp giải pháp chuyển đổi số hàng đầu Việt Nam.

1. Lịch sử hình thành:
Thành lập từ năm 2018 với tiền thân là trung tâm nghiên cứu và bảo trì thiết bị Apple chuyên sâu, GPSOFT đã nhanh chóng phát triển thành chuỗi 6 showroom trải dài tại Hà Nội, Đà Nẵng và TP. Hồ Chí Minh với hơn 150.000 khách hàng tin tưởng.

2. Tầm nhìn:
Trở thành đơn vị phân phối công nghệ cao cấp và cung cấp giải pháp thiết bị doanh nghiệp được tín nhiệm số 1 tại Đông Nam Á.

3. Sứ mệnh:
Mang những công nghệ tiên tiến nhất thế giới đến tận tay người tiêu dùng Việt Nam với mức giá hợp lý nhất, đi kèm chất lượng hậu mãi vượt trên cả sự kỳ vọng.

4. Giá trị cốt lõi:
- Trung thực & Minh bạch: 100% sản phẩm có nguồn gốc xuất xứ rõ ràng.
- Tận tâm phục vụ: Lấy sự hài lòng của khách hàng làm thước đo sống còn.
- Chuyên môn kỹ thuật sâu: Đội ngũ kỹ sư đạt chứng chỉ quốc tế Apple ACMT và Microsoft Certified.`,
    isPublished: true,
    seo: {
      metaTitle: 'Giới Thiệu GPSOFT Store - Lịch Sử, Sứ Mệnh & Tầm Nhìn',
      metaDesc: 'Tìm hiểu về hệ thống bán lẻ công nghệ GPSOFT, hệ thống showroom và cam kết dịch vụ vàng.'
    },
    updatedAt: '2025-02-10T12:00:00Z'
  },
  {
    id: 'page-warranty',
    title: 'Chính sách bảo hành vàng 24 tháng',
    slug: 'chinh-sach-bao-hanh',
    content: `GPSOFT cam kết áp dụng chính sách bảo hành ưu việt nhất thị trường:
    
- 1 đổi 1 trong vòng 30 ngày đầu tiên nếu máy xuất hiện bất kỳ lỗi nào từ nhà sản xuất.
- Bảo hành phần cứng toàn diện từ 12 đến 24 tháng cho mọi sản phẩm New Seal chính hãng.
- Đối với máy Like New 99%: Bảo hành 12 tháng nguồn, màn hình, Face ID và pin.
- Hỗ trợ máy mượn miễn phí trong suốt thời gian thiết bị của quý khách đang bảo hành.
- Tiếp nhận và xử lý bảo hành tại chỗ trong tối đa 48 giờ làm việc.`,
    isPublished: true,
    seo: {
      metaTitle: 'Chính Sách Bảo Hành Vàng GPSOFT - 1 Đổi 1 Trong 30 Ngày',
      metaDesc: 'Chi tiết quy định bảo hành sản phẩm điện thoại, laptop, phụ kiện tại GPSOFT.'
    },
    updatedAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'page-returns',
    title: 'Chính sách đổi trả & Hoàn tiền',
    slug: 'chinh-sach-doi-tra',
    content: `Khách hàng có quyền đổi sản phẩm sang dòng máy khác hoặc yêu cầu hoàn tiền nếu sản phẩm không đúng mô tả hoặc phát sinh lỗi kỹ thuật. Vui lòng giữ nguyên hộp, phụ kiện đi kèm và hóa đơn mua hàng.`,
    isPublished: true,
    seo: {
      metaTitle: 'Chính Sách Đổi Trả Linh Hoạt GPSOFT',
      metaDesc: 'Hướng dẫn quy trình đổi trả hàng và chính sách hoàn tiền minh bạch tại GPSOFT.'
    },
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'page-terms',
    title: 'Điều khoản dịch vụ & Bảo mật thông tin',
    slug: 'dieu-khoan-dich-vu',
    content: `Khi truy cập và đặt mua hàng tại website GPSOFT, quý khách đồng ý với các điều khoản giao dịch thương mại điện tử và chính sách bảo mật dữ liệu khách hàng theo quy chuẩn pháp luật Việt Nam.`,
    isPublished: true,
    seo: {
      metaTitle: 'Điều Khoản Dịch Vụ GPSOFT',
      metaDesc: 'Điều khoản sử dụng và quy định pháp lý khi mua sắm tại GPSOFT.'
    },
    updatedAt: '2025-01-15T10:00:00Z'
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Phạm Minh Hạo',
    email: 'pham.m.hao05@gmail.com',
    phone: '0988776655',
    address: 'Số 45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
    province: 'Hồ Chí Minh',
    totalSpent: 78480000,
    orderCount: 2,
    lastOrderAt: '2025-02-18T10:30:00Z',
    notes: 'Khách hàng VIP, hay mua thiết bị công nghệ Apple đời mới.',
    createdAt: '2025-01-05T09:00:00Z'
  },
  {
    id: 'cust-2',
    name: 'Đặng Hoàng Yến',
    email: 'hoangyen.des@gmail.com',
    phone: '0912345678',
    address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh',
    province: 'Hồ Chí Minh',
    totalSpent: 46490000,
    orderCount: 1,
    lastOrderAt: '2025-02-14T15:20:00Z',
    notes: 'Designer, quan tâm màn hình chuẩn màu 100% sRGB.',
    createdAt: '2025-01-12T14:00:00Z'
  },
  {
    id: 'cust-3',
    name: 'Vũ Đức Thành',
    email: 'thanh.vu@fpt.com',
    phone: '0903889911',
    address: '17 Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy',
    province: 'Hà Nội',
    totalSpent: 24880000,
    orderCount: 2,
    lastOrderAt: '2025-02-10T11:00:00Z',
    notes: 'Kỹ sư phần mềm FPT, hay mua chuột Logitech và phụ kiện.',
    createdAt: '2025-01-20T10:00:00Z'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderCode: 'TP-250218-1001',
    customerName: 'Phạm Minh Hạo',
    phone: '0988776655',
    email: 'pham.m.hao05@gmail.com',
    address: {
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      street: 'Số 45 Đường Nguyễn Huệ'
    },
    items: [
      {
        productId: 'prod-iphone-16-pro-max',
        variantId: 'var-16pm-256-nat',
        title: 'iPhone 16 Pro Max 256GB - Titan Tự Nhiên (Titan Tự Nhiên - 256GB)',
        sku: 'IP16PM-256-NAT',
        price: 31990000,
        quantity: 1,
        thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
      },
      {
        productId: 'prod-logitech-mx-master-3s',
        variantId: 'var-mx3s-grp',
        title: 'Chuột không dây công thái học Logitech MX Master 3S (Xám Graphite)',
        sku: 'LOGI-MXM3S-GRP',
        price: 1990000,
        quantity: 1,
        thumbnail: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&auto=format&fit=crop&q=80'
      }
    ],
    subtotal: 33980000,
    shippingFee: 0,
    discount: 500000,
    total: 33480000,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    status: 'shipping',
    note: 'Giao trong giờ hành chính, gọi trước 15 phút khi đến.',
    createdAt: '2025-02-18T10:30:00Z',
    updatedAt: '2025-02-18T14:00:00Z'
  },
  {
    id: 'ord-1002',
    orderCode: 'TP-250217-1002',
    customerName: 'Đặng Hoàng Yến',
    phone: '0912345678',
    email: 'hoangyen.des@gmail.com',
    address: {
      province: 'Hồ Chí Minh',
      district: 'Bình Thạnh',
      ward: 'Phường 22',
      street: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ'
    },
    items: [
      {
        productId: 'prod-macbook-pro-14-m3-pro',
        variantId: 'var-mbp14-18-blk',
        title: 'MacBook Pro 14 inch M3 Pro (Space Black - 18GB RAM - 512GB SSD)',
        sku: 'MBP14-M3P-18-512-BLK',
        price: 46490000,
        quantity: 1,
        thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80'
      }
    ],
    subtotal: 46490000,
    shippingFee: 0,
    discount: 0,
    total: 46490000,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    status: 'completed',
    note: 'Xuất hóa đơn VAT cho Công ty TNHH Thiết kế Sáng tạo ArtLab.',
    createdAt: '2025-02-17T09:15:00Z',
    updatedAt: '2025-02-17T17:00:00Z'
  },
  {
    id: 'ord-1003',
    orderCode: 'TP-250219-1003',
    customerName: 'Vũ Đức Thành',
    phone: '0903889911',
    email: 'thanh.vu@fpt.com',
    address: {
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      street: '17 Duy Tân'
    },
    items: [
      {
        productId: 'prod-sony-wh1000xm5',
        variantId: 'var-xm5-blk',
        title: 'Tai nghe chống ồn Sony WH-1000XM5 Hi-Res Audio (Màu Đen)',
        sku: 'SONY-XM5-BLK',
        price: 6990000,
        quantity: 1,
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80'
      }
    ],
    subtotal: 6990000,
    shippingFee: 30000,
    discount: 0,
    total: 7020000,
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    status: 'processing',
    note: 'Giao tại quầy lễ tân tòa nhà FPT Cầu Giấy.',
    createdAt: '2025-02-19T08:45:00Z',
    updatedAt: '2025-02-19T09:00:00Z'
  }
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    type: 'quote',
    name: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@vietcap.vn',
    phone: '0977889900',
    subject: 'Báo giá dự án 20 chiếc MacBook Air M3 cho phòng phân tích đầu tư',
    message: 'Công ty Chứng khoán VietCap cần báo giá chi tiết cấu hình 16GB RAM / 512GB SSD, có kèm gói bảo hành mở rộng AppleCare+ 3 năm và hỗ trợ cài đặt VPN doanh nghiệp.',
    interestedProduct: 'MacBook Air M3 16GB/512GB',
    source: 'website',
    status: 'new',
    adminNote: 'Đã phân công cho Sale Tuấn gọi lại trong sáng nay.',
    createdAt: '2025-02-19T08:00:00Z'
  },
  {
    id: 'lead-2',
    type: 'contact',
    name: 'Hoàng Mai Phương',
    email: 'phuong.hm@gmail.com',
    phone: '0933445566',
    subject: 'Hỏi về quy trình thu cũ đổi mới iPhone 13 Pro Max lên 16 Pro Max',
    message: 'Chào shop, máy mình iPhone 13 Pro Max bản VN 128GB pin 84% chưa qua sửa chữa, đổi sang 16 Pro Max thì bù khoảng bao nhiêu tiền?',
    interestedProduct: 'iPhone 16 Pro Max',
    source: 'website',
    status: 'contacted',
    adminNote: 'Đã gọi tư vấn định giá khoảng 12.5 triệu, khách hứa chiều ghé showroom Lê Duẩn.',
    createdAt: '2025-02-18T16:20:00Z'
  },
  {
    id: 'lead-3',
    type: 'newsletter',
    email: 'khoa.tran.tech@outlook.com',
    source: 'newsletter',
    status: 'resolved',
    createdAt: '2025-02-15T11:00:00Z'
  }
];

/* P1.1 — Phiếu bảo hành mẫu. Ngày tính ĐỘNG theo lúc seed để trang tra cứu (P1.3) có đủ
   3 trạng thái badge: còn nhiều hạn / sắp hết hạn (1–30 ngày) / đã hết hạn; các seed khác
   trong file vẫn là dữ liệu tĩnh theo ngày mua thực tế của demo. */
const warrantyDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

const INITIAL_WARRANTIES: Warranty[] = [
  {
    id: 'warr-1',
    code: 'BH-2026-0001',
    customerName: 'Nguyễn Văn Hùng',
    phone: '0977889900',
    email: 'hung.nguyen@vietcap.vn',
    productId: 'prod-iphone-16-pro-max',
    productName: 'iPhone 16 Pro Max 256GB - Titan Tự Nhiên',
    serialNumber: 'IP16PM-256-NAT-885130',
    purchaseDate: warrantyDay(-75),
    startDate: warrantyDay(-75),
    endDate: warrantyDay(655),
    warrantyMonths: 24,
    warrantyType: 'nha_san_xuat',
    status: 'received',
    issue: 'Màn hình xuất hiện 1 vệt sáng dọc bên phải sau khi cập nhật iOS; máy chưa rơi vỡ, còn nguyên tem niêm phong.',
    receivedAt: warrantyDay(-1),
    cost: 0,
    technician: '',
    createdAt: warrantyDay(-1)
  },
  {
    id: 'warr-2',
    code: 'BH-2026-0002',
    customerName: 'Trần Thùy Linh',
    phone: '0912 345 678',
    email: 'linh.tran@gpsoft.vn',
    productId: 'prod-macbook-pro-14-m3-pro',
    productName: 'MacBook Pro 14 inch M3 Pro (18GB / 512GB SSD) - Space Black',
    serialNumber: 'MBP14M3P-4471902',
    purchaseDate: warrantyDay(-345),
    startDate: warrantyDay(-345),
    endDate: warrantyDay(20),
    warrantyMonths: 12,
    warrantyType: 'nha_san_xuat',
    status: 'repairing',
    issue: 'Bàn phím liệt 3 phím (J, K, L) sau khi dính nước nhẹ; đã vệ sinh nhưng không hết.',
    diagnosis: 'Hỏng màng bàn phím (keyboard membrane) — cần thay cả cụm topcase theo tiêu chuẩn hãng.',
    resolution: 'Đã đặt linh kiện topcase chính hãng, dự kiến hoàn tất trong 2 ngày.',
    technician: 'Lê Anh Tuấn',
    receivedAt: warrantyDay(-3),
    cost: 0,
    createdAt: warrantyDay(-3)
  },
  {
    id: 'warr-3',
    code: 'BH-2026-0003',
    customerName: 'Hoàng Mai Phương',
    phone: '0933445566',
    email: 'phuong.hm@gmail.com',
    productId: 'prod-sony-wh1000xm5',
    productName: 'Tai nghe chống ồn Sony WH-1000XM5 Hi-Res Audio',
    serialNumber: 'SONY-WH1000XM5-BLK',
    purchaseDate: warrantyDay(-500),
    startDate: warrantyDay(-500),
    endDate: warrantyDay(-135),
    warrantyMonths: 12,
    warrantyType: 'mo_rong',
    status: 'returned',
    issue: 'Tai nghe bên phải rè khi bật ANC ở mức cao nhất, pin tụt nhanh bất thường.',
    diagnosis: 'Màng loa bên phải rách nhẹ, pin chai còn 68% dung lượng thiết kế.',
    resolution: 'Đã thay màng loa + pin chính hãng (ngoài hạn bảo hành nên thu phí), test ANC ổn định.',
    technician: 'Phạm Minh Khoa',
    cost: 350000,
    receivedAt: warrantyDay(-150),
    returnedAt: warrantyDay(-140),
    createdAt: warrantyDay(-150)
  }
];

/* P1.4 — Báo giá mẫu (mỗi báo giá 3 dòng). `total` của dòng và của cả báo giá đều được
   TÍNH TỪ `qty × unitPrice` ngay tại đây (không gõ tay) để seed không bao giờ lệch số.
   Ngày hiệu lực tính động theo lúc seed ⇒ demo được cả badge “còn hạn” và “hết hiệu lực”. */
const quoteDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

const quoteItem = (
  name: string,
  spec: string,
  unit: string,
  qty: number,
  unitPrice: number
): PriceQuoteItem => ({ name, spec, unit, qty, unitPrice, total: qty * unitPrice });

const priceQuote = (
  base: Omit<PriceQuote, 'total' | 'items'>,
  items: PriceQuoteItem[]
): PriceQuote => ({
  ...base,
  items,
  total: items.reduce((sum, item) => sum + item.total, 0)
});

const INITIAL_PRICE_QUOTES: PriceQuote[] = [
  priceQuote(
    {
      id: 'quote-1',
      code: 'BG-2026-0001',
      title: 'Báo giá 3 bộ MacBook Pro 14" cho phòng IT',
      customerName: 'Nguyễn Văn Hùng',
      phone: '0977889900',
      email: 'hung.nguyen@vietcap.vn',
      company: 'Công ty CP Chứng khoán Việt Capital',
      note: 'Bàn giao trong 7 ngày làm việc, miễn phí cài đặt và cấu hình tài khoản nội bộ.',
      status: 'sent',
      validUntil: quoteDay(15),
      createdBy: 'Nguyễn Quốc Bảo',
      createdAt: quoteDay(-5)
    },
    [
      quoteItem(
        'MacBook Pro 14 inch M3 Pro (18GB / 512GB SSD) - Space Black',
        'M3 Pro 11-core CPU / 14-core GPU / 18GB RAM / 512GB SSD',
        'Chiếc',
        3,
        45990000
      ),
      quoteItem(
        'AppleCare+ cho MacBook Pro 14 inch (36 tháng)',
        'Bảo hành mở rộng chính hãng Apple Việt Nam',
        'Gói',
        3,
        5990000
      ),
      quoteItem(
        'Cài đặt hệ thống & bàn giao tận nơi',
        'Thiết lập tài khoản, sao lưu, diệt malware, hướng dẫn sử dụng 1 giờ',
        'Lần',
        1,
        1500000
      )
    ]
  ),
  priceQuote(
    {
      id: 'quote-2',
      code: 'BG-2026-0002',
      title: 'Báo giá phòng Lab 10 chỗ cho trường THPT',
      customerName: 'Trần Thùy Linh',
      phone: '0912 345 678',
      email: 'linh.tran@gpsoft.vn',
      company: 'Trường THPT Nguyễn Du',
      note: 'Giá đã gồm VAT, chưa gồm chi phí hạ tầng điện - mạng nếu phải đục tường.',
      status: 'draft',
      validUntil: quoteDay(30),
      createdBy: 'Nguyễn Quốc Bảo',
      createdAt: quoteDay(-1)
    },
    [
      quoteItem(
        'Dell XPS 13 Plus 9320 (i7 / 16GB / 512GB)',
        'Intel Core i7-1360P / 16GB LPDDR5 / 512GB NVMe / 13.4" 3.5K OLED',
        'Chiếc',
        10,
        32990000
      ),
      quoteItem(
        'Màn hình Dell UltraSharp U2723QE 27" 4K',
        '27" 4K IPS Black / USB-C 90W / Hub RJ45',
        'Chiếc',
        10,
        12490000
      ),
      quoteItem(
        'Gói bảo trì tận nơi 24 tháng',
        'Vệ sinh định kỳ 6 tháng/lần, xử lý sự cố trong 24h',
        'Gói',
        10,
        890000
      )
    ]
  )
];

/* P1.5 — Link chia sẻ mẫu: 1 link công khai (mở là xem được ngay) và 1 link có mật khẩu
   (demo luồng “nhập mật khẩu rồi mới xem”) — lần lượt trỏ vào `quote-1` và `quote-2`. */
const INITIAL_QUOTE_LINKS: QuoteLink[] = [
  {
    id: 'qlink-1',
    code: 'BG7K2M9Q',
    quoteId: 'quote-1',
    expiresAt: quoteDay(15),
    viewCount: 0,
    isActive: true,
    createdAt: quoteDay(-5)
  },
  {
    id: 'qlink-2',
    code: 'BGVIP2026',
    quoteId: 'quote-2',
    password: 'gpsoft',
    expiresAt: quoteDay(30),
    viewCount: 0,
    isActive: true,
    createdAt: quoteDay(-1)
  }
];

/* P1.7/P1.8/P1.9 — dữ liệu mẫu cho thương mại. Ngày tháng tính ĐỘNG theo lúc seed để demo
   đủ 4 trạng thái: mã còn hiệu lực / hết hiệu lực / hết lượt / campaign đang chạy. */
const couponDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

/* P1.7 — 4 mã mẫu:
   - `GPSOFT500` (mã hardcode cũ) đặt `endAt` quá khứ ⇒ nhập vào sẽ báo **hết hiệu lực** (DoD).
   - `VIP10` đang chạy, giảm 10% trần 2.000.000đ.
   - `LAPTOP15` đã dùng hết lượt (`usedCount = usageLimit`) ⇒ demo **chặn vượt usageLimit** (DoD).
   - `PHUKIEN200` giới hạn theo danh mục `cat-accessories`, `usageLimit = 0` (vô hạn). */
const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'GPSOFT500',
    name: 'Giảm 500.000đ (chương trình cũ — đã kết thúc)',
    discountType: 'fixed',
    value: 500000,
    minOrder: 3000000,
    usageLimit: 100,
    usedCount: 100,
    startAt: couponDay(-60),
    endAt: couponDay(-3),
    applyTo: 'all',
    applyIds: [],
    isActive: true,
    createdAt: couponDay(-60)
  },
  {
    id: 'coupon-2',
    code: 'VIP10',
    name: 'Khách VIP giảm 10% (tối đa 2.000.000đ)',
    discountType: 'percent',
    value: 10,
    minOrder: 5000000,
    maxDiscount: 2000000,
    usageLimit: 50,
    usedCount: 12,
    startAt: couponDay(-10),
    endAt: couponDay(45),
    applyTo: 'all',
    applyIds: [],
    isActive: true,
    createdAt: couponDay(-10)
  },
  {
    id: 'coupon-3',
    code: 'LAPTOP15',
    name: 'Laptop giảm 15% (tối đa 3.000.000đ) — đã hết lượt',
    discountType: 'percent',
    value: 15,
    minOrder: 10000000,
    maxDiscount: 3000000,
    usageLimit: 20,
    usedCount: 20,
    startAt: couponDay(-20),
    endAt: couponDay(20),
    applyTo: 'category',
    applyIds: ['cat-laptops'],
    isActive: true,
    createdAt: couponDay(-20)
  },
  {
    id: 'coupon-4',
    code: 'PHUKIEN200',
    name: 'Phụ kiện giảm 200.000đ (không giới hạn lượt)',
    discountType: 'fixed',
    value: 200000,
    minOrder: 1000000,
    usageLimit: 0,
    usedCount: 7,
    startAt: couponDay(-5),
    endAt: couponDay(30),
    applyTo: 'category',
    applyIds: ['cat-accessories'],
    isActive: true,
    createdAt: couponDay(-5)
  }
];

/* P1.8 — 4 phương thức vận chuyển mẫu: đúng bộ số đang hardcode (30.000đ / freeship 1.000.000đ)
   + 1 phương thức đang TẮT để CMS thấy được trạng thái bật/tắt. */
const INITIAL_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'ship-standard',
    name: 'Giao tiêu chuẩn toàn quốc',
    description: 'Đối tác GHN / Viettel Post, giao tận nơi và thu tiền COD.',
    fee: 30000,
    freeFrom: 1000000,
    estimatedDays: '2–4 ngày',
    regions: [],
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'ship-express',
    name: 'Giao hỏa tốc 2 giờ',
    description: 'Nội thành Hà Nội & TP.HCM, nhận hàng trong 2 giờ.',
    fee: 60000,
    freeFrom: 20000000,
    estimatedDays: 'Trong 2 giờ',
    regions: ['TP. Hồ Chí Minh', 'Hà Nội'],
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'ship-store',
    name: 'Nhận tại showroom (miễn phí)',
    description: 'Giữ hàng 24 giờ, khách qua showroom kiểm tra rồi nhận.',
    fee: 0,
    freeFrom: 0,
    estimatedDays: 'Trong ngày',
    regions: [],
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'ship-install',
    name: 'Giao + lắp đặt tận nơi (B2B)',
    description: 'Kỹ thuật viên giao, lắp đặt và bàn giao cho doanh nghiệp.',
    fee: 150000,
    freeFrom: 30000000,
    estimatedDays: '1–3 ngày',
    regions: [],
    isActive: false,
    sortOrder: 4
  }
];

/* P1.9 — 3 campaign mẫu: 1 đang chạy (flash sale có danh sách sản phẩm), 1 đã kết thúc,
   1 sắp chạy ⇒ kiểm được cả nhánh “hiện khối” và “tự ẩn”. */
const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Giờ Vàng Săn Deal — Laptop & Tai Nghe',
    type: 'flash_sale',
    startAt: couponDay(-1),
    endAt: couponDay(3),
    discountPercent: 32,
    productIds: [
      'prod-macbook-pro-14-m3-pro',
      'prod-dell-xps-13-plus',
      'prod-sony-wh1000xm5',
      'prod-ipad-pro-m4-11'
    ],
    ctaText: 'Xem tất cả deal',
    ctaUrl: '/san-pham',
    isActive: true,
    createdAt: couponDay(-1)
  },
  {
    id: 'camp-2',
    name: 'Black Friday 2026 (đã kết thúc)',
    type: 'banner',
    startAt: couponDay(-120),
    endAt: couponDay(-100),
    discountPercent: 50,
    productIds: [],
    ctaText: 'Xem lại ưu đãi',
    isActive: true,
    createdAt: couponDay(-120)
  },
  {
    id: 'camp-3',
    name: 'Khai trương showroom Cần Thơ (sắp chạy)',
    type: 'countdown',
    startAt: couponDay(7),
    endAt: couponDay(14),
    discountPercent: 15,
    productIds: [],
    ctaText: 'Nhận thông báo',
    isActive: true,
    createdAt: couponDay(-2)
  }
];

const INITIAL_MEDIA_FILES: MediaFile[] = [
  {
    id: 'med-1',
    filename: 'bang-gia-tong-hop-gpsoft-2025.xlsx',
    originalName: 'Bang_Gia_Tong_Hop_GPSOFT_2025.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 245000,
    url: '/api/export/price-list.csv',
    category: 'document',
    uploadedAt: '2025-02-01T08:00:00Z',
    provider: 'local'
  },
  {
    id: 'med-2',
    filename: 'ho-so-nang-luc-gpsoft-enterprise.pdf',
    originalName: 'Profile_Doanh_Nghiep_GPSOFT.pdf',
    mimeType: 'application/pdf',
    size: 4800000,
    url: '/api/export/profile.pdf',
    category: 'document',
    uploadedAt: '2025-01-15T09:30:00Z',
    provider: 'local'
  },
  {
    id: 'med-3',
    filename: 'banner-hero-1.webp',
    originalName: 'banner-khai-xuan.webp',
    mimeType: 'image/webp',
    size: 185000,
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=80',
    category: 'image',
    uploadedAt: '2025-01-10T10:00:00Z',
    provider: 'local'
  },
  {
    id: 'med-4',
    filename: 'iphone-16-pro-max-showcase.webp',
    originalName: 'iphone-16-pro-max.webp',
    mimeType: 'image/webp',
    size: 210000,
    url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    category: 'image',
    uploadedAt: '2025-01-12T11:00:00Z',
    provider: 'local'
  }
];

const INITIAL_SETTINGS: SystemSettings = {
  companyName: 'GPSOFT Store & Enterprise Solution',
  slogan: 'Công nghệ tiên phong - Trải nghiệm đỉnh cao - Hậu mãi tận tâm',
  logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  favicon: '/favicon.ico',
  hotline: '1900 8899',
  hotline2: '0988 123 456',
  email: 'lienhe@gpsoft.vn',
  supportEmail: 'hotro@gpsoft.vn',
  address: '182 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  showroom: 'Hệ thống 6 showroom: Hà Nội (Cầu Giấy, Hoàn Kiếm) - TP.HCM (Quận 1, Quận 10, Bình Thạnh) - Đà Nẵng (Hải Châu)',
  googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.460233481232!2d106.69748687595337!3d10.776019559197477!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f385570472f%3A0x178749173f40f09!2zMTgyIEzDqiBEdeG6qW4sIELhur9uIE5naMOpLCBRdeG6rW4gMSwgSOG7kyBDaMOtIE1pbmg!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s',
  socials: {
    facebook: 'https://facebook.com/gpsoft.vietnam',
    zalo: 'https://zalo.me/0988123456',
    youtube: 'https://youtube.com/@gpsoft-vn',
    tiktok: 'https://tiktok.com/@gpsoft.official'
  },
  bankInfo: {
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    bankCode: 'VCB',
    accountNumber: '1023849586',
    accountHolder: 'CONG TY CP THUONG MAI CONG NGHE GPSOFT',
    branch: 'Chi nhánh Sài Gòn - TP.HCM',
    qrTemplate: 'compact'
  },
  footerBio: 'GPSOFT là chuỗi bán lẻ công nghệ ủy quyền, chuyên cung cấp các sản phẩm Smartphone, Laptop, Máy tính bảng, Âm thanh và dịch vụ sửa chữa phần cứng cao cấp bảo hành 24 tháng.',
  copyright: '© 2025 GPSOFT Store. Giấy chứng nhận ĐKKD số 0314892019 do Sở Kế hoạch & Đầu tư TP.HCM cấp.'
};

const INITIAL_SEO: SeoSettings = {
  defaultTitle: 'GPSOFT Store - Hệ thống bán lẻ công nghệ chính hãng & Dịch vụ chuyên nghiệp',
  defaultDescription: 'Chuyên phân phối iPhone, MacBook, iPad, Laptop, Tai nghe chính hãng Apple, Samsung, Sony, Dell. Trả góp 0%, thu cũ đổi mới trợ giá 2 triệu, giao nhanh 2 giờ.',
  defaultKeywords: 'gpsoft, mua iphone 16 pro max, macbook pro m3, dell xps, sua chua laptop, thu cu doi moi',
  ogImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
  robotsTxt: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://gpsoft.vn/sitemap.xml`,
  sitemapAuto: true,
  redirects: [
    { id: 'red-1', fromPath: '/iphone-15-pro-max', toPath: '/products/iphone-16-pro-max-256gb-titan-tu-nhien', code: 301, isActive: true },
    { id: 'red-2', fromPath: '/khuyen-mai-cu', toPath: '/products', code: 302, isActive: true }
  ]
};

const INITIAL_REVIEWS: ProductReview[] = [
  {
    id: 'rev-1',
    productId: 'prod-iphone-16-pro-max',
    userName: 'Hoàng Minh Quân',
    userEmail: 'quan.hoang@gmail.com',
    userPhone: '0912***456',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    title: 'Máy tuyệt vời, màu Titan Tự Nhiên cực sang!',
    comment: 'Đặt hàng buổi sáng là đầu giờ chiều nhận được máy luôn, nhân viên GPSOFT hỗ trợ chuyển dữ liệu và dán cường lực tận tình. Camera chụp zoom quang 5x rất nét, thời lượng pin dùng thoải mái 1.5 ngày. Rất hài lòng với chính sách bảo hành 24 tháng!',
    variantTitle: 'Titan Tự Nhiên - 256GB',
    tags: ['Giao hàng 2H', 'Đúng mô tả', 'Pin trâu', 'Máy nguyên seal VN/A'],
    isVerifiedPurchase: true,
    helpfulCount: 24,
    adminReply: {
      author: 'Chăm Sóc Khách Hàng GPSOFT',
      content: 'Dạ GPSOFT chân thành cảm ơn anh Quân đã tin tưởng ủng hộ sản phẩm. Chúc anh có những trải nghiệm tuyệt vời cùng iPhone 16 Pro Max! Nếu cần hỗ trợ thêm thông tin kỹ thuật, anh đừng ngần ngại liên hệ hotline 1900 8899 nhé ạ.',
      createdAt: '2025-02-15T15:30:00Z'
    },
    createdAt: '2025-02-15T14:10:00Z'
  },
  {
    id: 'rev-2',
    productId: 'prod-iphone-16-pro-max',
    userName: 'Trần Ngọc Bích',
    userEmail: 'bich.tran@outlook.com',
    userPhone: '0988***789',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    title: 'Camera đỉnh cao, phím Camera Control rất tiện',
    comment: 'Lên đời từ iPhone 13 Pro Max thấy khác biệt một trời một vực. Màn hình 120Hz siêu mượt, viền mỏng dính. GPSOFT đóng gói hàng 3 lớp bóng khí rất cẩn thận, có kèm hóa đơn VAT điện tử đầy đủ.',
    variantTitle: 'Titan Sa Mạc - 256GB',
    tags: ['Camera nét', 'Màn hình mượt', 'Đóng gói kỹ'],
    isVerifiedPurchase: true,
    helpfulCount: 18,
    createdAt: '2025-02-18T09:20:00Z'
  },
  {
    id: 'rev-3',
    productId: 'prod-iphone-16-pro-max',
    userName: 'Nguyễn Văn Hùng',
    userEmail: 'hung.nguyen88@gmail.com',
    userPhone: '0903***234',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    rating: 4,
    title: 'Máy rất tốt nhưng viền hơi bám vân tay xíu',
    comment: 'Chất lượng hoàn thiện cao cấp, hiệu năng chip A18 Pro chiến game Genshin mượt mà không bị nóng máy quá nhanh. Trừ 1 sao nhẹ vì cạnh viền titan nếu không dùng ốp vẫn bám mồ hôi tay nhẹ, nhưng lau qua là sạch.',
    variantTitle: 'Titan Đen - 512GB',
    tags: ['Hiệu năng khủng', 'Chiến game mát'],
    isVerifiedPurchase: true,
    helpfulCount: 7,
    adminReply: {
      author: 'Chăm Sóc Khách Hàng GPSOFT',
      content: 'Chào anh Hùng, cảm ơn góp ý chân thực của anh. GPSOFT tặng kèm khăn lau sợi microfiber chuyên dụng khi mua máy, anh có thể ghé showroom để kỹ thuật viên hỗ trợ dán PPF mờ mặt lưng và viền chống vân tay miễn phí nhé ạ!',
      createdAt: '2025-02-21T11:00:00Z'
    },
    createdAt: '2025-02-20T18:45:00Z'
  },
  {
    id: 'rev-4',
    productId: 'prod-macbook-pro-14-m4',
    userName: 'Đặng Tuấn Anh',
    userEmail: 'tuananh.dev@gmail.com',
    userPhone: '0972***678',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    title: 'Quái vật đồ họa & code, pin trâu không tưởng!',
    comment: 'Làm lập trình Full-Stack build Docker và chạy nhiều simulator cùng lúc mà máy vẫn mát rượi, quạt hầu như không thèm quay. Màn hình Liquid Retina XDR độ sáng 1000 nits làm việc ngoài trời cực đã. Mua bên GPSOFT được cài sẵn bộ phần mềm cần thiết.',
    variantTitle: 'M4 Pro / 24GB RAM / 512GB SSD',
    tags: ['Hiệu năng đỉnh', 'Màn hình chuẩn màu', 'Pin cả ngày'],
    isVerifiedPurchase: true,
    helpfulCount: 31,
    createdAt: '2025-02-12T10:15:00Z'
  },
  {
    id: 'rev-5',
    productId: 'prod-sony-wh1000xm5',
    userName: 'Lê Thảo My',
    userEmail: 'thaomy.music@gmail.com',
    userPhone: '0945***112',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    title: 'Chống ồn đỉnh chóp, đeo êm tai cả ngày',
    comment: 'Tai nghe chống ồn tốt nhất phân khúc, ngồi quán cafe ồn ào bật ANC lên là yên tĩnh tuyệt đối để tập trung làm việc. Âm bass sâu và ấm, mic đàm thoại lọc gió tốt. Rất ưng ý với dịch vụ của GPSOFT!',
    tags: ['Chống ồn tuyệt đối', 'Âm bass hay', 'Đeo êm'],
    isVerifiedPurchase: true,
    helpfulCount: 15,
    createdAt: '2025-02-10T16:00:00Z'
  }
];

// Database class managing storage and CRUD
function buildDefaultSchema(): DatabaseSchema {
  return {
    users: INITIAL_USERS,
    roles: INITIAL_ROLES,
    categories: INITIAL_CATEGORIES,
    brands: INITIAL_BRANDS,
    products: INITIAL_PRODUCTS,
    reviews: INITIAL_REVIEWS,
    orders: INITIAL_ORDERS,
    customers: INITIAL_CUSTOMERS,
    leads: INITIAL_LEADS,
    warranties: INITIAL_WARRANTIES,
    priceQuotes: INITIAL_PRICE_QUOTES,
    quoteLinks: INITIAL_QUOTE_LINKS,
    // P1.7/P1.8/P1.9 — thương mại (3 bảng mới; `ensureSchema()` tự tạo + seed lần đầu).
    coupons: INITIAL_COUPONS,
    shippingMethods: INITIAL_SHIPPING_METHODS,
    campaigns: INITIAL_CAMPAIGNS,
    postCategories: INITIAL_POST_CATEGORIES,
    posts: INITIAL_POSTS,
    services: INITIAL_SERVICES,
    banners: INITIAL_BANNERS,
    menus: INITIAL_MENUS,
    pages: INITIAL_PAGES,
    mediaFiles: INITIAL_MEDIA_FILES,
    settings: INITIAL_SETTINGS,
    seoSettings: INITIAL_SEO
  };
}

class Database {
  private data: DatabaseSchema;
  private isSaving = false;
  private initialized = false;

  constructor() {
    this.data = buildDefaultSchema();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    const store = await getStore();

    if (await store.isEmpty()) {
      const schema = this.loadFromLegacyJson() ?? buildDefaultSchema();
      this.data = schema;
      await store.replace(schema);
      console.log(`[DB] Initialized ${store.driverName} database with ${this.data.products.length} products.`);
    } else {
      const loaded = await store.load();
      this.data = { ...buildDefaultSchema(), ...loaded };
      // P1.1 — bảng vừa được `ensureSchema()` tạo ⇒ entity mới thêm vào app trong bản này.
      // Phải seed lại tại đây vì `store.load()` trả mảng RỖNG cho bảng vừa tạo và sẽ ghi đè
      // dữ liệu mẫu (bản nâng cấp trước P1.1 không có phiếu bảo hành nào).
      const seededKeys = store.createdCollectionKeys();
      if (seededKeys.length > 0) {
        const defaults = buildDefaultSchema() as unknown as Record<string, unknown>;
        for (const key of seededKeys) {
          if (Array.isArray(defaults[key])) {
            (this.data as unknown as Record<string, unknown>)[key] = defaults[key];
          }
        }
        await this.save();
        console.log(`[DB] Seeded dữ liệu mẫu cho bảng vừa tạo: ${seededKeys.join(', ')}.`);
      }
      console.log(`[DB] Loaded ${store.driverName} database (${this.data.products.length} products).`);
    }

    if (this.ensurePasswordHashes()) {
      await this.save();
      console.log('[DB] Seeded default password hashes for accounts missing one.');
    }

    // P2.1 — DB tạo trước P2.1 chưa có danh mục cấp 2 ⇒ bổ sung để mega menu & trang danh mục có cây.
    if (this.ensureDemoSubcategories()) {
      await this.save();
      console.log('[DB] Seeded P2.1 sub-categories and moved demo products into them.');
    }

    // P2.3 — DB tạo trước P2.3 (kể cả DB migrate từ `data/db.json` cũ) chưa có service
    // `thiet-ke-website` ⇒ trang public rơi về nội dung tĩnh và sửa trong CMS không có chỗ lưu.
    if (this.ensureWebDesignService()) {
      await this.save();
      console.log(`[DB] Seeded P2.3 service "${WEB_DESIGN_SERVICE_SEED.slug}" for /thiet-ke-website.`);
    }

    this.initialized = true;
  }

  private ensurePasswordHashes(): boolean {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    let changed = false;
    for (const user of this.data.users) {
      if (!user.passwordHash) {
        user.passwordHash = bcrypt.hashSync(defaultPassword, 10);
        changed = true;
      }
    }
    return changed;
  }

  /**
   * P2.1 — Nâng cấp DB đã tồn tại: thêm danh mục **cấp 2** còn thiếu và (chỉ với danh mục vừa
   * được thêm trong lần chạy này) chuyển sản phẩm mẫu từ danh mục cha xuống danh mục con.
   *
   * Idempotent: chạy lại không đổi gì — danh mục đã tồn tại thì bỏ qua, kể cả khi admin đã chuyển
   * sản phẩm sang danh mục khác trong CMS. Trả về `true` khi có thay đổi để `init()` ghi xuống store.
   */
  private ensureDemoSubcategories(): boolean {
    const added = new Set<string>();

    for (const sub of INITIAL_SUBCATEGORIES) {
      if (!this.data.categories.some(category => category.id === sub.id)) {
        this.data.categories.push({ ...sub });
        added.add(sub.id);
      }
    }

    for (const rule of DEMO_SUBCATEGORY_ASSIGNMENTS) {
      if (!added.has(rule.to)) continue;
      const product = this.data.products.find(item => item.id === rule.productId);
      if (product && product.categoryId === rule.from) {
        product.categoryId = rule.to;
      }
    }

    return added.size > 0;
  }

  /**
   * P2.3 — Bổ sung `Service` slug `thiet-ke-website` cho DB **đã tồn tại** (cài đặt mới nhận sẵn qua
   * `buildDefaultSchema()`; DB nâng cấp từ bản trước P2.3 — hoặc migrate từ `data/db.json` — thì
   * `parsed.services` không có bản ghi này).
   *
   * Idempotent và **không ghi đè**: chỉ thêm khi slug còn thiếu, nên nội dung admin đã biên tập trong
   * CMS luôn được giữ nguyên. Payload lấy từ `WEB_DESIGN_SERVICE_SEED` (`src/utils/webDesign.ts`) —
   * cùng nguồn với nút "Tạo dịch vụ Thiết kế website" trong `ServicesView` ⇒ không thể lệch nhau.
   */
  private ensureWebDesignService(): boolean {
    const exists = this.data.services.some(
      service => service.slug === WEB_DESIGN_SERVICE_SEED.slug || service.id === WEB_DESIGN_SERVICE_SEED.id
    );
    if (exists) return false;
    // Copy sâu 2 mảng con: bản ghi trong DB không được chia sẻ tham chiếu với hằng số seed
    // (admin sửa quy trình/FAQ trong CMS sẽ thay mảng của bản ghi, không được chạm vào seed).
    const service: Service = {
      ...WEB_DESIGN_SERVICE_SEED,
      processSteps: WEB_DESIGN_SERVICE_SEED.processSteps.map(step => ({ ...step })),
      faqs: WEB_DESIGN_SERVICE_SEED.faqs.map(faq => ({ ...faq }))
    };
    this.data.services.push(service);
    return true;
  }

  private loadFromLegacyJson(): DatabaseSchema | null {
    try {
      if (!fs.existsSync(DB_FILE)) return null;
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const defaults = buildDefaultSchema();

      const backupFile = `${DB_FILE}.bak`;
      if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(DB_FILE, backupFile);
      }

      console.log('[DB] Migrating legacy data/db.json into SQLite...');
      return {
        users: parsed.users || defaults.users,
        roles: parsed.roles || defaults.roles,
        categories: parsed.categories || defaults.categories,
        brands: parsed.brands || defaults.brands,
        products: parsed.products || defaults.products,
        reviews: parsed.reviews || defaults.reviews,
        orders: parsed.orders || defaults.orders,
        customers: parsed.customers || defaults.customers,
        leads: parsed.leads || defaults.leads,
        warranties: parsed.warranties || defaults.warranties,
        priceQuotes: parsed.priceQuotes || defaults.priceQuotes,
        quoteLinks: parsed.quoteLinks || defaults.quoteLinks,
        coupons: parsed.coupons || defaults.coupons,
        shippingMethods: parsed.shippingMethods || defaults.shippingMethods,
        campaigns: parsed.campaigns || defaults.campaigns,
        postCategories: parsed.postCategories || defaults.postCategories,
        posts: parsed.posts || defaults.posts,
        services: parsed.services || defaults.services,
        banners: parsed.banners || defaults.banners,
        menus: parsed.menus || defaults.menus,
        pages: parsed.pages || defaults.pages,
        mediaFiles: parsed.mediaFiles || defaults.mediaFiles,
        settings: parsed.settings || defaults.settings,
        seoSettings: parsed.seoSettings || defaults.seoSettings
      };
    } catch (e) {
      console.error('[DB] Failed to migrate legacy db.json, using seed data:', e);
      return null;
    }
  }

  public async save(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const store = await getStore();
      await store.replace(this.data);
    } catch (e) {
      console.error('[DB] Error saving to database:', e);
    } finally {
      this.isSaving = false;
    }
  }

  // Getters
  public getUsers() { return this.data.users; }
  public getRoles() { return this.data.roles; }
  public getCategories() { return this.data.categories; }
  public getBrands() { return this.data.brands; }
  public getProducts() { return this.data.products; }
  public getReviews(productId?: string) {
    if (!this.data.reviews) this.data.reviews = [];
    if (productId) {
      return this.data.reviews.filter(r => r.productId === productId);
    }
    return this.data.reviews;
  }
  public getOrders() { return this.data.orders; }
  public getCustomers() { return this.data.customers; }
  public getLeads() { return this.data.leads; }
  /** P1.1 — phiếu bảo hành (guard cho DB tạo trước P1.1 chưa có bảng `warranties`). */
  public getWarranties() {
    if (!this.data.warranties) this.data.warranties = [];
    return this.data.warranties;
  }
  /** P1.4 — báo giá (guard cho DB tạo trước P1.4 chưa có bảng `price_quotes`). */
  public getPriceQuotes() {
    if (!this.data.priceQuotes) this.data.priceQuotes = [];
    return this.data.priceQuotes;
  }
  /** P1.5 — link chia sẻ báo giá (guard cho DB tạo trước P1.5). */
  public getQuoteLinks() {
    if (!this.data.quoteLinks) this.data.quoteLinks = [];
    return this.data.quoteLinks;
  }
  /** P1.7 — mã giảm giá (guard cho DB tạo trước P1.7). */
  public getCoupons() {
    if (!this.data.coupons) this.data.coupons = [];
    return this.data.coupons;
  }
  /** P1.8 — phương thức vận chuyển (guard cho DB tạo trước P1.8). */
  public getShippingMethods() {
    if (!this.data.shippingMethods) this.data.shippingMethods = [];
    return this.data.shippingMethods;
  }
  /** P1.9 — chiến dịch khuyến mãi (guard cho DB tạo trước P1.9). */
  public getCampaigns() {
    if (!this.data.campaigns) this.data.campaigns = [];
    return this.data.campaigns;
  }
  public getPostCategories() { return this.data.postCategories; }
  public getPosts() { return this.data.posts; }
  public getServices() { return this.data.services; }
  public getBanners() { return this.data.banners; }
  public getMenus() { return this.data.menus; }
  public getPages() { return this.data.pages; }
  public getMediaFiles() { return this.data.mediaFiles; }
  public getSettings() { return this.data.settings; }
  public getSeoSettings() { return this.data.seoSettings; }

  // Setters / Updaters
  public async updateSettings(settings: Partial<SystemSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    await this.save();
    return this.data.settings;
  }

  public async updateSeoSettings(seo: Partial<SeoSettings>) {
    this.data.seoSettings = { ...this.data.seoSettings, ...seo };
    await this.save();
    return this.data.seoSettings;
  }

  // CRUD Operations helper methods
  public async addProduct(p: Product) {
    this.data.products.unshift(p);
    await this.save();
    return p;
  }

  public async updateProduct(id: string, updates: Partial<Product>) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.products[idx];
  }

  public async deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    await this.save();
    return true;
  }

  // Reviews
  public async addReview(r: ProductReview) {
    if (!this.data.reviews) this.data.reviews = [];
    this.data.reviews.unshift(r);
    await this.save();
    return r;
  }

  public async upvoteReview(id: string) {
    if (!this.data.reviews) this.data.reviews = [];
    const r = this.data.reviews.find(item => item.id === id);
    if (!r) return null;
    r.helpfulCount = (r.helpfulCount || 0) + 1;
    await this.save();
    return r;
  }

  public async deleteReview(id: string) {
    if (!this.data.reviews) this.data.reviews = [];
    this.data.reviews = this.data.reviews.filter(r => r.id !== id);
    await this.save();
    return true;
  }

  public async addOrder(o: Order) {
    this.data.orders.unshift(o);
    // Auto-update or create customer
    const existingCust = this.data.customers.find(c => c.phone === o.phone || c.email === o.email);
    if (existingCust) {
      existingCust.orderCount += 1;
      existingCust.totalSpent += o.total;
      existingCust.lastOrderAt = o.createdAt;
    } else {
      this.data.customers.push({
        id: `cust-${Date.now()}`,
        name: o.customerName,
        phone: o.phone,
        email: o.email,
        address: `${o.address.street}, ${o.address.ward}, ${o.address.district}, ${o.address.province}`,
        province: o.address.province,
        totalSpent: o.total,
        orderCount: 1,
        lastOrderAt: o.createdAt,
        createdAt: o.createdAt
      });
    }

    // Decrement stock
    for (const item of o.items) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        if (item.variantId && prod.variants) {
          const v = prod.variants.find(va => va.id === item.variantId);
          if (v) v.stock = Math.max(0, v.stock - item.quantity);
        }
      }
    }

    await this.save();
    return o;
  }

  public async updateOrder(id: string, updates: Partial<Order>) {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.orders[idx];
  }

  public async deleteOrder(id: string) {
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    await this.save();
    return true;
  }

  public async addLead(l: Lead) {
    this.data.leads.unshift(l);
    await this.save();
    return l;
  }

  public async updateLead(id: string, updates: Partial<Lead>) {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.leads[idx] = { ...this.data.leads[idx], ...updates };
    await this.save();
    return this.data.leads[idx];
  }

  public async deleteLead(id: string) {
    this.data.leads = this.data.leads.filter(l => l.id !== id);
    await this.save();
    return true;
  }

  // Warranties (P1.1)
  public async addWarranty(w: Warranty) {
    if (!this.data.warranties) this.data.warranties = [];
    this.data.warranties.unshift(w);
    await this.save();
    return w;
  }

  public async updateWarranty(id: string, updates: Partial<Warranty>) {
    if (!this.data.warranties) this.data.warranties = [];
    const idx = this.data.warranties.findIndex(w => w.id === id);
    if (idx === -1) return null;
    this.data.warranties[idx] = { ...this.data.warranties[idx], ...updates };
    await this.save();
    return this.data.warranties[idx];
  }

  public async deleteWarranty(id: string) {
    if (!this.data.warranties) this.data.warranties = [];
    this.data.warranties = this.data.warranties.filter(w => w.id !== id);
    await this.save();
    return true;
  }

  // Price quotes (P1.4)
  public async addPriceQuote(q: PriceQuote) {
    if (!this.data.priceQuotes) this.data.priceQuotes = [];
    this.data.priceQuotes.unshift(q);
    await this.save();
    return q;
  }

  public async updatePriceQuote(id: string, updates: Partial<PriceQuote>) {
    if (!this.data.priceQuotes) this.data.priceQuotes = [];
    const idx = this.data.priceQuotes.findIndex(q => q.id === id);
    if (idx === -1) return null;
    this.data.priceQuotes[idx] = { ...this.data.priceQuotes[idx], ...updates };
    await this.save();
    return this.data.priceQuotes[idx];
  }

  public async deletePriceQuote(id: string) {
    if (!this.data.priceQuotes) this.data.priceQuotes = [];
    const quote = this.data.priceQuotes.find(q => q.id === id);
    this.data.priceQuotes = this.data.priceQuotes.filter(q => q.id !== id);
    // Xóa báo giá ⇒ thu hồi luôn mọi link chia sẻ trỏ tới nó (link “mồ côi” sẽ 404 khi khách mở).
    if (quote) {
      if (!this.data.quoteLinks) this.data.quoteLinks = [];
      this.data.quoteLinks = this.data.quoteLinks.filter(l => l.quoteId !== id);
    }
    await this.save();
    return true;
  }

  // Quote links (P1.5)
  public async addQuoteLink(l: QuoteLink) {
    if (!this.data.quoteLinks) this.data.quoteLinks = [];
    this.data.quoteLinks.unshift(l);
    await this.save();
    return l;
  }

  public async updateQuoteLink(id: string, updates: Partial<QuoteLink>) {
    if (!this.data.quoteLinks) this.data.quoteLinks = [];
    const idx = this.data.quoteLinks.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.quoteLinks[idx] = { ...this.data.quoteLinks[idx], ...updates };
    await this.save();
    return this.data.quoteLinks[idx];
  }

  /**
   * P1.6 — tăng `viewCount` khi khách mở link chia sẻ. Đi qua `save()` (ghi cả DB) nên chỉ gọi
   * trong route công khai `GET /quote-links/:code`, không gọi trong hàm thuần.
   */
  public async incrementQuoteLinkView(id: string) {
    if (!this.data.quoteLinks) this.data.quoteLinks = [];
    const idx = this.data.quoteLinks.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const current = this.data.quoteLinks[idx];
    this.data.quoteLinks[idx] = { ...current, viewCount: (current.viewCount || 0) + 1 };
    await this.save();
    return this.data.quoteLinks[idx];
  }

  public async deleteQuoteLink(id: string) {
    if (!this.data.quoteLinks) this.data.quoteLinks = [];
    this.data.quoteLinks = this.data.quoteLinks.filter(l => l.id !== id);
    await this.save();
    return true;
  }

  // Coupons (P1.7)
  public async addCoupon(c: Coupon) {
    if (!this.data.coupons) this.data.coupons = [];
    this.data.coupons.unshift(c);
    await this.save();
    return c;
  }

  public async updateCoupon(id: string, updates: Partial<Coupon>) {
    if (!this.data.coupons) this.data.coupons = [];
    const idx = this.data.coupons.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.coupons[idx] = { ...this.data.coupons[idx], ...updates };
    await this.save();
    return this.data.coupons[idx];
  }

  public async deleteCoupon(id: string) {
    if (!this.data.coupons) this.data.coupons = [];
    this.data.coupons = this.data.coupons.filter(c => c.id !== id);
    await this.save();
    return true;
  }

  /**
   * P1.7 — tăng lượt dùng khi đơn được tạo THÀNH CÔNG (gọi sau `addOrder`).
   * Trả về `usedCount` mới; coupon không tồn tại ⇒ `null`.
   */
  public async incrementCouponUsage(id: string) {
    if (!this.data.coupons) this.data.coupons = [];
    const idx = this.data.coupons.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const current = this.data.coupons[idx];
    this.data.coupons[idx] = { ...current, usedCount: (Number(current.usedCount) || 0) + 1 };
    await this.save();
    return this.data.coupons[idx];
  }

  // Shipping methods (P1.8)
  public async addShippingMethod(m: ShippingMethod) {
    if (!this.data.shippingMethods) this.data.shippingMethods = [];
    this.data.shippingMethods.push(m);
    await this.save();
    return m;
  }

  public async updateShippingMethod(id: string, updates: Partial<ShippingMethod>) {
    if (!this.data.shippingMethods) this.data.shippingMethods = [];
    const idx = this.data.shippingMethods.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.shippingMethods[idx] = { ...this.data.shippingMethods[idx], ...updates };
    await this.save();
    return this.data.shippingMethods[idx];
  }

  /** Xoá phương thức: đơn cũ đã lưu `shippingMethodId` nên không bị ảnh hưởng. */
  public async deleteShippingMethod(id: string) {
    if (!this.data.shippingMethods) this.data.shippingMethods = [];
    this.data.shippingMethods = this.data.shippingMethods.filter(m => m.id !== id);
    await this.save();
    return true;
  }

  // Campaigns (P1.9)
  public async addCampaign(c: Campaign) {
    if (!this.data.campaigns) this.data.campaigns = [];
    this.data.campaigns.unshift(c);
    await this.save();
    return c;
  }

  public async updateCampaign(id: string, updates: Partial<Campaign>) {
    if (!this.data.campaigns) this.data.campaigns = [];
    const idx = this.data.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.campaigns[idx] = { ...this.data.campaigns[idx], ...updates };
    await this.save();
    return this.data.campaigns[idx];
  }

  public async deleteCampaign(id: string) {
    if (!this.data.campaigns) this.data.campaigns = [];
    this.data.campaigns = this.data.campaigns.filter(c => c.id !== id);
    await this.save();
    return true;
  }

  // Categories
  public async addCategory(c: Category) {
    this.data.categories.push(c);
    await this.save();
    return c;
  }
  public async updateCategory(id: string, updates: Partial<Category>) {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    await this.save();
    return this.data.categories[idx];
  }
  public async deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    await this.save();
    return true;
  }

  // Brands
  public async addBrand(b: Brand) {
    this.data.brands.push(b);
    await this.save();
    return b;
  }
  public async updateBrand(id: string, updates: Partial<Brand>) {
    const idx = this.data.brands.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.brands[idx] = { ...this.data.brands[idx], ...updates };
    await this.save();
    return this.data.brands[idx];
  }
  public async deleteBrand(id: string) {
    this.data.brands = this.data.brands.filter(b => b.id !== id);
    await this.save();
    return true;
  }

  // Posts
  public async addPost(p: Post) {
    this.data.posts.unshift(p);
    await this.save();
    return p;
  }
  public async updatePost(id: string, updates: Partial<Post>) {
    const idx = this.data.posts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.posts[idx] = { ...this.data.posts[idx], ...updates };
    await this.save();
    return this.data.posts[idx];
  }
  public async deletePost(id: string) {
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    await this.save();
    return true;
  }

  // Services
  public async addService(s: Service) {
    this.data.services.push(s);
    await this.save();
    return s;
  }
  public async updateService(id: string, updates: Partial<Service>) {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.services[idx] = { ...this.data.services[idx], ...updates };
    await this.save();
    return this.data.services[idx];
  }
  public async deleteService(id: string) {
    this.data.services = this.data.services.filter(s => s.id !== id);
    await this.save();
    return true;
  }

  // Banners
  public async addBanner(b: Banner) {
    this.data.banners.push(b);
    await this.save();
    return b;
  }
  public async updateBanner(id: string, updates: Partial<Banner>) {
    const idx = this.data.banners.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.banners[idx] = { ...this.data.banners[idx], ...updates };
    await this.save();
    return this.data.banners[idx];
  }
  public async deleteBanner(id: string) {
    this.data.banners = this.data.banners.filter(b => b.id !== id);
    await this.save();
    return true;
  }

  // Menus
  public async addMenu(m: Menu) {
    this.data.menus.push(m);
    await this.save();
    return m;
  }
  public async updateMenu(id: string, updates: Partial<Menu>) {
    const idx = this.data.menus.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.menus[idx] = { ...this.data.menus[idx], ...updates };
    await this.save();
    return this.data.menus[idx];
  }
  public async deleteMenu(id: string) {
    this.data.menus = this.data.menus.filter(m => m.id !== id);
    await this.save();
    return true;
  }

  // Pages
  public async addPage(p: Page) {
    this.data.pages.push(p);
    await this.save();
    return p;
  }
  public async updatePage(id: string, updates: Partial<Page>) {
    const idx = this.data.pages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.pages[idx] = { ...this.data.pages[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.save();
    return this.data.pages[idx];
  }
  public async deletePage(id: string) {
    this.data.pages = this.data.pages.filter(p => p.id !== id);
    await this.save();
    return true;
  }

  // Post Categories
  public async addPostCategory(c: PostCategory) {
    this.data.postCategories.push(c);
    await this.save();
    return c;
  }
  public async updatePostCategory(id: string, updates: Partial<PostCategory>) {
    const idx = this.data.postCategories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.postCategories[idx] = { ...this.data.postCategories[idx], ...updates };
    await this.save();
    return this.data.postCategories[idx];
  }
  public async deletePostCategory(id: string) {
    this.data.postCategories = this.data.postCategories.filter(c => c.id !== id);
    await this.save();
    return true;
  }

  // Media
  public async addMedia(m: MediaFile) {
    this.data.mediaFiles.unshift(m);
    await this.save();
    return m;
  }
  public async deleteMedia(id: string) {
    this.data.mediaFiles = this.data.mediaFiles.filter(m => m.id !== id);
    await this.save();
    return true;
  }

  // Customers
  public async addCustomer(c: Customer) {
    this.data.customers.push(c);
    await this.save();
    return c;
  }
  public async updateCustomer(id: string, updates: Partial<Customer>) {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.customers[idx] = { ...this.data.customers[idx], ...updates };
    await this.save();
    return this.data.customers[idx];
  }
  public async deleteCustomer(id: string) {
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    await this.save();
    return true;
  }

  // Users
  public async addUser(u: User) {
    this.data.users.push(u);
    await this.save();
    return u;
  }
  public async updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    await this.save();
    return this.data.users[idx];
  }
  public async deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    await this.save();
    return true;
  }

  // Roles
  public async addRole(r: Role) {
    this.data.roles.push(r);
    await this.save();
    return r;
  }
  public async updateRole(id: string, updates: Partial<Role>) {
    const idx = this.data.roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.roles[idx] = { ...this.data.roles[idx], ...updates };
    await this.save();
    return this.data.roles[idx];
  }
  public async deleteRole(id: string) {
    this.data.roles = this.data.roles.filter(r => r.id !== id);
    await this.save();
    return true;
  }
}

export const db = new Database();
