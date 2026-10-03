import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { pathFor, ROUTES } from '../../utils/url.ts';
import { LEAD_SOURCE } from '../../utils/leadSource.ts';
import {
  Cpu,
  Mail,
  Phone,
  MapPin,
  Send,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ScanFace,
  LayoutTemplate,
  ExternalLink
} from 'lucide-react';
// P2.2 — lối vào module "Phần mềm chấm công" + 4 tab con (URL thật `?tab=<id>`).
import { ATTENDANCE_MODULE_LABEL, ATTENDANCE_TABS, attendanceTabPath } from '../../utils/attendance.ts';
// P2.3 — lối vào trang dịch vụ "Thiết kế website" (URL thật `/thiet-ke-website` + anchor từng khối).
import { WEB_DESIGN_MODULE_LABEL } from '../../utils/webDesign.ts';

/** P2.3 — khối con của trang "Thiết kế website" để footer deep-link tới từng phần. */
const WEB_DESIGN_FOOTER_SECTIONS: Array<{ label: string; anchor: string }> = [
  { label: 'Bảng giá', anchor: '#bang-gia' },
  { label: 'Dự án mẫu', anchor: '#du-an' },
  { label: 'Quy trình', anchor: '#quy-trinh' },
  { label: 'Câu hỏi thường gặp', anchor: '#faq' },
  { label: 'Đặt yêu cầu', anchor: '#dang-ky' }
];

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const ZaloIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.141 2 11.25c0 2.914 1.465 5.513 3.75 7.155l-.78 2.95a.6.6 0 0 0 .81.71l3.52-1.57c.87.25 1.77.385 2.7.385 5.523 0 10-4.141 10-9.25S17.523 2 12 2zm-3.5 12.2c-.44 0-.8-.36-.8-.8s.36-.8.8-.8h3.1L7.75 8.92A.8.8 0 0 1 8.35 7.6h4.85c.44 0 .8.36.8.8s-.36.8-.8.8h-3.1l3.85 3.68a.8.8 0 0 1-.6 1.32H8.5z" />
  </svg>
);

const YoutubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TiktokIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.34 6.34 0 0 0-.85-.06A6.33 6.33 0 0 0 3.1 15.59a6.33 6.33 0 0 0 9.27 5.56 6.27 6.27 0 0 0 3.47-5.59V8.62a8.27 8.27 0 0 0 4.8 1.52V6.69z" />
  </svg>
);

