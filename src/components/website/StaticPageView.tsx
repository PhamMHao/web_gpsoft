import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Page } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { setSeo, seoDefaults } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung (UI ⇄ JSON-LD) + trang 404 dùng chung khi slug trang sai.
import { crumbJsonLd, crumbLabel, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { ArrowLeft, Clock } from 'lucide-react';

export const StaticPageView: React.FC = () => {
  const { selectedPageSlug, setWebsitePage, seoSettings } = useApp();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPageSlug) return;
    async function load() {
      try {
        setLoading(true);
        const res = await api.getPage(selectedPageSlug!);
        if (res.success && res.data) {
          setPage(res.data);
        }
      } catch (e) {
        console.error('Page load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedPageSlug]);

  // P0.2 — SEO trang tĩnh: ưu tiên `page.seo.metaTitle/metaDesc` do admin nhập ở CMS → Trang nội dung.
  const pageSeo = seoDefaults(seoSettings);
  const pagePath = selectedPageSlug ? pathFor('page', { pageSlug: selectedPageSlug }) : ROUTES.home;
  // P2.8 — breadcrumb: `Trang chủ › <tên trang>` (một mảng dùng cho cả UI lẫn JSON-LD).
  const pageCrumbs = crumbTrail(
    page && selectedPageSlug ? { name: crumbLabel(page.title), path: pagePath } : null
  );

  useEffect(() => {
    if (!page) return;
    setSeo({
      title: page.seo?.metaTitle || `${page.title} — GPSOFT`,
      description: page.seo?.metaDesc || pageSeo.description,
      canonicalPath: pagePath,
      ogImage: pageSeo.ogImage,
      jsonLd: [crumbJsonLd(pageCrumbs)]
    });
    // `pageCrumbs` được suy ra từ `page` + `pagePath` ⇒ chỉ cần các phụ thuộc gốc.
  }, [page, pagePath, pageSeo.description, pageSeo.ogImage]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tải nội dung trang...</p>
      </div>
    );
  }

  if (!page) {
    // P2.8 — slug trang sai ⇒ dùng chung trang 404 (noindex + gợi ý tìm kiếm).
    return (
      <NotFoundPage
        title="Không tìm thấy nội dung trang này"
        message="Trang bạn mở có thể đã được đổi đường dẫn hoặc gỡ xuống. Hãy thử tìm lại bằng từ khóa bên dưới."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Breadcrumb items={pageCrumbs} variant="header" />
      <button
        onClick={() => setWebsitePage('home')}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#1C86EE] hover:text-[#1472CE] bg-[#1C86EE]/10 px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay về trang chủ</span>
      </button>

      <div className="space-y-3 border-b border-slate-100 pb-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          {page.title}
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Cập nhật gần nhất: {page.updatedAt.split('T')[0]}</span>
        </div>
      </div>

      <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
        {page.content}
      </div>
    </div>
  );
};
