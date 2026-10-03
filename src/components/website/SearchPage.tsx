/**
 * P2.8 — Trang kết quả tìm kiếm toàn site (`/tim-kiem?q=&tab=&page=&sort=`).
 *
 * Trước P2.8 ô tìm kiếm trên Navbar chỉ nhảy sang `/san-pham?q=` (lọc nội bộ `ProductsPage`) ⇒ khách
 * không tìm được **bài viết** / **dịch vụ**, kết quả không share được, và Google không có trang kết
 * quả nào để đo. Trang này hợp nhất 3 nguồn dữ liệu theo đúng quy ước P2.1 "URL là nguồn sự thật":
 *
 * | `?tab=`        | Nguồn dữ liệu              | Tìm ở đâu |
 * |----------------|----------------------------|-----------|
 * | (trống = Tất cả) | sản phẩm + bài viết + dịch vụ | mỗi nhóm `SEARCH_GROUP_SIZE` kết quả + link xem tiếp |
 * | `san-pham`     | `GET /products?search=`    | server (tên/SKU/mô tả) + phân trang `meta` |
 * | `bai-viet`     | `GET /posts?search=`       | server (tiêu đề/mô tả) + phân trang `meta` |
 * | `dich-vu`      | `GET /services`            | client `matchService()` + `paginateLocal()` (API dịch vụ chưa có `?search=`) |
 *
 * Mọi điều hướng (tab, sắp xếp, phân trang, gợi ý) render `<Link>` sinh từ `searchPath()` ⇒ crawl
 * được, Back/Forward đúng, F5 giữ nguyên kết quả. Tham số rác chuẩn hoá ở `parseSearch*()`.
 *
 * SEO: `noindex,follow` + canonical về URL chỉ có `q`/`tab` (trang kết quả nội bộ sinh vô hạn URL gần
 * trùng nhau nên Google khuyến nghị không index), nhưng vẫn để bot đi theo link sản phẩm/bài viết thật.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Layers,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Wrench
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { PaginationMeta } from '../../services/api.ts';
import type { Post, Product, Service } from '../../types/index.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { ProductCard } from './ProductCard.tsx';
import { crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import {
  CATALOG_SORT_OPTIONS,
  buildCategoryTree,
  buildProductQuery,
  paginationItems,
  paginationRange
} from '../../utils/catalog.ts';
import { formatDate } from '../../utils/format.ts';
import { seoDefaults, setSeo, truncate } from '../../utils/seo.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import {
  SEARCH_GROUP_SIZE,
  SEARCH_PAGE_SIZE,
  SEARCH_SUGGESTIONS,
  SEARCH_TABS,
  highlightSegments,
  isSearchableKeyword,
  matchService,
  normalizeKeyword,
  paginateLocal,
  parseSearchPage,
  parseSearchSort,
  parseSearchTab,
  searchPath
} from '../../utils/search.ts';
import type { SearchTabId } from '../../utils/search.ts';

/** Dải breadcrumb của trang (dùng cho cả UI và JSON-LD ⇒ không thể lệch). */
const SEARCH_CRUMBS = crumbTrail({ name: 'Tìm kiếm', path: ROUTES.search });

/** Tô đậm phần khớp từ khóa trong tiêu đề/mô tả bài viết & dịch vụ (sản phẩm đã có `ProductCard`). */
const HighlightedText: React.FC<{ text?: string | null; keyword: string; className?: string }> = ({
  text,
  keyword,
  className = ''
}) => (
  <span className={className}>
    {highlightSegments(text, keyword).map((segment, index) =>
      segment.match ? (
        <mark key={index} className="bg-amber-100 text-slate-900 rounded-xs px-0.5">
          {segment.text}
        </mark>
      ) : (
        <React.Fragment key={index}>{segment.text}</React.Fragment>
      )
    )}
  </span>
);

