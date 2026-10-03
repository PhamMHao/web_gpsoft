import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Order, OrderStatus } from '../../types/index.ts';
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  CreditCard
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const OrderTrackingModal: React.FC = () => {
  const { isTrackingOpen, setIsTrackingOpen, trackingOrderCode, setTrackingOrderCode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (trackingOrderCode) {
      setSearchTerm(trackingOrderCode);
      lookupOrder(trackingOrderCode);
    }
  }, [trackingOrderCode]);

  if (!isTrackingOpen) return null;

  const lookupOrder = async (query: string) => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const res = await api.getOrder(query.trim());
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setOrder(null);
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookupOrder(searchTerm);
  };

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipping': return 3;
      case 'completed': return 4;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const currentStep = order ? getStatusStep(order.status) : 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#FFFEEA]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1C86EE] to-[#5CACEE] text-white flex items-center justify-center font-bold shadow-md shadow-[#1C86EE]/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Tra Cứu Đơn Hàng</h3>
              <p className="text-xs text-slate-500">
                Kiểm tra tiến độ giao hàng và thông tin chi tiết đơn hàng của bạn
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsTrackingOpen(false);
              setOrder(null);
              setSearchTerm('');
              setTrackingOrderCode('');
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-6 border-b border-slate-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập mã đơn hàng (VD: TP-250218-1001)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-md shadow-[#1C86EE]/20"
            >
              {loading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>
        </div>

        {/* Result Area */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-7 h-7 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Đang kiểm tra cơ sở dữ liệu...</p>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Order Meta Box */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#1C86EE]/10 border border-[#1C86EE]/20 text-xs">
                <div>
                  <div className="text-slate-500">Mã đơn hàng:</div>
                  <div className="font-mono font-bold text-[#1C86EE] text-sm">{order.orderCode}</div>
                </div>
                <div>
                  <div className="text-slate-500">Ngày đặt:</div>
                  <div className="font-semibold text-slate-800">{order.createdAt.split('T')[0]}</div>
                </div>
                <div>
                  <div className="text-slate-500">Khách hàng:</div>
                  <div className="font-semibold text-slate-800">{order.customerName}</div>
                </div>
                <div>
                  <div className="text-slate-500">Trạng thái:</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      order.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {order.status === 'pending'
                      ? 'Tiếp nhận'
                      : order.status === 'processing'
                      ? 'Đang chuẩn bị hàng'
                      : order.status === 'shipping'
                      ? 'Đang giao hàng'
                      : order.status === 'completed'
                      ? 'Đã giao hàng'
                      : 'Đã hủy'}
                  </span>
                </div>
              </div>

              {/* Progress Stepper */}
              {order.status !== 'cancelled' ? (
                <div className="py-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    {[
                      { step: 1, title: 'Đã nhận đơn', icon: Clock },
                      { step: 2, title: 'Đang đóng gói', icon: Package },
                      { step: 3, title: 'Đang giao', icon: Truck },
                      { step: 4, title: 'Hoàn tất', icon: CheckCircle2 }
                    ].map(st => {
                      const isPastOrCurrent = currentStep >= st.step;
                      const Icon = st.icon;
                      return (
                        <div key={st.step} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all ${
                              isPastOrCurrent
                                ? 'bg-[#1C86EE] text-white shadow-md shadow-[#1C86EE]/30'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`font-semibold ${
                              isPastOrCurrent ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {st.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  Đơn hàng này đã bị hủy. Vui lòng liên hệ hotline 1900 8899 nếu quý khách cần hỗ trợ thêm.
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sản phẩm trong đơn:
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {order.items.map((it, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={it.thumbnail}
                          alt={it.title}
                          className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-100 p-0.5"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{it.title}</div>
                          <div className="text-[11px] text-slate-400">
                            Số lượng: {it.quantity} x {formatVnd(it.price)}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">
                        {formatVnd(it.price * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address & Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <div className="text-slate-500 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#1C86EE]" />
                    <span>Địa chỉ nhận hàng:</span>
                  </div>
                  <div className="text-slate-800">
                    {order.address.street}, {order.address.ward}, {order.address.district},{' '}
                    {order.address.province}
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="text-slate-500">Tổng thanh toán:</div>
                  <div className="text-base font-extrabold text-[#1C86EE]">
                    {formatVnd(order.total)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {order.paymentMethod === 'cod' ? 'Thanh toán tiền mặt COD' : 'Chuyển khoản VietQR'} •{' '}
                    <span className={order.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : searched ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">
                Không tìm thấy đơn hàng với thông tin đã nhập
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Vui lòng kiểm tra lại mã đơn hàng (VD: TP-250218-1001) hoặc số điện thoại đã dùng để đặt hàng.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Vui lòng nhập mã đơn hàng của bạn vào ô trên để tiến hành tra cứu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
