import {
  Product,
  ProductReview,
  ReviewStats,
  Category,
  Brand,
  Order,
  Customer,
  Lead,
  Warranty,
  WarrantyLookupItem,
  PriceQuote,
  QuoteLink,
  Coupon,
  CouponView,
  CouponValidation,
  ShippingMethod,
  CampaignView,
  ActiveCampaignView,
  Post,
  PostCategory,
  Service,
  Banner,
  Menu,
  Page,
  MediaFile,
  SystemSettings,
  SeoSettings,
  User,
  Role,
  DashboardStats
} from '../types/index.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'gpsoft_token';

/* =========================================================================
   PHÂN TRANG (P0.4)
   =========================================================================
   Các endpoint list (`/products`, `/orders`, `/customers`, `/leads`, `/posts`)
   nhận `?page=&limit=` (limit mặc định 20, tối đa 100) và trả kèm `meta`.
   KHÔNG truyền `page`/`limit` ⇒ server trả nguyên danh sách, không có `meta`
   (tương thích ngược với mọi call site hiện tại).
   ========================================================================= */

/** Tham số phân trang chuẩn của API. */
export interface PageParams {
  page?: number;
  limit?: number;
}

/** Metadata phân trang — chỉ có khi request gửi `page`/`limit`. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response chung của các endpoint list. */
export interface ListResponse<T> {
  success: boolean;
  /** Số phần tử có trong `data` (độ dài 1 trang). */
  count: number;
  /** Tổng số phần tử sau khi filter (bằng `data.length` khi không phân trang). */
  total: number;
  meta?: PaginationMeta;
  data: T[];
}

/** Ghép `page`/`limit` vào query string (bỏ qua giá trị ≤ 0 hoặc rỗng). */
function appendPageParams(query: URLSearchParams, page?: PageParams): void {
  if (page?.page && page.page > 0) query.append('page', String(Math.floor(page.page)));
  if (page?.limit && page.limit > 0) query.append('limit', String(Math.floor(page.limit)));
}

