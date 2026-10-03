import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Product, ProductCondition } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { setSeo, seoDefaults } from '../../utils/seo.ts';
// P2.8 — dải breadcrumb dùng chung: cùng mảng dữ liệu cho UI và `BreadcrumbList` JSON-LD.
import { PRODUCTS_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { ProductCard } from './ProductCard.tsx';
import {
  Filter,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Layers
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const {
    categories,
    brands,
    seoSettings,
    activeCategoryFilter,
    setActiveCategoryFilter
  } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // P0.1 — `?q=` trên URL là nguồn sự thật của từ khóa (link share từ Navbar "Xem tất cả kết quả"
  // và nút Back/Forward đều giữ đúng kết quả tìm kiếm).
  const [searchParams, setSearchParams] = useSearchParams();
  const keywordFromUrl = searchParams.get('q') || '';
  const navigate = useNavigate();

  // Filters state
  const [searchTerm, setSearchTerm] = useState(keywordFromUrl);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setSearchTerm(keywordFromUrl);
  }, [keywordFromUrl]);

  useEffect(() => {
    loadProducts();
  }, [activeCategoryFilter, selectedBrand, selectedCondition, priceRange, sortBy, keywordFromUrl]);

  // P0.2 — SEO: title theo danh mục/từ khóa; canonical bỏ query string (tránh nội dung trùng lặp
  // giữa `/san-pham?q=...`, `?brand=...` và `/san-pham`).
  const activeCategory = categories.find(c => c.id === activeCategoryFilter);
  const productsSeo = seoDefaults(seoSettings, 'Sản Phẩm Công Nghệ Chính Hãng');
  const productsCanonical = activeCategory
    ? pathFor('products', { categorySlug: activeCategory.slug || activeCategory.id })
    : ROUTES.products;
  const productsTitle = activeCategory
    ? `${activeCategory.name} — Giá Tốt, Chính Hãng`
    : keywordFromUrl
    ? `Kết quả tìm kiếm "${keywordFromUrl}" — GPSOFT`
    : productsSeo.title;

  // P2.8 — dải breadcrumb dùng cho cả UI và JSON-LD (mắt danh mục chỉ có khi đang lọc danh mục).
  const productsCrumbs = crumbTrail(
    PRODUCTS_CRUMB,
    activeCategory ? { name: activeCategory.name, path: productsCanonical } : null
  );

  useEffect(() => {
    setSeo({
      title: productsTitle,
      description: activeCategory?.description || productsSeo.description,
      canonicalPath: productsCanonical,
      ogImage: productsSeo.ogImage,
      // Trang kết quả tìm kiếm nội bộ không nên vào index (Google khuyến nghị).
      robots: keywordFromUrl ? 'noindex,follow' : undefined,
      jsonLd: [crumbJsonLd(productsCrumbs)]
    });
  }, [
    // `productsCrumbs` được suy ra từ `productsCanonical` + `activeCategory` ⇒ chỉ cần các phụ thuộc gốc.
    productsTitle,
    productsCanonical,
    activeCategory,
    productsSeo.description,
    productsSeo.ogImage,
    keywordFromUrl
  ]);
  const loadProducts = async () => {
    try {
      setLoading(true);
      const keyword = (keywordFromUrl || searchTerm).trim();
      const params: Record<string, string | number | boolean | undefined> = {
        category: activeCategoryFilter || undefined,
        brand: selectedBrand || undefined,
        condition: selectedCondition || undefined,
        sort: sortBy === 'price_asc' ? 'price-asc' : sortBy === 'price_desc' ? 'price-desc' : sortBy === 'views' ? 'views' : undefined
      };

      if (priceRange === 'under_5m') {
        params.maxPrice = 5000000;
      } else if (priceRange === '5m_15m') {
        params.minPrice = 5000000;
        params.maxPrice = 15000000;
      } else if (priceRange === '15m_30m') {
        params.minPrice = 15000000;
        params.maxPrice = 30000000;
      } else if (priceRange === 'above_30m') {
        params.minPrice = 30000000;
      }

      if (keyword) {
        params.search = keyword;
      }

      const res = await api.getProducts(params);
      if (res.success) {
        setProducts(res.data);
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchTerm.trim();
    if (keyword === keywordFromUrl) {
      // URL không đổi ⇒ effect đồng bộ không chạy lại, nạp trực tiếp
      loadProducts();
      return;
    }
    setSearchParams(keyword ? { q: keyword } : {});
  };

  const clearAllFilters = () => {
    // URL là nguồn sự thật: về `/san-pham` (bỏ danh mục + query) ⇒ effect đồng bộ trong
    // AppContext tự reset `activeCategoryFilter`; các filter cục bộ reset trực tiếp.
    navigate(ROUTES.products);
    setSelectedBrand('');
    setSelectedCondition('');
    setPriceRange('all');
    setSearchTerm('');
    setSortBy('newest');
  };

  const activeCategoryName = categories.find(c => c.id === activeCategoryFilter)?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <Breadcrumb items={productsCrumbs} variant="header" className="mb-1" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeCategoryName || 'Tất Cả Sản Phẩm Công Nghệ'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tìm thấy <strong className="text-[#1C86EE]">{products.length}</strong> sản phẩm chính hãng với bảo hành 24 tháng
          </p>
        </div>

        {/* Sort & Mobile filter trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#1C86EE]" />
            <span>Bộ Lọc</span>
          </button>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
            <span>Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-hidden font-bold text-[#1C86EE] cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
              <option value="views">Xem nhiều nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Products */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters Desktop */}
        <div className={`space-y-6 md:block ${mobileFilterOpen ? 'block' : 'hidden'}`}>
          {/* Clear Filters Button */}
          {(activeCategoryFilter || selectedBrand || selectedCondition || priceRange !== 'all' || searchTerm) && (
            <button
              onClick={clearAllFilters}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa tất cả bộ lọc</span>
            </button>
          )}

          {/* Search Input in Sidebar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tìm theo từ khóa
            </h4>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Nhập tên máy, SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </form>
          </div>

          {/* Categories Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Danh Mục</span>
              <Layers className="w-3.5 h-3.5 text-[#1C86EE]" />
            </h4>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setActiveCategoryFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  !activeCategoryFilter ? 'bg-[#1C86EE]/15 text-[#1C86EE] font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Tất cả danh mục</span>
                {!activeCategoryFilter && <Check className="w-3.5 h-3.5" />}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    activeCategoryFilter === cat.id
                      ? 'bg-[#1C86EE]/15 text-[#1C86EE] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {activeCategoryFilter === cat.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Filter (Mới/Cũ) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tình Trạng Thiết Bị
            </h4>
            <div className="space-y-1 text-xs">
              {[
                { id: '', label: 'Tất cả tình trạng' },
                { id: 'new', label: 'Mới 100% Nguyên Seal' },
                { id: 'like_new', label: 'Like New 99% Siêu Lướt' },
                { id: 'used', label: 'Đã qua sử dụng 98%' }
              ].map(cond => (
                <button
                  key={cond.id}
                  onClick={() => setSelectedCondition(cond.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    selectedCondition === cond.id
                      ? 'bg-[#1C86EE]/15 text-[#1C86EE] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cond.label}</span>
                  {selectedCondition === cond.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Brands Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Thương Hiệu
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedBrand('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  !selectedBrand
                    ? 'bg-[#1C86EE] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Tất cả
              </button>
              {brands.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    selectedBrand === b.id
                      ? 'bg-[#1C86EE] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Khoảng Giá (VNĐ)
            </h4>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'Tất cả mức giá' },
                { id: 'under_5m', label: 'Dưới 5 triệu' },
                { id: '5m_15m', label: 'Từ 5 - 15 triệu' },
                { id: '15m_30m', label: 'Từ 15 - 30 triệu' },
                { id: 'above_30m', label: 'Trên 30 triệu' }
              ].map(pr => (
                <button
                  key={pr.id}
                  onClick={() => setPriceRange(pr.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    priceRange === pr.id
                      ? 'bg-[#1C86EE]/15 text-[#1C86EE] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{pr.label}</span>
                  {priceRange === pr.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="md:col-span-3 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Đang tải danh sách sản phẩm...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Không tìm thấy sản phẩm phù hợp
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Vui lòng thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm của bạn.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] cursor-pointer transition-colors shadow-md shadow-[#1C86EE]/20"
              >
                Xóa bộ lọc & Xem tất cả
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
