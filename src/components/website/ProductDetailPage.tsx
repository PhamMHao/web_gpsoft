import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Product, ProductVariant, ReviewStats } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { setSeo, seoDefaults, productJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung + trang 404 dùng chung khi slug sai.
import { PRODUCTS_CRUMB, crumbJsonLd, crumbLabel, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { ProductCard } from './ProductCard.tsx';
import { CustomerReviews } from './CustomerReviews.tsx';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  Zap,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Star
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProductId,
    categories,
    brands,
    seoSettings,
    addToCart,
    setIsCartOpen,
    setIsCheckoutOpen,
    showToast,
    openQuoteModal
  } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedProductId) return;

    async function loadProductDetail() {
      try {
        setLoading(true);
        const res = await api.getProduct(selectedProductId!);
        if (res.success && res.data) {
          const p = res.data;
          setProduct(p);
          setActiveImage(p.thumbnail);
          if (p.variants && p.variants.length > 0) {
            setSelectedVariant(p.variants[0]);
          } else {
            setSelectedVariant(null);
          }
          setQuantity(1);

          // Load related products from same category
          const relRes = await api.getProducts({ category: p.categoryId });
          if (relRes.success) {
            setRelatedProducts(relRes.data.filter(item => item.id !== p.id).slice(0, 4));
          }

          // P0.2 — cần điểm đánh giá để sinh `AggregateRating` trong JSON-LD (Google Rich Results).
          const reviewsRes = await api.getProductReviews(p.id);
          if (reviewsRes.success) setReviewStats(reviewsRes.stats || null);
        }
      } catch (e) {
        console.error('Failed to load product detail:', e);
      } finally {
        setLoading(false);
      }
    }

    loadProductDetail();
  }, [selectedProductId]);

  // P0.2 — SEO sản phẩm: ưu tiên metaTitle/metaDesc admin nhập trong CMS, kèm Product + Breadcrumb JSON-LD.
  // Khai báo TRƯỚC các `return` sớm bên dưới để không vi phạm thứ tự hook.
  const seoCategory = product ? categories.find(c => c.id === product.categoryId) : undefined;
  const seoBrand = product ? brands.find(b => b.id === product.brandId) : undefined;
  const productPath = product
    ? pathFor('product-detail', { productSlug: product.slug || product.id })
    : ROUTES.products;
  const categoryPath = seoCategory
    ? pathFor('products', { categorySlug: seoCategory.slug || seoCategory.id })
    : ROUTES.products;

  // P2.8 — dải breadcrumb dùng cho cả UI và JSON-LD (không có mắt nào khi chưa tải xong sản phẩm).
  const productCrumbs = crumbTrail(
    PRODUCTS_CRUMB,
    seoCategory ? { name: seoCategory.name, path: categoryPath } : null,
    product ? { name: crumbLabel(product.name, product.name), path: productPath } : null
  );

  useEffect(() => {
    if (!product) return;

    const fallback = seoDefaults(seoSettings);
    setSeo({
      title: product.seo?.metaTitle || `${product.name} — Giá Tốt, Chính Hãng`,
      description: product.seo?.metaDesc || product.shortDesc,
      canonicalPath: productPath,
      ogImage: product.thumbnail || fallback.ogImage,
      ogType: 'product',
      jsonLd: [
        productJsonLd(product, {
          brandName: seoBrand?.name,
          categoryName: seoCategory?.name,
          stats: reviewStats
        }),
        crumbJsonLd(productCrumbs)
      ]
    });
  }, [product, productPath, seoCategory, seoBrand, reviewStats, seoSettings]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (!product) {
    // P2.8 — slug sai ⇒ dùng chung trang 404 (noindex + gợi ý tìm kiếm) thay vì khối báo lỗi tự chế.
    return (
      <NotFoundPage
        title="Không tìm thấy sản phẩm này"
        message="Sản phẩm bạn mở có thể đã ngừng kinh doanh hoặc đường dẫn không đúng. Hãy thử tìm lại bằng từ khóa bên dưới."
      />
    );
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.salePrice;
  const currentOriginalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const discountPercent =
    currentOriginalPrice > currentPrice
      ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
      : 0;

  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast('Đã sao chép liên kết sản phẩm vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAddToCart = () => {
    addToCart(product, selectedVariant || undefined, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedVariant || undefined, quantity);
    setIsCheckoutOpen(true);
  };

  // Build gallery array
  const galleryImages = [
    product.thumbnail,
    ...(product.gallery || []).filter(img => img !== product.thumbnail)
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumb items={productCrumbs} />

      {/* Main Product Info (2 columns: Gallery vs Options) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Gallery (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Large Preview */}
          <div className="aspect-square bg-[#FFFDF0] rounded-3xl border border-slate-200/80 overflow-hidden p-6 flex items-center justify-center relative shadow-xs">
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-contain"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-xs">
                Tiết kiệm {discountPercent}%
              </span>
            )}
            <span
              className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-lg text-white ${
                product.condition === 'new'
                  ? 'bg-[#1C86EE]'
                  : product.condition === 'like_new'
                  ? 'bg-emerald-600'
                  : 'bg-amber-600'
              }`}
            >
              {product.condition === 'new'
                ? 'Mới 100% Seal'
                : product.condition === 'like_new'
                ? 'Like New 99%'
                : 'Đã qua sử dụng'}
            </span>
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-2xl border-2 p-1 bg-[#FFFDF0] shrink-0 cursor-pointer overflow-hidden transition-all ${
                    activeImage === img ? 'border-[#1C86EE] scale-105' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5 font-medium">
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>Chia sẻ sản phẩm:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#1C86EE]/10 text-[#1C86EE] hover:bg-[#1C86EE]/20 font-semibold cursor-pointer"
              >
                Facebook
              </a>
              <button
                onClick={() => openQuoteModal(product.name)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold cursor-pointer"
              >
                Báo giá sỉ
              </button>
            </div>
          </div>
        </div>

        {/* Right: Info & Purchase Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>SKU: {selectedVariant ? selectedVariant.sku : product.sku}</span>
              <span>•</span>
              <span className="text-[#1C86EE] font-bold">Chính hãng</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
            
            {/* Rating summary shortcut */}
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('customer-reviews-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 font-bold text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-slate-800 font-extrabold">4.9</span>
                <span className="text-slate-500 underline font-normal">(Xem đánh giá khách hàng)</span>
              </button>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Còn hàng sẵn tại Showroom</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 font-normal leading-relaxed">
              {product.shortDesc}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="bg-[#FFFEEA]/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#1C86EE]">
                {formatVnd(currentPrice)}
              </span>
              {currentOriginalPrice > currentPrice && (
                <span className="text-sm sm:text-base text-slate-400 line-through">
                  {formatVnd(currentOriginalPrice)}
                </span>
              )}
              {currentOriginalPrice > currentPrice && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  Tiết kiệm {formatVnd(currentOriginalPrice - currentPrice)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs pt-1">
              {currentStock > 0 ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sẵn hàng tại Showroom (Còn {currentStock} máy)</span>
                </span>
              ) : (
                <span className="text-rose-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Tạm hết hàng - Liên hệ đặt trước</span>
                </span>
              )}
            </div>
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Tùy chọn phiên bản / Cấu hình:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                      selectedVariant?.id === v.id
                        ? 'border-[#1C86EE] bg-[#1C86EE]/5 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{v.title}</div>
                    <div className="text-xs text-[#1C86EE] font-bold mt-1">
                      {formatVnd(v.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & CTA Action Buttons */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-700">Số lượng:</label>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-sm font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-bold text-slate-900 min-w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-sm font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#1C86EE]/10 hover:bg-[#1C86EE]/20 text-[#1C86EE] font-bold text-sm border border-[#1C86EE]/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Thêm Vào Giỏ Hàng</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={currentStock <= 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-sm shadow-lg shadow-[#1C86EE]/25 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Mua Ngay Giao 2H</span>
              </button>
            </div>
          </div>

          {/* Promotion Perks Box */}
          <div className="bg-[#FFFEEA] border border-[#1C86EE]/20 rounded-2xl p-4 space-y-2.5 text-xs text-slate-800">
            <div className="font-bold flex items-center gap-1.5 text-[#1C86EE]">
              <Sparkles className="w-4 h-4 text-[#1C86EE] fill-[#1C86EE]/20" />
              <span>Ưu Đãi Đặc Quyền Khi Mua Tại GPSOFT:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-700 font-medium">
              <li>Tặng gói bảo hành VIP 1 đổi 1 trong 30 ngày đầu tiên.</li>
              <li>Trợ giá thu cũ đổi mới lên tới 2.000.000đ khi lên đời máy.</li>
              <li>Miễn phí dán cường lực cao cấp & vệ sinh máy trọn đời.</li>
              <li>Hỗ trợ trả góp lãi suất 0% qua thẻ tín dụng hoặc CCCD.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Specs & Description Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-6 border-t border-slate-100">
        {/* Specs Table (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Thông Số Kỹ Thuật Chi Tiết</span>
          </h2>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
            {product.specs && Object.entries(product.specs).length > 0 ? (
              Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="grid grid-cols-3 p-3 hover:bg-slate-50/80">
                  <span className="text-slate-500 font-medium">{key}</span>
                  <span className="col-span-2 text-slate-900 font-semibold">{val}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-slate-400">Đang cập nhật thông số...</div>
            )}
          </div>
        </div>

        {/* Product Rich Description (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Mô Tả & Trải Nghiệm Thực Tế
          </h2>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 whitespace-pre-line">
            {product.description || product.shortDesc}
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <CustomerReviews product={product} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Sản Phẩm Cùng Phân Khúc / Liên Quan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
