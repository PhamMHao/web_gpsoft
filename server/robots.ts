import { ROUTES } from '../src/utils/url.js';

/** Dòng `Sitemap: ...` đã tồn tại trong nội dung admin nhập hay chưa (không phân biệt hoa/thường). */
const SITEMAP_LINE = /^sitemap\s*:/im;

/** Dòng chặn cửa vào CMS (`Disallow: /login-admin`) đã có hay chưa — chấp nhận cả `/login-admin/`. */
const ADMIN_LOGIN_DISALLOW = new RegExp(`^disallow\\s*:\\s*${ROUTES.adminLogin}/?\\s*$`, 'im');

/**
 * P2.10 — Ghép nội dung `/robots.txt` trả cho crawler:
 * 1. **Giữ nguyên** nội dung admin nhập ở CMS → SEO (đó là nguồn sự thật của nội dung).
 * 2. Bảo đảm `Sitemap: <appUrl>/sitemap.xml` (P0.2 — không hardcode domain, không thêm 2 lần).
 * 3. Bảo đảm `Disallow: /login-admin` — cửa vào CMS **không** bao giờ được lọt vào index, kể cả khi
 *    admin xoá dòng đó trong CMS. Nhóm `User-agent: *` này đặt **đầu tệp** nên không phụ thuộc việc
 *    nhóm `User-agent` cuối cùng trong nội dung admin nhập là bot nào.
 *
 * Hàm thuần (không đụng `db`/express) ⇒ `tests/adminLogin.smoke.tsx` kiểm được không cần backend.
 */
export function buildRobotsTxt(rawRobotsTxt: string | undefined, appUrl: string): string {
  const body = (rawRobotsTxt || 'User-agent: *\nAllow: /').trim();
  const blocks: string[] = [];

  if (!ADMIN_LOGIN_DISALLOW.test(body)) {
    blocks.push(`User-agent: *\nDisallow: ${ROUTES.adminLogin}`);
  }
  blocks.push(body);
  if (!SITEMAP_LINE.test(body)) {
    blocks.push(`Sitemap: ${appUrl.replace(/\/+$/, '')}/sitemap.xml`);
  }

  return `${blocks.join('\n\n')}\n`;
}
