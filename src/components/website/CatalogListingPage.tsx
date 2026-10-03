/**
 * P2.1 — Trang **danh mục** (`/danh-muc/:slug`) & trang **thương hiệu** (`/thuong-hieu/:slug`).
 *
 * Trước P2.1 hai route này đã có trong bảng route nhưng `App.tsx` không có case tương ứng nên rơi
 * về `HomePage`; mọi bộ lọc lại sống trong state của `ProductsPage` ⇒ F5 là mất, không share link.
 *
 * Quy ước P2.1 (bám chuẩn vitinhgiaphuc.com):
 * - **URL là nguồn sự thật** của bộ lọc (`?brand=&condition=&price=&sort=&page=`) ⇒ mỗi tổ hợp lọc
 *   là một URL thật (Back/Forward, F5, copy link giữ đúng bộ lọc) và mọi chip lọc render `<a href>`
 *   crawl được. Tham số rác (`?price=abc`) được chuẩn hoá về mặc định ⇒ không sinh URL rác.
 * - Danh mục cha **tự gộp sản phẩm của danh mục con** (`filterProducts` mở rộng phạm vi theo cây)
 *   nên trang cha không rỗng khi con còn hàng.
 * - Trang danh mục: block "Danh Mục" là **điều hướng** sang trang danh mục khác (URL sạch, mất bộ
 *   lọc — canonical đúng cho SEO), block "Thương Hiệu" là **lọc trong trang** (`?brand=`).
 * - Trang thương hiệu: ngược lại — block "Danh Mục" lọc trong trang (`?category=`), bỏ chip hãng.
 * - 1 trang = `PAGE_SIZE` sản phẩm; phân trang đọc `meta` từ API (P0.4) + giữ nguyên bộ lọc trên URL.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Check,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { PaginationMeta } from '../../services/api.ts';
import type { Product } from '../../types/index.ts';
import { ProductCard } from './ProductCard.tsx';
import { ROUTES, pathFor } from '../../utils/url.ts';
import {
  CATALOG_SORT_OPTIONS,
  CONDITION_FILTERS,
  PRICE_RANGES,
  activeBrands,
  activeCategories,
  buildCategoryTree,
  buildProductQuery,
  catalogHref,
  catalogKey,
  categoryChain,
  filterToggleValue,
  findBrand,
  findCategory,
  findChildren,
  paginationItems,
  paginationRange,
  priceRangeById,
  siblingCategories,
  sortBrands
} from '../../utils/catalog.ts';
import { setSeo, seoDefaults } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: đúng một mảng `crumbs` cho cả UI và `BreadcrumbList` JSON-LD.
import { PRODUCTS_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';

/** Số sản phẩm mỗi trang (chia hết cho lưới 3 cột). */
const PAGE_SIZE = 12;

/** Loại trang danh sách: danh mục (2 cấp) hay thương hiệu. */
export type CatalogScope = 'category' | 'brand';

interface CatalogListingPageProps {
  kind: CatalogScope;
}

