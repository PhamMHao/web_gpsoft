/**
 * P1.2 + P1.3 — Nhãn tiếng Việt, badge màu và tiện ích hiển thị cho phiếu bảo hành.
 *
 * Dùng chung cho CMS (`WarrantyView`) và trang tra cứu công khai (`WarrantyLookupPage`)
 * theo ROADMAP §D mục 9: enum/trạng thái phải thống nhất giữa `server/types.ts`,
 * `src/types/index.ts` và label hiển thị — KHÔNG mỗi View tự viết lại một bảng nhãn.
 *
 * Toàn bộ file là hàm thuần (không React/DOM) nên test bằng node: `npm run test:warranty-ui`.
 */
import type { Warranty, WarrantyStatus, WarrantyType } from '../types/index.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trạng thái phiếu theo đúng thứ tự xử lý (khớp `WarrantyStatus` ở `server/types.ts`). */
export const WARRANTY_STATUS_ORDER: WarrantyStatus[] = [
  'received',
  'inspecting',
  'repairing',
  'waiting_part',
  'done',
  'returned',
  'rejected'
];

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  received: 'Đã tiếp nhận',
  inspecting: 'Đang kiểm tra',
  repairing: 'Đang sửa chữa',
  waiting_part: 'Chờ linh kiện',
  done: 'Sửa xong',
  returned: 'Đã trả khách',
  rejected: 'Từ chối bảo hành'
};

export const WARRANTY_STATUS_BADGES: Record<WarrantyStatus, string> = {
  received: 'bg-sky-100 text-sky-700 border-sky-200',
  inspecting: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  repairing: 'bg-amber-100 text-amber-700 border-amber-200',
  waiting_part: 'bg-orange-100 text-orange-700 border-orange-200',
  done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200'
};

export const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  nha_san_xuat: 'Bảo hành nhà sản xuất',
  mo_rong: 'Bảo hành mở rộng'
};

/** Tiến độ (%) để vẽ thanh progress ở modal chi tiết. */
export const WARRANTY_PROGRESS: Record<WarrantyStatus, number> = {
  received: 15,
  inspecting: 40,
  repairing: 65,
  waiting_part: 55,
  done: 90,
  returned: 100,
  rejected: 100
};


/** Trùng khớp `WARRANTY_PROCESSING_STATUSES` ở `server/warranty.ts` — sub-tab “Đang xử lý”. */
export const WARRANTY_PROCESSING_STATUSES: WarrantyStatus[] = [
  'received',
  'inspecting',
  'repairing',
  'waiting_part'
];

export type WarrantyTab = 'all' | 'processing' | 'returned' | 'expired';

export interface WarrantyTabDef {
  id: WarrantyTab;
  label: string;
  /** Tham số gửi thẳng lên `GET /api/warranties` (server P1.1 đã hỗ trợ `status` nhiều giá trị + `expired`). */
  query: { status?: string; expired?: boolean };
}

export const WARRANTY_TABS: WarrantyTabDef[] = [
  { id: 'all', label: 'Tất cả phiếu', query: {} },
  { id: 'processing', label: 'Đang xử lý', query: { status: WARRANTY_PROCESSING_STATUSES.join(',') } },
  { id: 'returned', label: 'Đã trả khách', query: { status: 'returned' } },
  { id: 'expired', label: 'Hết bảo hành', query: { expired: true } }
];

export function warrantyTabById(id: WarrantyTab): WarrantyTabDef {
  return WARRANTY_TABS.find(tab => tab.id === id) || WARRANTY_TABS[0];
}

/**
 * Số ngày còn lại tới `endDate` (âm = quá hạn, `null` = thiếu/không hợp lệ).
 * Tính tròn lên giống `daysUntil()` ở `server/warranty.ts` để CMS và trang tra cứu không lệch nhau 1 ngày.
 */
