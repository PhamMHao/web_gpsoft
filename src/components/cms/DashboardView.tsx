import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { DashboardStats, Order, Product } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  DollarSign,
  ShoppingCart,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCmsTab } = useApp();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setStats(res);
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tổng hợp dữ liệu báo cáo kinh doanh...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#1C86EE]/90 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5CACEE]">
            <Sparkles className="w-4 h-4 text-[#5CACEE]" />
            <span>Hệ Thống Quản Trị Trung Tâm GPSOFT CMS</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Tổng Quan Hoạt Động Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal">
            Cập nhật tức thời đơn hàng, doanh số và yêu cầu từ khách hàng tiềm năng.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Làm mới số liệu
        </button>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Doanh Thu
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatVnd(stats.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Đơn Hàng
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#1C86EE]/15 text-[#1C86EE] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.orderCount}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.pendingOrders} đơn đang chờ xử lý</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Khách Hàng
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.customerCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Khách hàng đã phát sinh giao dịch
            </div>
          </div>
        </div>

        {/* Metric 4: Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Khách Tiềm Năng (Leads)
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.leadCount}
            </div>
            <div className="text-[11px] text-[#1C86EE] font-semibold mt-1">
              {stats.newLeads} yêu cầu mới chưa xử lý
            </div>
          </div>
        </div>
      </div>

      {/* Revenue 7-Day Chart & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Doanh Thu 7 Ngày Gần Nhất
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Biểu đồ doanh số và số lượng đơn hàng</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#1C86EE]/15 text-[#1C86EE] text-xs font-bold">
              7 Ngày Qua
            </span>
          </div>

          {/* Bar Chart Representation */}
          <div className="pt-6 pb-2">
            <div className="h-56 flex items-end justify-between gap-3">
              {stats.last7Days.map(item => {
                const maxRev = Math.max(...stats.last7Days.map(d => d.revenue), 100000000);
                const heightPercent = Math.max(10, Math.round((item.revenue / maxRev) * 100));

                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {Math.round(item.revenue / 1000000)}M
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-[#1C86EE] to-[#5CACEE] rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-sm relative"
                    >
                      {item.orderCount > 0 && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.orderCount} đơn
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Status Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Phân Bổ Tình Trạng Đơn
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-900 font-semibold">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Mới tiếp nhận</span>
              </span>
              <span className="font-bold text-sm">{stats.statusCounts.pending || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1C86EE]/10 text-[#1C86EE] font-semibold">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1C86EE]" />
                <span>Đang xử lý / Đóng gói</span>
              </span>
              <span className="font-bold text-sm">{stats.statusCounts.processing || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#5CACEE]/15 text-slate-800 font-semibold">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5CACEE]" />
                <span>Đang giao hàng</span>
              </span>
              <span className="font-bold text-sm">{stats.statusCounts.shipping || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-900 font-semibold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Giao thành công</span>
              </span>
              <span className="font-bold text-sm">{stats.statusCounts.completed || 0}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setCmsTab('orders')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1C86EE]/20 transition-all"
            >
              <span>Vào Quản Lý Đơn Hàng</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Alert & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Stock Products (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Cảnh Báo Tồn Kho Thấp ({stats.lowStockCount})
              </h3>
            </div>
            <button
              onClick={() => setCmsTab('products')}
              className="text-xs text-[#1C86EE] font-bold hover:underline cursor-pointer"
            >
              Xem kho
            </button>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Kho hàng đang ổn định, không có sản phẩm nào dưới định mức tồn.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {stats.lowStockProducts.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="w-8 h-8 rounded-lg object-contain bg-[#FFFDF0] border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] shrink-0">
                    Còn {p.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Đơn Hàng Vừa Phát Sinh
            </h3>
            <button
              onClick={() => setCmsTab('orders')}
              className="text-xs text-[#1C86EE] font-bold hover:underline cursor-pointer"
            >
              Xem tất cả đơn
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2">Mã đơn</th>
                  <th className="pb-2">Khách hàng</th>
                  <th className="pb-2">Tổng tiền</th>
                  <th className="pb-2">Thanh toán</th>
                  <th className="pb-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map(ord => (
                  <tr key={ord.id} className="hover:bg-[#1C86EE]/5">
                    <td className="py-2.5 font-mono font-bold text-[#1C86EE]">{ord.orderCode}</td>
                    <td className="py-2.5 font-medium text-slate-900">{ord.customerName}</td>
                    <td className="py-2.5 font-bold text-slate-900">{formatVnd(ord.total)}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.paymentStatus === 'paid' ? 'Đã thu' : 'Chưa thu'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {ord.status === 'pending'
                          ? 'Mới'
                          : ord.status === 'processing'
                          ? 'Đang xử lý'
                          : ord.status === 'shipping'
                          ? 'Đang giao'
                          : ord.status === 'completed'
                          ? 'Xong'
                          : 'Hủy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
