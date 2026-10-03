import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { PriceQuote, PriceQuoteItem, PriceQuoteStatus, Product, QuoteLink } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDate, formatVnd, fromDateInput, toDateInput } from '../../utils/format.ts';
import {
  QUOTE_STATUS_BADGES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_ORDER,
  QUOTE_TABS,
  QUOTE_UNITS,
  amountInWords,
  countQuotesByStatus,
  quoteSubtotal,
  quoteValidityLabel
} from '../../utils/quote.ts';
import { pathFor } from '../../utils/url.ts';
import {
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Link2,
  Lock,
  Plus,
  Search,
  Ticket,
  Trash2,
  Unlock,
  X
} from 'lucide-react';

/** Form CMS: field để dạng string để bind trực tiếp vào input (convert khi submit). */
interface QuoteForm {
  code: string;
  title: string;
  customerName: string;
  phone: string;
  email: string;
  company: string;
  note: string;
  status: PriceQuoteStatus;
  validUntil: string;
}

/** 1 dòng hàng trong form — `qty`/`unitPrice` để string vì `<input>` trả string. */
interface QuoteItemRow {
  name: string;
  spec: string;
  unit: string;
  qty: string;
  unitPrice: string;
}

const emptyQuoteForm = (): QuoteForm => ({
  code: '',
  title: '',
  customerName: '',
  phone: '',
  email: '',
  company: '',
  note: '',
  status: 'draft',
  // Mặc định hiệu lực 30 ngày (khớp `QUOTE_VALID_DAYS` phía server).
  validUntil: toDateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
});

const formFromQuote = (quote: PriceQuote): QuoteForm => ({
  code: quote.code || '',
  title: quote.title || '',
  customerName: quote.customerName || '',
  phone: quote.phone || '',
  email: quote.email || '',
  company: quote.company || '',
  note: quote.note || '',
  status: quote.status,
  validUntil: toDateInput(quote.validUntil)
});

const rowsFromItems = (items: PriceQuoteItem[]): QuoteItemRow[] =>
  items.map(item => ({
    name: item.name,
    spec: item.spec || '',
    unit: item.unit || 'Chiếc',
    qty: String(item.qty),
    unitPrice: String(item.unitPrice)
  }));

/** Dòng hàng trắng — dùng cho nút “Thêm dòng”. */
const emptyRow = (): QuoteItemRow => ({ name: '', spec: '', unit: 'Chiếc', qty: '1', unitPrice: '0' });

