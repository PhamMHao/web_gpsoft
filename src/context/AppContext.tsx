import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Product,
  ProductVariant,
  CartItem,
  Category,
  Brand,
  SystemSettings,
  SeoSettings,
  User,
  AppliedCoupon,
  ShippingMethod
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { getAuthToken, setAuthToken } from '../services/api.ts';
import { ROUTES, pathFor, parsePath } from '../utils/url.ts';
// P2.8 — URL trang tìm kiếm `/tim-kiem?q=...` dựng ở một chỗ (`searchPath`) để Navbar/404 dùng chung.
import { searchPath } from '../utils/search.ts';
import { genId } from '../utils/id.ts';
// P1.8 — công thức phí ship phản chiếu `server/shipping.ts` (server vẫn chốt khi tạo đơn).
import { computeShippingFee } from '../utils/commerce.ts';

export type WebsitePage =
  | 'home'
  | 'products'
  | 'product-detail'
  /** P2.1 — trang danh mục riêng `/danh-muc/:slug` (2 cấp: danh mục cha + con). */
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
  /** P2.2 — module "Phần mềm chấm công" `/phan-mem-cham-cong` (tab con qua `?tab=`). */
  | 'attendance'
  /** P2.3 — dịch vụ "Thiết kế website" `/thiet-ke-website`. */
  | 'web-design'
  /** P2.8 — trang kết quả tìm kiếm toàn site `/tim-kiem?q=` (từ khóa nằm ở query string). */
  | 'search'
  /**
   * P2.10 — form đăng nhập CMS `/login-admin` (cửa vào khu quản trị): URL ẩn, không Navbar/Footer,
   * không có link/menu/sitemap nào trỏ tới.
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

/** P1.3 — `QuoteModal` dùng chung 2 ngữ cảnh: xin báo giá doanh nghiệp hoặc gửi yêu cầu bảo hành. */
export type QuoteRequestType = 'quote' | 'warranty';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Navigation & View Mode
  viewMode: 'website' | 'cms';
  setViewMode: (mode: 'website' | 'cms') => void;
  cmsTab: CmsTab;
  setCmsTab: (tab: CmsTab) => void;
  websitePage: WebsitePage;
  setWebsitePage: (page: WebsitePage) => void;
  /**
   * P2.8 — URL hiện tại có khớp route nào không (lấy từ `parsePath().matched`).
   * `false` ⇒ `App.tsx` render `NotFoundPage` thay vì trang chủ (không còn "404 giả").
   */
  routeMatched: boolean;

  // Selected entities for detail views
  selectedProductId: string | null;
  selectedPostSlug: string | null;
  selectedServiceSlug: string | null;
  selectedPageSlug: string | null;
  activeCategoryFilter: string | null;
  setActiveCategoryFilter: (catId: string | null) => void;
  /** P2.1 — slug danh mục **đúng như trên URL** (`/danh-muc/:slug`) để trang danh mục tự tra cứu. */
  activeCategorySlug: string | null;
  /** P2.1 — slug thương hiệu đang xem (`/thuong-hieu/:slug`), `null` khi ở trang khác. */
  activeBrandSlug: string | null;
  setActiveBrandSlug: (brandSlug: string | null) => void;
  /** P1.5 — mã link chia sẻ đang xem ở `/bao-gia/:code` (null khi ở trang khác). */
  selectedQuoteCode: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Navigation helpers
  navigateToProduct: (idOrSlug: string) => void;
  navigateToService: (slug: string) => void;
  navigateToPost: (slug: string) => void;
  navigateToPage: (slug: string) => void;
  navigateToCategory: (catId: string) => void;
  /** P2.1 — mở trang thương hiệu `/thuong-hieu/<slug>` (URL thật, share/F5 được). */
  navigateToBrand: (brandSlug: string) => void;
  /** P2.2 — mở module phần mềm `/phan-mem-cham-cong?tab=<id>` (tab nằm trên URL). */
  navigateToAttendanceTab: (tabId: string) => void;
  /** P1.5 — mở Link Báo Giá `/bao-gia/<mã>` (URL thật, share được). */
  navigateToQuote: (code: string) => void;
  /** P2.8 — mở trang tìm kiếm `/tim-kiem?q=<từ khóa>` (dùng cho Navbar + trang 404). */
  navigateToSearch: (keyword: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Commerce — mã giảm giá (P1.7) + phương thức vận chuyển (P1.8)
  /** Mã giảm giá ĐANG áp cho giỏ (server đã validate); `null` = chưa áp mã nào. */
  coupon: AppliedCoupon | null;
  /** Thông báo lỗi gần nhất khi nhập mã (rỗng khi mã hợp lệ). */
  couponError: string;
  applyingCoupon: boolean;
  /** Gọi `POST /coupons/validate` cho giỏ hiện tại; `true` = áp được mã. */
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  /** Tiền giảm của mã đang áp (0 khi không có mã). */
  discount: number;
  shippingMethods: ShippingMethod[];
  shippingMethodId: string | null;
  setShippingMethodId: (id: string) => void;
  shippingFee: number;
  /** Tổng phải trả = `cartTotal - discount + shippingFee` (khớp cách server tính ở `POST /orders`). */
  orderTotal: number;

  // Modals
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isTrackingOpen: boolean;
  setIsTrackingOpen: (open: boolean) => void;
  trackingOrderCode: string;
  setTrackingOrderCode: (code: string) => void;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: (open: boolean) => void;
  quoteProductPrefill: string;
  /** `'warranty'` ⇒ modal đổi tiêu đề/nhãn nút và gửi lead `type: 'warranty'`. */
  quoteRequestType: QuoteRequestType;
  openQuoteModal: (productName?: string, requestType?: QuoteRequestType) => void;

  // Comparison (ThinkPro style)
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;

  // Global cached data
  settings: SystemSettings | null;
  /** P0.2 — cấu hình SEO mặc định của CMS (SeoView) cho website. */
  seoSettings: SeoSettings | null;
  categories: Category[];
  brands: Brand[];
  currentUser: User | null;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshSettings: () => Promise<void>;
  refreshCategoriesAndBrands: () => Promise<void>;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // P0.1 — Khởi tạo state từ URL hiện tại: F5 / dán link vào tab mới render đúng ngay lần đầu,
  // không bị nháy về trang chủ trước khi effect đồng bộ chạy.
  const [initialRoute] = useState(() => parsePath(location.pathname));

  const [viewMode, setViewModeState] = useState<'website' | 'cms'>('website');
  /**
   * P2.10 — Giao diện mặc định **luôn** là website: `viewMode` khởi tạo `'website'` và **không** đọc từ
   * URL, nên mở `http://<domain>/` (hay bất kỳ trang công khai nào) không bao giờ rơi vào CMS. Cửa vào
   * CMS duy nhất là URL ẩn `/login-admin` (`ROUTES.adminLogin`) — website không còn nút chuyển chế độ.
   *
   * Riêng khi **rời** CMS mà URL vẫn là `/login-admin` thì phải đưa về trang chủ; nếu không `App` sẽ
   * render lại form đăng nhập ngay sau khi bấm "Xem website"/đăng xuất (URL là nguồn sự thật của trang).
   */
  const setViewMode = (mode: 'website' | 'cms') => {
    setViewModeState(mode);
    if (mode !== 'website') return;
    // Kiểm tra **sau** lượt cập nhật hiện tại (microtask), không đọc URL ngay: `PagesView` gọi
    // `navigateToPage(slug)` rồi `setViewMode('website')` liền nhau ⇒ đọc ngay sẽ thấy URL cũ
    // (`/login-admin`) và ghi đè mất URL trang xem trước vừa điều hướng.
    queueMicrotask(() => {
      if (parsePath(window.location.pathname).page === 'admin-login') {
        navigate(ROUTES.home, { replace: true });
      }
    });
  };
  const [cmsTab, setCmsTab] = useState<CmsTab>('dashboard');
  const [websitePage, setWebsitePageState] = useState<WebsitePage>(initialRoute.page);
  // P2.8 — URL sai (không khớp route) ⇒ render trang 404. Lấy ngay từ URL lúc khởi tạo để F5 vào
  // link rác vẫn thấy 404 ngay lần render đầu (không nháy qua trang chủ).
  const [routeMatched, setRouteMatched] = useState<boolean>(initialRoute.matched);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialRoute.productSlug ?? null
  );
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(
    initialRoute.postSlug ?? null
  );
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string | null>(
    initialRoute.serviceSlug ?? null
  );
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(
    initialRoute.pageSlug ?? null
  );
  const [activeCategoryFilter, setActiveCategoryFilterState] = useState<string | null>(
    initialRoute.categorySlug ?? null
  );
  /** P2.1 — slug danh mục / thương hiệu **nguyên văn trên URL** (dùng cho `CategoryPage`/`BrandPage`). */
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(
    initialRoute.categorySlug ?? null
  );
  const [activeBrandSlug, setActiveBrandSlug] = useState<string | null>(
    initialRoute.brandSlug ?? null
  );
  /** P1.5 — mã link chia sẻ báo giá lấy từ URL `/bao-gia/:code`. */
  const [selectedQuoteCode, setSelectedQuoteCode] = useState<string | null>(
    initialRoute.quoteCode ?? null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state persisted in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('gpsoft_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  // P1.7/P1.8 — mã giảm giá + phương thức vận chuyển dùng chung cho CartDrawer & CheckoutModal.
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingOrderCode, setTrackingOrderCode] = useState('');
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteProductPrefill, setQuoteProductPrefill] = useState('');
  const [quoteRequestType, setQuoteRequestType] = useState<QuoteRequestType>('quote');

  // Comparison state
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const addToCompare = (product: Product) => {
    if (compareList.some(p => p.id === product.id)) {
      showToast(`"${product.name}" đã có trong danh sách so sánh`, 'info');
      setIsCompareModalOpen(true);
      return;
    }
    if (compareList.length >= 4) {
      showToast('Chỉ có thể so sánh tối đa 4 sản phẩm cùng lúc. Vui lòng bỏ bớt.', 'error');
      setIsCompareModalOpen(true);
      return;
    }
    setCompareList(prev => [...prev, product]);
    showToast(`Đã thêm "${product.name}" vào so sánh!`, 'success');
  };

  const removeFromCompare = (productId: string) => {
    setCompareList(prev => prev.filter(p => p.id !== productId));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const isInCompare = (productId: string) => {
    return compareList.some(p => p.id === productId);
  };

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [seoSettings, setSeoSettings] = useState<SeoSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gpsoft_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  // Initial load of settings, categories, brands, me
  useEffect(() => {
    refreshSettings();
    refreshCategoriesAndBrands();

    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api.getMe()
      .then(res => {
        if (res.success && res.user) setCurrentUser(res.user);
        else setAuthToken(null);
      })
      .catch(() => setAuthToken(null))
      .finally(() => setAuthLoading(false));
  }, []);

  /**
   * P2.10 — `/login-admin` là **cửa vào CMS duy nhất**. Nếu đã có phiên (F5 / mở lại tab ở URL này),
   * vào thẳng bảng điều khiển; chưa có phiên thì `App` render form đăng nhập.
   */
  useEffect(() => {
    if (currentUser && websitePage === 'admin-login') setViewModeState('cms');
  }, [currentUser, websitePage]);

  const login = async (username: string, password: string) => {
    try {
      const res = await api.login(username, password);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        // P2.10 — đăng nhập thành công từ `/login-admin` ⇒ mở CMS (URL giữ nguyên nên F5 vẫn ở CMS).
        setViewModeState('cms');
        return { success: true };
      }
      return { success: false, message: 'Đăng nhập thất bại.' };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Đăng nhập thất bại.' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setViewMode('website');
  };

  const refreshSettings = async () => {
    try {
      const [settingsRes, seoRes] = await Promise.all([api.getSettings(), api.getSeo()]);
      if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
      if (seoRes.success && seoRes.data) setSeoSettings(seoRes.data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const refreshCategoriesAndBrands = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        api.getCategories(),
        api.getBrands()
      ]);
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
      if (brandsRes.success && brandsRes.data) setBrands(brandsRes.data);
    } catch (e) {
      console.error('Failed to load categories/brands:', e);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = genId('toast');
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Cart operations
  const addToCart = (product: Product, variant?: ProductVariant, quantity = 1) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item =>
        item.product.id === product.id &&
        ((!variant && !item.variant) || (variant && item.variant?.id === variant.id))
      );

      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        return [...prev, { product, variant, quantity }];
      }
    });

    const title = variant ? `${product.name} (${variant.title})` : product.name;
    showToast(`Đã thêm "${title}" vào giỏ hàng!`, 'success');
  };

  const updateCartQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        const matches = item.product.id === productId &&
          ((!variantId && !item.variant) || (variantId && item.variant?.id === variantId));
        if (matches) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev =>
      prev.filter(item =>
        !(item.product.id === productId &&
          ((!variantId && !item.variant) || (variantId && item.variant?.id === variantId)))
      )
    );
    showToast('Đã xóa sản phẩm khỏi giỏ hàng.', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const price = item.variant ? item.variant.price : item.product.salePrice;
    return sum + price * item.quantity;
  }, 0);

  /* -----------------------------------------------------------------------
     P1.7/P1.8 — mã giảm giá + phương thức vận chuyển
     -----------------------------------------------------------------------
     - Mã giảm giá LUÔN được server validate (`POST /coupons/validate`); khi giỏ đổi
       (thêm/bớt/xoá món) effect bên dưới tự validate LẠI để `discount` không bị lệch.
     - Phí ship tính theo công thức của `server/shipping.ts`; khi tạo đơn server chốt lại
       từ `shippingMethodId` nên con số hiển thị và con số lưu vào đơn luôn khớp.
     ----------------------------------------------------------------------- */
  /** Payload `items` gửi lên API coupon (đủ để server xét phạm vi theo danh mục/sản phẩm). */
  const couponItems = (items: CartItem[]) =>
    items.map(item => ({
      productId: item.product.id,
      categoryId: item.product.categoryId,
      quantity: item.quantity,
      price: item.variant ? item.variant.price : item.product.salePrice
    }));

  const refreshShippingMethods = async () => {
    try {
      const res = await api.getShippingMethods();
      if (res.success && Array.isArray(res.data)) setShippingMethods(res.data);
    } catch (e) {
      console.error('Failed to load shipping methods:', e);
    }
  };

  const applyCoupon = async (rawCode: string): Promise<boolean> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Vui lòng nhập mã ưu đãi.');
      return false;
    }
    try {
      setApplyingCoupon(true);
      const res = await api.validateCoupon({ code, subtotal: cartTotal, items: couponItems(cart) });
      if (res.valid) {
        setCoupon({ code, name: code, discount: res.discount });
        setCouponError('');
        showToast(res.message, 'success');
        return true;
      }
      setCoupon(null);
      setCouponError(res.message);
      showToast(res.message, 'error');
      return false;
    } catch (e: any) {
      setCoupon(null);
      setCouponError(e?.message || 'Không kiểm tra được mã ưu đãi. Vui lòng thử lại.');
      return false;
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponError('');
  };

  const selectedShippingMethod =
    shippingMethods.find(m => m.id === shippingMethodId) || shippingMethods[0];
  const discount = coupon ? coupon.discount : 0;
  const shippingFee = cartCount === 0 ? 0 : computeShippingFee(selectedShippingMethod, cartTotal);
  const orderTotal = Math.max(0, cartTotal - discount + shippingFee);

  // Giỏ đổi (thêm/bớt/xoá món hoặc đổi tổng tiền) ⇒ validate LẠI mã đang áp; giỏ rỗng hoặc
  // xuống dưới `minOrder` ⇒ mã tự bị gỡ kèm thông báo của server.
  useEffect(() => {
    if (!coupon) return;
    let cancelled = false;
    const code = coupon.code;
    (async () => {
      try {
        const res = await api.validateCoupon({ code, subtotal: cartTotal, items: couponItems(cart) });
        if (cancelled) return;
        if (res.valid) {
          setCoupon({ code, name: code, discount: res.discount });
          setCouponError('');
        } else {
          setCoupon(null);
          setCouponError(res.message);
        }
      } catch {
        // Mất mạng: giữ mã đang áp — server vẫn validate lại lần cuối khi tạo đơn.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Chỉ chạy lại khi mã hoặc giá trị/length của giỏ đổi (không phụ thuộc `coupon.discount`).
  }, [cartTotal, cart.length, coupon?.code]);

  useEffect(() => {
    void refreshShippingMethods();
  }, []);

  // Chưa chọn / phương thức đã bị tắt (hoặc bị xoá ở CMS) ⇒ về phương thức đầu tiên đang bật.
  useEffect(() => {
    if (shippingMethods.length === 0) return;
    if (!shippingMethodId || !shippingMethods.some(m => m.id === shippingMethodId)) {
      setShippingMethodId(shippingMethods[0].id);
    }
  }, [shippingMethods, shippingMethodId]);

  // P0.1 — Đồng bộ URL → state. URL là nguồn sự thật duy nhất cho trang đang xem:
  // F5, Back/Forward, dán link vào tab mới hay mở link chia sẻ đều render đúng trang.
  useEffect(() => {
    const {
      page,
      matched: urlMatched,
      productSlug,
      postSlug,
      serviceSlug,
      pageSlug,
      categorySlug,
      brandSlug,
      quoteCode
    } = parsePath(location.pathname);

    setWebsitePageState(page);
    // P2.8 — URL sai ⇒ cờ này tắt và `App.tsx` render `NotFoundPage`.
    setRouteMatched(urlMatched);
    setSelectedProductId(productSlug ?? null);
    setSelectedPostSlug(postSlug ?? null);
    setSelectedServiceSlug(serviceSlug ?? null);
    setSelectedPageSlug(pageSlug ?? null);
    setSelectedQuoteCode(quoteCode ?? null);
    // P2.1 — giữ nguyên slug trên URL cho trang danh mục / thương hiệu.
    setActiveCategorySlug(categorySlug ?? null);
    setActiveBrandSlug(brandSlug ?? null);

    // URL danh mục dùng slug (SEO) nhưng API lọc theo `categoryId` ⇒ quy đổi sang id.
    if (categorySlug) {
      const matched = categories.find(c => c.slug === categorySlug || c.id === categorySlug);
      setActiveCategoryFilterState(matched ? matched.id : categorySlug);
    } else {
      setActiveCategoryFilterState(null);
    }
  }, [location.pathname, categories]);

  // Navigation helpers
  /** Điều hướng trang tĩnh (không param) — luôn cập nhật URL thật. */
  const setWebsitePage = (page: WebsitePage) => {
    setWebsitePageState(page);
    const target = pathFor(page);
    if (location.pathname !== target) {
      navigate(target);
    }
  };

  /**
   * Đổi bộ lọc danh mục **và** đồng bộ URL (URL là nguồn sự thật):
   * - có danh mục ⇒ `/danh-muc/<slug>`
   * - bỏ danh mục ⇒ về `/san-pham`
   * Query `?q=` hiện có được giữ nguyên để không mất từ khóa đang tìm.
   */
  const setActiveCategoryFilter = (catIdOrSlug: string | null) => {
    const value = catIdOrSlug ? catIdOrSlug : null;
    setActiveCategoryFilterState(value);

    const matched = value ? categories.find(c => c.id === value || c.slug === value) : undefined;
    const target = `${pathFor('products', {
      categorySlug: matched ? matched.slug : value || undefined
    })}${location.search}`;

    if (`${location.pathname}${location.search}` !== target) {
      navigate(target);
    }
  };

  const navigateToProduct = (idOrSlug: string) => {
    setSelectedProductId(idOrSlug);
    setWebsitePageState('product-detail');
    navigate(pathFor('product-detail', { productSlug: idOrSlug }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToService = (slug: string) => {
    setSelectedServiceSlug(slug);
    setWebsitePageState('services');
    navigate(pathFor('services', { serviceSlug: slug }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPost = (slug: string) => {
    setSelectedPostSlug(slug);
    setWebsitePageState('news');
    navigate(pathFor('news', { postSlug: slug }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPage = (slug: string) => {
    setSelectedPageSlug(slug);
    setWebsitePageState('page');
    navigate(pathFor('page', { pageSlug: slug }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategory = (catIdOrSlug: string) => {
    setActiveCategoryFilter(catIdOrSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** P2.1 — mở trang thương hiệu `/thuong-hieu/<slug>`; slug không dùng được thì về danh sách SP. */
  const navigateToBrand = (brandSlug: string) => {
    const value = (brandSlug || '').trim();
    setActiveBrandSlug(value || null);
    navigate(value ? pathFor('brand', { brandSlug: value }) : ROUTES.products);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** P2.2 — chuyển tab module phần mềm bằng URL (`?tab=`), F5/chia sẻ link vẫn đúng tab. */
  const navigateToAttendanceTab = (tabId: string) => {
    const params = new URLSearchParams({ tab: tabId });
    navigate(`${ROUTES.attendance}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openQuoteModal = (productName?: string, requestType: QuoteRequestType = 'quote') => {
    setQuoteProductPrefill(productName || '');
    setQuoteRequestType(requestType);
    setIsQuoteModalOpen(true);
  };

  /** P1.5 — mở `/bao-gia/<mã>`; state lấy lại từ URL qua effect đồng bộ ở trên. */
  const navigateToQuote = (code: string) => {
    setSelectedQuoteCode(code);
    setWebsitePageState('quote-detail');
    navigate(pathFor('quote-detail', { quoteCode: code }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * P2.8 — mở trang kết quả tìm kiếm `/tim-kiem?q=<từ khóa>`.
   * Từ khóa nằm ở **query string** nên `parsePath` (pathname) vẫn trả `page: 'search'`; component
   * `SearchPage` đọc `?q=` bằng `useSearchParams` ⇒ Back/Forward + F5 + share link đều đúng.
   */
  const navigateToSearch = (keyword: string) => {
    setWebsitePageState('search');
    navigate(searchPath(keyword));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        cmsTab,
        setCmsTab,
        websitePage,
        setWebsitePage,
        routeMatched,
        selectedProductId,
        selectedPostSlug,
        selectedServiceSlug,
        selectedPageSlug,
        activeCategoryFilter,
        setActiveCategoryFilter,
        activeCategorySlug,
        activeBrandSlug,
        setActiveBrandSlug,
        selectedQuoteCode,
        searchQuery,
        setSearchQuery,
        navigateToProduct,
        navigateToService,
        navigateToPost,
        navigateToPage,
        navigateToCategory,
        navigateToBrand,
        navigateToAttendanceTab,
        navigateToQuote,
        navigateToSearch,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        // P1.7/P1.8 — mã giảm giá + phí vận chuyển dùng chung cho CartDrawer & CheckoutModal.
        coupon,
        couponError,
        applyingCoupon,
        applyCoupon,
        removeCoupon,
        discount,
        shippingMethods,
        shippingMethodId,
        setShippingMethodId,
        shippingFee,
        orderTotal,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isTrackingOpen,
        setIsTrackingOpen,
        trackingOrderCode,
        setTrackingOrderCode,
        isQuoteModalOpen,
        setIsQuoteModalOpen,
        quoteProductPrefill,
        quoteRequestType,
        openQuoteModal,
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        isCompareModalOpen,
        setIsCompareModalOpen,
        settings,
        seoSettings,
        categories,
        brands,
        currentUser,
        authLoading,
        login,
        logout,
        refreshSettings,
        refreshCategoriesAndBrands,
        toasts,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
