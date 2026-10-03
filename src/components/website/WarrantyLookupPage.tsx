/**
 * P1.3 — Trang tra cứu bảo hành công khai (`/bao-hanh`).
 *
 * Luồng: khách nhập **SĐT / số serial / mã phiếu** → `api.lookupWarranty()` (route công khai
 * `GET /api/warranties/lookup`, xem `server/routes.ts:553`) → hiển thị card kết quả gồm ảnh + tên
 * sản phẩm, ngày mua, thời hạn bảo hành, **số ngày còn lại** (badge xanh > 30 / vàng 1–30 / đỏ hết hạn)
 * và trạng thái phiếu sửa chữa.
 *
 * Quy ước (ROADMAP §D mục 9): enum/trạng thái KHÔNG tự viết lại ở đây — mọi nhãn/badge màu lấy từ
 * `src/utils/warranty.ts` để trang công khai và CMS `WarrantyView` luôn khớp nhau.
 *
 * Server không khớp ⇒ trả `200 + data: []` (hiện empty state lịch sự); `q` < 4 ký tự ⇒ `400` (chặn
 * sớm ở client bằng `LOOKUP_MIN_LENGTH` để tránh request thừa).
 *
 * Hỗ trợ link chia sẻ dạng `/bao-hanh?q=0912345678`: `?q=` được đọc lúc mount nên F5/dán link vào
 * tab mới là tra ngay (P0.1 — URL là nguồn sự thật).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { WarrantyLookupItem } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { faqJsonLd, seoDefaults, setSeo } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { WARRANTY_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { formatDate, formatVnd } from '../../utils/format.ts';
import {
  WARRANTY_PROGRESS,
  WARRANTY_STATUS_BADGES,
  WARRANTY_STATUS_LABELS,
  WARRANTY_TYPE_LABELS,
  warrantyRemainingBadge
} from '../../utils/warranty.ts';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
  PackageSearch,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench
} from 'lucide-react';

/** Trùng `LOOKUP_MIN_LENGTH` ở `server/warranty.ts` — chặn ở client để không nhận lỗi 400 vô ích. */
const LOOKUP_MIN_LENGTH = 4;

/** Hotline dự phòng khi CMS (`SettingsView`) chưa cấu hình. */
const FALLBACK_HOTLINE = '1900 8888';

/** Khối “Chính sách bảo hành” cuối trang — nội dung tĩnh, không lấy từ DB. */
const WARRANTY_POLICY = [
  'Bảo hành 24 tháng cho máy mới 100%: 12 tháng theo hãng + 12 tháng mở rộng tại GPSOFT.',
  'Bảo hành 12 tháng cho máy Like New 99% và các dòng đã qua sử dụng đã kiểm định.',
  '1 đổi 1 trong 15 ngày đầu nếu lỗi do nhà sản xuất, máy còn đủ phụ kiện và không trầy xước.',
  'Không áp dụng bảo hành với hư hỏng do rơi vỡ, vào nước, cháy nổ hoặc sửa chữa ở nơi khác.',
  'Thời gian xử lý trung bình 24–72 giờ; máy chờ linh kiện sẽ được thông báo tiến độ qua SĐT.'
];

/** FAQ hiển thị thật trên trang + sinh JSON-LD `FAQPage` (Google yêu cầu nội dung phải nhìn thấy được). */
const WARRANTY_FAQS = [
  {
    question: 'Tra cứu bảo hành được bằng những thông tin nào?',
    answer:
      'Bạn có thể tra cứu bằng mã phiếu (VD BH-2026-0001), số serial in trên thân máy/hộp, hoặc số điện thoại đã dùng khi mua hàng. Chỉ cần nhập tối thiểu 4 ký tự, hệ thống khớp chính xác và bảo mật — không hiển thị thông tin của khách hàng khác.'
  },
  {
    question: 'Phiếu báo “Từ chối bảo hành” là do đâu?',
    answer:
      'Phiếu bị từ chối khi máy rơi vỡ, vào nước, có dấu hiệu can thiệp/sửa chữa bên ngoài, hoặc hết hạn bảo hành. Kỹ thuật viên luôn ghi rõ lý do trong phần chẩn đoán và liên hệ trực tiếp với khách trước khi xử lý.'
  },
  {
    question: 'Đã hết hạn bảo hành thì có được hỗ trợ không?',
    answer:
      'Có. GPSOFT vẫn nhận kiểm tra và sửa chữa tính phí với giá linh kiện công khai, đồng thời ưu đãi 10% công sửa chữa cho khách đã mua máy tại GPSOFT.'
  }
];

