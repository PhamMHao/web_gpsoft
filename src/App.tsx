import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { setSeo } from './utils/seo.ts';
// P2.10 — thanh tiện ích công khai (hotline/tra cứu đơn). Không còn nút chuyển sang CMS.
import { TopUtilityBar } from './components/common/TopUtilityBar.tsx';
import { ToastContainer } from './components/common/ToastContainer.tsx';

// Website Components
import { Navbar } from './components/website/Navbar.tsx';
import { Footer } from './components/website/Footer.tsx';
import { HomePage } from './components/website/HomePage.tsx';
import { ProductsPage } from './components/website/ProductsPage.tsx';
// P2.1 — trang danh mục 2 cấp `/danh-muc/:slug` + trang thương hiệu `/thuong-hieu/:slug`.
import { CategoryPage } from './components/website/CategoryPage.tsx';
import { BrandPage } from './components/website/BrandPage.tsx';
import { ProductDetailPage } from './components/website/ProductDetailPage.tsx';
import { ServicesPage } from './components/website/ServicesPage.tsx';
// P2.2 — module "Phần mềm chấm công" (4 tab con điều hướng bằng `?tab=`).
import { AttendanceSoftwarePage } from './components/website/AttendanceSoftwarePage.tsx';
// P2.3 — trang dịch vụ "Thiết kế website" `/thiet-ke-website` (bảng giá + quy trình + portfolio + form).
import { WebDesignPage } from './components/website/WebDesignPage.tsx';
import { NewsPage } from './components/website/NewsPage.tsx';
import { PriceListPage } from './components/website/PriceListPage.tsx';
import { AboutPage } from './components/website/AboutPage.tsx';
import { ContactPage } from './components/website/ContactPage.tsx';
import { StaticPageView } from './components/website/StaticPageView.tsx';
import { WarrantyLookupPage } from './components/website/WarrantyLookupPage.tsx';
import { QuoteViewPage } from './components/website/QuoteViewPage.tsx';
// P2.8 — trang tìm kiếm toàn site `/tim-kiem?q=` + trang 404 cho URL không khớp route nào.
import { SearchPage } from './components/website/SearchPage.tsx';
import { NotFoundPage } from './components/website/NotFoundPage.tsx';
import { CartDrawer } from './components/website/CartDrawer.tsx';
import { CheckoutModal } from './components/website/CheckoutModal.tsx';
import { OrderTrackingModal } from './components/website/OrderTrackingModal.tsx';
import { QuoteModal } from './components/website/QuoteModal.tsx';
import { CompareModal } from './components/website/CompareModal.tsx';
import { FloatingCompareBar } from './components/website/FloatingCompareBar.tsx';
import { FloatingContactBar } from './components/website/FloatingContactBar.tsx';

// CMS Component
import { CmsLayout } from './components/cms/CmsLayout.tsx';
// P2.10 — cửa vào CMS duy nhất: form đăng nhập ở URL ẩn `/login-admin` (`ROUTES.adminLogin`).
import { LoginView } from './components/cms/LoginView.tsx';

const AppContent: React.FC = () => {
  const { viewMode, websitePage, seoSettings, routeMatched, authLoading } = useApp();

  // P0.2 — khu vực quản trị không được vào index của Google. Mỗi page website tự gọi `setSeo()`; khi vào
  // CMS **hoặc** form đăng nhập (`/login-admin` — P2.10) thì effect này ghi đè + bỏ canonical.
  useEffect(() => {
    const inAdminArea = viewMode === 'cms' || websitePage === 'admin-login';
    if (!inAdminArea) return;
    setSeo({
      title:
        viewMode === 'cms'
          ? 'Quản Trị CMS — GPSOFT Store & Enterprise'
          : 'Đăng Nhập Quản Trị — GPSOFT Store & Enterprise',
      description: 'Khu vực quản trị nội bộ của GPSOFT Store (không dành cho công cụ tìm kiếm).',
      robots: 'noindex,nofollow'
    });
  }, [viewMode, websitePage, seoSettings]);

  const renderWebsitePage = () => {
    // P2.8 — URL không khớp route nào (`parsePath().matched === false`) ⇒ 404. Đặt **trước** `switch`
    // nên mọi đường dẫn sai (`/san-pham-abc`, `/xyz/123`) đều rơi vào đây thay vì lặng lẽ về trang chủ.
    if (!routeMatched) return <NotFoundPage />;

    switch (websitePage) {
      case 'home':
        return <HomePage />;
      case 'products':
        return <ProductsPage />;
      case 'category':
        // P2.1 — `/danh-muc/:slug`: danh mục 2 cấp (cha gộp sản phẩm của con) + bộ lọc trên URL.
        return <CategoryPage />;
      case 'brand':
        // P2.1 — `/thuong-hieu/:slug`: sản phẩm theo hãng + lọc danh mục/tình trạng/giá trên URL.
        return <BrandPage />;
      case 'product-detail':
        return <ProductDetailPage />;
      case 'search':
        // P2.8 — `/tim-kiem?q=&tab=&page=&sort=`: kết quả sản phẩm + bài viết + dịch vụ trên 1 trang.
        return <SearchPage />;
      case 'services':
        return <ServicesPage />;
      case 'attendance':
        // P2.2 — `/phan-mem-cham-cong?tab=cham-cong|nhan-su|tien-luong|kiem-xuong`
        return <AttendanceSoftwarePage />;
      case 'web-design':
        // P2.3 — `/thiet-ke-website`: 3 gói giá + quy trình 5 bước + portfolio + form nhận báo giá.
        return <WebDesignPage />;
      case 'news':
        return <NewsPage />;
      case 'price-list':
        return <PriceListPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'page':
        return <StaticPageView />;
      case 'warranty':
        return <WarrantyLookupPage />;
      case 'quote-detail':
        // P1.6 — Link Báo Giá `/bao-gia/:code` (khách mở từ link admin gửi).
        return <QuoteViewPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFE8] flex flex-col font-sans antialiased text-slate-900">
      {/* P2.10 — thanh tiện ích công khai (hotline + tra cứu đơn). Không hiện ở cửa vào CMS. */}
      {websitePage !== 'admin-login' && <TopUtilityBar />}

      {/* Main Switcher: CMS vs Website */}
      {viewMode === 'cms' ? (
        <CmsLayout />
      ) : websitePage === 'admin-login' ? (
        // P2.10 — cửa vào CMS duy nhất (`ROUTES.adminLogin`): form đăng nhập đứng riêng, KHÔNG có
        // Navbar/Footer và không link nào trên website trỏ tới. Còn đang kiểm tra phiên cũ ⇒ hiện màn
        // hình chờ để không nháy form đăng nhập rồi mới bật CMS (F5 trong CMS vẫn ở CMS).
        authLoading ? (
          // Còn đang kiểm tra phiên cũ ⇒ màn hình chờ (không nháy form đăng nhập rồi mới bật CMS).
          <div className="flex-1 bg-slate-950 flex items-center justify-center text-slate-300 text-sm">
            Đang kiểm tra phiên đăng nhập...
          </div>
        ) : (
          <LoginView />
        )
      ) : (
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            {renderWebsitePage()}
          </main>
          <Footer />
        </div>
      )}

      {/* Common Modals & Drawers */}
      <CartDrawer />
      <CheckoutModal />
      <OrderTrackingModal />
      <QuoteModal />
      <CompareModal />
      <FloatingCompareBar />
      <FloatingContactBar />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
