import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Customer } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Users,
  Search,
  DollarSign,
  ShoppingCart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const CustomersView: React.FC = () => {
  const { showToast } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (search?: string) => {
    try {
      setLoading(true);
      const res = await api.getCustomers(search);
      if (res.success) setCustomers(res.data);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(searchTerm);
  };

  const handleSaveNotes = async () => {
    if (!editingCustomer) return;
    try {
      const res = await api.updateCustomer(editingCustomer.id, { notes: notesInput });
      if (res.success) {
        showToast('Cập nhật ghi chú khách hàng thành công!', 'success');
        setCustomers(prev => prev.map(c => (c.id === editingCustomer.id ? { ...c, notes: notesInput } : c)));
        setEditingCustomer(null);
      }
    } catch {
      showToast('Cập nhật ghi chú thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ khách hàng "${name}"?`)) return;
    try {
      const res = await api.deleteCustomer(id);
      if (res.success) {
        showToast(`Đã xóa khách hàng "${name}"!`, 'success');
        setCustomers(prev => prev.filter(c => c.id !== id));
      }
    } catch {
      showToast('Xóa khách hàng thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Khách Hàng (CRM)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng <strong className="text-blue-600 font-bold">{customers.length}</strong> khách hàng đã phát sinh đơn
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, số điện thoại, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </form>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải khách hàng...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Chưa có dữ liệu khách hàng nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Tên Khách Hàng</th>
                  <th className="py-3.5 px-4">Liên Hệ</th>
                  <th className="py-3.5 px-4">Khu Vực</th>
                  <th className="py-3.5 px-4 text-center">Số Đơn</th>
                  <th className="py-3.5 px-4 text-right">Tổng Chi Tiêu</th>
                  <th className="py-3.5 px-4">Lần Cuối Mua</th>
                  <th className="py-3.5 px-4">Ghi Chú CRM</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                      <div className="text-[10px] text-slate-400 font-normal">
                        Khách từ: {c.createdAt.split('T')[0]}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-mono font-semibold">{c.phone}</div>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {c.address}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {c.orderCount} đơn
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-700">
                      {formatVnd(c.totalSpent)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {c.lastOrderAt ? c.lastOrderAt.split('T')[0] : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {c.notes || <span className="text-slate-300 italic">Chưa có ghi chú</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setNotesInput(c.notes || '');
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Sửa ghi chú CRM"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa khách hàng"
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

      {/* Edit Notes Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Ghi Chú Chăm Sóc: {editingCustomer.name}
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">Nội dung chăm sóc & sở thích khách hàng:</label>
              <textarea
                rows={4}
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="Khách VIP hay mua iPhone, thích quà tặng phụ kiện..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
              >
                Lưu Ghi Chú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
