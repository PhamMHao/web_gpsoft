import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Service, ServiceProcessStep, ServiceFAQ } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { slugify } from '../../utils/format.ts';
import { WEB_DESIGN_SERVICE_SEED, WEB_DESIGN_SERVICE_SLUG } from '../../utils/webDesign.ts';

export const ServicesView: React.FC = () => {
  const { showToast } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  // P2.3 — dùng ĐÚNG tên field mà trang public đọc (`priceRange`/`processSteps`/`faqs`).
  // Trước đây form gửi `priceEstimate`/`process`/`faq` ⇒ server lưu field lạ ⇒ trang public tự dựng
  // nội dung tĩnh và thay đổi của admin không bao giờ hiển thị. Server vẫn nhận tên cũ
  // (`server/service.ts`) cho dữ liệu cũ, nhưng UI mới luôn ghi tên chuẩn để round-trip không mất dữ liệu.
  const [form, setForm] = useState({
    title: '',
    slug: '',
    icon: 'Wrench',
    shortDesc: '',
    content: '',
    priceRange: 'Liên hệ',
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    processSteps: [] as ServiceProcessStep[],
    faqs: [] as ServiceFAQ[]
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await api.getServices();
      if (res.success) setServices(res.data);
    } catch (e) {
      console.error('Failed to load services:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setForm({
      title: '',
      slug: '',
      icon: 'Wrench',
      shortDesc: '',
      content: '',
      priceRange: 'Từ 200.000đ',
      thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      processSteps: [
        { step: 1, title: 'Tiếp nhận & Kiểm tra', desc: 'Kỹ thuật viên test toàn diện thiết bị' },
        { step: 2, title: 'Báo giá & Giải pháp', desc: 'Minh bạch linh kiện thay thế' },
        { step: 3, title: 'Tiến hành sửa chữa', desc: 'Thực hiện trực tiếp trong phòng Lab' },
        { step: 4, title: 'Bàn giao & Bảo hành', desc: 'Dán tem bảo hành và bàn giao khách' }
      ],
      faqs: [
        { q: 'Thời gian bảo hành dịch vụ là bao lâu?', a: 'Từ 6 đến 12 tháng tùy loại linh kiện thay thế.' }
      ]
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setForm({
      title: s.title,
      slug: s.slug,
      icon: s.icon,
      shortDesc: s.shortDesc,
      content: s.content,
      // P2.3 — đọc được cả bản ghi cũ (`priceEstimate`/`process`/`faq` từ DB chưa migrate).
      priceRange: s.priceRange || s.priceEstimate || 'Liên hệ',
      thumbnail: s.thumbnail,
      processSteps: s.processSteps || s.process || [],
      faqs: s.faqs || s.faq || []
    });
    setModalOpen(true);
  };

  /** P2.3 — tạo `Service` slug `thiet-ke-website` cho trang public (idempotent, không ghi đè bản admin đã sửa). */
  const handleSeedWebDesign = async () => {
    if (services.some(s => s.slug === WEB_DESIGN_SERVICE_SLUG)) {
      showToast('Dịch vụ "Thiết kế website" đã tồn tại.', 'info');
      return;
    }
    try {
      await api.createService(WEB_DESIGN_SERVICE_SEED);
      showToast('Đã tạo dịch vụ "Thiết kế website" — trang /thiet-ke-website sẽ đọc nội dung này.', 'success');
      loadServices();
    } catch {
      showToast('Tạo dịch vụ thất bại.', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      icon: form.icon,
      shortDesc: form.shortDesc,
      content: form.content,
      priceRange: form.priceRange,
      thumbnail: form.thumbnail,
      processSteps: form.processSteps,
      faqs: form.faqs
    };

    try {
      if (editingService) {
        await api.updateService(editingService.id, payload);
        showToast('Cập nhật dịch vụ thành công!', 'success');
      } else {
        await api.createService(payload);
        showToast('Thêm dịch vụ mới thành công!', 'success');
      }
      setModalOpen(false);
      loadServices();
    } catch {
      showToast('Lưu dịch vụ thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Xóa dịch vụ "${title}"?`)) return;
    try {
      await api.deleteService(id);
      showToast('Đã xóa dịch vụ!', 'success');
      loadServices();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Dịch Vụ Kỹ Thuật
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình các gói dịch vụ sửa chữa, bảo hành và chính sách đi kèm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* P2.3 — DB cũ (seed trước P2.3) chưa có service này; nút này tạo đúng payload dùng chung với trang public. */}
          <button
            onClick={handleSeedWebDesign}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-xs cursor-pointer"
            title="Tạo dịch vụ cho trang /thiet-ke-website (bỏ qua nếu đã có)"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo dịch vụ Thiết kế website</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Dịch Vụ Mới</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(s => (
          <div
            key={s.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden flex flex-col justify-between"
          >
            <div className="aspect-video relative bg-slate-100">
              <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                {s.priceRange || s.priceEstimate}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.shortDesc}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  Quy trình: {s.processSteps?.length || s.process?.length || 0} bước •{' '}
                  {s.faqs?.length || s.faq?.length || 0} câu hỏi FAQ
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.title)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Service */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingService ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên dịch vụ *</label>
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
                  <label className="font-bold text-slate-700">Mức giá tham khảo</label>
                  <input
                    type="text"
                    value={form.priceRange}
                    onChange={e => setForm({ ...form, priceRange: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-bold text-blue-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ảnh đại diện (URL)</label>
                  <input
                    type="text"
                    value={form.thumbnail}
                    onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả tóm tắt</label>
                <textarea
                  rows={2}
                  value={form.shortDesc}
                  onChange={e => setForm({ ...form, shortDesc: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Chi tiết dịch vụ</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
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
                  Lưu Dịch Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
