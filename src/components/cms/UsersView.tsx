import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { User, Role } from '../../types/index.ts';
import {
  ShieldCheck,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Pencil
} from 'lucide-react';
import { formatDate } from '../../utils/format.ts';

const ROLE_OPTIONS: Array<{ value: User['role']; label: string }> = [
  { value: 'staff', label: 'Nhân Viên CSKH (Xử lý đơn & leads)' },
  { value: 'editor', label: 'Biên Tập Viên (Tin tức, sản phẩm, SEO)' },
  { value: 'admin', label: 'Quản Lý Chi Nhánh / Sales Lead' },
  { value: 'customer', label: 'Khách Hàng' }
];

export const UsersView: React.FC = () => {
  const { showToast } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'staff' as User['role'],
    password: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([api.getUsers(), api.getRoles()]);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
    } catch (e) {
      showToast('Không tải được danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', fullName: '', email: '', role: 'staff', password: '' });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      password: ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName) return;

    try {
      setSaving(true);
      if (editing) {
        const res = await api.updateUser(editing.id, {
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role
        });
        if (res.success) {
          setUsers(prev => prev.map(u => (u.id === editing.id ? res.data : u)));
          showToast('Cập nhật người dùng thành công!', 'success');
        }
      } else {
        const res = await api.createUser({
          username: form.username.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role
        });
        if (res.success) {
          setUsers(prev => [...prev, res.data]);
          showToast('Tạo tài khoản quản trị mới thành công!', 'success');
        }
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Thao tác thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Xóa tài khoản "${name}"?`)) return;
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('Đã xóa người dùng thành công.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xóa thất bại.', 'error');
    }
  };

  const handleRoleChange = async (u: User, role: User['role']) => {
    try {
      const res = await api.updateUser(u.id, { role });
      if (res.success) {
        setUsers(prev => prev.map(item => (item.id === u.id ? res.data : item)));
        showToast('Đã cập nhật vai trò người dùng.', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cập nhật vai trò thất bại.', 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px]">Quản Trị / Admin</span>;
      case 'editor':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">Biên Tập SEO</span>;
      case 'customer':
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">Khách Hàng</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">Nhân Viên CSKH</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Người Dùng & Phân Quyền Vai Trò
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấp quyền tài khoản nhân viên, trưởng bộ phận và phân quyền tính năng trong CMS
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Người Dùng Mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Tài Khoản</th>
                <th className="py-3.5 px-4">Họ Và Tên</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Vai Trò Phân Quyền</th>
                <th className="py-3.5 px-4">Ngày Tạo</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chưa có người dùng nào.
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">@{u.username}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{u.email || '—'}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(u.role)}
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value as User['role'])}
                        className="text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white cursor-pointer"
                        title="Đổi vai trò nhanh"
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{formatDate(u.createdAt, 'datetime')}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="Sửa tài khoản"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.fullName)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles from API */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Vai Trò Hệ Thống (Roles)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="font-bold text-slate-900 text-xs">{role.name}</div>
              <p className="text-[11px] text-slate-500">{role.description}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {(role.permissions || []).map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {roles.length === 0 && (
            <div className="text-xs text-slate-400">Chưa có vai trò nào.</div>
          )}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editing ? 'Cập Nhật Người Dùng' : 'Thêm Người Dùng Quản Trị'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên đăng nhập *</label>
                <input
                  type="text"
                  required
                  placeholder="nhanvien_01"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Trần Văn B"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="nhanvien@gpsoft.vn"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              {!editing && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mật khẩu ban đầu</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vai trò phân quyền</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editing ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
