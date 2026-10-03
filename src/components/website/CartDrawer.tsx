import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  X,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Tag,
  Check
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';
// P1.8 — nhãn phí ship/gợi ý freeship phản chiếu công thức của `server/shipping.ts`.
import { shippingFeeLabel, shippingFreeHint } from '../../utils/commerce.ts';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
    setIsCheckoutOpen,
    showToast,
    setWebsitePage,
    // P1.7 — mã giảm giá (validate ở server, dùng chung với CheckoutModal).
    coupon,
    couponError,
    applyingCoupon,
    applyCoupon,
    removeCoupon,
    discount,
    // P1.8 — phương thức vận chuyển + phí ship tính theo `fee`/`freeFrom` từ CMS.
    shippingMethods,
    shippingMethodId,
    setShippingMethodId,
    shippingFee,
    orderTotal
  } = useApp();

  const [couponCode, setCouponCode] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const applied = await applyCoupon(couponCode);
    if (applied) setCouponCode('');
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C86EE]/15 text-[#1C86EE] flex items-center justify-center font-bold">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Giỏ Hàng Của Bạn</h3>
                <p className="text-xs text-slate-500 font-medium">{cartCount} sản phẩm đã chọn</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Giỏ hàng của bạn đang trống</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Hãy dạo xem các sản phẩm công nghệ chính hãng và chọn món đồ bạn yêu thích nhé!
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setWebsitePage('products');
                  }}
                  className="px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] cursor-pointer shadow-md shadow-[#1C86EE]/20"
                >
                  Khám Phá Sản Phẩm Ngay
                </button>
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100">
                {cart.map((item, idx) => {
                  const itemPrice = item.variant ? item.variant.price : item.product.salePrice;
                  const itemLineTotal = itemPrice * item.quantity;

                  return (
                    <div key={`${item.product.id}-${item.variant?.id || idx}`} className="pt-3 first:pt-0 flex gap-3">
                      <img
                        src={item.product.thumbnail}
                        alt={item.product.name}
                        className="w-16 h-16 object-contain rounded-xl bg-[#FFFDF0] border border-slate-200/80 p-1 shrink-0"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.variant && (
                          <div className="text-[11px] text-[#1C86EE] font-semibold">
                            Phiên bản: {item.variant.title}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs font-bold text-[#1C86EE]">
                            {formatVnd(itemPrice)}
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                            <button
                              onClick={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                              className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-slate-900 min-w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                              className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 text-right">
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-slate-400 hover:text-rose-500 font-medium cursor-pointer"
                  >
                    Xóa tất cả giỏ hàng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-[#FFFEEA]/50 space-y-4">
              {/* Coupon input */}
              <form onSubmit={handleApplyCoupon} className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Mã giảm giá (VD: VIP10)"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#1C86EE]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={applyingCoupon}
                    className="px-3 py-2 bg-[#1C86EE] hover:bg-[#1472CE] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    {applyingCoupon ? 'Đang kiểm…' : 'Áp dụng'}
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-rose-500 font-medium">{couponError}</p>}
                {coupon && discount > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Mã {coupon.code}: giảm {formatVnd(discount)} cho đơn này</span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="ml-1 text-slate-400 hover:text-rose-500 font-bold cursor-pointer"
                    >
                      Bỏ mã
                    </button>
                  </p>
                )}
              </form>

              {/* P1.8 — chọn phương thức vận chuyển (phí đọc từ CMS, không hardcode) */}
              {shippingMethods.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Phương thức vận chuyển
                  </p>
                  {shippingMethods.map(method => (
                    <label
                      key={method.id}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        shippingMethodId === method.id
                          ? 'border-[#1C86EE] bg-[#1C86EE]/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethodId === method.id}
                        onChange={() => setShippingMethodId(method.id)}
                        className="mt-0.5 text-[#1C86EE]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{method.name}</span>
                          <span className="text-xs font-bold text-[#1C86EE] shrink-0">
                            {shippingFeeLabel(method, cartTotal)}
                          </span>
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {method.estimatedDays}
                          {method.description ? ` • ${method.description}` : ''}
                        </span>
                        {shippingFreeHint(method, cartTotal) && (
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            {shippingFreeHint(method, cartTotal)}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Price summary */}
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200/60 pt-3">
                <div className="flex justify-between">
                  <span>Tạm tính hàng:</span>
                  <span className="font-semibold text-slate-900">{formatVnd(cartTotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Mã ưu đãi giảm{coupon ? ` (${coupon.code})` : ''}:</span>
                    <span>-{formatVnd(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span className="font-semibold text-slate-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">Miễn phí ship</span>
                    ) : (
                      formatVnd(shippingFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base text-[#1C86EE]">{formatVnd(orderTotal)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedCheckout}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-sm shadow-lg shadow-[#1C86EE]/25 transition-all cursor-pointer"
              >
                <span>Tiến Hành Đặt Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bảo mật đơn hàng 100% • Hỗ trợ kiểm tra khi nhận</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
