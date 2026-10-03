/**
 * P2.3 — Nhãn nguồn lead (`Lead.source`) dùng chung cho CMS (tab Leads) và trang public.
 *
 * Trước P2.3 mọi form đều đổ chung một rổ ⇒ sale không biết lead đến từ trang nào. Nay mỗi form
 * gửi kèm `source` (server mặc định `website` khi form không khai báo), CMS hiển thị badge + lọc theo
 * nguồn. Tách khỏi `LeadsView` để smoke test chốt được quy ước giá trị và nhãn hiển thị.
 */

/** Quy ước giá trị `Lead.source` dùng chung cho mọi form gửi lead. */
export const LEAD_SOURCE = {
  /** Form chung không khai báo nguồn (server cũng gán giá trị này). */
  website: 'website',
  webDesign: 'web-design',
  attendance: 'attendance-software',
  contactPage: 'contact-page',
  quoteModal: 'quote-modal',
  newsletter: 'newsletter'
} as const;

/** Nguồn mặc định khi form không khai báo `source` (khớp `POST /leads` ở server). */
export const DEFAULT_LEAD_SOURCE: string = LEAD_SOURCE.website;

/** Nhãn tiếng Việt của từng nguồn lead. Nguồn lạ ⇒ hiển thị nguyên giá trị. */
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  [LEAD_SOURCE.website]: 'Website (form chung)',
  [LEAD_SOURCE.webDesign]: 'Thiết kế website',
  [LEAD_SOURCE.attendance]: 'Phần mềm chấm công',
  [LEAD_SOURCE.contactPage]: 'Trang liên hệ',
  [LEAD_SOURCE.quoteModal]: 'Yêu cầu báo giá',
  [LEAD_SOURCE.newsletter]: 'Đăng ký nhận tin'
};

/** Nhãn hiển thị của một nguồn lead (`undefined` ⇒ chuỗi rỗng để UI tự quyết định ẩn/hiện). */
export const leadSourceLabel = (source?: string): string => {
  const key = (source || '').trim();
  if (!key) return '';
  return LEAD_SOURCE_LABELS[key] || key;
};

/** Bộ lọc nguồn cho tab Leads: `''` = tất cả, các mục còn lại là `source` gửi lên API. */
export const LEAD_SOURCE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả nguồn' },
  { value: LEAD_SOURCE.website, label: LEAD_SOURCE_LABELS[LEAD_SOURCE.website] },
  { value: LEAD_SOURCE.webDesign, label: LEAD_SOURCE_LABELS[LEAD_SOURCE.webDesign] },
  { value: LEAD_SOURCE.attendance, label: LEAD_SOURCE_LABELS[LEAD_SOURCE.attendance] }
];
