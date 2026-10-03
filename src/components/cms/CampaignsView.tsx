import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { CampaignType, CampaignView, Product } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDate, fromDateInput, toDateInput } from '../../utils/format.ts';
import {
  CAMPAIGN_STATE_BADGES,
  CAMPAIGN_STATE_LABELS,
  CAMPAIGN_TABS,
  CAMPAIGN_TYPE_LABELS,
  campaignCountdownLabel
} from '../../utils/commerce.ts';
import { Edit2, Flame, Plus, Power, Search, Trash2, X } from 'lucide-react';

/** Form CMS: field dạng string để bind thẳng vào input (số/ngày convert khi submit). */
interface CampaignForm {
  name: string;
  type: CampaignType;
  startAt: string;
  endAt: string;
  discountPercent: string;
  productIds: string[];
  bannerImage: string;
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
}

const emptyCampaignForm = (): CampaignForm => ({
  name: '',
  type: 'flash_sale',
  startAt: toDateInput(new Date()),
  endAt: '',
  discountPercent: '20',
  productIds: [],
  bannerImage: '',
  ctaText: 'Xem tất cả deal',
  ctaUrl: '/san-pham',
  isActive: true
});

const formFromCampaign = (campaign: CampaignView): CampaignForm => ({
  name: campaign.name || '',
  type: campaign.type,
  startAt: toDateInput(campaign.startAt),
  endAt: toDateInput(campaign.endAt),
  discountPercent: String(campaign.discountPercent ?? 0),
  productIds: [...(campaign.productIds || [])],
  bannerImage: campaign.bannerImage || '',
  ctaText: campaign.ctaText || '',
  ctaUrl: campaign.ctaUrl || '',
  isActive: campaign.isActive
});

