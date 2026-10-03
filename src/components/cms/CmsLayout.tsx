import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { CmsTab } from '../../types/index.ts';
import { DashboardView } from './DashboardView.tsx';
import { ProductsView } from './ProductsView.tsx';
import { OrdersView } from './OrdersView.tsx';
import { CustomersView } from './CustomersView.tsx';
import { LeadsView } from './LeadsView.tsx';
import { CategoriesBrandsView } from './CategoriesBrandsView.tsx';
import { BannersMenuView } from './BannersMenuView.tsx';
import { NewsView } from './NewsView.tsx';
import { ServicesView } from './ServicesView.tsx';
import { WarrantyView } from './WarrantyView.tsx';
import { QuotesView } from './QuotesView.tsx';
// P1.7/P1.8/P1.9 — CMS thương mại: mã giảm giá · phí vận chuyển · chiến dịch.
import { CouponsView } from './CouponsView.tsx';
import { ShippingView } from './ShippingView.tsx';
import { CampaignsView } from './CampaignsView.tsx';
import { PagesView } from './PagesView.tsx';
import { FileManagerView } from './FileManagerView.tsx';
import { SeoView } from './SeoView.tsx';
import { SettingsView } from './SettingsView.tsx';
import { UsersView } from './UsersView.tsx';
import { LoginView } from './LoginView.tsx';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  Layers,
  Image as ImageIcon,
  FileText,
  ClipboardCheck,
  Calculator,
  Tag,
  Truck,
  Flame,
  Wrench,
  FileCode,
  FolderOpen,
  Globe,
  Settings,
  ShieldCheck,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Bell
} from 'lucide-react';

export const CmsLayout: React.FC = () => {
  const { cmsTab, setCmsTab, setViewMode, settings, currentUser, authLoading, logout } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems: { id: CmsTab; label: string; icon: React.ComponentType<any>; badge?: string }[] = [
    { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    { id: 'products', label: 'Sản Phẩm & Kho', icon: Package },
    { id: 'orders', label: 'Quản Lý Đơn Hàng', icon: ShoppingCart },
    { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
    { id: 'leads', label: 'Khách Tiềm Năng (Leads)', icon: MessageSquare },
    { id: 'categories', label: 'Danh Mục & Thương Hiệu', icon: Layers },
    { id: 'banners', label: 'Banner & Menu', icon: ImageIcon },
    { id: 'news', label: 'Tin Tức & Bài Viết', icon: FileText },
    { id: 'services', label: 'Dịch Vụ Kỹ Thuật', icon: Wrench },
    { id: 'warranties', label: 'Bảo Hành & Sửa Chữa', icon: ClipboardCheck },
    { id: 'quotes', label: 'Báo Giá & Link Chia Sẻ', icon: Calculator },
    { id: 'coupons', label: 'Mã Giảm Giá', icon: Tag },
    { id: 'shipping', label: 'Phí Vận Chuyển', icon: Truck },
    { id: 'campaigns', label: 'Chiến Dịch / Flash Sale', icon: Flame },
    { id: 'pages', label: 'Trang Tĩnh (Pages)', icon: FileCode },
    { id: 'files', label: 'Quản Lý Tệp / Cloudinary', icon: FolderOpen },
    { id: 'seo', label: 'Quản Trị SEO & Robots', icon: Globe },
    { id: 'settings', label: 'Cấu Hình Hệ Thống', icon: Settings },
    { id: 'users', label: 'Phân Quyền & Tài Khoản', icon: ShieldCheck }
  ];

  const renderContent = () => {
    switch (cmsTab) {
      case 'dashboard': return <DashboardView />;
      case 'products': return <ProductsView />;
      case 'orders': return <OrdersView />;
      case 'customers': return <CustomersView />;
      case 'leads': return <LeadsView />;
      case 'categories': return <CategoriesBrandsView />;
      case 'banners': return <BannersMenuView />;
      case 'news': return <NewsView />;
      case 'services': return <ServicesView />;
      case 'warranties': return <WarrantyView />;
      case 'quotes': return <QuotesView />;
      case 'coupons': return <CouponsView />;
      case 'shipping': return <ShippingView />;
      case 'campaigns': return <CampaignsView />;
      case 'pages': return <PagesView />;
      case 'files': return <FileManagerView />;
      case 'seo': return <SeoView />;
      case 'settings': return <SettingsView />;
      case 'users': return <UsersView />;
      default: return <DashboardView />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 text-sm">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#FFFFE8]/50 flex flex-col">
      {/* Top Mobile Bar */}
      <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-200"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1C86EE]" />
          <span>GPSOFT CMS Portal</span>
        </span>

        <button
          onClick={() => setViewMode('website')}
          className="px-3 py-1.5 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white text-xs font-bold flex items-center gap-1"
        >
          <span>Web</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop & Mobile Drawer */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1C86EE] to-[#5CACEE] flex items-center justify-center text-white font-black text-base shadow-md">
                TP
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-white tracking-tight leading-none">
                  {settings?.companyName || 'GPSOFT CMS'}
                </h1>
                <p className="text-[10px] text-[#5CACEE] font-semibold tracking-wider uppercase mt-1">
                  Enterprise Control Center
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = cmsTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCmsTab(item.id);
                    setMobileSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] text-white font-bold shadow-md shadow-[#1C86EE]/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </nav>

          {/* User profile & Website jump footer */}
          <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1C86EE]/20 text-[#5CACEE] font-bold flex items-center justify-center text-xs border border-[#1C86EE]/30 uppercase">
                {(currentUser.fullName || 'AD').split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setViewMode('website')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#5CACEE]" />
              <span>Xem Website Trực Tuyến</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
