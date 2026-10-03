import 'dotenv/config';
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/routes.js';
import { db } from './server/db.js';
// P0.2 — dùng chung route map với frontend để sitemap không bao giờ lệch URL thật.
import { PREFIX, ROUTES } from './src/utils/url.js';
// P2.10 — nội dung robots.txt (luôn chặn cửa vào CMS) tách thành hàm thuần để smoke test được.
import { buildRobotsTxt } from './server/robots.js';

const app = express();
const PORT = Number(process.env.PORT) || 3100;
/** P0.2 — domain công khai, dùng cho sitemap.xml/robots.txt (đặt trong `.env`). */
const APP_URL = (process.env.APP_URL || 'https://gpsoft.vn').replace(/\/+$/, '');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure public/uploads exists
const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Dynamic robots.txt (P0.2 — domain theo `APP_URL`; P2.10 — luôn chặn cửa vào CMS `/login-admin`)
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(buildRobotsTxt(db.getSeoSettings().robotsTxt, APP_URL));
});

/** P0.2 — escape ký tự XML cho `<loc>` (slug có thể chứa `&`). */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Ngày dạng `YYYY-MM-DD` cho `<lastmod>` (bỏ qua giá trị rỗng/không hợp lệ). */
const isoDate = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

// Dynamic sitemap.xml
app.get('/sitemap.xml', (_req, res) => {
  const prods = db.getProducts();
  const posts = db.getPosts();
  const pages = db.getPages();
  const services = db.getServices();
  const categories = db.getCategories();
  const brands = db.getBrands();

  const urlEntry = (
    routePath: string,
    options: { lastmod?: string | null; changefreq?: string; priority?: string } = {}
  ): string => {
    const { lastmod, changefreq = 'weekly', priority = '0.7' } = options;
    return (
      `  <url><loc>${escapeXml(`${APP_URL}${routePath}`)}</loc>` +
      `${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}` +
      `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>\n`
    );
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Trang tĩnh (đường dẫn tiếng Việt thật — trước P0.2 sitemap ghi /products, /news... ⇒ 404)
  xml += urlEntry(ROUTES.home, { changefreq: 'daily', priority: '1.0' });
  xml += urlEntry(ROUTES.products, { changefreq: 'daily', priority: '0.9' });
  xml += urlEntry(ROUTES.news, { changefreq: 'daily', priority: '0.8' });
  xml += urlEntry(ROUTES.services, { changefreq: 'weekly', priority: '0.8' });
  xml += urlEntry(ROUTES.priceList, { changefreq: 'weekly', priority: '0.7' });
  xml += urlEntry(ROUTES.about, { changefreq: 'monthly', priority: '0.6' });
  xml += urlEntry(ROUTES.contact, { changefreq: 'monthly', priority: '0.6' });
  // P1.3 — đã có trang `/bao-hanh` (tra cứu bảo hành) nên đưa vào sitemap.
  xml += urlEntry(ROUTES.warranty, { changefreq: 'monthly', priority: '0.6' });
  // P2.2 — module "Phần mềm chấm công" (4 tab con qua `?tab=` — query không tạo URL mới nên chỉ khai báo URL sạch).
  xml += urlEntry(ROUTES.attendance, { changefreq: 'monthly', priority: '0.7' });
  // P2.3 — trang dịch vụ "Thiết kế website" đứng riêng (service `thiet-ke-website` còn có URL chi tiết
  // `/dich-vu/thiet-ke-website` ở vòng lặp `services` bên dưới — 2 trang khác nội dung, không trùng).
  xml += urlEntry(ROUTES.webDesign, { changefreq: 'monthly', priority: '0.8' });

  categories
    .filter(category => category.isActive !== false)
    .forEach(category => {
      xml += urlEntry(`${PREFIX.category}/${category.slug}`, { changefreq: 'weekly', priority: '0.8' });
    });

  brands
    .filter(brand => brand.isActive !== false)
    .forEach(brand => {
      xml += urlEntry(`${PREFIX.brand}/${brand.slug}`, { changefreq: 'weekly', priority: '0.7' });
    });

  prods
    .filter(product => product.status === 'active')
    .forEach(product => {
      xml += urlEntry(`${PREFIX.products}/${product.slug || product.id}`, {
        lastmod: isoDate(product.updatedAt || product.createdAt),
        changefreq: 'weekly',
        priority: '0.8'
      });
    });

  posts
    .filter(post => post.status === 'published')
    .forEach(post => {
      xml += urlEntry(`${PREFIX.news}/${post.slug || post.id}`, {
        lastmod: isoDate(post.publishedAt || post.createdAt),
        changefreq: 'monthly',
        priority: '0.7'
      });
    });

  services.forEach(service => {
    xml += urlEntry(`${PREFIX.services}/${service.slug || service.id}`, {
      changefreq: 'monthly',
      priority: '0.7'
    });
  });

  pages
    .filter(page => page.isPublished !== false)
    .forEach(page => {
      xml += urlEntry(`${PREFIX.page}/${page.slug || page.id}`, {
        lastmod: isoDate(page.updatedAt),
        changefreq: 'monthly',
        priority: '0.5'
      });
    });

  xml += '</urlset>';
  res.type('application/xml').send(xml);
});

// Mount API routes
app.use('/api', apiRouter);

// Vite middleware in dev, static dist in prod
async function startServer() {
  await db.init();

  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {
          usePolling: true,
          interval: 100,
        },
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[GPSOFT Server] Full-Stack server listening at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server Error]', err);
});