/** 3 bước hướng dẫn hiển thị ở trạng thái ban đầu (chưa tra cứu). */
const LOOKUP_STEPS = [
  { title: 'Nhập thông tin', desc: 'Số điện thoại mua hàng, số serial trên máy hoặc mã phiếu bảo hành.' },
  { title: 'Nhận kết quả', desc: 'Xem hạn bảo hành còn lại và tình trạng sửa chữa theo thời gian thực.' },
  { title: 'Gửi yêu cầu', desc: 'Nếu cần bảo hành, gửi yêu cầu ngay để kỹ thuật viên liên hệ lại trong 15 phút.' }
];
export const WarrantyLookupPage: React.FC = () => {
  const { openQuoteModal, settings, seoSettings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(() => searchParams.get('q')?.trim() || '');
  const [results, setResults] = useState<WarrantyLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** Từ khoá của lần tra cứu gần nhất ⇒ phân biệt “chưa tra” với “đã tra nhưng không có kết quả”. */
  const [lookedUpTerm, setLookedUpTerm] = useState('');

  const hotline = settings?.hotline || FALLBACK_HOTLINE;

  const runLookup = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (value.length < LOOKUP_MIN_LENGTH) {
      setResults([]);
      setLookedUpTerm('');
      setError(
        `Vui lòng nhập tối thiểu ${LOOKUP_MIN_LENGTH} ký tự: số điện thoại, số serial hoặc mã phiếu bảo hành.`
      );
      return;
    }

    try {
      setLoading(true);
      setError('');
      setLookedUpTerm(value);
      const res = await api.lookupWarranty(value);
      setResults(res.data || []);
    } catch (err) {
      // 400 (thiếu ký tự) hoặc lỗi mạng/máy chủ ⇒ thông báo lịch sự, KHÔNG log lỗi ra console.
      setResults([]);
      setError(err instanceof Error ? err.message : 'Chưa tra cứu được, vui lòng thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  }, []);

  // P0.1 — `/bao-hanh?q=...` được tra ngay khi vào trang (F5 / dán link / Back-Forward).
  useEffect(() => {
    const initial = searchParams.get('q')?.trim();
    if (initial && initial.length >= LOOKUP_MIN_LENGTH) void runLookup(initial);
    // Chỉ chạy 1 lần theo `?q=` lúc mount; các lần sau đi qua form nên không phụ thuộc `searchParams`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = keyword.trim();
    // Ghi `?q=` để link tra cứu share được và Back/Forward giữ nguyên kết quả.
    setSearchParams(value ? { q: value } : {});
    void runLookup(keyword);
  };

  /** Mở `QuoteModal` chế độ bảo hành (`requestType: 'warranty'`), điền sẵn máy + serial tìm được. */
  const handleRequestWarranty = (item?: WarrantyLookupItem) => {
    const prefill = item
      ? `${item.productName}${item.serialNumber ? ` · Serial ${item.serialNumber}` : ''}`
      : 'Yêu cầu bảo hành từ trang tra cứu';
    openQuoteModal(prefill, 'warranty');
  };

  // P0.2 — SEO trang tra cứu: kèm `BreadcrumbList` + `FAQPage` (FAQ hiển thị thật bên dưới).
  // P2.8 — dải breadcrumb dùng chung cho cả UI (dưới đây) lẫn JSON-LD ở effect này.
  const warrantySeo = seoDefaults(seoSettings, 'Tra Cứu Bảo Hành GPSOFT');
  const warrantyCrumbs = crumbTrail(WARRANTY_CRUMB);

  useEffect(() => {
    setSeo({
      title: 'Tra Cứu Bảo Hành Online — GPSOFT Store',
      description:
        warrantySeo.description ||
        'Tra cứu bảo hành GPSOFT bằng số điện thoại, số serial hoặc mã phiếu: xem hạn bảo hành còn lại, tình trạng sửa chữa và gửi yêu cầu bảo hành nhanh chóng.',
      canonicalPath: ROUTES.warranty,
      ogImage: warrantySeo.ogImage,
      jsonLd: [faqJsonLd(WARRANTY_FAQS), crumbJsonLd(warrantyCrumbs)]
    });
  }, [warrantySeo.description, warrantySeo.ogImage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header + breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <Breadcrumb items={warrantyCrumbs} variant="header" className="mb-1" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tra Cứu Bảo Hành
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Nhập số điện thoại, số serial hoặc mã phiếu để kiểm tra hạn bảo hành và tình trạng sửa chữa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRequestWarranty()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1668BF] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Wrench className="w-4 h-4" />
            <span>Gửi Yêu Cầu Bảo Hành</span>
          </button>
          <a
            href={`tel:${hotline.replace(/\s/g, '')}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE] text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-[#1C86EE]" />
            <span>Hotline {hotline}</span>
          </a>
        </div>
      </div>

      {/* Form tra cứu: 1 ô nhập + 1 nút (ROADMAP P1.3 bước 1) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="VD: 0912 345 678 · MBP14M3P-4471902 · BH-2026-0001"
              aria-label="Số điện thoại, số serial hoặc mã phiếu bảo hành"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold cursor-pointer transition-colors shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Đang tra cứu...' : 'Tra cứu'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-[#1C86EE]" />
            Tra cứu được bằng 3 cách:
          </span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5" /> Số điện thoại mua hàng
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5" /> Số serial trên máy
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Mã phiếu bảo hành
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Kết quả tra cứu (ROADMAP P1.3 bước 2) */}
      {lookedUpTerm && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1C86EE]" />
              Kết quả cho “{lookedUpTerm}”
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Tìm thấy {results.length} phiếu bảo hành
            </span>
          </div>

          {results.length === 0 ? (
            /* Empty state (P1.3 bước 3) — server trả 200 + data rỗng nên chỉ cần thông báo lịch sự */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <PackageSearch className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="font-extrabold text-slate-900">Không tìm thấy phiếu bảo hành phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                GPSOFT chưa có phiếu nào khớp với “{lookedUpTerm}”. Quý khách vui lòng kiểm tra lại số
                điện thoại đã dùng khi mua hàng, số serial in trên thân máy/hộp, hoặc mã phiếu ghi trên
                phiếu tiếp nhận bảo hành.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  onClick={() => handleRequestWarranty()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1668BF] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Gửi Yêu Cầu Bảo Hành</span>
                </button>
                <a
                  href={`tel:${hotline.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE] text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#1C86EE]" />
                  <span>Gọi {hotline}</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {results.map(item => {
                const remaining = warrantyRemainingBadge(item.endDate);
                const progress = WARRANTY_PROGRESS[item.status];

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                  >
                    {/* Sản phẩm + mã phiếu + trạng thái */}
                    <div className="p-5 flex items-start gap-4 border-b border-slate-100">
                      {item.product?.thumbnail ? (
                        <img
                          src={item.product.thumbnail}
                          alt={item.product.name || item.productName}
                          className="w-16 h-16 rounded-2xl object-contain bg-[#FFFDF0] border border-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                          <PackageSearch className="w-6 h-6 text-slate-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-white">
                            {item.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                              WARRANTY_STATUS_BADGES[item.status]
                            }`}
                          >
                            {WARRANTY_STATUS_LABELS[item.status]}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C86EE]/10 text-[#1C86EE]">
                            {WARRANTY_TYPE_LABELS[item.warrantyType]}
                          </span>
                        </div>

                        {item.product?.slug ? (
                          <Link
                            to={pathFor('product-detail', { productSlug: item.product.slug })}
                            className="font-bold text-sm text-slate-900 hover:text-[#1C86EE] transition-colors line-clamp-2 cursor-pointer"
                          >
                            {item.product.name || item.productName}
                          </Link>
                        ) : (
                          <div className="font-bold text-sm text-slate-900 line-clamp-2">{item.productName}</div>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                          <span>
                            Khách hàng: <strong className="text-slate-700">{item.customerName}</strong>
                          </span>
                          {item.serialNumber && (
                            <span>
                              Serial: <strong className="font-mono text-slate-700">{item.serialNumber}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Thời hạn bảo hành + số ngày còn lại */}
                    <div className="p-5 space-y-4 flex-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" /> Ngày mua
                          </div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {formatDate(item.purchaseDate)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Bắt đầu
                          </div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {formatDate(item.startDate)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" /> Hết hạn
                          </div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {formatDate(item.endDate)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            Thời hạn
                          </div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {item.warrantyMonths} tháng
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${remaining.className}`}>
                          {remaining.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.isExpired
                            ? 'Máy đã hết hạn bảo hành miễn phí — GPSOFT vẫn hỗ trợ sửa chữa có phí.'
                            : 'Máy vẫn trong thời gian được bảo hành miễn phí theo chính sách.'}
                        </span>
                      </div>

                      {/* Tình trạng phiếu sửa chữa */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Tiến độ xử lý: {WARRANTY_STATUS_LABELS[item.status]}</span>
                          <span className="text-slate-400">{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status === 'rejected'
                                ? 'bg-rose-500'
                                : item.status === 'returned' || item.status === 'done'
                                  ? 'bg-emerald-500'
                                  : 'bg-[#1C86EE]'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 text-[11px]">
                        <div>
                          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            Tình trạng máy khi tiếp nhận
                          </div>
                          <div className="text-slate-700 leading-relaxed mt-0.5">{item.issue || '—'}</div>
                        </div>
                        {item.diagnosis && (
                          <div>
                            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              Chẩn đoán kỹ thuật
                            </div>
                            <div className="text-slate-700 leading-relaxed mt-0.5">{item.diagnosis}</div>
                          </div>
                        )}
                        {item.resolution && (
                          <div>
                            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              Phương án xử lý
                            </div>
                            <div className="text-slate-700 leading-relaxed mt-0.5">{item.resolution}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta phiếu + CTA (P1.3 bước 4: mở QuoteModal chế độ bảo hành) */}
                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Tiếp nhận</div>
                          <div className="font-semibold text-slate-700">
                            {item.receivedAt ? formatDate(item.receivedAt) : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Trả khách</div>
                          <div className="font-semibold text-slate-700">
                            {item.returnedAt ? formatDate(item.returnedAt) : 'Chưa trả'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Kỹ thuật viên</div>
                          <div className="font-semibold text-slate-700">
                            {item.technician || 'Đang phân công'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">
                            Chi phí phát sinh
                          </div>
                          <div className="font-semibold text-slate-700">{formatVnd(item.cost || 0)}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleRequestWarranty(item)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C86EE] hover:bg-[#1668BF] text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Gửi yêu cầu bảo hành</span>
                        </button>
                        <a
                          href={`tel:${hotline.replace(/\s/g, '')}`}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE] text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-[#1C86EE]" />
                          <span>{hotline}</span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trạng thái ban đầu: hướng dẫn 3 bước (P1.3 bước 3) */}
      {!lookedUpTerm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LOOKUP_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] text-xs font-black flex items-center justify-center">
                  {index + 1}
                </span>
                <h3 className="font-bold text-sm text-slate-900">{step.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chính sách bảo hành + khối hotline (P1.3 bước 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1C86EE]" />
            Chính Sách Bảo Hành GPSOFT
          </h2>
          <ul className="space-y-2">
            {WARRANTY_POLICY.map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="pt-1">
            <Link
              to={pathFor('page', { pageSlug: 'chinh-sach-bao-hanh' })}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C86EE] hover:underline cursor-pointer"
            >
              Xem chi tiết chính sách bảo hành 24 tháng
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <PhoneCall className="w-4 h-4 text-[#5CACEE]" />
            Trung Tâm Bảo Hành
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cần hỗ trợ gấp? Gọi hotline hoặc gửi yêu cầu bảo hành — kỹ thuật viên phản hồi trong 15 phút
            giờ hành chính.
          </p>
          <a href={`tel:${hotline.replace(/\s/g, '')}`} className="block text-xl font-black text-white">
            {hotline}
          </a>
          {settings?.hotline2 && (
            <div className="text-xs text-slate-400">Phòng kỹ thuật: {settings.hotline2}</div>
          )}
          {settings?.supportEmail && (
            <div className="text-xs text-slate-400">Email: {settings.supportEmail}</div>
          )}
          <button
            onClick={() => handleRequestWarranty()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1668BF] text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <Wrench className="w-4 h-4" />
            <span>Gửi Yêu Cầu Bảo Hành</span>
          </button>
        </div>
      </div>

      {/* FAQ hiển thị thật trên trang — dùng chung nội dung với JSON-LD `FAQPage` ở trên */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#1C86EE]" />
          Câu Hỏi Thường Gặp Về Bảo Hành
        </h2>
        <div className="space-y-3">
          {WARRANTY_FAQS.map(faq => (
            <div key={faq.question} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-1">
              <div className="text-xs font-bold text-slate-900">{faq.question}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
