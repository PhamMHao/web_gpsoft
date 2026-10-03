import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { PriceQuote, QuoteLink } from '../../types/index.ts';
import { formatDate, formatVnd } from '../../utils/format.ts';
import { amountInWords, quoteValidityLabel } from '../../utils/quote.ts';
import { ROUTES } from '../../utils/url.ts';
import { setSeo, seoDefaults } from '../../utils/seo.ts';
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Link2,
  Lock,
  PenLine,
  Printer,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

/** Hotline dự phòng khi chưa tải được cấu hình hệ thống (giống `WarrantyLookupPage`). */
const FALLBACK_HOTLINE = '1900 8899';

/** Điều khoản in kèm phiếu báo giá (chuẩn B2B — khách đọc là biết ngay hai bên cần làm gì). */
const QUOTE_TERMS = [
  'Đơn giá đã bao gồm VAT, chưa bao gồm phí lắp đặt ngoài danh mục và phí hạ tầng (điện, mạng) nếu phát sinh.',
  'Hàng chính hãng, bảo hành theo tiêu chuẩn nhà sản xuất; thời hạn bảo hành ghi rõ theo từng dòng hàng.',
  'Báo giá có hiệu lực đến ngày ghi trên phiếu. Sau thời hạn này, GPSOFT sẽ gửi lại báo giá theo giá hiện hành.',
  'Thanh toán 50% khi xác nhận đơn, 50% sau khi nghiệm thu — hoặc theo hợp đồng riêng với khách doanh nghiệp.'
];

/**
 * P1.6 — Trang công khai `/bao-gia/:code`: khách mở Link Báo Giá do admin gửi.
 *
 * Luồng: không có mã ⇒ hướng dẫn nhập mã ở `/bang-gia`; mã hợp lệ ⇒ hiện **phiếu báo giá dạng
 * công ty** (logo/thông tin lấy từ `settings`) và nút In / Tải PDF (`window.print()`); link có
 * mật khẩu ⇒ server trả **401 + `requiresPassword`** nên trang hiện form nhập lại, **không** lộ
 * dữ liệu báo giá trước khi xác thực. Trang đặt `noindex,nofollow` (link riêng tư, không cho SEO).
 */
