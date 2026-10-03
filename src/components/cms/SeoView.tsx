import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { SeoConfig, RedirectRule } from '../../types/index.ts';
import {
  Globe,
  FileCode,
  ArrowRightLeft,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Save,
  Search
} from 'lucide-react';
import { genId } from '../../utils/id.ts';

export const SeoView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'meta' | 'robots' | 'sitemap' | 'redirects'>('meta');
  const [loading, setLoading] = useState(true);

  // Form State
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [robotsTxt, setRobotsTxt] = useState('');
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);

  // Redirect rule form
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newStatusCode, setNewStatusCode] = useState<301 | 302>(301);

  useEffect(() => {
    loadSeo();
  }, []);

  const loadSeo = async () => {
    try {
      setLoading(true);
      const res = await api.getSeo();
      if (res.success && res.data) {
        setMetaTitle(res.data.metaTitle || res.data.defaultTitle || '');
        setMetaDescription(res.data.metaDescription || res.data.defaultDescription || '');
        setMetaKeywords(res.data.metaKeywords || res.data.defaultKeywords || '');
        setOgImage(res.data.ogImage || '');
        setRobotsTxt(res.data.robotsTxt || '');
        setRedirects(res.data.redirects || []);
      }
    } catch (e) {
      console.error('Failed to load SEO settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<SeoConfig> = {
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
        robotsTxt,
        redirects
      };
      await api.updateSeo(payload);
      showToast('Cập nhật cấu hình SEO & Robots thành công!', 'success');
    } catch {
      showToast('Lưu SEO thất bại.', 'error');
    }
  };

  const handleAddRedirect = () => {
    if (!newFrom.trim() || !newTo.trim()) {
      showToast('Vui lòng điền link cũ và link chuyển hướng mới!', 'error');
      return;
    }
    const newRule: RedirectRule = {
      id: genId('red'),
      from: newFrom.trim(),
      to: newTo.trim(),
      statusCode: newStatusCode,
      isActive: true
    };
    setRedirects(prev => [...prev, newRule]);
    setNewFrom('');
    setNewTo('');
  };

  const handleRemoveRedirect = (id: string) => {
    setRedirects(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleRedirect = (id: string) => {
    setRedirects(prev => prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tối Ưu Hóa Công Cụ Tìm Kiếm (SEO Suite)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị Meta Tags, chỉ mục Robots.txt, sơ đồ website XML và điều hướng 301 Redirect
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'meta' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Meta Tags
          </button>
          <button
            onClick={() => setActiveTab('robots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'robots' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Robots.txt
          </button>
          <button
            onClick={() => setActiveTab('sitemap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sitemap' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Sitemap.xml
          </button>
          <button
            onClick={() => setActiveTab('redirects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'redirects' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Chuyển Hướng 301
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSeo} className="space-y-6">
        {activeTab === 'meta' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6 max-w-3xl">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Cấu Hình Thẻ Meta Mặc Định Cho Toàn Bộ Website
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề trang (Meta Title) *</label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Độ dài lý tưởng: 50 - 65 ký tự ({metaTitle.length} ký tự)</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả tóm tắt (Meta Description) *</label>
                <textarea
                  rows={3}
                  required
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Độ dài lý tưởng: 120 - 160 ký tự ({metaDescription.length} ký tự)</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Từ khóa chính (Keywords)</label>
                <input
                  type="text"
                  value={metaKeywords}
                  onChange={e => setMetaKeywords(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ảnh đại diện chia sẻ mạng xã hội (OpenGraph OG Image URL)</label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={e => setOgImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              {/* SERP Search Preview Box */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 font-sans">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Xem Trước Hiển Thị Trên Google Tìm Kiếm (SERP Preview)
                </div>
                <div className="text-[11px] text-slate-500 truncate">https://gpsoft.vn</div>
                <div className="text-base text-blue-800 font-bold hover:underline cursor-pointer truncate">
                  {metaTitle || 'GPSOFT - Hệ Thống Thiết Bị Công Nghệ'}
                </div>
                <div className="text-xs text-slate-600 line-clamp-2">
                  {metaDescription || 'GPSOFT chuyên phân phối các dòng smartphone, laptop, tablet chính hãng...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'robots' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-4 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Cấu Hình Tệp Robots.txt
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ dẫn các bot tìm kiếm (Googlebot, Bingbot...) thu thập dữ liệu website.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                rows={8}
                value={robotsTxt}
                onChange={e => setRobotsTxt(e.target.value)}
                className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl focus:outline-hidden leading-relaxed"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>URL tệp thực tế: <strong className="font-mono text-slate-600">/robots.txt</strong></span>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Mở /robots.txt</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sitemap' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-4 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Sơ Đồ Trang XML (Dynamic Sitemap)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động sinh danh sách toàn bộ sản phẩm, bài viết và chuyên mục cập nhật liên tục.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-800 font-bold">/sitemap.xml</span>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                >
                  <span>Xem file Sitemap XML</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Mỗi khi bạn thêm mới hoặc cập nhật một sản phẩm, bài viết tin tức hoặc trang tĩnh trong CMS, tệp XML này sẽ được đồng bộ ngay lập tức và sẵn sàng gửi lên Google Search Console.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'redirects' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Quản Lý Quy Tắc Chuyển Hướng Link (301 / 302 Redirects)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tránh lỗi 404 khi đổi link sản phẩm hoặc tái cấu trúc URL
              </p>
            </div>

            {/* Add rule input */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <input
                type="text"
                placeholder="Từ link cũ (/dien-thoai-cu)"
                value={newFrom}
                onChange={e => setNewFrom(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                placeholder="Đến link mới (/products)"
                value={newTo}
                onChange={e => setNewTo(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
              <select
                value={newStatusCode}
                onChange={e => setNewStatusCode(Number(e.target.value) as 301 | 302)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                <option value={301}>301 (Vĩnh viễn)</option>
                <option value={302}>302 (Tạm thời)</option>
              </select>
              <button
                type="button"
                onClick={handleAddRedirect}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer"
              >
                Thêm Quy Tắc
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              {redirects.length === 0 ? (
                <div className="p-4 text-center text-slate-400">Chưa có quy tắc chuyển hướng nào.</div>
              ) : (
                redirects.map(r => (
                  <div key={r.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">{r.from}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-mono text-blue-600 font-bold">{r.to}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {r.statusCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRedirect(r.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.isActive ? 'Đang bật' : 'Tắt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveRedirect(r.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="max-w-3xl flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Toàn Bộ Cấu Hình SEO</span>
          </button>
        </div>
      </form>
    </div>
  );
};