export const CampaignsView: React.FC = () => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<string>('all');
  const [list, setList] = useState<CampaignView[]>([]);
  const [allList, setAllList] = useState<CampaignView[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm);

  useEffect(() => {
    void loadList();
  }, [tab, appliedSearch]);

  useEffect(() => {
    void loadStats();
    void loadProducts();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await api.getCampaigns({ state: tab, q: appliedSearch.trim() || undefined });
      if (res.success) setList(res.data);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  /** Danh sách đầy đủ (không lọc) để tính 4 thẻ thống kê. */
  const loadStats = async () => {
    try {
      const res = await api.getCampaigns();
      if (res.success) setAllList(res.data);
    } catch (e) {
      console.error('Failed to load campaign stats:', e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error('Failed to load products for campaign form:', e);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadStats()]);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyCampaignForm());
    setProductSearch('');
    setIsFormOpen(true);
  };

  const openEditForm = (campaign: CampaignView) => {
    setEditingId(campaign.id);
    setForm(formFromCampaign(campaign));
    setProductSearch('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên chiến dịch.', 'error');
      return;
    }
    const startAt = fromDateInput(form.startAt);
    const endAt = fromDateInput(form.endAt);
    if (startAt && endAt && endAt < startAt) {
      showToast('Thời gian kết thúc phải sau thời gian bắt đầu.', 'error');
      return;
    }

    const payload: Partial<CampaignView> = {
      name: form.name.trim(),
      type: form.type,
      startAt,
      endAt,
      discountPercent: Number(form.discountPercent) || 0,
      productIds: form.productIds,
      bannerImage: form.bannerImage.trim(),
      ctaText: form.ctaText.trim(),
      ctaUrl: form.ctaUrl.trim(),
      isActive: form.isActive
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.updateCampaign(editingId, payload)
        : await api.createCampaign(payload);
      if (res.success) {
        showToast(res.message || 'Đã lưu chiến dịch.', 'success');
        setIsFormOpen(false);
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không lưu được chiến dịch.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (campaign: CampaignView) => {
    try {
      const res = await api.updateCampaign(campaign.id, { isActive: !campaign.isActive });
      if (res.success) {
        showToast(`${campaign.isActive ? 'Đã tạm dừng' : 'Đã bật'} “${campaign.name}”.`, 'success');
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không đổi được trạng thái chiến dịch.', 'error');
    }
  };

  const handleDelete = async (campaign: CampaignView) => {
    if (!window.confirm(`Xoá chiến dịch “${campaign.name}”?`)) return;
    try {
      const res = await api.deleteCampaign(campaign.id);
      if (res.success) {
        showToast(res.message || 'Đã xoá chiến dịch.', 'success');
        await refreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Không xoá được chiến dịch.', 'error');
    }
  };

  const runningCount = allList.filter(c => c.state === 'running').length;
  const scheduledCount = allList.filter(c => c.state === 'scheduled').length;
  const endedCount = allList.filter(c => c.state === 'ended').length;
  const filteredProducts = products.filter(p =>
    productSearch.trim() ? p.name.toLowerCase().includes(productSearch.trim().toLowerCase()) : true
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-[#1C86EE]" />
            Chiến Dịch &amp; Flash Sale
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Trang chủ hiển thị chiến dịch đầu tiên đang chạy: tên, mức giảm và đồng hồ đếm ngược theo thời gian kết thúc. Hết thời gian ⇒ khối tự ẩn.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo chiến dịch
        </button>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng chiến dịch', value: String(allList.length) },
          { label: 'Đang chạy', value: String(runningCount) },
          { label: 'Sắp chạy', value: String(scheduledCount) },
          { label: 'Đã kết thúc', value: String(endedCount) }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_TABS.map(item => (
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
              placeholder="Tìm theo tên chiến dịch..."
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

      {/* Bảng chiến dịch */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Chiến dịch</th>
                <th className="px-4 py-3 font-bold">Loại</th>
                <th className="px-4 py-3 font-bold">Thời gian</th>
                <th className="px-4 py-3 font-bold">Mức giảm</th>
                <th className="px-4 py-3 font-bold">Sản phẩm</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Đang tải danh sách chiến dịch...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium">
                    Chưa có chiến dịch nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                list.map(campaign => (
                  <tr key={campaign.id} className="hover:bg-[#1C86EE]/[0.03] align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{campaign.name}</div>
                      {campaign.ctaText && (
                        <div className="text-[10px] text-slate-400">CTA: {campaign.ctaText}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{CAMPAIGN_TYPE_LABELS[campaign.type]}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{formatDate(campaign.startAt)} → {formatDate(campaign.endAt)}</div>
                      {campaign.state === 'running' && (
                        <div className="text-[10px] font-semibold text-emerald-600">
                          Còn {campaignCountdownLabel(campaign.endAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1C86EE]">
                      {campaign.discountPercent ? `${campaign.discountPercent}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {campaign.productIds.length > 0
                        ? `${campaign.productIds.length} sản phẩm`
                        : 'Tự chọn theo mức giảm'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          CAMPAIGN_STATE_BADGES[campaign.state]
                        }`}
                      >
                        {CAMPAIGN_STATE_LABELS[campaign.state]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(campaign)}
                          title="Sửa chiến dịch"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1C86EE] hover:bg-[#1C86EE]/10 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(campaign)}
                          title={campaign.isActive ? 'Tạm dừng' : 'Bật'}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            campaign.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign)}
                          title="Xoá chiến dịch"
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
      {/* Modal tạo / sửa chiến dịch */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}
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
                <span className="text-[11px] font-bold text-slate-600 uppercase">Tên chiến dịch *</span>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Giờ Vàng Săn Deal — Laptop & Tai Nghe"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Loại chiến dịch</span>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as CampaignType })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map(key => (
                    <option key={key} value={key}>{CAMPAIGN_TYPE_LABELS[key]}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Mức giảm hiển thị (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={e => setForm({ ...form, discountPercent: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
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
                <span className="text-[11px] font-bold text-slate-600 uppercase">Kết thúc (đếm ngược)</span>
                <input
                  type="date"
                  value={form.endAt}
                  onChange={e => setForm({ ...form, endAt: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Nhãn nút CTA</span>
                <input
                  value={form.ctaText}
                  onChange={e => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="VD: Xem tất cả deal"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Link nút CTA</span>
                <input
                  value={form.ctaUrl}
                  onChange={e => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="VD: /san-pham"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Ảnh banner (URL)</span>
                <input
                  value={form.bannerImage}
                  onChange={e => setForm({ ...form, bannerImage: e.target.value })}
                  placeholder="Dán URL ảnh banner của chiến dịch"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </label>
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    Sản phẩm thuộc chiến dịch ({form.productIds.length} đã chọn)
                  </span>
                  {form.productIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, productIds: [] })}
                      className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Tìm sản phẩm theo tên..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {filteredProducts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2">Không có sản phẩm nào phù hợp.</p>
                  ) : (
                    filteredProducts.map(product => {
                      const checked = form.productIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm({
                                ...form,
                                productIds: checked
                                  ? form.productIds.filter(id => id !== product.id)
                                  : [...form.productIds, product.id]
                              })
                            }
                            className="text-[#1C86EE]"
                          />
                          <span className="text-[11px] text-slate-700 flex-1">{product.name}</span>
                          <span className="text-[10px] font-bold text-slate-400">{product.sku}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Để trống ⇒ server tự chọn tối đa 4 sản phẩm đang giảm giá nhiều nhất cho khối flash sale.
                </p>
              </div>

              <label className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="text-[#1C86EE]"
                />
                <span className="text-xs font-semibold text-slate-700">Kích hoạt chiến dịch</span>
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
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