export const QuoteViewPage: React.FC = () => {
  const { selectedQuoteCode, settings, seoSettings, setWebsitePage, openQuoteModal, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<QuoteLink | null>(null);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState('');
  const [pass, setPass] = useState('');
  const [copied, setCopied] = useState(false);

  const code = (selectedQuoteCode || '').trim();
  const quoteSeo = seoDefaults(seoSettings, 'Phiếu Báo Giá GPSOFT');

  useEffect(() => {
    setSeo({
      title: `Phiếu Báo Giá ${code ? `${code} — ` : ''}GPSOFT Store`,
      description:
        'Phiếu báo giá điện tử của GPSOFT gửi tới khách hàng: chi tiết dòng hàng, đơn giá, tổng tiền và hạn hiệu lực.',
      ogImage: quoteSeo.ogImage,
      // Link chia sẻ là tài liệu riêng tư ⇒ không index, không có canonical.
      robots: 'noindex,nofollow'
    });
  }, [code, quoteSeo.ogImage]);

  const load = useCallback(
    async (password?: string) => {
      if (!code) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const res = await api.openQuoteLink(code, password);
        if (res.success && res.data) {
          setLink(res.data.link);
          setQuote(res.data.quote);
          setRequiresPassword(false);
          setPass('');
        } else if (res.requiresPassword) {
          setRequiresPassword(true);
          setError(res.message || 'Link báo giá này được bảo vệ bằng mật khẩu.');
        } else {
          setRequiresPassword(false);
          setError(res.message || 'Không mở được link báo giá.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không mở được link báo giá.');
      } finally {
        setLoading(false);
      }
    },
    [code]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass.trim()) {
      showToast('Vui lòng nhập mật khẩu để mở báo giá.', 'error');
      return;
    }
    void load(pass.trim());
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast('Đã copy đường dẫn báo giá!', 'success');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Sao chép thủ công đường dẫn sau:', window.location.href);
    }
  };

  const hotline = settings?.hotline || FALLBACK_HOTLINE;
  /** Quá hạn hiệu lực (server gắn `isExpired` qua `withEffectiveStatus()`) — hiện banner cảnh báo. */
  const isExpired = quote?.isExpired === true;

  /* Chưa có mã trên URL (`/bao-gia` không có `:code`) ⇒ hướng dẫn về trang bảng giá. */
  if (!code) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
            <Link2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Mở Link Báo Giá</h1>
          <p className="text-sm text-slate-500">
            Đường dẫn chưa kèm mã báo giá. Hãy dùng đúng link GPSOFT đã gửi (dạng
            <span className="font-mono text-slate-700"> /bao-gia/&lt;mã&gt;</span>), hoặc nhập mã ở trang Bảng giá.
          </p>
          <button
            onClick={() => setWebsitePage('price-list')}
            className="px-5 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold cursor-pointer"
          >
            Tới trang Bảng giá
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#1C86EE] animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Đang tải phiếu báo giá...</p>
      </div>
    );
  }

  /* Link có mật khẩu: server đã trả 401 + `requiresPassword` ⇒ chưa có dữ liệu báo giá để hiện. */
  if (requiresPassword && !quote) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <form onSubmit={handleSubmitPassword} className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-black text-slate-900">Báo Giá Được Bảo Vệ</h1>
            <p className="text-xs text-slate-500">
              Link này cần mật khẩu GPSOFT đã gửi kèm. Nhập mật khẩu để xem phiếu báo giá.
            </p>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Nhập mật khẩu báo giá"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
            />
          </div>
          {error && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] text-white font-bold text-sm shadow-lg shadow-[#1C86EE]/25 cursor-pointer"
          >
            Mở phiếu báo giá
          </button>
        </form>
      </div>
    );
  }

  /* Link sai / đã tắt / hết hạn / báo giá đã xoá (server trả 404 kèm thông báo tiếng Việt). */
  if (error || !quote) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-3xl border border-rose-200 bg-rose-50/40 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Không Mở Được Báo Giá</h1>
          <p className="text-sm text-slate-600">{error || 'Link báo giá không tồn tại hoặc đã hết hiệu lực.'}</p>
          <p className="text-xs text-slate-500">
            Vui lòng liên hệ GPSOFT để nhận link mới hoặc gửi lại yêu cầu báo giá.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <a
              href={`tel:${hotline}`}
              className="px-5 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold cursor-pointer"
            >
              Gọi {hotline}
            </a>
            <button
              onClick={() => openQuoteModal()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              Yêu cầu báo giá mới
            </button>
          </div>
        </div>
      </div>
    );
  }


  /* ---------------------------- Phiếu báo giá ---------------------------- */
  return (
    <div className="max-w-[880px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-5">
      {/* Thanh công cụ — không in ra giấy */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-4 h-4 text-[#1C86EE]" />
          <span>
            Phiếu do <strong className="text-slate-700">{quote.createdBy}</strong> lập ·{' '}
            {link ? `${link.viewCount} lượt mở link` : 'mở trực tiếp'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã copy link' : 'Copy link này'}</span>
          </button>
          <button
            onClick={() => openQuoteModal(`Báo giá ${quote.code}`, 'quote')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] hover:bg-[#1C86EE]/20 border border-[#1C86EE]/30 font-bold text-xs cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span>Yêu cầu chỉnh sửa</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In / Tải PDF</span>
          </button>
        </div>
      </div>

      {/* Trang phiếu — phông trắng, viền mảnh, đủ 1 trang A4 khi in */}
      <article className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10 space-y-6 print:shadow-none print:border-0 print:p-0">
        {/* Đầu phiếu: logo + thông tin công ty (lấy từ `settings`, giống mẫu in của OrdersView) */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <img
              src={settings?.logo || '/logo.svg'}
              alt={settings?.companyName || 'GPSOFT Store'}
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {settings?.companyName || 'CÔNG TY CỔ PHẦN CÔNG NGHỆ GPSOFT'}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">{settings?.address || '182 Lê Duẩn, Quận 1, TP. Hồ Chí Minh'}</p>
              <p className="text-[11px] text-slate-500">
                Hotline: {hotline} · Email: {settings?.email || 'lienhe@gpsoft.vn'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phiếu báo giá</div>
            <div className="text-xl font-black text-[#1C86EE]">{quote.code}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ngày lập: {formatDate(quote.createdAt, 'date')}</div>
            <div className={`text-[11px] font-semibold ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
              Hiệu lực đến {formatDate(quote.validUntil, 'date')} ({quoteValidityLabel(quote.validUntil)})
            </div>
          </div>
        </header>

        {isExpired && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Báo giá này đã quá hạn hiệu lực. Vui lòng liên hệ GPSOFT để nhận báo giá cập nhật theo giá hiện hành.
            </span>
          </div>
        )}

        {/* Khối khách hàng */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kính gửi</div>
            <div className="font-black text-slate-900">{quote.customerName}</div>
            {quote.company && <div className="text-slate-600">{quote.company}</div>}
            <div className="text-slate-600">Điện thoại: {quote.phone}</div>
            {quote.email && <div className="text-slate-600">Email: {quote.email}</div>}
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nội dung</div>
            <div className="font-bold text-slate-900">{quote.title}</div>
            <div className="text-slate-600">{quote.items.length} dòng hàng</div>
            <div className="text-slate-600">Tổng giá trị: <strong className="text-[#1C86EE]">{formatVnd(quote.total)}</strong></div>
          </div>
        </section>


        {/* Bảng dòng hàng */}
        <section className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10">STT</th>
                  <th className="py-2.5 px-3">Tên hàng / dịch vụ</th>
                  <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-16 text-center">SL</th>
                  <th className="py-2.5 px-3 w-32 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 w-32 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 px-3 text-slate-500 font-semibold">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.spec && <div className="text-[10px] text-slate-500 mt-0.5">{item.spec}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.unit}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{formatVnd(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatVnd(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={5} className="py-3 px-3 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                    Tổng cộng (đã gồm VAT)
                  </td>
                  <td className="py-3 px-3 text-right text-base font-black text-[#1C86EE]">{formatVnd(quote.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-3 py-2.5 bg-white border-t border-slate-100 text-[11px] text-slate-600">
            <strong className="text-slate-700">Bằng chữ:</strong> {amountInWords(quote.total)}
          </div>
        </section>

        {/* Ghi chú của admin + điều khoản chuẩn */}
        <section className="space-y-2">
          {quote.note && (
            <div className="p-3 rounded-2xl bg-[#1C86EE]/5 border border-[#1C86EE]/20 text-[11px] text-slate-700">
              <strong className="text-[#1C86EE]">Ghi chú:</strong> {quote.note}
            </div>
          )}
          <div className="text-[11px] text-slate-600 space-y-1">
            <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Điều khoản áp dụng</div>
            <ol className="list-decimal list-inside space-y-0.5">
              {QUOTE_TERMS.map(term => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chữ ký hai bên — chuẩn phiếu báo giá B2B */}
        <footer className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-600">
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Đại diện GPSOFT</div>
            <div className="h-16" />
            <div className="text-slate-500">(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Đại diện khách hàng</div>
            <div className="h-16" />
            <div className="text-slate-500">(Ký, ghi rõ họ tên)</div>
          </div>
        </footer>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 print:hidden">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Phiếu báo giá điện tử phát hành qua Link Báo Giá GPSOFT — mọi thay đổi chỉ có hiệu lực khi GPSOFT xác nhận.
          </span>
        </div>
      </article>

      <div className="text-center print:hidden">
        <button
          onClick={() => setWebsitePage('price-list')}
          className="text-xs font-bold text-[#1C86EE] hover:underline cursor-pointer"
        >
          ← Về trang Bảng giá GPSOFT
        </button>
      </div>
    </div>
  );
};

