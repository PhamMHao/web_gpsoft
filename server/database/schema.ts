import type { SqlColumnTypes } from './driver.js';

/**
 * Relational table definitions for every entity in the CMS.
 *
 * The old design stored each record as a JSON blob in a single `data` column,
 * which cannot be indexed, filtered or reported on. Every attribute is now a
 * real column:
 *  - fixed nested objects are flattened  (`seo.metaTitle` -> `seo_meta_title`,
 *    `address.province` -> `address_province`);
 *  - repeated structures live in child tables keyed by the owner id plus index
 *    columns, so list order survives a save/load round trip;
 *  - key/value maps (`specs`, variant `attributes`) become name/value child rows.
 */

export type ColumnKind = 'id' | 'text' | 'int' | 'decimal' | 'bool' | 'datetime';

export interface ColumnDef {
  /** Dotted path into the entity; `$key`/`$value` address map entries. */
  field: string;
  kind: ColumnKind;
  /** SQL column name; defaults to snake_case(field). */
  column?: string;
  /** Optional entity field: NULL means the key is left out when loading. */
  nullable?: boolean;
}

export interface ChildDef {
  table: string;
  /** Dotted path to the parent collection ('' = the entity itself). */
  path: string;
  /** When set, rows hang off each item of `path` (two level structure). */
  itemsField?: string;
  ownerColumn: string;
  indexColumns: string[];
  columns: ColumnDef[];
  /** `object` rebuilds a Record<string, string>, `array` rebuilds a list. */
  shape?: 'array' | 'object';
  /** Emit an empty list/object when there are no rows. */
  alwaysInclude?: boolean;
}

export interface CollectionDef {
  table: string;
  idColumn: string;
  orderColumn: string;
  columns: ColumnDef[];
  children: ChildDef[];
}

export interface SingletonDef {
  table: string;
  keyColumn: string;
  columns: ColumnDef[];
  children: ChildDef[];
}

export const SORT_COLUMN = 'sort_index';
export const SINGLETON_KEY = 'singleton';
export const LEGACY_JSON_COLUMN = 'data';

/** SQL table name -> key of `DatabaseSchema` (`product_reviews` -> `reviews`). */
export const SCHEMA_KEYS: Record<string, string> = {
  users: 'users',
  roles: 'roles',
  categories: 'categories',
  brands: 'brands',
  products: 'products',
  product_reviews: 'reviews',
  orders: 'orders',
  customers: 'customers',
  leads: 'leads',
  warranties: 'warranties',
  price_quotes: 'priceQuotes',
  quote_links: 'quoteLinks',
  // P1.7/P1.8/P1.9 — thương mại: mã giảm giá, phương thức vận chuyển, chiến dịch.
  coupons: 'coupons',
  shipping_methods: 'shippingMethods',
  campaigns: 'campaigns',
  post_categories: 'postCategories',
  posts: 'posts',
  services: 'services',
  banners: 'banners',
  menus: 'menus',
  pages: 'pages',
  media_files: 'mediaFiles',
  app_settings: 'settings',
  seo_settings: 'seoSettings'
};

export function schemaKey(table: string): string {
  return SCHEMA_KEYS[table] ?? table;
}

