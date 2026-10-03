import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';

/**
 * P2.10 — Form đăng nhập CMS.
 *
 * Chỉ render ở **URL ẩn** `/login-admin` (`ROUTES.adminLogin` — xem `App.tsx`) hoặc trong `CmsLayout`
 * khi phiên hết hạn. Trang này: không Navbar/Footer, **không** hiển thị tài khoản/mật khẩu mẫu và không
 * có link nào từ website công khai trỏ tới.
 */
export const LoginView: React.FC = () => {
  const { login, settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(username.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.message || 'Đăng nhập thất bại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#1C86EE] to-[#5CACEE] flex items-center justify-center text-white font-black text-xl shadow-lg">
              TP
            </div>
            <h1 className="text-lg font-black text-white tracking-tight">
              {settings?.companyName || 'GPSOFT CMS'}
            </h1>
            <p className="text-xs text-slate-400">Đăng nhập vào hệ thống quản trị</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Tên đăng nhập hoặc Email</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tên đăng nhập hoặc email"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-[#1C86EE]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-[#1C86EE]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1C86EE] hover:bg-[#1472CE] text-white font-bold shadow-md transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}</span>
            </button>
          </form>

          {/* P2.10 — không còn khối "Tài khoản demo": trước đây in thẳng `admin / admin123` ngay trên
              trang đăng nhập (lộ thông tin đăng nhập cho bất kỳ ai mở được URL này). */}
        </div>
      </div>
    </div>
  );
};
