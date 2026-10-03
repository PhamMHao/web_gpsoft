import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { Coupon, CouponApplyTo, CouponDiscountType, CouponView } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDate, fromDateInput, toDateInput } from '../../utils/format.ts';
import {
  COUPON_APPLY_LABELS,
  COUPON_STATE_BADGES,
  COUPON_STATE_LABELS,
  COUPON_TABS,
  couponConditionLabel,
  couponDiscountLabel,
  couponUsageLabel
} from '../../utils/commerce.ts';
import { Edit2, Plus, Power, Search, Tag, Trash2, X } from 'lucide-react';

/** Form CMS: field để dạng string để bind thẳng vào input (số/ngày convert khi submit). */
interface CouponForm {
  code: string;
  name: string;
  discountType: CouponDiscountType;
  value: string;
  minOrder: string;
  maxDiscount: string;
  usageLimit: string;
  startAt: string;
  endAt: string;
  applyTo: CouponApplyTo;
  applyIds: string[];
  isActive: boolean;
}

const emptyCouponForm = (): CouponForm => ({
  code: '',
  name: '',
  discountType: 'percent',
  value: '10',
  minOrder: '0',
  maxDiscount: '',
  usageLimit: '0',
  startAt: toDateInput(new Date()),
  endAt: '',
  applyTo: 'all',
  applyIds: [],
  isActive: true
});

/** Điền form từ mã có sẵn (ngày ISO → `YYYY-MM-DD` cho `<input type="date">`). */
const formFromCoupon = (coupon: Coupon): CouponForm => ({
  code: coupon.code || '',
  name: coupon.name || '',
  discountType: coupon.discountType,
  value: String(coupon.value ?? 0),
  minOrder: String(coupon.minOrder ?? 0),
  maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
  usageLimit: String(coupon.usageLimit ?? 0),
  startAt: toDateInput(coupon.startAt),
  endAt: toDateInput(coupon.endAt),
  applyTo: coupon.applyTo,
  applyIds: [...(coupon.applyIds || [])],
  isActive: coupon.isActive
});


