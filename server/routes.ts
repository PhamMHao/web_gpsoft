import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { Product, ProductReview, Order, Lead, Warranty, PriceQuote, PriceQuoteItem, QuoteLink, Coupon, ShippingMethod, Campaign, Category, Brand, Post, PostCategory, Service, Banner, Menu, Page, MediaFile, User, Role } from './types.js';
import { authGuard, signToken, sanitizeUser } from './auth.js';
import { listBody } from './pagination.js';
// P2.1 — lọc/sắp xếp sản phẩm dùng chung cho `GET /products` (hàm thuần, `npm run test:catalog`).
import { filterProducts } from './catalog.js';
// P1.1 — hàm thuần cho bảo hành (lọc danh sách + tra cứu công khai), xem `server/warranty.ts`.
import {
  WARRANTY_STATUSES,
  LOOKUP_MIN_LENGTH,
  addMonths,
  filterWarranties,
  generateWarrantyCode,
  lookupWarranties,
  queryText
} from './warranty.js';
// P1.4/P1.5 — hàm thuần cho báo giá + link chia sẻ, xem `server/quote.ts`.
import {
  QUOTE_STATUSES,
  buildQuoteCsv,
  checkQuoteLink,
  computeQuoteTotal,
  defaultValidUntil,
  filterQuotes,
  findQuote,
  generateQuoteCode,
  generateQuoteLinkCode,
  normalizeLinkCode,
  normalizeQuoteItems,
  withEffectiveStatus
} from './quote.js';
// P0.4 — gom nốt id review (logic y hệt `genId`); server gọi được util client vì không phụ thuộc DOM.
import { genId } from '../src/utils/id.js';
// P1.7 — mã giảm giá (hàm thuần, `npm run test:coupons`).
import {
  COUPON_APPLY_TYPES,
  COUPON_DISCOUNT_TYPES,
  couponState,
  filterCoupons,
  findCoupon,
  isCouponApplyTo,
  isCouponDiscountType,
  normalizeCouponCode,
  validateCoupon
} from './coupon.js';
// P1.8 — phí vận chuyển (hàm thuần, `npm run test:shipping`).
import {
  activeShippingMethods,
  filterShippingMethods,
  resolveShippingFee
} from './shipping.js';
// P1.9 — campaign / flash sale (hàm thuần, `npm run test:campaigns`).
import {
  activeCampaigns,
  campaignProducts,
  campaignState,
  filterCampaigns,
  isCampaignType
} from './campaign.js';
// P2.3 — chuẩn hoá payload Service từ CMS (hàm thuần, `npm run test:services`).
import { buildServiceFromInput, normalizeServiceInput } from './service.js';

export const apiRouter = Router();

// Global authentication + authorization guard for all /api routes.
apiRouter.use(authGuard);

// Ensure uploads folder exists in public
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

/* =========================================================================
   AUTH ROUTES
   ========================================================================= */
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  const user = db.getUsers().find(
    u => u.username === username || u.email === username
  );

  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
  }

  const updated = await db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  return res.json({
    success: true,
    user: sanitizeUser(updated || user),
    token: signToken(user)
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
  }
  const user = db.getUsers().find(u => u.id === req.auth!.sub);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }
  return res.json({ success: true, user: sanitizeUser(user) });
});

/* =========================================================================
   DASHBOARD STATS
   ========================================================================= */
apiRouter.get('/dashboard/stats', (_req: Request, res: Response) => {
  const products = db.getProducts();
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const leads = db.getLeads();

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const lowStockProducts = products.filter(p => p.stock <= 10);
  const recentOrders = orders.slice(0, 5);

  const statusCounts: Record<string, number> = {
    pending: 0,
    processing: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0
  };
  orders.forEach(o => {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status]++;
    }
  });

  // Calculate 7-day revenue trend
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr) && o.status !== 'cancelled');
    const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      revenue,
      orderCount: dayOrders.length
    };
  });

  res.json({
    totalRevenue,
    orderCount: orders.length,
    pendingOrders,
    customerCount: customers.length,
    leadCount: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    productCount: products.length,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 5),
    recentOrders,
    statusCounts,
    last7Days
  });
});

/* =========================================================================
   PRODUCTS
   ========================================================================= */
apiRouter.get('/products', (req: Request, res: Response) => {
  // P2.1 — toàn bộ việc lọc/sắp xếp nằm trong `server/catalog.ts` (hàm thuần, `npm run test:catalog`):
  // nhờ đó danh mục cha gom cả sản phẩm danh mục con/cháu và lọc được bằng slug
  // (`?category=laptop`, `?brand=apple`) — trước P2.1 route này chỉ khớp đúng `categoryId`/`brandId`.
  const list = filterProducts(
    db.getProducts(),
    req.query,
    db.getCategories(),
    db.getBrands()
  );

  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách (như cũ).
  res.json(listBody(list, req.query));
});

apiRouter.get('/products/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const prod = db.getProducts().find(p => p.id === idOrSlug || p.slug === idOrSlug);
  if (!prod) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
  }
  // increment view
  prod.viewCount = (prod.viewCount || 0) + 1;
  res.json({ success: true, data: prod });
});

apiRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: body.name || 'Sản phẩm mới',
      slug: body.slug || `san-pham-${Date.now()}`,
      sku: body.sku || `SKU-${Date.now().toString().slice(-6)}`,
      categoryId: body.categoryId || 'cat-phones',
      brandId: body.brandId || 'brand-apple',
      originalPrice: Number(body.originalPrice) || 0,
      salePrice: Number(body.salePrice) || 0,
      condition: body.condition || 'new',
      stock: Number(body.stock) || 0,
      shortDesc: body.shortDesc || '',
      description: body.description || '',
      specs: body.specs || {},
      attributes: body.attributes || [],
      variants: body.variants || [],
      thumbnail: body.thumbnail || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
      gallery: body.gallery || [],
      isFeatured: !!body.isFeatured,
      isNew: !!body.isNew,
      status: body.status || 'active',
      seo: body.seo || { metaTitle: body.name, metaDesc: body.shortDesc, metaKeywords: '' },
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.addProduct(newProd);
    res.status(201).json({ success: true, data: newProd });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Đã xóa sản phẩm thành công.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   PRODUCT REVIEWS
   ========================================================================= */
apiRouter.get('/products/:idOrSlug/reviews', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const prod = db.getProducts().find(p => p.id === idOrSlug || p.slug === idOrSlug);
  const targetId = prod ? prod.id : idOrSlug;
  const reviews = db.getReviews(targetId);

  // Compute Review Stats
  const total = reviews.length;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    sum += r.rating;
  });

  const averageRating = total > 0 ? parseFloat((sum / total).toFixed(1)) : 5.0;
  const positiveCount = (ratingDistribution[5] || 0) + (ratingDistribution[4] || 0);
  const recommendedPercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 100;

  res.json({
    success: true,
    data: reviews,
    stats: {
      averageRating,
      totalReviews: total,
      recommendedPercentage,
      ratingDistribution
    }
  });
});

