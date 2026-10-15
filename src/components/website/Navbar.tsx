import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.tsx';
import { ROUTES, pathFor } from '../../utils/url.ts';
import { buildCategoryTree } from '../../utils/catalog.ts';
// P2.8 — tìm kiếm toàn site: Enter trong mobile menu đưa sang `/tim-kiem?q=`.
import { isSearchableKeyword, normalizeKeyword, searchPath } from '../../utils/search.ts';
import {
  Search,
  ShoppingCart,
  Menu as MenuIcon,
  X,
  ChevronDown,
  Cpu,
  Layers,
  PhoneCall,
  Sparkles,
  ScanFace,
  Users,
  Wallet,
  Factory,
  ArrowRight
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';
// P2.2 — module "Phần mềm chấm công": 4 tab con là URL thật `/phan-mem-cham-cong?tab=<id>`.
import { ATTENDANCE_MODULE_LABEL, ATTENDANCE_TABS, attendanceTabPath } from '../../utils/attendance.ts';
// P2.3 — trang dịch vụ "Thiết kế website" `/thiet-ke-website` (lối vào ở menu desktop + mobile).
import { WEB_DESIGN_MODULE_LABEL } from '../../utils/webDesign.ts';

type IconComponent = React.ComponentType<{ className?: string }>;

/** Icon của 4 tab module (khoá = `AttendanceTabId`) — dùng ở dropdown desktop + menu mobile. */
const SOFTWARE_TAB_ICONS: Record<string, IconComponent> = {
  'cham-cong': ScanFace,
  'nhan-su': Users,
  'tien-luong': Wallet,
  'kiem-xuong': Factory
};

export const Navbar: React.FC = () => {
  const {
    websitePage,
    setWebsitePage,
    categories,
    brands,
    cartCount,
    cartTotal,
    setIsCartOpen,
    settings
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  // P2.2 — dropdown "Phần mềm" (4 tab con của module chấm công).
  const [softwareDropdownOpen, setSoftwareDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  /**
   * P2.8 — gửi ô tìm kiếm mobile menu ⇒ mở trang kết quả toàn site `/tim-kiem?q=`.
   */
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = normalizeKeyword(searchTerm);
    if (!isSearchableKeyword(clean)) return;
    setMobileMenuOpen(false);
    navigate(searchPath(clean));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // P2.1 — cây danh mục 2 cấp cho mega menu + thương hiệu đang bán.
  const categoryTree = buildCategoryTree(categories);
  const activeBrands = brands.filter(brand => brand.isActive !== false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs border-b border-[#1C86EE]/15 print:hidden">
      {/* Top ThinkPro Ticker Bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 hidden sm:block border-b border-slate-800">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong>{settings?.companyName || 'GPSOFT'}:</strong> Hệ thống bán lẻ công nghệ chuyên sâu
            </span>
            <span className="text-slate-600">•</span>
            <span>⚡ Giao siêu tốc 2H</span>
            <span className="text-slate-600">•</span>
            <span>🛡️ 1 đổi 1 trong 15 ngày</span>
            <span className="text-slate-600">•</span>
            <span>💳 Trả góp 0% duyệt 3 phút</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <button
              onClick={() => setWebsitePage('contact')}
              className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Showroom HN • TP.HCM • ĐN</span>
            </button>
            <span className="text-slate-700">|</span>
            <a href="tel:19008899" className="text-[#5CACEE] font-bold hover:underline flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              <span>Hotline: 1900 8899</span>
            </a>
          </div>
        </div>
      </div>

      {/* Header trải hết bề ngang màn hình — mép logo và giỏ hàng thẳng hàng */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-2 xl:gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => {
              setWebsitePage('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1C86EE] to-[#5CACEE] flex items-center justify-center text-white shadow-md shadow-[#1C86EE]/25 group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] bg-clip-text text-transparent">
                  GPSOFT
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1C86EE]/10 text-[#1C86EE] uppercase tracking-wider">
                  Store
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block whitespace-nowrap">
                Hệ thống Bán lẻ & Giải pháp Công nghệ
              </p>
            </div>
          </div>

          {/* Navigation Links Desktop — trên cùng 1 hàng ngay cạnh Logo */}
          <nav className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1.5">
            <Link
              to={ROUTES.home}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'home' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Trang chủ
            </Link>

            {/* Products Mega Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsDropdownOpen(true)}
              onMouseLeave={() => setProductsDropdownOpen(false)}
            >
              <button
                onClick={() => setWebsitePage('products')}
                className={`flex items-center gap-1 px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  websitePage === 'products' || websitePage === 'product-detail'
                    ? 'text-[#1C86EE] bg-[#1C86EE]/10'
                    : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
                }`}
              >
                <span>Sản phẩm</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {productsDropdownOpen && (
                <div className="absolute left-0 top-full pt-1.5 w-[44rem] xl:w-[52rem] z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-[#1C86EE]/20 p-5">
                    <div className="grid grid-cols-4 gap-5">
                      {/* P2.1 — mega menu 2 cấp: mỗi danh mục cha là 1 cột, con nằm dưới. */}
                      <div className="col-span-3 grid grid-cols-3 gap-x-5 gap-y-4">
                        {categoryTree.map(node => (
                          <div key={node.id} className="min-w-0">
                            <Link
                              to={pathFor('category', { categorySlug: node.slug || node.id })}
                              onClick={() => setProductsDropdownOpen(false)}
                              className="flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-[#1C86EE] transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-[#5CACEE] shrink-0" />
                              <span className="truncate">{node.name}</span>
                            </Link>
                            <ul className="mt-1.5 space-y-1 border-l border-slate-100 pl-2.5">
                              {node.children.map(child => (
                                <li key={child.id}>
                                  <Link
                                    to={pathFor('category', { categorySlug: child.slug || child.id })}
                                    onClick={() => setProductsDropdownOpen(false)}
                                    className="block truncate text-[11px] text-slate-600 hover:text-[#1C86EE] transition-colors"
                                  >
                                    {child.name}
                                  </Link>
                                </li>
                              ))}
                              {node.children.length === 0 && (
                                <li>
                                  <Link
                                    to={ROUTES.products}
                                    onClick={() => setProductsDropdownOpen(false)}
                                    className="block text-[11px] text-slate-400 hover:text-[#1C86EE] transition-colors"
                                  >
                                    Xem sản phẩm
                                  </Link>
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* P2.1 — cột thương hiệu (trang `/thuong-hieu/:slug`) */}
                      <div className="border-l border-slate-100 pl-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Thương hiệu
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {activeBrands.slice(0, 8).map(brand => (
                            <li key={brand.id}>
                              <Link
                                to={pathFor('brand', { brandSlug: brand.slug || brand.id })}
                                onClick={() => setProductsDropdownOpen(false)}
                                className="block truncate text-[11px] font-medium text-slate-700 hover:text-[#1C86EE] transition-colors"
                              >
                                {brand.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          to={ROUTES.products}
                          onClick={() => setProductsDropdownOpen(false)}
                          className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#1C86EE] hover:underline"
                        >
                          <span>Tất cả sản phẩm</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              to={ROUTES.services}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'services' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Dịch vụ
            </Link>

            {/* P2.3 — lối vào trang dịch vụ "Thiết kế website" (URL thật `/thiet-ke-website`). */}
            <Link
              to={ROUTES.webDesign}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'web-design' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              {WEB_DESIGN_MODULE_LABEL}
            </Link>

            {/* Bảng giá */}
            <Link
              to={ROUTES.priceList}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'price-list' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Bảng giá
            </Link>

            {/* P2.2 — "Phần mềm": dropdown 4 tab con, mỗi tab là URL thật `?tab=<id>` */}
            <div
              className="relative"
              onMouseEnter={() => setSoftwareDropdownOpen(true)}
              onMouseLeave={() => setSoftwareDropdownOpen(false)}
            >
              <Link
                to={ROUTES.attendance}
                className={`flex items-center gap-1 px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  websitePage === 'attendance' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
                }`}
              >
                <span>Phần mềm</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </Link>

              {softwareDropdownOpen && (
                <div className="absolute left-0 top-full pt-1.5 w-[21rem] z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-[#1C86EE]/20 p-3">
                    <Link
                      to={ROUTES.attendance}
                      onClick={() => setSoftwareDropdownOpen(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[#1C86EE]/5 hover:bg-[#1C86EE]/10 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-xl bg-[#1C86EE] text-white flex items-center justify-center shrink-0">
                        <ScanFace className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900">
                          {ATTENDANCE_MODULE_LABEL}
                        </span>
                        <span className="block text-[11px] text-slate-500">Tổng quan module · 4 phân hệ</span>
                      </span>
                    </Link>

                    <ul className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
                      {ATTENDANCE_TABS.map(tab => {
                        const Icon = SOFTWARE_TAB_ICONS[tab.id] || Sparkles;
                        return (
                          <li key={tab.id}>
                            <Link
                              to={attendanceTabPath(tab.id)}
                              onClick={() => setSoftwareDropdownOpen(false)}
                              className="flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1C86EE]/5 transition-colors"
                            >
                              <Icon className="w-4 h-4 text-[#5CACEE] shrink-0 mt-0.5" />
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800">{tab.label}</span>
                                <span className="block text-[11px] text-slate-500">{tab.navHint}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Link
              to={ROUTES.news}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'news' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Tin tức
            </Link>

            <Link
              to={ROUTES.about}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'about' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Giới thiệu
            </Link>

            {/* P1.3 — tra cứu bảo hành công khai */}
            <Link
              to={ROUTES.warranty}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'warranty' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Bảo hành
            </Link>

            <Link
              to={ROUTES.contact}
              className={`px-2 xl:px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                websitePage === 'contact' ? 'text-[#1C86EE] bg-[#1C86EE]/10' : 'text-slate-800 hover:text-[#1C86EE] hover:bg-[#1C86EE]/5'
              }`}
            >
              Liên hệ
            </Link>
          </nav>

          {/* Right actions: Cart button + Mobile menu toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 px-3.5 py-2.5 bg-[#1C86EE]/10 hover:bg-[#1C86EE]/15 text-[#1C86EE] rounded-xl transition-all cursor-pointer font-bold border border-[#1C86EE]/20"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">{formatVnd(cartTotal)}</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#1C86EE] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-800 hover:bg-[#1C86EE]/10 lg:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3">
          {/* Mobile search — Enter hoặc nút "Tìm" mở trang kết quả toàn site `/tim-kiem?q=` */}
          <form onSubmit={submitSearch} className="flex gap-2" role="search">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm sản phẩm, bài viết, dịch vụ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!isSearchableKeyword(searchTerm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1C86EE] text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Tìm</span>
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to={ROUTES.home}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Trang chủ
            </Link>
            <Link
              to={ROUTES.products}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Sản phẩm
            </Link>
            <Link
              to={ROUTES.services}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Dịch vụ
            </Link>
            {/* P2.3 — trang dịch vụ "Thiết kế website" cho mobile. */}
            <Link
              to={ROUTES.webDesign}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              {WEB_DESIGN_MODULE_LABEL}
            </Link>
            <Link
              to={ROUTES.priceList}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Bảng giá
            </Link>
            <Link
              to={ROUTES.news}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Tin tức
            </Link>
            <Link
              to={ROUTES.about}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Giới thiệu
            </Link>
            <Link
              to={ROUTES.warranty}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50"
            >
              Tra cứu bảo hành
            </Link>
            <Link
              to={ROUTES.contact}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-slate-50 col-span-2"
            >
              Liên hệ
            </Link>
          </div>

          {/* P2.2 — "Phần mềm chấm công": 4 tab con (URL thật `?tab=`) cho mobile */}
          <div className="pt-2 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phần mềm chấm công
            </p>
            <Link
              to={ROUTES.attendance}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#1C86EE] text-white text-sm font-semibold"
            >
              <ScanFace className="w-4 h-4" />
              <span>{ATTENDANCE_MODULE_LABEL}</span>
            </Link>
            <div className="flex flex-wrap gap-1.5">
              {ATTENDANCE_TABS.map(tab => {
                const Icon = SOFTWARE_TAB_ICONS[tab.id] || Sparkles;
                return (
                  <Link
                    key={tab.id}
                    to={attendanceTabPath(tab.id)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#5CACEE]" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* P2.1 — danh mục 2 cấp cho mobile */}
          <div className="pt-2 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Danh mục sản phẩm
            </p>
            {categoryTree.map(node => (
              <div key={node.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <Link
                  to={pathFor('category', { categorySlug: node.slug || node.id })}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50"
                >
                  <Layers className="w-4 h-4 text-[#5CACEE]" />
                  <span>{node.name}</span>
                </Link>
                {node.children.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2">
                    {node.children.map(child => (
                      <Link
                        key={child.id}
                        to={pathFor('category', { categorySlug: child.slug || child.id })}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
