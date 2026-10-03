/**
 * P0.4 — Smoke test phân trang API (`server/pagination.ts`).
 *
 * Chạy: `npm run test:pagination`
 * Cách hoạt động: gọi trực tiếp hàm thuần (không cần backend/DB) và kiểm tra
 * hợp đồng API: **không có `page`/`limit` ⇒ y như cũ (không `meta`)**,
 * có `page`/`limit` ⇒ đúng 1 trang + `meta` đúng, tham số rác ⇒ dùng mặc định.
 */
import { paginateList, listBody, parsePaging, positiveInt, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../server/pagination.ts';

let failed = 0;
let passed = 0;

function check<T>(label: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${ok ? '' : `  (mong đợi ${JSON.stringify(expected)})`}`
  );
}

const items = Array.from({ length: 105 }, (_, i) => i + 1); // 1..105

/* --- Không phân trang: giữ nguyên hành vi cũ, KHÔNG có meta -------------- */
const none = paginateList(items, {});
check('no params -> giữ nguyên độ dài', none.items.length, 105);
check('no params -> không có meta', none.meta, undefined);
check('no params -> cùng tham chiếu mảng (không copy/sửa)', none.items === items, true);
check('no params -> phần tử đầu/cuối', [none.items[0], none.items[104]], [1, 105]);

const bodyNone = listBody(items, {});
check('listBody no params -> count = tổng', bodyNone.count, 105);
check('listBody no params -> total = tổng', bodyNone.total, 105);
check('listBody no params -> KHÔNG có key meta', 'meta' in bodyNone, false);
check('listBody no params -> success = true', bodyNone.success, true);

// Các key filter/sort khác không được kích hoạt phân trang
const withFilter = paginateList(items, { search: 'abc', sort: 'price-asc' });
check('chỉ có filter khác -> không phân trang', withFilter.meta, undefined);
check('chỉ có filter khác -> đủ 105 dòng', withFilter.items.length, 105);

/* --- Trang giữa: ?page=2&limit=10 --------------------------------------- */
const p2 = paginateList(items, { page: '2', limit: '10' });
check('page=2&limit=10 -> đúng 10 dòng', p2.items.length, 10);
check('page=2&limit=10 -> dòng đầu = 11', p2.items[0], 11);
check('page=2&limit=10 -> dòng cuối = 20', p2.items[9], 20);
check('page=2&limit=10 -> meta', p2.meta, { page: 2, limit: 10, total: 105, totalPages: 11 });

const bodyP2 = listBody(items, { page: '2', limit: '10' });
check('listBody page=2&limit=10 -> count = 10 (số dòng trang này)', bodyP2.count, 10);
check('listBody page=2&limit=10 -> total = 105', bodyP2.total, 105);
check('listBody page=2&limit=10 -> meta', bodyP2.meta, { page: 2, limit: 10, total: 105, totalPages: 11 });

/* --- Chỉ truyền 1 trong 2 param: param còn lại lấy mặc định -------------- */
const onlyPage = paginateList(items, { page: '3' });
check('chỉ page=3 -> limit mặc định 20', onlyPage.meta, { page: 3, limit: 20, total: 105, totalPages: 6 });
check('chỉ page=3 -> dòng đầu = 41', onlyPage.items[0], 41);
check('chỉ page=3 -> dòng cuối = 60', onlyPage.items[19], 60);

const onlyLimit = paginateList(items, { limit: '50' });
check('chỉ limit=50 -> page mặc định 1', onlyLimit.meta, { page: 1, limit: 50, total: 105, totalPages: 3 });
check('chỉ limit=50 -> dòng đầu = 1', onlyLimit.items[0], 1);

/* --- Trang cuối & kẹp page vượt quá ------------------------------------- */
const last = paginateList(items, { page: '11', limit: '10' });
check('trang cuối -> còn 5 dòng', last.items.length, 5);
check('trang cuối -> dòng cuối = 105', last.items[4], 105);

const over = paginateList(items, { page: '999', limit: '10' });
check('page vượt -> kẹp về trang cuối', over.meta, { page: 11, limit: 10, total: 105, totalPages: 11 });
check('page vượt -> vẫn có dữ liệu (không rỗng)', over.items.length, 5);

/* --- limit quá lớn ------------------------------------------------------ */
const bigLimit = paginateList(items, { limit: '1000' });
check('limit=1000 -> kẹp về MAX_PAGE_LIMIT', bigLimit.meta, { page: 1, limit: MAX_PAGE_LIMIT, total: 105, totalPages: 2 });
check('limit=1000 -> trả 100 dòng', bigLimit.items.length, 100);

/* --- Tham số rác: dùng mặc định, không crash ---------------------------- */
check('page=abc -> page 1', parsePaging({ page: 'abc' }).page, 1);
check('page=abc -> vẫn tính là có phân trang', parsePaging({ page: 'abc' }).requested, true);
check('page=0 -> page 1', parsePaging({ page: '0' }).page, 1);
check('page=-3 -> page 1', parsePaging({ page: '-3' }).page, 1);
check('page=2.7 -> làm tròn xuống 2', parsePaging({ page: '2.7' }).page, 2);
check('limit=-5 -> mặc định 20', parsePaging({ limit: '-5' }).limit, DEFAULT_PAGE_LIMIT);
check('limit= (rỗng) -> mặc định 20', parsePaging({ limit: '' }).limit, DEFAULT_PAGE_LIMIT);
check('limit=abc -> mặc định 20', parsePaging({ limit: 'abc' }).limit, DEFAULT_PAGE_LIMIT);
check('page= (rỗng) -> page 1', parsePaging({ page: '' }).page, 1);
check('không param nào -> requested = false', parsePaging({}).requested, false);
check('page lặp (mảng) -> lấy giá trị đầu', parsePaging({ page: ['2', '3'] }).page, 2);
check('positiveInt(undefined, 7) -> 7', positiveInt(undefined, 7), 7);
check('positiveInt(null, 7) -> 7', positiveInt(null, 7), 7);
check('positiveInt("12", 7) -> 12', positiveInt('12', 7), 12);

/* --- Danh sách rỗng & danh sách nhỏ hơn 1 trang ------------------------- */
const empty = listBody([], { page: '2', limit: '10' });
check('list rỗng + page=2 -> data rỗng', empty.data, []);
check('list rỗng + page=2 -> meta totalPages = 1 (không chia cho 0)', empty.meta, { page: 1, limit: 10, total: 0, totalPages: 1 });

const small = listBody(['a', 'b'], { page: '1', limit: '10' });
check('list nhỏ hơn 1 trang -> đủ dữ liệu', small.data, ['a', 'b']);
check('list nhỏ hơn 1 trang -> totalPages = 1', small.meta, { page: 1, limit: 10, total: 2, totalPages: 1 });

/* --- Không sửa mảng đầu vào -------------------------------------------- */
const original = [1, 2, 3, 4, 5];
paginateList(original, { page: '2', limit: '2' });
check('không mutate mảng gốc', original, [1, 2, 3, 4, 5]);

/* --- Tổng kết ----------------------------------------------------------- */
console.log(`\n${failed === 0 ? `OK: ${passed} assertion đạt.` : `FAILED: ${failed} assertion sai, ${passed} đạt.`}`);
process.exit(failed === 0 ? 0 : 1);
