/**
 * P2.3 — Trang dịch vụ **Thiết kế website** `/thiet-ke-website`.
 *
 * Nội dung: hero + chỉ số cam kết → **3 gói dịch vụ** (giá, thời gian, phạm vi, có/không tính năng) →
 * quy trình 5 bước → dự án mẫu (portfolio thật) → FAQ (khớp FAQPage JSON-LD) → **form đặt yêu cầu**
 * gửi về CRM với `source = 'web-design'`.
 *
 * Ghi chú triển khai:
 * - Dữ liệu lấy từ `src/utils/webDesign.ts` (một nguồn cho page + JSON-LD + payload lead + smoke test).
 * - Nếu CMS có `Service` slug `thiet-ke-website` (tab Dịch vụ kỹ thuật) thì tiêu đề/mô tả hero **và** quy
 *   trình được ghi đè bằng dữ liệu admin nhập ⇒ đổi nội dung không phải sửa code.
 * - Mọi CTA trong bảng giá cuộn xuống form và **chọn sẵn loại website** tương ứng (giảm thao tác).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  Headphones,
  Layers,
  LayoutTemplate,
  Palette,
  Phone,
  Rocket,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { Service } from '../../types/index.ts';
import { formatVnd } from '../../utils/format.ts';
import { ROUTES } from '../../utils/url.ts';
import { faqJsonLd, seoDefaults, setSeo } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import {
  EMPTY_WEB_DESIGN_FORM,
  WEB_DESIGN_BUDGETS,
  WEB_DESIGN_DEADLINES,
  WEB_DESIGN_FAQS,
  WEB_DESIGN_LEAD_SOURCE,
  WEB_DESIGN_MODULE_LABEL,
  WEB_DESIGN_PACKAGES,
  WEB_DESIGN_PAGE_DESC,
  WEB_DESIGN_PAGE_TITLE,
  WEB_DESIGN_PORTFOLIO,
  WEB_DESIGN_SERVICE_SLUG,
  WEB_DESIGN_STATS,
  WEB_DESIGN_STEPS,
  WEB_DESIGN_TYPES,
  buildWebDesignLead,
  validateWebDesignForm,
  type WebDesignFormState
} from '../../utils/webDesign.ts';

/** P2.8 — dải breadcrumb của trang (`Trang chủ › Thiết kế website`), dùng chung UI + JSON-LD. */
const webDesignCrumbs = crumbTrail({ name: WEB_DESIGN_MODULE_LABEL, path: ROUTES.webDesign });

/** Icon của 5 bước quy trình (khoá theo `step` ⇒ không phụ thuộc thứ tự khai báo). */
const STEP_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Sparkles,
  2: Palette,
  3: Code2,
  4: BadgeCheck,
  5: Headphones
};

