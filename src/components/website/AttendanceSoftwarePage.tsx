/**
 * P2.2 — Trang module "Phần mềm chấm công" `/phan-mem-cham-cong?tab=<id>`.
 *
 * Quy ước của trang:
 * - **URL là nguồn sự thật** cho tab: `?tab=cham-cong|nhan-su|tien-luong|kiem-xuong`; tab mặc định
 *   dùng URL sạch `/phan-mem-cham-cong` (canonical), giá trị `?tab=` rác bị loại bỏ bằng `replace`.
 * - Nội dung tĩnh render ngay (tốt cho SEO/SSR); nếu CMS có `Page` slug `phan-mem-cham-cong-<tab>`
 *   thì khối mô tả được **ghi đè** bằng nội dung admin nhập (xem `PagesView`).
 * - Mọi CTA "Nhận demo" mở `QuoteModal` ⇒ lead về CRM, không cần form riêng.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  Boxes,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Factory,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Gauge,
  GraduationCap,
  HardHat,
  Landmark,
  MapPin,
  Minus,
  Network,
  Package,
  PhoneCall,
  QrCode,
  Receipt,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { Page } from '../../types/index.ts';
import {
  ATTENDANCE_MODULE_LABEL,
  ATTENDANCE_TABS,
  DEFAULT_ATTENDANCE_TAB_ID,
  attendanceCmsSlug,
  attendanceTab,
  attendanceTabPath,
  findAttendanceTab
} from '../../utils/attendance.ts';
import { formatVnd } from '../../utils/format.ts';
import { ROUTES } from '../../utils/url.ts';
import { faqJsonLd, seoDefaults, setSeo } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';

type IconComponent = React.ComponentType<{ className?: string }>;

/** Icon của 4 tab (khoá = `AttendanceTabId`). */
const TAB_ICONS: Record<string, IconComponent> = {
  'cham-cong': ScanFace,
  'nhan-su': Users,
  'tien-luong': Wallet,
  'kiem-xuong': Factory
};

/**
 * Icon cho khối tính năng — khoá `icon` khai báo trong `src/utils/attendance.ts`.
 * **Export** để smoke test (`tests/attendanceUi.smoke.tsx`) chốt: mọi khoá `icon` của 4 tab đều có icon
 * (thiếu 1 khoá ⇒ khối tính năng rơi về icon mặc định, lỗi rất khó thấy bằng mắt).
 */
export const FEATURE_ICONS: Record<string, IconComponent> = {
  ScanFace,
  Fingerprint,
  QrCode,
  MapPin,
  CalendarClock,
  BellRing,
  UserPlus,
  FileText,
  GraduationCap,
  ClipboardCheck,
  Network,
  Smartphone,
  Calculator,
  Receipt,
  Landmark,
  Banknote,
  TrendingUp,
  FileSpreadsheet,
  Factory,
  HardHat,
  Package,
  BadgeCheck,
  Gauge,
  Boxes
};

/** Màu badge kết quả trong ảnh chụp giao diện (khoá `AttendanceMockRow.tone`). */
const TONE_STYLES: Record<'ok' | 'warn' | 'info', string> = {
  ok: 'bg-emerald-50 text-emerald-600',
  warn: 'bg-amber-50 text-amber-600',
  info: 'bg-slate-100 text-slate-500'
};