/** Số tiền trong form: bỏ mọi ký tự không phải chữ số (`45.990.000đ` → `45990000`). */
const numberFromInput = (value: string): number => {
  const digits = String(value).replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

/** Class dùng chung cho input/select trong form (giữ 1 chỗ, không lặp chuỗi dài). */
const inputCls =
  'mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden';

/** Nhãn + control — dùng cho mọi field trong form báo giá. */
const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label,
  className,
  children
}) => (
  <div className={className}>
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export const QuotesView: React.FC = () => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<'all' | PriceQuoteStatus>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [list, setList] = useState<PriceQuote[]>([]);
  // Danh sách không lọc — dùng cho 4 thẻ thống kê + số trên sub-tab.
  const [allList, setAllList] = useState<PriceQuote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteForm>(emptyQuoteForm);
  const [rows, setRows] = useState<QuoteItemRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<PriceQuote | null>(null);
  const [detailLinks, setDetailLinks] = useState<QuoteLink[]>([]);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkDays, setLinkDays] = useState('30');
  const [creatingLink, setCreatingLink] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      const res = await api.getPriceQuotes({
        status: tab === 'all' ? undefined : tab,
        q: appliedSearch.trim() || undefined
      });
      if (res.success) setList(res.data);
    } catch (e) {
      console.error('Failed to load price quotes:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getPriceQuotes();
      if (res.success) setAllList(res.data);
    } catch (e) {
      console.error('Failed to load price quote stats:', e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error('Failed to load products for quote form:', e);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadStats()]);
  };

  const openCreateForm = () => {
    setForm(emptyQuoteForm());
    setRows([emptyRow()]);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (quote: PriceQuote) => {
    setForm(formFromQuote(quote));
    setRows(quote.items.length > 0 ? rowsFromItems(quote.items) : [emptyRow()]);
    setEditingId(quote.id);
    setDetail(null);
    setFormOpen(true);
  };

  /** Đổi 1 field của 1 dòng hàng (mọi input đều đi qua đây để không sót state). */
  const updateRow = (index: number, patch: Partial<QuoteItemRow>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  /**
   * “Chọn từ sản phẩm” — điền sẵn tên/quy cách/đơn giá từ kho sản phẩm vào dòng trắng đầu tiên
   * (hoặc thêm dòng mới nếu mọi dòng đã có tên). Admin vẫn sửa được mọi ô sau đó.
   */
  const addRowFromProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const filled: QuoteItemRow = {
      name: product.name,
      spec: [product.sku, product.condition === 'new' ? 'Mới 100%' : product.condition === 'like_new' ? 'Like New 99%' : 'Đã qua sử dụng']
        .filter(Boolean)
        .join(' · '),
      unit: 'Chiếc',
      qty: '1',
      unitPrice: String(product.salePrice || 0)
    };
    setRows(prev => {
      const blankIndex = prev.findIndex(row => !row.name.trim());
      if (blankIndex === -1) return [...prev, filled];
      return prev.map((row, i) => (i === blankIndex ? filled : row));
    });
  };

  /** Rows → payload gửi API (`total` không gửi — server tự tính). */
  const buildItemsPayload = (): PriceQuoteItem[] =>
    rows
      .filter(row => row.name.trim().length > 0)
      .map(row => {
        const qty = Math.max(0, Math.trunc(numberFromInput(row.qty)));
        const unitPrice = Math.max(0, numberFromInput(row.unitPrice));
        return {
          name: row.name.trim(),
          spec: row.spec.trim() || undefined,
          unit: row.unit.trim() || 'Chiếc',
          qty,
          unitPrice,
          total: qty * unitPrice
        };
      });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      showToast('Vui lòng nhập tên khách hàng và số điện thoại.', 'error');
      return;
    }
    const items = buildItemsPayload();
    if (items.length === 0) {
      showToast('Báo giá cần ít nhất 1 dòng hàng có tên.', 'error');
      return;
    }

    const payload: Partial<PriceQuote> = {
      code: form.code.trim() || undefined,
      title: form.title.trim() || undefined,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      company: form.company.trim() || undefined,
      note: form.note.trim() || undefined,
      status: form.status,
      validUntil: fromDateInput(form.validUntil),
      items
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.updatePriceQuote(editingId, payload)
        : await api.createPriceQuote(payload);
      if (res.success) {
        showToast(
          editingId ? `Đã cập nhật báo giá ${res.data.code}!` : `Đã tạo báo giá ${res.data.code} (${formatVnd(res.data.total)})!`,
          'success'
        );
        setFormOpen(false);
        setEditingId(null);
        await refreshAll();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lưu báo giá thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (quote: PriceQuote) => {
    if (!window.confirm(`Bạn có chắc muốn xóa báo giá ${quote.code} của ${quote.customerName}? Mọi link chia sẻ của báo giá này cũng bị thu hồi.`)) return;
    try {
      const res = await api.deletePriceQuote(quote.id);
      if (res.success) {
        showToast(res.message || 'Đã xóa báo giá.', 'success');
        setDetail(null);
        await refreshAll();
      }
    } catch {
      showToast('Xóa báo giá thất bại.', 'error');
    }
  };

  const handleQuickStatus = async (quote: PriceQuote, status: PriceQuoteStatus) => {
    try {
      const res = await api.updatePriceQuote(quote.id, { status });
      if (res.success) {
        showToast(`Đã chuyển ${quote.code} sang “${QUOTE_STATUS_LABELS[status]}”.`, 'success');
        setDetail(prev => (prev && prev.id === quote.id ? { ...prev, ...res.data } : prev));
        await refreshAll();
      }
    } catch {
      showToast('Cập nhật trạng thái thất bại.', 'error');
    }
  };

  /* ------------------------------------------------------------------
     Link chia sẻ (P1.5) — tạo/thu hồi/bật-tắt/copy URL `/bao-gia/<mã>`
     ------------------------------------------------------------------ */
  const openDetail = async (quote: PriceQuote) => {
    setDetail(quote);
    setDetailLinks([]);
    setLinkPassword('');
    setLinkDays('30');
    try {
      const res = await api.getPriceQuote(quote.id);
      if (res.success) {
        setDetail(res.data);
        setDetailLinks(res.links || []);
      }
    } catch (e) {
      console.error('Failed to load quote detail:', e);
    }
  };

  /** URL tuyệt đối để copy cho khách (dựng từ `pathFor` — §D.11, không viết tay chuỗi URL). */
  const shareUrl = (code: string): string => {
    const path = pathFor('quote-detail', { quoteCode: code });
    return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message, 'success');
    } catch {
      // Trình duyệt chặn clipboard (http không bảo mật) ⇒ vẫn cho admin copy tay.
      window.prompt('Sao chép thủ công đường dẫn sau:', text);
    }
  };

  const handleCreateLink = async () => {
    if (!detail) return;
    try {
      setCreatingLink(true);
      const days = Math.max(1, Math.trunc(Number(linkDays) || 30));
      const res = await api.createQuoteLink({
        quoteId: detail.id,
        password: linkPassword.trim() || undefined,
        expiresInDays: days
      });
      if (res.success) {
        setDetailLinks(prev => [res.data, ...prev]);
        setLinkPassword('');
        showToast(`Đã tạo link chia sẻ ${res.data.code}.`, 'success');
        await copyText(shareUrl(res.data.code), `Đã copy link ${res.data.code} vào clipboard!`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tạo link chia sẻ thất bại.', 'error');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleToggleLink = async (link: QuoteLink) => {
    try {
      const res = await api.updateQuoteLink(link.id, { isActive: !link.isActive });
      if (res.success) {
        setDetailLinks(prev => prev.map(item => (item.id === link.id ? res.data : item)));
        showToast(res.data.isActive ? `Đã bật lại link ${link.code}.` : `Đã tắt link ${link.code} (khách mở sẽ thấy 404).`, 'success');
      }
    } catch {
      showToast('Cập nhật link thất bại.', 'error');
    }
  };

  /** Đặt / đổi / gỡ mật khẩu link — ô trống ⇒ gỡ mật khẩu (link công khai). */
  const handlePasswordLink = async (link: QuoteLink) => {
    const next = window.prompt(
      `Mật khẩu cho link ${link.code} (để trống rồi OK = gỡ mật khẩu):`,
      link.password || ''
    );
    if (next === null) return;
    try {
      const res = await api.updateQuoteLink(link.id, { password: next.trim() });
      if (res.success) {
        setDetailLinks(prev => prev.map(item => (item.id === link.id ? res.data : item)));
        showToast(next.trim() ? `Đã đặt mật khẩu cho link ${link.code}.` : `Đã gỡ mật khẩu link ${link.code}.`, 'success');
      }
    } catch {
      showToast('Cập nhật mật khẩu thất bại.', 'error');
    }
  };

  const handleRevokeLink = async (link: QuoteLink) => {
    if (!window.confirm(`Thu hồi vĩnh viễn link ${link.code}? Khách đang giữ link này sẽ không mở được nữa.`)) return;
    try {
      const res = await api.deleteQuoteLink(link.id);
      if (res.success) {
        setDetailLinks(prev => prev.filter(item => item.id !== link.id));
        showToast(res.message || 'Đã thu hồi link chia sẻ.', 'success');
      }
    } catch {
      showToast('Thu hồi link thất bại.', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await api.downloadPriceQuoteCsv({
        status: tab === 'all' ? undefined : tab,
        q: appliedSearch.trim() || undefined
      });
      showToast('Đã xuất file CSV báo giá.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xuất CSV thất bại.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const statusCounts = countQuotesByStatus(allList);
  const pendingCount = statusCounts.draft + statusCounts.sent;
  const acceptedValue = allList
    .filter(quote => quote.status === 'accepted')
    .reduce((sum, quote) => sum + quote.total, 0);
  const tabCount = (id: 'all' | PriceQuoteStatus) => (id === 'all' ? allList.length : statusCounts[id]);
  const formTotal = quoteSubtotal(buildItemsPayload());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Báo Giá & Link Chia Sẻ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lập báo giá doanh nghiệp, tổng tiền do server cộng và gửi khách đường dẫn `/bao-gia/&lt;mã&gt;`
            (đặt được mật khẩu, hạn xem và theo dõi lượt mở).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Đang xuất...' : 'Xuất CSV'}</span>
          </button>
          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo báo giá</span>
          </button>
        </div>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng báo giá</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{allList.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cần theo dõi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Nháp + đã gửi khách</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Khách đồng ý</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{statusCounts.accepted}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Giá trị đã chốt</span>
            <Ticket className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-600 mt-1 truncate">{formatVnd(acceptedValue)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Σ báo giá “Khách đồng ý”</div>
        </div>
      </div>

      {/* Sub-tab trạng thái */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
        {QUOTE_TABS.map(item => (
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

      {/* Ô tìm kiếm: `?q=` khớp mã / tiêu đề / tên khách / công ty / SĐT (server lọc) */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã báo giá, tiêu đề, tên khách, công ty hoặc SĐT..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">
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

      {/* Bảng báo giá */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-bold">Báo giá</th>
                <th className="px-4 py-3 font-bold">Khách hàng</th>
                <th className="px-4 py-3 font-bold">Dòng hàng</th>
                <th className="px-4 py-3 font-bold">Hiệu lực</th>
                <th className="px-4 py-3 font-bold text-right">Tổng tiền</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Đang tải danh sách báo giá...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Chưa có báo giá nào khớp bộ lọc. Bấm “Tạo báo giá” để lập phiếu đầu tiên.
                  </td>
                </tr>
              ) : (
                list.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{quote.code}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{quote.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{quote.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {quote.phone}
                        {quote.company ? ` · ${quote.company}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {quote.items.length} dòng
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {quote.items.map(item => item.name).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-medium">{formatDate(quote.validUntil, 'date')}</div>
                      <div className={`text-[11px] font-semibold ${quote.isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {quoteValidityLabel(quote.validUntil)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatVnd(quote.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-bold ${QUOTE_STATUS_BADGES[quote.status]}`}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(quote)}
                          title="Xem & tạo link chia sẻ"
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(quote)}
                          title="Sửa báo giá"
                          className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(quote)}
                          title="Xóa báo giá"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
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


      {/* ---------------------------------------------------------------
          Modal tạo / sửa: dòng hàng động + tổng realtime (`quoteSubtotal`).
          Tổng này chỉ để admin xem trước — server luôn tính lại khi lưu.
          --------------------------------------------------------------- */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8">
          <form onSubmit={handleSubmit} className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{editingId ? 'Sửa báo giá' : 'Tạo báo giá mới'}</h3>
                <p className="text-[11px] text-slate-500">
                  Để trống mã ⇒ server tự sinh `BG-&lt;năm&gt;-&lt;4 số&gt;`. Tổng tiền server cộng từ “Số lượng × Đơn giá”.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tiêu đề báo giá" className="sm:col-span-2">
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Báo giá 3 bộ MacBook Pro 14 inch cho phòng IT"
                    className={inputCls}
                  />
                </Field>
                <Field label="Khách hàng *">
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Nguyễn Văn Hùng"
                    className={inputCls}
                  />
                </Field>
                <Field label="Số điện thoại *">
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="0977889900"
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="khach@congty.vn"
                    className={inputCls}
                  />
                </Field>
                <Field label="Công ty">
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="Công ty CP …"
                    className={inputCls}
                  />
                </Field>
                <Field label="Mã báo giá">
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="Để trống để tự sinh"
                    className={`${inputCls} uppercase`}
                  />
                </Field>
                <Field label="Hiệu lực đến">
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={e => setForm({ ...form, validUntil: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Trạng thái">
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as PriceQuoteStatus })}
                    className={inputCls}
                  >
                    {QUOTE_STATUS_ORDER.map(status => (
                      <option key={status} value={status}>
                        {QUOTE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ghi chú cho khách" className="sm:col-span-2">
                  <textarea
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    rows={2}
                    placeholder="Bàn giao trong 7 ngày, giá đã gồm VAT..."
                    className={`${inputCls} font-normal`}
                  />
                </Field>
              </div>


              {/* Bảng dòng hàng */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Dòng hàng ({rows.length})</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value=""
                      onChange={e => addRowFromProduct(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer max-w-[280px]"
                    >
                      <option value="">+ Chọn từ sản phẩm…</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.sku} — {product.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm dòng</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2 font-bold min-w-[220px]">Tên hàng</th>
                          <th className="px-3 py-2 font-bold min-w-[180px]">Quy cách</th>
                          <th className="px-3 py-2 font-bold">ĐVT</th>
                          <th className="px-3 py-2 font-bold w-20">SL</th>
                          <th className="px-3 py-2 font-bold w-32">Đơn giá</th>
                          <th className="px-3 py-2 font-bold text-right w-32">Thành tiền</th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row, index) => {
                          const qty = Math.max(0, Math.trunc(numberFromInput(row.qty)));
                          const unitPrice = Math.max(0, numberFromInput(row.unitPrice));
                          return (
                            <tr key={index}>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={e => updateRow(index, { name: e.target.value })}
                                  placeholder="Tên thiết bị / dịch vụ"
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-900 focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.spec}
                                  onChange={e => updateRow(index, { spec: e.target.value })}
                                  placeholder="Cấu hình / ghi chú"
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={row.unit}
                                  onChange={e => updateRow(index, { unit: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-900 cursor-pointer"
                                >
                                  {QUOTE_UNITS.map(unit => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                  {!QUOTE_UNITS.includes(row.unit) && <option value={row.unit}>{row.unit}</option>}
                                </select>
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.qty}
                                  onChange={e => updateRow(index, { qty: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-900 focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.unitPrice}
                                  onChange={e => updateRow(index, { unitPrice: e.target.value })}
                                  placeholder="0"
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-900 text-right focus:outline-hidden"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-black text-slate-900">{formatVnd(qty * unitPrice)}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeRow(index)}
                                  disabled={rows.length <= 1}
                                  title={rows.length <= 1 ? 'Báo giá cần ít nhất 1 dòng' : 'Xóa dòng'}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tổng realtime + nút lưu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng báo giá (xem trước)</div>
                  <div className="text-xl font-black text-blue-700">{formatVnd(formTotal)}</div>
                  <div className="text-[10px] text-slate-400">{amountInWords(formTotal)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật báo giá' : 'Tạo báo giá'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}


      {/* ---------------------------------------------------------------
          Modal chi tiết: xem phiếu + toàn bộ thao tác Link chia sẻ (P1.5)
          --------------------------------------------------------------- */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{detail.code}</h3>
                <p className="text-[11px] text-slate-500">{detail.title}</p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Thông tin khách + trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách hàng</div>
                  <div className="font-bold text-slate-900">{detail.customerName}</div>
                  <div className="text-slate-500">{detail.phone}</div>
                  {detail.email && <div className="text-slate-500">{detail.email}</div>}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Công ty</div>
                  <div className="font-semibold text-slate-800">{detail.company || '—'}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Tạo bởi {detail.createdBy} · {formatDate(detail.createdAt, 'date')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hiệu lực</div>
                  <div className="font-semibold text-slate-800">{formatDate(detail.validUntil, 'date')}</div>
                  <div className={`text-[11px] font-semibold ${detail.isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {quoteValidityLabel(detail.validUntil)}
                  </div>
                </div>
              </div>

              {/* Đổi nhanh trạng thái */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trạng thái:</span>
                {QUOTE_STATUS_ORDER.map(status => (
                  <button
                    key={status}
                    onClick={() => handleQuickStatus(detail, status)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition-colors ${
                      detail.status === status ? QUOTE_STATUS_BADGES[status] : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {QUOTE_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>

              {/* Bảng dòng hàng của phiếu (chỉ đọc) */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 font-bold">Tên hàng</th>
                        <th className="px-3 py-2 font-bold">ĐVT</th>
                        <th className="px-3 py-2 font-bold text-right">SL</th>
                        <th className="px-3 py-2 font-bold text-right">Đơn giá</th>
                        <th className="px-3 py-2 font-bold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            {item.spec && <div className="text-[10px] text-slate-500">{item.spec}</div>}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{item.unit}</td>
                          <td className="px-3 py-2 text-right text-slate-700 font-bold">{item.qty}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{formatVnd(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-black text-slate-900">{formatVnd(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng báo giá</span>
                  <span className="text-lg font-black text-blue-700">{formatVnd(detail.total)}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Bằng chữ: {amountInWords(detail.total)}</div>
                {detail.note && <div className="text-[11px] text-slate-500 mt-2">Ghi chú: {detail.note}</div>}
              </div>


              {/* Link chia sẻ (P1.5 bước 3–4) */}
              <div className="border border-slate-100 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Link chia sẻ cho khách</h4>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Mật khẩu (tùy chọn)">
                    <input
                      type="text"
                      value={linkPassword}
                      onChange={e => setLinkPassword(e.target.value)}
                      placeholder="Để trống = link công khai"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Hạn xem (ngày)">
                    <input
                      type="number"
                      min={1}
                      value={linkDays}
                      onChange={e => setLinkDays(e.target.value)}
                      className={`${inputCls} w-28`}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={handleCreateLink}
                    disabled={creatingLink}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {creatingLink ? 'Đang tạo...' : 'Tạo link chia sẻ'}
                  </button>
                </div>

                {detailLinks.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    Chưa có link nào. Bấm “Tạo link chia sẻ” rồi gửi URL cho khách — khách mở là xem được phiếu in.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detailLinks.map(link => (
                      <div
                        key={link.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60"
                      >
                        <div className="min-w-[180px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-xs text-slate-900">/bao-gia/{link.code}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                link.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {link.isActive ? 'Đang bật' : 'Đã tắt'}
                            </span>
                            {link.password && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                <Lock className="w-3 h-3" />
                                Có mật khẩu
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Hết hạn {formatDate(link.expiresAt, 'date')} · {link.viewCount} lượt xem
                          </div>
                        </div>


                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyText(shareUrl(link.code), `Đã copy link ${link.code} vào clipboard!`)}
                            title="Copy URL gửi khách"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy URL
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(shareUrl(link.code), '_blank', 'noopener')}
                            title="Mở thử như khách"
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLink(link)}
                            title={link.isActive ? 'Tắt link' : 'Bật lại link'}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            {link.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePasswordLink(link)}
                            title={link.password ? 'Đổi / gỡ mật khẩu' : 'Đặt mật khẩu'}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            {link.password ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeLink(link)}
                            title="Thu hồi link"
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer hành động */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(detail)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                >
                  Xóa báo giá
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(detail)}
                  className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-bold cursor-pointer"
                >
                  Sửa báo giá
                </button>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


