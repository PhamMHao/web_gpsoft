import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Phone, ChevronUp } from 'lucide-react';

const MessengerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.16 7.15V22l3.03-1.66c1.17.32 2.44.5 3.81.5 5.64 0 10-4.13 10-9.14S17.64 2 12 2zm1.06 12.33l-2.6-2.77-5.08 2.77 5.59-5.93 2.66 2.77 5.02-2.77-5.59 5.93z" />
  </svg>
);

export const FloatingContactBar: React.FC = () => {
  const { settings, viewMode, websitePage } = useApp();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Theo dõi vị trí cuộn trang để ẩn/hiện nút Back-to-top mượt mà
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Không hiển thị trong khu vực quản trị CMS hoặc trang login CMS
  if (viewMode === 'cms' || websitePage === 'admin-login') {
    return null;
  }

  const hotline = settings?.hotline || '1900 8899';
  const cleanPhone = hotline.replace(/[^0-9]/g, '');
  const zaloUrl = settings?.socials?.zalo || (cleanPhone ? `https://zalo.me/${cleanPhone}` : 'https://zalo.me');
  const facebookUrl = settings?.socials?.facebook || 'https://facebook.com';

  return (
    <aside
      aria-label="Liên hệ nhanh và tiện ích"
      className="fixed bottom-6 right-5 sm:right-6 z-40 flex flex-col items-center gap-3 select-none print:hidden"
    >
      {/* 1. Nút Gọi Hotline (Hiệu ứng nhịp đập & sóng âm màu xanh lá) */}
      <div className="relative group">
        <a
          href={`tel:${cleanPhone || '19008899'}`}
          aria-label={`Gọi hotline tư vấn: ${hotline}`}
          className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/35 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          {/* Vòng sóng âm radar xanh lá dịu mắt */}
          <span className="absolute -inset-1 rounded-full bg-emerald-500 opacity-50 animate-ping pointer-events-none" />
          <Phone className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
        </a>

        {/* Tooltip chỉ dẫn khi hover */}
        <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
          Gọi hotline: <strong className="text-emerald-400">{hotline}</strong>
        </span>
      </div>

      {/* 2. Nút Chat Zalo */}
      <div className="relative group">
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo với chuyên viên tư vấn"
          className="flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#0068FF] hover:bg-[#0055d4] text-white shadow-lg shadow-[#0068FF]/40 hover:scale-110 active:scale-95 transition-all duration-300 font-extrabold text-sm tracking-tight leading-none"
        >
          <span>Zalo</span>
        </a>
        <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
          Chat Zalo tư vấn
        </span>
      </div>

      {/* 3. Nút Messenger / Facebook */}
      <div className="relative group">
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Facebook Messenger"
          className="flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#0084FF] to-[#00B2FF] text-white shadow-lg shadow-sky-500/35 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <MessengerIcon className="w-6 h-6" />
        </a>
        <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
          Nhắn tin Messenger
        </span>
      </div>

      {/* 4. Nút Cuộn lên đầu trang (Back to top) */}
      <div
        className={`transition-all duration-300 ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none h-0'
        }`}
      >
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Cuộn lên đầu trang"
          title="Cuộn lên đầu trang"
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/90 backdrop-blur-md text-slate-200 hover:text-white hover:bg-slate-900 border border-slate-700 shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
