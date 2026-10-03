import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Post, PostCategory } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { setSeo, seoDefaults, articleJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung (UI ⇄ JSON-LD) + trang 404 dùng chung khi slug bài viết sai.
import { NEWS_CRUMB, crumbJsonLd, crumbLabel, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import {
  Calendar,
  Eye,
  User,
  Tag,
  ChevronRight,
  Share2,
  ArrowLeft,
  Search,
  Sparkles
} from 'lucide-react';

export const NewsPage: React.FC = () => {
  const { selectedPostSlug, seoSettings } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        const [postsRes, catsRes] = await Promise.all([
          api.getPosts(),
          api.getPostCategories()
        ]);
        if (postsRes.success) {
          setPosts(postsRes.data);
          if (selectedPostSlug) {
            const matched = postsRes.data.find(p => p.slug === selectedPostSlug || p.id === selectedPostSlug);
            if (matched) setActivePost(matched);
          }
        }
        if (catsRes.success) setCategories(catsRes.data);
      } catch (e) {
        console.error('Failed to load news:', e);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, [selectedPostSlug]);

  // P0.2 — SEO: cùng 1 component phục vụ cả danh sách (`/tin-tuc`) lẫn bài chi tiết (`/tin-tuc/:slug`).
  const newsSeo = seoDefaults(seoSettings, 'Tin Tức Công Nghệ — GPSOFT');
  const postPath = activePost
    ? pathFor('news', { postSlug: activePost.slug || activePost.id })
    : ROUTES.news;

  // P2.8 — một dải breadcrumb cho cả hai chế độ xem: danh sách (`/tin-tuc`) và bài chi tiết.
  const newsCrumbs = crumbTrail(
    NEWS_CRUMB,
    activePost ? { name: crumbLabel(activePost.title), path: postPath } : null
  );

  useEffect(() => {
    if (activePost) {
      setSeo({
        title: activePost.seo?.metaTitle || `${activePost.title} — Tin Tức GPSOFT`,
        description: activePost.seo?.metaDesc || activePost.excerpt,
        canonicalPath: postPath,
        ogImage: activePost.thumbnail || newsSeo.ogImage,
        ogType: 'article',
        jsonLd: [
          articleJsonLd(activePost, { categoryName: activePost.category }),
          crumbJsonLd(newsCrumbs)
        ]
      });
      return;
    }

    setSeo({
      title: newsSeo.title,
      description: newsSeo.description,
      canonicalPath: ROUTES.news,
      ogImage: newsSeo.ogImage,
      jsonLd: [crumbJsonLd(newsCrumbs)]
    });
    // `newsCrumbs` được suy ra từ `activePost` + `postPath` ⇒ chỉ cần các phụ thuộc gốc.
  }, [activePost, postPath, newsSeo.title, newsSeo.description, newsSeo.ogImage]);

  const filteredPosts = posts.filter(p => {
    const matchesCat = !activeCategory || p.category === activeCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tải tin tức công nghệ...</p>
      </div>
    );
  }

  // P2.8 — `/tin-tuc/<slug-sai>`: đã tải xong mà không khớp bài nào ⇒ dùng chung trang 404
  // (noindex + ô tìm kiếm) thay vì lặng lẽ hiển thị danh sách bài viết dưới URL sai.
  if (selectedPostSlug && !activePost) {
    return (
      <NotFoundPage
        title="Không tìm thấy bài viết này"
        message="Bài viết bạn mở có thể đã được đổi đường dẫn hoặc gỡ xuống. Hãy thử tìm lại bằng từ khóa bên dưới."
      />
    );
  }

  // Full article reader view
  if (activePost) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Breadcrumb items={newsCrumbs} variant="header" />
        <button
          onClick={() => setActivePost(null)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#1C86EE] hover:text-[#1472CE] bg-[#1C86EE]/10 px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách bài viết</span>
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#1C86EE] text-white text-xs font-bold">
              {activePost.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{activePost.publishedAt.split('T')[0]}</span>
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{activePost.viewCount} lượt xem</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {activePost.title}
          </h1>

          <div className="flex items-center gap-3 py-2 border-y border-slate-100 text-xs text-slate-600">
            <div className="w-7 h-7 rounded-full bg-[#1C86EE]/20 text-[#1C86EE] flex items-center justify-center font-bold">
              {activePost.author.charAt(0)}
            </div>
            <span>Tác giả: <strong className="text-slate-900">{activePost.author}</strong></span>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-lg aspect-video bg-slate-100 border border-slate-200/80">
          <img
            src={activePost.thumbnail}
            alt={activePost.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
          {activePost.content}
        </div>

        {activePost.tags && activePost.tags.length > 0 && (
          <div className="pt-6 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-semibold">Chủ đề:</span>
            {activePost.tags.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Articles catalog view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Breadcrumb items={newsCrumbs} variant="pill" className="mb-1" />
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold uppercase tracking-wider">
          GPSOFT Insights & News
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Tin Tức, Đánh Giá & Mẹo Công Nghệ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Những cập nhật công nghệ mới nhất, so sánh thiết bị và hướng dẫn thủ thuật hữu ích.
        </p>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveCategory('')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !activeCategory ? 'bg-[#1C86EE] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tất cả bài viết ({posts.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === c.name
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map(post => (
          <div
            key={post.id}
            onClick={() => {
              setActivePost(post);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#1C86EE]/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="aspect-video relative overflow-hidden bg-slate-100">
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 bg-[#1C86EE] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xs">
                {post.category}
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{post.publishedAt.split('T')[0]}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{post.viewCount} views</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1C86EE] transition-colors line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{post.author}</span>
                <span className="text-[#1C86EE] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Đọc tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
