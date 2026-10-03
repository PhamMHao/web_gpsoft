import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { Product, Warranty, WarrantyStatus, WarrantyType } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDate, formatVnd, fromDateInput, toDateInput } from '../../utils/format.ts';
import {
  WARRANTY_PROGRESS,
  WARRANTY_STATUS_BADGES,
  WARRANTY_STATUS_LABELS,
  WARRANTY_STATUS_ORDER,
  WARRANTY_TABS,
  WARRANTY_TYPE_LABELS,
  WarrantyTab,
  countExpiredWarranties,
  countProcessingWarranties,
  countWarrantiesByStatus,
  warrantyDaysLeft,
  warrantyEndDatePreview,
  warrantyRemainingBadge,
  warrantyTabById,
  warrantyTimeline
} from '../../utils/warranty.ts';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  UserCog,
  Wrench,
  X
} from 'lucide-react';

/** Form CMS: mọi field để dạng string để bind trực tiếp vào input (số/ngày được convert khi submit). */
interface WarrantyForm {
  code: string;
  customerName: string;
  phone: string;
  email: string;
  productId: string;
  serialNumber: string;
  purchaseDate: string;
  startDate: string;
  warrantyMonths: string;
  warrantyType: WarrantyType;
  status: WarrantyStatus;
  issue: string;
  diagnosis: string;
  resolution: string;
  technician: string;
  cost: string;
  receivedAt: string;
  returnedAt: string;
}

const emptyWarrantyForm = (): WarrantyForm => ({
  code: '',
  customerName: '',
  phone: '',
  email: '',
  productId: '',
  serialNumber: '',
  purchaseDate: toDateInput(new Date()),
  startDate: toDateInput(new Date()),
  warrantyMonths: '12',
  warrantyType: 'nha_san_xuat',
  status: 'received',
  issue: '',
  diagnosis: '',
  resolution: '',
  technician: '',
  cost: '0',
  receivedAt: toDateInput(new Date()),
  returnedAt: ''
});

/** Điền form từ phiếu có sẵn (ngày ISO → `YYYY-MM-DD` cho `<input type="date">`). */
const formFromWarranty = (warranty: Warranty): WarrantyForm => ({
  code: warranty.code || '',
  customerName: warranty.customerName || '',
  phone: warranty.phone || '',
  email: warranty.email || '',
  productId: warranty.productId || '',
  serialNumber: warranty.serialNumber || '',
  purchaseDate: toDateInput(warranty.purchaseDate),
  startDate: toDateInput(warranty.startDate),
  warrantyMonths: String(warranty.warrantyMonths ?? 12),
  warrantyType: warranty.warrantyType,
  status: warranty.status,
  issue: warranty.issue || '',
  diagnosis: warranty.diagnosis || '',
  resolution: warranty.resolution || '',
  technician: warranty.technician || '',
  cost: String(warranty.cost ?? 0),
  receivedAt: toDateInput(warranty.receivedAt),
  returnedAt: toDateInput(warranty.returnedAt)
});

