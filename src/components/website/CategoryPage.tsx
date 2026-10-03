/**
 * P2.1 — Trang **danh mục** `/danh-muc/:slug` (2 cấp).
 *
 * Chỉ là lớp mỏng định danh route ⇒ toàn bộ logic nằm ở `CatalogListingPage` (dùng chung với
 * trang thương hiệu, tránh nhân đôi ~700 dòng UI). Slug lấy từ `activeCategorySlug` của context
 * (đồng bộ từ `parsePath`), không dùng `useParams` vì app điều hướng bằng state + URL thật.
 */
import React from 'react';
import { CatalogListingPage } from './CatalogListingPage.tsx';

export const CategoryPage: React.FC = () => <CatalogListingPage kind="category" />;