export function warrantyDaysLeft(endDate?: string | null, now: number = Date.now()): number | null {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

export type WarrantyTone = 'green' | 'amber' | 'red' | 'gray';

export interface WarrantyRemainingBadge {
  tone: WarrantyTone;
  label: string;
  className: string;
}

/**
 * Badge hạn bảo hành — 3 dải màu (ROADMAP P1.3 bước 2):
 * xanh > 30 ngày · vàng 1–30 ngày (kể cả “hết hạn hôm nay”) · đỏ đã quá hạn · xám khi thiếu ngày.
 */
export function warrantyRemainingBadge(
  endDate?: string | null,
  now: number = Date.now()
): WarrantyRemainingBadge {
  const days = warrantyDaysLeft(endDate, now);
  if (days === null) {
    return { tone: 'gray', label: 'Chưa có hạn bảo hành', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
  if (days < 0) {
    return {
      tone: 'red',
      label: `Đã hết hạn ${Math.abs(days)} ngày`,
      className: 'bg-rose-100 text-rose-700 border-rose-200'
    };
  }
  if (days === 0) {
    return { tone: 'amber', label: 'Hết hạn hôm nay', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  if (days <= 30) {
    return { tone: 'amber', label: `Còn ${days} ngày`, className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { tone: 'green', label: `Còn ${days} ngày`, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

export interface WarrantyTimelineStep {
  key: string;
  label: string;
  /** Bước đã đi qua (hoặc đang ở bước này). */
  done: boolean;
  /** Bước hiện tại của phiếu (bước cuối đã đạt). */
  active: boolean;
}

const TIMELINE_FLOW: Array<{ key: string; label: string; statuses: WarrantyStatus[] }> = [
  {
    key: 'received',
    label: 'Tiếp nhận máy & ghi nhận tình trạng',
    statuses: ['received', 'inspecting', 'repairing', 'waiting_part', 'done', 'returned']
  },
  {
    key: 'inspecting',
    label: 'Kiểm tra kỹ thuật, xác định lỗi',
    statuses: ['inspecting', 'repairing', 'waiting_part', 'done', 'returned']
  },
  {
    key: 'repairing',
    label: 'Sửa chữa / thay thế linh kiện',
    statuses: ['repairing', 'waiting_part', 'done', 'returned']
  },
  { key: 'done', label: 'Sửa xong & kiểm tra lại', statuses: ['done', 'returned'] },
  { key: 'returned', label: 'Trả máy cho khách', statuses: ['returned'] }
];

/**
 * Dựng timeline 5 bước từ `status` hiện tại (phiếu chỉ lưu status, không lưu mốc từng bước).
 * `rejected` là nhánh kết thúc riêng: chỉ bước tiếp nhận hoàn thành.
 */
export function warrantyTimeline(status: WarrantyStatus): WarrantyTimelineStep[] {
  if (status === 'rejected') {
    return [
      { key: 'received', label: 'Tiếp nhận máy & ghi nhận tình trạng', done: true, active: false },
      { key: 'rejected', label: 'Từ chối bảo hành (thông báo khách)', done: true, active: true }
    ];
  }

  const steps = TIMELINE_FLOW.map((step, index) => ({
    key: step.key,
    label: step.label,
    done: step.statuses.includes(status),
    active: false,
    index
  }));
  const lastDone = [...steps].reverse().find(step => step.done);
  return steps.map(step => ({ key: step.key, label: step.label, done: step.done, active: step.index === lastDone?.index }));
}

/** Đếm số phiếu theo từng trạng thái — dùng cho 4 thẻ thống kê ở `WarrantyView`. */
export function countWarrantiesByStatus(list: Warranty[]): Record<WarrantyStatus, number> {
  const counts = WARRANTY_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<WarrantyStatus, number>);
  list.forEach(warranty => {
    if (counts[warranty.status] !== undefined) counts[warranty.status] += 1;
  });
  return counts;
}

/** Số phiếu đang trong nhóm “Đang xử lý” (chưa trả khách, chưa từ chối). */
export function countProcessingWarranties(list: Warranty[]): number {
  return list.filter(warranty => WARRANTY_PROCESSING_STATUSES.includes(warranty.status)).length;
}

/** Số phiếu đã quá hạn bảo hành tại thời điểm `now`. */
export function countExpiredWarranties(list: Warranty[], now: number = Date.now()): number {
  return list.filter(warranty => {
    const days = warrantyDaysLeft(warranty.endDate, now);
    return days !== null && days < 0;
  }).length;
}

/**
 * Hạn bảo hành dự phòng = `startDate` + `months` tháng (kẹp ngày cuối tháng như `addMonths()` server).
 * Chỉ dùng để hiện preview trong form — server vẫn là nơi tính chính thức khi lưu.
 */
export function warrantyEndDatePreview(startDate?: string | null, months?: number | string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const totalMonths = Math.max(0, Math.trunc(Number(months)) || 0);
  if (Number.isNaN(start.getTime())) return null;
  const day = start.getDate();
  const target = new Date(start.getTime());
  target.setDate(1);
  target.setMonth(target.getMonth() + totalMonths);
  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfMonth));
  return target.toISOString();
}

