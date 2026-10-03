import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Page } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  FileCode,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Clock
} from 'lucide-react';
import { slugify } from '../../utils/format.ts';
// P2.2 — nội dung mặc định của 4 trang CMS cho module "Phần mềm chấm công".
import { ATTENDANCE_MODULE_LABEL, attendanceCmsPages } from '../../utils/attendance.ts';

export const PagesView: React.FC = () => {
  const { showToast, navigateToPage, setViewMode } = useApp();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  // P2.2 — đang tạo 4 trang module "Phần mềm chấm công" (idempotent).
  const [seedingAttendance, setSeedingAttendance] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    metaTitle: '',
    metaDesc: ''
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const res = await api.getPages();
      if (res.success) setPages(res.data);
    } catch (e) {
      console.error('Failed to load pages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPage(null);
    setForm({
      title: '',
      slug: '',
      content: '',
      metaTitle: '',
      metaDesc: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Page) => {
    setEditingPage(p);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content,
      metaTitle: p.seo?.metaTitle || '',
      metaDesc: p.seo?.metaDesc || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      content: form.content,
      seo: {
        metaTitle: form.metaTitle || form.title,
        metaDesc: form.metaDesc,
        metaKeywords: ''
      }
    };

    try {
      if (editingPage) {
        await api.updatePage(editingPage.id, payload);
        showToast('Cập nhật trang thành công!', 'success');
      } else {
        await api.createPage(payload);
        showToast('Tạo trang mới thành công!', 'success');
      }
      setModalOpen(false);
      loadPages();
    } catch {
      showToast('Lưu trang thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Xóa trang "${title}"?`)) return;
    try {
      await api.deletePage(id);
      showToast('Đã xóa trang!', 'success');
      loadPages();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  /**
   * P2.2 — tạo nhanh 4 trang `Page` (`phan-mem-cham-cong-<tab>`) để CMS sửa nội dung module.
   * **Idempotent:** trang đã tồn tại thì bỏ qua (không ghi đè nội dung admin đã sửa).
   */
  const handleSeedAttendancePages = async () => {
    const seeds = attendanceCmsPages();
    const existing = new Set(pages.map(p => p.slug));
    const missing = seeds.filter(seed => !existing.has(seed.slug));

    if (missing.length === 0) {
      showToast(`Đã có đủ ${seeds.length} trang nội dung ${ATTENDANCE_MODULE_LABEL}.`, 'info');
      return;
    }

    setSeedingAttendance(true);
    try {
      let created = 0;
      for (const seed of missing) {
        try {
          const payload: Partial<Page> = {
            title: seed.title,
            slug: seed.slug,
            content: seed.content,
            seo: {
              metaTitle: seed.seo.metaTitle,
              metaDesc: seed.seo.metaDesc
            }
          };
          await api.createPage(payload);
          created += 1;
        } catch (e) {
          console.error('Failed to seed attendance page:', seed.slug, e);
        }
      }
      showToast(
        created > 0
          ? `Đã tạo ${created}/${missing.length} trang nội dung ${ATTENDANCE_MODULE_LABEL}!`
          : `Không tạo được trang nội dung ${ATTENDANCE_MODULE_LABEL}.`,
        created > 0 ? 'success' : 'error'
      );
      await loadPages();
    } finally {
      setSeedingAttendance(false);
    }
  };

  const handlePreviewOnWebsite = (slug: string) => {
    navigateToPage(slug);
    setViewMode('website');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Trang Nội Dung Tĩnh (Pages)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các trang giới thiệu, chính sách bảo hành, đổi trả, điều khoản dịch vụ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* P2.2 — tạo nhanh 4 trang nội dung của module "Phần mềm chấm công" */}
          <button
            onClick={handleSeedAttendancePages}
            disabled={seedingAttendance}
            title={`Tạo 4 trang Page slug ${'phan-mem-cham-cong-<tab>'} (bỏ qua trang đã có)`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileCode className="w-4 h-4" />
            <span>{seedingAttendance ? 'Đang tạo...' : 'Tạo 4 trang Module Chấm công'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Trang Mới</span>
          </button>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Tên Trang</th>
                <th className="py-3.5 px-4">Đường Dẫn (Slug)</th>
                <th className="py-3.5 px-4">Cập Nhật Gần Nhất</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.title}</td>
                  <td className="py-3.5 px-4 font-mono text-blue-600">/{p.slug}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {p.updatedAt.split('T')[0]}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handlePreviewOnWebsite(p.slug)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        title="Xem trên website"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa"
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
      </div>

      {/* Modal Add / Edit Page */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPage ? 'Chỉnh Sửa Trang Tĩnh' : 'Thêm Trang Tĩnh Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề trang *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Đường dẫn tĩnh (Slug)</label>
                <input
                  type="text"
                  placeholder="chinh-sach-bao-hanh"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nội dung chi tiết</label>
                <textarea
                  rows={10}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-mono text-[11px]"
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
                  Lưu Trang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
