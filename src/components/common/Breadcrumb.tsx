/**
 * P2.8 — Dải breadcrumb hiển thị cho **mọi** trang website.
 *
 * Trước P2.8 mỗi trang tự viết `<Link>` + `<ChevronRight>` bằng tay (6 file khác nhau) ⇒ style lệch
 * nhau và dễ lệch với `BreadcrumbList` JSON-LD. Component này chỉ **hiển thị** `Crumb[]` do
 * `src/utils/breadcrumb.ts` sinh ra ⇒ cùng một dải dữ liệu dùng cho cả UI và structured data.
 *
 * 3 biến thể bám đúng các chỗ đang dùng trong codebase:
 * - `plain`  (mặc định): dòng chữ nhỏ dưới navbar (`/san-pham`, `/tin-tuc`…).
 * - `header` : đặt ngay trên `<h1>` trong khối header của trang (chữ nhạt, mắt cuối đậm).
 * - `pill`   : card trắng bo `rounded-2xl` nổi trên hero (trang danh mục/thương hiệu).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { visibleCrumbs } from '../../utils/breadcrumb.ts';
import type { Crumb } from '../../utils/breadcrumb.ts';

type BreadcrumbVariant = 'plain' | 'header' | 'pill';

interface BreadcrumbProps {
  /** Dải mắt từ gốc tới trang hiện tại (xem `crumbTrail()`). */
  items: Crumb[];
  variant?: BreadcrumbVariant;
  className?: string;
  /** Icon nhà ở mắt đầu (mặc định chỉ bật ở biến thể `pill`). */
  showHomeIcon?: boolean;
}

/** Class của khung ngoài theo biến thể. */
const WRAPPER_CLASS: Record<BreadcrumbVariant, string> = {
  plain: 'flex items-center gap-1.5 text-xs text-slate-400 flex-wrap',
  header: 'flex items-center gap-1.5 text-xs text-slate-400 flex-wrap',
  pill: 'inline-flex items-center gap-1.5 max-w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-[11px] sm:text-xs text-slate-500 shadow-xs'
};

/** Class của mắt cuối (trang đang xem). */
const LAST_CLASS: Record<BreadcrumbVariant, string> = {
  plain: 'text-[#1C86EE] font-bold truncate',
  header: 'text-slate-800 font-semibold truncate',
  pill: 'text-[#1C86EE] font-bold truncate'
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  variant = 'plain',
  className = '',
  showHomeIcon
}) => {
  const crumbs = visibleCrumbs(items ?? []);
  if (crumbs.length === 0) return null;

  const withHomeIcon = showHomeIcon ?? variant === 'pill';
  const lastIndex = crumbs.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={`${WRAPPER_CLASS[variant]} ${className}`.trim()}>
      <ol className="flex items-center gap-1.5 flex-wrap min-w-0">
        {crumbs.map((crumb, index) => {
          const isLast = index === lastIndex;
          const linkClass = 'hover:text-[#1C86EE] transition-colors truncate';
          return (
            <li
              key={`${crumb.path}#${index}`}
              className="flex items-center gap-1.5 min-w-0 max-w-[16rem]"
            >
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              )}
              {index === 0 && withHomeIcon && (
                <Home className="w-3.5 h-3.5 shrink-0 text-[#1C86EE]" aria-hidden="true" />
              )}

              {isLast ? (
                <span aria-current="page" className={`${LAST_CLASS[variant]} ${crumb.pending ? 'italic' : ''}`}>
                  {crumb.name}
                </span>
              ) : crumb.pending ? (
                <span className="italic truncate text-slate-400">{crumb.name}</span>
              ) : (
                <Link to={crumb.path} className={linkClass} title={crumb.name}>
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
