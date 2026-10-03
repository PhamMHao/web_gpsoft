/* =========================================================================
   CHIẾN DỊCH / FLASH SALE — HÀM THUẦN DÙNG CHUNG (P1.9)
   =========================================================================
   Module này KHÔNG import express/db (chỉ import type + helper chuẩn hoá đã có)
   ⇒ test bằng node thuần: `npm run test:campaigns`. `server/routes.ts` chỉ việc:

     GET  /campaigns          -> res.json(listBody(filterCampaigns(db.getCampaigns(), req.query), req.query));
     GET  /campaigns/active   -> res.json({ success, count, data: activeCampaigns(db.getCampaigns(), products) })

   Quy ước:
   - `activeCampaigns()` chỉ trả campaign ĐANG BẬT và **đang trong khoảng `startAt`–`endAt`**
     (thiếu `startAt`/`endAt` ⇒ coi như không giới hạn phía đó) ⇒ hết `endAt` khối flash sale
     tự ẩn ở trang chủ, không cần ai tắt tay.
   - Campaign chưa khai `productIds` ⇒ chọn giúp danh sách sản phẩm theo `rule` đã chốt:
     `discount` (đang giảm nhiều nhất) · `newest` (mới nhất) · `featured` (nổi bật), tối đa `limit`.
   - Mọi hàm đều KHÔNG sửa mảng/record đầu vào (trả bản mới).

   Trang chủ vẫn tự tính countdown từ `endAt` (client) nên không cần bảng riêng cho đồng hồ.
   ========================================================================= */
import type { Campaign, CampaignType, Product } from './types.js';
import type { QueryParams } from './pagination.js';
import { queryText } from './warranty.js';

export const CAMPAIGN_TYPES: CampaignType[] = ['countdown', 'flash_sale', 'banner'];

/** Số sản phẩm tối đa gắn vào 1 campaign khi trả về trang chủ (khối flash sale 4 cột). */
export const CAMPAIGN_PRODUCT_LIMIT = 4;

export function isCampaignType(value: unknown): value is CampaignType {
  return CAMPAIGN_TYPES.includes(queryText(value) as CampaignType);
}

function timeOf(value: unknown): number | null {
  const iso = queryText(value);
  if (!iso) return null;
  const at = new Date(iso).getTime();
  return Number.isFinite(at) ? at : null;
}

/** Campaign đang chạy tại `now`? (đang bật + trong khoảng thời gian khai báo) */
export function isCampaignRunning(campaign: Campaign, now: number | Date = Date.now()): boolean {
  if (!campaign.isActive) return false;
  const at = now instanceof Date ? now.getTime() : now;
  const start = timeOf(campaign.startAt);
  if (start !== null && at < start) return false;
  const end = timeOf(campaign.endAt);
  if (end !== null && at > end) return false;
  return true;
}

/** Trạng thái cho CMS: `running` · `scheduled` · `ended` · `paused`. */
export type CampaignState = 'running' | 'scheduled' | 'ended' | 'paused';

export function campaignState(campaign: Campaign, now: number | Date = Date.now()): CampaignState {
  const at = now instanceof Date ? now.getTime() : now;
  const start = timeOf(campaign.startAt);
  const end = timeOf(campaign.endAt);
  if (start !== null && at < start) return 'scheduled';
  if (end !== null && at > end) return 'ended';
  return campaign.isActive ? 'running' : 'paused';
}

/**
 * Chọn sản phẩm cho campaign: ưu tiên `productIds` đã khai; rỗng ⇒ lấy theo `rule`
 * trên danh sách `products` (đã lọc `isActive`).
 */
export function campaignProducts(
  campaign: Campaign,
  products: Product[],
  limit = CAMPAIGN_PRODUCT_LIMIT
): Product[] {
  const available = products.filter(p => p.status !== 'draft' && p.status !== 'archived');
  const ids = (campaign.productIds || []).filter(Boolean);
  if (ids.length > 0) {
    const byId = new Map(available.map(p => [p.id, p]));
    return ids
      .map(id => byId.get(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, limit);
  }
  return [...available]
    .sort((a, b) => discountOf(b) - discountOf(a) || newestOf(b) - newestOf(a))
    .slice(0, limit);
}

/** Mức giảm tuyệt đối của 1 sản phẩm (0 khi không có giá gốc để so). */
function discountOf(product: Product): number {
  const original = Number(product.originalPrice) || 0;
  const sale = Number(product.salePrice) || 0;
  return original > sale ? original - sale : 0;
}

function newestOf(product: Product): number {
  const at = new Date(queryText(product.createdAt)).getTime();
  return Number.isFinite(at) ? at : 0;
}

/** Campaign đang chạy, sắp xếp theo `endAt` gần nhất trước (khối nào hết trước thì ưu tiên). */
export function activeCampaigns(campaigns: Campaign[], now: number | Date = Date.now()): Campaign[] {
  return campaigns
    .filter(campaign => isCampaignRunning(campaign, now))
    .sort((a, b) => (timeOf(a.endAt) ?? Infinity) - (timeOf(b.endAt) ?? Infinity));
}

/** Bộ lọc danh sách cho CMS: `?q=` (tên) · `?type=` · `?state=`. `now` chỉ ảnh hưởng bộ lọc
 * `state` (mặc định là thời điểm hiện tại; truyền vào khi cần kiểm thử tất định). */
export function filterCampaigns(
  campaigns: Campaign[],
  query: QueryParams = {},
  now: number | Date = Date.now()
): Campaign[] {
  const q = queryText(query.q).toLowerCase();
  const type = queryText(query.type);
  const state = queryText(query.state);

  return campaigns.filter(campaign => {
    if (q && !String(campaign.name).toLowerCase().includes(q)) return false;
    if (type && campaign.type !== type) return false;
    if (state && state !== 'all' && campaignState(campaign, now) !== state) return false;
    return true;
  });
}