/** Response của `GET /quote-links/:code` (công khai) — 401 vẫn là kết quả hợp lệ. */
export interface QuoteLinkResponse {
  success: boolean;
  data?: { link: QuoteLink; quote: PriceQuote };
  /** `true` ⇒ link có mật khẩu và client chưa nhập đúng (server trả 401). */
  requiresPassword?: boolean;
  message?: string;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: async (username: string, password?: string) => {
    return fetchJson<{ success: boolean; user: User; token: string }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  getMe: async () => {
    return fetchJson<{ success: boolean; user: User }>(`${API_BASE}/auth/me`);
  },

  // Dashboard
  getDashboardStats: async () => {
    return fetchJson<DashboardStats>(`${API_BASE}/dashboard/stats`);
  },

  // Products
  getProducts: async (params?: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.append(k, String(v));
      });
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Product>>(`${API_BASE}/products${qStr}`);
  },
  getProduct: async (idOrSlug: string) => {
    return fetchJson<{ success: boolean; data: Product }>(`${API_BASE}/products/${idOrSlug}`);
  },
  createProduct: async (productData: Partial<Product>) => {
    return fetchJson<{ success: boolean; data: Product }>(`${API_BASE}/products`, {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },
  updateProduct: async (id: string, productData: Partial<Product>) => {
    return fetchJson<{ success: boolean; data: Product }>(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },
  deleteProduct: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/products/${id}`, {
      method: 'DELETE'
    });
  },

  // Product Reviews
  getProductReviews: async (productId: string) => {
    return fetchJson<{ success: boolean; data: ProductReview[]; stats: ReviewStats }>(
      `${API_BASE}/products/${productId}/reviews`
    );
  },
  submitProductReview: async (
    productId: string,
    reviewData: {
      userName: string;
      userEmail?: string;
      userPhone?: string;
      rating: number;
      title?: string;
      comment: string;
      variantTitle?: string;
      tags?: string[];
    }
  ) => {
    return fetchJson<{ success: boolean; message: string; data: ProductReview }>(
      `${API_BASE}/products/${productId}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(reviewData)
      }
    );
  },
  upvoteReview: async (reviewId: string) => {
    return fetchJson<{ success: boolean; data: ProductReview }>(
      `${API_BASE}/reviews/${reviewId}/helpful`,
      {
        method: 'POST'
      }
    );
  },
  deleteReview: async (reviewId: string) => {
    return fetchJson<{ success: boolean; message: string }>(
      `${API_BASE}/reviews/${reviewId}`,
      {
        method: 'DELETE'
      }
    );
  },

  // Orders
  getOrders: async (params?: { status?: string; paymentStatus?: string; search?: string } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.search) query.append('search', params.search);
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Order>>(`${API_BASE}/orders${qStr}`);
  },
  getOrder: async (codeOrId: string) => {
    return fetchJson<{ success: boolean; data: Order }>(`${API_BASE}/orders/${codeOrId}`);
  },
  createOrder: async (orderData: any) => {
    return fetchJson<{ success: boolean; data: Order }>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
  updateOrder: async (id: string, updates: Partial<Order>) => {
    return fetchJson<{ success: boolean; data: Order }>(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  deleteOrder: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/orders/${id}`, {
      method: 'DELETE'
    });
  },

  // Customers
  getCustomers: async (search?: string, page?: PageParams) => {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    appendPageParams(query, page);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Customer>>(`${API_BASE}/customers${qStr}`);
  },
  updateCustomer: async (id: string, updates: Partial<Customer>) => {
    return fetchJson<{ success: boolean; data: Customer }>(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  deleteCustomer: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/customers/${id}`, {
      method: 'DELETE'
    });
  },

  // Leads
  getLeads: async (params?: { type?: string; status?: string; source?: string } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    // P2.3 — lọc theo nguồn lead (`web-design`, `website`...).
    if (params?.source) query.append('source', params.source);
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Lead>>(`${API_BASE}/leads${qStr}`);
  },
  submitLead: async (leadData: Partial<Lead>) => {
    return fetchJson<{ success: boolean; data: Lead; message: string }>(`${API_BASE}/leads`, {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  },
  updateLead: async (id: string, updates: Partial<Lead>) => {
    return fetchJson<{ success: boolean; data: Lead }>(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  deleteLead: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/leads/${id}`, {
      method: 'DELETE'
    });
  },

  // Warranties (P1.1)
  getWarranties: async (params?: { status?: string; q?: string; expired?: boolean | string } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.q) query.append('q', params.q);
    if (params?.expired !== undefined && params.expired !== '') query.append('expired', String(params.expired));
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Warranty>>(`${API_BASE}/warranties${qStr}`);
  },
  /** Tra cứu công khai (không cần token) theo SĐT / serial / mã phiếu. */
  lookupWarranty: async (q: string) => {
    return fetchJson<{ success: boolean; count: number; data: WarrantyLookupItem[] }>(
      `${API_BASE}/warranties/lookup?q=${encodeURIComponent(q)}`
    );
  },
  createWarranty: async (data: Partial<Warranty>) => {
    return fetchJson<{ success: boolean; data: Warranty; message: string }>(`${API_BASE}/warranties`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateWarranty: async (id: string, updates: Partial<Warranty>) => {
    return fetchJson<{ success: boolean; data: Warranty; message: string }>(`${API_BASE}/warranties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  deleteWarranty: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/warranties/${id}`, {
      method: 'DELETE'
    });
  },

  // P1.4 — Báo giá (price_quotes)
  getPriceQuotes: async (
    params?: { status?: string; q?: string; expired?: boolean | string } & PageParams
  ) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.q) query.append('q', params.q);
    if (params?.expired !== undefined && params.expired !== '') {
      query.append('expired', String(params.expired));
    }
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<PriceQuote>>(`${API_BASE}/price-quotes${qStr}`);
  },
  /** Chi tiết theo `id` hoặc mã `BG-YYYY-XXXX`, kèm danh sách link chia sẻ (P1.5). */
  getPriceQuote: async (idOrCode: string) => {
    return fetchJson<{ success: boolean; data: PriceQuote; links: QuoteLink[] }>(
      `${API_BASE}/price-quotes/${encodeURIComponent(idOrCode)}`
    );
  },
  createPriceQuote: async (data: Partial<PriceQuote>) => {
    return fetchJson<{ success: boolean; data: PriceQuote; message: string }>(`${API_BASE}/price-quotes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePriceQuote: async (id: string, data: Partial<PriceQuote>) => {
    return fetchJson<{ success: boolean; data: PriceQuote; message: string }>(
      `${API_BASE}/price-quotes/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },
  deletePriceQuote: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/price-quotes/${id}`, {
      method: 'DELETE'
    });
  },
  /**
   * Tải CSV báo giá (kèm `Authorization`) rồi lưu file. Route này cần token nên KHÔNG dùng
   * được `<a href>` như bảng giá sản phẩm.
   */
  downloadPriceQuoteCsv: async (params?: { status?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.q) query.append('q', params.q);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/price-quotes/export.csv${qStr}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errorBody.message || `Xuất CSV thất bại (${res.status}).`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Bao_Gia_GPSOFT.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  // P1.5 — Link chia sẻ báo giá (quote_links)
  getQuoteLinks: async (quoteId?: string) => {
    const qStr = quoteId ? `?quoteId=${encodeURIComponent(quoteId)}` : '';
    return fetchJson<{ success: boolean; count: number; total: number; data: QuoteLink[] }>(
      `${API_BASE}/quote-links${qStr}`
    );
  },
  createQuoteLink: async (data: { quoteId: string; password?: string; expiresInDays?: number; expiresAt?: string; code?: string }) => {
    return fetchJson<{ success: boolean; data: QuoteLink; message: string }>(`${API_BASE}/quote-links`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateQuoteLink: async (id: string, data: Partial<QuoteLink>) => {
    return fetchJson<{ success: boolean; data: QuoteLink; message: string }>(`${API_BASE}/quote-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteQuoteLink: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/quote-links/${id}`, {
      method: 'DELETE'
    });
  },
  /**
   * CÔNG KHAI — mở báo giá qua link chia sẻ. Không dùng `fetchJson` vì 401 (`requiresPassword`)
   * là kết quả **hợp lệ** cần đọc body để trang `/bao-gia/:code` hiện form nhập mật khẩu.
   */
  openQuoteLink: async (code: string, pass?: string): Promise<QuoteLinkResponse> => {
    const qStr = pass ? `?pass=${encodeURIComponent(pass)}` : '';
    const res = await fetch(`${API_BASE}/quote-links/${encodeURIComponent(code)}${qStr}`);
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return { success: false, requiresPassword: true, message: body.message };
    }
    if (!res.ok) {
      return { success: false, message: body.message || `Không mở được link báo giá (${res.status}).` };
    }
    return body as QuoteLinkResponse;
  },

  /* -----------------------------------------------------------------------
     P1.7 — Mã giảm giá (coupons). `validateCoupon` là route CÔNG KHAI nên
     khách chưa đăng nhập vẫn kiểm được mã trước khi đặt hàng.
     ----------------------------------------------------------------------- */
  getCoupons: async (params?: { q?: string; state?: string; applyTo?: string } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.state && params.state !== 'all') query.append('state', params.state);
    if (params?.applyTo && params.applyTo !== 'all') query.append('applyTo', params.applyTo);
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<CouponView>>(`${API_BASE}/coupons${qStr}`);
  },
  createCoupon: async (data: Partial<Coupon>) => {
    return fetchJson<{ success: boolean; data: Coupon; message: string }>(`${API_BASE}/coupons`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCoupon: async (id: string, data: Partial<Coupon>) => {
    return fetchJson<{ success: boolean; data: Coupon; message: string }>(`${API_BASE}/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCoupon: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/coupons/${id}`, {
      method: 'DELETE'
    });
  },
  /** Kiểm mã giảm giá cho giỏ hiện tại (route công khai, server tính tiền giảm). */
  validateCoupon: async (data: {
    code: string;
    subtotal?: number;
    items?: Array<{ productId: string; categoryId?: string; quantity: number; price: number }>;
  }) => {
    return fetchJson<CouponValidation>(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /* -----------------------------------------------------------------------
     P1.8 — Phương thức vận chuyển (shipping_methods). Website chỉ nhận phương
     thức đang bật; CMS truyền `all: true` để thấy cả phương thức đang tắt.
     ----------------------------------------------------------------------- */
  getShippingMethods: async (params?: { q?: string; all?: boolean } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.all) query.append('all', '1');
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<ShippingMethod>>(`${API_BASE}/shipping-methods${qStr}`);
  },
  createShippingMethod: async (data: Partial<ShippingMethod>) => {
    return fetchJson<{ success: boolean; data: ShippingMethod; message: string }>(
      `${API_BASE}/shipping-methods`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  },
  updateShippingMethod: async (id: string, data: Partial<ShippingMethod>) => {
    return fetchJson<{ success: boolean; data: ShippingMethod; message: string }>(
      `${API_BASE}/shipping-methods/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },
  deleteShippingMethod: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/shipping-methods/${id}`, {
      method: 'DELETE'
    });
  },

  /* --------------------------------------------------------------------
     P1.9 — Chiến dịch / flash sale (campaigns). `getActiveCampaigns` là route
     CÔNG KHAI (trang chủ đọc để vẽ khối flash sale + đếm ngược theo `endAt`).
     -------------------------------------------------------------------- */
  getCampaigns: async (params?: { q?: string; type?: string; state?: string } & PageParams) => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.state && params.state !== 'all') query.append('state', params.state);
    appendPageParams(query, params);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<CampaignView>>(`${API_BASE}/campaigns${qStr}`);
  },
  /** Campaign đang chạy + sản phẩm của campaign (đã giải ở server). */
  getActiveCampaigns: async () => {
    return fetchJson<{ success: boolean; count: number; total: number; data: ActiveCampaignView[] }>(
      `${API_BASE}/campaigns/active`
    );
  },
  createCampaign: async (data: Partial<CampaignView>) => {
    return fetchJson<{ success: boolean; data: CampaignView; message: string }>(`${API_BASE}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCampaign: async (id: string, data: Partial<CampaignView>) => {
    return fetchJson<{ success: boolean; data: CampaignView; message: string }>(
      `${API_BASE}/campaigns/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },
  deleteCampaign: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE'
    });
  },

  getCategories: async () => {
    return fetchJson<{ success: boolean; data: Category[] }>(`${API_BASE}/categories`);
  },
  createCategory: async (data: Partial<Category>) => {
    return fetchJson<{ success: boolean; data: Category }>(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCategory: async (id: string, data: Partial<Category>) => {
    return fetchJson<{ success: boolean; data: Category }>(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCategory: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Brands
  getBrands: async () => {
    return fetchJson<{ success: boolean; data: Brand[] }>(`${API_BASE}/brands`);
  },
  createBrand: async (data: Partial<Brand>) => {
    return fetchJson<{ success: boolean; data: Brand }>(`${API_BASE}/brands`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateBrand: async (id: string, data: Partial<Brand>) => {
    return fetchJson<{ success: boolean; data: Brand }>(`${API_BASE}/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteBrand: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/brands/${id}`, {
      method: 'DELETE'
    });
  },

  // Posts
  getPosts: async (category?: string, search?: string, page?: PageParams) => {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (search) query.append('search', search);
    appendPageParams(query, page);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<ListResponse<Post>>(`${API_BASE}/posts${qStr}`);
  },
  getPost: async (idOrSlug: string) => {
    return fetchJson<{ success: boolean; data: Post }>(`${API_BASE}/posts/${idOrSlug}`);
  },
  createPost: async (data: Partial<Post>) => {
    return fetchJson<{ success: boolean; data: Post }>(`${API_BASE}/posts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePost: async (id: string, data: Partial<Post>) => {
    return fetchJson<{ success: boolean; data: Post }>(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deletePost: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/posts/${id}`, {
      method: 'DELETE'
    });
  },
  getPostCategories: async () => {
    return fetchJson<{ success: boolean; data: PostCategory[] }>(`${API_BASE}/post-categories`);
  },
  createPostCategory: async (data: Partial<PostCategory>) => {
    return fetchJson<{ success: boolean; data: PostCategory }>(`${API_BASE}/post-categories`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePostCategory: async (id: string, data: Partial<PostCategory>) => {
    return fetchJson<{ success: boolean; data: PostCategory }>(`${API_BASE}/post-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deletePostCategory: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/post-categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Services
  getServices: async () => {
    return fetchJson<{ success: boolean; data: Service[] }>(`${API_BASE}/services`);
  },
  getService: async (slug: string) => {
    return fetchJson<{ success: boolean; data: Service }>(`${API_BASE}/services/${slug}`);
  },
  createService: async (data: Partial<Service>) => {
    return fetchJson<{ success: boolean; data: Service }>(`${API_BASE}/services`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateService: async (id: string, data: Partial<Service>) => {
    return fetchJson<{ success: boolean; data: Service }>(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteService: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/services/${id}`, {
      method: 'DELETE'
    });
  },

  // Banners
  getBanners: async () => {
    return fetchJson<{ success: boolean; data: Banner[] }>(`${API_BASE}/banners`);
  },
  createBanner: async (data: Partial<Banner>) => {
    return fetchJson<{ success: boolean; data: Banner }>(`${API_BASE}/banners`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateBanner: async (id: string, data: Partial<Banner>) => {
    return fetchJson<{ success: boolean; data: Banner }>(`${API_BASE}/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteBanner: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/banners/${id}`, {
      method: 'DELETE'
    });
  },

  // Pages
  getPages: async () => {
    return fetchJson<{ success: boolean; data: Page[] }>(`${API_BASE}/pages`);
  },
  getPage: async (slug: string) => {
    return fetchJson<{ success: boolean; data: Page }>(`${API_BASE}/pages/${slug}`);
  },
  createPage: async (data: Partial<Page>) => {
    return fetchJson<{ success: boolean; data: Page }>(`${API_BASE}/pages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePage: async (id: string, data: Partial<Page>) => {
    return fetchJson<{ success: boolean; data: Page }>(`${API_BASE}/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deletePage: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/pages/${id}`, {
      method: 'DELETE'
    });
  },

  // Menus
  getMenus: async () => {
    return fetchJson<{ success: boolean; data: Menu[] }>(`${API_BASE}/menus`);
  },
  createMenu: async (data: any) => {
    return fetchJson<{ success: boolean; data: Menu }>(`${API_BASE}/menus`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateMenu: async (id: string, data: Partial<Menu>) => {
    return fetchJson<{ success: boolean; data: Menu }>(`${API_BASE}/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteMenu: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/menus/${id}`, {
      method: 'DELETE'
    });
  },

  // Media
  getMedia: async () => {
    return fetchJson<{ success: boolean; data: MediaFile[] }>(`${API_BASE}/media`);
  },
  uploadMedia: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });
    if (!res.ok) throw new Error('Tải file thất bại');
    return res.json() as Promise<{ success: boolean; data: MediaFile }>;
  },
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });
    if (!res.ok) throw new Error('Tải file thất bại');
    return res.json() as Promise<{ success: boolean; data: MediaFile }>;
  },
  deleteMedia: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/media/${id}`, {
      method: 'DELETE'
    });
  },
  createMedia: async (data: Partial<MediaFile>) => {
    return fetchJson<{ success: boolean; data: MediaFile }>(`${API_BASE}/media`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Settings & SEO
  getSettings: async () => {
    return fetchJson<{ success: boolean; data: SystemSettings }>(`${API_BASE}/settings`);
  },
  updateSettings: async (settings: Partial<SystemSettings>) => {
    return fetchJson<{ success: boolean; data: SystemSettings; message: string }>(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },
  getSeoSettings: async () => {
    return fetchJson<{ success: boolean; data: SeoSettings }>(`${API_BASE}/seo`);
  },
  getSeo: async () => {
    return fetchJson<{ success: boolean; data: SeoSettings }>(`${API_BASE}/seo`);
  },
  updateSeoSettings: async (seo: Partial<SeoSettings>) => {
    return fetchJson<{ success: boolean; data: SeoSettings; message: string }>(`${API_BASE}/seo`, {
      method: 'PUT',
      body: JSON.stringify(seo)
    });
  },
  updateSeo: async (seo: Partial<SeoSettings>) => {
    return fetchJson<{ success: boolean; data: SeoSettings; message: string }>(`${API_BASE}/seo`, {
      method: 'PUT',
      body: JSON.stringify(seo)
    });
  },

  // Users & Roles
  getUsers: async () => {
    return fetchJson<{ success: boolean; data: User[] }>(`${API_BASE}/users`);
  },
  createUser: async (user: Partial<User>) => {
    return fetchJson<{ success: boolean; data: User }>(`${API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },
  updateUser: async (id: string, user: Partial<User>) => {
    return fetchJson<{ success: boolean; data: User }>(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  },
  deleteUser: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/users/${id}`, {
      method: 'DELETE'
    });
  },
  getRoles: async () => {
    return fetchJson<{ success: boolean; data: Role[] }>(`${API_BASE}/roles`);
  },
  createRole: async (data: Partial<Role>) => {
    return fetchJson<{ success: boolean; data: Role }>(`${API_BASE}/roles`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateRole: async (id: string, data: Partial<Role>) => {
    return fetchJson<{ success: boolean; data: Role }>(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteRole: async (id: string) => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/roles/${id}`, {
      method: 'DELETE'
    });
  }
};
