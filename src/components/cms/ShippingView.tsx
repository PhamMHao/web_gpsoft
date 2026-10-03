import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { ShippingMethod } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatVnd } from '../../utils/format.ts';
import { Edit2, Plus, Power, Search, Trash2, Truck, X } from 'lucide-react';

/** Form CMS: số để dạng string để bind thẳng vào input; `regions` là chuỗi ngăn cách bởi dấu phẩy. */
interface ShippingForm {
  name: string;
  description: string;
  fee: string;
  freeFrom: string;
  estimatedDays: string;
  regions: string;
  isActive: boolean;
  sortOrder: string;
}

const emptyShippingForm = (): ShippingForm => ({
  name: '',
  description: '',
  fee: '30000',
  freeFrom: '1000000',
  estimatedDays: '2–4 ngày',
  regions: '',
  isActive: true,
  sortOrder: ''
});

const formFromMethod = (method: ShippingMethod): ShippingForm => ({
  name: method.name || '',
  description: method.description || '',
  fee: String(method.fee ?? 0),
  freeFrom: String(method.freeFrom ?? 0),
  estimatedDays: method.estimatedDays || '',
  regions: (method.regions || []).join(', '),
  isActive: method.isActive,
  sortOrder: String(method.sortOrder ?? 0)
});

export const ShippingView: React.FC = () => {
  const { showToast } = useApp();
  const [list, setList] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingForm>(emptyShippingForm);

  useEffect(() => {
    void loadList();
  }, [appliedSearch]);

  /** CMS truyền `all: true` để thấy cả phương thức đang TẮT (website chỉ nhận phương thức bật). */
  const loadList = async () => {
    try {
      setLoading(true);
      const res = await api.getShippingMethods({ all: true, q: appliedSearch.trim() || undefined });
      if (res.success) setList(res.data);
    } catch (e) {
      console.error('Failed to load shipping methods:', e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...emptyShippingForm(), sortOrder: String(list.length + 1) });
    setIsFormOpen(true);
  };

  const openEditForm = (method: ShippingMethod) => {
    setEditingId(method.id);
    setForm(formFromMethod(method));
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên phương thức vận chuyển.', 'error');
      return;
    }
    const payload: Partial<ShippingMethod> = {
      name: form.name.trim(),
      description: form.description.trim(),
      fee: Number(form.fee) || 0,
      freeFrom: Number(form.freeFrom) || 0,
      estimatedDays: form.estimatedDays.trim(),
      regions: form.regions
        .split(',')
        .map(region => region.trim())
        .filter(Boolean),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || list.length + 1
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.updateShippingMethod(editingId, payload)
        : await api.createShippingMethod(payload);
      if (res.success) {
        showToast(res.message || 'Đã lưu phương thức vận chuyển.', 'success');
        setIsFormOpen(false);
        await loadList();
      }
    } catch (err: any) {
      showToast(err.message || 'Không lưu được phương thức vận chuyển.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (method: ShippingMethod) => {
    try {
      const res = await api.updateShippingMethod(method.id, { isActive: !method.isActive });
      if (res.success) {
        showToast(`${method.isActive ? 'Đã tạm dừng' : 'Đã bật'} “${method.name}”.`, 'success');
        await loadList();
      }
    } catch (err: any) {
      showToast(err.message || 'Không đổi được trạng thái phương thức.', 'error');
    }
  };

  const handleDelete = async (method: ShippingMethod) => {
    if (!window.confirm(`Xoá phương thức “${method.name}”? Đơn cũ đã lưu phí nên không bị ảnh hưởng.`)) return;
    try {
      const res = await api.deleteShippingMethod(method.id);
      if (res.success) {
        showToast(res.message || 'Đã xoá phương thức vận chuyển.', 'success');
        await loadList();
      }
    } catch (err: any) {
      showToast(err.message || 'Không xoá được phương thức vận chuyển.', 'error');
    }
  };

  const activeCount = list.filter(m => m.isActive).length;
  const cheapestFee = list.reduce(
    (min, m) => (m.isActive && m.fee < min ? m.fee : min),
    list.length > 0 ? list[0].fee : 0
  );
  const lowestFreeFrom = list.reduce((min, m) => {
    if (!m.isActive || m.freeFrom <= 0) return min;
    return min === 0 || m.freeFrom < min ? m.freeFrom : min;
  }, 0);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#1C86EE]" />
            Phương Thức &amp; Phí Vận Chuyển
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giỏ hàng và đơn hàng đọc trực tiếp dữ liệu này — đổi phí hoặc ngưỡng freeship là website cập nhật ngay, không cần build lại.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phương thức
        </button>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng phương thức', value: String(list.length) },
          { label: 'Đang bật', value: String(activeCount) },
          { label: 'Phí thấp nhất', value: list.length > 0 ? formatVnd(cheapestFee) : '—' },
          { label: 'Freeship từ', value: lowestFreeFrom > 0 ? formatVnd(lowestFreeFrom) : 'Không có' }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form
          onSubmit={e => {
            e.preventDefault();
            setAppliedSearch(search);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả phương thức vận chuyển..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Bảng phương thức vận chuyển */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Phương thức</th>
                <th className="px-4 py-3 font-bold">Phí giao</th>
                <th className="px-4 py-3 font-bold">Freeship từ</th>
                <th className="px-4 py-3 font-bold">Thời gian</th>
                <th className="px-4 py-3 font-bold">Khu vực</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Đang tải danh sách phương thức vận chuyển...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Chưa có phương thức vận chuyển nào.
                  </td>
                </tr>
              ) : (
                list.map(method => (
                  <tr key={method.id} className="hover:bg-[#1C86EE]/[0.03] align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{method.name}</div>
                      {method.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-2 max-w-[260px]">{method.description}</div>
                      )}
                      <div className="text-[10px] text-slate-400">Thứ tự: {method.sortOrder}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1C86EE]">{formatVnd(method.fee)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {method.freeFrom > 0 ? formatVnd(method.freeFrom) : 'Luôn thu phí'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{method.estimatedDays}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                      {method.regions.length === 0 ? 'Toàn quốc' : method.regions.join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          method.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {method.isActive ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(method)}
                          title="Sửa phương thức"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1C86EE] hover:bg-[#1C86EE]/10 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(method)}
                          title={method.isActive ? 'Tạm dừng' : 'Bật'}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            method.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(method)}
                          title="Xoá phương thức"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal thêm / sửa phương thức vận chuyển */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Sửa phương thức vận chuyển' : 'Thêm phương thức vận chuyển'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Tên phương thức *</span>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Giao hỏa tốc 2 giờ"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
                />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Mô tả</span>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Nội thành Hà Nội & TP.HCM, nhận hàng trong 2 giờ"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Phí giao hàng (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={e => setForm({ ...form, fee: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Miễn phí từ (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.freeFrom}
                  onChange={e => setForm({ ...form, freeFrom: e.target.value })}
                  placeholder="0 = luôn thu phí"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Thời gian dự kiến</span>
                <input
                  value={form.estimatedDays}
                  onChange={e => setForm({ ...form, estimatedDays: e.target.value })}
                  placeholder="VD: Trong 2 giờ / 2–4 ngày"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Thứ tự hiển thị</span>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Khu vực áp dụng</span>
                <input
                  value={form.regions}
                  onChange={e => setForm({ ...form, regions: e.target.value })}
                  placeholder="Bỏ trống = toàn quốc. Nhiều khu vực cách nhau dấu phẩy"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="text-[#1C86EE]"
                />
                <span className="text-xs font-semibold text-slate-700">Cho khách chọn phương thức này ở giỏ hàng</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm phương thức'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

