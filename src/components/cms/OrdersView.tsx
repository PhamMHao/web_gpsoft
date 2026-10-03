import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Order, OrderStatus, PaymentStatus } from '../../types/index.ts';
import {
  Search,
  Printer,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const OrdersView: React.FC = () => {
  const { showToast, settings } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getOrders({
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        search: searchTerm || undefined
      });
      if (res.success) setOrders(res.data);
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await api.updateOrder(orderId, { status });
      if (res.success) {
        showToast(`Đã cập nhật trạng thái đơn hàng sang "${status}"`, 'success');
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status } : o)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, status } : null));
        }
      }
    } catch {
      showToast('Cập nhật trạng thái thất bại.', 'error');
    }
  };

  const handleTogglePayment = async (orderId: string, current: PaymentStatus) => {
    const nextStatus: PaymentStatus = current === 'paid' ? 'unpaid' : 'paid';
    try {
      const res = await api.updateOrder(orderId, { paymentStatus: nextStatus });
      if (res.success) {
        showToast(
          `Đã đổi trạng thái thanh toán sang "${nextStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thu'}"`,
          'success'
        );
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, paymentStatus: nextStatus } : o)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, paymentStatus: nextStatus } : null));
        }
      }
    } catch {
      showToast('Cập nhật thanh toán thất bại.', 'error');
    }
  };

  const handleDelete = async (orderId: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn hàng "${code}" không?`)) return;
    try {
      const res = await api.deleteOrder(orderId);
      if (res.success) {
        showToast(`Đã xóa đơn hàng ${code} thành công!`, 'success');
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      }
    } catch {
      showToast('Xóa đơn hàng thất bại.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Đơn Hàng & Vận Chuyển
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi, xử lý và in phiếu giao hàng cho các đơn đặt trên website
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn (TP-...), SĐT, tên khách..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang chuẩn bị hàng</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="completed">Đã giao thành công</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="unpaid">Chưa thanh toán</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Không tìm thấy đơn hàng nào phù hợp với điều kiện lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Mã Đơn</th>
                  <th className="py-3.5 px-4">Khách Hàng & SĐT</th>
                  <th className="py-3.5 px-4">Địa Chỉ Giao Hàng</th>
                  <th className="py-3.5 px-4 text-right">Tổng Tiền</th>
                  <th className="py-3.5 px-4 text-center">Hình Thức</th>
                  <th className="py-3.5 px-4 text-center">Thanh Toán</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái Đơn</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {ord.orderCode}
                      <div className="text-[10px] text-slate-400 font-sans font-normal">
                        {ord.createdAt.split('T')[0]}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{ord.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-normal">
                        {ord.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {ord.address.street}, {ord.address.ward}, {ord.address.district}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-700 text-sm">
                      {formatVnd(ord.total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {ord.paymentMethod === 'cod' ? 'COD' : 'VietQR'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title="Bấm để chuyển trạng thái thanh toán"
                      >
                        {ord.paymentStatus === 'paid' ? '✓ Đã thu tiền' : 'Chưa thu tiền'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={ord.status}
                        onChange={e => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="processing">Chuẩn bị hàng</option>
                        <option value="shipping">Đang giao</option>
                        <option value="completed">Hoàn tất</option>
                        <option value="cancelled">Hủy đơn</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInvoiceOrder(ord)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          title="In phiếu xuất kho / Hóa đơn"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ord.id, ord.orderCode)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa đơn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chi Tiết Đơn Hàng: <span className="font-mono text-blue-600">{selectedOrder.orderCode}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Đặt ngày {selectedOrder.createdAt.split('T')[0]}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Customer & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Thông tin khách hàng
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</div>
                  <div className="text-slate-600 font-mono">{selectedOrder.phone}</div>
                  {selectedOrder.email && <div className="text-slate-600">{selectedOrder.email}</div>}
                </div>

                <div className="space-y-1">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Địa chỉ nhận hàng
                  </div>
                  <div className="text-slate-800 leading-relaxed">
                    {selectedOrder.address.street}, {selectedOrder.address.ward},{' '}
                    {selectedOrder.address.district}, {selectedOrder.address.province}
                  </div>
                  {selectedOrder.note && (
                    <div className="text-amber-800 bg-amber-50 p-1.5 rounded text-[11px] mt-2">
                      <strong>Ghi chú:</strong> {selectedOrder.note}
                    </div>
                  )}
                </div>
              </div>

              {/* Items in order */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Danh Sách Hàng Hóa ({selectedOrder.items.length})
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-11 h-11 object-contain rounded-lg bg-slate-50 border border-slate-100 p-0.5"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {item.sku} • {item.quantity} x {formatVnd(item.price)}
                          </div>
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatVnd(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính hàng:</span>
                  <span className="font-semibold text-slate-900">{formatVnd(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí giao hàng:</span>
                  <span className="font-semibold text-slate-900">{formatVnd(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Tổng thanh toán:</span>
                  <span className="text-blue-700 text-lg">{formatVnd(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setInvoiceOrder(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Phiếu Giao / Hóa Đơn</span>
                </button>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Printable Invoice */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 print:m-0 print:shadow-none print:w-full">
            {/* Action Bar (hidden when printed) */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="font-bold text-xs text-slate-700">Xem trước bản in hóa đơn bán hàng</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Bắt Đầu In</span>
                </button>
                <button
                  onClick={() => setInvoiceOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Document */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-800 text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {settings?.companyName || 'CÔNG TY CỔ PHẦN CÔNG NGHỆ GPSOFT'}
                  </h1>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {settings?.address || '182 Lê Duẩn, Quận 1, TP. Hồ Chí Minh'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Hotline: {settings?.hotline || '1900 8899'} • Email: {settings?.email || 'lienhe@gpsoft.vn'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-blue-700">PHIẾU XUẤT KHO KIÊM BÁN HÀNG</div>
                  <div className="font-mono text-xs font-bold text-slate-600 mt-1">Số: {invoiceOrder.orderCode}</div>
                  <div className="text-[11px] text-slate-400">Ngày: {invoiceOrder.createdAt.split('T')[0]}</div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div>Khách hàng: <strong className="text-slate-900">{invoiceOrder.customerName}</strong></div>
                  <div>Số điện thoại: <strong className="text-slate-900 font-mono">{invoiceOrder.phone}</strong></div>
                  {invoiceOrder.email && <div>Email: {invoiceOrder.email}</div>}
                </div>
                <div>
                  <div>Địa chỉ giao: {invoiceOrder.address.street}, {invoiceOrder.address.ward}, {invoiceOrder.address.district}, {invoiceOrder.address.province}</div>
                  <div>Hình thức: <strong>{invoiceOrder.paymentMethod === 'cod' ? 'Thanh toán COD' : 'Chuyển khoản VietQR'}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="py-2 px-3">STT</th>
                    <th className="py-2 px-3">Tên Sản Phẩm & Quy Cách</th>
                    <th className="py-2 px-3 font-mono">Mã SKU</th>
                    <th className="py-2 px-3 text-center">SL</th>
                    <th className="py-2 px-3 text-right">Đơn Giá</th>
                    <th className="py-2 px-3 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{it.title}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{it.sku}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatVnd(it.price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatVnd(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1.5 text-right pt-2 border-t border-slate-200">
                <div>Cộng tiền hàng: <strong>{formatVnd(invoiceOrder.subtotal)}</strong></div>
                <div>Phí vận chuyển: <strong>{formatVnd(invoiceOrder.shippingFee)}</strong></div>
                <div className="text-base font-extrabold text-blue-800">
                  Tổng tiền thanh toán: {formatVnd(invoiceOrder.total)}
                </div>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 pt-12 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-900">Người Mua Hàng</div>
                  <div className="text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">Đại Diện GPSOFT Store</div>
                  <div className="text-[11px] text-slate-400">(Ký, đóng dấu xuất kho)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