export const CouponsView: React.FC = () => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [list, setList] = useState<CouponView[]>([]);
  const [allList, setAllList] = useState<CouponView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void loadList();
  }, [tab, appliedSearch]);

  useEffect(() => {
    void loadStats();
    void loadRefs();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await api.getCoupons({ state: tab, q: appliedSearch.trim() || undefined });
      if (res.success) setList(res.data);
    } catch (e) {
      console.error('Failed to load coupons:', e);
    } finally {
      setLoading(false);
    }
  };

  /** Danh sách đầy đủ (không lọc) để tính 4 thẻ thống kê. */
  const loadStats = async () => {
    try {
      const res = await api.getCoupons();
      if (res.success) setAllList(res.data);
    } catch (e) {
      console.error('Failed to load coupon stats:', e);
    }
  };

  /** Nạp danh mục + sản phẩm cho ô chọn phạm vi áp dụng (`applyTo !== 'all'`). */
  const loadRefs = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([api.getCategories(), api.getProducts()]);
      if (catRes.success) setCategories(catRes.data.map(c => ({ id: c.id, name: c.name })));
      if (prodRes.success) setProducts(prodRes.data.map(p => ({ id: p.id, name: p.name })));
    } catch (e) {
      console.error('Failed to load coupon references:', e);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadStats()]);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyCouponForm());
    setIsFormOpen(true);
  };

  const openEditForm = (coupon: CouponView) => {
    setEditingId(coupon.id);
    setForm(formFromCoupon(coupon));
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Vui lòng nhập mã và tên chương trình giảm giá.', 'error');
      return;
    }
    const payload: Partial<Coupon> = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discountType: form.discountType,
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: Number(form.usageLimit) || 0,
      startAt: fromDateInput(form.startAt),
      endAt: fromDateInput(form.endAt),
      applyTo: form.applyTo,
      applyIds: form.applyTo === 'all' ? [] : form.applyIds,
      isActive: form.isActive
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.updateCoupon(editingId, payload)
        : await api.createCoupon(payload);
      if (res.success) {
        showToast(res.message || 'Đã lưu mã giảm giá.', 'success');
        setIsFormOpen(false);
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không lưu được mã giảm giá.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: CouponView) => {
    try {
      const res = await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      if (res.success) {
        showToast(`${coupon.isActive ? 'Đã tạm dừng' : 'Đã bật'} mã ${coupon.code}.`, 'success');
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không đổi được trạng thái mã.', 'error');
    }
  };

  const handleDelete = async (coupon: CouponView) => {
    if (!window.confirm(`Xoá vĩnh viễn mã ${coupon.code}?`)) return;
    try {
      const res = await api.deleteCoupon(coupon.id);
      if (res.success) {
        showToast(res.message || 'Đã xoá mã giảm giá.', 'success');
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không xoá được mã giảm giá.', 'error');
    }
  };

  const activeCount = allList.filter(c => c.state === 'ok').length;
  const usedUpCount = allList.filter(c => c.state === 'used_up').length;
  const totalUsed = allList.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0);
  const scopeOptions = form.applyTo === 'category' ? categories : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#1C86EE]" />
            Mã Giảm Giá &amp; Khuyến Mãi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mã nhập ở giỏ hàng được server kiểm tra độc lập: hiệu lực, lượt dùng, giá trị tối thiểu và phạm vi áp dụng.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo mã giảm giá
        </button>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng mã', value: String(allList.length) },
          { label: 'Đang chạy', value: String(activeCount) },
          { label: 'Đã hết lượt', value: String(usedUpCount) },
          { label: 'Lượt đã dùng', value: String(totalUsed) }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc theo trạng thái + tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-2">
          {COUPON_TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                tab === item.id
                  ? 'bg-[#1C86EE] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

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
              placeholder="Tìm theo mã hoặc tên chương trình giảm giá..."
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

      {/* Bảng mã giảm giá */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Mã / Chương trình</th>
                <th className="px-4 py-3 font-bold">Mức giảm</th>
                <th className="px-4 py-3 font-bold">Điều kiện</th>
                <th className="px-4 py-3 font-bold">Lượt dùng</th>
                <th className="px-4 py-3 font-bold">Thời gian</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Đang tải danh sách mã giảm giá...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Chưa có mã giảm giá nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                list.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-[#1C86EE]/[0.03] align-top">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 tracking-wide">{coupon.code}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 max-w-[240px]">{coupon.name}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1C86EE]">{couponDiscountLabel(coupon)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px]">{couponConditionLabel(coupon)}</td>
                    <td className="px-4 py-3 text-slate-600">{couponUsageLabel(coupon)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(coupon.startAt)} → {formatDate(coupon.endAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          COUPON_STATE_BADGES[coupon.state]
                        }`}
                      >
                        {COUPON_STATE_LABELS[coupon.state]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(coupon)}
                          title="Sửa mã"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1C86EE] hover:bg-[#1C86EE]/10 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(coupon)}
                          title={coupon.isActive ? 'Tạm dừng mã' : 'Bật mã'}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            coupon.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          title="Xoá mã"
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

      {/* Modal tạo / sửa mã giảm giá */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'}
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
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Mã giảm giá *</span>
                <input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="VD: VIP10"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Tên chương trình *</span>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Khách VIP giảm 10%"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Kiểu giảm</span>
                <select
                  value={form.discountType}
                  onChange={e => setForm({ ...form, discountType: e.target.value as CouponDiscountType })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (đ)</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">
                  {form.discountType === 'percent' ? 'Mức giảm (%)' : 'Mức giảm (đ)'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Đơn tối thiểu (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.minOrder}
                  onChange={e => setForm({ ...form, minOrder: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Giảm tối đa (đ)</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="Bỏ trống = không giới hạn"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Giới hạn lượt dùng</span>
                <input
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="0 = không giới hạn"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Phạm vi áp dụng</span>
                <select
                  value={form.applyTo}
                  onChange={e => setForm({ ...form, applyTo: e.target.value as CouponApplyTo, applyIds: [] })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  {(Object.keys(COUPON_APPLY_LABELS) as CouponApplyTo[]).map(key => (
                    <option key={key} value={key}>{COUPON_APPLY_LABELS[key]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Bắt đầu</span>
                <input
                  type="date"
                  value={form.startAt}
                  onChange={e => setForm({ ...form, startAt: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Kết thúc</span>
                <input
                  type="date"
                  value={form.endAt}
                  onChange={e => setForm({ ...form, endAt: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              {form.applyTo !== 'all' && (
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    {form.applyTo === 'category' ? 'Chọn danh mục áp dụng' : 'Chọn sản phẩm áp dụng'}
                  </span>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {scopeOptions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-2">Đang tải danh sách...</p>
                    ) : (
                      scopeOptions.map(option => {
                        const checked = form.applyIds.includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm({
                                  ...form,
                                  applyIds: checked
                                    ? form.applyIds.filter(id => id !== option.id)
                                    : [...form.applyIds, option.id]
                                })
                              }
                              className="text-[#1C86EE]"
                            />
                            <span className="text-[11px] text-slate-700">{option.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <label className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="text-[#1C86EE]"
                />
                <span className="text-xs font-semibold text-slate-700">Kích hoạt mã ngay</span>
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
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mã'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
