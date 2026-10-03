import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { OrderItem, PaymentMethod } from '../../types/index.ts';
import {
  X,
  CreditCard,
  Truck,
  CheckCircle2,
  Copy,
  Check,
  Building,
  ShieldCheck,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotal,
    clearCart,
    settings,
    showToast,
    setIsTrackingOpen,
    setTrackingOrderCode,
    // P1.7/P1.8 — mã giảm giá + phương thức vận chuyển do `AppContext` giữ (dùng chung với CartDrawer).
    coupon,
    discount,
    shippingFee,
    orderTotal,
    shippingMethods,
    shippingMethodId
  } = useApp();

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street: '',
    note: '',
    paymentMethod: 'cod' as PaymentMethod
  });

  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);

  if (!isCheckoutOpen) return null;

  // P1.7/P1.8 — tổng tiền lấy từ `AppContext` (mã giảm giá đã validate + phí ship theo phương thức
  // khách chọn). Khi tạo đơn, server vẫn tính LẠI cả 2 khoản từ `couponCode`/`shippingMethodId`.
  const selectedShippingMethod = shippingMethods.find(m => m.id === shippingMethodId);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.phone || !form.street) {
      showToast('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng!', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const items: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        variantId: item.variant?.id,
        title: item.variant ? `${item.product.name} (${item.variant.title})` : item.product.name,
        sku: item.variant ? item.variant.sku : item.product.sku,
        price: item.variant ? item.variant.price : item.product.salePrice,
        quantity: item.quantity,
        thumbnail: item.product.thumbnail
      }));

      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        email: form.email,
        address: {
          province: form.province,
          district: form.district,
          ward: form.ward,
          street: form.street
        },
        items,
        subtotal: cartTotal,
        // P1.7/P1.8 — gửi MÃ và PHƯƠNG THỨC; tiền (`discount`, `shippingFee`, `total`) chỉ để
        // hiển thị/tham khảo, server tính lại từ `couponCode` + `shippingMethodId` khi lưu đơn.
        couponCode: coupon?.code,
        shippingMethodId: shippingMethodId || undefined,
        shippingMethod: selectedShippingMethod?.name,
        shippingFee,
        discount,
        total: orderTotal,
        paymentMethod: form.paymentMethod,
        note: form.note
      };

      const res = await api.createOrder(payload);
      if (res.success && res.data) {
        setCompletedOrder(res.data);
        clearCart();
        showToast('Đặt hàng thành công!', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Có lỗi xảy ra khi tạo đơn hàng.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyBankAccount = () => {
    if (!settings?.bankInfo) return;
    navigator.clipboard.writeText(settings.bankInfo.accountNumber);
    setCopiedBank(true);
    showToast('Đã sao chép số tài khoản!', 'success');
    setTimeout(() => setCopiedBank(false), 3000);
  };

  // VietQR URL generator for live QR banking
  const getVietQrUrl = (amount: number, orderCode: string) => {
    const bank = settings?.bankInfo?.bankCode || 'MB';
    const acc = settings?.bankInfo?.accountNumber || '0988888888';
    const name = encodeURIComponent(settings?.bankInfo?.accountHolder || 'CONG TY GPSOFT');
    const memo = encodeURIComponent(`GPSOFT ${orderCode}`);
    return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=${name}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#FFFEEA]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1C86EE] to-[#5CACEE] text-white flex items-center justify-center font-bold shadow-md shadow-[#1C86EE]/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {completedOrder ? 'Xác Nhận Đơn Hàng' : 'Thanh Toán Đơn Hàng'}
              </h3>
              <p className="text-xs text-slate-500">
                {completedOrder
                  ? 'Đơn hàng của quý khách đã được lưu trên hệ thống'
                  : 'Vui lòng xác nhận thông tin giao nhận hàng hóa'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsCheckoutOpen(false);
              setCompletedOrder(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {completedOrder ? (
          // Order Success State
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-slate-900">
                Đặt Hàng Thành Công!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Mã đơn hàng của bạn là:{' '}
                <span className="font-mono font-bold text-[#1C86EE] text-base">
                  {completedOrder.orderCode}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Tổng thanh toán:{' '}
                <strong className="text-slate-800 font-bold">{formatVnd(completedOrder.total)}</strong> (
                {completedOrder.paymentMethod === 'cod' ? 'Thanh toán COD khi nhận' : 'Chuyển khoản VietQR'})
              </p>
            </div>

            {/* If Bank Transfer was chosen, show VietQR code */}
            {completedOrder.paymentMethod === 'bank_transfer' && settings?.bankInfo && (
              <div className="bg-[#FFFEEA]/50 p-5 rounded-2xl border border-slate-200 space-y-4 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C86EE]">
                  <QrCode className="w-4 h-4 text-[#1C86EE]" />
                  <span>Quét mã VietQR để thanh toán tự động:</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <img
                    src={getVietQrUrl(completedOrder.total, completedOrder.orderCode)}
                    alt="VietQR Payment"
                    className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xs shrink-0"
                  />

                  <div className="text-xs space-y-2 flex-1">
                    <div>
                      <span className="text-slate-500">Ngân hàng:</span>{' '}
                      <strong>{settings.bankInfo.bankName} ({settings.bankInfo.bankCode})</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Số tài khoản:</span>{' '}
                      <strong className="text-[#1C86EE] font-mono text-sm">{settings.bankInfo.accountNumber}</strong>
                      <button
                        onClick={handleCopyBankAccount}
                        className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        title="Sao chép"
                      >
                        {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-500">Chủ tài khoản:</span>{' '}
                      <strong>{settings.bankInfo.accountHolder}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Nội dung CK:</span>{' '}
                      <strong className="text-rose-600 font-mono bg-rose-50 px-1.5 py-0.5 rounded">
                        GPSOFT {completedOrder.orderCode}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking & Navigation Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setTrackingOrderCode(completedOrder.orderCode);
                  setIsCheckoutOpen(false);
                  setIsTrackingOpen(true);
                  setCompletedOrder(null);
                }}
                className="px-5 py-3 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>Xem Tình Trạng Đơn Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setCompletedOrder(null);
                }}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Đóng & Tiếp Tục Mua Sắm
              </button>
            </div>
          </div>
        ) : (
          // Checkout Form
          <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 space-y-6 text-xs">
            {/* Customer Details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>1. Thông Tin Người Nhận Hàng</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={form.customerName}
                    onChange={e => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email (để nhận hóa đơn VAT)</label>
                <input
                  type="email"
                  placeholder="email@vidu.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tỉnh / Thành phố *</label>
                  <input
                    type="text"
                    required
                    value={form.province}
                    onChange={e => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quận / Huyện *</label>
                  <input
                    type="text"
                    required
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phường / Xã *</label>
                  <input
                    type="text"
                    required
                    value={form.ward}
                    onChange={e => setForm({ ...form, ward: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Địa chỉ cụ thể (Số nhà, tên đường) *</label>
                <input
                  type="text"
                  required
                  placeholder="Số 182 Lê Duẩn, Tòa nhà Bitexco..."
                  value={form.street}
                  onChange={e => setForm({ ...form, street: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ghi chú đơn hàng (nếu có)</label>
                <textarea
                  rows={2}
                  placeholder="Giao giờ hành chính, gọi trước khi giao..."
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">2. Hình Thức Thanh Toán</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    form.paymentMethod === 'cod'
                      ? 'border-[#1C86EE] bg-[#1C86EE]/5 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={form.paymentMethod === 'cod'}
                    onChange={() => setForm({ ...form, paymentMethod: 'cod' })}
                    className="text-[#1C86EE]"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Thanh toán COD</div>
                    <div className="text-[11px] text-slate-500">Nhận hàng kiểm tra rồi thanh toán tiền mặt</div>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    form.paymentMethod === 'bank_transfer'
                      ? 'border-[#1C86EE] bg-[#1C86EE]/5 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={form.paymentMethod === 'bank_transfer'}
                    onChange={() => setForm({ ...form, paymentMethod: 'bank_transfer' })}
                    className="text-[#1C86EE]"
                  />
                  <div>
                    <div className="font-bold text-slate-900">Chuyển khoản VietQR</div>
                    <div className="text-[11px] text-slate-500">Quét mã QR ngân hàng tự động 24/7</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary Box & Submit */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng ({cart.length} món):</span>
                <span className="font-semibold text-slate-900">{formatVnd(cartTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Mã ưu đãi giảm{coupon ? ` (${coupon.code})` : ''}:</span>
                  <span>-{formatVnd(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>
                  {selectedShippingMethod
                    ? `Phí vận chuyển (${selectedShippingMethod.name}):`
                    : 'Phí vận chuyển:'}
                </span>
                <span className="font-semibold text-slate-900">
                  {shippingFee === 0 ? <span className="text-emerald-600 font-bold">Miễn phí ship</span> : formatVnd(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                <span>Tổng thanh toán:</span>
                <span className="text-[#1C86EE] text-lg">{formatVnd(orderTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-sm shadow-lg shadow-[#1C86EE]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Đang tạo đơn hàng...' : 'Xác Nhận Đặt Hàng Ngay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
