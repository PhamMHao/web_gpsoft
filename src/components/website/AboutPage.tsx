import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ROUTES } from '../../utils/url.ts';
import { setSeo, seoDefaults, organizationJsonLd } from '../../utils/seo.ts';
// P2.8 — breadcrumb dùng chung: một mảng `crumbs` cho cả UI lẫn `BreadcrumbList` JSON-LD.
import { ABOUT_CRUMB, crumbJsonLd, crumbTrail } from '../../utils/breadcrumb.ts';
import { Breadcrumb } from '../common/Breadcrumb.tsx';
import {
  ShieldCheck,
  Award,
  Users,
  Building,
  Target,
  Eye,
  HeartHandshake,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

/** Dải breadcrumb của trang (dùng cho cả UI và JSON-LD ⇒ không thể lệch). */
const aboutCrumbs = crumbTrail(ABOUT_CRUMB);

export const AboutPage: React.FC = () => {
  const { setWebsitePage, settings, seoSettings } = useApp();

  // P0.2 — SEO trang giới thiệu: mô tả lấy từ CMS SEO/Description, kèm JSON-LD Organization.
  const aboutSeo = seoDefaults(seoSettings);

  useEffect(() => {
    setSeo({
      title: 'Giới Thiệu GPSOFT — Hệ Thống Bán Lẻ Công Nghệ Chính Hãng',
      description:
        aboutSeo.description ||
        'GPSOFT Store: hệ thống bán lẻ thiết bị công nghệ chính hãng với 6 showroom, bảo hành 12–24 tháng và dịch vụ hậu mãi tận tâm.',
      canonicalPath: ROUTES.about,
      ogImage: aboutSeo.ogImage,
      jsonLd: [organizationJsonLd(settings), crumbJsonLd(aboutCrumbs)]
    });
  }, [aboutSeo.description, aboutSeo.ogImage, settings]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Hero Intro */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Breadcrumb items={aboutCrumbs} variant="header" className="justify-center mb-1" />
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold uppercase tracking-wider">
          Về Chúng Tôi - GPSOFT
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Kiến Tạo Chuẩn Mực Bán Lẻ & Giải Pháp Công Nghệ Đích Thực
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Thành lập từ năm 2018, GPSOFT tự hào là đối tác chiến lược hàng đầu của các tập đoàn công nghệ toàn cầu tại Việt Nam, mang tới những thiết bị điện tử chính hãng và dịch vụ bảo trì kỹ thuật xuất sắc.
        </p>
      </div>

      {/* Stats counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="text-center space-y-1">
          <div className="text-3xl sm:text-5xl font-black text-[#5CACEE]">8+</div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">Năm kinh nghiệm</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-3xl sm:text-5xl font-black text-emerald-400">50,000+</div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">Khách hàng tin chọn</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-3xl sm:text-5xl font-black text-[#FFFDF0]">100%</div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">Hàng chính hãng VAT</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-3xl sm:text-5xl font-black text-[#1C86EE]">4.9/5</div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">Đánh giá hài lòng</div>
        </div>
      </div>

      {/* Vision, Mission & Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4 hover:border-[#1C86EE]/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#1C86EE]/15 text-[#1C86EE] flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Sứ Mệnh Của Chúng Tôi</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            Phổ cập những thiết bị công nghệ hiện đại nhất với mức giá hợp lý và dịch vụ sau bán hàng tận tâm, góp phần nâng cao năng suất và chất lượng sống cho người Việt.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4 hover:border-[#5CACEE]/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#5CACEE]/20 text-[#1C86EE] flex items-center justify-center">
            <Eye className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Tầm Nhìn 2030</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            Trở thành hệ sinh thái bán lẻ và dịch vụ giải pháp phần cứng công nghệ tin cậy hàng đầu khu vực, sở hữu hệ thống chuỗi showroom trải nghiệm chuẩn quốc tế.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4 hover:border-emerald-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Giá Trị Cốt Lõi</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            <strong>Chính Trực - Tận Tâm - Tiên Phong.</strong> Chúng tôi cam kết tuyệt đối không bán hàng giả, hàng dựng và luôn đặt quyền lợi của khách hàng lên hàng đầu.
          </p>
        </div>
      </div>

      {/* Timeline Milestones */}
      <div className="bg-[#FFFEEA]/60 rounded-3xl p-8 sm:p-12 border border-slate-200/80 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Chặng Đường Phát Triển
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Từ một cửa hàng chuyên phụ kiện năm 2018 đến chuỗi bán lẻ công nghệ hôm nay
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-[#1C86EE]/50 transition-colors">
            <div className="text-[#1C86EE] font-extrabold text-xl">2018</div>
            <h4 className="font-bold text-slate-900 text-sm">Khởi Đầu Khát Vọng</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mở showroom đầu tiên tại Hà Nội, tập trung vào phụ kiện và smartphone chính hãng.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-[#1C86EE]/50 transition-colors">
            <div className="text-[#1C86EE] font-extrabold text-xl">2020</div>
            <h4 className="font-bold text-slate-900 text-sm">Mở Rộng Dịch Vụ</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Thành lập Trung tâm Kỹ thuật Lab GPSOFT, nâng cấp năng lực sửa chữa phần cứng.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-[#1C86EE]/50 transition-colors">
            <div className="text-[#1C86EE] font-extrabold text-xl">2022</div>
            <h4 className="font-bold text-slate-900 text-sm">Bắc - Nam Một Nhà</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khai trương chi nhánh Showroom Quận 1, TP. Hồ Chí Minh với kho hàng phục vụ giao hỏa tốc 2h.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-[#1C86EE]/50 transition-colors">
            <div className="text-[#1C86EE] font-extrabold text-xl">2025</div>
            <h4 className="font-bold text-slate-900 text-sm">Chuyển Đổi Số Toàn Diện</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ra mắt hệ thống quản trị CMS & thương mại điện tử hiện đại, phục vụ khách hàng đa kênh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
