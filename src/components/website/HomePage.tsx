import React, { useState, useEffect } from 'react';
import { HeroSlider } from './HeroSlider.tsx';
import { ProductCard } from './ProductCard.tsx';
import { SmartLaptopFinder } from './SmartLaptopFinder.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { ActiveCampaignView, Product, Post, Service } from '../../types/index.ts';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Truck,
  Wrench,
  Clock,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle2,
  Calendar,
  Eye,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Camera,
  Monitor,
  MapPin,
  PhoneCall,
  Check,
  ShoppingCart
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';
import { ROUTES } from '../../utils/url.ts';
import { setSeo, seoDefaults, organizationJsonLd, websiteJsonLd } from '../../utils/seo.ts';
// P1.9 — đếm ngược flash sale đọc từ campaign trong CMS (không còn hardcode `timeLeft`).
import { campaignCountdown } from '../../utils/commerce.ts';

export const HomePage: React.FC = () => {
  const {
    categories,
    settings,
    seoSettings,
    navigateToCategory,
    setWebsitePage,
    navigateToProduct,
    navigateToPost,
    navigateToService,
    openQuoteModal,
    addToCart,
    addToCompare
  } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'new' | 'like_new'>('all');
  const [services, setServices] = useState<Service[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // P1.9 — Flash sale đọc từ CMS (`GET /campaigns/active`); `now` cập nhật mỗi giây để đếm ngược.
  const [campaign, setCampaign] = useState<ActiveCampaignView | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!campaign?.endAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [campaign?.endAt]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodRes, srvRes, postsRes, campRes] = await Promise.all([
          api.getProducts(),
          api.getServices(),
          api.getPosts(),
          // Campaign là dữ liệu phụ: lỗi API không được làm trắng trang chủ.
          api.getActiveCampaigns().catch(() => null)
        ]);
        if (prodRes.success) setProducts(prodRes.data);
        if (srvRes.success) setServices(srvRes.data);
        if (postsRes.success) setLatestPosts(postsRes.data.slice(0, 3));
        if (campRes?.success && campRes.data.length > 0) setCampaign(campRes.data[0]);
      } catch (e) {
        console.error('Home data load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // P0.2 — SEO trang chủ: title/description lấy từ CMS (SeoView) + JSON-LD Organization & WebSite.
  const homeSeo = seoDefaults(seoSettings, 'GPSOFT Store — Thiết Bị Công Nghệ Chính Hãng');

  useEffect(() => {
    setSeo({
      title: homeSeo.title,
      description: homeSeo.description,
      canonicalPath: ROUTES.home,
      ogImage: homeSeo.ogImage,
      jsonLd: [organizationJsonLd(settings), websiteJsonLd()]
    });
  }, [homeSeo.title, homeSeo.description, homeSeo.ogImage, settings]);

  // Filter products based on tab
  const filteredProducts = products.filter(p => {
    if (activeTab === 'featured') return p.isFeatured;
    if (activeTab === 'new') return p.isNew || p.condition === 'new';
    if (activeTab === 'like_new') return p.condition === 'like_new';
    return true;
  });

  // P1.9 — đếm ngược lấy từ `endAt` của campaign; `ended = true` ⇒ khối tự ẩn.
  const countdown = campaignCountdown(campaign?.endAt, now);

  // Sản phẩm của khối flash sale: ưu tiên danh sách server đã giải cho campaign đang chạy;
  // không có campaign (hoặc campaign chưa gắn sản phẩm) ⇒ lấy sản phẩm đang giảm nhiều nhất.
  const flashSaleProducts =
    campaign && campaign.products.length > 0
      ? campaign.products
      : [...products]
          .filter(p => p.originalPrice > p.salePrice)
          .sort((a, b) => (b.originalPrice - b.salePrice) - (a.originalPrice - a.salePrice))
          .slice(0, 4);

  /** Chỉ hiện khối khi còn deal và campaign chưa hết `endAt` (campaign không có `endAt` = chạy vô hạn). */
  const showFlashSale = flashSaleProducts.length > 0 && !countdown.ended;

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Smartphone': return <Smartphone className="w-5 h-5 text-[#1C86EE]" />;
      case 'Laptop': return <Laptop className="w-5 h-5 text-[#1C86EE]" />;
      case 'Tablet': return <Tablet className="w-5 h-5 text-[#5CACEE]" />;
      case 'Headphones': return <Headphones className="w-5 h-5 text-[#5CACEE]" />;
      case 'Camera': return <Camera className="w-5 h-5 text-[#1C86EE]" />;
      case 'Monitor': return <Monitor className="w-5 h-5 text-[#5CACEE]" />;
      default: return <Layers className="w-5 h-5 text-[#1C86EE]" />;
    }
  };

  return (
    <div className="space-y-16 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. Hero Slider Banner */}
      <section>
        <HeroSlider />
      </section>

      {/* 2. Key Value Pillars (ThinkPro Signature Commitments) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-[#1C86EE]/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">Chính Hãng 100%</div>
            <div className="text-[11px] text-slate-500">Đầy đủ VAT & CO/CQ kiểm định</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-[#5CACEE]/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-[#5CACEE]/15 text-[#1C86EE] flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">Đổi Mới 15 Ngày</div>
            <div className="text-[11px] text-slate-500">Lỗi phần cứng đổi máy mới ngay</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-[#1C86EE]/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">Giao Hỏa Tốc 2H</div>
            <div className="text-[11px] text-slate-500">Nội thành Hà Nội & TP.HCM</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-[#5CACEE]/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-[#5CACEE]/15 text-[#1C86EE] flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">ThinkPro Care VIP</div>
            <div className="text-[11px] text-slate-500">Vệ sinh & tra keo miễn phí trọn đời</div>
          </div>
        </div>
      </section>

      {/* 3. Flash Deal — campaign đọc từ CMS (P1.9); hết `endAt` ⇒ khối tự ẩn */}
      {showFlashSale && (
        <section className="bg-gradient-to-r from-slate-900 via-[#1C86EE]/20 to-slate-900 rounded-3xl p-6 sm:p-8 border border-[#1C86EE]/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                    {campaign ? campaign.name : 'GIỜ VÀNG SĂN DEAL'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase animate-pulse">
                    {campaign?.discountPercent ? `-${campaign.discountPercent}%` : 'Hot Sale'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Số lượng deal có hạn, kết thúc khi hết thời gian đếm ngược
                </p>
              </div>
            </div>

            {/* Countdown Clock — số giờ/phút/giây tính từ `endAt` của campaign (P1.9) */}
            <div className="flex items-center gap-2 self-start sm:self-center bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-700">
              <Clock className="w-4 h-4 text-[#5CACEE]" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Kết thúc sau:</span>
              <div className="flex items-center gap-1 font-mono font-black text-sm text-white">
                {countdown.days > 0 && (
                  <>
                    <span className="px-2 h-7 rounded-lg bg-slate-800 flex items-center justify-center shadow-xs">
                      {countdown.days} ngày
                    </span>
                    <span className="text-[#5CACEE]">·</span>
                  </>
                )}
                <span className="w-7 h-7 rounded-lg bg-[#1C86EE] flex items-center justify-center shadow-xs">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[#5CACEE]">:</span>
                <span className="w-7 h-7 rounded-lg bg-[#1C86EE] flex items-center justify-center shadow-xs">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[#5CACEE]">:</span>
                <span className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center shadow-xs">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* CTA của campaign (nếu CMS có khai `ctaText`) */}
            {campaign?.ctaText && (
              <a
                href={campaign.ctaUrl || ROUTES.products}
                className="inline-flex items-center gap-1.5 self-start sm:self-center px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-[#5CACEE] hover:text-white transition-colors"
              >
                <span>{campaign.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Flash Deal Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashSaleProducts.map((prod, idx) => {
              const hasDiscount = prod.originalPrice > prod.salePrice;
              const discount = hasDiscount
                ? Math.round(((prod.originalPrice - prod.salePrice) / prod.originalPrice) * 100)
                : campaign?.discountPercent || 0;
              const soldCount = 10 + (idx * 3);
              const totalStock = 20;
              const soldPercent = Math.min(100, Math.round((soldCount / totalStock) * 100));

              return (
                <div
                  key={prod.id}
                  onClick={() => navigateToProduct(prod.slug || prod.id)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-[#1C86EE] hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-square rounded-xl bg-slate-50/80 p-2 overflow-hidden flex items-center justify-center">
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-xs shadow-xs z-10">
                        -{discount}%
                      </span>
                      <img
                        src={prod.thumbnail}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#1C86EE] uppercase">{prod.sku}</span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-[#1C86EE] transition-colors mt-0.5">
                        {prod.name}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 space-y-2.5">
                    <div>
                      <div className="text-base font-black text-rose-600">
                        {formatVnd(prod.salePrice)}
                      </div>
                      {hasDiscount && (
                        <div className="text-xs text-slate-400 line-through">
                          {formatVnd(prod.originalPrice)}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${soldPercent}%` }}
                          className="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1 text-rose-600">
                          <Flame className="w-3 h-3 fill-rose-600" />
                          <span>Đã bán {soldCount}/{totalStock}</span>
                        </span>
                        <span>Sắp cháy hàng</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Smart Laptop & Gear Finder (ThinkPro Interactive Widget) */}
      <section>
        <SmartLaptopFinder products={products} />
      </section>

      {/* 5. Featured Categories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Danh Mục Công Nghệ Nổi Bật
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Khám phá các thiết bị công nghệ chính hãng hàng đầu tại GPSOFT
            </p>
          </div>
          <button
            onClick={() => setWebsitePage('products')}
            className="text-xs sm:text-sm font-bold text-[#1C86EE] hover:text-[#1472CE] flex items-center gap-1 cursor-pointer"
          >
            <span>Xem tất cả danh mục</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map(cat => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                onClick={() => navigateToCategory(cat.id)}
                className="group bg-white rounded-2xl border border-slate-200/80 p-4 text-center hover:border-[#1C86EE] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFFDF0] group-hover:bg-[#1C86EE]/10 flex items-center justify-center transition-colors">
                  {getCategoryIcon(cat.icon)}
                </div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1C86EE] transition-colors line-clamp-1">
                  {cat.name}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {count > 0 ? `${count} sản phẩm` : 'Xem ngay'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Products Tabbed Showcase with Compare Ability */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-[#1C86EE]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sản Phẩm Công Nghệ Tuyển Chọn
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#FFFEEA] border border-[#1C86EE]/20 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#1C86EE]'
              }`}
            >
              Tất Cả ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('featured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'featured'
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#1C86EE]'
              }`}
            >
              Bán Chạy & Hot
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#1C86EE]'
              }`}
            >
              Hàng Mới Về
            </button>
            <button
              onClick={() => setActiveTab('like_new')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'like_new'
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#1C86EE]'
              }`}
            >
              Like New 99%
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.slice(0, 8).map(prod => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => setWebsitePage('products')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#1C86EE]/5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 shadow-xs hover:border-[#1C86EE]/50 transition-all cursor-pointer"
          >
            <span>Xem thêm tất cả sản phẩm ({products.length})</span>
            <ArrowRight className="w-4 h-4 text-[#1C86EE]" />
          </button>
        </div>
      </section>


      {/* 8. Trade-in Banner & Enterprise Callout */}
      <section className="bg-gradient-to-r from-slate-950 via-[#0e2a4a] to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-[#1C86EE]/30">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 bg-[#1C86EE]/30 text-[#5CACEE] border border-[#5CACEE]/40 rounded-full text-xs font-semibold">
            Chương Trình Thu Cũ Đổi Mới Lên Đời 2025
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Lên Đời Siêu Phẩm - Trợ Giá Tới 2.000.000đ
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Định giá máy cũ nhanh chóng trong 5 phút. Không phân biệt máy mua ở đâu, kể cả máy hết bảo hành hay trầy xước. Nhận tiền mặt hoặc trừ trực tiếp vào giá máy mới.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => openQuoteModal('Thu Cũ Đổi Mới Trợ Giá 2 Triệu')}
              className="bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-[#1C86EE]/30 cursor-pointer"
            >
              Định Giá & Đặt Lịch Ngay
            </button>
            <button
              onClick={() => setWebsitePage('services')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              Xem Chi Tiết Quy Trình
            </button>
          </div>
        </div>
      </section>

      {/* 9. Technical Services Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Dịch Vụ Kỹ Thuật Chuyên Nghiệp
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Phòng Lab đạt chuẩn quốc tế, kỹ thuật viên có chứng chỉ chuyên môn
            </p>
          </div>
          <button
            onClick={() => setWebsitePage('services')}
            className="text-xs sm:text-sm font-bold text-[#1C86EE] hover:text-[#1472CE] flex items-center gap-1 cursor-pointer"
          >
            <span>Tất cả dịch vụ</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.slice(0, 3).map(srv => (
            <div
              key={srv.id}
              onClick={() => navigateToService(srv.slug)}
              className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:border-[#1C86EE]/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="aspect-video relative overflow-hidden bg-[#FFFDF0]">
                <img
                  src={srv.thumbnail}
                  alt={srv.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-[#1C86EE] shadow-xs">
                  {srv.priceRange}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1C86EE] transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {srv.shortDesc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1C86EE]">
                  <span>Quy trình 4 bước chuẩn chỉ</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Latest News & Reviews */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Tin Tức & Đánh Giá Công Nghệ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Cập nhật thông tin công nghệ mới nhất từ đội ngũ chuyên gia GPSOFT
            </p>
          </div>
          <button
            onClick={() => setWebsitePage('news')}
            className="text-xs sm:text-sm font-bold text-[#1C86EE] hover:text-[#1472CE] flex items-center gap-1 cursor-pointer"
          >
            <span>Xem thêm bài viết</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestPosts.map(post => (
            <div
              key={post.id}
              onClick={() => navigateToPost(post.slug)}
              className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:border-[#1C86EE]/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="aspect-video relative overflow-hidden bg-[#FFFDF0]">
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#1C86EE] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {post.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{post.publishedAt.split('T')[0]}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{post.viewCount} lượt xem</span>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#1C86EE] transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Tác giả: <strong className="text-slate-800">{post.author}</strong></span>
                  <span className="text-[#1C86EE] font-semibold group-hover:underline">Đọc tiếp</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Brand Partners */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Đối Tác Thương Hiệu Ủy Quyền Hàng Đầu
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cam kết 100% sản phẩm có nguồn gốc xuất xứ chính hãng và bảo hành tiêu chuẩn
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-6 items-center opacity-80 hover:opacity-100 transition-opacity">
          {['Apple', 'Lenovo', 'Dell', 'Asus', 'LG', 'Samsung', 'Logitech', 'Sony'].map(name => (
            <div
              key={name}
              className="py-3 px-2 rounded-xl bg-[#FFFDF0] text-slate-900 font-bold text-xs sm:text-sm border border-slate-200/80 flex items-center justify-center hover:bg-[#1C86EE]/10 hover:text-[#1C86EE] hover:border-[#1C86EE]/30 transition-colors cursor-pointer"
            >
              {name}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
