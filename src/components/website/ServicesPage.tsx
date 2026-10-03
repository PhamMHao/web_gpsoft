import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Service } from '../../types/index.ts';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { setSeo, seoDefaults, serviceJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { SERVICES_CRUMB, crumbJsonLd, crumbLabel, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import {
  Wrench,
  ShieldCheck,
  RefreshCw,
  Building2,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  PhoneCall,
  Sparkles
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { openQuoteModal, selectedServiceSlug, seoSettings } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const res = await api.getServices();
        if (res.success && res.data.length > 0) {
          setServices(res.data);
          if (selectedServiceSlug) {
            const matched = res.data.find(s => s.slug === selectedServiceSlug || s.id === selectedServiceSlug);
            setActiveService(matched || res.data[0]);
          } else {
            setActiveService(res.data[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load services:', e);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, [selectedServiceSlug]);

  // P0.2 — SEO dịch vụ: title theo dịch vụ đang xem + `Service`/`BreadcrumbList` JSON-LD.
  const servicesSeo = seoDefaults(seoSettings, 'Dịch Vụ Sửa Chữa & Bảo Trì Thiết Bị Công Nghệ');
  const servicePath = activeService
    ? pathFor('services', { serviceSlug: activeService.slug || activeService.id })
    : ROUTES.services;

  // P2.8 — breadcrumb: `Trang chủ › Dịch vụ sửa chữa › <dịch vụ đang xem>`.
  const serviceCrumbs = crumbTrail(
    SERVICES_CRUMB,
    activeService ? { name: crumbLabel(activeService.title), path: servicePath } : null
  );

  useEffect(() => {
    setSeo({
      title: activeService?.title
        ? `${activeService.title} — Dịch Vụ GPSOFT`
        : servicesSeo.title,
      description: activeService?.shortDesc || servicesSeo.description,
      canonicalPath: servicePath,
      ogImage: activeService?.thumbnail || servicesSeo.ogImage,
      jsonLd: [
        ...(activeService ? [serviceJsonLd(activeService)] : []),
        crumbJsonLd(serviceCrumbs)
      ]
    });
    // `serviceCrumbs` được suy ra từ `servicePath` + `activeService` ⇒ chỉ cần các phụ thuộc gốc.
  }, [activeService, servicePath, servicesSeo.title, servicesSeo.description, servicesSeo.ogImage]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tải thông tin dịch vụ...</p>
      </div>
    );
  }

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wrench': return <Wrench className="w-5 h-5 text-[#1C86EE]" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-amber-600" />;
      case 'Building2': return <Building2 className="w-5 h-5 text-[#5CACEE]" />;
      default: return <Wrench className="w-5 h-5 text-[#1C86EE]" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Breadcrumb items={serviceCrumbs} variant="pill" className="mb-1" />
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold uppercase tracking-wider">
          Phòng Lab Đạt Chuẩn Quốc Tế
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Dịch Vụ Kỹ Thuật & Giải Pháp Công Nghệ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Đội ngũ kỹ sư giàu kinh nghiệm, thiết bị chuyên dụng hiện đại, minh bạch quy trình từ khâu tiếp nhận đến bàn giao.
        </p>
      </div>

      {/* Services Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map(srv => {
          const isSelected = activeService?.id === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => {
                setActiveService(srv);
                setOpenFaqIdx(0);
              }}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-[#1C86EE] bg-white shadow-xl scale-[1.02]'
                  : 'border-slate-200/80 bg-white hover:border-[#5CACEE]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#1C86EE]/10 flex items-center justify-center">
                  {getServiceIcon(srv.icon)}
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#1C86EE]/15 text-[#1C86EE]">
                  {srv.priceRange}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{srv.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{srv.shortDesc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Service Detailed View */}
      {activeService && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xl space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chi Tiết Dịch Vụ</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {activeService.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {activeService.content}
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => openQuoteModal(activeService.title)}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#1C86EE]/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt Lịch Tiếp Nhận / Báo Giá</span>
                </button>
                <div className="text-xs text-slate-500 font-medium">
                  Chi phí dự kiến: <strong className="text-[#1C86EE] font-bold">{activeService.priceRange}</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <img
                src={activeService.thumbnail}
                alt={activeService.title}
                className="w-full aspect-video sm:aspect-4/3 object-cover rounded-2xl shadow-md border border-slate-200"
              />
            </div>
          </div>

          {/* 4-Step Process Timeline */}
          {activeService.processSteps && activeService.processSteps.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">
                  Quy Trình 4 Bước Chuyên Nghiệp & Minh Bạch
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Khách hàng có thể quan sát trực tiếp kỹ thuật viên thao tác
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeService.processSteps.map(step => (
                  <div
                    key={step.step}
                    className="p-5 rounded-2xl bg-[#FFFEEA]/60 border border-slate-200/80 space-y-2 relative"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1C86EE] text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {step.step}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 pt-1">
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Accordion */}
          {activeService.faqs && activeService.faqs.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-base sm:text-xl font-bold text-slate-900">
                Câu Hỏi Thường Gặp Về Dịch Vụ
              </h3>

              <div className="space-y-3">
                {activeService.faqs.map((faq, i) => {
                  const isOpen = openFaqIdx === i;
                  return (
                    <div
                      key={i}
                      className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaqIdx(isOpen ? null : i)}
                        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-800 hover:text-[#1C86EE] cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-180 text-[#1C86EE]' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
