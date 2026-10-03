# ROADMAP — GPSOFT Store & Enterprise CMS

> Kế hoạch tổng, chia nhỏ theo **Phase → Task** để mỗi lần implement chỉ cần bám 1 task là xong chuẩn xác.
> Mỗi task có: **Phụ thuộc · Files · Bước · DoD (Definition of Done) · Test**.
> Trạng thái: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong.

---

## 0. Nguyên tắc & quy ước (đọc trước khi code bất kỳ task nào)

### 0.1 Cách đặt mã công việc
- `P<phase>.<task>` — ví dụ `P1.3`.
- Mỗi task phải làm xong trong **1 buổi implement**, self-contained, không kéo sang task khác.
- `⟂` = task bị chặn; trong mỗi task sẽ ghi rõ ở dòng **`Phụ thuộc:`**.

### 0.2 ✅ Checklist 7 lớp — khi thêm **1 entity mới** (backend + CMS)

| # | File | Việc phải làm |
|---|------|---------------|
| 1 | `server/database/schema.ts` | Thêm `CollectionDef` vào `COLLECTIONS` (dòng 103) **hoặc** `SingletonDef` vào `SINGLETONS` (dòng 542). Nếu tên bảng ≠ key trong `DatabaseSchema` thì thêm dòng vào `SCHEMA_KEYS` (dòng 63). Mảng/object lồng → dùng `children` với `ownerColumn`, `indexColumns`, `shape` (`'object'`), `itemsField`. |
| 2 | `server/types.ts` | Thêm `export interface Xxx {...}` + thêm field vào `DatabaseSchema`. |
| 3 | `src/types/index.ts` | Mirror interface cho frontend (cùng tên, cùng field). |
| 4 | `server/db.ts` | **5 điểm**: (a) hằng `INITIAL_XXX: Xxx[]` seed data; (b) thêm vào `buildDefaultSchema()` (~dòng 1554); (c) thêm vào merge trong `loadFromLegacyJson()` (~dòng 1630); (d) getter `public getXxx()` (~dòng 1670); (e) `addXxx / updateXxx / deleteXxx` (pattern chuẩn: `addProduct` dòng 1709). |
| 5 | `server/routes.ts` | CRUD endpoints. ⚠️ **BẮT BUỘC** thêm segment mới vào `switch` trong `requiredPermission()` (`server/auth.ts:84-141`), nếu không nó rơi vào `default: 'export'` (`auth.ts:122-129`) → chỉ tài khoản `all` mới gọi được API. |
| 6 | `src/services/api.ts` | Thêm method gọi API (pattern `fetchJson<{success:boolean;data:Xxx[]}>`). |
| 7 | UI CMS | Tạo `src/components/cms/XxxView.tsx` → thêm vào `navItems` (`CmsLayout.tsx:46`) → thêm `'xxx'` vào union `CmsTab` ở **cả hai chỗ**: `src/types/index.ts:199` **và** `src/context/AppContext.tsx:25`. |

### 0.3 ✅ Checklist 5 bước — khi thêm **1 trang website mới**

| # | File | Việc phải làm |
|---|------|---------------|
| 1 | `src/types/index.ts:188` | Thêm vào union `WebsitePage`. |
| 2 | `src/context/AppContext.tsx:14` | Thêm vào union `WebsitePage` (bản sao) + thêm action `goToXxx()` (pattern `openProduct` ~dòng 331). |
| 3 | `src/App.tsx:31-67` | Thêm `case` trong `renderWebsitePage()`. |
| 4 | — | Tạo `src/components/website/XxxPage.tsx`. |
| 5 | `Navbar.tsx` / `Footer.tsx` | Thêm link (menu động đọc từ API `menus` + fallback tĩnh). |

### 0.4 Migration / Database — điều cần biết
- `SchemaStore.ensureSchema()` (`store.ts:190-224`) **tự tạo bảng còn thiếu** (`collectionDdl`) và **tự thêm cột còn thiếu** (`addMissingColumns`) → **thêm entity mới không cần viết migration tay**.
- Driver mặc định `sqlite` tại `data/gpsoft.sqlite` (`server/database/index.ts:12`); đổi bằng `DB_DRIVER=mysql|mssql`. Có sẵn cơ chế migrate từ `data/db.json` cũ (`loadFromLegacyJson`, `db.ts:1617`).
- ⚠️ `save()` = `store.replace(this.data)` (`db.ts:1661`) → **ghi lại TOÀN BỘ DB mỗi lần lưu 1 record**. Chấp nhận được ở giai đoạn hiện tại (vài nghìn record), nhưng là **nợ kỹ thuật** cần xử lý ở **P6.6**.
- ⚠️ `data/db.json` vẫn còn trong repo; sau khi DB chạy bằng SQLite thì file này chỉ còn là nguồn seed ban đầu.
- ✅ **Đăng nhập CMS bằng DB thật đã CHẠY (kiểm 27/09/2026):** `node_modules/msnodesqlv8@5.5.0` (dùng prebuilt `prebuilds/win32-x64/msnodesqlv8.node`) đã được cài ⇒ `.env` hiện tại (`DB_DRIVER=mssql` + `MSSQL_AUTH=windows` + `MSSQL_DATABASE=gpsoft`) khởi động OK: `npm run dev` ⇒ `http://localhost:3100`, log `[DB] Connected to SQL Server "localhost" database "gpsoft" (Windows integrated auth over ODBC Driver 17 for SQL Server).`; `POST /api/auth/login` với `admin` / `admin123` ⇒ **200 + JWT** (DB `gpsoft` có 3 tài khoản `admin` · `editor_linh` · `sales_tuan`, đều đã có `password_hash`; mật khẩu mặc định lấy từ `DEFAULT_ADMIN_PASSWORD`). **Lối vào CMS trên UI (cập nhật ở P2.10):** ~~thanh trên cùng → nút “Quản trị CMS”~~ — nay **chỉ còn URL ẩn `/login-admin`** (`ROUTES.adminLogin`) ⇒ `LoginView` → đăng nhập ⇒ `setViewMode('cms')`; website **không** có nút nào trỏ vào CMS.
- ⚠️ **Vì sao npm KHÔNG tự cài được `msnodesqlv8`:** tên thư mục dự án chứa ký tự `&` (`gpsoft-store-&-enterprise-cms`) → npm chạy install script qua `cmd.exe` và bị **cắt path tại `&`** (`'-enterprise-cms\node_modules\.bin\' is not recognized as an internal or external command` → `Cannot find module 'C:\Users\Admin\Downloads\node-gyp-build\bin.js'`) ⇒ `node-gyp-build` fail (code 1) ⇒ npm ghi *“reify failed optional dependency”* rồi **xoá** thư mục. Đây chính là lý do mọi ghi chú E2E **trước P2.8** đều phải chạy bằng `DB_DRIVER=sqlite`.
- 🔧 **Khôi phục nếu `node_modules` bị xoá / có ai chạy `npm ci`:** (a) **cách bền vững** — đổi tên thư mục dự án bỏ ký tự `&` (vd `gpsoft-store-enterprise-cms`) rồi `npm install msnodesqlv8` (npm sẽ tự chạy script thành công); (b) **cách nhanh** — ở một thư mục **không** có `&`: `npm pack msnodesqlv8@5.5.0` → `tar -xzf msnodesqlv8-5.5.0.tgz` → copy thư mục `package` vào `node_modules\msnodesqlv8` (bản giải nén sẵn ở `C:\Users\Admin\msnbuild\package`). Tarball có sẵn prebuilt NAPI cho `win32-x64` nên **không cần** trình biên dịch/`node-gyp`; đã kiểm `npm install` (không tham số) **không** xoá lại module này.

### 0.5 Lệnh kiểm tra bắt buộc sau **mỗi** task
```bash
npm run lint         # = tsc --noEmit  → phải 0 lỗi
npm run test:routes  # smoke test URL → trang (SSR + MemoryRouter, không cần backend)
npm run test:utils   # smoke test util dùng chung (format/id) — đối chiếu với code inline cũ, không cần backend
npm run test:seo     # smoke test SEO: JSON-LD builders + setSeo() ghi <head> (DOM tối giản), không cần backend
npm run test:pagination # smoke test hợp đồng phân trang (`server/pagination.ts`): meta/tương thích ngược/ tham số rác — hàm thuần, không cần backend
npm run test:warranty   # smoke test logic bảo hành (`server/warranty.ts`): tra cứu công khai (mã/serial/hậu tố SĐT) · remainingDays · lọc CMS · mã phiếu + cộng tháng — hàm thuần, không cần backend
npm run test:warranty-ui # smoke test util UI bảo hành dùng chung cho CMS + trang public (`src/utils/warranty.ts`): 4 tab + query API · badge theo ngày còn lại · timeline · đếm thống kê · cộng tháng — hàm thuần, không cần backend
npm run test:cms-warranty # smoke test render tab CMS Bảo hành (`WarrantyView.tsx`) bằng SSR + MemoryRouter: đủ header · 4 thẻ thống kê · 4 sub-tab · ô tìm kiếm · bảng phiếu — không cần backend/đăng nhập
npm run test:quotes   # smoke test logic báo giá + link chia sẻ (`server/quote.ts`) — hàm thuần, không cần backend
npm run test:quote-ui # smoke test util UI báo giá (`src/utils/quote.ts`) + trang public — hàm thuần, không cần backend
npm run test:cms-quotes # smoke test render tab CMS Báo giá (`QuotesView.tsx`) bằng SSR
npm run test:coupons  # P1.7 — smoke test logic mã giảm giá (`server/coupon.ts`): trạng thái · tiền giảm · phạm vi · bộ lọc — hàm thuần
npm run test:shipping # P1.8 — smoke test logic phí vận chuyển (`server/shipping.ts`): fee/freeFrom · fallback phương thức · bộ lọc — hàm thuần
npm run test:campaigns # P1.9 — smoke test logic campaign (`server/campaign.ts`): đang chạy/hết `endAt` · chọn sản phẩm · bộ lọc — hàm thuần
npm run test:commerce-ui # P1.7–P1.9 — smoke test `src/utils/commerce.ts` (nhãn/badge/tab · công thức phí ship phản chiếu server · đếm ngược)
npm run test:cms-commerce # P1.7–P1.9 — smoke test render 3 tab CMS mới (`CouponsView`/`ShippingView`/`CampaignsView`) bằng SSR
npm run test:catalog    # P2.1 — smoke test danh mục 2 cấp: lọc đúng ô cha/con · slug · phân trang (`tests/catalog.smoke.ts`)
npm run test:catalog-ui # P2.1 — smoke test route danh mục/thương hiệu render đúng trang (`tests/catalogUi.smoke.tsx`)
npm run test:attendance-ui # P2.2 — smoke test module "Phần mềm chấm công": hợp đồng URL ↔ 4 tab · icon · slug CMS khớp `PagesView` · lối vào Navbar/Footer (`tests/attendanceUi.smoke.tsx`)
npm run test:web-design-ui # P2.3 — smoke test trang "Thiết kế website": route/render · toàn vẹn bảng giá–quy trình–portfolio–FAQ · validate + payload lead `source=web-design` (`tests/webDesignUi.smoke.tsx`)
npm run test:services # P2.3 — smoke test chuẩn hoá payload `Service` từ CMS (`server/service.ts`): tên field cũ `priceEstimate`/`process`/`faq` → `priceRange`/`processSteps`/`faqs` · PUT partial · giá trị mặc định · seed dùng chung (`tests/service.smoke.ts`)
npm run test:admin-login # P2.10 — smoke test "cửa vào CMS ẩn" `/login-admin`: URL/parse · form đăng nhập không lộ tài khoản mẫu · không trang công khai nào nhúng lối vào · `robots.txt` luôn chặn cửa CMS + không lọt `sitemap.xml` (`tests/adminLogin.smoke.tsx`)
npm run dev          # server.ts (Express + Vite middleware)
```
Với task có API mới: gọi thử bằng `curl`/PowerShell `Invoke-RestMethod` với token admin để xác nhận 200 + JSON đúng shape.

### 0.6 Quy ước UI/UX (giữ nhất quán với codebase)
- CMS: Tailwind v4, tab con dạng `const [subTab, setSubTab] = useState(...)`, modal CRUD tự viết, `useApp().showToast()` để thông báo.
- Website: `PriceListPage.tsx` là mẫu tốt cho tabs + `window.print()` + export CSV; `ProductCard.tsx` là card chuẩn.
- Text tiếng Việt có dấu, đơn giá format `Intl.NumberFormat('vi-VN')`.
- **Format/ID/slug dùng chung (từ P0.3):** tiền ⇒ `formatVnd()` · số ⇒ `formatNumber()` · ngày ⇒ `formatDate(v, 'short' | 'date' | 'datetime')` · dung lượng ⇒ `formatBytes()` · slug ⇒ `slugify()` · id tạm ⇒ `genId(prefix)` (**P0.4: 8 ký tự base36** — đủ chống trùng khi sinh liên tiếp trong cùng 1 ms) — import từ `src/utils/format.ts` / `src/utils/id.ts`, **không tự khai báo `formatPrice()` trong component** nữa.
- **SEO (từ P0.2):** mỗi page gọi `setSeo()` (từ `src/utils/seo.ts`) **một lần trong `useEffect`** với `{ title, description, canonicalPath, ogImage, ogType, robots, jsonLd }`; title/description mặc định lấy từ `useApp().seoSettings` qua `seoDefaults()`. Đường dẫn canonical luôn dựng từ `pathFor()`/`ROUTES` (URL thật), không viết tay chuỗi URL.
- **Phân trang API (từ P0.4):** endpoint list trả `{ success, count, total, data }` và **chỉ thêm** `meta: { page, limit, total, totalPages }` khi client gửi `?page=`/`?limit=`. Không gửi ⇒ **giữ đúng shape cũ** (không có `meta`) ⇒ mọi call site cũ không phải sửa. Client gọi qua `api.getX(..., { page, limit })` với type `PageParams`/`ListResponse<T>` (`src/services/api.ts`) rồi đọc `res.meta` để vẽ nút chuyển trang.
- Icon: `lucide-react` (đã có sẵn, không thêm lib icon khác).

### 0.7 Thư viện cần cài thêm (chỉ khi task yêu cầu)
| Phase | Package | Dùng cho |
|---|---|---|
| ~~P0~~ | ✅ `react-router-dom@^7.18.4` (**đã cài ở P0.1**) | URL thật cho website |
| P3 | `nodemailer` + `@types/nodemailer` | Gửi email |
| P4 | `xlsx` (hoặc `exceljs`) | Nhập/xuất Excel |
| P5 | `express-rate-limit` | Chống spam form |
| P6 | `i18next` + `react-i18next` | Đa ngôn ngữ |

---

# PHASE 0 — Nền tảng kỹ thuật

> **Làm trước tất cả.** Mọi phase sau đều dựa trên routing + utility + phân trang của phase này.

### `[x] P0.1` — URL thật cho website (routing)
**Vì sao:** `AppContext.websitePage` hiện là state thuần, **không có `pushState`** → không share được link, Back/Forward hỏng, **không thể làm "Link Báo Giá"**, SEO ≈ 0.
**Files:** `package.json` · `src/main.tsx` · `src/App.tsx` · `src/context/AppContext.tsx` · `src/utils/url.ts` (mới) · `src/components/website/Navbar.tsx` · `Footer.tsx` · `ProductCard.tsx`
**Bước:**
1. `npm i react-router-dom`.
2. Bọc `<BrowserRouter>` trong `src/main.tsx`.
3. Tạo `src/utils/url.ts`: hằng `ROUTES` + `pathFor(page, params)` + `parsePath(pathname)`.
4. `AppContext`: thêm effect đồng bộ 2 chiều `websitePage` ↔ `location.pathname` (dùng `useLocation`/`useNavigate`); đổi các `setWebsitePage(...)` (dòng ~331-355) thành `navigate(pathFor(...))`. **Giữ nguyên API cũ** để không vỡ component con.
5. Sửa điều hướng sang `pathFor()`: `Navbar.tsx` (mega menu, "xem tất cả" ở search), `Footer.tsx`, `ProductCard.tsx`, `ProductDetailPage` (related products).
**Route map chuẩn:**
```
/                     home              /tin-tuc/:slug        news detail
/san-pham             products          /gioi-thieu           about
/san-pham/:slug       product-detail    /lien-he              contact
/danh-muc/:slug       category          /trang/:slug          page
/thuong-hieu/:slug    brand             /bao-hanh             warranty (✅ P1.3)
/bang-gia             price-list        /bao-gia/:code        quote-detail (✅ P1.5/P1.6)
/dich-vu              services          /tim-kiem?q=          search (✅ P2.8)
/pham-mem-cham-cong   attendance (?tab=)  *                     not-found (✅ P2.8)
/thiet-ke-website     web-design (✅ P2.3)
```
**DoD:** F5 ở `/san-pham` và `/tin-tuc/<slug>` tải đúng trang; Back/Forward đúng; copy URL dán tab mới ra đúng trang; `npm run lint` pass.
**Ghi chú:** **Không cần sửa backend** — Vite dev middleware fallback SPA (`server.ts:83`) và production đã có `app.get('*') → sendFile('index.html')` (`server.ts:88`).

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- Cài `react-router-dom@^7.18.4`; `<BrowserRouter>` bọc **ngoài** `AppProvider` trong `src/main.tsx` (provider cần `useLocation`/`useNavigate` ở trên nó).
- `src/utils/url.ts` (mới): `ROUTES` · `PREFIX` · `pathFor(page, params)` · `parsePath(pathname)` → object `{ page, productSlug?, postSlug?, serviceSlug?, pageSlug?, categorySlug?, brandSlug?, matched }`.
- `AppContext.tsx`: state được **khởi tạo từ `parsePath(location.pathname)`** (F5 / dán link không nháy về trang chủ) + effect đồng bộ `location.pathname → websitePage · selectedX · activeCategoryFilter`. URL là **nguồn sự thật duy nhất**; `setWebsitePage(page)` nay gọi `navigate(pathFor(page))` nên **toàn bộ call site cũ giữ nguyên API** mà vẫn có URL thật; `navigateToProduct/Service/Post/Page/Category` push URL kèm slug. Danh mục trong URL là **slug** (SEO) nhưng được quy đổi sang `categoryId` cho API; `setActiveCategoryFilter(null)` tự đưa URL về `/san-pham`.
- `<Link to={pathFor(...)}>` thật (crawlable + copy link + middle-click) tại: `Navbar` (nav desktop, mobile, mega menu, dropdown autocomplete), `Footer` (danh mục + trang chính sách), `ProductCard` (**cả card** là link — nút "Chọn mua" gọi `preventDefault()`), breadcrumb `ProductDetailPage`. Các chỗ gọi `navigateToProduct(...)` truyền `product.slug || product.id` để URL sạch.
- **Filter danh mục cũng đẩy URL**: `setActiveCategoryFilter(catId)` trong `AppContext` nay điều hướng `/danh-muc/<slug>` (giữ `?q=` đang có) ⇒ chọn danh mục ở sidebar `ProductsPage` cũng share/F5 được; "Xóa bộ lọc" chỉ cần `navigate('/san-pham')`, state tự suy ra từ URL.
- **Thêm ngoài kế hoạch:** dòng "Xem tất cả kết quả cho …" ở autocomplete Navbar → `/san-pham?q=<từ khóa>`; `ProductsPage` đọc `?q=` bằng `useSearchParams` ⇒ link kết quả tìm kiếm share/back đều đúng.
- **Kiểm chứng:** `npm run lint` pass · `npm run test:routes` (mới: `tests/routes.smoke.tsx`, SSR `MemoryRouter`) **PASS 13/13 URL** · server production trả **200 + `index.html`** cho `/`, `/san-pham`, `/san-pham/<slug>`, `/tin-tuc/<slug>`, `/dich-vu`, `/danh-muc/<slug>`, `/trang/<slug>`.
- **Còn lại có chủ đích** (đã ghi TODO ngay trong `src/utils/url.ts`): URL lạ fallback trang chủ — **✅ P2.8 đã thay bằng trang 404 thật** (`parsePath()` trả `page: 'not-found'`, `NotFoundPage` set `robots: noindex,follow`, không canonical) — **`/danh-muc/:slug` ở P2.1**, **`/thuong-hieu/:slug` ở P2.2** (nay đã là trang danh mục/hãng riêng) — **`/bao-hanh` đã xong ở P1.3** (route `warranty`) và **`/bao-gia/:code` đã xong ở P1.5/P1.6** (route `quote-detail`), xem bảng route map phía trên. CMS vẫn dùng state `viewMode` — chưa có URL `/admin` (không nằm trong route map này).

### `[x] P0.2` — SEO động: meta/canonical/OG + JSON-LD + sitemap
**Files:** `index.html` · `src/utils/seo.ts` (mới) · `src/App.tsx` + các Page · `server.ts` · `.env`
**Bước:**
1. `src/utils/seo.ts`: `setSeo({ title, description, canonical, ogImage, jsonLd })` → cập nhật `document.title`, `<meta name="description">`, `<link rel="canonical">`, OG/Twitter, inject `<script type="application/ld+json">` (xoá cái cũ trước khi inject).
2. Gọi `setSeo()` tại: Home (`Organization`), ProductDetail (`Product` + `BreadcrumbList` + `AggregateRating` từ reviews), News detail (`Article`), PriceList (`FAQPage`), Category/Brand (`BreadcrumbList`).
3. `server.ts:29` sitemap: bỏ domain hardcode → `process.env.APP_URL`; đọc thêm `/danh-muc/:slug`, `/thuong-hieu/:slug`, `/tin-tuc/:slug`, `/dich-vu/:slug`, `/trang/:slug`, `/bang-gia`, `/bao-hanh`.
4. `robots.txt` (`server.ts:23`): `Sitemap: ${APP_URL}/sitemap.xml` (không hardcode).
5. Thêm `.env`: `APP_URL=https://gpsoft.vn`.
**DoD:** mỗi trang chính có `<title>`/canonical/JSON-LD đúng khi xem source; `/sitemap.xml` ≥ 30 URL, domain theo env; Rich Results Test không lỗi.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- `src/utils/seo.ts` (mới, ~350 dòng): `setSeo()` · `getSiteUrl()` · `absoluteUrl()` · `plainText()` · `truncate()` · `seoDefaults()` + builder JSON-LD `organizationJsonLd` · `websiteJsonLd` · `breadcrumbJsonLd` · `productJsonLd` · `articleJsonLd` · `serviceJsonLd` · `faqJsonLd`.
  - `<title>`, meta `description`/`robots`, `og:title|description|url|type|image|site_name|locale`, `twitter:card|title|description|image`, `link[rel=canonical]`; **upsert** thẻ (không tạo trùng) và **xoá** thẻ khi giá trị rỗng (⟹ `canonicalPath` không truyền = bỏ canonical).
  - JSON-LD: xoá hết `script[data-seo-jsonld]` cũ rồi inject **1 thẻ** (1 block ⇒ object, nhiều block ⇒ mảng).
  - Chạy được ngoài browser (SSR/prerender) — `setSeo()` là no-op khi không có `document`.
