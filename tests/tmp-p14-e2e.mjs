/**
 * P1.4/P1.5 — E2E HTTP thật cho entity báo giá + link chia sẻ (script tạm, chạy tay).
 * Cách chạy:
 *   $env:PORT='3214'; $env:SQLITE_FILE='data/tmp-p14.sqlite'; npm run dev
 *   node tests/tmp-p14-e2e.mjs
 */
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3214';
let pass = 0;
let fail = 0;

function check(label, ok, extra = '') {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  ->  ${extra}` : ''}`);
}

async function req(path, options = {}, token) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const login = await req('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
check('POST /auth/login (admin)', login.status === 200 && !!login.body.token, `status ${login.status}`);
const token = login.body.token;

const list = await req('/price-quotes', {}, token);
check('GET /price-quotes (có token)', list.status === 200 && Array.isArray(list.body.data), `status ${list.status}`);
check('seed: 2 báo giá', list.body.data.length === 2, `count ${list.body.data.length}`);
const seed1 = list.body.data.find(q => q.code === 'BG-2026-0001');
check('seed quote-1 có 3 dòng', seed1?.items.length === 3, `items ${seed1?.items.length}`);
check('seed quote-1 total = 157.440.000', seed1?.total === 157440000, `total ${seed1?.total}`);
check('seed quote-1 status sent + chưa hết hạn', seed1?.status === 'sent' && seed1?.isExpired === false, `${seed1?.status}/${seed1?.isExpired}`);

const noToken = await req('/price-quotes');
check('GET /price-quotes không token ⇒ 401', noToken.status === 401, `status ${noToken.status}`);

const paged = await req('/price-quotes?page=1&limit=1', {}, token);
check('phân trang: meta đúng', paged.body.meta?.total === 2 && paged.body.meta?.totalPages === 2, JSON.stringify(paged.body.meta));

const byCode = await req('/price-quotes/BG-2026-0001', {}, token);
check('GET /price-quotes/:code', byCode.status === 200 && byCode.body.data.id === 'quote-1', `status ${byCode.status}`);
check('chi tiết kèm danh sách link chia sẻ', Array.isArray(byCode.body.links), `links ${byCode.body.links?.length}`);


const created = await req('/price-quotes', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Báo giá E2E',
    customerName: 'Khách E2E',
    phone: '0900111222',
    // `total` bịa ra cố tình ⇒ server phải bỏ qua và tự tính lại
    total: 1,
    items: [
      { name: 'Laptop test', unit: 'Chiếc', qty: 2, unitPrice: 15000000, total: 1 },
      { name: 'Balo test', unit: 'Cái', qty: '3', unitPrice: '450000', total: 1 }
    ]
  })
}, token);
check('POST /price-quotes ⇒ 201', created.status === 201, `status ${created.status}`);
check('server bỏ qua `total` client gửi', created.body.data?.total === 31350000, `total ${created.body.data?.total}`);
check('mã tự sinh BG-2026-0003', created.body.data?.code === 'BG-2026-0003', created.body.data?.code);
check('createdBy lấy từ token', created.body.data?.createdBy === 'Nguyễn Quốc Bảo', created.body.data?.createdBy);
const newId = created.body.data.id;

const bad = await req('/price-quotes', { method: 'POST', body: JSON.stringify({ customerName: 'X', phone: '0900', items: [] }) }, token);
check('POST thiếu dòng hàng ⇒ 400', bad.status === 400, `status ${bad.status}`);

const updated = await req(`/price-quotes/${newId}`, {
  method: 'PUT',
  body: JSON.stringify({ status: 'accepted', items: [{ name: 'Laptop test', unit: 'Chiếc', qty: 1, unitPrice: 20000000 }] })
}, token);
check('PUT đổi trạng thái + tính lại tổng', updated.body.data?.status === 'accepted' && updated.body.data?.total === 20000000, `${updated.body.data?.status}/${updated.body.data?.total}`);

