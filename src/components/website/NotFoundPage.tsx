/**
 * P2.8 — Trang 404 công khai.
 *
 * Trước P2.8 mọi URL không khớp route đều **rơi về trang chủ** (`parsePath` trả `page: 'home'`), nên:
 * khách tưởng mình gõ đúng link (bị "lạc" trong trang chủ), Google index URL rác thành 1 bản sao của
 * trang chủ (trùng lặp nội dung), và các trang tự xử lý "không tìm thấy" (sản phẩm/bài viết/danh mục)
 * mỗi nơi một kiểu. Component này là **một** trang 404 dùng chung, có:
 * 1. Thông báo rõ ràng + hiện đường dẫn sai (debug nhanh khi khách gọi lên).
 * 2. **Ô tìm kiếm** ⇒ không để khách bế tắc (gõ lại từ khóa → `/tim-kiem?q=`).
 * 3. Gợi ý danh mục đang bật (từ `AppContext.categories`) + liên kết nhanh tới các trang chính.
 * 4. Hotline nếu shop đã cấu hình trong CMS.
 *
 * SEO: `robots: 'noindex,follow'` + **không** canonical (URL không tồn tại) ⇒ Google bỏ URL rác khỏi
 * index nhưng vẫn đi theo link ra các trang thật. Đây cũng là chỗ bù `TODO(P2.8)` ở
 * `ProductDetailPage`/`StaticPageView` (slug sai ⇒ hiện luôn trang 404 thay vì đoán mò).
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Compass, Home, Layers, PhoneCall, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { buildCategoryTree } from '../../utils/catalog.ts';
import { seoDefaults, setSeo } from '../../utils/seo.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import {
  SEARCH_SUGGESTIONS,
  isSearchableKeyword,
  normalizeKeyword,
  searchPath
} from '../../utils/search.ts';

interface NotFoundPageProps {
  /** Tiêu đề thay thế khi tái sử dụng cho trường hợp "không tìm thấy sản phẩm/bài viết/danh mục". */
  title?: string;
  /** Mô tả thay thế (mặc định: thông báo theo URL đang mở). */
  message?: string;
}

/** Liên kết nhanh luôn hiển thị (kể cả khi chưa tải được danh mục từ API). */
const QUICK_LINKS: Array<{ label: string; path: string }> = [
  { label: 'Trang chủ', path: ROUTES.home },
  { label: 'Sản phẩm', path: ROUTES.products },
  { label: 'Dịch vụ sửa chữa', path: ROUTES.services },
  { label: 'Bảng giá', path: ROUTES.priceList },
  { label: 'Tin tức', path: ROUTES.news },
  { label: 'Tra cứu bảo hành', path: ROUTES.warranty },
  { label: 'Phần mềm chấm công', path: ROUTES.attendance },
  { label: 'Thiết kế website', path: ROUTES.webDesign },
  { label: 'Liên hệ', path: ROUTES.contact }
];

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ title, message }) => {
  const { categories, settings, navigateToSearch, seoSettings } = useApp();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');

  const notFoundSeo = seoDefaults(seoSettings, 'Không Tìm Thấy Trang — GPSOFT Store');
  const heading = title || 'Không tìm thấy trang bạn cần';
  const wrongPath = location.pathname || '/';

  useEffect(() => {
    setSeo({
      title: `${heading} (404) — GPSOFT Store`,
      description:
        'Đường dẫn bạn mở không tồn tại hoặc đã được thay đổi. Hãy thử tìm lại bằng từ khóa hoặc quay về trang chủ GPSOFT.',
      // URL không tồn tại ⇒ không đặt canonical; chỉ chặn index để Google dọn khỏi kết quả tìm kiếm.
      canonicalPath: undefined,
      ogImage: notFoundSeo.ogImage,
      robots: 'noindex,follow'
    });
  }, [heading, notFoundSeo.ogImage]);

  /** Chỉ điều hướng khi từ khóa đủ dài (≥ 2 ký tự) — cùng điều kiện với ô tìm kiếm trên Navbar. */
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = normalizeKeyword(keyword);
    if (!isSearchableKeyword(clean)) return;
    navigateToSearch(clean);
  };

  /** Danh mục cấp 1 đang bật (gợi ý thoát nhanh) — bỏ danh mục đã ẩn ở CMS. */
  const topCategories = buildCategoryTree(categories)
    .filter(node => node.isActive !== false)
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Khối chính: mã lỗi + thông báo + ô tìm kiếm + nút thoát */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs px-6 py-10 sm:px-12 sm:py-14 text-center space-y-6">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] text-xs font-bold uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5" />
          <span>Lỗi 404 — Trang không tồn tại</span>
        </span>

        <div className="space-y-3">
          <p className="text-6xl sm:text-7xl font-extrabold text-[#1C86EE] leading-none tracking-tight">
            404
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {heading}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {message || (
              <>
                Đường dẫn{' '}
                <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {wrongPath}
                </code>{' '}
                không tồn tại hoặc đã được thay đổi. Bạn hãy thử tìm lại bằng từ khóa bên dưới, hoặc
                chọn một trong các liên kết gợi ý ở dưới trang.
              </>
            )}
          </p>
        </div>

        <form onSubmit={submitSearch} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2">
          <label htmlFor="not-found-search" className="sr-only">
            Tìm kiếm sản phẩm, bài viết, dịch vụ
          </label>
          <input
            id="not-found-search"
            type="search"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="Nhập tên sản phẩm, danh mục hoặc dịch vụ cần tìm..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1C86EE] focus:ring-2 focus:ring-[#1C86EE]/20"
          />
          <button
            type="submit"
            disabled={!isSearchableKeyword(keyword)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1C86EE] text-white text-xs font-bold hover:bg-[#1472CE] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-md shadow-[#1C86EE]/20"
          >
            <Search className="w-4 h-4" />
            <span>Tìm kiếm</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Từ khóa phổ biến
          </span>
          {SEARCH_SUGGESTIONS.map(suggestion => (
            <Link
              key={suggestion}
              to={searchPath(suggestion)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-[#1C86EE]/10 hover:text-[#1C86EE] hover:border-[#1C86EE]/30 transition-colors"
            >
              {suggestion}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C86EE] text-white text-xs font-bold hover:bg-[#1472CE] transition-colors shadow-md shadow-[#1C86EE]/20"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
          <Link
            to={ROUTES.products}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:border-[#1C86EE] hover:text-[#1C86EE] transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Xem tất cả sản phẩm</span>
          </Link>
          {settings?.hotline && (
            <a
              href={`tel:${settings.hotline.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Gọi hotline {settings.hotline}</span>
            </a>
          )}
        </div>
      </section>

      {/* Gợi ý danh mục cấp 1 (chỉ có khi đã tải được danh mục từ API/CMS). */}
      {topCategories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Gợi ý danh mục bạn có thể cần
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topCategories.map(node => (
              <Link
                key={node.id}
                to={pathFor('category', { categorySlug: node.slug || node.id })}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:border-[#1C86EE] hover:text-[#1C86EE] transition-colors"
              >
                <span className="truncate">{node.name}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Liên kết nhanh — luôn có để khách không bị "chết" ở trang 404. */}
      <section className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Liên kết nhanh</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:border-[#1C86EE] hover:text-[#1C86EE] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