export function toSnake(value: string): string {
  return value
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

export function columnName(def: ColumnDef): string {
  return def.column ?? toSnake(def.field);
}

const c = (field: string, kind: ColumnKind): ColumnDef => ({ field, kind });
const opt = (field: string, kind: ColumnKind = 'text'): ColumnDef => ({ field, kind, nullable: true });
const none: ChildDef[] = [];

export const COLLECTIONS: CollectionDef[] = [
  {
    table: 'users',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('username', 'text'),
      c('fullName', 'text'),
      c('email', 'text'),
      opt('avatar'),
      c('role', 'text'),
      opt('passwordHash'),
      opt('lastLoginAt', 'datetime'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'user_permissions',
        path: 'permissions',
        ownerColumn: 'user_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'permission', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'roles',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [c('id', 'id'), c('name', 'text'), c('description', 'text')],
    children: [
      {
        table: 'role_permissions',
        path: 'permissions',
        ownerColumn: 'role_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'permission', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'categories',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      c('slug', 'text'),
      opt('icon'),
      opt('image'),
      opt('description'),
      opt('parentId', 'id'),
      c('sortOrder', 'int'),
      c('isActive', 'bool')
    ],
    children: none
  },
  {
    table: 'brands',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      c('slug', 'text'),
      c('logo', 'text'),
      c('country', 'text'),
      opt('website'),
      opt('description'),
      c('isActive', 'bool')
    ],
    children: none
  },
  {
    table: 'products',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      c('slug', 'text'),
      c('sku', 'text'),
      c('categoryId', 'id'),
      c('brandId', 'id'),
      c('originalPrice', 'decimal'),
      c('salePrice', 'decimal'),
      c('condition', 'text'),
      c('stock', 'int'),
      c('shortDesc', 'text'),
      c('description', 'text'),
      c('thumbnail', 'text'),
      c('isFeatured', 'bool'),
      c('isNew', 'bool'),
      c('status', 'text'),
      c('seo.metaTitle', 'text'),
      c('seo.metaDesc', 'text'),
      c('seo.metaKeywords', 'text'),
      c('viewCount', 'int'),
      c('createdAt', 'datetime'),
      c('updatedAt', 'datetime')
    ],
    children: [
      {
        table: 'product_specs',
        path: 'specs',
        ownerColumn: 'product_id',
        indexColumns: ['item_index'],
        columns: [
          { field: '$key', column: 'spec_name', kind: 'text' },
          { field: '$value', column: 'spec_value', kind: 'text' }
        ],
        shape: 'object',
        alwaysInclude: true
      },
      {
        table: 'product_attributes',
        path: 'attributes',
        ownerColumn: 'product_id',
        indexColumns: ['item_index'],
        columns: [c('name', 'text')],
        alwaysInclude: true
      },
      {
        table: 'product_attribute_options',
        path: 'attributes',
        itemsField: 'options',
        ownerColumn: 'product_id',
        indexColumns: ['attribute_index', 'item_index'],
        columns: [{ field: '$value', column: 'option_value', kind: 'text' }]
      },
      {
        table: 'product_variants',
        path: 'variants',
        ownerColumn: 'product_id',
        indexColumns: ['item_index'],
        columns: [
          c('id', 'id'),
          c('title', 'text'),
          c('sku', 'text'),
          c('price', 'decimal'),
          opt('originalPrice', 'decimal'),
          c('stock', 'int'),
          opt('image')
        ],
        alwaysInclude: true
      },
      {
        table: 'product_variant_attributes',
        path: 'variants',
        itemsField: 'attributes',
        ownerColumn: 'product_id',
        indexColumns: ['variant_index', 'item_index'],
        columns: [
          { field: '$key', column: 'attribute_name', kind: 'text' },
          { field: '$value', column: 'attribute_value', kind: 'text' }
        ],
        shape: 'object',
        alwaysInclude: true
      },
      {
        table: 'product_gallery',
        path: 'gallery',
        ownerColumn: 'product_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'url', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'product_reviews',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('productId', 'id'),
      c('userName', 'text'),
      opt('userEmail'),
      opt('userPhone'),
      opt('userAvatar'),
      c('rating', 'int'),
      opt('title'),
      c('comment', 'text'),
      opt('variantTitle'),
      c('isVerifiedPurchase', 'bool'),
      c('helpfulCount', 'int'),
      opt('adminReply.author'),
      opt('adminReply.content'),
      opt('adminReply.createdAt', 'datetime'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'review_tags',
        path: 'tags',
        ownerColumn: 'review_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'tag', kind: 'text' }]
      }
    ]
  },
  {
    table: 'orders',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('orderCode', 'text'),
      c('customerName', 'text'),
      c('phone', 'text'),
      c('email', 'text'),
      c('address.province', 'text'),
      c('address.district', 'text'),
      c('address.ward', 'text'),
      c('address.street', 'text'),
      c('subtotal', 'decimal'),
      c('shippingFee', 'decimal'),
      c('discount', 'decimal'),
      c('total', 'decimal'),
      c('paymentMethod', 'text'),
      c('paymentStatus', 'text'),
      c('status', 'text'),
      opt('note'),
      // P1.7/P1.8 — mã giảm giá + phương thức vận chuyển đã áp cho đơn (server tính lại tiền).
      opt('couponCode'),
      opt('shippingMethodId'),
      opt('shippingMethod'),
      c('createdAt', 'datetime'),
      c('updatedAt', 'datetime')
    ],
    children: [
      {
        table: 'order_items',
        path: 'items',
        ownerColumn: 'order_id',
        indexColumns: ['item_index'],
        columns: [
          c('productId', 'id'),
          opt('variantId', 'id'),
          c('title', 'text'),
          c('sku', 'text'),
          c('price', 'decimal'),
          c('quantity', 'int'),
          c('thumbnail', 'text')
        ],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'customers',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      c('email', 'text'),
      c('phone', 'text'),
      c('address', 'text'),
      opt('province'),
      c('totalSpent', 'decimal'),
      c('orderCount', 'int'),
      opt('lastOrderAt', 'datetime'),
      opt('notes'),
      c('createdAt', 'datetime')
    ],
    children: none
  },
  {
    table: 'leads',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('type', 'text'),
      opt('name'),
      opt('email'),
      opt('phone'),
      opt('subject'),
      opt('message'),
      opt('interestedProduct'),
      // P2.3 — nguồn lead (`website` mặc định, `web-design` cho dịch vụ thiết kế website).
      opt('source'),
      c('status', 'text'),
      opt('adminNote'),
      c('createdAt', 'datetime')
    ],
    children: none
  },
  {
    // P1.1 — phiếu bảo hành / tiếp nhận sửa chữa.
    // Dùng `warrantyType` (KHÔNG dùng `type`) để tránh trùng từ khoá/khoá ngoại SQL.
    table: 'warranties',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('code', 'text'),
      c('customerName', 'text'),
      c('phone', 'text'),
      opt('email'),
      c('productId', 'id'),
      c('productName', 'text'),
      opt('serialNumber'),
      c('purchaseDate', 'datetime'),
      c('startDate', 'datetime'),
      c('endDate', 'datetime'),
      c('warrantyMonths', 'int'),
      c('warrantyType', 'text'),
      c('status', 'text'),
      c('issue', 'text'),
      opt('diagnosis'),
      opt('resolution'),
      opt('technician'),
      opt('cost', 'decimal'),
      opt('receivedAt', 'datetime'),
      opt('returnedAt', 'datetime'),
      c('createdAt', 'datetime')
    ],
    children: none
  },
  {
    // P1.4 — báo giá (B2B) + P1.5 link chia sẻ cho khách xem online.
    // `items` là bảng con nên `total` của báo giá LUÔN được server tính lại từ `qty × unitPrice`.
    table: 'price_quotes',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('code', 'text'),
      c('title', 'text'),
      c('customerName', 'text'),
      c('phone', 'text'),
      opt('email'),
      opt('company'),
      opt('note'),
      c('total', 'decimal'),
      c('status', 'text'),
      c('validUntil', 'datetime'),
      c('createdBy', 'text'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'price_quote_items',
        path: 'items',
        ownerColumn: 'quote_id',
        indexColumns: ['item_index'],
        columns: [
          c('name', 'text'),
          opt('spec'),
          c('unit', 'text'),
          c('qty', 'int'),
          c('unitPrice', 'decimal'),
          c('total', 'decimal')
        ],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'quote_links',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('code', 'text'),
      c('quoteId', 'id'),
      opt('password'),
      c('expiresAt', 'datetime'),
      c('viewCount', 'int'),
      c('isActive', 'int'),
      c('createdAt', 'datetime')
    ],
    children: none
  },
  {
    // P1.7 — mã giảm giá thật (thay hardcode trong `CartDrawer`/`CheckoutModal`).
    // `applyIds` là bảng con (`coupon_apply_ids`) ⇒ phạm vi áp dụng giữ được khi lưu/đọc lại.
    // `usedCount` server tự tăng trong `POST /orders`, KHÔNG nhận từ client.
    table: 'coupons',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('code', 'text'),
      c('name', 'text'),
      c('discountType', 'text'),
      c('value', 'decimal'),
      c('minOrder', 'decimal'),
      opt('maxDiscount', 'decimal'),
      c('usageLimit', 'int'),
      c('usedCount', 'int'),
      opt('startAt', 'datetime'),
      opt('endAt', 'datetime'),
      c('applyTo', 'text'),
      c('isActive', 'int'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'coupon_apply_ids',
        path: 'applyIds',
        ownerColumn: 'coupon_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'apply_id', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    // P1.8 — phương thức vận chuyển (thay hardcode freeship 1.000.000đ / phí 30.000đ).
    // `freeFrom = 0` ⇒ luôn thu `fee`; `regions` là bảng con (`shipping_method_regions`).
    table: 'shipping_methods',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      opt('description'),
      c('fee', 'decimal'),
      c('freeFrom', 'decimal'),
      c('estimatedDays', 'text'),
      c('isActive', 'int'),
      c('sortOrder', 'int')
    ],
    children: [
      {
        table: 'shipping_method_regions',
        path: 'regions',
        ownerColumn: 'method_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'region', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    // P1.9 — chiến dịch / flash sale động (countdown đọc từ `endAt`, không hardcode trong HomePage).
    // `productIds` là bảng con (`campaign_products`); rỗng ⇒ campaign áp cho mọi sản phẩm đang giảm giá.
    table: 'campaigns',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('name', 'text'),
      c('type', 'text'),
      opt('startAt', 'datetime'),
      opt('endAt', 'datetime'),
      opt('discountPercent', 'int'),
      opt('bannerImage'),
      opt('ctaText'),
      opt('ctaUrl'),
      c('isActive', 'int'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'campaign_products',
        path: 'productIds',
        ownerColumn: 'campaign_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'product_id', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'post_categories',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [c('id', 'id'), c('name', 'text'), c('slug', 'text'), opt('description')],
    children: none
  },
  {
    table: 'posts',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('title', 'text'),
      c('slug', 'text'),
      c('category', 'text'),
      c('excerpt', 'text'),
      c('content', 'text'),
      c('thumbnail', 'text'),
      c('author', 'text'),
      c('isFeatured', 'bool'),
      c('viewCount', 'int'),
      c('seo.metaTitle', 'text'),
      c('seo.metaDesc', 'text'),
      c('status', 'text'),
      c('publishedAt', 'datetime'),
      c('createdAt', 'datetime')
    ],
    children: [
      {
        table: 'post_tags',
        path: 'tags',
        ownerColumn: 'post_id',
        indexColumns: ['item_index'],
        columns: [{ field: '$value', column: 'tag', kind: 'text' }],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'services',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('title', 'text'),
      c('slug', 'text'),
      c('shortDesc', 'text'),
      c('content', 'text'),
      c('icon', 'text'),
      c('thumbnail', 'text'),
      c('priceRange', 'text'),
      c('isFeatured', 'bool')
    ],
    children: [
      {
        table: 'service_process_steps',
        path: 'processSteps',
        ownerColumn: 'service_id',
        indexColumns: ['item_index'],
        columns: [
          c('step', 'int'),
          c('title', 'text'),
          { field: 'desc', column: 'step_desc', kind: 'text' }
        ],
        alwaysInclude: true
      },
      {
        table: 'service_faqs',
        path: 'faqs',
        ownerColumn: 'service_id',
        indexColumns: ['item_index'],
        columns: [c('q', 'text'), c('a', 'text')],
        alwaysInclude: true
      }
    ]
  },
  {
    table: 'banners',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('title', 'text'),
      c('subtitle', 'text'),
      c('imageUrl', 'text'),
      c('linkUrl', 'text'),
      c('buttonText', 'text'),
      c('position', 'text'),
      c('sortOrder', 'int'),
      c('isActive', 'bool')
    ],
    children: none
  },
  {
    table: 'menus',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [c('id', 'id'), c('title', 'text'), c('location', 'text')],
    children: [
      {
        table: 'menu_items',
        path: 'items',
        ownerColumn: 'menu_id',
        indexColumns: ['item_index'],
        columns: [c('id', 'id'), c('label', 'text'), c('url', 'text'), opt('icon'), opt('target')],
        alwaysInclude: true
      },
      {
        table: 'menu_item_children',
        path: 'items',
        itemsField: 'children',
        ownerColumn: 'menu_id',
        indexColumns: ['item_index', 'child_index'],
        columns: [c('id', 'id'), c('label', 'text'), c('url', 'text')]
      }
    ]
  },
  {
    table: 'pages',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('title', 'text'),
      c('slug', 'text'),
      c('content', 'text'),
      c('isPublished', 'bool'),
      c('seo.metaTitle', 'text'),
      c('seo.metaDesc', 'text'),
      c('updatedAt', 'datetime')
    ],
    children: none
  },
  {
    table: 'media_files',
    idColumn: 'id',
    orderColumn: SORT_COLUMN,
    columns: [
      c('id', 'id'),
      c('filename', 'text'),
      c('originalName', 'text'),
      c('mimeType', 'text'),
      c('size', 'int'),
      c('url', 'text'),
      c('category', 'text'),
      c('uploadedAt', 'datetime'),
      c('provider', 'text')
    ],
    children: none
  }
];

export const SINGLETONS: SingletonDef[] = [
  {
    table: 'app_settings',
    keyColumn: 'key',
    columns: [
      c('companyName', 'text'),
      c('slogan', 'text'),
      c('logo', 'text'),
      c('favicon', 'text'),
      c('hotline', 'text'),
      c('hotline2', 'text'),
      c('email', 'text'),
      c('supportEmail', 'text'),
      c('address', 'text'),
      c('showroom', 'text'),
      c('googleMapsEmbedUrl', 'text'),
      c('socials.facebook', 'text'),
      c('socials.zalo', 'text'),
      c('socials.youtube', 'text'),
      c('socials.tiktok', 'text'),
      c('bankInfo.bankName', 'text'),
      c('bankInfo.bankCode', 'text'),
      c('bankInfo.accountNumber', 'text'),
      c('bankInfo.accountHolder', 'text'),
      c('bankInfo.branch', 'text'),
      c('bankInfo.qrTemplate', 'text'),
      c('footerBio', 'text'),
      c('copyright', 'text')
    ],
    children: none
  },
  {
    table: 'seo_settings',
    keyColumn: 'key',
    columns: [
      c('defaultTitle', 'text'),
      c('defaultDescription', 'text'),
      c('defaultKeywords', 'text'),
      c('ogImage', 'text'),
      c('robotsTxt', 'text'),
      c('sitemapAuto', 'bool')
    ],
    children: [
      {
        table: 'seo_redirects',
        path: 'redirects',
        ownerColumn: 'setting_key',
        indexColumns: ['item_index'],
        columns: [
          c('id', 'id'),
          c('fromPath', 'text'),
          c('toPath', 'text'),
          c('code', 'int'),
          c('isActive', 'bool')
        ],
        alwaysInclude: true
      }
    ]
  }
];

export interface DdlDialect {
  readonly types: SqlColumnTypes;
  quoteIdent(identifier: string): string;
}

function columnSql(def: ColumnDef, dialect: DdlDialect, notNull = false): string {
  const name = dialect.quoteIdent(columnName(def));
  return `${name} ${dialect.types[def.kind]}${notNull ? ' NOT NULL' : ''}`;
}

/** `CREATE TABLE` for an entity collection (id primary key + ordering column). */
export function collectionDdl(def: CollectionDef, dialect: DdlDialect): string {
  const columns = def.columns.map((col) =>
    columnSql(col, dialect, columnName(col) === def.idColumn)
  );
  columns.push(`${dialect.quoteIdent(def.orderColumn)} ${dialect.types.int} NOT NULL`);
  return (
    `CREATE TABLE ${dialect.quoteIdent(def.table)} (\n    ${columns.join(',\n    ')},\n` +
    `    PRIMARY KEY (${dialect.quoteIdent(def.idColumn)})\n  )`
  );
}

/** `CREATE TABLE` for a child table (composite key keeps list order). */
export function childDdl(child: ChildDef, dialect: DdlDialect): string {
  const columns = [
    `${dialect.quoteIdent(child.ownerColumn)} ${dialect.types.id} NOT NULL`,
    ...child.indexColumns.map((ix) => `${dialect.quoteIdent(ix)} ${dialect.types.int} NOT NULL`),
    ...child.columns.map((col) => columnSql(col, dialect))
  ];
  const key = [child.ownerColumn, ...child.indexColumns]
    .map((name) => dialect.quoteIdent(name))
    .join(', ');
  return `CREATE TABLE ${dialect.quoteIdent(child.table)} (\n    ${columns.join(',\n    ')},\n    PRIMARY KEY (${key})\n  )`;
}

/** `CREATE TABLE` for a single-row settings table. */
export function singletonDdl(def: SingletonDef, dialect: DdlDialect): string {
  const columns = [
    `${dialect.quoteIdent(def.keyColumn)} ${dialect.types.id} NOT NULL`,
    ...def.columns.map((col) => columnSql(col, dialect))
  ];
  return (
    `CREATE TABLE ${dialect.quoteIdent(def.table)} (\n    ${columns.join(',\n    ')},\n` +
    `    PRIMARY KEY (${dialect.quoteIdent(def.keyColumn)})\n  )`
  );
}

/** `ALTER TABLE ... ADD` used to upgrade an existing table with new fields. */
export function addColumnSql(table: string, def: ColumnDef, dialect: DdlDialect): string {
  return `ALTER TABLE ${dialect.quoteIdent(table)} ADD ${columnSql(def, dialect)}`;
}

/** Every child table definition of the whole schema. */
export function allChildren(): ChildDef[] {
  return [
    ...COLLECTIONS.flatMap((def) => def.children),
    ...SINGLETONS.flatMap((def) => def.children)
  ];
}

/** Every physical table name of the whole schema. */
export function allTables(): string[] {
  return [
    ...COLLECTIONS.map((def) => def.table),
    ...SINGLETONS.map((def) => def.table),
    ...allChildren().map((child) => child.table)
  ];
}
