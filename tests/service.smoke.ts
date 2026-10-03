/**
 * P2.3 — Smoke test chuẩn hoá payload `Service` từ CMS (`server/service.ts`) + hằng số seed dùng chung
 * (`src/utils/webDesign.ts`).
 *
 * Chạy: `npm run test:services` (hàm thuần, KHÔNG cần backend/DB).
 * Nội dung: (1) payload chuẩn đi thẳng; (2) tên field cũ của CMS (`priceEstimate`/`process`/`faq`) được
 * map sang `priceRange`/`processSteps`/`faqs` — chính là lỗi khiến "sửa CMS mà trang public không đổi";
 * (3) field không gửi thì KHÔNG ghi đè (`PUT` partial); (4) dữ liệu rác không làm sập server;
 * (5) giá trị mặc định khi tạo service mới; (6) `WEB_DESIGN_SERVICE_SEED` (seed DB + nút seed trong CMS)
 * dùng đúng tên field chuẩn nên round-trip qua `normalizeServiceInput` không bị mất dữ liệu.
 */
import { buildServiceFromInput, normalizeServiceInput } from '../server/service.ts';
import { formatVnd } from '../src/utils/format.ts';
import {
  WEB_DESIGN_FAQS,
  WEB_DESIGN_PACKAGES,
  WEB_DESIGN_PAGE_DESC,
  WEB_DESIGN_PAGE_TITLE,
  WEB_DESIGN_SERVICE_PRICE_RANGE,
  WEB_DESIGN_SERVICE_SEED,
  WEB_DESIGN_SERVICE_SLUG,
  WEB_DESIGN_STEPS
} from '../src/utils/webDesign.ts';

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

/* --- 1. Payload chuẩn của trang public ---------------------------------- */
check(
  'normalizeServiceInput: payload chuẩn giữ nguyên',
  normalizeServiceInput({
    title: 'Thiết kế website',
    slug: 'thiet-ke-website',
    shortDesc: 'Mô tả ngắn',
    content: 'Nội dung dài',
    icon: 'LayoutTemplate',
    thumbnail: 'https://example.com/a.jpg',
    priceRange: 'Từ 5.000.000đ',
    processSteps: [{ step: 1, title: 'Khảo sát', desc: 'Bàn mục tiêu', duration: '2 ngày' }],
    faqs: [{ q: 'Bao lâu?', a: '2 tuần' }],
    isFeatured: true
  }),
  {
    title: 'Thiết kế website',
    slug: 'thiet-ke-website',
    shortDesc: 'Mô tả ngắn',
    content: 'Nội dung dài',
    icon: 'LayoutTemplate',
    thumbnail: 'https://example.com/a.jpg',
    priceRange: 'Từ 5.000.000đ',
    processSteps: [{ step: 1, title: 'Khảo sát', desc: 'Bàn mục tiêu', duration: '2 ngày' }],
    faqs: [{ q: 'Bao lâu?', a: '2 tuần' }],
    isFeatured: true
  }
);


/* --- 2. Tên field cũ trong CMS (tab Dịch vụ kỹ thuật) ------------------- */
check('normalizeServiceInput: priceEstimate ⇒ priceRange', normalizeServiceInput({ priceEstimate: '2.000.000đ' }), {
  priceRange: '2.000.000đ'
});
check(
  'normalizeServiceInput: process ⇒ processSteps (tự đánh số bước)',
  normalizeServiceInput({ process: [{ title: 'Khảo sát', desc: 'A' }, { title: 'Bàn giao', desc: 'B' }] }),
  {
    processSteps: [
      { step: 1, title: 'Khảo sát', desc: 'A' },
      { step: 2, title: 'Bàn giao', desc: 'B' }
    ]
  }
);
check('normalizeServiceInput: faq ⇒ faqs', normalizeServiceInput({ faq: [{ q: 'Hỏi', a: 'Đáp' }] }), {
  faqs: [{ q: 'Hỏi', a: 'Đáp' }]
});
check('normalizeServiceInput: priceRange ưu tiên hơn priceEstimate', normalizeServiceInput({ priceRange: 'Chuẩn', priceEstimate: 'Cũ' }), {
  priceRange: 'Chuẩn'
});
check(
  'normalizeServiceInput: processSteps ưu tiên hơn process',
  normalizeServiceInput({ processSteps: [{ step: 9, title: 'Chuẩn', desc: '' }], process: [{ title: 'Cũ' }] }),
  { processSteps: [{ step: 9, title: 'Chuẩn', desc: '' }] }
);
check(
  'normalizeServiceInput: bước giữ `step` gửi lên, không thì đánh số theo vị trí',
  normalizeServiceInput({ processSteps: [{ step: 7, title: 'A', desc: '' }, { title: 'B', desc: '' }] }),
  {
    processSteps: [
      { step: 7, title: 'A', desc: '' },
      { step: 2, title: 'B', desc: '' }
    ]
  }
);
check(
  'normalizeServiceInput: bỏ `duration` khi rỗng',
  normalizeServiceInput({ processSteps: [{ step: 1, title: 'A', desc: '', duration: '   ' }] }),
  { processSteps: [{ step: 1, title: 'A', desc: '' }] }
);

/* --- 3. PUT partial: không gửi thì không ghi đè ------------------------- */
check('normalizeServiceInput: {} ⇒ không field nào', normalizeServiceInput({}), {});
check('normalizeServiceInput: chỉ gửi isFeatured', normalizeServiceInput({ isFeatured: false }), { isFeatured: false });
check(
  'normalizeServiceInput: shortDesc/content rỗng VẪN được ghi (admin chủ động xoá)',
  normalizeServiceInput({ shortDesc: '', content: '' }),
  { shortDesc: '', content: '' }
);
check('normalizeServiceInput: title/slug rỗng hoặc chỉ khoảng trắng ⇒ bỏ qua', normalizeServiceInput({ title: '   ', slug: '' }), {});
check('normalizeServiceInput: mảng rỗng ⇒ xoá hết quy trình/FAQ', normalizeServiceInput({ processSteps: [], faqs: [] }), {
  processSteps: [],
  faqs: []
});