export const WarrantyView: React.FC = () => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<WarrantyTab>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [list, setList] = useState<Warranty[]>([]);
  // Danh sách đầy đủ (không lọc) để tính 4 thẻ thống kê + số trên tab.
  const [allList, setAllList] = useState<Warranty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarrantyForm>(emptyWarrantyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Warranty | null>(null);
  const [detailStatus, setDetailStatus] = useState<WarrantyStatus>('received');
  const [printing, setPrinting] = useState<Warranty | null>(null);
  // Gán nhanh kỹ thuật viên ngay trên dòng (ROADMAP P1.2 bước 6) — modal nhỏ, không rời trang.
  const [assignTarget, setAssignTarget] = useState<Warranty | null>(null);
  const [assignName, setAssignName] = useState('');
  const [assigning, setAssigning] = useState(false);

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
      const tabQuery = warrantyTabById(tab).query;
      const res = await api.getWarranties({ ...tabQuery, q: appliedSearch.trim() || undefined });
      if (res.success) setList(res.data);
    } catch (e) {
      console.error('Failed to load warranties:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getWarranties();
      if (res.success) setAllList(res.data);
    } catch (e) {
      console.error('Failed to load warranty stats:', e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error('Failed to load products for warranty form:', e);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadStats()]);
  };

  const openCreateForm = () => {
    setForm(emptyWarrantyForm());
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (warranty: Warranty) => {
    setForm(formFromWarranty(warranty));
    setEditingId(warranty.id);
    setDetail(null);
    setIsFormOpen(true);
  };

  const buildPayload = (): Partial<Warranty> => {
    const product = products.find(item => item.id === form.productId);
    const startDate = fromDateInput(form.startDate) || fromDateInput(form.purchaseDate);
    return {
      code: form.code.trim() || undefined,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      productId: form.productId,
      productName: product?.name || form.productId,
      serialNumber: form.serialNumber.trim() || undefined,
      purchaseDate: fromDateInput(form.purchaseDate) || startDate,
      startDate,
      warrantyMonths: Math.max(0, Math.trunc(Number(form.warrantyMonths)) || 0),
      warrantyType: form.warrantyType,
      status: form.status,
      issue: form.issue.trim(),
      diagnosis: form.diagnosis.trim() || undefined,
      resolution: form.resolution.trim() || undefined,
      technician: form.technician.trim() || undefined,
      cost: Math.max(0, Math.trunc(Number(String(form.cost).replace(/[^\d]/g, '')) || 0)),
      receivedAt: fromDateInput(form.receivedAt),
      returnedAt: fromDateInput(form.returnedAt)
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      showToast('Vui lòng nhập tên khách hàng.', 'error');
      return;
    }
    if (!form.phone.trim()) {
      showToast('Vui lòng nhập số điện thoại liên hệ.', 'error');
      return;
    }
    if (!form.productId) {
      showToast('Vui lòng chọn sản phẩm cần bảo hành.', 'error');
      return;
    }
    if (!form.issue.trim()) {
      showToast('Vui lòng mô tả tình trạng máy khi tiếp nhận.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const res = editingId
        ? await api.updateWarranty(editingId, payload)
        : await api.createWarranty(payload);
      if (res.success) {
        showToast(editingId ? 'Đã cập nhật phiếu bảo hành!' : `Đã tiếp nhận phiếu ${res.data.code}!`, 'success');
        setIsFormOpen(false);
        setEditingId(null);
        await refreshAll();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lưu phiếu bảo hành thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (id: string, status: WarrantyStatus) => {
    try {
      const res = await api.updateWarranty(id, { status });
      if (res.success) {
        showToast(`Đã chuyển trạng thái sang “${WARRANTY_STATUS_LABELS[status]}”.`, 'success');
        setList(prev => prev.map(item => (item.id === id ? { ...item, ...res.data } : item)));
        setDetail(prev => (prev && prev.id === id ? { ...prev, ...res.data } : prev));
        await refreshAll();
      }
    } catch {
      showToast('Cập nhật trạng thái thất bại.', 'error');
    }
  };

  const handleDelete = async (warranty: Warranty) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phiếu ${warranty.code} của ${warranty.customerName}?`)) return;
    try {
      const res = await api.deleteWarranty(warranty.id);
      if (res.success) {
        showToast(res.message || 'Đã xóa phiếu bảo hành.', 'success');
        setDetail(null);
        await refreshAll();
      }
    } catch {
      showToast('Xóa phiếu bảo hành thất bại.', 'error');
    }
  };

  const openDetail = (warranty: Warranty) => {
    setDetail(warranty);
    setDetailStatus(warranty.status);
  };

  const handlePrint = (warranty: Warranty) => {
    setPrinting(warranty);
    // Chờ React render xong khối in (`.print:block`) rồi mới mở hộp thoại in — giống PriceListPage.
    window.setTimeout(() => window.print(), 100);
  };

  /** KTV đã từng phụ trách (suy từ chính dữ liệu, không cần bảng nhân sự) → gợi ý qua `<datalist>`. */
  const technicianSuggestions = Array.from(
    new Set(allList.map(item => (item.technician || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'vi'));

  const openAssign = (warranty: Warranty) => {
    setAssignTarget(warranty);
    setAssignName(warranty.technician || '');
  };

  /** Gán / đổi / bỏ phân công KTV — gửi đúng 1 field nên không ghi đè các field khác của phiếu. */
  const handleAssignTechnician = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignTarget) return;
    const name = assignName.trim();
    try {
      setAssigning(true);
      const res = await api.updateWarranty(assignTarget.id, { technician: name });
      if (res.success) {
        showToast(
          name ? `Đã gán ${name} phụ trách phiếu ${assignTarget.code}.` : `Đã bỏ phân công phiếu ${assignTarget.code}.`,
          'success'
        );
        setAssignTarget(null);
        await refreshAll();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gán kỹ thuật viên thất bại.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const statusCounts = countWarrantiesByStatus(allList);
  const processingCount = countProcessingWarranties(allList);
  const expiredCount = countExpiredWarranties(allList);
  const tabCount = (id: WarrantyTab) => {
    if (id === 'processing') return processingCount;
    if (id === 'returned') return statusCounts.returned;
    if (id === 'expired') return expiredCount;
    return allList.length;
  };
  const endDatePreview = warrantyEndDatePreview(fromDateInput(form.startDate), Number(form.warrantyMonths) || 0);

  /** Cập nhật một phần form (mọi input đều bind qua đây để tránh sót state). */
  const updateField = (patch: Partial<WarrantyForm>) => setForm(prev => ({ ...prev, ...patch }));

  return (
    <>
      <div className={`space-y-6 animate-in fade-in duration-200 ${printing ? 'print:hidden' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Bảo Hành & Tiếp Nhận Sửa Chữa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý phiếu tiếp nhận, tiến độ sửa chữa, hạn bảo hành và chi phí phát sinh của từng máy
            </p>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tiếp nhận bảo hành</span>
          </button>
        </div>

        {/* 4 thẻ thống kê */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng phiếu</span>
              <Wrench className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{allList.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đang xử lý</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{processingCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã trả khách</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{statusCounts.returned}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hết bảo hành</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{expiredCount}</div>
          </div>
        </div>

        {/* Sub-tab lọc nhanh (dùng đúng tham số server P1.1: status nhiều giá trị / expired) */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
          {WARRANTY_TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                tab === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  tab === item.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                }`}
              >
                {tabCount(item.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Ô tìm kiếm: gửi lên `?q=` (server khớp mã phiếu / serial / SĐT / tên khách / tên sản phẩm) */}
        <form
          onSubmit={e => {
            e.preventDefault();
            setAppliedSearch(search);
          }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo mã phiếu, serial, SĐT, tên khách hoặc tên sản phẩm..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            Tìm kiếm
          </button>
          {(search || appliedSearch) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
        </form>


        {/* Danh sách phiếu */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Phiếu</th>
                  <th className="px-4 py-3 font-bold">Khách hàng</th>
                  <th className="px-4 py-3 font-bold">Sản phẩm / Serial</th>
                  <th className="px-4 py-3 font-bold">Thời hạn bảo hành</th>
                  <th className="px-4 py-3 font-bold">Tiến độ xử lý</th>
                  <th className="px-4 py-3 font-bold">Kỹ thuật viên</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Đang tải danh sách phiếu bảo hành...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Chưa có phiếu bảo hành nào khớp bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  list.map(warranty => {
                    const remaining = warrantyRemainingBadge(warranty.endDate);
                    const daysLeft = warrantyDaysLeft(warranty.endDate);
                    return (
                      <tr key={warranty.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <div className="font-black text-slate-900">{warranty.code}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Tạo {formatDate(warranty.createdAt)}
                          </div>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                            {WARRANTY_TYPE_LABELS[warranty.warrantyType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-bold text-slate-800">{warranty.customerName}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {warranty.phone}
                          </div>
                          {warranty.email && (
                            <div className="text-[10px] text-slate-400 mt-0.5 break-all">{warranty.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top max-w-[220px]">
                          <div className="font-semibold text-slate-800 line-clamp-2">{warranty.productName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Serial: {warranty.serialNumber || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{warranty.issue}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-[11px] text-slate-500">
                            Mua {formatDate(warranty.purchaseDate)}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700">
                            Hạn {formatDate(warranty.endDate)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{warranty.warrantyMonths} tháng</div>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${remaining.className}`}
                          >
                            {remaining.label}
                          </span>
                          {daysLeft !== null && daysLeft >= 0 && (
                            <span className="ml-1 text-[10px] text-slate-400">còn {daysLeft} ngày</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top min-w-[190px]">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                              WARRANTY_STATUS_BADGES[warranty.status]
                            }`}
                          >
                            {WARRANTY_STATUS_LABELS[warranty.status]}
                          </span>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${WARRANTY_PROGRESS[warranty.status]}%` }}
                            />
                          </div>
                          <select
                            value={warranty.status}
                            onChange={e => void handleQuickStatus(warranty.id, e.target.value as WarrantyStatus)}
                            className="mt-2 w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            {WARRANTY_STATUS_ORDER.map(status => (
                              <option key={status} value={status}>
                                {WARRANTY_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-slate-700">{warranty.technician || 'Chưa phân công'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Chi phí:{' '}
                            <span className="font-bold text-slate-800">{formatVnd(warranty.cost || 0)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Trả khách: {warranty.returnedAt ? formatDate(warranty.returnedAt) : '—'}
                          </div>
                        </td>


                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetail(warranty)}
                              title="Xem chi tiết & tiến độ"
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrint(warranty)}
                              title="In phiếu tiếp nhận"
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAssign(warranty)}
                              title="Gán kỹ thuật viên"
                              className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 cursor-pointer"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditForm(warranty)}
                              title="Sửa phiếu"
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => void handleDelete(warranty)}
                              title="Xóa phiếu"
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Modal tiếp nhận / cập nhật phiếu bảo hành */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {editingId ? 'Cập nhật phiếu bảo hành' : 'Tiếp nhận phiếu bảo hành mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[68vh] overflow-y-auto">
              {/* 1. Khách hàng */}
              <section className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  1. Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên khách hàng *</label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={e => updateField({ customerName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Số điện thoại / Zalo *
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => updateField({ phone: e.target.value })}
                      placeholder="09xx xxx xxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email nhận thông báo</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => updateField({ email: e.target.value })}
                      placeholder="khachhang@congty.vn"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mã phiếu (bỏ trống để tự sinh)
                    </label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => updateField({ code: e.target.value })}
                      placeholder="BH-2026-0001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                    />
                  </div>
                </div>
              </section>

              {/* 2. Sản phẩm & thời hạn bảo hành */}
              <section className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  2. Sản phẩm & thời hạn bảo hành
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Sản phẩm trong hệ thống *</label>
                    <select
                      value={form.productId}
                      onChange={e => updateField({ productId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    >
                      <option value="">— Chọn sản phẩm —</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số serial / IMEI</label>
                    <input
                      type="text"
                      value={form.serialNumber}
                      onChange={e => updateField({ serialNumber: e.target.value })}
                      placeholder="C02XT1ABCD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày mua</label>
                    <input
                      type="date"
                      value={form.purchaseDate}
                      onChange={e => updateField({ purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày bắt đầu tính bảo hành</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => updateField({ startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số tháng bảo hành</label>
                    <input
                      type="number"
                      min={0}
                      value={form.warrantyMonths}
                      onChange={e => updateField({ warrantyMonths: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Loại bảo hành</label>
                    <select
                      value={form.warrantyType}
                      onChange={e => updateField({ warrantyType: e.target.value as WarrantyType })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    >
                      <option value="nha_san_xuat">{WARRANTY_TYPE_LABELS.nha_san_xuat}</option>
                      <option value="mo_rong">{WARRANTY_TYPE_LABELS.mo_rong}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái phiếu</label>
                    <select
                      value={form.status}
                      onChange={e => updateField({ status: e.target.value as WarrantyStatus })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    >
                      {WARRANTY_STATUS_ORDER.map(status => (
                        <option key={status} value={status}>
                          {WARRANTY_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-700">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Hạn bảo hành dự kiến:{' '}
                      <strong className="font-black">{endDatePreview ? formatDate(endDatePreview) : '—'}</strong> (tính
                      theo ngày bắt đầu + số tháng, server tự chốt khi lưu)
                    </span>
                  </div>
                </div>
              </section>

              {/* 3. Tiếp nhận & xử lý kỹ thuật */}
              <section className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  3. Tiếp nhận & xử lý kỹ thuật
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tình trạng máy khi tiếp nhận *
                    </label>
                    <textarea
                      rows={2}
                      value={form.issue}
                      onChange={e => updateField({ issue: e.target.value })}
                      placeholder="Ví dụ: máy sập nguồn đột ngột, bàn phím liệt 3 phím, pin chai còn 71%..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chẩn đoán / Kết quả kiểm tra kỹ thuật
                    </label>
                    <textarea
                      rows={2}
                      value={form.diagnosis}
                      onChange={e => updateField({ diagnosis: e.target.value })}
                      placeholder="Ví dụ: chết IC nguồn, chập main do ẩm; không có dấu hiệu rơi vỡ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Phương án xử lý & hẹn trả khách
                    </label>
                    <textarea
                      rows={2}
                      value={form.resolution}
                      onChange={e => updateField({ resolution: e.target.value })}
                      placeholder="Ví dụ: thay IC nguồn trong bảo hành, hoàn tất 25/09 và hẹn khách tới nhận"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Kỹ thuật viên phụ trách</label>
                    <input
                      type="text"
                      value={form.technician}
                      onChange={e => updateField({ technician: e.target.value })}
                      placeholder="Trần Văn Bình"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chi phí phát sinh (VND, ngoài bảo hành)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.cost}
                      onChange={e => updateField({ cost: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày tiếp nhận máy</label>
                    <input
                      type="date"
                      value={form.receivedAt}
                      onChange={e => updateField({ receivedAt: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày trả khách</label>
                    <input
                      type="date"
                      value={form.returnedAt}
                      onChange={e => updateField({ returnedAt: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo phiếu & in'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal chi tiết phiếu & tiến độ xử lý */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Phiếu {detail.code}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                      WARRANTY_STATUS_BADGES[detail.status]
                    }`}
                  >
                    {WARRANTY_STATUS_LABELS[detail.status]}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                      warrantyRemainingBadge(detail.endDate).className
                    }`}
                  >
                    {warrantyRemainingBadge(detail.endDate).label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {WARRANTY_TYPE_LABELS[detail.warrantyType]} · {detail.warrantyMonths} tháng · tạo{' '}
                  {formatDate(detail.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[62vh] overflow-y-auto">
              {/* Tiến độ xử lý */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                  <span>Tiến độ xử lý</span>
                  <span className="text-blue-600">{WARRANTY_PROGRESS[detail.status]}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${WARRANTY_PROGRESS[detail.status]}%` }}
                  />
                </div>
                <ol className="mt-4 space-y-2">
                  {warrantyTimeline(detail.status).map(step => (
                    <li key={step.key} className="flex items-start gap-2 text-[11px]">
                      <span
                        className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          step.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                        } ${step.active ? 'ring-2 ring-emerald-200' : ''}`}
                      >
                        {step.done ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                      </span>
                      <span className={step.active ? 'font-black text-slate-900' : 'text-slate-600'}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              {/* Khách hàng & sản phẩm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Khách hàng</h4>
                  <div className="text-xs font-bold text-slate-800">{detail.customerName}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {detail.phone}
                  </div>
                  {detail.email && <div className="text-[11px] text-slate-500 break-all">{detail.email}</div>}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sản phẩm</h4>
                  <div className="text-xs font-bold text-slate-800">{detail.productName}</div>
                  <div className="text-[11px] text-slate-600">Serial: {detail.serialNumber || '—'}</div>
                  <div className="text-[11px] text-slate-500">
                    Mua {formatDate(detail.purchaseDate)} · BH từ {formatDate(detail.startDate)} đến{' '}
                    {formatDate(detail.endDate)}
                  </div>
                </div>
              </div>

              {/* Nội dung xử lý */}
              <div className="space-y-2 text-[11px]">
                <div>
                  <span className="font-black text-slate-500 uppercase text-[10px]">Tình trạng khi tiếp nhận</span>
                  <p className="text-slate-700 mt-0.5">{detail.issue || '—'}</p>
                </div>
                <div>
                  <span className="font-black text-slate-500 uppercase text-[10px]">Chẩn đoán kỹ thuật</span>
                  <p className="text-slate-700 mt-0.5">{detail.diagnosis || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <span className="font-black text-slate-500 uppercase text-[10px]">Phương án xử lý</span>
                  <p className="text-slate-700 mt-0.5">{detail.resolution || 'Chưa cập nhật'}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400">Kỹ thuật viên</span>
                    <div className="font-bold text-slate-800">{detail.technician || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Chi phí phát sinh</span>
                    <div className="font-bold text-slate-800">{formatVnd(detail.cost || 0)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Tiếp nhận</span>
                    <div className="font-bold text-slate-800">
                      {detail.receivedAt ? formatDate(detail.receivedAt) : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Trả khách</span>
                    <div className="font-bold text-slate-800">
                      {detail.returnedAt ? formatDate(detail.returnedAt) : '—'}
                    </div>
                  </div>
                </div>
              </div>
              {/* Cập nhật nhanh trạng thái */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-blue-700">Cập nhật trạng thái:</span>
                <select
                  value={detailStatus}
                  onChange={e => setDetailStatus(e.target.value as WarrantyStatus)}
                  className="flex-1 min-w-[160px] px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  {WARRANTY_STATUS_ORDER.map(status => (
                    <option key={status} value={status}>
                      {WARRANTY_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void handleQuickStatus(detail.id, detailStatus)}
                  disabled={detailStatus === detail.status}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                >
                  Lưu trạng thái
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => void handleDelete(detail)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa phiếu
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(detail)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In phiếu
                </button>
                <button
                  onClick={() => openEditForm(detail)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Sửa phiếu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gán nhanh kỹ thuật viên (từ icon trên dòng) */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleAssignTechnician} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">Gán Kỹ Thuật Viên</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-0.5">
                <div className="font-bold text-slate-800">
                  {assignTarget.code} · {assignTarget.customerName}
                </div>
                <div className="text-slate-500">
                  {assignTarget.productName} {assignTarget.serialNumber ? `· Serial ${assignTarget.serialNumber}` : ''}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kỹ thuật viên phụ trách</label>
                <input
                  autoFocus
                  list="warranty-technician-suggestions"
                  value={assignName}
                  onChange={e => setAssignName(e.target.value)}
                  placeholder="VD: Lê Anh Tuấn"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500"
                />
                <datalist id="warranty-technician-suggestions">
                  {technicianSuggestions.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1">Để trống rồi Lưu nếu muốn bỏ phân công.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {assigning ? 'Đang lưu...' : 'Lưu phân công'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bản in phiếu tiếp nhận bảo hành (Ctrl+P) */}
      {printing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 print:static print:block print:bg-white print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 print:m-0 print:shadow-none print:w-full print:rounded-none">
            {/* Action bar — ẩn khi in */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="font-bold text-xs text-slate-700">
                Xem trước phiếu tiếp nhận bảo hành {printing.code}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Bắt Đầu In</span>
                </button>
                <button
                  onClick={() => setPrinting(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nội dung phiếu */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-800 text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">GPSOFT STORE</h1>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Hệ thống bán lẻ &amp; dịch vụ kỹ thuật công nghệ
                  </div>
                  <div className="text-[11px] text-slate-500">Hotline: 1900 8888 · gpsoft.vn</div>
                </div>
                <div className="text-right">
                  <div className="font-bold uppercase tracking-wider">Phiếu tiếp nhận bảo hành</div>
                  <div className="font-mono text-xs font-bold text-slate-600 mt-1">Số: {printing.code}</div>
                  <div className="text-[11px] text-slate-400">Ngày lập: {formatDate(printing.createdAt)}</div>
                  <div className="text-[11px] text-slate-400">{WARRANTY_TYPE_LABELS[printing.warrantyType]}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Khách hàng</div>
                  <div className="font-bold text-slate-900 text-sm">{printing.customerName}</div>
                  <div className="text-slate-600 font-mono">{printing.phone}</div>
                  {printing.email && <div className="text-slate-600 break-all">{printing.email}</div>}
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Sản phẩm tiếp nhận
                  </div>
                  <div className="font-bold text-slate-900">{printing.productName}</div>
                  <div className="text-slate-600">
                    Serial / IMEI: <strong className="font-mono">{printing.serialNumber || '—'}</strong>
                  </div>
                  <div className="text-slate-600">Ngày mua: {formatDate(printing.purchaseDate)}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">BH từ ngày</div>
                  <div className="font-bold text-slate-900">{formatDate(printing.startDate)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">BH đến ngày</div>
                  <div className="font-bold text-slate-900">{formatDate(printing.endDate)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Thời hạn</div>
                  <div className="font-bold text-slate-900">{printing.warrantyMonths} tháng</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Tình trạng hạn BH</div>
                  <div className="font-bold text-slate-900">{warrantyRemainingBadge(printing.endDate).label}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Tình trạng máy khi tiếp nhận
                  </div>
                  <div className="text-slate-800 leading-relaxed mt-0.5">{printing.issue || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Chẩn đoán kỹ thuật
                  </div>
                  <div className="text-slate-800 leading-relaxed mt-0.5">
                    {printing.diagnosis || 'Kỹ thuật viên cập nhật sau khi kiểm tra'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Phương án xử lý &amp; hẹn trả
                  </div>
                  <div className="text-slate-800 leading-relaxed mt-0.5">
                    {printing.resolution || 'GPSOFT sẽ liên hệ xác nhận trước khi thực hiện'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Kỹ thuật viên</div>
                  <div className="font-semibold text-slate-800">{printing.technician || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Ngày tiếp nhận</div>
                  <div className="font-semibold text-slate-800">
                    {printing.receivedAt ? formatDate(printing.receivedAt) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Chi phí phát sinh</div>
                  <div className="font-semibold text-slate-800">{formatVnd(printing.cost || 0)}</div>
                </div>
              </div>

              <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4">
                <li>Khách hàng vui lòng mang phiếu này khi tới nhận máy.</li>
                <li>Bảo hành không áp dụng cho hư hỏng do rơi vỡ, vào nước, cháy nổ hoặc sửa chữa nơi khác.</li>
                <li>GPSOFT lưu dữ liệu tối đa 30 ngày; khách hàng tự sao lưu dữ liệu quan trọng trước khi gửi máy.</li>
              </ul>

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="text-center">
                  <div className="font-bold text-slate-700">Khách hàng</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-700">Kỹ thuật viên tiếp nhận</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};





