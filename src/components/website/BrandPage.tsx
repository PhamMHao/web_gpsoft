/**
 * P2.1 — Trang **thương hiệu** `/thuong-hieu/:slug`.
 *
 * Lớp mỏng định danh route; logic dùng chung ở `CatalogListingPage` (`kind="brand"`).
 * Slug lấy từ `activeBrandSlug` của context (đồng bộ từ `parsePath`).
 */
import React from 'react';
import { CatalogListingPage } from './CatalogListingPage.tsx';

export const BrandPage: React.FC = () => <CatalogListingPage kind="brand" />;