export const WebDesignPage: React.FC = () => {
  const { settings, seoSettings, showToast } = useApp();
  const [service, setService] = useState<Service | null>(null);
  const [form, setForm] = useState<WebDesignFormState>(EMPTY_WEB_DESIGN_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Nội dung do admin biên tập trong CMS (tab Dịch vụ kỹ thuật) — chỉ ghi đè khi tồn tại.
  useEffect(() => {
    let cancelled = false;
    api
      .getService(WEB_DESIGN_SERVICE_SLUG)
      .then(res => {
        if (!cancelled && res.success && res.data) setService(res.data);
      })
      .catch(() => {
        /* Không có service trong CMS ⇒ dùng nội dung tĩnh, trang vẫn đầy đủ. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const heroTitle = service?.title || WEB_DESIGN_PAGE_TITLE;
  const heroDesc = service?.shortDesc || WEB_DESIGN_PAGE_DESC;
  // `processSteps` của CMS chỉ cần step/title/desc ⇒ `duration` là tuỳ chọn (thiếu thì dùng câu chung).
  const processSteps = service?.processSteps?.length
    ? service.processSteps.map(step => ({
        step: step.step,
        title: step.title,
        desc: step.desc,
        duration: step.duration || 'Theo tiến độ dự án'
      }))
    : WEB_DESIGN_STEPS;
  // FAQ của CMS thay khối FAQ tĩnh — memo hoá để effect SEO bên dưới không chạy lại mỗi lần render.
  const faqs = useMemo(
    () => (service?.faqs?.length ? service.faqs.map(faq => ({ q: faq.q, a: faq.a })) : WEB_DESIGN_FAQS),
    [service]
  );

  const pageSeo = seoDefaults(seoSettings, heroTitle);

  useEffect(() => {
    setSeo({
      title: pageSeo.title || `${heroTitle} — GPSOFT Store`,
      description:
        pageSeo.description ||
        'Dịch vụ thiết kế website chuyên nghiệp: web giới thiệu, web bán hàng, thương mại điện tử. Tặng tên miền + hosting, chuẩn SEO, CMS tự quản trị, bảo trì 12 tháng.',
      canonicalPath: ROUTES.webDesign,
      ogImage: pageSeo.ogImage,
      ogType: 'website',
      jsonLd: [crumbJsonLd(webDesignCrumbs), faqJsonLd(faqs.map(faq => ({ question: faq.q, answer: faq.a })))]
    });
  }, [pageSeo.title, pageSeo.description, pageSeo.ogImage, heroTitle, faqs]);

  const scrollToForm = (preset?: string) => {
    if (preset) setForm(prev => ({ ...prev, websiteType: preset }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const update = <K extends keyof WebDesignFormState>(key: K, value: WebDesignFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateWebDesignForm(form);
    setErrors(found);
    if (found.length > 0) {
      showToast(found[0], 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.submitLead(buildWebDesignLead(form));
      if (res.success) {
        setSubmitted(true);
        setForm(EMPTY_WEB_DESIGN_FORM);
        showToast('Đã gửi yêu cầu thiết kế website! Chuyên viên sẽ liên hệ trong 15 phút.', 'success');
      }
    } catch {
      showToast('Có lỗi khi gửi yêu cầu, vui lòng gọi hotline để được hỗ trợ ngay.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#0f3b6b] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <Breadcrumb items={webDesignCrumbs} variant="plain" />
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#8fc9f8]">
              <LayoutTemplate className="w-3.5 h-3.5" />
              Dịch vụ {WEB_DESIGN_MODULE_LABEL}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">{heroTitle}</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">{heroDesc}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToForm()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-sm font-bold shadow-lg shadow-[#1C86EE]/30 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Nhận báo giá miễn phí
              </button>
              <a
                href={`tel:${(settings?.hotline || '19008899').replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold transition-colors"
              >
                <Phone className="w-4 h-4" />
                Gọi {settings?.hotline || '1900 8899'}
              </a>
              <Link
                to={ROUTES.services}
                className="inline-flex items-center gap-1.5 py-3 text-xs font-semibold text-[#8fc9f8] hover:text-white transition-colors"
              >
                Xem toàn bộ dịch vụ <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {WEB_DESIGN_STATS.map(stat => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                  <div className="text-xl font-extrabold text-[#8fc9f8]">{stat.value}</div>
                  <div className="text-[11px] text-slate-300 leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bảng giá 3 gói ────────────────────────────────────────────────────────────────────── */}
      <section id="bang-gia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Bảng giá dịch vụ
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900">Chọn gói phù hợp với quy mô của bạn</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Giá minh bạch theo phạm vi tính năng, không phát sinh chi phí ẩn. Cần cấu hình riêng? GPSOFT báo giá theo
            yêu cầu trong 15 phút.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WEB_DESIGN_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-xl ${
                pkg.isHighlighted ? 'border-[#1C86EE] ring-2 ring-[#1C86EE]/25' : 'border-slate-200'
              }`}
            >
              {pkg.isHighlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#1C86EE] text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                  Được chọn nhiều nhất
                </span>
              )}
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{pkg.name}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{pkg.tagline}</p>

              <div className="mt-5 pb-5 border-b border-slate-100">
                <div className="text-2xl font-extrabold text-[#1C86EE]">
                  {pkg.price === null ? 'Báo giá riêng' : formatVnd(pkg.price)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{pkg.priceNote}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5CACEE]" /> {pkg.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#5CACEE]" />{' '}
                    {pkg.features.filter(feature => feature.included).length} hạng mục
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                <strong className="text-slate-700">Phù hợp:</strong> {pkg.bestFor}
              </p>

              <ul className="mt-4 flex-1 space-y-2.5 text-xs">
                {pkg.features.map(feature => (
                  <li key={feature.label} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'text-slate-700' : 'text-slate-400 line-through'}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() =>
                  scrollToForm(pkg.name.includes('Thương Mại') ? WEB_DESIGN_TYPES[1] : WEB_DESIGN_TYPES[0])
                }
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
                  pkg.isHighlighted
                    ? 'bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] text-white shadow-md shadow-[#1C86EE]/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Rocket className="w-4 h-4" />
                Đăng ký {pkg.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dự án mẫu (portfolio) ─────────────────────────────────────────────────────────────── */}
      <section id="du-an" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
            <BadgeCheck className="w-3.5 h-3.5" /> Dự án đã bàn giao
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900">Website thật — khách hàng thật</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {WEB_DESIGN_PORTFOLIO.length} dự án tiêu biểu theo ngành. Bấm “Xem demo” để trải nghiệm trực tiếp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WEB_DESIGN_PORTFOLIO.map(item => (
            <article
              key={item.id}
              className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-shadow"
            >
              <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-xs">
                  {item.industry}
                </span>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.result}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  to={item.demoUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C86EE] hover:text-[#1472CE] transition-colors"
                >
                  Xem demo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="quy-trinh" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5" /> Quy trình triển khai
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900">
              {processSteps.length} bước rõ ràng — bạn luôn biết dự án đang ở đâu
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {processSteps.map(step => {
              const Icon = STEP_ICONS[step.step] || Sparkles;
              return (
                <div
                  key={`${step.step}-${step.title}`}
                  className="relative bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs hover:border-[#1C86EE]/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#1C86EE]/12 text-[#1C86EE] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-100">{String(step.step).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{step.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1C86EE]">
                    <Clock className="w-3.5 h-3.5" /> {step.duration}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ (khớp FAQPage JSON-LD) ───────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center space-y-3 mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
            <Headphones className="w-3.5 h-3.5" /> Câu hỏi thường gặp
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900">Giải đáp trước khi bạn đặt hàng</h2>
        </div>

        <div className="space-y-3">
          {faqs.map(item => (
            <details
              key={item.q}
              className="group bg-white rounded-2xl border border-slate-200 px-5 py-4 open:border-[#1C86EE]/60 open:shadow-md"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold text-slate-900 list-none">
                <span>{item.q}</span>
                <span className="text-[#1C86EE] text-lg leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-xs text-slate-500 leading-relaxed mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Form đặt yêu cầu (⇒ Lead source=web-design) ───────────────────────────────────────── */}
      <section ref={formRef} id="dang-ky" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800">
          <div className="lg:col-span-5 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#8fc9f8]">
              <Sparkles className="w-3.5 h-3.5" /> Nhận báo giá trong 15 phút
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold leading-tight">
              Đăng ký thiết kế website — GPSOFT tư vấn miễn phí
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Điền nhu cầu của bạn, chuyên viên GPSOFT sẽ gọi lại tư vấn giải pháp, gửi bản demo tham khảo và báo giá
              chi tiết theo từng hạng mục — hoàn toàn miễn phí.
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                Khảo sát & tư vấn cấu trúc website theo ngành hàng
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                Báo giá minh bạch theo từng hạng mục, không phí ẩn
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                Ký hợp đồng – triển khai – nghiệm thu theo đúng mốc cam kết
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">
                Hotline:{' '}
                <a
                  href={`tel:${(settings?.hotline || '19008899').replace(/\s/g, '')}`}
                  className="text-white font-bold"
                >
                  {settings?.hotline || '1900 8899'}
                </a>
                {settings?.hotline2 ? ` · ${settings.hotline2}` : ''}
              </div>
              <div className="text-slate-400">
                Email: <span className="text-white font-semibold">{settings?.supportEmail || 'hotro@gpsoft.vn'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h3 className="text-lg font-bold">Đã nhận yêu cầu của bạn!</h3>
                <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                  Chuyên viên thiết kế website của GPSOFT sẽ liên hệ trong vòng 15 phút làm việc. Nếu cần gấp, gọi
                  ngay hotline để được hỗ trợ tức thì.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold transition-colors cursor-pointer"
                >
                  Gửi thêm yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white text-slate-900 rounded-2xl p-5 sm:p-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Họ tên người liên hệ *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Số điện thoại *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email (không bắt buộc)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="email@congty.vn"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Loại website</label>
                    <select
                      value={form.websiteType}
                      onChange={e => update('websiteType', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      {WEB_DESIGN_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Ngân sách dự kiến</label>
                    <select
                      value={form.budget}
                      onChange={e => update('budget', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      {WEB_DESIGN_BUDGETS.map(budget => (
                        <option key={budget} value={budget}>
                          {budget}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Thời gian mong muốn</label>
                    <select
                      value={form.deadline}
                      onChange={e => update('deadline', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      {WEB_DESIGN_DEADLINES.map(deadline => (
                        <option key={deadline} value={deadline}>
                          {deadline}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mô tả nhu cầu</label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={e => update('message', e.target.value)}
                    placeholder="VD: Cần website bán đồ gia dụng, khoảng 200 sản phẩm, có thanh toán online và đồng bộ tồn kho..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>

                {errors.length > 0 && (
                  <ul className="space-y-1 bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-600">
                    {errors.map(error => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] text-white text-sm font-bold shadow-md shadow-[#1C86EE]/25 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu & nhận báo giá'}
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Thông tin của bạn được bảo mật theo chính sách bảo mật của GPSOFT, chỉ dùng để tư vấn dự án.
                </p>
              </form>
            )}
          </div>

        </div>
      </section>
    </div>
  );
};