export const SearchPage: React.FC = () => {
  const { categories, seoSettings } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ------------------------------------------------------- đọc & chuẩn hoá URL */
  const keyword = normalizeKeyword(searchParams.get('q'));
  const tab = parseSearchTab(searchParams.get('tab'));
  const sort = parseSearchSort(searchParams.get('sort'));
  const requestedPage = parseSearchPage(searchParams.get('page'));
  /** Từ khóa đủ dài mới gọi API (`/products?search=` yêu cầu ≥ 2 ký tự). */
  const searching = isSearchableKeyword(keyword);

  const [draftKeyword, setDraftKeyword] = useState(keyword);
  useEffect(() => setDraftKeyword(keyword), [keyword]);

  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [productMeta, setProductMeta] = useState<PaginationMeta | null>(null);
  const [postMeta, setPostMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  /** `GET /services` trả **toàn bộ** dịch vụ (không có `?search=`) ⇒ chỉ gọi 1 lần cho cả phiên. */
  const servicesRef = useRef<Service[] | null>(null);

  const wantProducts = tab === 'all' || tab === 'product';
  const wantPosts = tab === 'all' || tab === 'post';
  const wantServices = tab === 'all' || tab === 'service';
  /** Tab "Tất cả" chỉ lấy `SEARCH_GROUP_SIZE` mỗi nhóm rồi mời khách xem tiếp ở tab riêng. */
  const pageSize = tab === 'all' ? SEARCH_GROUP_SIZE : SEARCH_PAGE_SIZE;
  const page = tab === 'all' ? 1 : requestedPage;

  /* ------------------------------------------------------------------ tải dữ liệu */
  useEffect(() => {
    if (!searching) {
      setProducts([]);
      setPosts([]);
      setProductMeta(null);
      setPostMeta(null);
      setFailed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const [productRes, postRes, serviceRes] = await Promise.all([
          wantProducts
            ? api.getProducts(buildProductQuery({ search: keyword, sort, page, limit: pageSize }))
            : Promise.resolve(null),
          wantPosts
            ? api.getPosts(undefined, keyword, { page, limit: pageSize })
            : Promise.resolve(null),
          wantServices && servicesRef.current === null ? api.getServices() : Promise.resolve(null)
        ]);
        if (cancelled) return;

        if (productRes) {
          setProducts(productRes.success ? productRes.data : []);
          setProductMeta(productRes.meta ?? null);
        }
        if (postRes) {
          setPosts(postRes.success ? postRes.data : []);
          setPostMeta(postRes.meta ?? null);
        }
        if (serviceRes) {
          servicesRef.current = serviceRes.success ? serviceRes.data : [];
          setServices(servicesRef.current);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load search results:', error);
        setProducts([]);
        setPosts([]);
        setProductMeta(null);
        setPostMeta(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [searching, keyword, tab, page, sort, pageSize, wantProducts, wantPosts, wantServices]);

  /* -------------------------------------------------------------- dữ liệu hiển thị */
  /** Dịch vụ: API không có tham số tìm ⇒ lọc client bằng `matchService`. */
  const matchedServices = services.filter(service => matchService(service, keyword));
  const servicePage = paginateLocal(matchedServices, requestedPage, SEARCH_PAGE_SIZE);
  const visibleServices =
    tab === 'all' ? matchedServices.slice(0, SEARCH_GROUP_SIZE) : servicePage.items;

  /** Số kết quả của từng tab (chip tab + câu "Tìm thấy N kết quả"). */
  const totalForTab: Record<SearchTabId, number> = {
    all: (productMeta?.total ?? products.length) +
      (postMeta?.total ?? posts.length) +
      matchedServices.length,
    product: productMeta?.total ?? products.length,
    post: postMeta?.total ?? posts.length,
    service: matchedServices.length
  };
  const resultCount = totalForTab[tab];
  const empty =
    !loading &&
    !failed &&
    searching &&
    products.length === 0 &&
    posts.length === 0 &&
    visibleServices.length === 0;

  /** Trang đang hiển thị theo `meta` server (server tự kẹp về trang cuối khi URL vượt tổng trang). */
  const activePage =
    tab === 'post' ? postMeta?.page ?? requestedPage : productMeta?.page ?? requestedPage;
  const totalPages = tab === 'post' ? postMeta?.totalPages ?? 1 : productMeta?.totalPages ?? 1;
  const range = paginationRange(
    tab === 'post'
      ? postMeta ?? { page: requestedPage, limit: pageSize, total: posts.length }
      : productMeta ?? { page: requestedPage, limit: pageSize, total: products.length }
  );

  /** Link tới chính trang tìm kiếm nhưng thay vài tham số (bỏ giá trị mặc định ⇒ URL sạch). */
  const hrefWith = (overrides: { tab?: SearchTabId; page?: number; sort?: string } = {}): string => {
    const switchingTab = Boolean(overrides.tab && overrides.tab !== tab);
    return searchPath(keyword, {
      tab: overrides.tab ?? tab,
      sort: switchingTab ? undefined : overrides.sort ?? sort,
      page: switchingTab ? 1 : overrides.page ?? requestedPage
    });
  };

  /** Ô tìm kiếm ngay trên trang kết quả (đổi từ khóa nhưng giữ tab đang xem). */
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = normalizeKeyword(draftKeyword);
    if (!isSearchableKeyword(clean)) return;
    navigate(searchPath(clean, { tab }));
  };

  /** Đổi trang bằng `<Link>` (URL thật) nhưng đưa khách lên đầu danh sách kết quả. */
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  /* ------------------------------------------------------------------ breadcrumb + SEO */
  const scopedDefaults = seoDefaults(seoSettings, 'Tìm Kiếm — GPSOFT Store');
  const pageTitle = searching
    ? `Kết quả tìm kiếm "${truncate(keyword, 60)}" — GPSOFT Store`
    : 'Tìm Kiếm Sản Phẩm, Bài Viết, Dịch Vụ — GPSOFT Store';

  useEffect(() => {
    setSeo({
      title: pageTitle,
      description: searching
        ? `Kết quả tìm kiếm cho "${keyword}" tại GPSOFT Store: sản phẩm chính hãng, bài viết hướng dẫn và dịch vụ sửa chữa, bảo hành.`
        : `${SEARCH_SUGGESTIONS.slice(0, 4).join(', ')} — tìm nhanh sản phẩm, bài viết và dịch vụ tại GPSOFT Store.`,
      // Canonical bỏ `page`/`sort` ⇒ mỗi từ khóa/tab chỉ có 1 URL đại diện.
      canonicalPath: searching ? searchPath(keyword, { tab }) : ROUTES.search,
      ogImage: scopedDefaults.ogImage,
      // Trang kết quả nội bộ: không index (vô hạn tổ hợp từ khóa/trang) nhưng vẫn cho bot theo link.
      robots: 'noindex,follow',
      jsonLd: [crumbJsonLd(SEARCH_CRUMBS)]
    });
  }, [pageTitle, keyword, tab, searching, scopedDefaults.ogImage]);

  /** Danh mục cấp 1 (gợi ý khi chưa nhập từ khóa / không có kết quả). */
  const topCategories = buildCategoryTree(categories).slice(0, 6);

  const tabChipClass = (active: boolean): string =>
    `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
      active
        ? 'bg-[#1C86EE] text-white shadow-xs'
        : 'bg-white border border-slate-200 text-slate-600 hover:border-[#1C86EE] hover:text-[#1C86EE]'
    }`;

  /** Khối gợi ý dùng chung: chưa nhập từ khóa **hoặc** không có kết quả. */
  const suggestionBlock = (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 tracking-tight">
          <Search className="w-4 h-4 text-[#1C86EE]" />
          <span>Từ khóa phổ biến</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {SEARCH_SUGGESTIONS.map(suggestion => (
            <Link
              key={suggestion}
              to={searchPath(suggestion, { tab })}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-[#1C86EE]/10 hover:text-[#1C86EE] hover:border-[#1C86EE]/30 transition-colors"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 tracking-tight">
          <Layers className="w-4 h-4 text-[#1C86EE]" />
          <span>Danh mục nổi bật</span>
        </h2>
        {topCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topCategories.map(node => (
              <Link
                key={node.id}
                to={pathFor('category', { categorySlug: node.slug || node.id })}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#1C86EE] hover:text-[#1C86EE] transition-colors"
              >
                <span className="truncate">{node.name}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Xem toàn bộ sản phẩm tại{' '}
            <Link to={ROUTES.products} className="font-bold text-[#1C86EE] hover:underline">
              /san-pham
            </Link>{' '}
            hoặc gọi hotline để được tư vấn nhanh.
          </p>
        )}
      </div>
    </section>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <Breadcrumb items={SEARCH_CRUMBS} />

      {/* Khối đầu trang: tiêu đề + ô tìm lại + tab + sắp xếp */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {searching ? (
                <>
                  Kết quả cho &ldquo;<span className="text-[#1C86EE]">{keyword}</span>&rdquo;
                </>
              ) : (
                'Tìm kiếm toàn site'
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {searching
                ? loading
                  ? 'Đang tìm kiếm...'
                  : failed
                    ? 'Không kết nối được tới máy chủ — bạn thử tải lại trang nhé.'
                    : `Tìm thấy ${resultCount} kết quả trong sản phẩm, bài viết và dịch vụ.`
                : 'Nhập tên sản phẩm, bài viết hoặc dịch vụ bạn cần tìm. Kết quả gồm cả sản phẩm chính hãng, bài viết hướng dẫn và dịch vụ sửa chữa.'}
            </p>
          </div>

          <form onSubmit={submitSearch} className="flex gap-2 w-full lg:w-auto">
            <label htmlFor="search-page-input" className="sr-only">
              Từ khóa tìm kiếm
            </label>
            <input
              id="search-page-input"
              type="search"
              value={draftKeyword}
              onChange={event => setDraftKeyword(event.target.value)}
              placeholder="Tìm sản phẩm, bài viết, dịch vụ..."
              className="flex-1 lg:w-72 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1C86EE] focus:ring-2 focus:ring-[#1C86EE]/20"
            />
            <button
              type="submit"
              disabled={!isSearchableKeyword(draftKeyword)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] text-white text-xs font-bold hover:bg-[#1472CE] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-md shadow-[#1C86EE]/20"
            >
              <Search className="w-4 h-4" />
              <span>Tìm</span>
            </button>
          </form>
        </div>

        {/* Tab kết quả — mỗi tab là 1 URL thật (`?tab=`), tham số mặc định bị bỏ khỏi URL */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {SEARCH_TABS.map(item => (
            <Link
              key={item.id}
              to={hrefWith({ tab: item.id })}
              aria-current={item.id === tab ? 'page' : undefined}
              className={tabChipClass(item.id === tab)}
            >
              {item.id === 'product' && <Package className="w-3.5 h-3.5" />}
              {item.id === 'post' && <FileText className="w-3.5 h-3.5" />}
              {item.id === 'service' && <Wrench className="w-3.5 h-3.5" />}
              {item.id === 'all' && <Layers className="w-3.5 h-3.5" />}
              <span>{item.label}</span>
              {item.id === tab && searching && !loading && <span>({totalForTab[item.id]})</span>}
            </Link>
          ))}

          {searching && (
            <Link
              to={ROUTES.search}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-[#1C86EE] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa từ khóa</span>
            </Link>
          )}
        </div>

        {/* Sắp xếp — chỉ áp cho sản phẩm (bài viết/dịch vụ giữ thứ tự mặc định của API) */}
        {searching && (tab === 'all' || tab === 'product') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sắp xếp</span>
            </span>
            {CATALOG_SORT_OPTIONS.map(option => (
              <Link key={option.id} to={hrefWith({ sort: option.id })} className={tabChipClass(option.id === sort)}>
                {option.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Chưa có từ khóa ⇒ mời khách chọn gợi ý (tránh trang trắng). */}
      {!searching && suggestionBlock}

      {/* Đang tải: skeleton giữ đúng nhịp lưới 3 cột để không nhảy layout. */}
      {searching && loading && (
        <section className="space-y-4" aria-busy="true">
          <div className="h-4 w-40 rounded-lg bg-slate-200/70 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-4/3 rounded-xl bg-slate-100" />
                <div className="h-3.5 w-3/4 rounded-lg bg-slate-200/70" />
                <div className="h-3 w-1/2 rounded-lg bg-slate-200/60" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lỗi mạng: nói rõ nguyên nhân + cho khách thử lại thay vì hiện "0 kết quả" sai. */}
      {searching && !loading && failed && (
        <section className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-3">
          <h2 className="text-sm font-extrabold text-amber-900">
            Chưa tải được kết quả tìm kiếm
          </h2>
          <p className="text-xs text-amber-800 leading-relaxed">
            Máy chủ đang bận hoặc kết nối mạng bị ngắt. Bạn thử lại sau ít giây, hoặc xem toàn bộ sản
            phẩm tại{' '}
            <Link to={ROUTES.products} className="font-bold underline">
              trang sản phẩm
            </Link>
            .
          </p>
          <Link
            to={hrefWith()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử lại</span>
          </Link>
        </section>
      )}

      {/* Không có kết quả: nói thẳng + gợi ý từ khóa khác & danh mục (không để khách bế tắc). */}
      {empty && (
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Không tìm thấy kết quả cho &ldquo;{keyword}&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Bạn thử từ khóa ngắn hơn (VD &ldquo;laptop&rdquo;, &ldquo;iphone&rdquo;), kiểm tra lại
            chính tả, hoặc chọn một gợi ý bên dưới.
          </p>
        </section>
      )}

      {searching && !loading && !failed && empty && suggestionBlock}

      {/* ------------------------------------------------ kết quả: SẢN PHẨM */}
      {searching && !loading && !failed && wantProducts && products.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 tracking-tight">
              <Package className="w-4 h-4 text-[#1C86EE]" />
              <span>Sản phẩm</span>
              <span className="text-xs font-semibold text-slate-400">
                ({productMeta?.total ?? products.length})
              </span>
            </h2>
            {tab === 'all' && (productMeta?.total ?? products.length) > products.length && (
              <Link
                to={searchPath(keyword, { tab: 'product' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C86EE] hover:underline"
              >
                <span>Xem tất cả sản phẩm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ kết quả: BÀI VIẾT */}
      {searching && !loading && !failed && wantPosts && posts.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 tracking-tight">
              <FileText className="w-4 h-4 text-[#1C86EE]" />
              <span>Bài viết</span>
              <span className="text-xs font-semibold text-slate-400">
                ({postMeta?.total ?? posts.length})
              </span>
            </h2>
            {tab === 'all' && (postMeta?.total ?? posts.length) > posts.length && (
              <Link
                to={searchPath(keyword, { tab: 'post' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C86EE] hover:underline"
              >
                <span>Xem tất cả bài viết</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {posts.map(post => (
              <Link
                key={post.id}
                to={pathFor('news', { postSlug: post.slug || post.id })}
                className="group flex gap-4 bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-[#1C86EE] hover:shadow-md transition-all"
              >
                {post.thumbnail ? (
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    loading="lazy"
                    className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl bg-slate-100 grid place-items-center">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#1C86EE] transition-colors line-clamp-2">
                    <HighlightedText text={post.title} keyword={keyword} />
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    <HighlightedText text={post.excerpt} keyword={keyword} />
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {post.category} · {formatDate(post.publishedAt || post.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ kết quả: DỊCH VỤ */}
      {searching && !loading && !failed && wantServices && visibleServices.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 tracking-tight">
              <Wrench className="w-4 h-4 text-[#1C86EE]" />
              <span>Dịch vụ</span>
              <span className="text-xs font-semibold text-slate-400">({matchedServices.length})</span>
            </h2>
            {tab === 'all' && matchedServices.length > visibleServices.length && (
              <Link
                to={searchPath(keyword, { tab: 'service' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C86EE] hover:underline"
              >
                <span>Xem tất cả dịch vụ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleServices.map(service => (
              <Link
                key={service.id}
                to={pathFor('services', { serviceSlug: service.slug || service.id })}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:border-[#1C86EE] hover:shadow-md transition-all"
              >
                {service.thumbnail ? (
                  <img
                    src={service.thumbnail}
                    alt={service.title}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover bg-slate-100"
                  />
                ) : (
                  <div className="aspect-4/3 w-full bg-slate-100 grid place-items-center">
                    <Wrench className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                <div className="p-4 space-y-2 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#1C86EE] transition-colors line-clamp-2">
                    <HighlightedText text={service.title} keyword={keyword} />
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    <HighlightedText text={service.shortDesc} keyword={keyword} />
                  </p>
                  {(service.priceRange || service.priceEstimate) && (
                    <p className="text-xs font-bold text-[#1C86EE]">
                      {service.priceRange || service.priceEstimate}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Phân trang — chỉ cho tab 1 nhóm (tab "Tất cả" đã có link xem tiếp từng nhóm). */}
      {searching && !loading && !failed && (tab === 'product' || tab === 'post') && totalPages > 1 && (
        <nav
          aria-label="Phân trang kết quả tìm kiếm"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 px-4 py-3"
        >
          <p className="text-xs text-slate-500">
            Hiển thị{' '}
            <strong className="text-slate-900">
              {range.from}–{range.to}
            </strong>{' '}
            / {totalForTab[tab]} kết quả
          </p>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {activePage > 1 ? (
              <Link
                to={hrefWith({ page: activePage - 1 })}
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

            {paginationItems(totalPages, activePage).map((item, index) =>
              item === -1 ? (
                <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                  …
                </span>
              ) : item === activePage ? (
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

            {activePage < totalPages ? (
              <Link
                to={hrefWith({ page: activePage + 1 })}
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
    </div>
  );
};

export default SearchPage;


