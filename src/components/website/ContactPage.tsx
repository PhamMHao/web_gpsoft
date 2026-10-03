import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ROUTES } from '../../utils/url.ts';
import { setSeo, seoDefaults, organizationJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { CONTACT_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import { api } from '../../services/api.ts';
import { LEAD_SOURCE } from '../../utils/leadSource.ts';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageSquare,
  Building,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

/** Dải breadcrumb của trang (dùng cho cả UI và JSON-LD ⇒ không thể lệch). */
const contactCrumbs = crumbTrail(CONTACT_CRUMB);

export const ContactPage: React.FC = () => {
  const { settings, seoSettings, showToast } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // P0.2 — SEO trang liên hệ: kèm thông tin doanh nghiệp (địa chỉ/hotline) cho JSON-LD.
  const contactSeo = seoDefaults(seoSettings);

  useEffect(() => {
    setSeo({
      title: 'Liên Hệ GPSOFT — Hotline, Showroom & Form Tư Vấn',
      description:
        contactSeo.description ||
        'Liên hệ GPSOFT Store: hotline, email, địa chỉ 6 showroom và form gửi yêu cầu tư vấn, báo giá thiết bị công nghệ.',
      canonicalPath: ROUTES.contact,
      ogImage: contactSeo.ogImage,
      jsonLd: [organizationJsonLd(settings), crumbJsonLd(contactCrumbs)]
    });
  }, [contactSeo.description, contactSeo.ogImage, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Vui lòng điền họ tên và số điện thoại liên hệ!', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitLead({
        type: 'contact',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject || 'Liên hệ từ khách hàng qua Website',
        message: formData.message,
        // P2.3 — lead từ trang Liên hệ được gắn nguồn riêng để sale lọc trong CMS.
        source: LEAD_SOURCE.contactPage
      });

      if (res.success) {
        setSubmitted(true);
        showToast('Gửi liên hệ thành công! Nhân viên tư vấn sẽ gọi lại cho bạn sớm nhất.', 'success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch {
      showToast('Có lỗi xảy ra, vui lòng liên hệ hotline trực tiếp.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Breadcrumb items={contactCrumbs} variant="header" className="justify-center mb-1" />
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold uppercase tracking-wider">
          Hỗ Trợ & Chăm Sóc Khách Hàng 24/7
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Liên Hệ Với Đội Ngũ GPSOFT
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Hãy để lại câu hỏi hoặc yêu cầu báo giá dự án, chuyên viên của chúng tôi sẽ phản hồi trong vòng 15 phút.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Information & Channels (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-6 border border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Thông Tin Trụ Sở & Liên Lạc</h3>
              <p className="text-xs text-slate-400 mt-1">
                Quý khách có thể ghé trực tiếp showroom để trải nghiệm sản phẩm thực tế.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-[#5CACEE] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Trụ sở chính</div>
                  <div className="font-semibold text-white mt-0.5">
                    {settings?.address || '182 Lê Duẩn, Quận 1, TP. Hồ Chí Minh'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Tổng đài tư vấn & Đặt hàng</div>
                  <div className="font-bold text-white text-base mt-0.5">
                    {settings?.hotline || '1900 8899'} - {settings?.hotline2 || '0988 123 456'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-[#1C86EE] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Hộp thư điện tử</div>
                  <div className="font-semibold text-white mt-0.5">
                    {settings?.email || 'lienhe@gpsoft.vn'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Giờ làm việc</div>
                  <div className="font-semibold text-white mt-0.5">
                    Thứ 2 - Chủ Nhật: 08:00 - 21:30 (Cả ngày lễ)
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for Zalo & Hotline */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
              <a
                href={`tel:${settings?.hotline || '19008899'}`}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold text-xs transition-colors shadow-md shadow-[#1C86EE]/20"
              >
                <Phone className="w-4 h-4" />
                <span>Gọi Hotline</span>
              </a>

              <a
                href={settings?.socials.zalo || '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5CACEE] hover:bg-[#489bdf] text-white font-bold text-xs transition-colors shadow-md shadow-[#5CACEE]/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat Zalo</span>
              </a>
            </div>
          </div>

          {/* Showroom Network list */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1C86EE]" />
              <span>Hệ Thống Showroom Trải Nghiệm</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {settings?.showroom || 'Hà Nội: 45 Thái Hà, Đống Đa • TP.HCM: 182 Lê Duẩn, Quận 1 • Đà Nẵng: 92 Nguyễn Văn Linh, Hải Châu'}
            </p>
          </div>
        </div>

        {/* Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Gửi Tin Nhắn / Yêu Cầu Trực Tuyến</h3>
              <p className="text-xs text-slate-500 mt-1">
                Điền thông tin vào form dưới đây, chúng tôi cam kết bảo mật thông tin của bạn tuyệt đối.
              </p>
            </div>

            {submitted ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">
                  Cảm Ơn Quý Khách Đã Liên Hệ!
                </h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Yêu cầu của bạn đã được ghi nhận trên hệ thống GPSOFT. Chuyên viên kỹ thuật sẽ gọi lại trong ít phút.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer"
                >
                  Gửi thêm yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0912 345 678"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Địa chỉ Email</label>
                    <input
                      type="email"
                      placeholder="email@vidu.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Chủ đề quan tâm</label>
                    <input
                      type="text"
                      placeholder="Tư vấn mua máy / Báo giá sỉ / Bảo hành"
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nội dung chi tiết</label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả nhu cầu cần hỗ trợ hoặc model sản phẩm bạn đang quan tâm..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-sm shadow-md shadow-[#1C86EE]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Liên Hệ'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Google Maps Embed */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl space-y-3 p-4 sm:p-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#1C86EE]" />
          <span>Vị Trí Showroom Trung Tâm Trên Bản Đồ Google Maps</span>
        </h3>
        <div className="aspect-21/9 w-full rounded-2xl overflow-hidden border border-slate-200">
          <iframe
            src={
              settings?.googleMapsEmbedUrl ||
              'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.460114002621!2d106.69747737583852!3d10.776024389372728!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f385570472f%3A0x1787491737236a28!2sNotre%20Dame%20Cathedral%20of%20Saigon!5e0!3m2!1sen!2s!4v1711200000000!5m2!1sen!2s'
            }
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps Location"
          />
        </div>
      </div>
    </div>
  );
};