/* --- 4. Dữ liệu rác không làm sập server ------------------------------- */
check('normalizeServiceInput: null', normalizeServiceInput(null), {});
check('normalizeServiceInput: chuỗi phá hoại', normalizeServiceInput('phá hoại'), {});
check('normalizeServiceInput: mảng', normalizeServiceInput([1, 2, 3]), {});
check(
  'normalizeServiceInput: sai kiểu ở mọi field',
  normalizeServiceInput({ title: 5, processSteps: 3, faqs: 'x', priceRange: 9 }),
  {}
);
check(
  'normalizeServiceInput: phần tử quy trình/FAQ rác vẫn ra object hợp lệ',
  normalizeServiceInput({ process: [null, 'abc'], faq: [42] }),
  {
    processSteps: [
      { step: 1, title: '', desc: '' },
      { step: 2, title: '', desc: '' }
    ],
    faqs: [{ q: '', a: '' }]
  }
);

/* --- 5. Tạo service mới từ CMS ----------------------------------------- */
check('buildServiceFromInput: giá trị mặc định', buildServiceFromInput({}, 'srv-123'), {
  id: 'srv-123',
  title: '',
  slug: 'srv-123',
  shortDesc: '',
  content: '',
  icon: 'Wrench',
  thumbnail: '',
  priceRange: 'Liên hệ',
  processSteps: [],
  faqs: [],
  isFeatured: false
});
check(
  'buildServiceFromInput: nhận cả tên field cũ',
  buildServiceFromInput({ title: 'Sửa chữa', priceEstimate: 'Từ 200.000đ', faq: [{ q: 'Q', a: 'A' }] }, 'srv-9'),
  {
    id: 'srv-9',
    title: 'Sửa chữa',
    slug: 'srv-9',
    shortDesc: '',
    content: '',
    icon: 'Wrench',
    thumbnail: '',
    priceRange: 'Từ 200.000đ',
    processSteps: [],
    faqs: [{ q: 'Q', a: 'A' }],
    isFeatured: false
  }
);


/* --- 6. Seed dùng chung với trang public ------------------------------- */
check('WEB_DESIGN_SERVICE_SLUG', WEB_DESIGN_SERVICE_SLUG, 'thiet-ke-website');
check('seed: id cố định', WEB_DESIGN_SERVICE_SEED.id, 'srv-web-design');
check('seed: slug khớp hằng số', WEB_DESIGN_SERVICE_SEED.slug, WEB_DESIGN_SERVICE_SLUG);
check('seed: title = H1 tĩnh của trang', WEB_DESIGN_SERVICE_SEED.title, WEB_DESIGN_PAGE_TITLE);
check('seed: shortDesc = mô tả tĩnh của trang', WEB_DESIGN_SERVICE_SEED.shortDesc, WEB_DESIGN_PAGE_DESC);
check('seed: là dịch vụ nổi bật', WEB_DESIGN_SERVICE_SEED.isFeatured, true);
check('seed: số bước = WEB_DESIGN_STEPS', WEB_DESIGN_SERVICE_SEED.processSteps.length, WEB_DESIGN_STEPS.length);
check('seed: số FAQ = WEB_DESIGN_FAQS', WEB_DESIGN_SERVICE_SEED.faqs.length, WEB_DESIGN_FAQS.length);
check('seed: bước đầu khớp nội dung tĩnh', WEB_DESIGN_SERVICE_SEED.processSteps[0], WEB_DESIGN_STEPS[0]);
check(
  'seed: FAQ cuối khớp nội dung tĩnh',
  WEB_DESIGN_SERVICE_SEED.faqs[WEB_DESIGN_FAQS.length - 1],
  WEB_DESIGN_FAQS[WEB_DESIGN_FAQS.length - 1]
);

const priced = WEB_DESIGN_PACKAGES.map(pkg => pkg.price).filter((price): price is number => price !== null);
check(
  'WEB_DESIGN_SERVICE_PRICE_RANGE: suy ra từ bảng giá (định dạng tiền vi-VN, không gõ tay)',
  WEB_DESIGN_SERVICE_PRICE_RANGE,
  `Từ ${formatVnd(priced[0])} - ${formatVnd(priced[priced.length - 1])}`
);
check(
  'Khung giá dùng ĐÚNG một ký hiệu tiền tệ (bug cũ ghép "đ" sau formatVnd ⇒ "₫đ")',
  [WEB_DESIGN_SERVICE_PRICE_RANGE.includes('₫đ'), (WEB_DESIGN_SERVICE_PRICE_RANGE.match(/₫/g) || []).length],
  [false, 2]
);
check('seed: priceRange = khung giá suy ra', WEB_DESIGN_SERVICE_SEED.priceRange, WEB_DESIGN_SERVICE_PRICE_RANGE);
check(
  'seed: round-trip qua normalizeServiceInput không mất dữ liệu',
  normalizeServiceInput(WEB_DESIGN_SERVICE_SEED),
  { ...WEB_DESIGN_SERVICE_SEED, id: undefined }
);

console.log(
  failed === 0
    ? `\nOK: ${passed}/${passed} assertion PASS (P2.3 — server/service.ts + seed trang thiết kế website).`
    : `\n${failed} assertion KHONG dat (${passed} PASS).`
);
process.exit(failed === 0 ? 0 : 1);
