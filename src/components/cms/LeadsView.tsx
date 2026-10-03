import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Lead, LeadType, LeadStatus } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { LEAD_SOURCE_FILTERS, leadSourceLabel } from '../../utils/leadSource.ts';
import {
  MessageSquare,
  Building2,
  Mail,
  Phone,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Check
} from 'lucide-react';

export const LeadsView: React.FC = () => {
  const { showToast } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // P2.3 — lọc theo nguồn lead (VD chỉ xem lead từ form "Thiết kế website").
  const [sourceFilter, setSourceFilter] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  useEffect(() => {
    loadLeads();
  }, [typeFilter, statusFilter, sourceFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await api.getLeads({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined
      });
      if (res.success) setLeads(res.data);
    } catch (e) {
      console.error('Failed to load leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: LeadStatus) => {
    try {
      const res = await api.updateLead(id, { status });
      if (res.success) {
        showToast('Cập nhật trạng thái lead thành công!', 'success');
        setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
      }
    } catch {
      showToast('Cập nhật thất bại.', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!editingLead) return;
    try {
      const res = await api.updateLead(editingLead.id, { adminNote: adminNoteInput });
      if (res.success) {
        showToast('Lưu ghi chú xử lý thành công!', 'success');
        setLeads(prev => prev.map(l => (l.id === editingLead.id ? { ...l, adminNote: adminNoteInput } : l)));
        setEditingLead(null);
      }
    } catch {
      showToast('Lưu ghi chú thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa yêu cầu này không?')) return;
    try {
      const res = await api.deleteLead(id);
      if (res.success) {
        showToast('Đã xóa lead!', 'success');
        setLeads(prev => prev.filter(l => l.id !== id));
      }
    } catch {
      showToast('Xóa lead thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Yêu Cầu & Khách Hàng Tiềm Năng (Leads)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp tin nhắn liên hệ, yêu cầu báo giá doanh nghiệp và đăng ký newsletter
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
        >
          <option value="">Tất cả loại yêu cầu</option>
          <option value="contact">Tin nhắn liên hệ</option>
          <option value="quote">Báo giá doanh nghiệp</option>
          <option value="newsletter">Đăng ký nhận tin</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="new">Mới tiếp nhận</option>
          <option value="contacted">Đã liên hệ tư vấn</option>
          <option value="resolved">Đã chốt / Giải quyết xong</option>
        </select>

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
        >
          {LEAD_SOURCE_FILTERS.map(item => (
            <option key={item.value || 'all'} value={item.value}>
              {item.value ? `Nguồn: ${item.label}` : item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải danh sách leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Chưa có khách tiềm năng nào trong mục này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Thời Gian</th>
                  <th className="py-3.5 px-4">Loại Lead</th>
                  <th className="py-3.5 px-4">Nguồn</th>
                  <th className="py-3.5 px-4">Khách Hàng & Liên Hệ</th>
                  <th className="py-3.5 px-4">Tiêu Đề / Sản Phẩm</th>
                  <th className="py-3.5 px-4">Nội Dung Yêu Cầu</th>
                  <th className="py-3.5 px-4">Ghi Chú Admin</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {lead.createdAt.split('T')[0]}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lead.type === 'quote'
                            ? 'bg-purple-100 text-purple-700'
                            : lead.type === 'contact'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {lead.type === 'quote'
                          ? 'Báo Giá Sỉ'
                          : lead.type === 'contact'
                          ? 'Liên Hệ'
                          : 'Bản Tin'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {leadSourceLabel(lead.source) ? (
                        <span
                          title={lead.source}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            lead.source === 'web-design'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {leadSourceLabel(lead.source)}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-[10px]">Chưa rõ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{lead.name || 'Khách đăng ký tin'}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-normal">
                        {lead.phone || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[200px] truncate">
                      {lead.subject || lead.interestedProduct || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {lead.message || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {lead.adminNote || <span className="text-slate-300 italic">Chưa ghi chú</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={lead.status}
                        onChange={e => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                      >
                        <option value="new">Mới</option>
                        <option value="contacted">Đã liên hệ</option>
                        <option value="resolved">Xử lý xong</option>
                        <option value="cancelled">Hủy</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingLead(lead);
                            setAdminNoteInput(lead.adminNote || '');
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Thêm ghi chú"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa"
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

      {/* Note Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Ghi Chú Xử Lý Lead</h3>
              <button
                onClick={() => setEditingLead(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">Tiến trình tư vấn / phản hồi khách:</label>
              <textarea
                rows={4}
                value={adminNoteInput}
                onChange={e => setAdminNoteInput(e.target.value)}
                placeholder="Đã gọi điện lúc 10h, khách hẹn xem máy vào chiều mai..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNote}
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
