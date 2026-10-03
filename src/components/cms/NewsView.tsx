import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Post, PostCategory } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  Calendar,
  X,
  Tag
} from 'lucide-react';
import { slugify } from '../../utils/format.ts';

export const NewsView: React.FC = () => {
  const { showToast } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Post Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: 'Tin công nghệ',
    excerpt: '',
    content: '',
    thumbnail: '',
    author: 'Admin GPSOFT',
    tagsInput: '',
    tags: [] as string[],
    metaTitle: '',
    metaDesc: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        api.getPosts(),
        api.getPostCategories()
      ]);
      if (pRes.success) setPosts(pRes.data);
      if (cRes.success) setCategories(cRes.data);
    } catch (e) {
      console.error('Failed to load news:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    setForm({
      title: '',
      slug: '',
      category: categories[0]?.name || 'Tin công nghệ',
      excerpt: '',
      content: '',
      thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
      author: 'GPSOFT Team',
      tagsInput: 'congnghe, smartphone',
      tags: ['congnghe', 'smartphone'],
      metaTitle: '',
      metaDesc: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Post) => {
    setEditingPost(p);
    setForm({
      title: p.title,
      slug: p.slug,
      category: p.category,
      excerpt: p.excerpt,
      content: p.content,
      thumbnail: p.thumbnail,
      author: p.author,
      tagsInput: p.tags?.join(', ') || '',
      tags: p.tags || [],
      metaTitle: p.seo?.metaTitle || '',
      metaDesc: p.seo?.metaDesc || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const tags = form.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      category: form.category,
      excerpt: form.excerpt,
      content: form.content,
      thumbnail: form.thumbnail,
      author: form.author,
      tags,
      seo: {
        metaTitle: form.metaTitle || form.title,
        metaDesc: form.metaDesc || form.excerpt,
        metaKeywords: tags.join(', ')
      }
    };

    try {
      if (editingPost) {
        await api.updatePost(editingPost.id, payload);
        showToast('Cập nhật bài viết thành công!', 'success');
      } else {
        await api.createPost(payload);
        showToast('Tạo bài viết mới thành công!', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch {
      showToast('Lưu bài viết thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Xóa bài viết "${title}"?`)) return;
    try {
      await api.deletePost(id);
      showToast('Đã xóa bài viết!', 'success');
      loadData();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  const filtered = posts.filter(p =>
    !searchTerm.trim() ||
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Tin Tức & Bài Viết
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng <strong className="text-blue-600 font-bold">{posts.length}</strong> bài viết chia sẻ kiến thức & tin công nghệ
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Viết Bài Mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề bài viết..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải tin tức...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Chưa có bài viết nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 w-16">Ảnh</th>
                  <th className="py-3.5 px-4">Tiêu Đề</th>
                  <th className="py-3.5 px-4">Chuyên Mục</th>
                  <th className="py-3.5 px-4">Tác Giả</th>
                  <th className="py-3.5 px-4 text-center">Lượt Xem</th>
                  <th className="py-3.5 px-4">Ngày Đăng</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={p.thumbnail}
                        alt={p.title}
                        className="w-12 h-10 rounded-lg object-cover bg-slate-100"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-md">
                      <div className="line-clamp-1">{p.title}</div>
                      <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{p.excerpt}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.author}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">{p.viewCount}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {p.publishedAt.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPost ? 'Chỉnh Sửa Bài Viết' : 'Soạn Thảo Bài Viết Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chuyên mục</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tác giả</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ảnh đại diện (URL)</label>
                <input
                  type="text"
                  required
                  value={form.thumbnail}
                  onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả tóm tắt (Excerpt)</label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nội dung chi tiết</label>
                <textarea
                  rows={6}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Từ khóa Tags (cách nhau bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={form.tagsInput}
                  onChange={e => setForm({ ...form, tagsInput: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Lưu Bài Viết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
