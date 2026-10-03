import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gpsoft-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthPayload {
  sub: string;
  username: string;
  role: string;
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function signToken(user: User): string {
  const payload: AuthPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions || []
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

const PUBLIC_GET_PREFIXES = [
  '/products',
  '/orders/',
  '/categories',
  '/brands',
  '/posts',
  '/post-categories',
  '/services',
  '/banners',
  '/menus',
  '/pages',
  '/settings',
  '/seo',
  '/media',
  // P1.1 — chỉ mở ĐÚNG route tra cứu bảo hành cho khách; `GET /warranties` (danh sách admin) vẫn cần token.
  '/warranties/lookup',
  // P1.8/P1.9 — website cần đọc phương thức vận chuyển + campaign đang chạy khi chưa đăng nhập.
  // Chú ý: KHÔNG mở `/campaigns` (danh sách admin) — chỉ mở đúng route con `/campaigns/active`.
  '/shipping-methods',
  '/campaigns/active'
];

/*
 * P1.5 — route công khai có THAM SỐ trong path.
 * `PUBLIC_GET_PREFIXES` khớp theo tiền tố nên **không** dùng được cho `/quote-links/:code`:
 * thêm '/quote-links' sẽ mở luôn `GET /quote-links` (danh sách link của admin) — đúng cảnh báo §D.4.
 * Vì vậy dùng regex khớp CHÍNH XÁC 1 segment con ⇒ chỉ `/quote-links/<mã>` là công khai.
 */
const PUBLIC_GET_PATTERNS = [/^\/quote-links\/[^/]+$/];

const PUBLIC_POST_PATTERNS = [
  /^\/auth\/login$/,
  /^\/orders$/,
  /^\/leads$/,
  // P1.7 — khách kiểm mã giảm giá trước khi đặt hàng (route chỉ trả {valid, discount, message}).
  /^\/coupons\/validate$/,
  /^\/products\/[^/]+\/reviews$/,
  /^\/reviews\/[^/]+\/helpful$/
];

function isPublicRequest(req: Request): boolean {
  const path = req.path;
  if (req.method === 'GET') {
    if (PUBLIC_GET_PATTERNS.some(pattern => pattern.test(path))) return true;
    return PUBLIC_GET_PREFIXES.some(
      prefix => path === prefix || path.startsWith(`${prefix}/`)
    );
  }
  if (req.method === 'POST') {
    return PUBLIC_POST_PATTERNS.some(pattern => pattern.test(path));
  }
  return false;
}

function requiredPermission(req: Request): string {
  const segment = req.path.replace(/^\//, '').split('/')[0];
  let resource: string;
  switch (segment) {
    case 'products':
    case 'categories':
    case 'brands':
      resource = 'products';
      break;
    case 'orders':
      resource = 'orders';
      break;
    case 'customers':
      resource = 'customers';
      break;
    case 'leads':
      resource = 'leads';
      break;
    // P1.1 — bảo hành dùng resource riêng (`warranty.view|create|edit|delete`).
    case 'warranties':
      resource = 'warranty';
      break;
    // P1.4/P1.5 — báo giá + link chia sẻ dùng resource riêng (`quotes.view|create|edit|delete`).
    case 'price-quotes':
    case 'quote-links':
      resource = 'quotes';
      break;
    // P1.7/P1.8/P1.9 — thương mại dùng resource riêng (`coupon.*` · `shipping.*` · `campaign.*`).
    case 'coupons':
      resource = 'coupon';
      break;
    case 'shipping-methods':
      resource = 'shipping';
      break;
    case 'campaigns':
      resource = 'campaign';
      break;
    case 'posts':
    case 'post-categories':
    case 'services':
    case 'banners':
    case 'menus':
    case 'pages':
    case 'media':
      resource = 'content';
      break;
    case 'settings':
    case 'seo':
      resource = 'settings';
      break;
    case 'users':
    case 'roles':
      resource = 'users';
      break;
    case 'dashboard':
      resource = 'dashboard';
      break;
    default:
      resource = 'export';
      break;
  }

  if (resource === 'dashboard' || resource === 'export') {
    return 'all';
  }

  const action =
    req.method === 'GET'
      ? 'view'
      : req.method === 'POST'
        ? 'create'
        : req.method === 'DELETE'
          ? 'delete'
          : 'edit';

  return `${resource}.${action}`;
}

export function hasPermission(permissions: string[], required: string): boolean {
  if (required === 'all') {
    return permissions.includes('all');
  }
  const resource = required.split('.')[0];
  return permissions.some(
    p => p === 'all' || p === required || p === `${resource}.*`
  );
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (isPublicRequest(req)) {
    next();
    return;
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' });
    return;
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    return;
  }

  req.auth = payload;

  const required = requiredPermission(req);
  if (!hasPermission(payload.permissions || [], required)) {
    res.status(403).json({ success: false, message: 'Tài khoản không có quyền thực hiện thao tác này.' });
    return;
  }

  next();
}