- **Domain lấy từ 2 nguồn (bắt buộc, vì Vite không expose biến không tiền tố `VITE_`)**: client dùng `VITE_APP_URL` → fallback `window.location.origin` → `https://gpsoft.vn`; server dùng `APP_URL`. Cả 2 đã thêm vào `.env` (và cập nhật `.env.example`).
- Gọi `setSeo()` ở **9 chỗ**: `HomePage` (Organization + WebSite/SearchAction) · `ProductsPage` (danh mục/từ khóa + BreadcrumbList, `?q=` ⇒ `robots: noindex,follow`) · `ProductDetailPage` (Product + Offer + AggregateRating từ `/products/:id/reviews` + BreadcrumbList) · `NewsPage` (danh sách + Article khi mở bài) · `PriceListPage` (FAQPage + **khối FAQ mới hiển thị thật** — Google yêu cầu nội dung FAQ phải thấy được trên trang) · `ServicesPage` (Service) · `StaticPageView` (SEO riêng của trang + BreadcrumbList) · `AboutPage` · `ContactPage`; thêm `src/App.tsx`: khi `viewMode === 'cms'` ⇒ `robots: noindex,nofollow` + bỏ canonical.
- **Ngoài kế hoạch (cần để có meta đúng):** `AppContext` nay giữ thêm `seoSettings` (gọi `api.getSeo()` cùng `api.getSettings()` trong `refreshSettings()`) ⇒ page nào cũng có title/description/ogImage mặc định của CMS **đồng bộ 1 nguồn**, không phải fetch lặp ở từng page.
- `server.ts` sitemap: dùng `APP_URL` + **import `ROUTES`/`PREFIX` từ `src/utils/url.ts`** ⇒ không thể lệch URL với frontend. **Sửa bug thật**: sitemap cũ ghi `/products/<slug>`, `/news/<slug>`, `/pages/<slug>` — đó là **URL 404** (route thật là `/san-pham`, `/tin-tuc`, `/trang`); nay dùng đúng route + thêm `/danh-muc/:slug`, `/thuong-hieu/:slug`, `/dich-vu/:slug`, `/bang-gia`, `/gioi-thieu`, `/lien-he`. Chỉ đưa vào sitemap bản ghi public (`product.status === 'active'`, `post.status === 'published'`, `page.isPublished !== false`, category/brand `isActive !== false`); `<lastmod>` chỉ ghi khi ngày hợp lệ; `<loc>` đã escape XML.
- `robots.txt`: giữ nội dung admin nhập ở CMS → Ghi thêm `Sitemap: ${APP_URL}/sitemap.xml` nếu chưa có dòng `Sitemap:` (không hardcode). ⚠️ Nội dung `robotsTxt` hiện trong DB vẫn có `Disallow: /admin/` + `Disallow: /api/` — vô hại (không phải route thật) nhưng nên sửa trong CMS → SEO.
- `index.html`: title/description/OG/Twitter/og:site_name/og:locale/theme-color mặc định mới (dùng làm fallback trước khi JS chạy).
- **⚠️ Chưa làm trong P0.2 (có chủ đích):** `ROUTES.warranty` (`/bao-hanh`) **chưa đưa vào sitemap** vì lúc đó chưa có trang — **✅ P1.3 đã bổ sung** vào `server.ts` (`changefreq: monthly` · `priority: 0.6`); ảnh OG mặc định còn dùng URL Unsplash, nên thay bằng ảnh thật của shop (`DEFAULT_OG_IMAGE` trong `seo.ts`); trường hợp slug sai (`/san-pham/khong-ton-tai`) hiện vẫn giữ SEO của trang trước — P2.8 (404) sẽ set `noindex` **✅ P2.8 đã làm**: slug sai ở ProductDetail/News/StaticPage render `NotFoundPage` (`robots: noindex,follow`, bỏ canonical) nên SEO của trang trước **không còn bị giữ lại**.
- **Kiểm chứng:** `npm run lint` pass · `npm run test:seo` (mới: `tests/seo.smoke.ts` — DOM tối giản tự viết, **73→76 assertion PASS**: builders + setSeo upsert/xoá/nhân-bản + no-op khi không có DOM) · `npm run test:utils` PASS 30/30 · `npm run test:routes` PASS 13/13 · `npm run build` OK (1713 modules, `VITE_APP_URL` đã inline vào bundle) · **server production thật**: `/robots.txt` 200 (có dòng `Sitemap: https://gpsoft.vn/sitemap.xml`) · `/sitemap.xml` 200 **44 `<loc>`** (DoD ≥ 30) với domain theo env · `/san-pham` 200.
- **Còn phải làm tay (ngoài repo):** chạy [Rich Results Test](https://search.google.com/test/rich-results) trên URL production sau khi deploy để xác nhận Product/FAQPage/Article/BreadcrumbList không có lỗi `Missing field`.

### `[x] P0.3` — Gom utility dùng chung
**Files:** `src/utils/format.ts` (mới) · `src/utils/id.ts` (mới) · refactor tại `ProductCard.tsx`, `PriceListPage.tsx`, `CartDrawer.tsx`, `CheckoutModal.tsx`, `OrdersView.tsx`, `ProductsView.tsx`
**Bước:** tạo `formatVnd()`, `formatNumber()`, `formatDate()`, `slugify()`, `genId(prefix)`; thay toàn bộ code inline trùng lặp.
**DoD:** `npm run lint` pass; **UI không đổi một pixel** (thuần refactor).

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- `src/utils/format.ts` (mới): `formatVnd` · `formatNumber(value, options?)` · `formatDate(value, style, fallback)` · `formatBytes` · `slugify`. `formatDate` có **3 style khớp đúng 3 biến thể inline cũ** nên không phải sửa JSX: `short` (mặc định) = `27/09/2026` (như `CustomerReviews`), `date` = `27/9/2026` (như `FileManagerView`), `datetime` = `14:05:00 27/9/2026` (như `UsersView`).
- `src/utils/id.ts` (mới): `genId(prefix)` → `<prefix>-<timestamp>-<4 ký tự base36>` (**P0.4 nâng lên 8 ký tự** — xem task P0.4); thay 3 biến thể inline: `toast-${Date.now()}-${Math.random()}` (`AppContext`), `v-${Date.now()}` (`ProductsView`), `red-${Date.now()}` (`SeoView`).
- **Gom ở 23 file** (kế hoạch chỉ ghi 6 file): 14 file có `formatPrice` trùng lặp (thêm `CustomersView`, `DashboardView`, `HomePage`, `Navbar`, `CompareModal`, `OrderTrackingModal`, `SmartLaptopFinder`, `ProductDetailPage`…), 2 file `formatDate` (`UsersView`, `CustomerReviews`), `FileManagerView` (`formatSize` + ngày inline), 6 call site sinh slug ở `CategoriesBrandsView` ×2 · `NewsView` · `PagesView` · `ServicesView` · `ProductsView`.
- **⚠️ Sửa 1 bug thật khi gom `slugify`** (lệch kế hoạch "thuần refactor", có chủ đích & đã ghi rõ trong `format.ts`): regex cũ `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')` **xoá mất chữ có dấu** (`'Ốp lưng'` → `'-p-l-ng'`, `'Laptop Đồ Họa'` → `'laptop-hoa'`) và để lại `-` ở đầu/cuối. `slugify` mới bỏ dấu bằng `normalize('NFD')` + xử lý riêng `đ/Đ` ⇒ `'op-lung'`, `'laptop-do-hoa'`. **Slug đã lưu trong DB không bị đổi** (không migrate gì); chỉ slug **sinh tự động khi admin để trống ô slug** mới đúng hơn. Trường hợp **không dấu giữ nguyên 100%** output cũ (`'MacBook Air M3'` → `'macbook-air-m3'`).
- **UI không đổi 1 pixel:** không sửa JSX/CSS nào. `tests/utils.smoke.ts` (mới) đối chiếu output util với **chính code inline cũ copy nguyên văn** → **PASS 30/30 assertion** (gồm `0 ₫`, `-5.000 ₫`, `1.235 ₫` do làm tròn, `—` cho giá trị rỗng/không parse được, `2 KB`, `3.0 MB`, `dien-thoai-samsung`).
- **Kiểm chứng:** `npm run lint` pass · `npm run test:utils` **PASS 30/30** · `npm run test:routes` PASS 13/13 · `npm run build` OK (1712 modules).
- **Chưa gom (cố ý):** `TP-${Date.now().toString().slice(-4)}` ở `ProductsView` là **mã SKU hiển thị cho người dùng** (đổi format = đổi UI) ⇒ giữ nguyên; `id: \`rev-${Date.now()}-...\`` ở `server/routes.ts:300` chưa gom vì `src/utils/*` là module client — sẽ gom khi task chạm server (P0.4/P1.1).
- **Ghi chú kỹ thuật:** đã refactor bằng script cơ học có dry-run + assert (xoá 17 định nghĩa trùng, thêm import, đổi tên call site) và kiểm tra lại encoding UTF-8 của cả 27 file sau khi ghi (không mojibake, không U+FFFD) — vì file có tiếng Việt + CRLF.

### `[x] P0.4` — Phân trang API chuẩn
**Files:** `server/pagination.ts` (mới — logic dùng chung) · `server/routes.ts` · `src/services/api.ts` · `tests/pagination.smoke.ts` (mới) · `package.json` (script `test:pagination`)
**Bước:** hỗ trợ `?page=&limit=` cho `GET /products`, `/orders`, `/customers`, `/leads`, `/posts`; trả thêm `meta: { page, limit, total, totalPages }`. **Tương thích ngược**: không truyền `page` → trả như hiện tại.
**DoD:** gọi `?page=2&limit=10` trên 3 endpoint trả `meta` đúng; UI hiện tại không vỡ.
**Ghi chú:** nút phân trang ở từng View sẽ làm kèm theo module tương ứng (P4.5, P2.1).
**Kết quả:**
- **Hợp đồng API (chốt):** `{ success, count, total, data, meta? }`. Không truyền `page`/`limit` ⇒ **không có** key `meta`, `count = total = data.length` ⇒ y như trước, **không phải sửa call site nào**. Có `page`/`limit` ⇒ `count = data.length` (1 trang), `total` = tổng sau filter, `meta = { page, limit, total, totalPages }`.
- **Chuẩn hoá tham số:** `limit` mặc định **20**, tối đa **100** (vượt ⇒ kẹp 100); `page` mặc định **1**; `page` vượt số trang ⇒ **kẹp về trang cuối** (UI không trắng bảng); `?page=abc`, `?limit=-5`, `?limit=` ⇒ dùng mặc định, **không trả 400**; `?page=2&page=3` ⇒ lấy giá trị đầu (giống `qs` của Express).
- **Gom 1 chỗ:** `server/pagination.ts` (hàm thuần `positiveInt`/`parsePaging`/`paginateList`/`listBody`, không import express/db ⇒ test bằng node thuần) — 5 route chỉ còn `res.json(listBody(list, req.query))`. Trước đó mỗi route tự viết `res.json({ success, ... })` nên shape 5 endpoint lệch nhau: `/products` có `count` (+`total` mới thêm), 4 endpoint kia chỉ có `data`.
- **Client:** `src/services/api.ts` thêm `PageParams`, `PaginationMeta`, `ListResponse<T>` + helper `appendPageParams()`; `getOrders`/`getLeads` nhận `... & PageParams`, `getCustomers(search, page?)`, `getPosts(category?, search?, page?)` (tham số mới đều **optional** ⇒ code UI hiện tại không đổi).
- **Kiểm chứng:** `npm run lint` pass · `npm run test:pagination` (mới) **PASS 47/47** · `npm run test:utils` 30/30 · `npm run test:seo` 76/76 · `npm run test:routes` 13/13 · `npm run build` OK (1713 modules).
- **E2E HTTP thật** (server riêng port 3211 + SQLite seed riêng, script tạm `tmp-p04-e2e.mjs`) **PASS 101/101**: cả 5 endpoint — không param ⇒ **không có** `meta`; `?page=2&limit=2` ⇒ `meta` đúng (`total` khớp danh sách gốc, `totalPages = ceil(total/limit)`); **duyệt hết `totalPages` rồi ghép lại = đúng danh sách không phân trang (đúng thứ tự, không mất/trùng dòng)**; `?page=abc&limit=-5` ⇒ page 1/limit 20; `?limit=1000` ⇒ limit 100; `?page=999` ⇒ trang cuối + vẫn có dữ liệu; `?page=1` ⇒ limit 20; `POST /api/products/:id/reviews` vẫn 200 và trả id `rev-<ts>-<8 ký tự>` sau khi đổi sang `genId('rev')`.
- **Filter/sort vẫn đi kèm `meta`:** `products?featured=true` (7 = 7), `products?sort=price-asc` (giá tăng dần liên tục qua 2 trang, dòng đầu trùng bản không phân trang), `products?search=iphone`, `orders?status=pending`, `leads?type=contact|quote|newsletter`, `customers?search=đ`. `/api/categories?page=2` (ngoài phạm vi) vẫn **không** có `meta` ⇒ không đổi hành vi ngoài 5 endpoint.
- **Ghi chú kỹ thuật:** áp thay đổi bằng script cơ học có dry-run + assert (mỗi mẫu phải khớp **đúng 1 lần**, all-or-nothing), sau đó kiểm tra lại UTF-8 (0 ký tự U+FFFD, tiếng Việt nguyên vẹn) + EOL của mọi file mới/sửa; script tạm đã xoá sau khi chạy.
- **Kèm theo (hoàn tất ghi chú của P0.3):** id đánh giá `rev-${Date.now()}-${Math.random()...}` (`server/routes.ts:302`) → `genId('rev')` từ `src/utils/id.ts` (route import util client — cùng cách `server.ts` đang import `src/utils/url.ts` vì util không phụ thuộc DOM). Các id server khác (`prod-`/`ord-`/`lead-`/`cat-`/`brand-`/`post-`/`pcat-`/`srv-`/`ban-`/`menu-`/`page-`/`med-`/`usr-`/`role-`) **giữ nguyên** format `<prefix>-<timestamp>`: đã ổn định trong DB seed, không trùng logic util nào.
- **⚠️ Sửa 1 bug thật phát hiện khi kiểm chứng (chạy lặp `npm run test:utils`):** `genId()` chỉ lấy **4 ký tự** random base36 (36^4 ≈ 1,68 triệu) ⇒ khi nhiều id sinh trong **cùng 1 ms** thì phần timestamp giống nhau và phần random dễ trùng: **8/60 lần chạy FAIL** (`genId duy nhất trong 1000 lần gọi -> 999`). Bug này **ảnh hưởng dữ liệu thật** vì P0.4 vừa cho `genId('rev')` làm id đánh giá **ghi xuống DB** ⇒ nâng phần random lên **8 ký tự** (36^8 ≈ 2,8 nghìn tỉ, xác suất trùng ~1,8e-7) + `padEnd(8, '0')` để độ dài luôn cố định. Cập nhật `tests/utils.smoke.ts`: regex `{4}` → `{8}` và assertion duy nhất **1000 → 5000 id**; chạy lặp **60 lần ⇒ 0 FAIL** (trước đó 8/60). E2E lại `POST /api/products/:id/reviews` (server riêng port 3212, script tạm `tmp-p04-review.mjs`): **9/9 assertion** — 5 id liên tiếp đúng `rev-<ts>-<8 base36>`, không trùng, độ dài cố định, `GET …/reviews` thấy đủ 5 đánh giá.
- **Chưa làm (đúng kế hoạch):** nút chuyển trang trong UI (P4.5 `OrdersView`/`ProductsView`, P2.1 trang Danh mục) — API đã sẵn sàng, chỉ cần đọc `res.meta` và truyền `{ page, limit }`.

---

# PHASE 1 — Module lõi ngành: Bảo hành · Báo giá · Khuyến mãi · Vận chuyển

### `[x] P1.1` — Entity Bảo hành + API (`warranties`)
**Files:** `server/database/schema.ts` · `server/types.ts` · `src/types/index.ts` · `server/db.ts` · `server/auth.ts` · `server/routes.ts` · `src/services/api.ts`
**Bước:**
1. `schema.ts` — thêm vào `COLLECTIONS`:
```ts
{
  table: 'warranties', idColumn: 'id', orderColumn: SORT_COLUMN,
  columns: [
    c('id','id'), c('code','text'), c('customerName','text'), c('phone','text'), opt('email'),
    c('productId','id'), c('productName','text'), opt('serialNumber'),
    c('purchaseDate','datetime'), c('startDate','datetime'), c('endDate','datetime'),
    c('warrantyMonths','int'),
    c('warrantyType','text'),  // 'nha_san_xuat' | 'mo_rong'
    c('status','text'),        // received|inspecting|repairing|waiting_part|done|returned|rejected
    c('issue','text'), opt('diagnosis'), opt('resolution'), opt('technician'),
    opt('cost','decimal'), opt('receivedAt','datetime'), opt('returnedAt','datetime'),
    c('createdAt','datetime')
  ],
  children: none
}
```
   ⚠️ Dùng `warrantyType` (không dùng `type`) để tránh xung đột tên cột SQL. Thêm `SCHEMA_KEYS.warranties = 'warranties'`.
2. `server/types.ts`: `export interface Warranty {...}` + `warranties: Warranty[]` trong `DatabaseSchema`; mirror sang `src/types/index.ts`.
3. `server/db.ts`: đủ 5 điểm §0.2 — seed **3 phiếu mẫu** (1 `received`, 1 `repairing`, 1 `returned`).
4. `server/auth.ts`: thêm `case 'warranties': resource = 'warranty'; break;` vào `requiredPermission()` (~dòng 115) **và** thêm `'/warranties/lookup'` vào `PUBLIC_GET_PREFIXES` (dòng 47) — chú ý đây là khớp **prefix**, nên chỉ mở đúng route lookup; `GET /warranties` (list admin) vẫn cần token.
5. `server/routes.ts`: `GET /warranties?status=&q=` · `GET /warranties/lookup?q=` (tìm theo phone | serialNumber | code, trả kèm `remainingDays`) · `POST` · `PUT /:id` · `DELETE /:id`.
6. `src/services/api.ts`: `getWarranties`, `lookupWarranty`, `createWarranty`, `updateWarranty`, `deleteWarranty`.
**DoD:** `GET /api/warranties/lookup?q=<sđt seed>` → 200 **không cần token**; `POST /api/warranties` không token → 401; có token admin → 201. `npm run lint` pass.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Đủ 7 lớp §0.2:** `schema.ts` (collection `warranties` + `SCHEMA_KEYS.warranties`, dùng `warrantyType` **không** dùng `type`) · `server/types.ts` (`WarrantyType`/`WarrantyStatus`/`Warranty` + `DatabaseSchema.warranties`) · `src/types/index.ts` (mirror + `WarrantyLookupItem`) · `server/db.ts` (đủ 5 điểm + seed) · `server/auth.ts` (`case 'warranties' → resource 'warranty'`; thêm **đúng path con** `/warranties/lookup` vào `PUBLIC_GET_PREFIXES` ⇒ `GET /warranties` của admin **vẫn cần token**) · `server/routes.ts` (5 endpoint) · `src/services/api.ts` (`getWarranties` · `lookupWarranty` · `createWarranty` · `updateWarranty` · `deleteWarranty`).
- **Logic bảo hành dùng chung = hàm thuần `server/warranty.ts` (mới)** — không import express/db nên test bằng node thuần (cùng cách `server/pagination.ts`): `daysUntil` · `addMonths` (kẹp cuối tháng: 31/01 + 1 tháng → 28/02) · `generateWarrantyCode` (`BH-<năm>-<4 số>`, lấy max + 1) · `matchWarrantyLookup` · `lookupWarranties` (gắn `remainingDays`/`isExpired`, tối đa 20 dòng) · `filterWarranties` · `withRemainingDays`. Kèm `tests/warranty.smoke.ts` + script **`npm run test:warranty`** ⇒ **69/69 assertion PASS**. Route chỉ còn map HTTP ↔ hàm.
- **Quy ước tra cứu công khai (chốt theo §C câu 8 — tra theo cả SĐT/serial/mã phiếu):** khớp **chính xác** `code` **hoặc** `serialNumber`, **hoặc hậu tố SĐT ≥ 4 số** (tự bỏ dấu cách/chấm/gạch, chấp nhận khách gõ thiếu số 0 đầu). **Không** cho tìm mờ theo tên/SĐT ⇒ tránh lộ dữ liệu khách khác; `q` < 4 ký tự ⇒ **400** + thông báo; không khớp ⇒ **200** + `data: []` (P1.3 hiện empty state); mỗi dòng kèm `product {id,name,slug,thumbnail,salePrice}` để P1.3 vẽ card.
- **Seed 3 phiếu mẫu** đúng đặc tả (`received` / `repairing` / `returned`) với ngày **tính động theo lúc seed** (khác các seed tĩnh khác, có chủ đích): còn ~655 ngày (badge xanh) · còn ~20 ngày (badge vàng 1–30) · quá hạn ~135 ngày (badge đỏ) ⇒ P1.3 demo được đủ 3 mốc. SĐT seed để test: `0977889900` · `0912 345 678` (có dấu cách — test chuẩn hoá) · `0933445566`. Role `staff` được thêm `warranty.view|create|edit` (DB **cũ** giữ quyền cũ — tài khoản admin `all` vẫn dùng được ngay; chỉnh tay ở P4.8 Roles).
- **Kiểm chứng:** `npm run lint` **exit 0** · `npm run test:warranty` **69/69** · `test:pagination` **47/47** · `test:utils` **30/30** · `test:seo` **76/76** · `test:routes` PASS · `npm run build` OK (744ms).
- **E2E HTTP thật** (server riêng **port 3311** + **DB copy từ `data/gpsoft.sqlite`**, script tạm `tmp-p11-e2e.mjs`, đã xoá sau khi chạy) — **PASS 53/53**: lookup SĐT seed ⇒ 200 **không cần token** (đúng mã phiếu, có `remainingDays`, có thumbnail); SĐT có dấu cách + gõ thiếu số 0 đầu vẫn ra; serial ra; phiếu hết hạn `isExpired = true`; `q` ngắn/thiếu ⇒ 400; không tồn tại ⇒ 200 + rỗng; `GET /warranties` không token/token sai ⇒ **401**; token `warranty.view` ⇒ 200; token `content.*` ⇒ **403** (chứng minh mapping resource `warranty` đúng, **không** rơi vào `default: 'export'`); `POST` không token ⇒ 401, chỉ `warranty.view` ⇒ 403, admin ⇒ **201** (tự sinh `BH-2026-0004`, `endDate` suy đúng, lấy đúng tên sản phẩm từ DB); `?status=repairing` / `?expired=true` / `?page=2&limit=1` đúng; `PUT` đổi số tháng ⇒ tự tính lại `endDate`; `DELETE` ⇒ 200 rồi 404; và quan trọng nhất — **`data/gpsoft.sqlite` cũ KHÔNG mất dòng nào** (products 10 · orders 3 · customers 3 · reviews 5 · leads 4).
- **E2E cài mới hoàn toàn** (không có file DB — port 3312, `tmp-p11-fresh.mjs`, đã xoá sau khi chạy) — **PASS 7/7**: có ngay 3 phiếu seed, đủ 3 trạng thái, đủ 3 mốc badge, file DB có bảng `warranties` + 3 dòng.
- **⚠️ Sửa 1 bug thật (do chính E2E trên DB cũ phát hiện — lần chạy đầu FAIL 15 assertion):** `SchemaStore.ensureSchema()` tự `CREATE TABLE` bảng thiếu, nhưng `store.load()` trả **mảng RỖNG** cho bảng vừa tạo ⇒ `this.data = { ...buildDefaultSchema(), ...loaded }` bị **ghi đè seed** ⇒ bản **nâng cấp** (DB đã có sẵn) **không có phiếu bảo hành nào** (`GET /warranties` = 0 dòng) dù đặc tả yêu cầu seed 3 phiếu. **Sửa ở đúng tầng, dùng chung cho mọi entity sau này:** `server/database/store.ts` ghi nhớ bảng collection vừa tạo (`createdTables` + `createdCollectionKeys()`), `db.init()` **seed dữ liệu mẫu cho đúng các bảng đó** rồi `save()`. Bảng **đã tồn tại từ trước không bao giờ bị seed lại** (kể cả khi người dùng đã xoá sạch dữ liệu) ⇒ không rủi ro mất/nhân bản dữ liệu. Chạy lại E2E: **53/53 PASS**.
- **✅ Đã làm nốt ở P1.2/P1.3:** UI CMS (`WarrantyView.tsx`) và trang tra cứu public `/bao-hanh` (`WarrantyLookupPage.tsx`).

### `[x] P1.2` — CMS tab Bảo hành (`WarrantyView.tsx`)
**Phụ thuộc:** P1.1
**Files:** `src/components/cms/WarrantyView.tsx` (mới) · `CmsLayout.tsx` (navItems dòng 46 + switch render) · `src/types/index.ts:199` (`CmsTab`) · `src/context/AppContext.tsx:25` (`CmsTab` bản sao)
**Bước:**
1. 4 sub-tab: `Tất cả phiếu` · `Đang xử lý` · `Đã trả khách` · `Hết bảo hành`.
2. Bảng: mã phiếu · khách · SĐT · sản phẩm · serial · ngày mua · hết hạn · trạng thái (badge màu) · kỹ thuật viên · thao tác.
3. Modal tạo/sửa: chọn sản phẩm từ `api.getProducts()`, tự tính `endDate = startDate + warrantyMonths`.
4. Modal chi tiết: **timeline trạng thái** (`receivedAt → inspecting → repairing → done → returnedAt`) + ghi chú kỹ thuật + chi phí.
5. Nút **In phiếu bảo hành** (`window.print()` + class `print:hidden` cho phần UI).
6. Action nhanh trên dòng: đổi trạng thái, gán kỹ thuật viên.
**DoD:** tạo phiếu → hiện ở đúng sub-tab; `P1.3` tra cứu ra phiếu vừa tạo; sidebar có mục mới; `tsc` pass.
**Mẫu tham chiếu:** `OrdersView.tsx` (cấu trúc bảng + modal + filter).

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- `src/components/cms/WarrantyView.tsx` (mới, ~1.230 dòng): **4 thẻ thống kê** (Tổng phiếu · Đang xử lý · Đã trả khách · Hết bảo hành) + **4 sub-tab lấy từ `WARRANTY_TABS`** (`src/utils/warranty.ts`) — mỗi tab mang sẵn `query` gửi thẳng cho API (`status`/`expired`), số đếm trên tab tính từ `allList` nên không phát sinh request thừa.
- Bảng **7 cột** (gộp đủ **11 thông tin** đặc tả): Phiếu (mã phiếu + mã hãng) · Khách hàng (tên + SĐT + email) · Sản phẩm / Serial · Thời hạn bảo hành (ngày mua · hết hạn · **badge còn lại** · thời hạn tháng) · Tiến độ xử lý (badge trạng thái màu + `<select>` đổi nhanh) · Kỹ thuật viên (+ chi phí + ngày trả khách) · Thao tác; bọc `overflow-x-auto` cho mobile.
- **Action nhanh trên dòng:** `<select>` đổi trạng thái (gửi đúng 1 field `{status}`) · nút **Gán kỹ thuật viên** (`UserCog`) — modal nhỏ có `<datalist>` gợi ý KTV đã từng phụ trách, **suy từ chính dữ liệu phiếu** nên không cần bảng nhân sự, để trống khi lưu = bỏ phân công · xem chi tiết · in phiếu · sửa · xóa.
- Modal tạo/sửa: chọn sản phẩm từ `api.getProducts()` (tự điền tên + giá bán), `endDate` **xem trước ngay khi gõ** bằng `warrantyEndDatePreview()` — cùng hàm mà server dùng để tính thật (⇒ preview và dữ liệu lưu không bao giờ lệch nhau); validate bắt buộc (khách · SĐT · sản phẩm · tình trạng tiếp nhận) qua `showToast`.
- Modal chi tiết: thanh tiến độ `WARRANTY_PROGRESS[status]` + **timeline 5 mốc** `warrantyTimeline()` (đã xong = tick xanh, mốc hiện tại = đậm + ring) + khối khách hàng/sản phẩm + tình trạng – chẩn đoán – phương án – chi phí + đổi trạng thái nhanh.
- **In phiếu bảo hành:** nút gọi `window.print()`; UI bọc `.print:hidden`, khối `.print:block` riêng vẽ *Phiếu tiếp nhận bảo hành* (khách · máy/serial · BH từ–đến · thời hạn · tình trạng hạn BH · KTV · chi phí) — tái dùng đúng kỹ thuật của `PriceListPage`.
- Nối vào CMS: `CmsLayout.tsx` — import `WarrantyView`, `navItems` thêm `{ id: 'warranties', label: 'Bảo Hành & Sửa Chữa', icon: ClipboardCheck }` ngay sau *Dịch Vụ Kỹ Thuật*, `switch (cmsTab)` thêm `case 'warranties'` (trước `default`). Union `CmsTab` đã có `'warranties'` từ P1.1 ở **cả hai chỗ** (`src/types/index.ts` + `src/context/AppContext.tsx`) nên không phải sửa lại.
- **Kiểm chứng:** `npm run lint` **exit 0** · `npm run build` OK (366ms) · **`npm run test:cms-warranty` (mới: `tests/warrantyCms.smoke.tsx`, SSR `WarrantyView` trong `AppProvider` + `MemoryRouter`) PASS 3/3 nhóm marker (19 marker)** · `npm run test:warranty-ui` **43/43** · `test:warranty` **69/69** · `test:routes` **PASS 14/14 URL** · `test:utils` 41/41 · `test:seo` 76/76 · `test:pagination` 47/47.

### `[x] P1.3` — Trang tra cứu bảo hành (public `/bao-hanh`)
**Phụ thuộc:** P0.1, P1.1
**Files:** `src/components/website/WarrantyLookupPage.tsx` (mới) · `src/types/index.ts:188` · `src/context/AppContext.tsx:14` · `src/App.tsx:31` · `Navbar.tsx` · `Footer.tsx`
**Bước:**
1. Form 1 ô (SĐT / serial / mã phiếu) + nút "Tra cứu".
2. Kết quả dạng card: ảnh + tên sản phẩm · ngày mua · hạn bảo hành · **số ngày còn lại** (badge xanh >30 ngày / vàng 1-30 / đỏ hết hạn) · trạng thái phiếu sửa chữa.
3. Empty state + khối "Chính sách bảo hành" + hotline.
4. Nút "Gửi yêu cầu bảo hành" → mở `QuoteModal` (tái sử dụng, mở rộng thêm prop tiêu đề/loại yêu cầu).
5. Thêm link "Bảo Hành" vào `Navbar` + cột "Hỗ trợ" ở `Footer`.
**DoD:** `/bao-hanh` chạy đúng khi F5; tra SĐT seed ra kết quả; SĐT không tồn tại → thông báo lịch sự (không lỗi console); mobile responsive.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- `src/components/website/WarrantyLookupPage.tsx` (mới, ~600 dòng): 1 ô nhập (SĐT / serial / mã phiếu) + nút Tra cứu; chặn sớm `q` < 4 ký tự ở client (`LOOKUP_MIN_LENGTH = 4`, trùng hằng ở `server/warranty.ts`) nên **không sinh request 400 vô ích**.
- **`?q=` là nguồn sự thật (P0.1):** đọc 1 lần lúc mount ⇒ F5 / dán link / Back-Forward tra ngay; submit ghi lại `?q=` bằng `setSearchParams` ⇒ link chia sẻ được. Cách này cũng là "thêm ngoài kế hoạch" so với đặc tả gốc (đặc tả chỉ nói form + nút).
- Card kết quả: ảnh + tên sản phẩm (link sang trang chi tiết + giá bán) · mã phiếu + serial · lưới 4 mốc thời gian (ngày mua / bắt đầu BH / kết thúc BH / số tháng) · **badge số ngày còn lại** `warrantyRemainingBadge(endDate)` (xanh > 30 · vàng 1–30 · đỏ hết hạn) + thanh tiến độ · trạng thái phiếu sửa chữa (`WARRANTY_STATUS_LABELS/BADGES`) · khối tình trạng – chẩn đoán – phương án – kỹ thuật viên – chi phí.
- **Empty state lịch sự:** chưa nhập / `q` quá ngắn / không có kết quả / lỗi mạng đều báo bằng text tiếng Việt, **không log lỗi ra console** (đúng DoD); khi chưa tra cứu thì hiện khối **hướng dẫn 3 bước**.
- Khối “Chính Sách Bảo Hành” (5 gạch đầu dòng + link sang trang chính sách) + khối **hotline/email lấy từ `settings` CMS**, fallback `FALLBACK_HOTLINE = '1900 8888'` khi chưa cấu hình — không hardcode trong JSX.
- Nút **Gửi yêu cầu bảo hành** → `openQuoteModal(prefill, 'warranty')`: `QuoteModal` nay **dual-mode** (báo giá / bảo hành) với tiêu đề + loại yêu cầu khác nhau, điền sẵn tên máy + serial tìm được (khi đã có kết quả) ⇒ đúng bước 4 mà không phải viết modal mới.
- **SEO (P0.2):** `setSeo()` canonical `ROUTES.warranty` + **JSON-LD `FAQPage` + `BreadcrumbList`**, kèm khối FAQ **hiển thị thật** trên trang (Google yêu cầu nội dung FAQ-LD phải nhìn thấy được — cùng cách làm ở `PriceListPage`).
- Link vào `Navbar` (desktop “Bảo hành” + mục “Tra cứu bảo hành” trong menu mobile) và `Footer` (cột Hỗ trợ) — dùng `<Link to={pathFor(...)}>` / `ROUTES.warranty` thật nên crawlable, không phải `onClick`. `server.ts` sitemap bổ sung `ROUTES.warranty` (`changefreq: monthly`, `priority: 0.6`).
- **E2E HTTP thật** (server `npm run dev` port **3100**, DB `data/gpsoft.sqlite` hiện có): `GET /api/warranties/lookup?q=0912 345 678` ⇒ **200** trả đúng 1 phiếu `BH-2026-0002` (`remainingDays: 20`, kèm `product{slug,thumbnail,salePrice}` để vẽ card) · serial `MBP14M3P-4471902` ⇒ 200 · SĐT `0933445566` ⇒ 200 (phiếu `BH-2026-0003`) · `q=0987654321` ⇒ **200 + `data: []`** · `q=abc` ⇒ **400** · `/bao-hanh` ⇒ **200** (`index.html`, F5 chạy được) · `/sitemap.xml` ⇒ có `<loc>https://gpsoft.vn/bao-hanh</loc>`.
- **Mobile responsive:** mọi khối grid dùng `grid-cols-1 sm/md/lg:*`, hàng nút dùng `flex-wrap`; bảng CMS bọc `overflow-x-auto`.
- **Kiểm chứng:** `npm run lint` **exit 0** · `npm run build` OK · `test:routes` **PASS 14/14** (đã thêm dòng `/bao-hanh` với **4 marker**: h1 + form + khối chính sách + khối FAQ) · `test:warranty-ui` 43/43 · `test:cms-warranty` PASS · `test:warranty` 69/69 · `test:utils` 41/41 · `test:seo` 76/76 · `test:pagination` 47/47.

### `[x] P1.4` — Entity + API Báo giá (`price_quotes`)
**Files:** `schema.ts` · `server/types.ts` · `src/types/index.ts` · `server/db.ts` · `server/auth.ts` · `server/routes.ts` · `src/services/api.ts`
**Bước:**
1. `COLLECTIONS += price_quotes`: `id, code, title, customerName, phone, email?, company?, note?, validUntil, total(decimal), status, createdBy, createdAt` + children cho dòng báo giá:
```ts
{ table:'price_quote_items', path:'items', ownerColumn:'quote_id', indexColumns:['item_index'],
  columns:[ c('name','text'), opt('spec'), c('unit','text'), c('qty','int'),
            c('unitPrice','decimal'), c('total','decimal') ] }
```
   `status`: `draft | sent | accepted | rejected | expired`.
2. Làm đủ **7 lớp §0.2** (seed 2 báo giá, mỗi báo giá 3 dòng).
3. `auth.ts`: thêm `case 'price-quotes': resource = 'quotes'; break;`
4. Routes: `GET /price-quotes` · `GET /price-quotes/:idOrCode` · `POST` (**tính `total` ở server**, không tin số client gửi) · `PUT /:id` · `DELETE /:id` · `GET /price-quotes/export.csv` (tái dùng kỹ thuật `/export/price-list.csv` tại `routes.ts:913`).
**DoD:** tạo báo giá 3 dòng → `total` = Σ(qty × unitPrice) đúng; CSV mở được bằng Excel (UTF-8 BOM).

- **7 lớp đã làm đủ:** `schema.ts` (`price_quotes` + children `price_quote_items` với `alwaysInclude: true`, thêm 2 dòng `SCHEMA_KEYS`) · `server/types.ts` + `src/types/index.ts` (`PriceQuoteStatus` · `PriceQuoteItem` · `PriceQuote` · `QuoteLink`) · `server/db.ts` (**5 điểm**: seed 2 báo giá × 3 dòng + CRUD) · `server/auth.ts` (`case 'price-quotes'` → resource `quotes`, role `staff` thêm `quotes.view|create|edit`) · `server/routes.ts` (5 route) · `src/services/api.ts` (6 method) · UI CMS ở **P1.5**.
- **Tiền luôn tính ở server:** `server/quote.ts` (hàm thuần mới) có `normalizeQuoteItems()` + `computeQuoteTotal()`; `POST/PUT` **bỏ qua hoàn toàn** `total`/`item.total` client gửi (E2E gửi `total: 1` ⇒ lưu `31.350.000`). Kẹp `qty`/`unitPrice` (âm ⇒ 0, chuỗi số vẫn đọc được, tối đa `QUOTE_MAX_ITEMS = 50` dòng).
- **Seed tính tổng bằng code, không gõ tay:** helper `quoteItem()`/`priceQuote()` trong `db.ts` ⇒ `BG-2026-0001` = **157.440.000đ** (3 dòng), `BG-2026-0002` = **463.700.000đ**; `validUntil` tính động (`+15` / `+30` ngày) nên demo được cả badge còn hạn.
- **Trạng thái hiệu lực:** `effectiveQuoteStatus()` tự chuyển `expired` khi quá `validUntil` **chỉ với** `draft|sent` (`accepted`/`rejected` là quyết định của khách, giữ nguyên). `GET /price-quotes` trả kèm `remainingDays`/`isExpired`.
- **`GET /price-quotes/export.csv` khai báo TRƯỚC `/:idOrCode`** (nếu không `:idOrCode` sẽ “nuốt” `export.csv`) — CSV 1 dòng/1 dòng hàng, UTF-8 BOM, escape `"`.
- **Kiểm chứng:** `npm run lint` 0 lỗi · `npm run test:quotes` (mới) **PASS 51/51** · `npm run test:quote-ui` (mới, util FE) **PASS 43/43** · regression: routes OK · utils 41/41 · seo 76/76 · pagination 47/47 · warranty 69/69 · warranty-ui 43/43 · cms-warranty OK.
- **E2E HTTP thật** (server riêng port 3214 + `SQLITE_FILE=data/tmp-p14.sqlite`, script tạm `tests/tmp-p14-e2e.mjs`) **PASS 31/31**: seed 2 báo giá/3 dòng đúng tổng · `GET` không token ⇒ 401 · phân trang `meta` đúng · `POST` tính lại tổng + sinh mã `BG-2026-0003` + `createdBy` lấy từ token · thiếu dòng hàng ⇒ 400 · `PUT` đổi trạng thái + tính lại tổng · CSV đúng `text/csv` + 3 byte `EF BB BF` · `GET /quote-links/:code` công khai ⇒ 200, sai/thiếu mật khẩu ⇒ 401/404, `viewCount` tăng · xóa báo giá ⇒ 404.

### `[x] P1.5` — CMS tab "Báo giá & Link chia sẻ" (`QuotesView.tsx`)
**Phụ thuộc:** P1.4
**Files:** `src/components/cms/QuotesView.tsx` (mới) · `CmsLayout.tsx` · `CmsTab` (2 chỗ) · `schema.ts`/`db.ts`/`routes.ts`/`api.ts` cho entity `quote_links`
**Bước:**
1. Bảng danh sách báo giá + filter `status` + tìm theo mã/SĐT/khách.
2. Modal tạo/sửa: thêm/xoá dòng động, cộng tổng realtime, nút "Chọn từ sản phẩm".
3. Entity `quote_links` (`id, code, quoteId, password?, expiresAt, viewCount, isActive, createdAt`) → CRUD + public `GET /quote-links/:code?pass=`.
4. Trong modal chi tiết: nút **"Tạo link chia sẻ"** → copy URL `/bao-gia/<code>`; hiển thị lượt xem; bật/tắt; đặt mật khẩu.
**DoD:** tạo link → mở URL ở tab ẩn danh xem được báo giá (đúng mật khẩu nếu có), `viewCount` tăng; tắt link → 404.

- **Entity `quote_links` (lớp 1–6 trước UI):** `schema.ts` (`quote_links` + `SCHEMA_KEYS`), 2 file types (`QuoteLink`, `QuoteLinkView` ở FE), `db.ts` (seed 2 link mẫu: `BG7K2M9Q` công khai + `BGVIP2026` mật khẩu `gpsoft`; getter + `add/update/delete` + `incrementQuoteLinkView`), `auth.ts`, `routes.ts` (`GET/POST/PUT/DELETE /quote-links`), `api.ts` (4 method + `openQuoteLink` công khai).
- **⚠️ Phát hiện & sửa lỗi thật khi E2E:** `PUBLIC_GET_PREFIXES` khớp theo **tiền tố** nên `'/quote-links/'` **không** mở được `/quote-links/BG7K2M9Q` (điều kiện `path.startsWith(prefix + '/')` ⇒ phải là `//`) ⇒ route công khai trả **401**. Đã thêm `PUBLIC_GET_PATTERNS = [/^\/quote-links\/[^/]+$/]` trong `auth.ts` — mở **đúng 1 segment con**, KHÔNG mở `GET /quote-links` (danh sách link của admin) đúng như cảnh báo §D.4.
- **`QuotesView.tsx` (mới, ~1.180 dòng):** 4 thẻ thống kê (tổng · cần theo dõi · khách đồng ý · **giá trị đã chốt** = Σ báo giá `accepted`), 6 sub-tab trạng thái có đếm số, tìm kiếm theo mã/tiêu đề/khách/công ty/SĐT, bảng 7 cột, nút **Xuất CSV** (dùng `downloadPriceQuoteCsv()` — route cần token nên không dùng `<a href>` được).
- **Modal tạo/sửa:** thêm/xoá dòng động (chặn xoá dòng cuối), `+ Chọn từ sản phẩm…` điền sẵn tên/quy cách/giá từ kho (điền vào dòng trắng đầu tiên, hết dòng trắng thì thêm dòng mới), **tổng realtime** bằng `quoteSubtotal()` + hiện luôn “bằng chữ”; helper `Field`/`inputCls` để không lặp chuỗi class.
- **Modal chi tiết:** phiếu đọc-only + đổi nhanh trạng thái + khối **Link chia sẻ**: tạo link (mật khẩu tuỳ chọn + hạn xem), **copy URL `/bao-gia/<mã>`** (tự copy sau khi tạo), mở thử tab mới, bật/tắt, đặt/đổi/gỡ mật khẩu (`prompt`, để trống = gỡ), thu hồi, hiện **số lượt xem**. URL luôn dựng bằng `pathFor('quote-detail', { quoteCode })` (§D.11) — không viết tay chuỗi URL.
- **Xoá báo giá ⇒ thu hồi luôn mọi link của nó** (`db.deletePriceQuote` lọc bỏ link cùng `quoteId`).
- **Kiểm chứng:** `npm run lint` 0 lỗi · `npm run test:cms-quotes` (mới, SSR) **PASS 5/5 nhóm marker** · `npm run build` OK (363ms) · `npm run test:quotes` 51/51 · `test:quote-ui` 43/43 · regression routes/utils/seo/pagination/warranty/warranty-ui/cms-warranty đều xanh.
- **E2E HTTP thật** (`tests/tmp-p14-e2e.mjs`, port 3214): tạo link có mật khẩu ⇒ thiếu mật khẩu **401 + `requiresPassword: true`**, sai mật khẩu 401, đúng mật khẩu **200** + `viewCount` **1**; link công khai seed mở được **không cần token**; `PUT { isActive: false }` ⇒ mở lại **404**; mã không tồn tại ⇒ 404; `DELETE` ⇒ 200.

### `[x] P1.6` — Public: Bảng giá 3 tab + trang `/bao-gia/:code`
**Phụ thuộc:** P1.5
**Files:** `src/components/website/PriceListPage.tsx` · `src/components/website/QuoteViewPage.tsx` (mới) · `src/types/index.ts` · `AppContext.tsx` · `App.tsx` · `api.ts`
**Bước:**
1. `PriceListPage` thêm sub-tab: `Báo giá tổng` (bảng cấu hình nhóm CPU/RAM/SSD theo mức giá) · `Báo giá sản phẩm` (giữ nguyên) · `Link Báo Giá` (giải thích + ô nhập mã để mở).
2. `QuoteViewPage`: render dạng phiếu công ty (logo/MST/địa chỉ lấy từ `settings`), bảng dòng, tổng tiền bằng chữ, hạn hiệu lực, nút **In / Tải PDF** (`window.print()`).
3. Route `/bao-gia/:code`; mật khẩu sai → form nhập lại.
**DoD:** in ra đúng 1 trang A4 gọn; 3 tab chuyển mượt; link chia sẻ hoạt động ở tab ẩn danh.

- **Route `/bao-gia/:code` (checklist 5 bước):** `src/utils/url.ts` (`RouteParams.quoteCode` · `pathFor('quote-detail')` · `parsePath` case `bao-gia` — thiếu mã ⇒ về `/bang-gia`, không phải 404) · union `WebsitePage` **2 chỗ** (`src/types/index.ts` + `AppContext.tsx`) · `AppContext` thêm `selectedQuoteCode` (khởi tạo từ URL + đồng bộ trong effect `parsePath`) và action `navigateToQuote()` · `App.tsx` thêm `case 'quote-detail'`. Bỏ luôn `TODO(P1.5)` cuối `parsePath`.
- **`QuoteViewPage.tsx` (mới):** 4 trạng thái — chưa có mã (hướng dẫn về `/bang-gia`) · đang tải · **link có mật khẩu** (form nhập lại, dữ liệu báo giá KHÔNG được tải trước khi xác thực) · link sai/đã tắt/hết hạn (kèm nút gọi hotline + yêu cầu báo giá mới). Khi hợp lệ: phiếu dạng công ty (logo/tên/địa chỉ/hotline/email lấy từ `settings` giống mẫu in `OrdersView`), khối “Kính gửi”, bảng dòng hàng có STT/ĐVT/SL/đơn giá/thành tiền, dòng **“Bằng chữ”** (`amountInWords`), **4 điều khoản chuẩn B2B**, ô ký hai bên; banner đỏ khi quá hạn; nút **In / Tải PDF** (`window.print()`), Copy link, “Yêu cầu chỉnh sửa” (mở `QuoteModal`).
- **In gọn 1 trang A4:** thanh công cụ/chân trang dùng `print:hidden`, thân phiếu `print:shadow-none print:border-0 print:p-0`; thêm `print:hidden` cho `<header>` của `Navbar` và `<footer>` của `Footer` ⇒ **mọi trang** in ra không còn dính menu/footer (trước P1.6 chưa có rule in nào trong `index.css`).
- **SEO:** trang Link Báo Giá đặt `robots: 'noindex,nofollow'` (tài liệu riêng của khách) và **không** có canonical — dùng `setSeo()` như các page khác (§D.13).
- **`PriceListPage` 3 sub-tab:** `Báo giá tổng` (bảng cấu hình gợi ý theo mức giá + 3 mức chiết khấu số lượng + CTA gửi yêu cầu báo giá tổng) · `Báo giá sản phẩm` (nguyên bảng giá cũ + FAQ) · `Link Báo Giá` (giải thích + ô nhập mã ⇒ `navigateToQuote()` + khối “chưa có link thì gửi yêu cầu”). Dữ liệu tĩnh gom vào `src/utils/quote.ts` (`QUOTE_CONFIG_TIERS` · `QUOTE_BULK_TIERS`) — không khai báo trong component.
- **Kiểm chứng:** `npm run lint` 0 lỗi · `npm run test:routes` **OK** (thêm case `/bao-gia/BG7K2M9Q` ⇒ “Đang tải phiếu báo giá...”) · `npm run test:quote-ui` **49/49** (thêm 6 assertion cho 2 hằng mới) · `npm run build` OK (332ms).
- **E2E live (port 3215, `DB_DRIVER=sqlite`, DB riêng):** `GET /bao-gia/BG7K2M9Q` ⇒ **200** + shell SPA có `#root`; `GET /api/quote-links/BG7K2M9Q` ⇒ 200 (`BG-2026-0001`, tổng 157.440.000, `viewCount` 1); `BGVIP2026?pass=gpsoft` ⇒ 200 (`BG-2026-0002`); `BGVIP2026` **không** pass ⇒ **401**; `GET /bang-gia` ⇒ 200.
- **Lưu ý khi chạy E2E:** `.env` đang để `DB_DRIVER=mssql` nên phải truyền `$env:DB_DRIVER='sqlite'` + `$env:SQLITE_FILE='data/tmp-*.sqlite'` (chỉ `SQLITE_FILE` là **không** đủ → server cố kết nối MSSQL và thoát). Đây là điều kiện môi trường, P5/P6 sẽ chốt lại `.env` khi triển khai thật. ✅ **Đã xử lý (27/09/2026):** `msnodesqlv8` đã cài được nên `DB_DRIVER=mssql` chạy thật được — xem §0.4.

### `[x] P1.7` — Coupon/Mã giảm giá thật (thay hardcode)
**Files:** `schema.ts` · các file types/db/routes/api · `src/components/cms/CouponsView.tsx` (mới) · `CmsLayout.tsx` · `src/components/website/CartDrawer.tsx` · `CheckoutModal.tsx` · `server/routes.ts` (POST /orders)
**Bước:**
1. Entity `coupons`: `id, code, name, discountType(percent|fixed), value, minOrder, maxDiscount, usageLimit, usedCount, startAt, endAt, applyTo(all|category|product), applyIds[], isActive, createdAt`.
2. API: CRUD + `POST /coupons/validate` (**public**, body `{code, subtotal, items[]}`) → trả `{valid, discount, message}`.
3. `CartDrawer.tsx`: **bỏ hardcode `GPSOFT500`/`VIP10`**, gọi API validate, hiển thị dòng giảm giá.
4. `CheckoutModal.tsx` + `POST /orders`: gửi kèm `couponCode`/`discount`; server **validate lại** và tăng `usedCount` (chặn vượt `usageLimit`, hết hạn, dưới `minOrder`).
5. CMS `CouponsView`: bảng + tạo/sửa + bật/tắt + thống kê lượt dùng.
**DoD:** nhập `GPSOFT500` cũ → thông báo hết hiệu lực; coupon seed mới → giảm đúng, đơn lưu `discount`; dùng quá `usageLimit` → bị chặn.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Đủ 7 lớp §0.2:** `schema.ts` (bảng `coupons` + bảng con `coupon_apply_ids` cho `applyIds[]` + `SCHEMA_KEYS.coupons`; bảng `orders` thêm 3 cột `couponCode`/`shippingMethodId`/`shippingMethod`) · `server/types.ts` (`CouponDiscountType`/`CouponApplyTo`/`Coupon`/`CouponValidation` + `DatabaseSchema.coupons`) · `src/types/index.ts` (mirror + `CouponView` có `state` + `AppliedCoupon`) · `server/db.ts` (đủ 5 điểm + **seed 4 mã** + `incrementCouponUsage` **chỉ gọi sau khi `addOrder` thành công**) · `server/auth.ts` (`case 'coupons' → resource 'coupon'`; thêm **đúng 1 regex** `/^\/coupons\/validate$/` vào `PUBLIC_POST_PATTERNS` ⇒ validate là công khai, còn `GET /coupons` vẫn cần token) · `server/routes.ts` (5 endpoint) · `src/services/api.ts` (`getCoupons` · `createCoupon` · `updateCoupon` · `deleteCoupon` · `validateCoupon`).
- **Logic thuần `server/coupon.ts` (mới)** — không import express/db, test bằng node thuần: `normalizeCouponCode` · `couponState` (thứ tự kiểm **cố định**: tồn tại → đang bật → `startAt` → `endAt` → còn lượt → `minOrder` → phạm vi) · `couponMessage` (câu tiếng Việt cho từng trạng thái) · `eligibleSubtotal` · `computeCouponDiscount` (percent có trần `maxDiscount`, luôn kẹp `[0, subtotal]`) · `validateCoupon` · `filterCoupons`. Kèm `tests/coupon.smoke.ts` + **`npm run test:coupons` ⇒ 51/51 assertion PASS**.
- **DoD (đã kiểm bằng E2E thật, xem block dưới):** seed `GPSOFT500` (chính mã hardcode cũ) đặt `endAt = hôm nay − 3 ngày` ⇒ nhập vào trả **`Mã ưu đãi đã hết hiệu lực.`**; `LAPTOP15` có `usedCount = usageLimit = 20` ⇒ bị **chặn** với `Mã ưu đãi đã hết lượt sử dụng.`; `VIP10` giảm 10% trần 2tr ⇒ đơn 32tr lưu `discount = 2.000.000` và `usedCount` **12 → 13**.
- **Bỏ hardcode hoàn toàn:** `CartDrawer.tsx` không còn `if (code === 'GPSOFT500') … else if (code === 'VIP10')`; việc áp mã chuyển vào `AppContext.applyCoupon()` (gọi `POST /coupons/validate`), state dùng chung với `CheckoutModal` ⇒ **giỏ đổi (thêm/bớt món) thì effect tự validate LẠI** và mã tự bị gỡ nếu không còn đủ điều kiện.
- **`POST /orders` là nơi chốt tiền:** `discount` client gửi **bị bỏ qua hoàn toàn**; mã không hợp lệ ⇒ trả **400 + `couponInvalid: true`** (không im lặng trừ 0đ để khách khỏi bị tính đủ tiền mà không biết). `categoryId` của từng dòng được tra từ DB nên mã theo danh mục vẫn tính đúng **phần hàng đủ điều kiện**.
- **Chia sẻ code:** `nonNegativeInt()` trong `server/quote.ts` được `export` để coupon dùng lại (không có bản sao thứ hai).
- **CMS `CouponsView.tsx` (mới, ~575 dòng):** 4 thẻ thống kê · 6 tab trạng thái (`COUPON_TABS`) · tìm theo mã/tên · bảng 7 cột (mức giảm/điều kiện/lượt dùng/thời gian/badge trạng thái) · modal tạo/sửa (kiểu giảm, `minOrder`, `maxDiscount`, `usageLimit`, `startAt`/`endAt`, phạm vi áp dụng + **checkbox chọn danh mục/sản phẩm**) · nút bật/tắt (`Power`) và xoá. Nhãn/badge/tab nằm trong `src/utils/commerce.ts` — không khai báo lại trong component (§D.9).

### `[x] P1.8` — Phí vận chuyển thật (`shipping_methods`)
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/ShippingView.tsx` (mới) · `CmsLayout.tsx` · `CartDrawer.tsx` · `CheckoutModal.tsx`
**Bước:**
1. Entity `shipping_methods`: `id, name, description, fee, freeFrom, estimatedDays, regions[], isActive, sortOrder`.
2. API CRUD + public `GET /shipping-methods`.
3. `CartDrawer`/`CheckoutModal`: **bỏ hardcode freeship 1.000.000đ & phí 30.000đ**; cho chọn phương thức; tính phí theo `freeFrom`; lưu `shippingMethod`/`shippingFee` vào order.
4. CMS `ShippingView`: bảng + tạo/sửa + bật/tắt.
**DoD:** đổi `freeFrom` trong CMS → reload giỏ hàng thấy phí đổi theo (không cần build lại).

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Đủ 7 lớp §0.2:** `schema.ts` (bảng `shipping_methods` + bảng con `shipping_method_regions` cho `regions[]` + `SCHEMA_KEYS.shipping_methods`) · 2 file types (`ShippingMethod`) · `server/db.ts` (5 điểm + seed **4 phương thức**: 3 bật, 1 tắt) · `server/auth.ts` (`case 'shipping-methods' → resource 'shipping'`; `'/shipping-methods'` vào `PUBLIC_GET_PREFIXES`) · `server/routes.ts` (4 endpoint) · `src/services/api.ts` (`getShippingMethods` · `create` · `update` · `delete`) · seed dùng **đúng bộ số đang hardcode cũ** (30.000đ / freeship 1.000.000đ) nên hành vi giỏ hàng mặc định không đổi.
- **Logic thuần `server/shipping.ts` (mới):** `activeShippingMethods` · `filterShippingMethods` · `computeShippingFee` (`freeFrom = 0` ⇒ luôn thu `fee`; `subtotal ≥ freeFrom` ⇒ 0đ) · `resolveShippingMethod`/`resolveShippingFee` (id sai/thiếu ⇒ **fallback phương thức đầu tiên đang bật**, không vỡ đơn của client cũ) · `shippingFeeLabel`. Kèm `tests/shipping.smoke.ts` + **`npm run test:shipping` ⇒ 24/24 assertion PASS**.
- **Server chốt phí:** `POST /orders` bỏ qua `shippingFee` client gửi, tính từ `shippingMethodId` + `subtotal` server tự cộng, rồi lưu `shippingMethodId` + `shippingMethod` (tên) + `shippingFee` vào đơn ⇒ **đổi/xoá phương thức sau này không ảnh hưởng đơn cũ**.
- **DoD (kiểm bằng E2E thật):** đơn 500.000đ (dưới ngưỡng) ⇒ **thu 30.000đ**, tổng 530.000đ; đơn 2.500.000đ ⇒ **0đ (freeship)**; đơn 32.000.000đ chọn *Giao hỏa tốc 2 giờ* (`freeFrom` 20tr) ⇒ **0đ**. Sửa `freeFrom`/`fee` trong CMS là website tính lại ngay (đọc từ API, không build lại).
- **Website:** `CartDrawer` có **danh sách chọn phương thức** (radio + thời gian dự kiến + gợi ý “miễn phí giao hàng cho đơn từ …”) và dùng `computeShippingFee` trong `src/utils/commerce.ts` — **bản phản chiếu** công thức server (có test `npm run test:commerce-ui` chốt 2 bên khớp nhau). `CheckoutModal` đọc chung state từ `AppContext` (bỏ hằng `cartTotal >= 1000000 ? 0 : 30000`) và hiển thị tên phương thức trong khối tổng kết.
- **CMS `ShippingView.tsx` (mới):** thẻ thống kê (tổng · đang bật · phí thấp nhất · freeship từ) · tìm theo tên/mô tả · bảng 7 cột · modal thêm/sửa (phí, `freeFrom`, `estimatedDays`, `regions` nhập cách nhau dấu phẩy, thứ tự hiển thị, bật/tắt). CMS gọi `?all=1` để thấy cả phương thức đang tắt.


### `[x] P1.9` — Campaign / Flash sale động (thay countdown hardcode)
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/CampaignsView.tsx` (mới) · `CmsLayout.tsx` · `src/components/website/HomePage.tsx`
**Bước:**
1. Entity `campaigns`: `id, name, type(countdown|flash_sale|banner), startAt, endAt, discountPercent, productIds[], bannerImage, ctaText, ctaUrl, isActive`.
2. API CRUD + public `GET /campaigns/active`.
3. `HomePage.tsx`: khối flash sale đang **hardcode `timeLeft`** → đọc campaign động, countdown theo `endAt`, danh sách sản phẩm giảm giá.
**DoD:** tạo campaign trong CMS → trang chủ hiện đúng tên/đếm ngược/sản phẩm; hết `endAt` → khối tự ẩn.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Đủ 7 lớp §0.2:** `schema.ts` (bảng `campaigns` + bảng con `campaign_products` cho `productIds[]` + `SCHEMA_KEYS.campaigns`) · 2 file types (`CampaignType`/`Campaign`/`CampaignView`/`ActiveCampaignView`/`CampaignState`) · `server/db.ts` (5 điểm + seed **3 campaign**: 1 flash sale đang chạy có 4 sản phẩm, 1 banner đã kết thúc, 1 đếm ngược sắp chạy) · `server/auth.ts` (`case 'campaigns' → resource 'campaign'`; **chỉ mở đúng route con** `'/campaigns/active'` trong `PUBLIC_GET_PREFIXES` — `GET /campaigns` vẫn cần token) · `server/routes.ts` (5 endpoint) · `src/services/api.ts` (`getCampaigns` · `getActiveCampaigns` · `create` · `update` · `delete`).
- **Logic thuần `server/campaign.ts` (mới):** `isCampaignRunning` (thiếu `startAt`/`endAt` ⇒ chạy vô hạn; `endAt` rác ⇒ coi như không giới hạn) · `campaignState` (`running`/`scheduled`/`ended`/`paused`) · `campaignProducts` (ưu tiên `productIds` đã khai, bỏ id không tồn tại/`draft`; rỗng ⇒ server tự chọn tối đa `CAMPAIGN_PRODUCT_LIMIT = 4` sản phẩm **giảm giá nhiều nhất**) · `activeCampaigns` (sắp theo `endAt` gần nhất) · `filterCampaigns`. Kèm `tests/campaign.smoke.ts` + **`npm run test:campaigns` ⇒ 28/28 assertion PASS**.
- **`HomePage.tsx` bỏ hẳn countdown giả:** xoá state `timeLeft = {5h42m19s}` + `setInterval` tự reset về 12:00 khi hết; nay đọc `GET /campaigns/active` (lỗi API **không** làm trắng trang chủ — `.catch(() => null)`) rồi đếm ngược bằng `campaignCountdown(campaign.endAt, now)` cập nhật mỗi giây. Tên khối lấy `campaign.name`, badge lấy `discountPercent`, nút CTA lấy `ctaText`/`ctaUrl`.
- **DoD “hết `endAt` ⇒ khối tự ẩn”:** server **không trả** campaign đã qua `endAt` ⇒ trang chủ không render khối; đồng thời client vẫn `showFlashSale = flashSaleProducts.length > 0 && !countdown.ended` (đổi `endAt` lúc trang đang mở ⇒ khối tự ẩn ngay khi đồng hồ về 0). Không có campaign nào ⇒ khối vẫn hiện như phiên bản cũ (fallback lấy sản phẩm giảm giá nhiều nhất) nên **không mất nội dung**.
- **CMS `CampaignsView.tsx` (mới):** 4 thẻ thống kê · 5 tab trạng thái (`CAMPAIGN_TABS`) · tìm theo tên · bảng 7 cột (kèm “Còn …” cho campaign đang chạy) · modal tạo/sửa có **ô tìm + checkbox chọn sản phẩm** (`productIds`), loại chiến dịch, `startAt`/`endAt`, % giảm, banner, CTA; chặn `endAt < startAt` ngay trên form.
- **Tiện ích dùng chung FE `src/utils/commerce.ts` (mới)** cho cả 3 task P1.7–P1.9: nhãn/badge/tab coupon & campaign, `computeShippingFee`, `campaignCountdown`/`campaignCountdownLabel` — **`npm run test:commerce-ui` ⇒ 36/36 assertion PASS**. 3 view CMS còn có test render SSR: **`npm run test:cms-commerce` ⇒ 10/10 nhóm marker PASS**.

**✅ Kiểm chứng chung cho cả 3 task (P1.7 · P1.8 · P1.9):**
- **`npm run lint` 0 lỗi** (tsc `--noEmit`) · **`npm run build` OK (353ms)**.
- **Hồi quy toàn bộ test cũ vẫn PASS:** `test:routes` · `test:utils` (41) · `test:seo` (76) · `test:pagination` (47) · `test:warranty` (69) · `test:warranty-ui` (43) · `test:quotes` (51) · `test:quote-ui` (49) · `test:cms-quotes` · `test:cms-warranty`.
- **Test mới:** `test:coupons` **51/51** · `test:shipping` **24/24** · `test:campaigns` **28/28** · `test:commerce-ui` **36/36** · `test:cms-commerce` **10/10 nhóm marker** (SSR 3 view CMS, không cần backend).
- **E2E live (Node script, port 3217, `DB_DRIVER=sqlite` + `SQLITE_FILE` riêng trong `data/`):** **37/37 PASS** — `GET /shipping-methods` public trả 3 phương thức đang bật (`?all=1` trả 4 cho CMS) · `GET /campaigns/active` public trả đúng `camp-1` + 4 sản phẩm · `POST /coupons/validate` là **công khai** (VIP10 ⇒ 2.000.000; GPSOFT500 ⇒ “hết hiệu lực”; LAPTOP15 ⇒ “hết lượt”) · `GET /coupons` và `GET /campaigns` **không token ⇒ 401** · `POST /orders` với client cố gửi `discount = 999.999.999`/`shippingFee = 0` vẫn lưu **discount 2.000.000 + phí theo phương thức** và tăng `usedCount` 12→13 · đơn có mã hết lượt ⇒ **400 + `couponInvalid: true`** · mã mới tạo qua CMS được **chuẩn hoá** (`' e2e 300k '` → `E2E300K`) và trùng mã ⇒ **409** · `GET /` vẫn 200.
- **Cách chạy E2E:** script tạm nằm ngoài repo (`data/tmp-e2e-p1.mjs`), mở server con với `DB_DRIVER=sqlite`/`SQLITE_FILE=data/tmp-*.sqlite`/`PORT=3217` rồi tắt sau khi xong. ⚠️ Vẫn như P1.6: `.env` đang là `DB_DRIVER=mssql` nên **phải truyền `DB_DRIVER=sqlite` tường minh** khi chạy E2E (máy chưa có `msnodesqlv8` — ✅ **nay đã cài được**, xem §0.4); P5/P6 sẽ chốt `.env` khi triển khai thật. **Đã xoá file tạm + DB tạm sau khi kiểm.**
- **Kiểm riêng ĐƯỜNG NÂNG CẤP DB (§D.5) — 8/8 PASS:** copy `data/gpsoft.sqlite` (DB cũ, **chưa** có 3 bảng mới) ra file tạm rồi khởi động server 2 lần trên bản copy: lần 1 `ensureSchema()` tự tạo + seed `coupons`/**`shipping_methods`**/**`campaigns`** (public API trả ngay 4 phương thức, 1 campaign đang chạy, `VIP10` dùng được: đơn 6tr ⇒ giảm 600.000đ); lần 2 **không** seed lại gì (products 10 · orders 3 · coupons 4 — y hệt lần 1) ⇒ khẳng định bảng cũ **không** bị ghi đè.
- **Ghi chú kỹ thuật phát sinh:** (1) `GET /shipping-methods?all=1` cũng là route công khai vì `PUBLIC_GET_PREFIXES` khớp theo tiền tố — thông tin phí ship không nhạy cảm nên chấp nhận; nếu khách muốn chặn thì chỉ cần đổi CMS sang gọi route cần token (thêm `GET /shipping-methods/admin`). (2) `POST /orders` **không còn** tin `discount`/`shippingFee` từ client ⇒ client cũ gửi số sai vẫn ra đơn đúng, nhưng client nào **không gửi `shippingMethodId`** sẽ nhận phí của phương thức đầu tiên đang bật (giữ đúng hành vi freeship 1tr/30k trước đây).
- **3 tab CMS mới** đã nối vào `CmsLayout.tsx` (import + `navItems` + `switch`) và `CmsTab` ở **cả 2 file** (§D.2): `Mã Giảm Giá` (`coupons`) · `Phí Vận Chuyển` (`shipping`) · `Chiến Dịch / Flash Sale` (`campaigns`). Quyền cho role **Nhân viên bán hàng** (`server/db.ts`) đã thêm `coupon.*` · `shipping.*` · `campaign.*` (role `admin` có `all` nên không cần).



---

# PHASE 2 — Module ngành & khớp menu site tham chiếu

### `[x] P2.1` — Danh mục 2 cấp + Mega menu + trang Danh mục/Thương hiệu
**Phụ thuộc:** P0.1
**Files:** `src/components/website/Navbar.tsx` · `Footer.tsx` · `ProductsPage.tsx` · `src/components/website/CategoryPage.tsx` (mới) · `BrandPage.tsx` (mới) · `src/context/AppContext.tsx` · `src/App.tsx`
**Bước:**
1. `Category` đã có `parentId` (`schema.ts:157`) → dựng cây 2 cấp ở `Navbar` mega menu (cột theo danh mục cha, sub-link theo con; hiện chỉ 1 cấp).
2. `CategoryPage`: banner danh mục + breadcrumb + lưới danh mục con + filter hãng/giá/tình trạng + sort + **phân trang** (dùng `meta` từ P0.4).
3. `BrandPage`: logo hãng + danh sách sản phẩm của hãng.
4. `ProductsPage` sidebar: hiển thị cây 2 cấp (accordion).
5. Thêm route `/danh-muc/:slug`, `/thuong-hieu/:slug` + action `openCategory/openBrand` trong `AppContext`.
**DoD:** click danh mục cha → hiện danh mục con; vào con → lọc đúng sản phẩm; URL chia sẻ được; F5 giữ nguyên trang.

**✅ Kết quả implement (đánh dấu `[x]` khi regression P2.2 — trước đó task đã code nhưng ROADMAP chưa cập nhật):**
- `CatalogListingPage.tsx` (mới, ~723 dòng) là **thân chung** cho cả 2 loại trang; `CategoryPage.tsx` / `BrandPage.tsx` chỉ là lớp mỏng `kind="category" | "brand"` ⇒ không nhân đôi UI, slug lấy từ `activeCategorySlug`/`activeBrandSlug` của context (đồng bộ với `parsePath`) chứ không dùng `useParams`.
- `server/db.ts` seed **danh mục cấp 2** (`ensureDemoSubcategories()`: MacBook · Laptop Gaming · Laptop Văn phòng - Đồ họa · iPhone · Samsung Galaxy) và tự chuyển sản phẩm demo vào danh mục con ⇒ DB cũ nâng cấp tự động, không cần migration tay.
- Context: `activeCategorySlug` / `activeBrandSlug` + `navigateToBrand()`; route `/danh-muc/:slug` · `/thuong-hieu/:slug`; `Navbar.tsx` mega menu **2 cấp** (mỗi danh mục cha 1 cột, danh mục con nằm dưới).
- **Kiểm chứng:** `npm run test:catalog` **43/43 PASS** (lọc đúng ô cha/con · slug · phân trang) · `npm run test:catalog-ui` **25/25 PASS** (route danh mục/thương hiệu render đúng trang) · `npm run lint` 0 lỗi · `npm run build` OK.

### `[x] P2.2` — Module "Phần mềm chấm công" (4 tab con)
**Phụ thuộc:** P0.1
**Files:** `src/components/website/AttendanceSoftwarePage.tsx` (mới) · `src/types/index.ts` · `AppContext.tsx` · `App.tsx` · `Navbar.tsx` · `Footer.tsx` · `src/components/cms/PagesView.tsx` (nội dung do CMS quản lý)
**Bước:**
1. Trang `/phan-mem-cham-cong` với **4 tab**: `Chấm công` · `Nhân sự` · `Tiền lương` · `Kiểm xưởng`.
2. Mỗi tab: hero nhỏ + mô tả tính năng (icon list) + ảnh/screenshot + bảng so sánh gói + CTA "Nhận demo" → `QuoteModal`.
3. Nội dung 4 tab lấy từ `Page` có `slug = phan-mem-cham-cong-<tab>` để CMS sửa được (`PagesView`), fallback nội dung tĩnh.
4. Thêm vào menu chính (dropdown 4 mục con).
**DoD:** 4 tab chuyển bằng URL `/phan-mem-cham-cong?tab=nhan-su` (hoặc `#nhan-su`); sửa nội dung trong CMS → public đổi theo.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Tách dữ liệu tab ra khỏi UI — `src/utils/attendance.ts` (mới, ~790 dòng):** `ATTENDANCE_TABS` (4 tab: `cham-cong` · `nhan-su` · `tien-luong` · `kiem-xuong`) + `attendanceTab()` / `findAttendanceTab()` / `attendanceTabPath()` / `attendanceCmsSlug()` / `attendanceCmsPages()` / `ATTENDANCE_TAB_IDS`. Trang public, `Navbar`, `Footer` và `PagesView` đọc **cùng một nguồn** ⇒ nhãn/slug/giá không thể lệch nhau. Mỗi tab có: `navHint` · `tagline` · `badges[]` · `description[]` · `metrics[]` · `features[]` (icon/title/desc) · `mock` (ảnh chụp giao diện: bảng + badge `tone`) · `compare[]` (bảng so sánh gói) · `plans[]` (3 gói) · `faqs[]` · `cmsContent`.
- **`AttendanceSoftwarePage.tsx` (mới):** tab đọc từ **URL thật** `?tab=` (F5/chia sẻ link giữ nguyên tab); `?tab` là slug CMS (`phan-mem-cham-cong-nhan-su`) hoặc giá trị rác/viết hoa ⇒ `useSearchParams` **sửa lại URL bằng `replace`** (không tồn tại 2 URL cho cùng nội dung — SEO); tab mặc định ⇒ canonical là URL sạch `/phan-mem-cham-cong` (không kèm `?tab=`). Mỗi tab: hero + chỉ số + icon list tính năng + ảnh chụp giao diện + **bảng so sánh gói** + FAQ + CTA "Nhận demo" → `openQuoteModal()`; SEO theo tab: canonical + `BreadcrumbList` + `FAQPage` JSON-LD.
- **Nối vào app (§0.3 đủ 5 lớp):** `src/types/index.ts` + `AppContext.tsx` (union `WebsitePage` + `navigateToAttendance()`), `src/App.tsx` (`case 'attendance'`), `src/utils/url.ts` (`ROUTES.attendance = '/phan-mem-cham-cong'` — `?tab=` là query nên route map không đổi).
- **Lối vào:** `Navbar.tsx` dropdown "Phần mềm" (4 mục con, icon `ScanFace`/`Users`/`Wallet`/`Factory`) + khối 4 tab riêng trong menu mobile; `Footer.tsx` dải link 4 tab — cả hai render từ `ATTENDANCE_TABS` nên thêm/bớt tab chỉ sửa 1 chỗ.
- **CMS:** `PagesView.tsx` thêm nút **"Tạo 4 trang Module Chấm công"** → `handleSeedAttendancePages()` gọi `attendanceCmsPages()` rồi `api.createPage()` **idempotent** (slug đã tồn tại ⇒ bỏ qua, **không ghi đè** nội dung admin đã sửa) + `showToast` "Đã tạo x/4 trang…".
- **DoD "sửa nội dung trong CMS → public đổi theo":** `AttendanceSoftwarePage` gọi `api.getPage('phan-mem-cham-cong-<tab>')` trong `useEffect` theo tab ⇒ `Page.content` (chia đoạn theo dòng trống) **thay khối mô tả tĩnh**, `seo.metaTitle/metaDesc` ghi đè tiêu đề/mô tả. Trang chưa có · API lỗi · hoặc `isPublished: false` ⇒ **giữ nguyên nội dung tĩnh** (không trắng trang, không lộ bản nháp).
- **Giá 3 gói/tab** (đối chiếu chéo trong test): chấm công + nhân sự `590.000đ / 1.490.000đ`, tiền lương `790.000đ / 1.990.000đ`, kiểm xưởng `890.000đ / 2.490.000đ` (gói thứ 3 = "Liên hệ" ⇒ `null`); accent `bg-[#1C86EE]`.
- **Kiểm chứng:** `npm run lint` **0 lỗi** · `npm run test:attendance-ui` (mới, `tests/attendanceUi.smoke.tsx`) **86/86 assertion PASS** — hằng số/nhãn · hợp đồng URL ↔ tab (kể cả slug CMS + giá trị rác) · SSR render **từng** tab và **không lẫn** nội dung tab khác · `FEATURE_ICONS` phủ **đủ mọi** icon key của 4 tab (24 icon: `ScanFace`…`Boxes`) · tính toàn vẹn dữ liệu (`id`/`mock`/`compare`/`plans`/`faq` không trùng, đủ 3 gói) · slug seed CMS khớp `api.getPage()` · lối vào `Navbar`/`Footer` · `npm run build` **OK** · **regression 18/18 suite PASS** (`routes` · `utils` · `seo` · `pagination` · `warranty` · `warranty-ui` · `cms-warranty` · `quotes` · `quote-ui` · `cms-quotes` · `coupons` · `shipping` · `campaigns` · `commerce-ui` · `cms-commerce` · `catalog` · `catalog-ui`).
- **E2E live (script tạm `data/tmp-e2e-p22.mjs`, port 3221, `DB_DRIVER=sqlite` + `SQLITE_FILE` riêng — đã xoá file tạm + DB tạm sau khi kiểm):** **27/27 PASS** — `admin/admin123` lấy token (sai mật khẩu ⇒ 401) · `POST /api/pages` không token ⇒ **401** nhưng `GET /api/pages` là **công khai** (nhờ `/pages` có trong `PUBLIC_GET_PREFIXES` — điều kiện bắt buộc để trang public đọc được nội dung CMS) · tạo đủ 4 slug `phan-mem-cham-cong-*` ⇒ **201** · `GET /api/pages/<slug>` **không token** ⇒ 200 + đúng `content` · `PUT /api/pages/:id` đổi nội dung ⇒ public đọc lại thấy nội dung + `metaTitle` **mới** và nội dung cũ **biến mất** · bản nháp `isPublished:false` ⇒ API vẫn 200 nhưng client bỏ qua · `DELETE` ⇒ public **404** (fallback nội dung tĩnh) · `/phan-mem-cham-cong` và `/phan-mem-cham-cong?tab=nhan-su` ⇒ 200 `text/html`.
- **Bổ sung ở P2.3:** URL `/phan-mem-cham-cong` đã được thêm vào `sitemap.xml` (`server.ts`, `changefreq: monthly` · `priority: 0.7`) — trước đó P2.2 xong trang nhưng **sót sitemap**.

### `[x] P2.3` — Trang "Thiết kế website" + gói dịch vụ
**Phụ thuộc:** P0.1
**Files:** `src/components/website/WebDesignPage.tsx` (mới) · `src/types/index.ts` · `AppContext.tsx` · `App.tsx` · `Navbar.tsx` · `Footer.tsx`
**Bước:**
1. Trang `/thiet-ke-website`: 3 khối — gói giá (3-4 gói, so sánh tính năng), quy trình 5 bước, portfolio mẫu (lưới ảnh + link demo).
2. Form đặt yêu cầu (loại website, ngân sách, deadline) → lưu `Lead` với `source: 'web-design'`.
3. `Services` API: thêm field `type` để phân biệt dịch vụ kỹ thuật vs. thiết kế web (hoặc seed 1 service slug `thiet-ke-website` và render từ dữ liệu).
**DoD:** gửi form → lead xuất hiện trong CMS tab Leads với `source` đúng; gói giá hiển thị đúng trên mobile.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **Không thêm field `type` cho `Service`** (bước 3 chọn phương án 2): giữ nguyên schema, chỉ **seed 1 service slug `thiet-ke-website`** ⇒ không phải migration DB, không phải sửa `Service` API/CMS form, mà vẫn đạt mục tiêu "gói giá + nội dung render từ dữ liệu".
- **Tách dữ liệu trang ra `src/utils/webDesign.ts` (mới, ~377 dòng):** bảng giá 3 gói (`WEB_DESIGN_PACKAGES`; gói "Báo giá riêng" = `price: null`) · quy trình 5 bước · portfolio · FAQ · loại website/ngân sách/tiến độ + `validateWebDesignForm()` · `buildWebDesignLead/Subject/Message()` · `WEB_DESIGN_STATS` · `WEB_DESIGN_PAGE_TITLE/DESC` · `WEB_DESIGN_MODULE_LABEL` · `WEB_DESIGN_SERVICE_SEED`. Trang public, `Navbar`, `Footer`, `ServicesView` và 2 smoke test đọc **cùng một nguồn** ⇒ nhãn/giá/slug không thể lệch nhau.
- **`WEB_DESIGN_SERVICE_SEED` — một nguồn cho 2 đường:** (a) `server/db.ts` seed cho cài đặt mới **và** `ensureWebDesignService()` cho DB đã tồn tại (idempotent: chỉ thêm khi thiếu `slug`/`id` ⇒ **không ghi đè** nội dung admin đã sửa; copy sâu 2 mảng con nên bản ghi không chia sẻ tham chiếu với hằng số); (b) nút **"Tạo dịch vụ Thiết kế website"** trong `ServicesView` ⇒ `api.createService(WEB_DESIGN_SERVICE_SEED)`. `priceRange` **suy ra** từ bảng giá (`Từ formatVnd(min) - formatVnd(max)`), không gõ tay.
- **🐞 Bug thật phát hiện & sửa (chính là lý do "sửa CMS mà public không đổi"):** form CMS `ServicesView` gửi `priceEstimate`/`process`/`faq` còn trang public đọc `priceRange`/`processSteps`/`faqs` ⇒ dữ liệu admin nhập rơi vào **field lạ, không bao giờ tới trang public**. Sửa cả 2 đầu: (1) `server/service.ts` (mới) — `normalizeServiceInput(body)` map tên cũ → tên chuẩn, `buildServiceFromInput(body, id)` áp giá trị mặc định; `server/routes.ts` dùng cho `POST`/`PUT /api/services`; (2) `ServicesView` ghi **tên field chuẩn** (khi mở form vẫn đọc được `s.priceEstimate || s.priceRange`… nên bản ghi cũ không mất dữ liệu). Bản ghi lưu xuống DB giờ **sạch** field lỗi thời.
- **Hành vi `normalizeServiceInput` (được test khoá lại):** payload chuẩn đi thẳng · tên cũ được map · **field không gửi ⇒ KHÔNG ghi đè** (PUT partial) nhưng `shortDesc`/`content` rỗng vẫn ghi (admin chủ động xoá) và mảng rỗng xoá hết quy trình/FAQ · `title`/`slug` rỗng hoặc chỉ khoảng trắng ⇒ bỏ qua · dữ liệu rác (`null`, chuỗi phá hoại, mảng, sai kiểu) ⇒ trả `{}` chứ không làm sập server · bước quy trình giữ `step` gửi lên, không thì đánh số theo vị trí; bỏ `duration` rỗng.
- **`WebDesignPage.tsx` (mới):** hero + chỉ số cam kết + 3 gói (gói đề xuất nổi bật, giá bằng `formatVnd`) + quy trình 5 bước (kèm thời lượng) + portfolio (ảnh + `demoUrl`) + FAQ + form (select loại website/ngân sách/tiến độ, validate họ tên/SĐT/email/mô tả) → `POST /api/leads` với `source: 'web-design'`. Nếu CMS có `Service` slug `thiet-ke-website` thì tiêu đề/mô tả/quy trình/FAQ **bị ghi đè** bằng dữ liệu admin; chưa có ⇒ giữ nội dung tĩnh (không trắng trang).
- **🐞 Sửa thêm bug hiển thị giá `"₫đ"`:** giá gói trước đây render `${formatVnd(x)}đ` ⇒ in ra `4.900.000 ₫đ`. Nay dùng `formatVnd()` thuần (khớp 68 chỗ khác của codebase) và smoke test chốt "khung giá chỉ có đúng 1 ký hiệu `₫`".
- **SEO/sitemap:** thêm 2 URL vào `server.ts` bằng `ROUTES` (**không hardcode chuỗi**): `ROUTES.webDesign` (`priority: 0.8`) và `ROUTES.attendance` (`0.7` — P2.2 bị sót, bổ sung cùng lượt). URL chi tiết `/dich-vu/thiet-ke-website` vẫn có entry riêng qua vòng lặp `services` (2 trang khác nội dung, không trùng).
- **Lối vào:** `Navbar` (mục "Dịch vụ" → menu con + menu mobile) và `Footer` (cột Dịch vụ) render từ hằng số chung; anchor `#bang-gia` · `#du-an` · `#quy-trinh` · `#faq` · `#dang-ky` deep-link được từ Footer.
- **Kiểm chứng:** `npm run lint` **0 lỗi** · `npm run test:web-design-ui` (mới, `tests/webDesignUi.smoke.tsx`) **47/47 PASS** · `npm run test:services` (mới, `tests/service.smoke.ts`) **34/34 PASS** · `npm run test:routes` PASS · `npm run test:catalog` **43** · `npm run test:catalog-ui` **25** · `npm run test:attendance-ui` **86** · `npm run test:campaigns` **28** · `npm run test:cms-commerce` PASS · `npm run test:utils` **41** · `npm run test:seo` **76** · `npm run build` OK.
- **E2E HTTP thật (script tạm `data/tmp-e2e-p23.mjs`, port 3223, `DB_DRIVER=sqlite` + `SQLITE_FILE` riêng — đã xoá file tạm sau khi kiểm):** **29/29 PASS** — `GET /api/services/thiet-ke-website` **công khai** ⇒ 200 đúng slug/tiêu đề/khung giá (kỳ vọng tiền phải dựng bằng `Intl` vì dấu cách trước `₫` là **khoảng không ngắt**) · seed đủ 5 bước (mọi bước có `duration`) + 5 FAQ · `POST /api/leads` không token ⇒ 201 với `source=web-design` (không gửi `source` ⇒ server gán `website`) · `GET /api/leads` ⇒ **401**, `?source=web-design` ⇒ **chỉ** lead của form thiết kế website · `PUT /api/leads/:id` đổi trạng thái ⇒ giữ nguyên `source` · admin `PUT /api/services/:id` ⇒ public đọc lại thấy tiêu đề/mô tả/quy trình/FAQ mới · **PUT bằng tên field CŨ** ⇒ map đúng vào `priceRange`/`processSteps`/`faqs` và bản ghi sạch field cũ · PUT chỉ gửi `priceRange` ⇒ các phần khác giữ nguyên · xoá trắng `shortDesc` + mảng rỗng ⇒ ghi đúng · `/thiet-ke-website` và `/dich-vu/thiet-ke-website` ⇒ 200 `text/html` · sitemap có `<loc>` đủ 2 URL + `/phan-mem-cham-cong`.
- **Nâng cấp DB (kiểm chứng riêng, script tạm đã xoá):** copy `data/gpsoft.sqlite` (DB cũ được migrate từ `data/db.json` ⇒ `parsed.services` **không** có service này) rồi chạy server 2 lần: lần 1 log `[DB] Seeded P2.3 service "thiet-ke-website"` ⇒ tổng 5 service · lần 2 **không** seed lại ⇒ vẫn đúng 1 bản ghi (idempotent, không nhân đôi).

### `[ ] P2.4` — Video thư viện (`videos` + trang `/video`)
**Phụ thuộc:** P0.1
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/VideosView.tsx` (mới) · `CmsLayout.tsx` · `src/components/website/VideoGalleryPage.tsx` (mới) · `HomePage.tsx` · `Footer.tsx`
**Bước:**
1. Entity `videos`: `id, title, slug, youtubeId, thumbnail, description, category, isFeatured, sortOrder, isActive, createdAt`.
2. API CRUD + public `GET /videos`.
3. `VideoGalleryPage`: lưới thumbnail → click mở modal `iframe` YouTube (lazy load, không nhúng iframe sẵn để tránh nặng trang).
4. `HomePage`: thêm khối "Video nổi bật" (3 video `isFeatured`); `Footer` thêm link "Video".
5. CMS `VideosView`: bảng + tạo/sửa (nhập URL YouTube → tự tách `youtubeId`).
**DoD:** thêm video trong CMS → hiện ở trang chủ + `/video`; iframe chỉ load khi click.

### `[ ] P2.5` — Chi nhánh / Showroom (`branches`)
**Phụ thuộc:** P0.1
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/BranchesView.tsx` (mới) · `CmsLayout.tsx` · `src/components/website/HomePage.tsx` · `Footer.tsx` · `ContactPage.tsx`
**Bước:**
1. Entity `branches`: `id, name, isHeadOffice, address, province, district, phone, email, taxCode, openHours, mapEmbedUrl, lat, lng, image, sortOrder, isActive`.
2. API CRUD + public `GET /branches`.
3. Thay **showroom hardcode trong `HomePage.tsx`** và `Footer.tsx` bằng dữ liệu API (grid + hotline từng chi nhánh + Google Maps embed `mapEmbedUrl`).
4. `ContactPage`: select chọn chi nhánh → form gửi về đúng `Lead.branchId`; map đổi theo.
**DoD:** thêm chi nhánh trong CMS → footer + trang chủ + trang liên hệ cập nhật ngay; MST/email riêng từng chi nhánh hiển thị đúng.

### `[ ] P2.6` — Kênh hỗ trợ nổi + Hình thức thanh toán
**Files:** `src/components/website/FloatingActions.tsx` (mới) · `HomePage.tsx` · `Footer.tsx` · `CheckoutModal.tsx` · `SettingsView.tsx`
**Bước:**
1. `FloatingActions` (fixed góc phải, mobile-friendly): Zalo chat · Messenger · Gọi ngay · **Back-to-top** (hiện khi scroll > 400px) · nút xem giỏ hàng.
2. Số Zalo/Messenger/hotline lấy từ `settings` (thêm field `socials: { zalo, messenger, facebook, youtube, tiktok }`).
3. Khối **"Hình thức thanh toán"**: VietQR · COD · Chuyển khoản · Trả góp · Ví điện tử (icon + mô tả) — hiện footer chỉ có badge text.
4. `CheckoutModal`: render phương thức thanh toán từ `settings.paymentMethods` (P5.1 sẽ gắn cổng thật).
**DoD:** nút nổi không che nội dung trên mobile; cấu hình trong CMS đổi → public đổi theo; back-to-top hoạt động.

### `[ ] P2.7` — Thống kê truy cập (Đang trực tuyến / Tổng truy cập)
**Files:** `schema.ts` (singleton `visit_stats`) · types/db/routes/api · `server.ts` (middleware) · `Footer.tsx`
**Bước:**
1. Singleton `visit_stats`: `totalViews(int), todayViews(int), lastResetAt(datetime), onlineWindowSeconds(int)`.
2. Middleware đếm: bỏ qua `/api`, asset tĩnh, bot; tăng `totalViews`; giữ map session online trong RAM (TTL 5 phút) → trả `online` **không ghi DB mỗi request**.
3. API public `GET /stats/visits` → `{ online, total, today }`.
4. `Footer`: khối "Đang trực tuyến: N · Tổng truy cập: N" như site tham chiếu.
**DoD:** mở 2 tab ẩn danh → `online` ≥ 2; `total` không tăng loạn khi F5 (debounce theo session, không đếm mỗi request asset).

### `[x] P2.8` — Trang 404 + Breadcrumb chuẩn + Trang Tìm kiếm
**Phụ thuộc:** P0.1
**Files:** `src/components/website/NotFoundPage.tsx` (mới) · `SearchPage.tsx` (mới) · `src/components/common/Breadcrumb.tsx` (mới) · `src/utils/breadcrumb.ts` (mới) · `src/utils/search.ts` (mới) · `App.tsx` · `Navbar.tsx`
**Bước:**
1. `NotFoundPage`: 404 + gợi ý danh mục + ô tìm kiếm + nút về trang chủ.
2. `SearchPage` (`/tim-kiem?q=`): kết quả đầy đủ (sản phẩm + bài viết + dịch vụ), filter + phân trang; Navbar "Xem tất cả kết quả" trỏ về đây.
3. `Breadcrumb` dùng chung: gắn vào ProductDetail, Category, Brand, News detail, PriceList, Warranty, StaticPage + JSON-LD `BreadcrumbList` (liên kết P0.2).
**DoD:** URL sai → 404 đẹp (không màn hình trắng); `/tim-kiem?q=dell` trả kết quả đúng; breadcrumb có ở ≥ 6 trang.

**✅ Kết quả implement (thực tế khác kế hoạch ở đâu):**
- **`src/utils/breadcrumb.ts` (mới) là nguồn sự thật duy nhất**: `crumbTrail()` ghép dải (luôn tự chèn "Trang chủ"), `crumbJsonLd()` sinh `BreadcrumbList` **từ chính mảng đang hiển thị** (bỏ mắt `pending`) ⇒ UI ⇄ structured data **không thể lệch** (điểm trước P2.8 hay sai: mỗi trang tự dựng mảng JSON-LD riêng). Mắt chờ dữ liệu dùng `pendingCrumb()` / `missingCrumb()` (chữ nghiêng, **không** phải link chết, không vào JSON-LD); `crumbLabel()` cắt nhãn dài cho mobile; hằng `*_CRUMB` (`PRODUCTS/SERVICES/NEWS/PRICE_LIST/WARRANTY/ABOUT/CONTACT`) dùng chung giữa các trang.
- **`<Breadcrumb>` (mới, `src/components/common/Breadcrumb.tsx`)** với 3 biến thể `plain` / `header` / `pill` (đúng 3 kiểu đang tồn tại trong codebase) + `aria-label="Breadcrumb"` và `aria-current="page"` cho mắt cuối. **13 trang** dùng component này: ProductDetail · Products · CatalogListing (danh mục/hãng, `pill`) · News (2 nhánh chi tiết/danh sách) · PriceList · Warranty · Static · Services · Search · WebDesign · AttendanceSoftware · About · Contact. Sau migration, `breadcrumbJsonLd` trong `src/` chỉ còn **1 định nghĩa** (`seo.ts`) + **1 wrapper** (`breadcrumb.ts`) — mọi trang đều đi qua `crumbJsonLd` (không trang nào tự dựng mảng JSON-LD riêng).
- **404**: `NotFoundPage` (`robots: noindex,follow`, **không** canonical) dùng chung cho (a) URL không khớp route nào — `parsePath()` trả `page: 'not-found'` thay vì rơi về trang chủ như trước, và (b) **slug sai** ở ProductDetail/News/StaticPage (`/san-pham/khong-ton-tai`, `/tin-tuc/<slug-sai>`, `/trang/<slug-sai>`) ⇒ khách không còn "lạc" trong trang chủ và Google không index URL rác thành bản sao `/`. Trang có ô tìm kiếm + gợi ý danh mục + nút về trang chủ.
- **Tìm kiếm toàn site**: `src/utils/search.ts` (mới) — `normalizeKeyword` (bỏ dấu câu/khoảng trắng thừa, giới hạn `SEARCH_MAX_LENGTH = 80`), `isSearchableKeyword` (`SEARCH_MIN_LENGTH = 2`), `parseSearchTab/Sort/Page` **chuẩn hoá giá trị rác trong URL về mặc định** (URL là nguồn sự thật), `searchPath()` / `searchTabPath()` sinh URL sạch (`/tim-kiem?q=...&tab=...&sort=...`, không sinh param mặc định, giữ nguyên tiếng Việt có dấu), `matchProduct/Post/Service` + `highlightSegments` (tô đậm từ khóa theo `searchKey`) + `paginateLocal` (`SEARCH_PAGE_SIZE = 12`). `SearchPage` có 4 tab (`Tất cả / Sản phẩm / Bài viết / Dịch vụ` — `?tab=`), sắp xếp (`?sort=`), phân trang (`?page=`) và gợi ý `SEARCH_SUGGESTIONS`.
- **`seo.ts`**: `websiteJsonLd()` đổi `SearchAction.target` sang `${absoluteUrl(ROUTES.search)}?q={search_term_string}` ⇒ searchbox sitelinks của Google trỏ đúng trang kết quả thật (trước P2.8 trỏ về `/san-pham?q=`).
- **Kiểm chứng:** `npm run lint` (tsc `--noEmit`) pass · **22/22 script test đều xanh** (`package.json` có đúng 22 script `test:*`), trong đó **`tests/search.smoke.ts`** (88 assertion: URL/parse/match/highlight/paginate + parity breadcrumb UI⇄JSON-LD), **`tests/searchUi.smoke.tsx`** (27 assertion: SSR SearchPage rỗng + có từ khóa + NotFoundPage + 3 biến thể Breadcrumb + form tìm kiếm ở Navbar), **`tests/routes.smoke.tsx`** nay **22/22 URL PASS** (bổ sung `/gioi-thieu`, `/lien-he`, `/thiet-ke-website`, `/tim-kiem`, `/tim-kiem?q=`, `/phan-mem-cham-cong?tab=nhan-su`, URL 404 kèm `absent` chứng minh **không** rơi về trang chủ) + **bất biến "mỗi trang chỉ 1 dải breadcrumb"** (đếm `aria-label="Breadcrumb"` trong HTML SSR).

### `[ ] P2.9` — Nội dung Chính sách / FAQ thật
**Files:** seed trong `server/db.ts` · `src/components/website/StaticPageView.tsx` · `Footer.tsx`
**Bước:**
1. Seed `pages` đầy đủ: `chinh-sach-bao-hanh`, `chinh-sach-doi-tra`, `chinh-sach-van-chuyen`, `chinh-sach-thanh-toan`, `chinh-sach-bao-mat`, `dieu-khoan-su-dung`, `cau-hoi-thuong-gap`.
2. `StaticPageView`: thêm mục lục bên phải + anchor heading + `FAQPage` JSON-LD khi slug là FAQ.
3. `Footer`: cột "Chính sách" trỏ tới các trang này.
**DoD:** 7 trang mở được, không còn nội dung placeholder; mục lục điều hướng đúng.

### `[x] P2.10` — Ẩn lối vào CMS: chỉ vào được bằng URL `/login-admin`
**Phụ thuộc:** P0.1 (URL thật) · P2.8 (`parsePath().matched`)
**Files:** `src/utils/url.ts` (`ROUTES.adminLogin` · `pathFor` · `parsePath`) · `src/types/index.ts` + `src/context/AppContext.tsx` (union `WebsitePage` · `setViewMode()` · effect vào CMS) · `src/App.tsx` (render `LoginView` ở route riêng) · `src/components/common/TopUtilityBar.tsx` (thay `ModeSwitcherBar.tsx` đã xoá) · `src/components/cms/LoginView.tsx` · `server/robots.ts` (mới) · `server.ts` · `tests/adminLogin.smoke.tsx` (mới) + `tests/routes.smoke.tsx`
**Bước:**
1. Bỏ 2 nút "Giao diện Website" / "Quản trị CMS" (và badge tài khoản đang đăng nhập) khỏi thanh trên cùng ⇒ `ModeSwitcherBar` → `TopUtilityBar`, chỉ còn hotline + tra cứu đơn.
2. Thêm route ẩn `/login-admin`: `parsePath` trả `{ page: 'admin-login', matched: true }`; `App` render `LoginView` **không** Navbar/Footer/thanh tiện ích.
3. `AppContext`: `viewMode` mặc định `'website'` và **không** đọc từ URL; `login()` thành công ⇒ `'cms'`; đã có phiên + mở `/login-admin` ⇒ vào thẳng CMS (F5 giữ nguyên); rời CMS/đăng xuất khi URL vẫn `/login-admin` ⇒ `navigate(ROUTES.home)`.
4. `LoginView`: xoá khối "Tài khoản demo: `admin / admin123`" + placeholder trung tính.
5. `server/robots.ts` (mới, hàm thuần): luôn có `Disallow: /login-admin` + `Sitemap` theo `APP_URL`; `server.ts` gọi `buildRobotsTxt()`; `sitemap.xml` không có cửa vào CMS.
**DoD:** `/` luôn là giao diện website (không nút/link nào vào CMS); `/login-admin` ⇒ form đăng nhập (không lộ tài khoản mẫu) → đăng nhập ⇒ CMS; F5 trong CMS vẫn ở CMS; `robots.txt` có `Disallow: /login-admin`.

**✅ Kết quả implement (27/09/2026):**
- **`ROUTES.adminLogin` là nguồn sự thật duy nhất của cửa vào** — dùng ở `parsePath`/`pathFor` (frontend), `App.tsx` (render) và `server/robots.ts` (chặn crawl). Mọi URL "gần giống" (`/admin`, `/login_admin`, `/loginadmin`, `/quantri`, `/cms`) **vẫn** rơi vào 404 của P2.8 (không có cơ chế dò/đoán URL), còn `/login-admin` (kèm `?query` / `#hash` / dấu `/` cuối) parse ra đúng trang với `matched: true`.
- **Mặc định luôn là website:** `viewMode` khởi tạo `'website'` và **không** suy ra từ URL ⇒ mở `http://<domain>/` không bao giờ vào CMS; `CmsLayout` vẫn tự render `LoginView` khi mất phiên (giữ nguyên luồng cũ). Vì URL là nguồn sự thật của trang đang xem, `setViewMode('website')` (bấm "Xem website" trong CMS / đăng xuất) **kèm điều hướng về trang chủ** khi URL còn `/login-admin` — nếu không, `App` sẽ render lại form đăng nhập. Phép kiểm tra URL được **hoãn 1 microtask** (không đọc ngay trong `setViewMode`) vì `PagesView.handlePreviewOnWebsite()` gọi `navigateToPage(slug)` rồi `setViewMode('website')` liền nhau — đọc ngay sẽ thấy URL `/login-admin` **cũ** và ghi đè mất URL trang xem trước; dùng `navigate(..., { replace: true })` nên nút Back cũng không quay lại cửa vào CMS.
- **Bất biến chống hồi quy (test chốt, không chỉ là code review):** HTML SSR của 7 trang công khai (`/`, `/san-pham`, `/lien-he`, `/dich-vu`, `/bao-hanh`, `/thiet-ke-website`, `/tim-kiem?q=`) **không** chứa chuỗi `/login-admin` và không còn nhãn "Quản trị CMS"/"Giao diện Website" ⇒ sau này ai thêm link "Đăng nhập" vào Navbar/Footer, `npm run test:admin-login` sẽ đỏ ngay.
- **Form đăng nhập không còn lộ thông tin:** bỏ hẳn khối `Tài khoản demo: admin / admin123`; placeholder ô tài khoản đổi từ `admin` ⇒ "Tên đăng nhập hoặc email". Trang `/login-admin` còn có màn hình chờ "Đang kiểm tra phiên đăng nhập..." trong lúc `authLoading` (SSR và lần render đầu ở browser) ⇒ F5 trong CMS **không nháy** form đăng nhập rồi mới vào CMS.
- **`TopUtilityBar`** (thay `ModeSwitcherBar`): chỉ còn hotline + "Tra cứu tình trạng đơn hàng"; bỏ luôn badge tài khoản đang đăng nhập. Thanh này **không** render ở `/login-admin` để trang đăng nhập đứng riêng hoàn toàn.
- **SEO/crawl:** `App` ghi `robots: 'noindex,nofollow'` + **bỏ canonical** cho **cả** CMS **và** `/login-admin` (trước P2.10 chỉ CMS); title riêng "Đăng Nhập Quản Trị — GPSOFT Store & Enterprise". `server/robots.ts` đặt nhóm `User-agent: *` + `Disallow: /login-admin` **đầu tệp** (không phụ thuộc nhóm `User-agent` cuối cùng mà admin nhập ở CMS), không thêm trùng nếu admin đã tự thêm dòng đó, không thêm `Sitemap` lần 2, và giữ nguyên phần nội dung admin nhập. `server.ts` không còn ghép chuỗi `robots.txt` tại chỗ.
- **Kiểm chứng:** `npm run lint` **0 lỗi** · **`npm run test:admin-login` (mới) 23/23 PASS** · `npm run test:routes` **23/23 case URL PASS** (bổ sung case `/login-admin` — kiểm luôn không có Navbar/hotline/nút CMS) · **23/23 script `test:*` đều xanh** · `npm run build` OK.
- ⚠️ **Còn sót ngoài phạm vi:** `tests/tmp-p14-e2e.mjs` (script E2E tạm thời của P1.4) vẫn nằm trong repo — nên xoá trong lượt dọn dẹp, hiện không nằm trong script `test:*` nào nên không ảnh hưởng.

---

# PHASE 3 — Khách hàng & Marketing

### `[ ] P3.1` — Tài khoản khách hàng (auth riêng cho website)
**Files:** `schema.ts` (mở rộng `customers`) · `server/auth.ts` · `server/routes.ts` · `src/components/website/CustomerAuthPage.tsx` (mới) · `AppContext.tsx` · `App.tsx` · `Navbar.tsx`
**Bước:**
1. Mở rộng `Customer`: `passwordHash?, isActive, verifiedAt?, lastLoginAt?` + child table `customer_addresses`.
2. Endpoint: `POST /customer-auth/register`, `POST /customer-auth/login`, `GET /customer-auth/me`, `PUT /customer-auth/profile`, `PUT /customer-auth/password`.
3. ⚠️ **Tách phiên khách hàng khỏi phiên CMS**: thêm claim `scope: 'customer'`; trong `authGuard` **chặn** token `scope=customer` gọi API CMS (và ngược lại `authGuard` không dùng cho `/customer-auth/*`).
4. `CustomerAuthPage`: 2 tab Đăng nhập / Đăng ký + quên mật khẩu (gửi link qua P3.4); redirect về trang trước đó.
5. `AppContext`: `customerToken` (localStorage) + `customer`; `Navbar` hiện tên khách + dropdown tài khoản.
**DoD:** đăng ký → đăng nhập → `GET /customer-auth/me` OK; token khách gọi `GET /api/warranties` → **403**; tài khoản trùng SĐT → báo lỗi rõ ràng.

### `[ ] P3.2` — Trang tài khoản: đơn hàng · sổ địa chỉ · bảo hành của tôi
**Phụ thuộc:** P3.1
**Files:** `src/components/website/CustomerAccountPage.tsx` (mới) · `CheckoutModal.tsx` · routes `GET /customer-auth/orders`, `PUT /orders/:id/cancel`
**Bước:**
1. 4 tab: `Đơn hàng của tôi` (danh sách + chi tiết + timeline + nút Huỷ đơn khi `status=pending`) · `Sổ địa chỉ` (thêm/sửa/xoá, đặt mặc định) · `Bảo hành của tôi` (gọi `lookupWarranty` theo SĐT tài khoản) · `Thông tin cá nhân`.
2. `GET /customer-auth/orders`: **chỉ trả đơn của chính khách** (lọc theo `customerId`/SĐT trong token).
3. `CheckoutModal`: đã đăng nhập → điền sẵn thông tin + chọn từ sổ địa chỉ; lưu `customerId` vào order.
**DoD:** khách A không xem được đơn của khách B (test 2 tài khoản); huỷ đơn → `status=cancelled`.

### `[ ] P3.3` — Wishlist + Sản phẩm đã xem gần đây
**Files:** `src/components/website/WishlistDrawer.tsx` (mới) · `RecentlyViewed.tsx` (mới) · `AppContext.tsx` · `ProductCard.tsx` · `ProductDetailPage.tsx` · child table `customer_wishlist`
**Bước:**
1. Guest: `localStorage` (`wishlist`, `recentlyViewed` tối đa 12). Đã đăng nhập: đồng bộ server + **merge khi login**.
2. Trái tim trên `ProductCard` + nút "Yêu thích" ở trang chi tiết (toggle).
3. Khối "Sản phẩm đã xem" ở Home + ProductDetail; trang `/yeu-thich` trong `CustomerAccountPage`.
4. Icon wishlist + badge số lượng trên Navbar.
**DoD:** thêm yêu thích khi chưa login → login → danh sách merge đúng; F5 không mất dữ liệu.

### `[ ] P3.4` — Email SMTP + Mẫu email + Log gửi
**Files:** `nodemailer` (+types) · `server/mailer.ts` (mới) · `schema.ts` (`email_templates`, `email_logs`) · types/db/routes/api · `src/components/cms/EmailView.tsx` (mới) · `CmsLayout.tsx` · `SettingsView.tsx`
**Bước:**
1. `.env`: `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE`.
2. `server/mailer.ts`: `sendMail({to, subject, html})` + `renderTemplate(id, vars)` (thay `{{customerName}}`, `{{orderCode}}`…); bọc try/catch **không làm hỏng luồng chính**; ghi `email_logs` (status sent/failed + error).
3. Seed templates: `order-confirmation`, `order-status-changed`, `quote-sent`, `lead-auto-reply`, `warranty-status`, `newsletter-welcome`.
4. Gọi mail trong `POST /orders`, `PUT /orders/:id` (đổi trạng thái), `POST /price-quotes`, `POST /leads`, đổi trạng thái warranty; thêm `POST /newsletter/broadcast` (gửi theo lô 50).
5. CMS `EmailView`: sub-tab `Mẫu email` (sửa HTML + preview + danh sách biến) · `Lịch sử gửi` (filter status/ngày) + nút "Gửi thử". `SettingsView` thêm tab `Email/SMTP` + "Test kết nối".
**DoD:** đặt hàng test → nhận mail xác nhận; cấu hình SMTP sai → **đơn vẫn tạo thành công**, log ghi `failed`.

### `[ ] P3.5` — CMS: Duyệt & Trả lời đánh giá (`ReviewsView.tsx`)
**Files:** `src/components/cms/ReviewsView.tsx` (mới) · `CmsLayout.tsx` · `server/routes.ts` · `server/auth.ts` · `src/services/api.ts`
**Bước:**
1. Entity `product_reviews` (`schema.ts:276`) đã có nhưng **thiếu field duyệt** → thêm `status` (`pending|approved|hidden`) + `adminReply` đã có sẵn (`schema.ts:292-294`).
2. API mới: `PUT /reviews/:id` (duyệt/ẩn) · `POST /reviews/:id/reply` (lưu `adminReply` + gửi mail P3.4) · `GET /reviews?status=&productId=`.
3. `auth.ts`: thêm segment `reviews` vào `requiredPermission()` (resource `products`) — hiện `/reviews/*` rơi vào `default: 'export'` nên **chỉ admin `all` dùng được**.
4. `ReviewsView`: sub-tab `Chờ duyệt` · `Đã duyệt` · `Đã ẩn` + filter theo sản phẩm/số sao; hiển thị ảnh/rating/tag; action Duyệt·Ẩn·Trả lời·Xoá.
5. Public: `GET /products/:id/reviews` chỉ trả `status=approved`; form gửi review mới → `pending`.
**DoD:** review mới gửi từ website không hiện ngay; duyệt trong CMS → hiện trên sản phẩm; trả lời admin hiển thị dưới review.

### `[ ] P3.6` — Tin tức nâng cao: Danh mục bài viết · Tag · Bình luận
**Files:** `src/components/cms/NewsView.tsx` · `schema.ts` (`post_comments`) · routes/api · `src/components/website/NewsPage.tsx`
**Bước:**
1. Thêm sub-tab vào `NewsView`: `Bài viết` (hiện có) · `Danh mục bài viết` (**API `post-categories` đã có nhưng chưa có UI** — `api.ts:299-320`) · `Tag` · `Bình luận`.
2. Entity `post_comments`: `id, postId, name, email, content, status(pending|approved|spam), createdAt, parentId?`.
3. API: `GET /posts/:id/comments` (public, chỉ approved) + `POST` (public, mặc định pending) + `PUT /:id` (duyệt) + `DELETE /:id`.
4. `NewsPage`: form bình luận + hiển thị danh sách; ô "Bài viết liên quan" theo tag.
**DoD:** gửi bình luận → chờ duyệt; duyệt ở CMS → hiện dưới bài; danh mục bài viết CRUD được và ảnh hưởng filter trang tin.

### `[ ] P3.7` — Popup khuyến mãi + Cookie consent + Giỏ hàng bỏ dở
**Files:** `schema.ts` (`popups`, `abandoned_carts`) · routes/api · `src/components/website/PromoPopup.tsx` (mới) · `CookieConsent.tsx` (mới) · `src/components/cms/PopupsView.tsx` (mới) · `CmsLayout.tsx` · `AppContext.tsx` (lưu giỏ theo session)
**Bước:**
1. Entity `popups`: `id, title, image, content, ctaText, ctaUrl, delaySeconds, showOncePerSession, startAt, endAt, isActive, position`.
2. `PromoPopup`: hiện sau `delaySeconds`, lưu `localStorage` để không spam lại; có nút đóng rõ ràng.
3. `CookieConsent`: banner đồng ý cookie (lưu lựa chọn); chỉ load script GA4/Pixel (P6.4) sau khi đồng ý.
4. Entity `abandoned_carts`: lưu giỏ theo `sessionId`/SĐT khi checkout bỏ dở; CMS tab `Giỏ hàng bỏ dở` + nút "Gửi mail nhắc" (dùng P3.4).
**DoD:** đóng popup → F5 không hiện lại trong session; giỏ bỏ dở xuất hiện trong CMS kèm link sản phẩm.

---

# PHASE 4 — Kho & Vận hành

### `[ ] P4.1` — Nhà cung cấp (`suppliers`)
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/SuppliersView.tsx` (mới) · `CmsLayout.tsx` · `ProductsView.tsx` (chọn NCC)
**Bước:**
1. Entity `suppliers`: `id, code, name, contactName, phone, email, address, taxCode, note, isActive, createdAt`.
2. CRUD + `GET /suppliers`.
3. `ProductsView`: thêm field chọn `supplierId` (form sản phẩm) để phục vụ nhập kho.
**DoD:** CRUD nhà cung cấp hoạt động; form sản phẩm lưu được `supplierId`.

### `[ ] P4.2` — Kho & Nhập/Xuất kho (`warehouses`, `stock_movements`, phiếu nhập/xuất)
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/InventoryView.tsx` (mới) · `CmsLayout.tsx` · `ProductsView.tsx`
**Bước:**
1. Entities:
   - `warehouses`: `id, name, code, address, branchId?, manager, isActive`
   - `stock_imports`: `id, code, warehouseId, supplierId, note, status(draft|confirmed|cancelled), total, createdBy, createdAt` + child `stock_import_items` (`productId, sku, name, qty, unitCost, total`)
   - `stock_exports`: tương tự + `reason(sale|transfer|damage|warranty)` + `orderId?`
   - `stock_movements`: `id, productId, variantId?, warehouseId, type(in|out|adjust), qty, beforeQty, afterQty, refType, refId, note, createdAt` (**sổ cái kho — không sửa, không xoá**)
2. Logic: xác nhận phiếu nhập/xuất → cập nhật `movements` + `product.stock`; **không cho** xuất vượt tồn (trả lỗi rõ ràng).
3. CMS `InventoryView`: sub-tab `Tồn kho` · `Phiếu nhập` · `Phiếu xuất` · `Thẻ kho (movements)`.
**DoD:** nhập 10 → tồn +10; xuất 5 → tồn -5 và có 2 dòng movements; xuất 999 → **bị chặn**; tổng movements khớp tồn.

### `[ ] P4.3` — Tồn kho theo chi nhánh + Cảnh báo tồn thấp
**Files:** `schema.ts` (child `product_stock_by_warehouse`) · routes/api · `InventoryView.tsx` · `DashboardView.tsx` · `ProductsView.tsx`
**Bước:**
1. Thêm `lowStockThreshold` (int) vào `products` và bảng tồn theo kho.
2. `InventoryView` sub-tab `Tồn theo kho` (ma trận sản phẩm × kho) + filter `sắp hết`.
3. `DashboardView`: thẻ "Sản phẩm sắp hết hàng" (tồn ≤ ngưỡng) + link tới Inventory.
4. Cảnh báo trên `ProductsView`: badge đỏ khi tồn thấp.
**DoD:** đặt ngưỡng 5 → sản phẩm tồn 3 hiện cảnh báo ở Dashboard + Products.

### `[ ] P4.4` — Đơn hàng nâng cao: lịch sử trạng thái · vận đơn · trả hàng · in phiếu giao
**Files:** `schema.ts` (child `order_status_history`, `order_returns`) · routes/api · `src/components/cms/OrdersView.tsx` · `src/components/website/OrderTrackingModal.tsx`
**Bước:**
1. Child `order_status_history`: `status, note, changedBy, createdAt` — ghi tự động mỗi lần `PUT /orders/:id`; `POST /orders` ghi dòng đầu `pending`.
2. Thêm field order: `trackingCode`, `shippingCarrier`, `shippedAt`, `deliveredAt`, `cancelReason`, `refundAmount`, `refundStatus`.
3. `OrdersView`: banner sub-tab `Tất cả | Chờ xử lý | Đang giao | Hoàn tất | Đã huỷ | Trả hàng`; modal chi tiết có **timeline lịch sử** + form thêm ghi chú; nút **In phiếu giao hàng** (`window.print()`).
4. Entity `order_returns` (yêu cầu đổi/trả): `id, orderId, reason, note, images[], status(pending|approved|rejected|refunded), refundAmount, createdAt`.
5. `OrderTrackingModal` (public): hiển thị timeline đầy đủ + mã vận đơn.
**DoD:** đổi trạng thái đơn 2 lần → timeline có 3 dòng đúng thứ tự; tạo yêu cầu trả hàng → hiện trong sub-tab `Trả hàng`; in phiếu giao ra đúng 1 trang.

### `[ ] P4.5` — Báo cáo & Thống kê + xuất Excel
**Files:** `server/routes.ts` (`/reports/*`) · `src/services/api.ts` · `src/components/cms/ReportsView.tsx` (mới) · `CmsLayout.tsx` · `DashboardView.tsx`
**Bước:**
1. API: `GET /reports/revenue?from=&to=&groupBy=day|month` · `/reports/top-products` · `/reports/inventory-value` · `/reports/customers` · `/reports/leads-funnel` (mỗi cái có `?format=xlsx|csv`).
2. `ReportsView`: sub-tab `Doanh thu` (bảng + chart SVG/canvas thuần, **không thêm lib chart**) · `Sản phẩm bán chạy` · `Tồn kho` · `Khách hàng` · `Leads`.
3. Filter khoảng ngày dùng chung + nút Export.
4. Bổ sung phân trang cho list lớn trong `ProductsView`/`OrdersView`/`LeadsView` (dùng `meta` của P0.4).
**DoD:** chọn 30 ngày → số liệu khớp tổng `orders` trong DB (đối chiếu tay 1-2 dòng); export mở được bằng Excel; list 50 dòng/trang.

### `[ ] P4.6` — Nhật ký hoạt động (`activity_logs`)
**Files:** `schema.ts` · types/db/routes/api · `src/components/cms/ActivityLogView.tsx` (mới) · `CmsLayout.tsx`
**Bước:**
1. Entity `activity_logs`: `id, actorId, actorName, action(create|update|delete|login|logout|login_failed), resource, resourceId, summary, ip, userAgent, createdAt`.
2. Helper `server/audit.ts` → `logActivity(req, action, resource, resourceId, summary)`; gọi trong các route ghi (POST/PUT/DELETE) của: products, orders, users, roles, settings, price-quotes, warranties, coupons.
3. `ActivityLogView`: bảng + filter theo actor/action/resource/ngày + tìm kiếm; chỉ `admin` xem được (`auth.ts`: resource `users` hoặc thêm `logs`).
**DoD:** sửa 1 sản phẩm → log có dòng tương ứng kèm `actorName` + IP; filter theo ngày đúng.

### `[ ] P4.7` — Trung tâm thông báo (Bell) trong CMS
**Files:** `schema.ts` (`notifications`) · routes/api · `src/components/cms/NotificationsView.tsx` (mới) · `CmsLayout.tsx:39` (icon `Bell` **đã import nhưng chưa dùng**) · `AppContext.tsx`
**Bước:**
1. Entity `notifications`: `id, type(order|lead|review|warranty|stock|system), title, message, link, isRead, targetRole, createdAt`.
2. Sinh thông báo tự động: đơn mới, lead mới, review chờ duyệt, phiếu bảo hành mới, tồn kho ≤ ngưỡng.
3. `CmsLayout`: badge số chưa đọc + dropdown 10 thông báo mới nhất + nút "Đánh dấu đã đọc"; polling 60s (không dùng websocket để giữ đơn giản).
**DoD:** tạo đơn từ website → badge tăng trong ≤ 60s; click thông báo → mở đúng đơn và đánh dấu đã đọc.

### `[ ] P4.8` — Vai trò & Ma trận quyền (Roles CRUD UI)
**Files:** `src/components/cms/UsersView.tsx` · `src/components/cms/RolesView.tsx` (mới) · `CmsLayout.tsx` · `src/services/api.ts`
**Bước:**
1. ⚠️ API `createRole/updateRole/deleteRole` **đã có** (`api.ts:507-521`, `routes.ts:891-908`) nhưng **chưa có UI** — `UsersView.tsx:267` chỉ hiển thị card read-only.
2. `RolesView`: bảng role + modal tạo/sửa với **ma trận checkbox quyền** theo nhóm resource (`products, orders, customers, leads, content, quotes, warranty, inventory, settings, users, dashboard` × `view/create/edit/delete`), nút "Chọn tất cả nhóm".
3. `UsersView`: cho phép gán `role` + `permissions` tuỳ chỉnh; cảnh báo khi chọn quyền `all`.
4. ⚠️ Khi đổi quyền → người dùng đang đăng nhập vẫn giữ token cũ tới khi hết hạn (7 ngày): ghi chú rõ trong UI, hoặc thêm `POST /auth/refresh`.
**DoD:** tạo role `Kế toán` với `orders.view` + `quotes.*` → user role đó **không** mở được menu Sản phẩm (ẩn menu + API trả 403).

### `[ ] P4.9` — Sao lưu / Phục hồi / Chế độ bảo trì
**Files:** `server/routes.ts` · `src/components/cms/MaintenanceView.tsx` (mới) · `CmsLayout.tsx` · `server.ts` · `SettingsView.tsx`
**Bước:**
1. `GET /system/backup` → trả JSON toàn bộ `DatabaseSchema` (đổi tên file theo timestamp); `POST /system/restore` (upload JSON, có xác nhận 2 bước, tự backup trước khi ghi).
2. `POST /system/maintenance` bật/tắt `settings.maintenanceMode` + `maintenanceMessage`.
3. `server.ts`: khi bật maintenance → mọi request public trả trang thông báo (trừ `/api/auth/login` và IP admin).
**DoD:** backup → restore lại → dữ liệu khớp; bật bảo trì → website trả thông báo, CMS vẫn vào được.

### `[ ] P4.10` — Nhập / Xuất Excel sản phẩm
**Files:** `xlsx` (cài mới) · `server/routes.ts` (`POST /products/import`, `GET /products/export.xlsx`, `GET /products/import-template.xlsx`) · `src/components/cms/ProductsView.tsx`
**Bước:**
1. `GET /products/import-template.xlsx`: file mẫu header cố định — `SKU*, Tên*, Danh mục, Thương hiệu, Giá gốc, Giá bán, Tồn, Tình trạng, Ảnh, Mô tả ngắn, Trạng thái, SEO Title, SEO Desc`.
2. `POST /products/import` (multer, `.xlsx` ≤ 5MB): parse → validate từng dòng → trả `{success, inserted, updated, errors:[{row, field, message}]}`; **all-or-nothing** (có lỗi ⇒ không ghi gì) + cho tải file lỗi dạng CSV.
3. `GET /products/export.xlsx`: xuất toàn bộ hoặc theo filter hiện tại.
4. UI: nút `Nhập Excel` (modal kéo-thả + tải file mẫu) và `Xuất Excel` trong `ProductsView`.
**DoD:** export → sửa 2 dòng → import lại → cập nhật đúng theo `SKU`; file có 1 dòng lỗi → **không dòng nào bị ghi**, báo đúng số dòng lỗi.

### `[ ] P4.11` — Sản phẩm nâng cao: nhân bản · Tag · Thuộc tính · SEO hàng loạt
**Files:** `ProductsView.tsx` · `src/components/cms/AttributeTemplatesView.tsx` (mới) · `CategoriesBrandsView.tsx` · `routes.ts` · `schema.ts` (`product_tags`)
**Bước:**
1. `POST /products/:id/duplicate` → copy đủ specs/variants/attributes/gallery với SKU `-copy`; nút "Nhân bản" trên dòng.
2. Chọn nhiều dòng → action hàng loạt: đổi trạng thái · đổi danh mục/thương hiệu · xoá · gán tag.
3. `product_tags` (child) + filter theo tag ở website.
4. Template thuộc tính dùng chung (VD "Laptop" có CPU/RAM/SSD) → chọn nhanh khi tạo sản phẩm.
5. `CategoriesBrandsView`: kéo-thả sắp xếp (`sortOrder`) + CRUD danh mục 2 cấp + **cảnh báo khi xoá danh mục còn sản phẩm**.
**DoD:** nhân bản sản phẩm có variant → bản copy giữ đủ variant/spec; bulk đổi danh mục 3 sản phẩm cùng lúc OK.

---

# PHASE 5 — Tích hợp bên thứ ba & Bảo mật

### `[ ] P5.1` — Cổng thanh toán online (VNPay / MoMo / ZaloPay) + VietQR
**Files:** `schema.ts` (`payment_methods`) · `server/payments/*.ts` (mới) · `server/routes.ts` · `SettingsView.tsx` · `CheckoutModal.tsx` · `OrderTrackingModal.tsx` · `.env`
**Bước:**
1. Entity `payment_methods`: `id, code(cod|bank_transfer|vnpay|momo|zalopay|qr), name, logo, isActive, isOnline, config(json), sortOrder`.
2. `server/payments/vnpay.ts` (chuẩn VNPAY 2.1.0): build URL có `vnp_SecureHash`; `GET /payments/vnpay/return` + `POST /payments/vnpay/ipn` **verify chữ ký** rồi cập nhật `order.paymentStatus`.
3. MoMo/ZaloPay: cùng interface `createPaymentUrl(order)` + `verifyCallback(query)`, làm lần lượt từng provider.
4. `CheckoutModal`: chọn phương thức (chỉ hiện `isActive`); online → redirect; `qr` → hiển thị ảnh VietQR (`bankCode + accountNumber + amount + orderCode`).
5. `OrderTrackingModal`: hiển thị `paymentStatus` (`unpaid|paid|refunded`) + nút "Thanh toán lại" cho đơn `unpaid`.
**DoD:** sandbox VNPAY: thanh toán → return → đơn tự `paid`; **chữ ký sai bị từ chối**; COD vẫn hoạt động như cũ.

### `[ ] P5.2` — Tích hợp API vận chuyển (GHN / GHTK / ViettelPost)
**Files:** `server/shipping/ghn.ts` (mới) · `routes.ts` · `OrdersView.tsx` · `SettingsView.tsx`
**Bước:**
1. `POST /shipping/quote` (tính phí theo địa chỉ + cân nặng) · `POST /orders/:id/shipment` (tạo vận đơn → lưu `trackingCode`) · `GET /orders/:id/tracking`.
2. `SettingsView`: tab `Vận chuyển` nhập token/shopId từng hãng + nút test kết nối.
3. `OrdersView`: nút "Tạo vận đơn" / "Xem hành trình" khi trạng thái `confirmed`.
**DoD:** tạo vận đơn sandbox → có `trackingCode`; lỗi API hãng → báo lỗi rõ ràng, **không làm hỏng** đơn hàng.

### `[ ] P5.3` — Cloudinary thật + Tối ưu ảnh
**Files:** `routes.ts` (`/media/upload`) · `FileManagerView.tsx` · `server.ts` · `.env`
**Bước:**
1. ⚠️ Hiện form Cloudinary trong `FileManagerView.tsx` **chỉ là UI giả** (`showToast`, không upload) → thay bằng: nếu có `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` thì upload thật qua `upload_stream`, ngược lại fallback lưu local như hiện tại.
2. `media_files`: thêm `provider, publicId, width, height, bytes, folder`.
3. `FileManagerView`: tạo/xoá thư mục · tìm theo tên · chọn nhiều + xoá nhiều · hiển thị dung lượng · cảnh báo ảnh > 1MB.
4. Ảnh danh sách: `loading="lazy"` + thumbnail `w=400`.
**DoD:** upload 1 ảnh → trả URL Cloudinary và hiển thị được; không cấu hình Cloudinary → vẫn upload local OK.

### `[ ] P5.4` — Bảo mật & chống spam
**Files:** `express-rate-limit` (cài) · `server.ts` · `routes.ts` · `.env` · `ContactPage.tsx` · `CheckoutModal.tsx`
**Bước:**
1. Rate limit: `/auth/login` (5/15 phút/IP) · `/leads` · `/orders` · `POST /products/:id/reviews` · `/coupons/validate` (30/phút).
2. reCAPTCHA v3 (tuỳ chọn qua `RECAPTCHA_SECRET`; chưa cấu hình thì bỏ qua) cho form liên hệ + đặt hàng + đăng ký.
3. Hardening: security headers (`helmet` hoặc set tay), giới hạn `express.json({limit:'2mb'})` cho API public (**hiện đang 50mb cho mọi route**, `server.ts:12`), validate/sanitize input, chặn `..` khi tải file.
4. `.env.example`: `JWT_SECRET` mạnh + **cảnh báo log nếu production còn dùng secret dev**.
**DoD:** spam login 6 lần → 429; submit form 20 lần liên tục → bị chặn; response có `X-Content-Type-Options`, `X-Frame-Options`.

---

# PHASE 6 — Nâng cao & Kỹ thuật

### `[ ] P6.1` — Đa ngôn ngữ (VI/EN) + Đa tiền tệ
**Files:** `i18next`/`react-i18next` (cài) · `src/i18n/*` (mới) · `schema.ts` (`currencies`) · `SettingsView.tsx` · các Page
**Bước:**
1. Trích text ra `vi.json`/`en.json`, ưu tiên Navbar → Footer → Home → Products → Checkout.
2. Toggle ngôn ngữ trên Navbar + lưu lựa chọn; khi P0.1 xong thì thêm tiền tố `/en/...`.
3. Entity `currencies` (tỷ giá) + `formatVnd` hỗ trợ đa tiền tệ.
**DoD:** chuyển EN → 5 trang ưu tiên đổi hết; reload giữ nguyên ngôn ngữ; không còn chuỗi hardcode ở các trang đó.

### `[ ] P6.2` — Homepage blocks builder
**Files:** `schema.ts` (`home_blocks`) · `src/components/cms/HomeBlocksView.tsx` (mới) · `HomePage.tsx` · `CmsLayout.tsx`
**Bước:**
1. Entity `home_blocks`: `id, type(hero|featured|category_grid|flash_sale|banner|video|testimonial|brands|news|custom_html), title, config(json), sortOrder, isActive`.
2. Tách các khối trong `HomePage.tsx` thành component riêng rồi render **động theo `sortOrder`**.
3. CMS: kéo-thả sắp xếp + bật/tắt + cấu hình số lượng item mỗi khối.
**DoD:** tắt khối "Banner" trong CMS → trang chủ không còn khối đó; đổi thứ tự → hiển thị đúng.

### `[ ] P6.3` — Prerender/SSR để SEO thật
**Files:** `vite.config.ts` · `server.ts` · script `prerender` (mới)
**Bước:**
1. Prerender route tĩnh quan trọng (`/`, `/gioi-thieu`, `/lien-he`, `/bang-gia`) ra HTML lúc build, phục vụ từ `dist`.
2. Route động (`/san-pham/:slug`): phục vụ **HTML shell có meta lấy từ DB** rồi hydrate → bot đọc được title/description/canonical.
3. Kiểm tra bằng `curl` không chạy JS.
**DoD:** `curl http://localhost:3100/san-pham/<slug>` trả HTML có `<title>`/meta đúng (không rỗng).

### `[ ] P6.4` — Marketing & Tracking trong CMS
**Files:** `SettingsView.tsx` (tab `Marketing`) · `src/components/website/Analytics.tsx` (mới) · `SeoView.tsx` · `CookieConsent.tsx` (P3.7)
**Bước:**
1. Lưu `ga4Id, gtmId, facebookPixelId, tiktokPixelId, searchConsoleVerification` trong `settings`.
2. `Analytics.tsx`: chỉ inject script khi **có cấu hình** và user **đã đồng ý cookie**; thêm meta verify Search Console.
3. `SeoView`: thêm sub-tab `Theo dõi` — hiển thị cấu hình + **checklist SEO on-page** (trang thiếu meta, ảnh thiếu alt, sản phẩm thiếu mô tả, sản phẩm thiếu slug).
**DoD:** nhập GA4 ID → script xuất hiện trong HTML sau khi bấm "Đồng ý"; checklist liệt kê đúng trang/sản phẩm thiếu meta.

### `[ ] P6.5` — Khách hàng thân thiết & Nhiều mức giá
**Files:** `schema.ts` (`customer_groups`, `product_prices`) · routes/api · `CustomersView.tsx` · `ProductsView.tsx` · `CheckoutModal.tsx`
**Bước:**
1. `customer_groups` (Bán lẻ / Bán buôn / Đại lý / VIP) + gán khách vào nhóm + chiết khấu % mặc định.
2. `product_prices` (child của product): `groupId, price, minQty` → giá hiển thị theo nhóm khách đang đăng nhập.
3. Điểm tích luỹ: `Customer.points`, cộng điểm khi đơn `completed` theo `settings.pointsPerAmount`; dùng điểm trừ tiền khi checkout.
**DoD:** khách nhóm "Đại lý" thấy giá đại lý; đơn hoàn tất → điểm tăng đúng công thức; dùng điểm → tổng tiền giảm đúng.

### `[ ] P6.6` — Tối ưu tầng lưu trữ (trả nợ kỹ thuật)
**Files:** `server/database/store.ts` · `server/db.ts`
**Bước:**
1. ⚠️ Hiện `save()` = `store.replace(this.data)` (`db.ts:1661`) → **ghi lại toàn bộ DB** mỗi lần lưu 1 record. Thay bằng `upsert(collection, item)` / `remove(collection, id)` ở tầng store; `db.ts` chỉ gọi cho entity bị thay đổi.
2. Thêm index cho cột hay truy vấn: `products.sku`, `products.slug`, `orders.code`, `customers.phone`, `warranties.phone`, `warranties.serial_number`.
3. Đo lại thời gian ghi với dữ liệu lớn (5.000 sản phẩm + 50.000 orders).
**DoD:** sửa 1 sản phẩm → log SQL chỉ có **1 câu UPDATE** (không ghi toàn bộ bảng); thời gian lưu < 50ms.

### `[ ] P6.7` — Test tự động (smoke test API)
**Files:** `package.json` (`npm run test:api`) · `tests/api.smoke.mjs` (mới)
**Bước:**
1. Script khởi động server với `SQLITE_FILE=data/test.sqlite` (DB tạm) → chạy tuần tự: login admin → CRUD products/orders/warranties/coupons → lookup public → assert status + shape → dừng server.
2. Thêm vào quy trình trước khi release.
**DoD:** `npm run test:api` chạy xanh trên máy sạch; nếu cố tình đổi shape API → test **đỏ** (bắt được regression).

---

# PHỤ LỤC

## A. Tổng số task theo phase

| Phase | Nội dung | Số task | Ưu tiên |
|---|---|---|---|
| P0 | Nền tảng: routing, SEO, utils, phân trang | 4 | 🔴 Bắt buộc làm trước |
| P1 | Bảo hành · Báo giá · Link báo giá · Coupon · Ship · Campaign | 9 | 🔴 Cao (khớp site tham chiếu) |
| P2 | Danh mục 2 cấp · Chấm công · Thiết kế web · Video · Chi nhánh · Kênh hỗ trợ · Thống kê · 404 · Chính sách | 9 | 🔴 Cao |
| P3 | Tài khoản KH · Wishlist · Email · Duyệt review · Tin tức · Popup | 7 | 🟠 Trung bình-cao |
| P4 | Nhà cung cấp · Kho · Đơn hàng nâng cao · Báo cáo · Log · Thông báo · Roles · Backup · Excel · Sản phẩm nâng cao | 11 | 🟠 Trung bình |
| P5 | Thanh toán · Vận chuyển · Cloudinary · Bảo mật | 4 | 🟠 Trung bình |
| P6 | i18n · Home blocks · Prerender · Tracking · Loyalty · Storage · Test | 7 | 🟡 Nice-to-have |
| | **TỔNG** | **51** | |

## B. Thứ tự thực hiện đề xuất (1 task ≈ 1 buổi implement)

```
Sprint 1  (nền tảng)       : P0.1 → P0.3 → P0.2 → P0.4
Sprint 2  (bảo hành)       : P1.1 → P1.2 → P1.3
Sprint 3  (báo giá)        : P1.4 → P1.5 → P1.6
Sprint 4  (thương mại)     : P1.7 → P1.8 → P1.9   ✅ ĐÃ XONG (xem evidence ở P1.7 · P1.8 · P1.9)
Sprint 5  (module ngành A) : P2.1 → P2.2 → P2.3   ✅ ĐÃ XONG (xem evidence ở P2.1 · P2.2 · P2.3)
Sprint 6  (module ngành B) : P2.4 → P2.5 → P2.6   ⬅️ ĐANG Ở ĐÂY (task kế tiếp: P2.4)
Sprint 7  (hoàn thiện web) : P2.7 → P2.8 → P2.9
Sprint 8  (kho & đơn hàng) : P4.1 → P4.2 → P4.3 → P4.4
Sprint 9  (email/content)  : P3.4 → P3.5 → P3.6
Sprint 10 (khách hàng)     : P3.1 → P3.2 → P3.3
Sprint 11 (vận hành)       : P4.5 → P4.6 → P4.7
Sprint 12 (quản trị)       : P4.8 → P4.9 → P3.7
Sprint 13 (tích hợp)       : P5.4 → P5.3 → P5.1 → P5.2
Sprint 14 (kỹ thuật)       : P6.6 → P6.7 → P4.10 → P4.11 → P6.3
Sprint 15 (mở rộng)        : P6.4 → P6.2 → P6.5 → P6.1
```

**Mốc bàn giao gợi ý**
- **Sau Sprint 7** → website đã **ngang chức năng với vitinhgiaphuc.com** (đủ 10 mục menu: Bảo hành, Thiết kế website, Phần mềm chấm công 4 tab, Bảng giá 3 tab, Tin tức, Liên hệ, Video, Thống kê truy cập…).
- **Sau Sprint 12** → CMS vận hành đầy đủ (kho, báo cáo, phân quyền, log, thông báo, backup).
- **Sau Sprint 15** → hệ thống production-ready (thanh toán, vận chuyển, SEO/SSR, đa ngôn ngữ, test).

## C. Quyết định cần chốt với khách hàng (đang chặn tiến độ)

| # | Câu hỏi | Ảnh hưởng task |
|---|---|---|
| 1 | Dùng cổng thanh toán nào? VNPAY / MoMo / ZaloPay / chỉ COD + QR chuyển khoản | P5.1 |
| 2 | Đơn vị vận chuyển nào? GHN / GHTK / ViettelPost / tự giao + phí nhập tay | P1.8, P5.2 — **✅ P1.8 đã bỏ chặn phần “phí nhập tay”:** bảng `shipping_methods` cho phép admin tự khai từng phương thức (tên, phí, ngưỡng freeship, thời gian, khu vực, bật/tắt) và website/đơn hàng đọc trực tiếp; chỉ còn **P5.2** (nối API hãng vận chuyển để lấy phí/đơn thật) cần chốt hãng |
| 3 | Email gửi đi qua đâu? SMTP hosting / Gmail app password / SendGrid / Mailgun | P3.4 |
| 4 | Lưu ảnh ở đâu? Cloudinary / server nội bộ / S3 | P5.3 |
| 5 | Có cần đa ngôn ngữ? Nếu chỉ tiếng Việt → **bỏ P6.1**, tiết kiệm đáng kể thời gian | P6.1 |
| 6 | DB production dùng gì? SQLite / MySQL / MSSQL (code đã hỗ trợ cả 3 qua `DB_DRIVER`) | P6.6 |
| 7 | ~~Tên miền chính thức để đặt `APP_URL`?~~ ✅ **Đã chốt trong P0.2:** `https://gpsoft.vn` (đặt ở `.env`: `APP_URL` + `VITE_APP_URL`; đổi domain chỉ cần sửa `.env`). | P0.2 |
| 8 | Tra bảo hành theo **SĐT, serial hay cả hai**? Có phát hành **phiếu bảo hành điện tử** in ra không? | P1.1 → P1.3 |
| 9 | Cần hoá đơn VAT / xuất hoá đơn điện tử không? | *task mới nếu có* |
| 10 | Cần app mobile riêng, hay web responsive là đủ? | ảnh hưởng toàn bộ UI |

## D. Ghi chú kỹ thuật quan trọng khi implement

1. **Luôn chạy `npm run lint` sau mỗi task** — script này là `tsc --noEmit`, bắt lỗi type toàn project.
2. ⚠️ **`CmsTab` và `WebsitePage` bị khai báo trùng ở 2 nơi** (`src/types/index.ts` **và** `src/context/AppContext.tsx`) → sửa 1 chỗ là lỗi compile, **phải sửa cả hai**.
3. **Thêm route API mới ⇒ thêm vào `requiredPermission()` (`server/auth.ts:84`)**; nếu quên sẽ rơi vào `default: 'export'` (`auth.ts:122`) ⇒ chỉ admin `all` dùng được, các role khác bị 403.
4. **Muốn route public (không cần token) ⇒ thêm vào `PUBLIC_GET_PREFIXES` (`auth.ts:47`) hoặc `PUBLIC_POST_PATTERNS` (`auth.ts:63`)**. Lưu ý `PUBLIC_GET_PREFIXES` khớp theo **prefix** → dễ vô tình mở cả nhóm route (VD thêm `/warranties` sẽ mở luôn `GET /warranties` của admin). **⚠️ Bổ sung ở P1.5:** điều kiện thật là `path === prefix || path.startsWith(prefix + '/')` ⇒ một entry **có** `/` ở cuối (VD `'/orders/'`) **không** khớp path con (`/orders/ORD-1`), còn entry **không** có `/` ở cuối lại mở cả nhóm. Route công khai có **tham số trên path** (`/quote-links/:code`) ⇒ dùng `PUBLIC_GET_PATTERNS` (regex, khớp chính xác 1 segment con) thay vì tiền tố. **⚠️ Bổ sung ở P1.7–P1.9:** 3 kiểu mở công khai đang dùng thực tế — (a) **regex 1 path cố định** cho POST không tham số: `/^\/coupons\/validate$/` (khách kiểm mã trước khi đặt hàng) và 3 route POST cũ (`/orders`, `/leads`, review); (b) **prefix = đúng path con** cho GET công khai không tham số: `'/warranties/lookup'` (P1.1) · `'/shipping-methods'` (P1.8) · `'/campaigns/active'` (P1.9) — nhờ vậy `GET /warranties`, `GET /campaigns` của admin **vẫn cần token**; (c) **regex 1 segment con** cho `/quote-links/:code` (P1.5). Ngoại lệ đã chấp nhận: `GET /shipping-methods?all=1` (CMS xem cả phương thức đang tắt) rơi vào (b) nên cũng công khai — dữ liệu không nhạy cảm; muốn chặn thì tách route riêng cần token.
5. **Entity mới KHÔNG cần viết migration**: `store.ts:190-224` tự `CREATE TABLE` bảng thiếu và tự `ALTER TABLE ADD` cột thiếu lúc khởi động. **Bảng vừa được tạo sẽ được seed dữ liệu mẫu** (`store.ts` ghi nhớ `createdTables` → `db.init()` seed rồi `save()`; xem bug-fix ở P1.1) — vì `store.load()` trả **mảng rỗng** cho bảng mới và sẽ ghi đè seed nếu thiếu bước này. Bảng **đã tồn tại** thì **không bao giờ** bị seed lại (kể cả khi admin đã xoá sạch dữ liệu) ⇒ an toàn.
6. **Đừng quên `SCHEMA_KEYS`** khi tên bảng khác key trong `DatabaseSchema` (VD `product_reviews` → `reviews`, `app_settings` → `settings`).
7. **Giữ tương thích ngược API**: `DashboardView` và website đang gọi API với shape cũ — khi thêm `meta` phân trang thì thêm **song song**, không đổi shape cũ.
8. **Không thêm thư viện UI/chart mới** nếu chưa được duyệt — dự án chỉ dùng Tailwind v4 + `lucide-react` + `motion`.
9. **Enum/trạng thái phải thống nhất** giữa 3 nơi: `server/types.ts`, `src/types/index.ts`, và label hiển thị trong View — **✅ đã làm ở P1.2/P1.3**: toàn bộ nhãn/badge/thứ tự/tab bảo hành nằm ở `src/utils/warranty.ts` (`WARRANTY_STATUS_LABELS` · `WARRANTY_STATUS_BADGES` · `WARRANTY_STATUS_ORDER` · `WARRANTY_TYPE_LABELS` · `WARRANTY_PROGRESS` · `WARRANTY_TABS`), dùng chung cho CMS `WarrantyView` và trang public `/bao-hanh` — **không** khai báo lại trong component. **✅ P1.7–P1.9 làm đúng khuôn này:** `src/utils/commerce.ts` chứa `COUPON_STATE_LABELS`/`BADGES`/`COUPON_TABS`/`COUPON_APPLY_LABELS` · `CAMPAIGN_TYPE_LABELS` · `CAMPAIGN_STATE_LABELS`/`BADGES`/`CAMPAIGN_TABS` · `computeShippingFee` · `campaignCountdown`, dùng chung cho 3 view CMS + `CartDrawer` + `HomePage` (test: `tests/commerceUi.smoke.ts`). Task mới có enum ⇒ theo đúng khuôn này (`src/utils/<domain>.ts` + `tests/<domain>Ui.smoke.ts`). **Lưu ý nghiệp vụ:** công thức tiền/khoảng thời gian có **cả bản server và bản FE** (`server/shipping.ts` ↔ `src/utils/commerce.ts`, `server/coupon.ts` cho tiền) — server luôn là nơi CHỐT khi ghi dữ liệu; bản FE chỉ để hiển thị tức thời ⇒ **sửa công thức phải sửa cả 2 và cập nhật cả 2 test** (`test:shipping` + `test:commerce-ui`).
10. **Sau khi xong 1 task: đổi `[ ]` → `[x]`** trong chính file `ROADMAP.md` này để theo dõi tiến độ, và ghi chú ngắn vào cuối task nếu có lệch so với kế hoạch.
11. **Điều hướng website = URL thật (từ P0.1)**: nguồn sự thật là `location.pathname` trong `AppContext`. Muốn thêm/đổi đường dẫn ⇒ sửa `src/utils/url.ts` (`ROUTES` + `parsePath` + `pathFor`) rồi cập nhật `tests/routes.smoke.tsx`. **Không** set state điều hướng trực tiếp (phải đi qua `setWebsitePage()` / `navigateToX()` của `AppContext`), nếu không URL và state sẽ lệch nhau ⇒ F5/Back/Forward sai trang.

12. **Format tiền/ngày/slug/id: dùng util chung, không viết lại trong component.** `src/utils/format.ts` (`formatVnd` · `formatNumber` · `formatDate(v, style)` · `formatBytes` · `slugify`) và `src/utils/id.ts` (`genId(prefix)`). Trước P0.3 có **17 bản `formatPrice`/`formatDate`/`formatSize` trùng lặp** ở 17 file. Cần format mới ⇒ **thêm hàm vào `format.ts` + assertion trong `tests/utils.smoke.ts`** rồi mới dùng ở View. `slugify()` **bỏ dấu tiếng Việt** (`'Ốp lưng'` → `'op-lung'`) ⇒ dùng ở mọi chỗ sinh slug mới; nếu cần giữ đúng slug cũ thì admin điền tay vào ô slug của form.
13. **SEO: mỗi Page mới PHẢI gọi `setSeo()`** (`src/utils/seo.ts`) trong `useEffect`, không set `document.title`/thẻ meta thủ công ở chỗ khác. Canonical + URL trong JSON-LD luôn dựng bằng `pathFor()`/`ROUTES` (`src/utils/url.ts`) để không lệch với route thật. Domain: server `APP_URL`, client `VITE_APP_URL` (xem `.env`) — **không hardcode** domain trong code; sitemap/robots ở `server.ts` cũng đọc từ `APP_URL` và route map dùng chung với frontend.

14. **Phân trang: đừng tự viết `slice` trong route.** Endpoint list mới/sửa ⇒ `res.json(listBody(list, req.query))` với `listBody` từ `server/pagination.ts` (limit mặc định **20**, tối đa **100**, `page` vượt ⇒ kẹp trang cuối, tham số rác ⇒ mặc định, **không trả 400**). Shape cũ (`data`, `count`) **không được đổi**, chỉ thêm `meta` — xem `tests/pagination.smoke.ts`.

15. **API con công khai (tra cứu cho khách) ⇒ tách logic ra `server/<domain>.ts` (hàm thuần) + `tests/<domain>.smoke.ts`** như `server/pagination.ts` / `server/warranty.ts`: route **chỉ** map HTTP ↔ hàm, phần còn lại test bằng node thuần (`npm run test:<domain>`), không cần backend/DB. Bắt buộc: (a) thêm **đúng path con** vào `PUBLIC_GET_PREFIXES` (mục 4), không mở cả nhóm route admin; (b) **giới hạn tìm kiếm** — khớp chính xác mã/serial, SĐT chỉ cho khớp hậu tố ≥ 4 số, tối đa N dòng — vì tra cứu theo SĐT rất dễ lộ dữ liệu khách khác; (c) thiếu/ngắn quá ⇒ 400 kèm thông báo tiếng Việt, không tìm thấy ⇒ 200 + `data: []` (UI hiện empty state).

## E. Bảng tra nhanh: "Cần làm gì → sửa file nào"

| Việc cần làm | File bắt buộc phải sửa |
|---|---|
| Thêm entity mới (full CRUD) | `server/database/schema.ts` → `server/types.ts` → `src/types/index.ts` → `server/db.ts` (5 điểm) → `server/auth.ts` → `server/routes.ts` → `src/services/api.ts` |
| Thêm API con cho entity có sẵn (tra cứu / xử lý riêng) | `server/<domain>.ts` (hàm thuần, **mới**) + `server/routes.ts` + `src/services/api.ts` + `tests/<domain>.smoke.ts` + script trong `package.json` — route cho khách ⇒ thêm **đúng path con** vào `PUBLIC_GET_PREFIXES` (mục 4) và **giới hạn tìm kiếm** (khớp chính xác / tối thiểu ký tự / tối đa số dòng) |
| Thêm/sửa phân trang cho 1 endpoint list | `server/pagination.ts` (`listBody`) → `server/routes.ts` (endpoint đó) → `src/services/api.ts` (`ListResponse<T>` · `PageParams`) (+ `tests/pagination.smoke.ts`) — **không** đổi shape `data`/`count` cũ |
| Thêm tab CMS | `src/components/cms/<X>View.tsx` (mới) + `CmsLayout.tsx` (navItems + switch) + `CmsTab` (**2 file**) |
| Thêm nghiệp vụ thương mại dùng ở giỏ hàng/trang chủ (mã giảm giá · phí ship · campaign) | Full 7 lớp §0.2 + `server/<domain>.ts` (hàm thuần) + `tests/<domain>.smoke.ts` + nhãn/công thức FE ở `src/utils/commerce.ts` + `tests/commerceUi.smoke.ts` + view CMS `<X>View.tsx` + `test:cms-commerce` — **tiền/thời gian luôn tính lại ở server khi ghi dữ liệu** (`POST /orders`), client chỉ hiển thị |
| Thêm trang website | `src/components/website/<X>Page.tsx` (mới) + `WebsitePage` (**2 file**) + `App.tsx` (case) + action trong `AppContext` + `Navbar`/`Footer` |
| Thêm/đổi đường dẫn (URL) website | `src/utils/url.ts` (`ROUTES` + `parsePath` + `pathFor`) + `tests/routes.smoke.tsx` (+ `WebsitePage` **2 file** & case trong `App.tsx` nếu là trang mới) |
| Format tiền/ngày/số/slug/id | `src/utils/format.ts` + `src/utils/id.ts` (+ `tests/utils.smoke.ts`) — **không** khai báo helper local trong component |
| Thêm/sửa meta·canonical·JSON-LD của 1 trang | `src/utils/seo.ts` (builder dùng chung) + `setSeo()` trong chính Page đó (+ `tests/seo.smoke.ts`); URL trong canonical/sitemap lấy từ `src/utils/url.ts` |
| Thêm field vào entity có sẵn | `schema.ts` (columns) + 2 file types + seed trong `db.ts` (nếu cần) — **không cần migration** |
| Đổi quyền/phân quyền | `server/auth.ts` (switch + PUBLIC_*) + `RolesView.tsx` + `UsersView.tsx` + `CmsLayout.tsx` (ẩn/hiện menu theo quyền) |
| Đổi UI trang chủ | `HomePage.tsx` (+ tách khối thành component riêng nếu làm P6.2) |
| Đổi sitemap/robots/meta | `server.ts` (sitemap/robots) + `src/utils/seo.ts` + từng Page |
| Thêm cấu hình mới | `server/types.ts` (`SystemSettings`) + `SettingsView.tsx` + `.env`/`.env.example` nếu là secret |