export const CatalogListingPage: React.FC<CatalogListingPageProps> = ({ kind }) => {
  const { categories, brands, seoSettings, activeCategorySlug, activeBrandSlug } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /** Slug lấy **nguyên văn** từ URL (context đồng bộ từ `parsePath`) — F5/Back/Forward đều đúng. */
  const urlSlug = (kind === 'category' ? activeCategorySlug : activeBrandSlug) || '';
  // Tách 2 nhánh có type riêng: `Category` có `image`, `Brand` có `logo`/`country`/`website`.
  const category = kind === 'category' ? findCategory(categories, urlSlug) : undefined;
  const brand = kind === 'brand' ? findBrand(brands, urlSlug) : undefined;
  /** Slug trên URL có tồn tại trong dữ liệu CMS không. */
  const found = Boolean(category || brand);
  const entityName = category?.name || brand?.name || '';
  const description = category?.description || brand?.description || '';
  const heroImage = category?.image || '';
  const logo = brand?.logo || '';
  /** Dữ liệu nguồn (danh mục/thương hiệu) đã tải xong ⇒ phân biệt "chưa có dữ liệu" vs "không tồn tại". */
  const sourceReady = kind === 'category' ? categories.length > 0 : brands.length > 0;

  /* -------------------------------------------------- bộ lọc lấy từ URL (đã chuẩn hoá) */
  const brandFilter = kind === 'category' ? searchParams.get('brand') || '' : '';
  const categoryFilter = kind === 'brand' ? searchParams.get('category') || '' : '';
  const condition = CONDITION_FILTERS.some(item => item.id === searchParams.get('condition'))
    ? searchParams.get('condition') || ''
    : '';
  const priceRange = priceRangeById(searchParams.get('price')).id;
  const sortOption =
    CATALOG_SORT_OPTIONS.find(option => option.id === searchParams.get('sort')) ||
    CATALOG_SORT_OPTIONS[0];
  const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));

  const hasFilters = Boolean(
    brandFilter ||
      categoryFilter ||
      condition ||
      priceRange !== PRICE_RANGES[0].id ||
      sortOption.id !== CATALOG_SORT_OPTIONS[0].id
  );

  /** Đường dẫn gốc của trang (không query) — dùng cho canonical + nút "xóa bộ lọc". */
  const basePath =
    kind === 'category'
      ? pathFor('category', { categorySlug: urlSlug })
      : pathFor('brand', { brandSlug: urlSlug });

  /**
   * Link tới chính trang này nhưng **thay** vài tham số lọc; `page` tự về 1 vì không nằm trong
   * `baseParams`. `''`/`undefined` ⇒ bị `catalogHref` loại khỏi URL (URL sạch, không `?brand=`).
   */
  const hrefWith = (overrides: Record<string, string | number | null | undefined> = {}): string =>
    catalogHref(basePath, {
      brand: kind === 'category' ? brandFilter || undefined : undefined,
      category: kind === 'brand' ? categoryFilter || undefined : undefined,
      condition: condition || undefined,
      price: priceRange !== PRICE_RANGES[0].id ? priceRange : undefined,
      sort: sortOption.id !== CATALOG_SORT_OPTIONS[0].id ? sortOption.value : undefined,
      ...overrides
    });

  /* ------------------------------------------------------------------ tải sản phẩm */
  useEffect(() => {
    const target = kind === 'category' ? findCategory(categories, urlSlug) : findBrand(brands, urlSlug);
    // Chưa tải xong danh mục/hãng, hoặc slug không tồn tại ⇒ không gọi API (hiện trạng thái riêng).
    if (!sourceReady || !target) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setFailed(false);
        const res = await api.getProducts(
          buildProductQuery({
            category: kind === 'category' ? urlSlug : categoryFilter,
            brand: kind === 'brand' ? urlSlug : brandFilter,
            condition,
            priceRange,
            sort: sortOption.id,
            page,
            limit: PAGE_SIZE
          })
        );
        if (cancelled) return;
        if (res.success) {
          setProducts(res.data);
          setMeta(res.meta ?? null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load catalog products:', error);
        setProducts([]);
        setMeta(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    sourceReady,
    kind,
    urlSlug,
    categoryFilter,
    brandFilter,
    condition,
    priceRange,
    sortOption.id,
    page,
    categories,
    brands
  ]);

  /* ------------------------------------------------------------------ SEO */
  const scopedDefaults = seoDefaults(seoSettings, 'Sản Phẩm Công Nghệ Chính Hãng');
  const chain = kind === 'category' ? categoryChain(categories, urlSlug) : [];
  const pageTitle = entityName
    ? `${entityName} — Giá Tốt, Chính Hãng | GPSOFT`
    : scopedDefaults.title;
  // P2.8 — dải breadcrumb: danh mục = chuỗi cha→con, thương hiệu = thêm mắt hãng ở cuối.
  const crumbs = crumbTrail(
    PRODUCTS_CRUMB,
    ...chain.map(item => ({
      name: item.name,
      path: pathFor('category', { categorySlug: item.slug || item.id })
    })),
    kind === 'brand' && entityName ? { name: entityName, path: basePath } : null
  );

  useEffect(() => {
    if (!entityName) return;
    setSeo({
      title: pageTitle,
      description: description || `${entityName} chính hãng tại GPSOFT — bảo hành 12–24 tháng, trả góp 0%, giao hỏa tốc 2 giờ.`,
      canonicalPath: basePath,
      ogImage: heroImage || logo || scopedDefaults.ogImage,
      ogType: 'website',
      jsonLd: [crumbJsonLd(crumbs)]
    });
    // `crumbs`/`pageTitle` được suy ra từ các giá trị bên dưới ⇒ chỉ cần các phụ thuộc gốc.
  }, [entityName, description, pageTitle, basePath, heroImage, logo, scopedDefaults.ogImage, kind, urlSlug, categories]);

  /* ------------------------------------------------------------------ dải chip điều hướng */
  /** Danh mục con trực tiếp của trang đang xem (chỉ có ở trang danh mục cha). */
  const subCategories = category ? activeCategories(findChildren(categories, category)) : [];
  /** Danh mục cùng cấp (anh/em) — nhảy ngang giữa các danh mục 2 cấp. */
  const peerCategories = category ? activeCategories(siblingCategories(categories, category.id)) : [];

  /** Thương hiệu đang bật, sắp xếp A→Z (chip lọc của trang danh mục). */
  const brandOptions = kind === 'category' ? sortBrands(activeBrands(brands)) : [];

  /** Cây danh mục 2 cấp cho sidebar: trang danh mục = điều hướng, trang hãng = lọc `?category=`. */
  const categoryTree = buildCategoryTree(categories);

  /** Dòng trong sidebar: `depth === 1` là danh mục con ⇒ thụt lề. */
  const categoryRows = categoryTree.flatMap(node => {
    const nodeSlug = node.slug || node.id;
    const nodeActive = kind === 'category'
      ? catalogKey(urlSlug) === catalogKey(nodeSlug)
      : catalogKey(categoryFilter) === catalogKey(nodeSlug);
    return [
      {
        id: node.id,
        label: node.name,
        depth: 0,
        active: nodeActive,
        href: kind === 'category'
          ? pathFor('category', { categorySlug: nodeSlug })
          : hrefWith({ category: filterToggleValue(categoryFilter, nodeSlug) })
      },
      ...node.children.map(child => {
        const childSlug = child.slug || child.id;
        return {
          id: child.id,
          label: child.name,
          depth: 1,
          active: kind === 'category'
            ? catalogKey(urlSlug) === catalogKey(childSlug)
            : catalogKey(categoryFilter) === catalogKey(childSlug),
          href: kind === 'category'
            ? pathFor('category', { categorySlug: childSlug })
            : hrefWith({ category: filterToggleValue(categoryFilter, childSlug) })
        };
      })
    ];
  });

  /** Khoảng bản ghi đang xem (`1–12 / 63`) — in dưới lưới. */
  const range = paginationRange(meta ?? undefined);
  const totalPages = meta?.totalPages ?? 1;

  /** Nhãn loại trang (dùng cho thông báo/404 inline). */
  const scopeLabel = kind === 'category' ? 'danh mục' : 'thương hiệu';

  /** Style dùng lại cho chip lọc (`<a>` thật ⇒ Google crawl + click chuột giữa được). */
  const chipClass = (active: boolean): string =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
      active
        ? 'bg-[#1C86EE] text-white border-[#1C86EE] shadow-xs'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
    }`;

  /** Cuộn lên đầu trang khi chuyển trang phân trang (Link không tự cuộn). */
  const scrollToTop = (): void => window.scrollTo({ top: 0, behavior: 'smooth' });

  const sideRowClass = (active: boolean, depth: number): string =>
    `w-full text-left rounded-xl font-medium transition-colors flex items-center justify-between gap-2 py-2 pr-3 ${
      depth === 1 ? 'pl-6' : 'pl-3'
    } ${active ? 'bg-[#1C86EE]/15 text-[#1C86EE] font-bold' : 'text-slate-600 hover:bg-slate-50'}`;

  // Chưa tải xong danh mục/thương hiệu ⇒ chưa biết slug có hợp lệ hay không.
  if (!sourceReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Đang tải {scopeLabel}...</p>
      </div>
    );
  }

  // Slug không tồn tại (hoặc bị ẩn ở CMS) ⇒ thông báo rõ ràng thay vì lưới rỗng vô nghĩa.
  // P2.8 sẽ thay bằng trang 404 chuẩn; ở đây giữ UX tốt + link thoát.
  if (!found) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Không tìm thấy {scopeLabel} “{urlSlug}”
          </h1>
          <p className="text-xs text-slate-500">
            {scopeLabel === 'danh mục' ? 'Danh mục' : 'Thương hiệu'} này không tồn tại hoặc đã ngừng kinh doanh.
            Vui lòng chọn {scopeLabel} khác bên dưới.
          </p>
          <Link
            to={ROUTES.products}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] transition-colors shadow-md shadow-[#1C86EE]/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Xem tất cả sản phẩm</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb dùng chung (khớp `BreadcrumbList` JSON-LD ở trên) */}
      <Breadcrumb items={crumbs} variant="pill" />

      {/* Hero danh mục/thương hiệu */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#FFFDF0] border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden p-2">
            {logo ? (
              <img src={logo} alt={entityName} className="w-full h-full object-contain" loading="lazy" />
            ) : heroImage ? (
              <img
                src={heroImage}
                alt={entityName}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
              />
            ) : kind === 'brand' ? (
              <Building2 className="w-8 h-8 text-[#1C86EE]" />
            ) : (
              <Layers className="w-8 h-8 text-[#1C86EE]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {kind === 'brand' ? `${entityName} Chính Hãng` : entityName}
            </h1>
            {kind === 'brand' && brand && (
              <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                {brand.country}
                {brand.website ? ` · ${brand.website}` : ''}
              </p>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-3xl">{description}</p>
            )}
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Tìm thấy <strong className="text-[#1C86EE]">{meta?.total ?? products.length}</strong> sản phẩm
              chính hãng · bảo hành 24 tháng · trả góp 0%
            </p>
          </div>
        </div>

        {/* Dải chip: danh mục con + danh mục cùng cấp (điều hướng 2 cấp không cần mở menu) */}
        {(subCategories.length > 0 || peerCategories.length > 0) && (
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 sm:px-8 py-4 space-y-3">
            {subCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1C86EE]" />
                  <span>Danh mục con</span>
                </span>
                {subCategories.map(child => (
                  <Link
                    key={child.id}
                    to={pathFor('category', { categorySlug: child.slug || child.id })}
                    className={chipClass(false)}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
            {peerCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#1C86EE]" />
                  <span>Cùng nhóm</span>
                </span>
                {peerCategories.map(peer => (
                  <Link
                    key={peer.id}
                    to={pathFor('category', { categorySlug: peer.slug || peer.id })}
                    className={chipClass(false)}
                  >
                    {peer.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar: số kết quả + bộ lọc mobile + sắp xếp */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 hidden sm:block">
          {hasFilters ? 'Kết quả sau khi lọc: ' : 'Hiển thị '}
          <strong className="text-[#1C86EE]">{meta?.total ?? products.length}</strong> sản phẩm
        </p>

        <div className="flex items-center gap-3 ml-auto">
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
              value={sortOption.id}
              onChange={event => {
                const next =
                  CATALOG_SORT_OPTIONS.find(option => option.id === event.target.value) ||
                  CATALOG_SORT_OPTIONS[0];
                // `?sort=` luôn về 1 (mặc định không lên URL) ⇒ link sạch, không trùng nội dung.
                navigate(hrefWith({ sort: next.id === CATALOG_SORT_OPTIONS[0].id ? '' : next.value }));
              }}
              className="bg-transparent focus:outline-hidden font-bold text-[#1C86EE] cursor-pointer"
            >
              {CATALOG_SORT_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sidebar bộ lọc + lưới sản phẩm */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className={`space-y-6 md:block ${mobileFilterOpen ? 'block' : 'hidden'}`}>
          {/* Xoá bộ lọc: về đúng URL gốc của trang (canonical) */}
          {hasFilters && (
            <Link
              to={basePath}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa tất cả bộ lọc</span>
            </Link>
          )}

          {/* Danh mục: trang danh mục ⇒ điều hướng 2 cấp; trang hãng ⇒ lọc `?category=` */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>{kind === 'category' ? 'Danh Mục Khác' : 'Lọc Theo Danh Mục'}</span>
              <Layers className="w-3.5 h-3.5 text-[#1C86EE]" />
            </h4>
            <div className="space-y-1 text-xs">
              {categoryRows.map(row => (
                <Link
                  key={`${row.id}-${row.depth}`}
                  to={row.href}
                  className={sideRowClass(row.active, row.depth)}
                >
                  <span className={`truncate ${row.depth === 1 ? 'font-normal' : ''}`}>{row.label}</span>
                  {row.active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </Link>
              ))}
            </div>
            {kind === 'category' && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Chọn danh mục khác để chuyển trang (bộ lọc hiện tại sẽ được đặt lại).
              </p>
            )}
          </div>

          {/* Thương hiệu: chỉ có ở trang danh mục (trang hãng đã cố định 1 hãng) */}
          {kind === 'category' && brandOptions.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Thương Hiệu</span>
                <Tag className="w-3.5 h-3.5 text-[#1C86EE]" />
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <Link to={hrefWith({ brand: '' })} className={chipClass(!brandFilter)}>
                  Tất cả
                </Link>
                {brandOptions.map(brand => {
                  const value = brand.slug || brand.id;
                  const active = catalogKey(brandFilter) === catalogKey(value);
                  return (
                    <Link
                      key={brand.id}
                      to={hrefWith({ brand: filterToggleValue(brandFilter, value) })}
                      className={chipClass(active)}
                    >
                      {brand.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tình trạng thiết bị */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tình Trạng Thiết Bị
            </h4>
            <div className="space-y-1 text-xs">
              {CONDITION_FILTERS.map(item => (
                <Link
                  key={item.id || 'all'}
                  to={hrefWith({ condition: filterToggleValue(condition, item.id) })}
                  className={sideRowClass(catalogKey(condition) === catalogKey(item.id), 0)}
                >
                  <span>{item.label}</span>
                  {catalogKey(condition) === catalogKey(item.id) && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Khoảng giá */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Khoảng Giá (VNĐ)
            </h4>
            <div className="space-y-1 text-xs">
              {PRICE_RANGES.map(item => (
                <Link
                  key={item.id}
                  to={hrefWith({ price: filterToggleValue(priceRange, item.id) })}
                  className={sideRowClass(priceRange === item.id, 0)}
                >
                  <span>{item.label}</span>
                  {priceRange === item.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Lưới sản phẩm */}
        <section className="md:col-span-3 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Đang tải danh sách sản phẩm...</p>
            </div>
          ) : failed ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Không tải được danh sách sản phẩm</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kết nối tới máy chủ đang gián đoạn. Vui lòng thử lại sau ít giây.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] cursor-pointer transition-colors shadow-md shadow-[#1C86EE]/20"
              >
                Tải lại trang
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {hasFilters
                  ? 'Bộ lọc hiện tại chưa có sản phẩm nào. Hãy thử bỏ một vài điều kiện lọc.'
                  : 'Khu vực này đang được cập nhật hàng mới. Vui lòng xem các sản phẩm khác của GPSOFT.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {hasFilters && (
                  <Link
                    to={basePath}
                    className="px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] transition-colors shadow-md shadow-[#1C86EE]/20"
                  >
                    Xóa bộ lọc
                  </Link>
                )}
                <Link
                  to={ROUTES.products}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Xem tất cả sản phẩm
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Phân trang — chỉ vẽ khi API trả `meta` (P0.4) với > 1 trang */}
          {!loading && !failed && totalPages > 1 && (
            <nav
              aria-label="Phân trang sản phẩm"
              className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-5"
            >
              <p className="text-xs text-slate-500">
                Hiển thị{' '}
                <strong className="text-slate-900">
                  {range.from}–{range.to}
                </strong>{' '}
                / {meta?.total} sản phẩm
              </p>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {page > 1 ? (
                  <Link
                    to={hrefWith({ page: page - 1 })}
                    onClick={scrollToTop}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Trước
                  </Link>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-100">
                    Trước
                  </span>
                )}

                {paginationItems(totalPages, page).map((item, index) =>
                  item === -1 ? (
                    <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                      …
                    </span>
                  ) : item === page ? (
                    <span
                      key={item}
                      aria-current="page"
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#1C86EE] text-white shadow-xs"
                    >
                      {item}
                    </span>
                  ) : (
                    <Link
                      key={item}
                      to={hrefWith({ page: item })}
                      onClick={scrollToTop}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {item}
                    </Link>
                  )
                )}

                {page < totalPages ? (
                  <Link
                    to={hrefWith({ page: page + 1 })}
                    onClick={scrollToTop}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Sau
                  </Link>
                ) : (
                  <span className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-100">
                    Sau
                  </span>
                )}
              </div>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
};

