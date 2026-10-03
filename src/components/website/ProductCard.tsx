import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { pathFor } from '../../utils/url.ts';
import { ShoppingCart, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useApp();

  const discountPercent =
    product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : undefined;
    addToCart(product, defaultVariant, 1);
  };

  return (
    <Link
      to={pathFor('product-detail', { productSlug: product.slug || product.id })}
      className="group bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 hover:shadow-xl hover:border-[#1C86EE]/40 transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
    >
      {/* Top Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start">
        {discountPercent > 0 && (
          <span className="bg-rose-600 text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
            -{discountPercent}%
          </span>
        )}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            product.condition === 'new'
              ? 'bg-[#1C86EE] text-white'
              : product.condition === 'like_new'
              ? 'bg-[#5CACEE] text-slate-950 font-bold'
              : 'bg-amber-600 text-white'
          }`}
        >
          {product.condition === 'new'
            ? 'Mới 100%'
            : product.condition === 'like_new'
            ? 'Like New 99%'
            : 'Đã qua sử dụng'}
        </span>
      </div>

      {/* Image with hover zoom */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FFFDF0] mb-3 flex items-center justify-center p-2">
        <img
          src={product.thumbnail}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Quick View Button overlay on desktop */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/95 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-xs">
            <Eye className="w-3.5 h-3.5 text-[#1C86EE]" />
            <span>Xem chi tiết</span>
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>SKU: {product.sku}</span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1C86EE] transition-colors line-clamp-2 mt-1">
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-normal">
            {product.shortDesc}
          </p>
        </div>

        {/* Pricing & Stock */}
        <div className="pt-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-extrabold text-[#1C86EE]">
              {formatVnd(product.salePrice)}
            </span>
            {product.originalPrice > product.salePrice && (
              <span className="text-xs text-slate-400 line-through">
                {formatVnd(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Stock indicator & Action button */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[11px]">
              {product.stock > 0 ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Còn {product.stock} máy</span>
                </span>
              ) : (
                <span className="text-rose-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Tạm hết</span>
                </span>
              )}
            </div>

            <button
              onClick={handleQuickAdd}
              disabled={product.stock <= 0}
              className="px-2.5 py-1.5 bg-[#1C86EE]/10 hover:bg-[#1C86EE] text-[#1C86EE] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Thêm vào giỏ hàng"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chọn mua</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};
