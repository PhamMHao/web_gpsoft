import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { PhoneCall, Search } from 'lucide-react';

/**
 * P2.10 — Thanh tiện ích trên cùng của website: hotline tư vấn + tra cứu tình trạng đơn hàng.
 *
 * Trước P2.10 đây là `ModeSwitcherBar` với 2 nút **"Giao diện Website" / "Quản trị CMS"** ⇒ khách nào
 * cũng thấy lối vào khu quản trị. Nay **không còn nút chuyển chế độ nào**: CMS chỉ mở được bằng URL ẩn
 * `/login-admin` (`ROUTES.adminLogin`, render ở `App.tsx`), mặc định giao diện luôn là website.
 */
export const TopUtilityBar: React.FC = () => {
  const { setIsTrackingOpen, settings } = useApp();

  return (
    <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
      {/* Rộng bằng header bên dưới (`Navbar`) để mép trái/phải thẳng hàng — cả hai trải hết màn hình. */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick hotlines & tracking */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <PhoneCall className="w-3.5 h-3.5 text-[#5CACEE]" />
            <span>Hotline tư vấn:</span>
            <span className="font-semibold text-white">{settings?.hotline || '1900 8899'}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <button
            onClick={() => setIsTrackingOpen(true)}
            className="hidden sm:flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Search className="w-3 h-3 text-[#5CACEE]" />
            <span>Tra cứu tình trạng đơn hàng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