export const AttendanceSoftwarePage: React.FC = () => {
  const { openQuoteModal, seoSettings, settings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = attendanceTab(searchParams.get('tab'));
  const tabPath = attendanceTabPath(tab.id);
  // P2.8 — breadcrumb theo tab: `Trang chủ › Phần mềm chấm công › <tab>` (dùng chung UI + JSON-LD).
  const attendanceCrumbs = crumbTrail(
    { name: ATTENDANCE_MODULE_LABEL, path: ROUTES.attendance },
    { name: tab.label, path: tabPath }
  );
  const cmsSlug = attendanceCmsSlug(tab.id);
  const [cmsPage, setCmsPage] = useState<Page | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Chuẩn hoá `?tab=`: chấp nhận id viết hoa, slug CMS (`phan-mem-cham-cong-nhan-su`) hoặc giá trị
  // rác → sửa lại URL bằng `replace` để không tồn tại 2 URL cho cùng một nội dung (SEO).
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw || findAttendanceTab(raw)?.id === raw) return;
    const matched = findAttendanceTab(raw);
    const next = new URLSearchParams(searchParams);
    if (!matched || matched.id === DEFAULT_ATTENDANCE_TAB_ID) next.delete('tab');
    else next.set('tab', matched.id);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Nội dung mô tả của tab do CMS quản lý (`PagesView` → slug `phan-mem-cham-cong-<tab>`).
  // Chưa có trang / API lỗi / trang chưa publish ⇒ giữ nội dung tĩnh trong `utils/attendance.ts`.
  useEffect(() => {
    let alive = true;
    setCmsPage(null);
    api
      .getPage(cmsSlug)
      .then(res => {
        if (!alive) return;
        const page = res.success ? res.data : null;
        setCmsPage(page && page.isPublished !== false && (page.content || '').trim() ? page : null);
      })
      .catch(() => {
        if (alive) setCmsPage(null);
      });
    return () => {
      alive = false;
    };
  }, [cmsSlug]);

  useEffect(() => setOpenFaqIdx(0), [tab.id]);

  const seo = useMemo(
    () => seoDefaults(seoSettings, `${ATTENDANCE_MODULE_LABEL} — GPSOFT`),
    [seoSettings]
  );

  // P0.2 — SEO theo tab: canonical của tab mặc định là URL sạch + BreadcrumbList + FAQPage
  // (câu hỏi/đáp hiển thị thật ở khối FAQ bên dưới nên hợp lệ với Google).
  useEffect(() => {
    setSeo({
      title: cmsPage?.seo?.metaTitle || `${tab.cmsTitle} — ${ATTENDANCE_MODULE_LABEL} | GPSOFT`,
      description: cmsPage?.seo?.metaDesc || tab.tagline,
      canonicalPath: tabPath,
      ogImage: seo.ogImage,
      jsonLd: [
        crumbJsonLd(attendanceCrumbs),
        faqJsonLd(tab.faqs.map(faq => ({ question: faq.q, answer: faq.a })))
      ]
    });
  }, [cmsPage, tab, tabPath, seo.ogImage]);

  const openDemo = () => openQuoteModal(`${ATTENDANCE_MODULE_LABEL} — ${tab.cmsTitle}`, 'quote');
  const hotline = settings?.hotline?.trim() || '1900 8899';
  const description = cmsPage ? (cmsPage.content || '').split(/\n{2,}/) : tab.description;

  return (
    <div className="bg-[#FFFFE8]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-white via-[#F6FAFF] to-[#EAF3FF] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <Breadcrumb items={attendanceCrumbs} variant="header" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                ThinkPro Software · {ATTENDANCE_MODULE_LABEL}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                {tab.cmsTitle}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{tab.tagline}</p>
              <div className="flex flex-wrap gap-2">
                {tab.badges.map(badge => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1C86EE]" />
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={openDemo}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors"
                >
                  Nhận demo miễn phí
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE]/40 text-slate-800 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#1C86EE]" />
                  Tư vấn: {hotline}
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {tab.metrics.map(metric => (
                <div
                  key={metric.label}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
                >
                  <p className="text-lg sm:text-xl font-black text-[#1C86EE]">{metric.value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ── Thanh 4 tab: mỗi tab là một URL thật (F5/chia sẻ link vẫn đúng tab) ── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            role="tablist"
            aria-label={ATTENDANCE_MODULE_LABEL}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2 py-4"
          >
            {ATTENDANCE_TABS.map(item => {
              const Icon = TAB_ICONS[item.id] || Sparkles;
              const active = item.id === tab.id;
              return (
                <Link
                  key={item.id}
                  to={attendanceTabPath(item.id)}
                  role="tab"
                  aria-selected={active}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    active
                      ? 'bg-[#1C86EE]/10 border-[#1C86EE]/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-[#1C86EE]/30 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      active ? 'bg-[#1C86EE] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span
                      className={`block text-xs sm:text-sm font-bold truncate ${
                        active ? 'text-[#1C86EE]' : 'text-slate-800'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 truncate">{item.navHint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-12">
        {/* ── Giới thiệu module (CMS ghi đè được qua Page `phan-mem-cham-cong-<tab>`) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tổng quan module
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{tab.cmsTitle}</h2>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              {description
                .map(paragraph => paragraph.trim())
                .filter(text => text.length > 0)
                .map((paragraph, index) => (
                  <p key={index} className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                {cmsPage
                  ? 'Nội dung đang lấy từ CMS — sửa ở Quản trị › Trang nội dung.'
                  : `Nội dung mặc định. Tạo trang “${tab.cmsTitle}” trong CMS (Trang nội dung › Tạo 4 trang module Chấm công) để tự sửa.`}
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5 space-y-3">
            {[
              {
                icon: ShieldCheck,
                title: 'Bảo mật & phân quyền',
                desc: 'Phân quyền theo chức danh, nhật ký truy cập và dữ liệu được mã hoá khi lưu trữ.'
              },
              {
                icon: Network,
                title: 'Kết nối thiết bị & ERP',
                desc: 'Máy chấm công, camera AI, HRM/ERP tích hợp qua API và SSO — không nhập liệu hai lần.'
              },
              {
                icon: Smartphone,
                title: 'Dùng trên mọi thiết bị',
                desc: 'Web cho quản trị, app iOS/Android cho nhân viên chấm công và tra cứu phiếu lương.'
              }
            ].map(item => (
              <div
                key={item.title}
                className="flex gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
              >
                <span className="w-9 h-9 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </aside>
        </section>
        {/* ── Tính năng chính ── */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
                <BadgeCheck className="w-3.5 h-3.5" />
                Tính năng chính
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                {tab.cmsTitle} làm được gì?
              </h2>
            </div>
            <button
              onClick={openDemo}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE]/40 text-[#1C86EE] text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              Đặt lịch demo 1-1
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tab.features.map(feature => {
              const Icon = FEATURE_ICONS[feature.icon] || Sparkles;
              return (
                <div
                  key={feature.title}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#1C86EE]/30 hover:shadow-sm transition-all space-y-3"
                >
                  <span className="w-10 h-10 rounded-2xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{feature.title}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
        {/* ── Ảnh chụp giao diện (dựng bằng CSS nên không phụ thuộc file ảnh ngoài) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
                <Gauge className="w-3.5 h-3.5" />
                Giao diện thực tế
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                Một màn hình, thấy ngay toàn bộ tình hình
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dashboard hiển thị dữ liệu {tab.label.toLowerCase()} theo thời gian thực: nhân sự đã điểm
              danh, trường hợp cần xử lý và cảnh báo bất thường. Quản lý lọc theo chi nhánh, phòng ban
              hoặc ca làm việc chỉ trong hai cú nhấp.
            </p>
            <ul className="space-y-2">
              {[
                'Dữ liệu cập nhật tức thời, không chờ đồng bộ cuối ngày',
                'Bộ lọc theo chi nhánh, phòng ban, ca làm việc',
                'Xuất Excel/CSV hoặc gửi báo cáo tự động qua email'
              ].map(line => (
                <li key={line} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-[#1C86EE] shrink-0 mt-0.5" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-slate-900 p-3 sm:p-4 shadow-xl">
              <div className="rounded-2xl bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{tab.mock.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{tab.mock.subtitle}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                    Realtime
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {tab.mock.rows.map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {row.label.trim().charAt(0)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-800 truncate">
                          {row.label}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${
                          TONE_STYLES[row.tone || 'info']
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 bg-slate-50 text-[10px] font-semibold text-slate-600">
                  {tab.mock.footer}
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* ── Bảng giá 3 gói (số tiền lấy từ `utils/attendance.ts`) ── */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
                <Banknote className="w-3.5 h-3.5" />
                Bảng giá gói dịch vụ
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                Chọn gói theo quy mô doanh nghiệp
              </h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Miễn phí cài đặt · Dùng thử 14 ngày · Hợp đồng theo năm giảm 15%
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tab.plans.map(plan => (
              <div
                key={plan.id}
                className={`flex flex-col p-6 rounded-3xl border shadow-xs ${
                  plan.highlight ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200/80'
                }`}
              >
                {plan.highlight && (
                  <span className="self-start px-2.5 py-1 rounded-lg bg-[#1C86EE] text-white text-[10px] font-bold uppercase tracking-wide">
                    Được chọn nhiều nhất
                  </span>
                )}
                <p
                  className={`text-sm font-black mt-3 ${
                    plan.highlight ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {plan.name}
                </p>
                <p className={`text-[11px] ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {plan.audience}
                </p>

                <div className="mt-4">
                  <p
                    className={`text-xl font-black ${
                      plan.highlight ? 'text-white' : 'text-[#1C86EE]'
                    }`}
                  >
                    {plan.price === null ? 'Liên hệ báo giá' : formatVnd(plan.price)}
                  </p>
                  <p className={`text-[11px] mt-1 ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.priceNote}
                  </p>
                </div>

                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map(feature => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2 text-[11px] leading-relaxed ${
                        plan.highlight ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#1C86EE] shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {(plan.notIncluded || []).map(feature => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2 text-[11px] leading-relaxed ${
                        plan.highlight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Minus className="w-4 h-4 shrink-0" />
                      <span className="line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={openDemo}
                  className={`mt-5 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    plan.highlight
                      ? 'bg-[#1C86EE] hover:bg-[#1472CE] text-white'
                      : 'bg-[#1C86EE]/10 hover:bg-[#1C86EE] text-[#1C86EE] hover:text-white'
                  }`}
                >
                  Nhận demo gói này
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
        {/* ── Bảng so sánh chi tiết giữa 3 gói ── */}
        <section className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
              <ClipboardCheck className="w-3.5 h-3.5" />
              So sánh chi tiết
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
              Gói nào phù hợp với doanh nghiệp của bạn?
            </h2>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tiêu chí
                  </th>
                  {tab.plans.map(plan => (
                    <th
                      key={plan.id}
                      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${
                        plan.highlight ? 'text-[#1C86EE]' : 'text-slate-700'
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tab.compare.map(row => (
                  <tr key={row.label} className="hover:bg-slate-50/70">
                    <th
                      scope="row"
                      className="px-4 py-3 text-[11px] font-semibold text-slate-600 text-left align-top"
                    >
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`} className="px-4 py-3 text-[11px] align-top">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <CheckCircle2 className="w-4 h-4 text-[#1C86EE]" />
                          ) : (
                            <Minus className="w-4 h-4 text-slate-300" />
                          )
                        ) : (
                          <span className="text-slate-600 leading-relaxed">{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {/* ── FAQ (nội dung khớp FAQPage JSON-LD ở trên) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
                <FileText className="w-3.5 h-3.5" />
                Câu hỏi thường gặp
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                Khách hàng hỏi gì về {tab.label.toLowerCase()}?
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Chưa thấy câu trả lời bạn cần? Gọi trực tiếp cho chuyên viên ThinkPro Software hoặc để lại
              số điện thoại trong form demo — chúng tôi phản hồi trong 15 phút làm việc.
            </p>
            <a
              href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-[#1C86EE]/40 text-slate-800 text-xs font-bold shadow-xs transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-[#1C86EE]" />
              {hotline}
            </a>
          </div>

          <div className="lg:col-span-8 space-y-3">
            {tab.faqs.map((faq, index) => {
              const open = openFaqIdx === index;
              return (
                <div
                  key={faq.q}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(open ? null : index)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        open ? 'rotate-180 text-[#1C86EE]' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <p className="px-5 pb-4 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        {/* ── CTA cuối trang ── */}
        <section className="rounded-3xl bg-[#1C86EE] p-6 sm:p-10 text-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                ThinkPro Software
              </span>
              <h2 className="text-lg sm:text-2xl font-black leading-tight">
                Sẵn sàng số hoá {tab.label.toLowerCase()} cho doanh nghiệp của bạn?
              </h2>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Đội ngũ ThinkPro Software khảo sát quy trình hiện tại, cấu hình bản demo theo đúng dữ liệu
                nhân sự và ca làm việc của bạn trong 48 giờ. Miễn phí, không ràng buộc hợp đồng.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={openDemo}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-[#1C86EE] text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                >
                  Nhận demo miễn phí
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/40 hover:bg-white/10 text-white text-xs sm:text-sm font-bold transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  {hotline}
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {[
                { title: 'Cấu hình demo trong 48 giờ', desc: 'Theo dữ liệu thật của doanh nghiệp' },
                { title: 'Hỗ trợ 24/7', desc: 'Kênh Zalo, hotline và email' },
                { title: 'Cam kết SLA 99,9%', desc: 'Vận hành ổn định, có backup định kỳ' }
              ].map(item => (
                <div key={item.title} className="p-4 rounded-2xl bg-white/10 border border-white/20">
                  <p className="text-xs font-bold">{item.title}</p>
                  <p className="text-[11px] text-white/75 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Liên kết nội bộ sang 3 module còn lại (URL-driven tabs) ── */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1C86EE]">
              <Boxes className="w-3.5 h-3.5" />
              Các module khác
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
              Trọn bộ giải pháp {ATTENDANCE_MODULE_LABEL}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ATTENDANCE_TABS.filter(item => item.id !== tab.id).map(item => {
              const Icon = TAB_ICONS[item.id] || Sparkles;
              return (
                <Link
                  key={item.id}
                  to={attendanceTabPath(item.id)}
                  className="group p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#1C86EE]/40 hover:shadow-sm transition-all space-y-3"
                >
                  <span className="w-10 h-10 rounded-2xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.navHint}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1C86EE]">
                    Xem chi tiết
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AttendanceSoftwarePage;
