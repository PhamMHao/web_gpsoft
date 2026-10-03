import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Product } from '../../types/index.ts';
import { ROUTES } from '../../utils/url.ts';
import { setSeo, seoDefaults, faqJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { PRICE_LIST_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import {
  FileSpreadsheet,
  FileText,
  Search,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  Building2,
  ExternalLink,
  HelpCircle,
  Check
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';
import { QUOTE_BULK_TIERS, QUOTE_CONFIG_TIERS } from '../../utils/quote.ts';

/** P0.2 — Câu hỏi thường gặp về bảng giá: hiển thị ở cuối trang + dùng sinh JSON-LD `FAQPage`. */
const PRICE_LIST_FAQS = [
  {
    question: 'Đơn giá trong bảng giá đã bao gồm VAT chưa?',
    answer:
      'Tất cả đơn giá trong bảng giá đã bao gồm VAT. Đây là giá bán lẻ niêm yết tại thời điểm cập nhật, có thể thay đổi theo chương trình khuyến mãi và tồn kho thực tế.'
  },
  {
    question: 'GPSOFT có xuất hoá đơn VAT cho doanh nghiệp không?',
    answer:
      'Có. GPSOFT xuất hoá đơn VAT điện tử cho khách hàng doanh nghiệp. Quý khách vui lòng cung cấp mã số thuế và thông tin công ty khi đặt hàng hoặc gửi yêu cầu báo giá.'
  },
  {
    question: 'Mua số lượng lớn cho dự án có được giá tốt hơn?',
    answer:
      'GPSOFT có chính sách giá riêng cho khách hàng doanh nghiệp, trường học và dự án. Hãy gửi yêu cầu báo giá kèm số lượng để nhận mức giá tốt hơn giá niêm yết.'
  },
  {
    question: 'Bảng giá có áp dụng cho sản phẩm Like New 99% không?',
    answer:
      'Có. Bảng giá thể hiện cả sản phẩm Mới 100%, Like New 99% và Đã qua sử dụng; cột Tình trạng cho biết loại máy cùng chế độ bảo hành tương ứng.'
  },
  {
    question: 'Có thể tải bảng giá để lưu trữ hoặc gửi nội bộ không?',
    answer:
      'Có. Dùng nút Xuất Excel hoặc In PDF ngay trên trang bảng giá để lưu tệp CSV/PDF và chuyển cho bộ phận mua hàng.'
  }
];

export const PriceListPage: React.FC = () => {
  const { categories, brands, navigateToProduct, openQuoteModal, seoSettings, navigateToQuote } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  /** P1.6 — 3 sub-tab: bảng cấu hình theo mức giá · bảng giá sản phẩm · mở Link Báo Giá. */
  const [priceTab, setPriceTab] = useState<'summary' | 'products' | 'link'>('products');
  const [quoteCodeInput, setQuoteCodeInput] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.getProducts();
        if (res.success) setProducts(res.data);
      } catch (e) {
        console.error('Price list load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // P0.2 — SEO bảng giá: kèm `FAQPage` JSON-LD. Nội dung FAQ bên dưới **hiển thị thật** trên
  // trang vì Google chỉ chấp nhận FAQPage khi câu hỏi/đáp có trong nội dung người dùng thấy.
  const priceSeo = seoDefaults(seoSettings, 'Bảng Giá Niêm Yết Thiết Bị Công Nghệ');
  // P2.8 — breadcrumb của trang: `Trang chủ › Bảng giá` (một mảng dùng chung UI + JSON-LD).
  const priceCrumbs = crumbTrail(PRICE_LIST_CRUMB);

  useEffect(() => {
    setSeo({
      title: 'Bảng Giá Niêm Yết Thiết Bị Công Nghệ 2025 — GPSOFT',
      description:
        priceSeo.description ||
        'Bảng giá niêm yết mới nhất của GPSOFT: laptop, điện thoại, màn hình, phụ kiện — giá đã gồm VAT, kèm chính sách bảo hành và ưu đãi doanh nghiệp.',
      canonicalPath: ROUTES.priceList,
      ogImage: priceSeo.ogImage,
      jsonLd: [faqJsonLd(PRICE_LIST_FAQS), crumbJsonLd(priceCrumbs)]
    });
  }, [priceSeo.description, priceSeo.ogImage]);

  const filtered = products.filter(p => {
    const matchesSearch =
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name || catId;
  const getBrandName = (brandId: string) => brands.find(b => b.id === brandId)?.name || brandId;

  const handlePrint = () => {
    window.print();
  };

  /** P1.6 — mở Link Báo Giá: chuẩn hoá mã rồi điều hướng `/bao-gia/<mã>`. */
  const handleOpenQuoteLink = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quoteCodeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    navigateToQuote(code);
  };

  /** 3 sub-tab của trang bảng giá (P1.6). */
  const PRICE_TABS: { id: 'summary' | 'products' | 'link'; label: string; hint: string }[] = [
    { id: 'summary', label: 'Báo giá tổng', hint: 'Cấu hình gợi ý theo mức giá & chiết khấu số lượng' },
    { id: 'products', label: 'Báo giá sản phẩm', hint: 'Bảng giá niêm yết từng sản phẩm trong kho' },
    { id: 'link', label: 'Link Báo Giá', hint: 'Mở phiếu báo giá riêng GPSOFT đã gửi cho bạn' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <Breadcrumb items={priceCrumbs} variant="header" className="mb-1" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bảng Giá Niêm Yết Thiết Bị Công Nghệ 2025
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cập nhật hàng ngày theo tỷ giá và chính sách khuyến mãi của hãng. Đã bao gồm thuế VAT.
          </p>
        </div>

        {/* Action Buttons: Download Excel, PDF, Quote */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/export/price-list.csv"
            download="Bang_Gia_GPSOFT_2025.csv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tải Bảng Giá Excel (.CSV)</span>
          </a>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In / Lưu Bảng Giá (PDF)</span>
          </button>

          <button
            onClick={() => openQuoteModal('Dự án doanh nghiệp / Số lượng lớn')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] hover:bg-[#1C86EE]/20 font-bold text-xs border border-[#1C86EE]/30 transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Báo Giá Sỉ Doanh Nghiệp</span>
          </button>
        </div>
      </div>

      {/* P1.6 — 3 sub-tab: Báo giá tổng · Báo giá sản phẩm · Link Báo Giá */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {PRICE_TABS.map(item => (
          <button
            key={item.id}
            onClick={() => setPriceTab(item.id)}
            title={item.hint}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              priceTab === item.id ? 'bg-[#1C86EE] text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-1 hidden sm:inline">
          {PRICE_TABS.find(item => item.id === priceTab)?.hint}
        </span>
      </div>

      {priceTab === 'products' && (
        <>
      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tra cứu tên máy, mã SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Lọc danh mục:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả danh mục ({products.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Price List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4">Tên Sản Phẩm</th>
                <th className="py-3.5 px-4">Mã SKU</th>
                <th className="py-3.5 px-4">Danh Mục</th>
                <th className="py-3.5 px-4">Tình Trạng</th>
                <th className="py-3.5 px-4 text-right">Giá Niêm Yết</th>
                <th className="py-3.5 px-4 text-right">Giá Bán Khuyến Mãi</th>
                <th className="py-3.5 px-4 text-center">Tồn Kho</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-[#1C86EE]/5 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        className="w-9 h-9 rounded-lg object-contain bg-[#FFFDF0] shrink-0 border border-slate-100"
                      />
                      <button
                        onClick={() => navigateToProduct(p.slug || p.id)}
                        className="text-left hover:text-[#1C86EE] transition-colors font-bold line-clamp-1 cursor-pointer"
                      >
                        {p.name}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">{p.sku}</td>
                  <td className="py-3.5 px-4 text-slate-600">{getCategoryName(p.categoryId)}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.condition === 'new'
                          ? 'bg-[#1C86EE]/15 text-[#1C86EE]'
                          : p.condition === 'like_new'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.condition === 'new'
                        ? 'Mới 100%'
                        : p.condition === 'like_new'
                        ? 'Like New 99%'
                        : 'Đã qua sử dụng'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 line-through">
                    {p.originalPrice > p.salePrice ? formatVnd(p.originalPrice) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#1C86EE] text-sm">
                    {formatVnd(p.salePrice)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {p.stock > 0 ? (
                      <span className="text-emerald-600 font-semibold">{p.stock}</span>
                    ) : (
                      <span className="text-rose-500 font-semibold">Tạm hết</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => navigateToProduct(p.slug || p.id)}
                      className="px-3 py-1 bg-slate-100 hover:bg-[#1C86EE] hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* P0.2 — FAQ vừa hiển thị cho khách, vừa là nội dung cho JSON-LD `FAQPage` */}
      <section className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-[#1C86EE]" />
          <h2 className="text-lg font-black text-slate-900">Câu Hỏi Thường Gặp Về Bảng Giá</h2>
        </div>
        <div className="space-y-3">
          {PRICE_LIST_FAQS.map(faq => (
            <details
              key={faq.question}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold text-slate-900">
                <span>{faq.question}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <p className="text-xs text-slate-600 leading-relaxed mt-2.5">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
        </>
      )}

      {/* ---------------------- Tab “Báo giá tổng” ---------------------- */}
      {priceTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">Cấu Hình Gợi Ý Theo Mức Giá</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn nhanh theo nhu cầu, sau đó GPSOFT chốt cấu hình chi tiết và báo giá chính xác cho từng máy.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Nhóm nhu cầu</th>
                    <th className="px-4 py-3 font-bold">Mức giá tham khảo</th>
                    <th className="px-4 py-3 font-bold">CPU</th>
                    <th className="px-4 py-3 font-bold">RAM</th>
                    <th className="px-4 py-3 font-bold">Ổ cứng</th>
                    <th className="px-4 py-3 font-bold">Phù hợp với</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUOTE_CONFIG_TIERS.map(tier => (
                    <tr key={tier.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{tier.label}</td>
                      <td className="px-4 py-3 font-semibold text-[#1C86EE]">{tier.priceRange}</td>
                      <td className="px-4 py-3 text-slate-600">{tier.cpu}</td>
                      <td className="px-4 py-3 text-slate-600">{tier.ram}</td>
                      <td className="px-4 py-3 text-slate-600">{tier.storage}</td>
                      <td className="px-4 py-3 text-slate-500">{tier.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chiết khấu theo số lượng cho khách doanh nghiệp */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Chiết Khấu Theo Số Lượng (Khách Doanh Nghiệp)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mua theo dự án/trường học: GPSOFT lập báo giá riêng, hợp đồng khung và xuất hoá đơn VAT.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {QUOTE_BULK_TIERS.map(tier => (
                <div key={tier.quantity} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-1">
                  <div className="text-xs font-black text-[#1C86EE]">{tier.quantity}</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">{tier.benefit}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => openQuoteModal('Báo giá tổng theo cấu hình & số lượng')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold text-xs shadow-md shadow-[#1C86EE]/25 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Gửi yêu cầu báo giá tổng</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------- Tab “Link Báo Giá” ---------------------- */}
      {priceTab === 'link' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center">
              <ExternalLink className="w-6 h-6" />
            </div>
            <h2 className="text-base font-black text-slate-900">Mở Phiếu Báo Giá Riêng</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              GPSOFT gửi khách một đường dẫn riêng dạng <span className="font-mono text-slate-700">/bao-gia/&lt;mã&gt;</span>
              {' '}kèm phiếu báo giá có mã, hiệu lực và mật khẩu (nếu cần). Nhập mã đã nhận để mở lại bất cứ lúc nào.
            </p>
            <form onSubmit={handleOpenQuoteLink} className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quoteCodeInput}
                  onChange={e => setQuoteCodeInput(e.target.value)}
                  placeholder="VD: BG7K2M9Q"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold text-xs shadow-md shadow-[#1C86EE]/25 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Mở báo giá</span>
              </button>
            </form>
            <p className="text-[11px] text-slate-400">
              Link có mật khẩu: hệ thống sẽ hỏi mật khẩu trước khi hiện nội dung phiếu.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900">Chưa có Link Báo Giá?</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gửi yêu cầu kèm danh sách máy/số lượng — GPSOFT lập phiếu báo giá điện tử và gửi link trong vòng
              1 giờ làm việc. Khách doanh nghiệp nhận thêm hợp đồng khung và hoá đơn VAT.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5">
              {[
                'Báo giá theo đúng cấu hình từng máy, không phát sinh phí ẩn',
                'Hiệu lực 30 ngày, in ra được ngay trên 1 trang A4',
                'Có thể đặt mật khẩu và theo dõi lượt khách mở phiếu'
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => openQuoteModal('Yêu cầu Link Báo Giá')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Yêu cầu báo giá / Link Báo Giá</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