export const Footer: React.FC = () => {
  const { settings, categories, showToast } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ!', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitLead({
        type: 'newsletter',
        email: newsletterEmail,
        // P2.3 — đăng ký nhận tin ở footer có nguồn riêng.
        source: LEAD_SOURCE.newsletter
      });
      if (res.success) {
        showToast('Đăng ký nhận bản tin khuyến mãi thành công!', 'success');
        setNewsletterEmail('');
      }
    } catch {
      showToast('Có lỗi xảy ra, vui lòng thử lại sau.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value badges top row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 hover:border-[#1C86EE]/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#1C86EE]/20 text-[#5CACEE] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Chính Hãng 100%</h4>
              <p className="text-xs text-slate-400">Xuất VAT đầy đủ, nguồn gốc rõ ràng</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 hover:border-[#1C86EE]/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#5CACEE]/20 text-[#5CACEE] flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">1 Đổi 1 Trong 30 Ngày</h4>
              <p className="text-xs text-slate-400">Yên tâm tuyệt đối khi sử dụng</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 hover:border-[#1C86EE]/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#1C86EE]/20 text-[#5CACEE] flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Giao Hỏa Tốc 2 Giờ</h4>
              <p className="text-xs text-slate-400">Miễn phí ship đơn từ 1.000.000đ</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 hover:border-[#1C86EE]/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#5CACEE]/20 text-[#5CACEE] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Bảo Hành Vàng 24 Tháng</h4>
              <p className="text-xs text-slate-400">Phòng lab kỹ thuật chuẩn quốc tế</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 py-12">
          {/* Col 1 & 2: Brand & Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1C86EE] to-[#5CACEE] flex items-center justify-center text-white font-bold shadow-md shadow-[#1C86EE]/30">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {settings?.companyName || 'GPSOFT Store'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-6">
              {settings?.footerBio ||
                'GPSOFT là chuỗi bán lẻ công nghệ ủy quyền, chuyên cung cấp Smartphone, Laptop, Phụ kiện chính hãng và giải pháp thiết bị doanh nghiệp.'}
            </p>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#5CACEE] shrink-0 mt-0.5" />
                <span>{settings?.address || '182 Lê Duẩn, Quận 1, TP. Hồ Chí Minh'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#5CACEE] shrink-0" />
                <span>
                  Hotline: <strong className="text-white">{settings?.hotline || '1900 8899'}</strong> -{' '}
                  {settings?.hotline2 || '0988 123 456'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#5CACEE] shrink-0" />
                <span>{settings?.email || 'lienhe@gpsoft.vn'}</span>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2.5 pt-3">
              <a
                href={settings?.socials.facebook || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-[#1877F2] hover:text-white flex items-center justify-center text-slate-300 transition-all cursor-pointer hover:scale-105"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a
                href={settings?.socials.zalo || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label="Zalo"
                title="Zalo"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-[#0068FF] hover:text-white flex items-center justify-center text-slate-300 transition-all cursor-pointer hover:scale-105"
              >
                <ZaloIcon className="w-4 h-4" />
              </a>
              <a
                href={settings?.socials.youtube || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                title="YouTube"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-[#FF0000] hover:text-white flex items-center justify-center text-slate-300 transition-all cursor-pointer hover:scale-105"
              >
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a
                href={settings?.socials.tiktok || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                title="TikTok"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-black hover:ring-1 hover:ring-slate-700 hover:text-white flex items-center justify-center text-slate-300 transition-all cursor-pointer hover:scale-105"
              >
                <TiktokIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 3: Categories */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Danh Mục Hàng</h4>
            <ul className="space-y-2 text-xs">
              {categories.slice(0, 6).map(cat => (
                <li key={cat.id}>
                  <Link
                    to={pathFor('products', { categorySlug: cat.slug || cat.id })}
                    className="text-slate-400 hover:text-[#5CACEE] transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Policy Pages */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Chính Sách & Hỗ Trợ</h4>
            <ul className="space-y-2 text-xs">
              <li>
                {/* P1.3 — tra cứu bảo hành công khai */}
                <Link to={ROUTES.warranty} className="text-slate-400 hover:text-[#5CACEE] transition-colors">
                  Tra cứu bảo hành
                </Link>
              </li>
              <li>
                <Link
                  to={pathFor('page', { pageSlug: 'chinh-sach-bao-hanh' })}
                  className="text-slate-400 hover:text-[#5CACEE] transition-colors"
                >
                  Chính sách bảo hành 24T
                </Link>
              </li>
              <li>
                <Link
                  to={pathFor('page', { pageSlug: 'chinh-sach-doi-tra' })}
                  className="text-slate-400 hover:text-[#5CACEE] transition-colors"
                >
                  Chính sách đổi trả 30 ngày
                </Link>
              </li>
              <li>
                <Link
                  to={pathFor('page', { pageSlug: 'dieu-khoan-dich-vu' })}
                  className="text-slate-400 hover:text-[#5CACEE] transition-colors"
                >
                  Điều khoản dịch vụ & bảo mật
                </Link>
              </li>
              <li>
                <Link
                  to={pathFor('page', { pageSlug: 'gioi-thieu' })}
                  className="text-slate-400 hover:text-[#5CACEE] transition-colors"
                >
                  Về chúng tôi (GPSOFT)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Newsletter */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Đăng Ký Nhận Tin</h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Nhận voucher giảm 500.000đ cho đơn hàng đầu tiên và tin tức công nghệ nóng nhất hàng tuần.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Nhập email của bạn..."
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#1C86EE]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-[#1C86EE] hover:bg-[#1472CE] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#1C86EE]/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Đang gửi...' : 'Đăng ký ngay'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* P2.2 — module "Phần mềm chấm công": lối vào 4 tab con (URL thật `?tab=<id>`) */}
        <div className="py-6 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-white">
              <ScanFace className="w-4 h-4 text-[#5CACEE]" />
              {ATTENDANCE_MODULE_LABEL}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ATTENDANCE_TABS.map(tab => (
                <Link
                  key={tab.id}
                  to={attendanceTabPath(tab.id)}
                  title={tab.navHint}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-[#1C86EE] text-[11px] font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* P2.3 — trang dịch vụ "Thiết kế website": lối vào + deep-link từng khối con */}
        <div className="py-6 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-white">
              <LayoutTemplate className="w-4 h-4 text-[#5CACEE]" />
              {WEB_DESIGN_MODULE_LABEL}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={ROUTES.webDesign}
                title="Tổng quan dịch vụ thiết kế website GPSOFT"
                className="px-2.5 py-1.5 rounded-lg bg-[#1C86EE] hover:bg-[#1472CE] text-[11px] font-semibold text-white transition-colors"
              >
                Tổng quan dịch vụ
              </Link>
              {WEB_DESIGN_FOOTER_SECTIONS.map(section => (
                <Link
                  key={section.anchor}
                  to={`${ROUTES.webDesign}${section.anchor}`}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-[#1C86EE] text-[11px] font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  {section.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Showrooms summary */}
        <div className="py-6 border-t border-slate-800 text-[11px] text-slate-400">
          <strong className="text-slate-200">Hệ thống Showroom:</strong> {settings?.showroom}
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>{settings?.copyright || '© 2025 GPSOFT Store. All rights reserved.'}</div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]">Chấp nhận thanh toán:</span>
            <span className="bg-slate-800 px-2 py-1 rounded text-white text-[10px] font-bold">VietQR</span>
            <span className="bg-slate-800 px-2 py-1 rounded text-white text-[10px] font-bold">COD</span>
            <span className="bg-slate-800 px-2 py-1 rounded text-white text-[10px] font-bold">Visa / Master</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