const csvRes = await fetch(`${BASE}/api/price-quotes/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
const csvBytes = new Uint8Array(await csvRes.arrayBuffer());
const csvText = new TextDecoder('utf-8').decode(csvBytes);
check('GET /price-quotes/export.csv ⇒ 200 text/csv', csvRes.status === 200 && (csvRes.headers.get('content-type') || '').includes('text/csv'), `status ${csvRes.status}`);
// `Response.text()` tự bỏ BOM khi decode ⇒ phải soi 3 byte thô EF BB BF (Excel cần BOM này).
check('CSV có BOM UTF-8 (byte EF BB BF)', csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf, `${csvBytes[0].toString(16)} ${csvBytes[1].toString(16)} ${csvBytes[2].toString(16)}`);
check('CSV có dòng của báo giá seed', csvText.includes('BG-2026-0001'), '');

/* --- Link chia sẻ (P1.5) ------------------------------------------------ */
const linkCreate = await req('/quote-links', { method: 'POST', body: JSON.stringify({ quoteId: newId, password: 'secret' }) }, token);
check('POST /quote-links ⇒ 201', linkCreate.status === 201, `status ${linkCreate.status}`);
const linkCode = linkCreate.body.data?.code;

const noPass = await req(`/quote-links/${linkCode}`);
check('mở link có mật khẩu mà không nhập ⇒ 401 + requiresPassword', noPass.status === 401 && noPass.body.requiresPassword === true, `status ${noPass.status}`);
const wrongPass = await req(`/quote-links/${linkCode}?pass=sai`);
check('nhập sai mật khẩu ⇒ 401', wrongPass.status === 401, `status ${wrongPass.status}`);
const okPass = await req(`/quote-links/${linkCode}?pass=secret`);
check('nhập đúng mật khẩu ⇒ 200 + quote', okPass.status === 200 && okPass.body.data?.quote?.id === newId, `status ${okPass.status}`);
check('viewCount tăng sau khi mở hợp lệ', okPass.body.data?.link?.viewCount === 1, `view ${okPass.body.data?.link?.viewCount}`);

const publicSeed = await req('/quote-links/BG7K2M9Q');
check('link công khai seed mở được không cần token', publicSeed.status === 200 && publicSeed.body.data?.quote?.code === 'BG-2026-0001', `status ${publicSeed.status}`);

const toggled = await req(`/quote-links/${linkCreate.body.data.id}`, { method: 'PUT', body: JSON.stringify({ isActive: false }) }, token);
check('PUT tắt link ⇒ isActive false', toggled.body.data?.isActive === false, `${toggled.body.data?.isActive}`);
const afterOff = await req(`/quote-links/${linkCode}?pass=secret`);
check('link đã tắt ⇒ 404', afterOff.status === 404, `status ${afterOff.status}`);

const unknown = await req('/quote-links/KHONGCODAU');
check('link không tồn tại ⇒ 404', unknown.status === 404, `status ${unknown.status}`);

const delLink = await req(`/quote-links/${linkCreate.body.data.id}`, { method: 'DELETE' }, token);
check('DELETE /quote-links/:id ⇒ 200', delLink.status === 200, `status ${delLink.status}`);
const delQuote = await req(`/price-quotes/${newId}`, { method: 'DELETE' }, token);
check('DELETE /price-quotes/:id ⇒ 200', delQuote.status === 200, `status ${delQuote.status}`);
const afterDelete = await req(`/price-quotes/${newId}`, {}, token);
check('báo giá đã xóa ⇒ 404', afterDelete.status === 404, `status ${afterDelete.status}`);

console.log(`\n${fail === 0 ? `OK: ${pass} assertion đạt.` : `FAILED: ${fail} assertion sai, ${pass} đạt.`}`);
process.exit(fail === 0 ? 0 : 1);

check('CSV có dòng của báo giá seed', csvText.includes('BG-2026-0001'), '');
