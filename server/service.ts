/**
 * P2.3 — Chuẩn hoá payload `Service` gửi từ CMS trước khi ghi DB.
 *
 * Vì sao cần: tab **Dịch vụ kỹ thuật** (`ServicesView`) gửi tên field cũ (`priceEstimate`, `process`,
 * `faq`) trong khi `ServicesPage` và `WebDesignPage` đọc `priceRange` / `processSteps` / `faqs` ⇒ nội
 * dung admin sửa trong CMS **không** tới được trang public (bug âm thầm của DoD "sửa CMS ⇒ public đổi
 * theo"). Hàm thuần nhận **cả hai** cách gọi để không phải sửa dữ liệu/khách hàng cũ.
 *
 * Quy ước: field không gửi ⇒ **không** xuất hiện trong kết quả (`PUT` là partial update, giữ nguyên
 * giá trị cũ); chuỗi rỗng với `shortDesc`/`content` vẫn được ghi (admin chủ động xoá nội dung).
 * Kiểm: `npm run test:services`.
 */
import type { Service, ServiceFaq, ServiceProcessStep } from './types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Chuỗi dùng được đầu tiên trong danh sách (`''` và giá trị không phải chuỗi bị bỏ qua). */
const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
};

/** `processSteps` (chuẩn) hoặc `process` (tên cũ trong CMS) ⇒ mảng bước có `step`/`title`/`desc`. */
const pickSteps = (...values: unknown[]): ServiceProcessStep[] | undefined => {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    return value.map((raw, index) => {
      const step = isRecord(raw) ? raw : {};
      const duration = firstString(step.duration);
      const normalized: ServiceProcessStep = {
        step: typeof step.step === 'number' ? step.step : index + 1,
        title: typeof step.title === 'string' ? step.title : '',
        desc: typeof step.desc === 'string' ? step.desc : ''
      };
      if (duration) normalized.duration = duration;
      return normalized;
    });
  }
  return undefined;
};

/** `faqs` (chuẩn) hoặc `faq` (tên cũ trong CMS). */
const pickFaqs = (...values: unknown[]): ServiceFaq[] | undefined => {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    return value.map(raw => {
      const faq = isRecord(raw) ? raw : {};
      return {
        q: typeof faq.q === 'string' ? faq.q : '',
        a: typeof faq.a === 'string' ? faq.a : ''
      };
    });
  }
  return undefined;
};

/** Payload an toàn để merge vào `Service` (dùng cho cả `POST` tạo mới và `PUT` cập nhật). */
export function normalizeServiceInput(body: unknown): Partial<Service> {
  const payload = isRecord(body) ? body : {};
  const out: Partial<Service> = {};

  const title = firstString(payload.title);
  if (title) out.title = title;
  const slug = firstString(payload.slug);
  if (slug) out.slug = slug;
  if (typeof payload.shortDesc === 'string') out.shortDesc = payload.shortDesc;
  if (typeof payload.content === 'string') out.content = payload.content;
  const icon = firstString(payload.icon);
  if (icon) out.icon = icon;
  const thumbnail = firstString(payload.thumbnail);
  if (thumbnail) out.thumbnail = thumbnail;
  // CMS gọi là "Mức giá tham khảo" (`priceEstimate`), trang public đọc `priceRange`.
  const priceRange = firstString(payload.priceRange, payload.priceEstimate);
  if (priceRange) out.priceRange = priceRange;
  const processSteps = pickSteps(payload.processSteps, payload.process);
  if (processSteps) out.processSteps = processSteps;
  const faqs = pickFaqs(payload.faqs, payload.faq);
  if (faqs) out.faqs = faqs;
  if (typeof payload.isFeatured === 'boolean') out.isFeatured = payload.isFeatured;

  return out;
}

/** Service mới tạo từ CMS: áp giá trị mặc định cho field bắt buộc của `Service`. */
export function buildServiceFromInput(body: unknown, id: string): Service {
  const input = normalizeServiceInput(body);
  return {
    id,
    title: input.title || '',
    slug: input.slug || id,
    shortDesc: input.shortDesc || '',
    content: input.content || '',
    icon: input.icon || 'Wrench',
    thumbnail: input.thumbnail || '',
    priceRange: input.priceRange || 'Liên hệ',
    processSteps: input.processSteps || [],
    faqs: input.faqs || [],
    isFeatured: !!input.isFeatured
  };
}
