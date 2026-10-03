/**
 * P2.8 — Breadcrumb dùng chung cho **mọi** trang website.
 *
 * Trước P2.8 mỗi trang tự viết một dải breadcrumb bằng tay (`<Link>` + `<ChevronRight>` lặp lại ở
 * nhiều file, mỗi nơi một style) ⇒ thiếu ở trang mới thêm, và **dễ lệch với `BreadcrumbList`
 * JSON-LD** (Google yêu cầu dải breadcrumb hiển thị khớp structured data — nếu lệch là mất rich
 * snippet); nặng hơn: `AboutPage`/`ContactPage`/`WebDesignPage` chỉ có JSON-LD mà **không render**
 * dải nào, còn `AttendanceSoftwarePage` tự dựng `<nav>` riêng. Module này gom về một chỗ:
 * - `crumbTrail()`  — ghép dải mắt từ gốc tới trang hiện tại (tự chèn "Trang chủ").
 * - `crumbJsonLd()` — sinh `BreadcrumbList` **từ đúng dải đang hiển thị** ⇒ không thể lệch.
 * - `crumbLabel()`  — cắt ngắn tiêu đề dài cho vừa một dòng.
 * - `pendingCrumb()`— mắt "đang tải" khi chưa có dữ liệu (SSR/fetch chậm) ⇒ breadcrumb luôn render
 *   được kể cả khi context rỗng, không bị nhảy layout.
 *
 * Component hiển thị: `src/components/common/Breadcrumb.tsx` (nhận `Crumb[]` từ đây).
 *
 * Quy ước: KHÔNG đưa mắt `pending` vào JSON-LD (chỉ thêm khi có dữ liệu thật) ⇒ structured data
 * luôn sạch, còn UI vẫn giữ chỗ cho mắt đang tải.
 */
import { ROUTES } from './url.ts';
import { breadcrumbJsonLd } from './seo.ts';
import type { BreadcrumbItem } from './seo.ts';

/** Một mắt breadcrumb. `pending` = nhãn tạm khi dữ liệu chưa về (không đưa vào JSON-LD). */
export interface Crumb extends BreadcrumbItem {
  pending?: boolean;
}

/** Mắt đầu của mọi dải breadcrumb. */
export const HOME_CRUMB: Crumb = { name: 'Trang chủ', path: ROUTES.home };

/** Mắt cấp 2 dùng chung cho mọi trang thuộc nhóm sản phẩm (danh sách/danh mục/hãng/chi tiết). */
export const PRODUCTS_CRUMB: Crumb = { name: 'Sản phẩm', path: ROUTES.products };

/** Mắt cấp 2 của các trang cấp 1 còn lại — dùng để dựng dải breadcrumb nhất quán mọi trang. */
export const SERVICES_CRUMB: Crumb = { name: 'Dịch vụ sửa chữa', path: ROUTES.services };
export const NEWS_CRUMB: Crumb = { name: 'Tin tức', path: ROUTES.news };
export const PRICE_LIST_CRUMB: Crumb = { name: 'Bảng giá', path: ROUTES.priceList };
export const WARRANTY_CRUMB: Crumb = { name: 'Tra cứu bảo hành', path: ROUTES.warranty };
export const ABOUT_CRUMB: Crumb = { name: 'Giới thiệu', path: ROUTES.about };
export const CONTACT_CRUMB: Crumb = { name: 'Liên hệ', path: ROUTES.contact };

/** Nhãn mặc định của mắt đang tải. */
export const PENDING_LABEL = 'Đang tải…';

/**
 * Ghép dải breadcrumb: luôn bắt đầu bằng "Trang chủ", bỏ qua mắt rỗng (`null`/`false`/`''`).
 * Dùng cho cả 2 việc: render UI **và** sinh JSON-LD ⇒ hai bên không thể lệch nhau.
 */
export function crumbTrail(...items: Array<Crumb | null | undefined | false>): Crumb[] {
  const rest = items.filter(
    (item): item is Crumb => Boolean(item && item.name && item.path)
  );
  return [HOME_CRUMB, ...rest];
}

/** Cắt ngắn nhãn mắt cho vừa một dòng (`max` ký tự) — tránh breadcrumb phá layout trên mobile. */
export function crumbLabel(text?: string | null, fallback = PENDING_LABEL, max = 48): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Mắt "đang tải": có nhãn tạm + cờ `pending` (không xuất hiện trong JSON-LD). */
export function pendingCrumb(path: string, label?: string): Crumb {
  return { name: crumbLabel(label, PENDING_LABEL), path, pending: true };
}

/** Mắt của slug không tồn tại (trang 404 inline) — dùng lại `crumbLabel` để không phá layout. */
export function missingCrumb(path: string, label: string): Crumb {
  return { name: crumbLabel(label, 'Không tìm thấy'), path, pending: true };
}

/** Bỏ mắt rỗng — dùng trước khi render để không sinh `<li>` trắng. */
export const visibleCrumbs = (crumbs: Crumb[]): Crumb[] => crumbs.filter(crumb => Boolean(crumb.name));

/**
 * `BreadcrumbList` sinh **từ chính dải đang hiển thị** (bỏ mắt `pending` vì chưa có nội dung thật).
 * Mọi trang nên gọi hàm này thay vì dựng mảng JSON-LD riêng ⇒ UI ⇄ structured data luôn khớp.
 */
export function crumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  const items: BreadcrumbItem[] = visibleCrumbs(crumbs)
    .filter(crumb => !crumb.pending)
    .map(({ name, path }) => ({ name, path }));
  return breadcrumbJsonLd(items);
}