apiRouter.post('/products/:idOrSlug/reviews', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const prod = db.getProducts().find(p => p.id === idOrSlug || p.slug === idOrSlug);
    const productId = prod ? prod.id : idOrSlug;
    const { userName, userEmail, userPhone, rating, title, comment, variantTitle, tags } = req.body;

    if (!userName || !userName.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên của bạn.' });
    }
    if (!comment || !comment.trim() || comment.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Nội dung đánh giá cần tối thiểu 5 ký tự.' });
    }

    const newReview: ProductReview = {
      id: genId('rev'),
      productId,
      userName: userName.trim(),
      userEmail: userEmail ? userEmail.trim() : undefined,
      userPhone: userPhone ? userPhone.trim() : undefined,
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      title: title ? title.trim() : undefined,
      comment: comment.trim(),
      variantTitle: variantTitle || undefined,
      tags: Array.isArray(tags) ? tags : [],
      isVerifiedPurchase: true,
      helpfulCount: 0,
      createdAt: new Date().toISOString()
    };

    await db.addReview(newReview);
    res.json({ success: true, message: 'Đánh giá của bạn đã được ghi nhận thành công!', data: newReview });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/reviews/:id/helpful', async (req: Request, res: Response) => {
  try {
    const updated = await db.upvoteReview(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/reviews/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteReview(req.params.id);
    res.json({ success: true, message: 'Đã xóa đánh giá thành công.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   ORDERS
   ========================================================================= */
apiRouter.get('/orders', (req: Request, res: Response) => {
  let orders = [...db.getOrders()];
  const { status, paymentStatus, search } = req.query;
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  if (paymentStatus) {
    orders = orders.filter(o => o.paymentStatus === paymentStatus);
  }
  if (search) {
    const s = String(search).toLowerCase();
    orders = orders.filter(o =>
      o.orderCode.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s) ||
      o.phone.includes(s) ||
      o.email.toLowerCase().includes(s)
    );
  }
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách (như cũ).
  res.json(listBody(orders, req.query));
});

apiRouter.get('/orders/:codeOrId', (req: Request, res: Response) => {
  const { codeOrId } = req.params;
  const order = db.getOrders().find(o => o.id === codeOrId || o.orderCode === codeOrId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
  }
  res.json({ success: true, data: order });
});

apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const now = new Date();
    const dateCode = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `TP-${dateCode}-${randCode}`;

    const items = (b.items || []).map((it: any) => ({
      productId: it.productId,
      variantId: it.variantId || undefined,
      title: it.title,
      sku: it.sku || 'SKU',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      thumbnail: it.thumbnail || ''
    }));

    const subtotal = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

    // P1.8 — phí ship do SERVER chốt từ phương thức khách chọn (`fee`/`freeFrom` đọc trong DB),
    // KHÔNG dùng `shippingFee` client gửi ⇒ không thể sửa phí ship từ trình duyệt.
    const shipping = resolveShippingFee(db.getShippingMethods(), b.shippingMethodId, subtotal);

    // P1.7 — mã giảm giá validate LẠI ở server (`discount` client gửi bị bỏ qua hoàn toàn).
    // `categoryId` tra từ DB để mã theo danh mục (`applyTo = 'category'`) tính đúng phần hàng đủ điều kiện.
    const products = db.getProducts();
    const couponItems = items.map((item: any) => ({
      productId: item.productId,
      categoryId: products.find(p => p.id === item.productId)?.categoryId,
      quantity: item.quantity,
      price: item.price
    }));
    const couponCheck = b.couponCode
      ? validateCoupon(db.getCoupons(), { code: b.couponCode, subtotal, items: couponItems })
      : null;
    if (couponCheck && !couponCheck.valid) {
      // Không im lặng trừ 0đ: trả 400 + thông báo để khách nhập mã khác thay vì bị tính đủ tiền.
      return res
        .status(400)
        .json({ success: false, message: couponCheck.message, couponInvalid: true });
    }
    const coupons = db.getCoupons();
    const coupon = couponCheck?.valid ? findCoupon(coupons, b.couponCode) : undefined;
    const discount = couponCheck?.valid ? couponCheck.discount : 0;

    const total = Math.max(0, subtotal + shipping.fee - discount);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode,
      customerName: b.customerName || 'Khách hàng',
      phone: b.phone || '',
      email: b.email || '',
      address: {
        province: b.address?.province || '',
        district: b.address?.district || '',
        ward: b.address?.ward || '',
        street: b.address?.street || ''
      },
      items,
      subtotal,
      shippingFee: shipping.fee,
      discount,
      total,
      couponCode: coupon?.code,
      shippingMethodId: shipping.method?.id,
      shippingMethod: shipping.method?.name,
      paymentMethod: b.paymentMethod || 'cod',
      paymentStatus: b.paymentStatus || 'unpaid',
      status: 'pending',
      note: b.note || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.addOrder(newOrder);
    // Chỉ tăng lượt dùng SAU khi đơn đã lưu thành công ⇒ lượt dùng không bị “trôi” khi lỗi.
    if (coupon) await db.incrementCouponUsage(coupon.id);
    res.status(201).json({ success: true, data: newOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/orders/:id', async (req: Request, res: Response) => {
  try {
    const updated = await db.updateOrder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteOrder(req.params.id);
    res.json({ success: true, message: 'Đã xóa đơn hàng.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   CUSTOMERS
   ========================================================================= */
apiRouter.get('/customers', (req: Request, res: Response) => {
  let list = db.getCustomers();
  const { search } = req.query;
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.email.toLowerCase().includes(s));
  }
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách (như cũ).
  res.json(listBody(list, req.query));
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  const updated = await db.updateCustomer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng.' });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  await db.deleteCustomer(req.params.id);
  res.json({ success: true, message: 'Đã xóa khách hàng.' });
});

/* =========================================================================
   LEADS (Contact, Quote Request, Newsletter)
   ========================================================================= */
apiRouter.get('/leads', (req: Request, res: Response) => {
  const { type, status, source } = req.query;
  let leads = db.getLeads();
  if (type) leads = leads.filter(l => l.type === type);
  if (status) leads = leads.filter(l => l.status === status);
  // P2.3 — lọc theo nguồn lead (`?source=web-design` ⇒ chỉ lead từ form thiết kế website).
  if (source) leads = leads.filter(l => l.source === source);
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách (như cũ).
  res.json(listBody(leads, req.query));
});

apiRouter.post('/leads', async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      type: b.type || 'contact',
      name: b.name || '',
      email: b.email || '',
      phone: b.phone || '',
      subject: b.subject || '',
      message: b.message || '',
      interestedProduct: b.interestedProduct || '',
      // P2.3 — nguồn lead: form không gửi ⇒ coi là form chung trên website.
      source: b.source || 'website',
      status: 'new',
      adminNote: '',
      createdAt: new Date().toISOString()
    };
    await db.addLead(newLead);
    res.status(201).json({ success: true, data: newLead, message: 'Gửi yêu cầu thành công! GPSOFT sẽ liên hệ bạn sớm nhất.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/leads/:id', async (req: Request, res: Response) => {
  const updated = await db.updateLead(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Lead không tồn tại.' });
  res.json({ success: true, data: updated });
});

apiRouter.delete('/leads/:id', async (req: Request, res: Response) => {
  await db.deleteLead(req.params.id);
  res.json({ success: true, message: 'Đã xóa lead.' });
});

/* =========================================================================
   WARRANTIES (Bảo hành & tiếp nhận sửa chữa — P1.1)
   =========================================================================
   - `GET /warranties` — danh sách cho CMS (cần token `warranty.view`):
     `?status=` (1 giá trị hoặc nhiều giá trị cách nhau dấu phẩy), `?q=` (mã phiếu / serial /
     tên khách / tên sản phẩm / SĐT), `?expired=true|false` + phân trang chuẩn P0.4.
   - `GET /warranties/lookup` — route CÔNG KHAI (đã mở ở `auth.ts`), khớp CHÍNH XÁC mã phiếu /
     serial hoặc HẬU TỐ SĐT (≥ 4 số) và trả kèm `remainingDays` cho trang `/bao-hanh` (P1.3).
   ========================================================================= */
apiRouter.get('/warranties', (req: Request, res: Response) => {
  const list = filterWarranties(db.getWarranties(), req.query);
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách.
  res.json(listBody(list, req.query));
});

apiRouter.get('/warranties/lookup', (req: Request, res: Response) => {
  const q = queryText(req.query.q);
  if (q.length < LOOKUP_MIN_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Vui lòng nhập số điện thoại, số serial hoặc mã phiếu (tối thiểu ${LOOKUP_MIN_LENGTH} ký tự).`
    });
  }

  const products = db.getProducts();
  const data = lookupWarranties(db.getWarranties(), q).map(warranty => {
    const product = products.find(p => p.id === warranty.productId);
    return {
      ...warranty,
      product: product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
            thumbnail: product.thumbnail,
            salePrice: product.salePrice
          }
        : null
    };
  });

  // Không tìm thấy ⇒ 200 + mảng rỗng để trang tra cứu hiện empty state lịch sự.
  res.json({ success: true, count: data.length, data });
});

/** Field CMS được phép gửi khi sửa phiếu (không cho ghi đè `id`/`createdAt`). */
const WARRANTY_EDITABLE_FIELDS = [
  'code',
  'customerName',
  'phone',
  'email',
  'productId',
  'productName',
  'serialNumber',
  'purchaseDate',
  'startDate',
  'endDate',
  'issue',
  'diagnosis',
  'resolution',
  'technician',
  'receivedAt',
  'returnedAt'
] as const;

apiRouter.post('/warranties', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const product = db.getProducts().find(p => p.id === b.productId || p.slug === b.productId);

    if (!b.customerName || !String(b.customerName).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khách hàng.' });
    }
    if (!b.phone || !String(b.phone).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại liên hệ.' });
    }
    if (!b.productId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn sản phẩm cần bảo hành.' });
    }
    if (!b.issue || !String(b.issue).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng mô tả tình trạng máy khi tiếp nhận.' });
    }

    const now = new Date().toISOString();
    const warrantyMonths = Math.max(0, Math.trunc(Number(b.warrantyMonths)) || 12);
    const startDate = b.startDate || b.purchaseDate || now;
    // Hạn bảo hành suy ra từ ngày bắt đầu + số tháng (client không cần tự tính).
    const endDate = b.endDate || addMonths(startDate, warrantyMonths) || startDate;

    const newWarranty: Warranty = {
      id: genId('warr'),
      code: b.code ? String(b.code).trim() : generateWarrantyCode(db.getWarranties()),
      customerName: String(b.customerName).trim(),
      phone: String(b.phone).trim(),
      email: b.email ? String(b.email).trim() : undefined,
      productId: product ? product.id : String(b.productId),
      productName: b.productName || (product ? product.name : ''),
      serialNumber: b.serialNumber ? String(b.serialNumber).trim() : undefined,
      purchaseDate: b.purchaseDate || startDate,
      startDate,
      endDate,
      warrantyMonths,
      warrantyType: b.warrantyType === 'mo_rong' ? 'mo_rong' : 'nha_san_xuat',
      status: WARRANTY_STATUSES.includes(b.status) ? b.status : 'received',
      issue: String(b.issue).trim(),
      diagnosis: b.diagnosis || undefined,
      resolution: b.resolution || undefined,
      technician: b.technician || undefined,
      cost: Number(b.cost) || 0,
      receivedAt: b.receivedAt || now,
      returnedAt: b.returnedAt || undefined,
      createdAt: now
    };

    await db.addWarranty(newWarranty);
    res.status(201).json({
      success: true,
      data: newWarranty,
      message: `Đã tiếp nhận phiếu bảo hành ${newWarranty.code}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/warranties/:id', async (req: Request, res: Response) => {
  try {
    const current = db.getWarranties().find(w => w.id === req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Phiếu bảo hành không tồn tại.' });
    }

    const b = req.body || {};
    const updates: Partial<Warranty> = {};
    for (const field of WARRANTY_EDITABLE_FIELDS) {
      if (b[field] !== undefined) (updates as Record<string, unknown>)[field] = b[field];
    }
    if (b.warrantyMonths !== undefined) {
      updates.warrantyMonths = Math.max(0, Math.trunc(Number(b.warrantyMonths)) || 0);
    }
    if (b.warrantyType !== undefined) {
      updates.warrantyType = b.warrantyType === 'mo_rong' ? 'mo_rong' : 'nha_san_xuat';
    }
    if (b.status !== undefined && WARRANTY_STATUSES.includes(b.status)) {
      updates.status = b.status;
      // Trạng thái `returned`/`rejected` ⇒ tự đóng dấu thời điểm trả máy nếu client chưa gửi.
      if ((b.status === 'returned' || b.status === 'rejected') && !b.returnedAt) {
        updates.returnedAt = new Date().toISOString();
      }
    }
    if (b.cost !== undefined) updates.cost = Number(b.cost) || 0;

    // Đổi ngày bắt đầu / số tháng mà không gửi `endDate` ⇒ tính lại hạn bảo hành.
    if (updates.endDate === undefined && (updates.startDate !== undefined || updates.warrantyMonths !== undefined)) {
      const derived = addMonths(updates.startDate || current.startDate, updates.warrantyMonths ?? current.warrantyMonths);
      if (derived) updates.endDate = derived;
    }

    const updated = await db.updateWarranty(req.params.id, updates);
    res.json({ success: true, data: updated, message: 'Đã cập nhật phiếu bảo hành.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/warranties/:id', async (req: Request, res: Response) => {
  const existing = db.getWarranties().find(w => w.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Phiếu bảo hành không tồn tại.' });
  }
  await db.deleteWarranty(req.params.id);
  res.json({ success: true, message: `Đã xóa phiếu bảo hành ${existing.code}.` });
});

/* =========================================================================
   PRICE QUOTES (Báo giá B2B — P1.4) · QUOTE LINKS (link chia sẻ — P1.5)
   =========================================================================
   - `GET /price-quotes` — danh sách cho CMS (token `quotes.view`): `?status=` (1 hoặc nhiều
     giá trị cách nhau dấu phẩy), `?q=` (mã / tiêu đề / khách / công ty / SĐT),
     `?expired=true|false` + phân trang chuẩn P0.4.
   - `GET /price-quotes/export.csv` — xuất Excel (1 dòng / 1 dòng hàng, UTF-8 BOM).
     ⚠️ Phải khai báo TRƯỚC `/price-quotes/:idOrCode`, nếu không `:idOrCode` sẽ “nuốt” `export.csv`.
   - `POST /price-quotes` · `PUT /price-quotes/:id` — **server tự tính** `item.total` và
     `quote.total` từ `qty × unitPrice`; `total` client gửi bị bỏ qua hoàn toàn.
   - `GET /quote-links/:code?pass=` — route CÔNG KHAI (đã mở ở `auth.ts`): trả `{ link, quote }`;
     link tắt / hết hạn / không tồn tại ⇒ 404, thiếu–sai mật khẩu ⇒ 401 + `requiresPassword: true`
     (trang `/bao-gia/:code` hiện form nhập lại, chưa lộ dữ liệu báo giá).
   ========================================================================= */
apiRouter.get('/price-quotes', (req: Request, res: Response) => {
  const list = filterQuotes(db.getPriceQuotes(), req.query).map(q => withEffectiveStatus(q));
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách.
  res.json(listBody(list, req.query));
});

apiRouter.get('/price-quotes/export.csv', (req: Request, res: Response) => {
  const quotes = filterQuotes(db.getPriceQuotes(), req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Bao_Gia_GPSOFT.csv"');
  res.send(buildQuoteCsv(quotes));
});

apiRouter.get('/price-quotes/:idOrCode', (req: Request, res: Response) => {
  const quote = findQuote(db.getPriceQuotes(), req.params.idOrCode);
  if (!quote) {
    return res.status(404).json({ success: false, message: 'Báo giá không tồn tại.' });
  }
  const links = db.getQuoteLinks().filter(l => l.quoteId === quote.id);
  res.json({ success: true, data: withEffectiveStatus(quote), links });
});

/**
 * Đọc + chuẩn hoá body tạo/sửa báo giá. Trả `{ quote, error }` — chỉ 1 trong 2 có giá trị.
 * `items` luôn đi qua `normalizeQuoteItems()` ⇒ tổng tiền không thể bị sửa từ trình duyệt.
 */
function readQuoteBody(body: any): { items: PriceQuoteItem[]; total: number; fields: Partial<PriceQuote> } {
  const items = normalizeQuoteItems(body?.items);
  const fields: Partial<PriceQuote> = {
    code: body?.code !== undefined ? String(body.code).trim().toUpperCase() : undefined,
    title: body?.title !== undefined ? String(body.title).trim() : undefined,
    customerName: body?.customerName !== undefined ? String(body.customerName).trim() : undefined,
    phone: body?.phone !== undefined ? String(body.phone).trim() : undefined,
    email: body?.email !== undefined ? String(body.email).trim() : undefined,
    company: body?.company !== undefined ? String(body.company).trim() : undefined,
    note: body?.note !== undefined ? String(body.note).trim() : undefined,
    validUntil: body?.validUntil !== undefined ? String(body.validUntil) : undefined
  };
  if (body?.status !== undefined && QUOTE_STATUSES.includes(body.status)) fields.status = body.status;
  return { items, total: computeQuoteTotal(items), fields };
}

apiRouter.post('/price-quotes', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!String(b.customerName || '').trim() || !String(b.phone || '').trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khách hàng và số điện thoại.' });
    }

    const quotes = db.getPriceQuotes();
    const { items, total, fields } = readQuoteBody(b);
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Báo giá cần ít nhất 1 dòng hàng hợp lệ (có tên hàng).' });
    }

    // Tên người tạo lấy từ DB theo token (payload JWT chỉ có `sub`), không tin dữ liệu client gửi.
    const author = db.getUsers().find(u => u.id === req.auth?.sub);

    const newQuote: PriceQuote = {
      id: genId('quote'),
      code: fields.code || generateQuoteCode(quotes),
      title: fields.title || 'Báo giá thiết bị công nghệ',
      customerName: String(b.customerName).trim(),
      phone: String(b.phone).trim(),
      email: fields.email || undefined,
      company: fields.company || undefined,
      note: fields.note || undefined,
      items,
      total,
      status: fields.status || 'draft',
      validUntil: fields.validUntil || defaultValidUntil(),
      createdBy: author?.fullName || req.auth?.username || 'Hệ thống',
      createdAt: new Date().toISOString()
    };

    await db.addPriceQuote(newQuote);
    res.status(201).json({
      success: true,
      data: newQuote,
      message: `Đã tạo báo giá ${newQuote.code} (tổng ${total.toLocaleString('vi-VN')}đ).`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/price-quotes/:id', async (req: Request, res: Response) => {
  try {
    const current = db.getPriceQuotes().find(q => q.id === req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Báo giá không tồn tại.' });
    }

    const b = req.body || {};
    const updates: Partial<PriceQuote> = {};
    for (const field of ['code', 'title', 'customerName', 'phone', 'email', 'company', 'note', 'validUntil'] as const) {
      if (b[field] !== undefined) (updates as Record<string, unknown>)[field] = String(b[field]).trim();
    }
    if (b.status !== undefined && QUOTE_STATUSES.includes(b.status)) updates.status = b.status;

    // Gửi kèm `items` ⇒ chuẩn hoá lại và tính lại tổng; không gửi ⇒ giữ nguyên dòng cũ + tổng cũ.
    if (b.items !== undefined) {
      const items = normalizeQuoteItems(b.items);
      if (items.length === 0) {
        return res.status(400).json({ success: false, message: 'Báo giá cần ít nhất 1 dòng hàng hợp lệ (có tên hàng).' });
      }
      updates.items = items;
      updates.total = computeQuoteTotal(items);
    }

    const updated = await db.updatePriceQuote(req.params.id, updates);
    res.json({ success: true, data: updated, message: `Đã cập nhật báo giá ${updated?.code || ''}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/price-quotes/:id', async (req: Request, res: Response) => {
  const existing = db.getPriceQuotes().find(q => q.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Báo giá không tồn tại.' });
  }
  await db.deletePriceQuote(req.params.id);
  res.json({ success: true, message: `Đã xóa báo giá ${existing.code} cùng các link chia sẻ của nó.` });
});

/* --- Link chia sẻ báo giá (P1.5) ----------------------------------------- */

apiRouter.get('/quote-links', (req: Request, res: Response) => {
  const quoteId = queryText(req.query.quoteId);
  const links = quoteId ? db.getQuoteLinks().filter(l => l.quoteId === quoteId) : db.getQuoteLinks();
  res.json({ success: true, count: links.length, total: links.length, data: links });
});

/**
 * Tạo link chia sẻ. `password` rỗng/không gửi ⇒ link công khai; `expiresAt` không gửi ⇒
 * mặc định 30 ngày (hoặc theo `expiresInDays`). Mã link sinh tự động và không bao giờ trùng.
 */
apiRouter.post('/quote-links', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const quote = findQuote(db.getPriceQuotes(), b.quoteId);
    if (!quote) {
      return res.status(400).json({ success: false, message: 'Báo giá cần chia sẻ không tồn tại.' });
    }

    const links = db.getQuoteLinks();
    const days = Number(b.expiresInDays);
    const newLink: QuoteLink = {
      id: genId('qlink'),
      code: normalizeLinkCode(b.code) || generateQuoteLinkCode(links),
      quoteId: quote.id,
      password: queryText(b.password) || undefined,
      expiresAt: b.expiresAt
        ? String(b.expiresAt)
        : defaultValidUntil(Date.now(), Number.isFinite(days) && days > 0 ? days : 30),
      viewCount: 0,
      isActive: b.isActive === undefined ? true : !!b.isActive,
      createdAt: new Date().toISOString()
    };

    if (links.some(l => normalizeLinkCode(l.code) === newLink.code)) {
      return res.status(409).json({ success: false, message: `Mã link ${newLink.code} đã tồn tại, vui lòng chọn mã khác.` });
    }

    await db.addQuoteLink(newLink);
    res.status(201).json({ success: true, data: newLink, message: `Đã tạo link chia sẻ ${newLink.code}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/quote-links/:id', async (req: Request, res: Response) => {
  const current = db.getQuoteLinks().find(l => l.id === req.params.id);
  if (!current) {
    return res.status(404).json({ success: false, message: 'Link chia sẻ không tồn tại.' });
  }

  const b = req.body || {};
  const updates: Partial<QuoteLink> = {};
  if (b.isActive !== undefined) updates.isActive = !!b.isActive;
  if (b.expiresAt !== undefined) updates.expiresAt = String(b.expiresAt);
  // `password: ''` ⇒ gỡ mật khẩu (link trở thành công khai).
  if (b.password !== undefined) updates.password = queryText(b.password) || undefined;
  if (b.code !== undefined) {
    const code = normalizeLinkCode(b.code);
    if (!code) return res.status(400).json({ success: false, message: 'Mã link không được để trống.' });
    if (db.getQuoteLinks().some(l => l.id !== current.id && normalizeLinkCode(l.code) === code)) {
      return res.status(409).json({ success: false, message: `Mã link ${code} đã tồn tại.` });
    }
    updates.code = code;
  }

  const updated = await db.updateQuoteLink(req.params.id, updates);
  res.json({ success: true, data: updated, message: 'Đã cập nhật link chia sẻ.' });
});

apiRouter.delete('/quote-links/:id', async (req: Request, res: Response) => {
  const existing = db.getQuoteLinks().find(l => l.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Link chia sẻ không tồn tại.' });
  }
  await db.deleteQuoteLink(req.params.id);
  res.json({ success: true, message: `Đã thu hồi link chia sẻ ${existing.code}.` });
});

/**
 * CÔNG KHAI — khách mở `/bao-gia/<code>`. Không tìm thấy / đã tắt / hết hạn ⇒ 404;
 * có mật khẩu mà chưa đúng ⇒ 401 + `requiresPassword: true` (trang public hiện form nhập lại).
 * Chỉ khi hợp lệ mới tăng `viewCount` để CMS thấy được “link này có ai mở chưa”.
 */
apiRouter.get('/quote-links/:code', async (req: Request, res: Response) => {
  try {
    const wanted = normalizeLinkCode(req.params.code);
    const link = db.getQuoteLinks().find(l => normalizeLinkCode(l.code) === wanted);
    const check = checkQuoteLink(link, req.query.pass);

    if (check === 'invalid' || !link) {
      return res.status(404).json({
        success: false,
        message: 'Link báo giá không tồn tại hoặc đã hết hiệu lực. Vui lòng liên hệ GPSOFT để nhận link mới.'
      });
    }

    const quote = db.getPriceQuotes().find(q => q.id === link.quoteId);
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Báo giá của link này đã bị xóa.' });
    }

    if (check === 'password') {
      return res.status(401).json({
        success: false,
        requiresPassword: true,
        message: 'Link báo giá này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu để xem.'
      });
    }

    const counted = (await db.incrementQuoteLinkView(link.id)) || link;
    res.json({ success: true, data: { link: counted, quote: withEffectiveStatus(quote) } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   COUPONS — Mã giảm giá (P1.7)
   =========================================================================
   - `GET /coupons` — danh sách cho CMS (token `coupon.view`): `?q=` (mã/tên) ·
     `?state=` (`ok` | `inactive` | `not_started` | `expired` | `used_up`) · `?applyTo=` + phân trang P0.4.
   - `POST /coupons/validate` — CÔNG KHAI (đã mở ở `auth.ts`): body `{ code, subtotal?, items?[] }`
     ⇒ `{ valid, discount, message }`. Cố ý KHÔNG trả `usageLimit`/`usedCount`/`applyIds` để không
     lộ cấu hình nội bộ; `POST /orders` validate LẠI y hệt nên số client không thể bị sửa.
   - `POST /coupons` · `PUT /coupons/:id` — mã lưu ở dạng CHUẨN HOÁ (in hoa, bỏ khoảng trắng);
     trùng mã ⇒ 409; `percent` bị kẹp `1–100`.
   ========================================================================= */
apiRouter.get('/coupons', (req: Request, res: Response) => {
  const list = filterCoupons(db.getCoupons(), req.query).map(c => ({
    ...c,
    state: couponState(c)
  }));
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách.
  res.json(listBody(list, req.query));
});

apiRouter.post('/coupons/validate', (req: Request, res: Response) => {
  const b = req.body || {};
  res.json(validateCoupon(db.getCoupons(), { code: b.code, subtotal: b.subtotal, items: b.items }));
});

/** Đọc + chuẩn hoá body tạo/sửa mã giảm giá (`usedCount` không nhận từ client khi tạo). */
function readCouponBody(body: any): Partial<Coupon> {
  const fields: Partial<Coupon> = {};
  if (body?.code !== undefined) fields.code = normalizeCouponCode(body.code);
  if (body?.name !== undefined) fields.name = String(body.name).trim();
  if (body?.discountType !== undefined && isCouponDiscountType(body.discountType)) {
    fields.discountType = body.discountType;
  }
  if (body?.value !== undefined) fields.value = Number(body.value) || 0;
  if (body?.minOrder !== undefined) fields.minOrder = Number(body.minOrder) || 0;
  if (body?.maxDiscount !== undefined) fields.maxDiscount = Number(body.maxDiscount) || 0;
  if (body?.usageLimit !== undefined) fields.usageLimit = Math.max(0, Number(body.usageLimit) || 0);
  if (body?.startAt !== undefined) fields.startAt = body.startAt ? String(body.startAt) : undefined;
  if (body?.endAt !== undefined) fields.endAt = body.endAt ? String(body.endAt) : undefined;
  if (body?.applyTo !== undefined && isCouponApplyTo(body.applyTo)) fields.applyTo = body.applyTo;
  if (body?.applyIds !== undefined) {
    fields.applyIds = Array.isArray(body.applyIds) ? body.applyIds.map(String).filter(Boolean) : [];
  }
  if (body?.isActive !== undefined) fields.isActive = !!body.isActive;

  // `percent` ngoài 1–100 là lỗi nhập liệu ⇒ kẹp lại thay vì lưu số vô nghĩa.
  if (fields.discountType === 'percent' && fields.value !== undefined) {
    fields.value = Math.min(100, Math.max(1, Math.round(fields.value)));
  } else if (fields.value !== undefined) {
    fields.value = Math.max(0, Math.round(fields.value));
  }
  return fields;
}

apiRouter.post('/coupons', async (req: Request, res: Response) => {
  try {
    const fields = readCouponBody(req.body || {});
    if (!fields.code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
    }
    if (!fields.name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chương trình giảm giá.' });
    }
    if (db.getCoupons().some(c => normalizeCouponCode(c.code) === fields.code)) {
      return res.status(409).json({ success: false, message: `Mã ${fields.code} đã tồn tại.` });
    }

    const coupon: Coupon = {
      id: genId('coupon'),
      code: fields.code,
      name: fields.name,
      discountType: fields.discountType || 'fixed',
      value: fields.value || 0,
      minOrder: fields.minOrder || 0,
      maxDiscount: fields.maxDiscount,
      usageLimit: fields.usageLimit || 0,
      // Lượt dùng luôn bắt đầu từ 0 — chỉ `POST /orders` mới tăng được.
      usedCount: 0,
      startAt: fields.startAt,
      endAt: fields.endAt,
      applyTo: fields.applyTo || 'all',
      applyIds: fields.applyIds || [],
      isActive: fields.isActive !== false,
      createdAt: new Date().toISOString()
    };

    await db.addCoupon(coupon);
    res.status(201).json({ success: true, data: coupon, message: `Đã tạo mã giảm giá ${coupon.code}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/coupons/:id', async (req: Request, res: Response) => {
  const current = db.getCoupons().find(c => c.id === req.params.id);
  if (!current) {
    return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
  }

  const fields = readCouponBody(req.body || {});
  if (fields.code !== undefined) {
    if (!fields.code) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá không được để trống.' });
    }
    if (db.getCoupons().some(c => c.id !== current.id && normalizeCouponCode(c.code) === fields.code)) {
      return res.status(409).json({ success: false, message: `Mã ${fields.code} đã tồn tại.` });
    }
  }
  // Cho phép admin RESET lượt dùng (VD muốn mở lại mã đã hết lượt) — vẫn không nhận số âm.
  if (req.body?.usedCount !== undefined) {
    fields.usedCount = Math.max(0, Number(req.body.usedCount) || 0);
  }

  const updated = await db.updateCoupon(current.id, fields);
  res.json({ success: true, data: updated, message: 'Đã cập nhật mã giảm giá.' });
});

apiRouter.delete('/coupons/:id', async (req: Request, res: Response) => {
  const existing = db.getCoupons().find(c => c.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
  }
  await db.deleteCoupon(req.params.id);
  res.json({ success: true, message: `Đã xoá mã giảm giá ${existing.code}.` });
});

/* =========================================================================
   SHIPPING METHODS — Phương thức vận chuyển (P1.8)
   =========================================================================
   - `GET /shipping-methods` — CÔNG KHAI (đã mở ở `auth.ts`): mặc định CHỈ trả phương thức đang bật
     (website cần để tính phí); CMS truyền `?all=1` để thấy cả phương thức đang tắt. Có `?q=` + phân trang.
   - `POST` · `PUT /:id` · `DELETE /:id` — CMS quản lý (resource `shipping.*`); xoá phương thức
     KHÔNG ảnh hưởng đơn cũ vì đơn đã lưu sẵn `shippingMethodId`/`shippingMethod`/`shippingFee`.
   ========================================================================= */
apiRouter.get('/shipping-methods', (req: Request, res: Response) => {
  const all = queryText(req.query.all) === '1';
  const list = all
    ? filterShippingMethods(db.getShippingMethods(), req.query)
    : activeShippingMethods(db.getShippingMethods());
  res.json(listBody(list, req.query));
});

/** Đọc body tạo/sửa phương thức vận chuyển (`regions` nhận cả mảng lẫn chuỗi ngăn cách bởi dấu phẩy). */
function readShippingBody(body: any): Partial<ShippingMethod> {
  const fields: Partial<ShippingMethod> = {};
  if (body?.name !== undefined) fields.name = String(body.name).trim();
  if (body?.description !== undefined) fields.description = String(body.description).trim();
  if (body?.fee !== undefined) fields.fee = Math.max(0, Math.round(Number(body.fee) || 0));
  if (body?.freeFrom !== undefined) fields.freeFrom = Math.max(0, Math.round(Number(body.freeFrom) || 0));
  if (body?.estimatedDays !== undefined) fields.estimatedDays = String(body.estimatedDays).trim();
  if (body?.regions !== undefined) {
    const raw = Array.isArray(body.regions) ? body.regions : String(body.regions || '').split(',');
    fields.regions = raw.map((r: unknown) => String(r).trim()).filter(Boolean);
  }
  if (body?.isActive !== undefined) fields.isActive = !!body.isActive;
  if (body?.sortOrder !== undefined) fields.sortOrder = Math.max(0, Number(body.sortOrder) || 0);
  return fields;
}

apiRouter.post('/shipping-methods', async (req: Request, res: Response) => {
  try {
    const fields = readShippingBody(req.body || {});
    if (!fields.name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên phương thức vận chuyển.' });
    }

    const method: ShippingMethod = {
      id: genId('ship'),
      name: fields.name,
      description: fields.description,
      fee: fields.fee || 0,
      freeFrom: fields.freeFrom || 0,
      estimatedDays: fields.estimatedDays || '2–4 ngày',
      regions: fields.regions || [],
      isActive: fields.isActive !== false,
      sortOrder: fields.sortOrder ?? db.getShippingMethods().length + 1
    };

    await db.addShippingMethod(method);
    res.status(201).json({ success: true, data: method, message: `Đã tạo phương thức “${method.name}”.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/shipping-methods/:id', async (req: Request, res: Response) => {
  const current = db.getShippingMethods().find(m => m.id === req.params.id);
  if (!current) {
    return res.status(404).json({ success: false, message: 'Phương thức vận chuyển không tồn tại.' });
  }
  const fields = readShippingBody(req.body || {});
  if (fields.name !== undefined && !fields.name) {
    return res.status(400).json({ success: false, message: 'Tên phương thức không được để trống.' });
  }
  const updated = await db.updateShippingMethod(current.id, fields);
  res.json({ success: true, data: updated, message: 'Đã cập nhật phương thức vận chuyển.' });
});

apiRouter.delete('/shipping-methods/:id', async (req: Request, res: Response) => {
  const existing = db.getShippingMethods().find(m => m.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Phương thức vận chuyển không tồn tại.' });
  }
  await db.deleteShippingMethod(req.params.id);
  res.json({ success: true, message: `Đã xoá phương thức “${existing.name}”.` });
});

/* =========================================================================
   CAMPAIGNS — Chiến dịch / Flash sale (P1.9)
   =========================================================================
   - `GET /campaigns` — danh sách cho CMS (token `campaign.view`): `?q=` · `?type=` · `?state=`
     (`running` | `scheduled` | `ended` | `paused`) + phân trang. Mỗi dòng kèm `state` tính tại thời điểm gọi.
   - `GET /campaigns/active` — CÔNG KHAI (đã mở ở `auth.ts`): campaign ĐANG CHẠY + danh sách sản phẩm
     đã giải (`productIds` khai tay, rỗng ⇒ server chọn sản phẩm giảm giá nhiều nhất, tối đa
     `CAMPAIGN_PRODUCT_LIMIT`). Hết `endAt` ⇒ campaign không còn trong kết quả ⇒ khối flash sale tự ẩn.
   ========================================================================= */
apiRouter.get('/campaigns', (req: Request, res: Response) => {
  const list = filterCampaigns(db.getCampaigns(), req.query).map(c => ({
    ...c,
    state: campaignState(c)
  }));
  res.json(listBody(list, req.query));
});

apiRouter.get('/campaigns/active', (_req: Request, res: Response) => {
  const products = db.getProducts();
  const data = activeCampaigns(db.getCampaigns()).map(campaign => ({
    ...campaign,
    state: campaignState(campaign),
    products: campaignProducts(campaign, products)
  }));
  res.json({ success: true, count: data.length, total: data.length, data });
});

/** Đọc body tạo/sửa campaign (`productIds` nhận mảng, ID rỗng/không tồn tại bị bỏ qua). */
function readCampaignBody(body: any): Partial<Campaign> {
  const fields: Partial<Campaign> = {};
  if (body?.name !== undefined) fields.name = String(body.name).trim();
  if (body?.type !== undefined && isCampaignType(body.type)) fields.type = body.type;
  if (body?.startAt !== undefined) fields.startAt = body.startAt ? String(body.startAt) : undefined;
  if (body?.endAt !== undefined) fields.endAt = body.endAt ? String(body.endAt) : undefined;
  if (body?.discountPercent !== undefined) {
    fields.discountPercent = Math.min(100, Math.max(0, Math.round(Number(body.discountPercent) || 0)));
  }
  if (body?.productIds !== undefined) {
    const ids: string[] = Array.isArray(body.productIds)
      ? body.productIds.map((value: unknown) => String(value))
      : [];
    const known = new Set(db.getProducts().map(p => p.id));
    fields.productIds = ids.filter(id => known.has(id));
  }
  if (body?.bannerImage !== undefined) fields.bannerImage = String(body.bannerImage).trim();
  if (body?.ctaText !== undefined) fields.ctaText = String(body.ctaText).trim();
  if (body?.ctaUrl !== undefined) fields.ctaUrl = String(body.ctaUrl).trim();
  if (body?.isActive !== undefined) fields.isActive = !!body.isActive;
  return fields;
}

apiRouter.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const fields = readCampaignBody(req.body || {});
    if (!fields.name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chiến dịch.' });
    }

    const campaign: Campaign = {
      id: genId('camp'),
      name: fields.name,
      type: fields.type || 'flash_sale',
      startAt: fields.startAt,
      endAt: fields.endAt,
      discountPercent: fields.discountPercent,
      productIds: fields.productIds || [],
      bannerImage: fields.bannerImage,
      ctaText: fields.ctaText,
      ctaUrl: fields.ctaUrl,
      isActive: fields.isActive !== false,
      createdAt: new Date().toISOString()
    };

    await db.addCampaign(campaign);
    res.status(201).json({ success: true, data: campaign, message: `Đã tạo chiến dịch “${campaign.name}”.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/campaigns/:id', async (req: Request, res: Response) => {
  const current = db.getCampaigns().find(c => c.id === req.params.id);
  if (!current) {
    return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại.' });
  }
  const fields = readCampaignBody(req.body || {});
  if (fields.name !== undefined && !fields.name) {
    return res.status(400).json({ success: false, message: 'Tên chiến dịch không được để trống.' });
  }
  const updated = await db.updateCampaign(current.id, fields);
  res.json({ success: true, data: updated, message: 'Đã cập nhật chiến dịch.' });
});

apiRouter.delete('/campaigns/:id', async (req: Request, res: Response) => {
  const existing = db.getCampaigns().find(c => c.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại.' });
  }
  await db.deleteCampaign(req.params.id);
  res.json({ success: true, message: `Đã xoá chiến dịch “${existing.name}”.` });
});

/* =========================================================================
   CATEGORIES & BRANDS
   ========================================================================= */
apiRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getCategories() });
});
apiRouter.post('/categories', async (req: Request, res: Response) => {
  const c: Category = {
    id: `cat-${Date.now()}`,
    name: req.body.name,
    slug: req.body.slug || `cat-${Date.now()}`,
    icon: req.body.icon || 'Folder',
    image: req.body.image || '',
    description: req.body.description || '',
    parentId: req.body.parentId || null,
    sortOrder: Number(req.body.sortOrder) || db.getCategories().length + 1,
    isActive: req.body.isActive !== false
  };
  await db.addCategory(c);
  res.status(201).json({ success: true, data: c });
});
apiRouter.put('/categories/:id', async (req: Request, res: Response) => {
  const updated = await db.updateCategory(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  await db.deleteCategory(req.params.id);
  res.json({ success: true, message: 'Đã xóa danh mục.' });
});

apiRouter.get('/brands', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getBrands() });
});
apiRouter.post('/brands', async (req: Request, res: Response) => {
  const b: Brand = {
    id: `brand-${Date.now()}`,
    name: req.body.name,
    slug: req.body.slug || `brand-${Date.now()}`,
    logo: req.body.logo || '',
    country: req.body.country || 'Việt Nam',
    website: req.body.website || '',
    description: req.body.description || '',
    isActive: req.body.isActive !== false
  };
  await db.addBrand(b);
  res.status(201).json({ success: true, data: b });
});
apiRouter.put('/brands/:id', async (req: Request, res: Response) => {
  const updated = await db.updateBrand(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/brands/:id', async (req: Request, res: Response) => {
  await db.deleteBrand(req.params.id);
  res.json({ success: true, message: 'Đã xóa thương hiệu.' });
});

/* =========================================================================
   POSTS & POST CATEGORIES
   ========================================================================= */
apiRouter.get('/posts', (req: Request, res: Response) => {
  let posts = db.getPosts();
  const { category, search } = req.query;
  if (category) posts = posts.filter(p => p.category === category);
  if (search) {
    const s = String(search).toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(s) || p.excerpt.toLowerCase().includes(s));
  }
  // P0.4 — có `?page=&limit=` ⇒ trả 1 trang + `meta`; không truyền ⇒ trả nguyên danh sách (như cũ).
  res.json(listBody(posts, req.query));
});
apiRouter.get('/posts/:idOrSlug', (req: Request, res: Response) => {
  const post = db.getPosts().find(p => p.id === req.params.idOrSlug || p.slug === req.params.idOrSlug);
  if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
  post.viewCount = (post.viewCount || 0) + 1;
  res.json({ success: true, data: post });
});
apiRouter.post('/posts', async (req: Request, res: Response) => {
  const p: Post = {
    id: `post-${Date.now()}`,
    title: req.body.title || 'Bài viết mới',
    slug: req.body.slug || `post-${Date.now()}`,
    category: req.body.category || 'Tin Công Nghệ',
    excerpt: req.body.excerpt || '',
    content: req.body.content || '',
    thumbnail: req.body.thumbnail || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    author: req.body.author || 'Admin GPSOFT',
    tags: req.body.tags || [],
    isFeatured: !!req.body.isFeatured,
    viewCount: 0,
    seo: req.body.seo || { metaTitle: req.body.title, metaDesc: req.body.excerpt },
    status: req.body.status || 'published',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  await db.addPost(p);
  res.status(201).json({ success: true, data: p });
});
apiRouter.put('/posts/:id', async (req: Request, res: Response) => {
  const updated = await db.updatePost(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/posts/:id', async (req: Request, res: Response) => {
  await db.deletePost(req.params.id);
  res.json({ success: true, message: 'Đã xóa bài viết.' });
});
apiRouter.get('/post-categories', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getPostCategories() });
});
apiRouter.post('/post-categories', async (req: Request, res: Response) => {
  const c: PostCategory = {
    id: `pcat-${Date.now()}`,
    name: req.body.name || 'Danh mục mới',
    slug: req.body.slug || `danh-muc-${Date.now()}`,
    description: req.body.description || ''
  };
  await db.addPostCategory(c);
  res.status(201).json({ success: true, data: c });
});
apiRouter.put('/post-categories/:id', async (req: Request, res: Response) => {
  const updated = await db.updatePostCategory(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/post-categories/:id', async (req: Request, res: Response) => {
  await db.deletePostCategory(req.params.id);
  res.json({ success: true, message: 'Đã xóa danh mục bài viết.' });
});

/* =========================================================================
   SERVICES
   ========================================================================= */
apiRouter.get('/services', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getServices() });
});
apiRouter.get('/services/:slug', (req: Request, res: Response) => {
  const s = db.getServices().find(srv => srv.slug === req.params.slug || srv.id === req.params.slug);
  if (!s) return res.status(404).json({ success: false, message: 'Dịch vụ không tồn tại.' });
  res.json({ success: true, data: s });
});
apiRouter.post('/services', async (req: Request, res: Response) => {
  // P2.3 — CMS gửi `priceEstimate`/`process`/`faq` (tên cũ) ⇒ chuẩn hoá về `priceRange`/`processSteps`/`faqs`.
  const s = buildServiceFromInput(req.body, `srv-${Date.now()}`);
  await db.addService(s);
  res.status(201).json({ success: true, data: s });
});
apiRouter.put('/services/:id', async (req: Request, res: Response) => {
  const updated = await db.updateService(req.params.id, normalizeServiceInput(req.body));
  res.json({ success: true, data: updated });
});
apiRouter.delete('/services/:id', async (req: Request, res: Response) => {
  await db.deleteService(req.params.id);
  res.json({ success: true, message: 'Đã xóa dịch vụ.' });
});

/* =========================================================================
   BANNERS, MENUS, PAGES
   ========================================================================= */
apiRouter.get('/banners', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getBanners().sort((a, b) => a.sortOrder - b.sortOrder) });
});
apiRouter.post('/banners', async (req: Request, res: Response) => {
  const b: Banner = {
    id: `ban-${Date.now()}`,
    title: req.body.title || '',
    subtitle: req.body.subtitle || '',
    imageUrl: req.body.imageUrl || '',
    linkUrl: req.body.linkUrl || '/',
    buttonText: req.body.buttonText || 'Xem Ngay',
    position: req.body.position || 'hero',
    sortOrder: Number(req.body.sortOrder) || db.getBanners().length + 1,
    isActive: req.body.isActive !== false
  };
  await db.addBanner(b);
  res.status(201).json({ success: true, data: b });
});
apiRouter.put('/banners/:id', async (req: Request, res: Response) => {
  const updated = await db.updateBanner(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/banners/:id', async (req: Request, res: Response) => {
  await db.deleteBanner(req.params.id);
  res.json({ success: true, message: 'Đã xóa banner.' });
});

apiRouter.get('/menus', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getMenus() });
});
apiRouter.post('/menus', async (req: Request, res: Response) => {
  // If request is for a single menu item (from CMS BannersMenuView)
  if (req.body.url !== undefined) {
    const loc = req.body.position === 'footer' ? 'footer' : 'header';
    let targetMenu = db.getMenus().find(m => m.location === loc);
    if (!targetMenu) {
      targetMenu = {
        id: `menu-${loc}`,
        title: loc === 'header' ? 'Menu Chính Trên Cùng' : 'Menu Chân Trang Footer',
        location: loc,
        items: []
      };
      await db.addMenu(targetMenu);
    }
    const newItem = {
      id: `mi-${Date.now()}`,
      label: req.body.title || req.body.label || 'Liên kết mới',
      title: req.body.title || req.body.label || 'Liên kết mới',
      url: req.body.url || '/',
      sortOrder: Number(req.body.sortOrder) || ((targetMenu.items || []).length + 1),
      isExternal: Boolean(req.body.isExternal)
    };
    const items = [...(targetMenu.items || []), newItem];
    await db.updateMenu(targetMenu.id, { items });
    return res.status(201).json({ success: true, data: newItem });
  }

  const m: Menu = {
    id: `menu-${Date.now()}`,
    title: req.body.title || 'Menu mới',
    location: req.body.location || 'header',
    items: req.body.items || []
  };
  await db.addMenu(m);
  res.status(201).json({ success: true, data: m });
});
apiRouter.put('/menus/:id', async (req: Request, res: Response) => {
  // Check if :id is a MenuItem inside any existing menu
  let foundMenu: Menu | undefined;
  let foundIndex = -1;
  for (const m of db.getMenus()) {
    const idx = (m.items || []).findIndex(item => item.id === req.params.id);
    if (idx !== -1) {
      foundMenu = m;
      foundIndex = idx;
      break;
    }
  }

  if (foundMenu && foundIndex !== -1) {
    const targetLoc = req.body.position || req.body.location;
    const currentItem = foundMenu.items[foundIndex];
    const updatedItem = {
      ...currentItem,
      label: req.body.title !== undefined ? req.body.title : (req.body.label !== undefined ? req.body.label : currentItem.label),
      title: req.body.title !== undefined ? req.body.title : (req.body.label !== undefined ? req.body.label : currentItem.title),
      url: req.body.url !== undefined ? req.body.url : currentItem.url,
      sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : currentItem.sortOrder,
      isExternal: req.body.isExternal !== undefined ? Boolean(req.body.isExternal) : currentItem.isExternal
    };

    if (targetLoc && targetLoc !== foundMenu.location) {
      foundMenu.items.splice(foundIndex, 1);
      await db.updateMenu(foundMenu.id, { items: foundMenu.items });

      let newMenu = db.getMenus().find(m => m.location === targetLoc);
      if (!newMenu) {
        newMenu = {
          id: `menu-${targetLoc}`,
          title: targetLoc === 'header' ? 'Menu Chính Trên Cùng' : 'Menu Chân Trang Footer',
          location: targetLoc,
          items: []
        };
        await db.addMenu(newMenu);
      }
      newMenu.items.push(updatedItem);
      await db.updateMenu(newMenu.id, { items: newMenu.items });
    } else {
      foundMenu.items[foundIndex] = updatedItem;
      await db.updateMenu(foundMenu.id, { items: foundMenu.items });
    }
    return res.json({ success: true, data: updatedItem });
  }

  const updated = await db.updateMenu(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/menus/:id', async (req: Request, res: Response) => {
  // Check if :id is a MenuItem inside any existing menu
  let foundMenu: Menu | undefined;
  let foundIndex = -1;
  for (const m of db.getMenus()) {
    const idx = (m.items || []).findIndex(item => item.id === req.params.id);
    if (idx !== -1) {
      foundMenu = m;
      foundIndex = idx;
      break;
    }
  }

  if (foundMenu && foundIndex !== -1) {
    foundMenu.items.splice(foundIndex, 1);
    await db.updateMenu(foundMenu.id, { items: foundMenu.items });
    return res.json({ success: true, message: 'Đã xóa liên kết menu.' });
  }

  await db.deleteMenu(req.params.id);
  res.json({ success: true, message: 'Đã xóa menu.' });
});

apiRouter.get('/pages', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getPages() });
});
apiRouter.get('/pages/:slug', (req: Request, res: Response) => {
  const page = db.getPages().find(p => p.slug === req.params.slug || p.id === req.params.slug);
  if (!page) return res.status(404).json({ success: false, message: 'Trang không tồn tại.' });
  res.json({ success: true, data: page });
});
apiRouter.post('/pages', async (req: Request, res: Response) => {
  const p: Page = {
    id: `page-${Date.now()}`,
    title: req.body.title,
    slug: req.body.slug,
    content: req.body.content || '',
    isPublished: req.body.isPublished !== false,
    seo: req.body.seo || { metaTitle: req.body.title, metaDesc: '' },
    updatedAt: new Date().toISOString()
  };
  await db.addPage(p);
  res.status(201).json({ success: true, data: p });
});
apiRouter.put('/pages/:id', async (req: Request, res: Response) => {
  const updated = await db.updatePage(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/pages/:id', async (req: Request, res: Response) => {
  await db.deletePage(req.params.id);
  res.json({ success: true, message: 'Đã xóa trang tĩnh.' });
});

/* =========================================================================
   MEDIA FILES & FILE MANAGER
   ========================================================================= */
apiRouter.get('/media', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getMediaFiles() });
});

apiRouter.post('/media', async (req: Request, res: Response) => {
  const url = (req.body.url || '').trim();
  if (!url) {
    return res.status(400).json({ success: false, message: 'Thiếu đường dẫn file.' });
  }
  const filename = req.body.filename || url.split('/').pop() || `remote-${Date.now()}`;
  const ext = path.extname(filename).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'].includes(ext);
  const newMedia: MediaFile = {
    id: `med-${Date.now()}`,
    filename,
    originalName: req.body.originalName || filename,
    mimeType: req.body.mimeType || (isImage ? 'image/jpeg' : 'application/octet-stream'),
    size: Number(req.body.size) || 0,
    url,
    category: req.body.category || (isImage ? 'image' : 'other'),
    uploadedAt: new Date().toISOString(),
    provider: 'local'
  };
  await db.addMedia(newMedia);
  res.status(201).json({ success: true, data: newMedia });
});

apiRouter.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có tập tin nào được tải lên.' });
    }
    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    const isDoc = file.mimetype.includes('pdf') || file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('word');
    const category = isImage ? 'image' : isDoc ? 'document' : 'other';

    const newMedia = {
      id: `med-${Date.now()}`,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      category: category as 'image' | 'document' | 'other',
      uploadedAt: new Date().toISOString(),
      provider: 'local' as const
    };

    await db.addMedia(newMedia);
    res.status(201).json({ success: true, data: newMedia });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/media/:id', async (req: Request, res: Response) => {
  const media = db.getMediaFiles().find(m => m.id === req.params.id);
  if (media && media.provider === 'local') {
    const filePath = path.join(UPLOAD_DIR, media.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink local media file:', e);
      }
    }
  }
  await db.deleteMedia(req.params.id);
  res.json({ success: true, message: 'Đã xóa file media.' });
});

/* =========================================================================
   SETTINGS & SEO
   ========================================================================= */
apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getSettings() });
});
apiRouter.put('/settings', async (req: Request, res: Response) => {
  const updated = await db.updateSettings(req.body);
  res.json({ success: true, data: updated, message: 'Đã lưu cấu hình hệ thống thành công.' });
});

apiRouter.get('/seo', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getSeoSettings() });
});
apiRouter.put('/seo', async (req: Request, res: Response) => {
  const updated = await db.updateSeoSettings(req.body);
  res.json({ success: true, data: updated, message: 'Đã cập nhật cấu hình SEO thành công.' });
});

/* =========================================================================
   USERS & ROLES
   ========================================================================= */
apiRouter.get('/users', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getUsers().map(sanitizeUser) });
});
apiRouter.post('/users', async (req: Request, res: Response) => {
  const password = typeof req.body.password === 'string' && req.body.password.trim() ? req.body.password.trim() : '123456';
  const u: User = {
    id: `usr-${Date.now()}`,
    username: req.body.username,
    fullName: req.body.fullName,
    email: req.body.email,
    avatar: req.body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: req.body.role || 'staff',
    permissions: req.body.permissions || ['products.view', 'orders.view'],
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };
  await db.addUser(u);
  res.status(201).json({ success: true, data: sanitizeUser(u) });
});
apiRouter.put('/users/:id', async (req: Request, res: Response) => {
  const updates: any = { ...req.body };
  if (typeof updates.password === 'string' && updates.password.trim()) {
    updates.passwordHash = bcrypt.hashSync(updates.password.trim(), 10);
  }
  delete updates.password;
  const updated = await db.updateUser(req.params.id, updates);
  res.json({ success: true, data: updated ? sanitizeUser(updated) : null });
});
apiRouter.delete('/users/:id', async (req: Request, res: Response) => {
  await db.deleteUser(req.params.id);
  res.json({ success: true, message: 'Đã xóa người dùng.' });
});
apiRouter.get('/roles', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getRoles() });
});
apiRouter.post('/roles', async (req: Request, res: Response) => {
  const r: Role = {
    id: `role-${Date.now()}`,
    name: req.body.name || 'Vai trò mới',
    description: req.body.description || '',
    permissions: req.body.permissions || []
  };
  await db.addRole(r);
  res.status(201).json({ success: true, data: r });
});
apiRouter.put('/roles/:id', async (req: Request, res: Response) => {
  const updated = await db.updateRole(req.params.id, req.body);
  res.json({ success: true, data: updated });
});
apiRouter.delete('/roles/:id', async (req: Request, res: Response) => {
  await db.deleteRole(req.params.id);
  res.json({ success: true, message: 'Đã xóa vai trò.' });
});

/* =========================================================================
   PRICE LIST EXPORT (CSV / JSON / PDF)
   ========================================================================= */
apiRouter.get('/export/price-list.csv', (_req: Request, res: Response) => {
  const products = db.getProducts();
  const categories = db.getCategories();
  const brands = db.getBrands();

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || id;

  // UTF-8 BOM so Excel opens Vietnamese characters without garbled text
  let csv = '\uFEFF';
  csv += 'STT,Mã SKU,Tên sản phẩm,Danh mục,Thương hiệu,Tình trạng,Giá niêm yết (VNĐ),Giá bán (VNĐ),Tồn kho,Đường dẫn\n';

  products.forEach((p, idx) => {
    const conditionText = p.condition === 'new' ? 'Mới 100%' : p.condition === 'like_new' ? 'Like New 99%' : 'Đã qua sử dụng';
    const row = [
      idx + 1,
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${getCatName(p.categoryId)}"`,
      `"${getBrandName(p.brandId)}"`,
      `"${conditionText}"`,
      p.originalPrice,
      p.salePrice,
      p.stock,
      `"https://gpsoft.vn/products/${p.slug}"`
    ];
    csv += row.join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Bang_Gia_GPSOFT_2025.csv"');
  res.send(csv);
});
