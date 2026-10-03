import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { SiteSettings } from '../../types/index.ts';
import {
  Settings,
  Building,
  Phone,
  Mail,
  CreditCard,
  Share2,
  MapPin,
  Save,
  Check
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, refreshSettings, showToast } = useApp();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

  if (!form) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateSettings(form);
      if (res.success) {
        showToast('Cập nhật cấu hình website thành công!', 'success');
        refreshSettings();
      }
    } catch {
      showToast('Cập nhật cấu hình thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cấu Hình Hệ Thống & Doanh Nghiệp
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thông tin thương hiệu, hotline tổng đài, thông tin nhận tiền VietQR và liên kết mạng xã hội
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl text-xs">
        {/* Section 1: General Info */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Nhận Diện Thương Hiệu
              </h3>
              <p className="text-xs text-slate-400">Tên đơn vị, slogan, logo hiển thị trên website</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên thương hiệu / Công ty *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Khẩu hiệu (Slogan)</label>
              <input
                type="text"
                value={form.slogan}
                onChange={e => setForm({ ...form, slogan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Logo URL</label>
              <input
                type="text"
                value={form.logo}
                onChange={e => setForm({ ...form, logo: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Favicon URL</label>
              <input
                type="text"
                value={form.favicon}
                onChange={e => setForm({ ...form, favicon: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Addresses */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Thông Tin Liên Hệ & Trụ Sở
              </h3>
              <p className="text-xs text-slate-400">Số điện thoại tổng đài, email và địa chỉ showroom</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Hotline bán hàng *</label>
              <input
                type="text"
                required
                value={form.hotline}
                onChange={e => setForm({ ...form, hotline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-bold text-blue-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Hotline kỹ thuật / Phụ</label>
              <input
                type="text"
                value={form.hotline2}
                onChange={e => setForm({ ...form, hotline2: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Email giao dịch chính</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Email kỹ thuật / Bảo hành</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={e => setForm({ ...form, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Địa chỉ văn phòng / Trụ sở chính</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Danh sách các Showroom</label>
              <textarea
                rows={2}
                value={form.showroom}
                onChange={e => setForm({ ...form, showroom: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Google Maps Embed URL</label>
              <input
                type="text"
                value={form.googleMapsEmbedUrl}
                onChange={e => setForm({ ...form, googleMapsEmbedUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: VietQR Bank Settings */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Tài Khoản Ngân Hàng Nhận Tiền VietQR
              </h3>
              <p className="text-xs text-slate-400">Hệ thống sẽ tự sinh mã QR thanh toán chuẩn Napas VietQR</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên ngân hàng</label>
              <input
                type="text"
                value={form.bankInfo.bankName}
                onChange={e =>
                  setForm({ ...form, bankInfo: { ...form.bankInfo, bankName: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Mã ngân hàng (VietQR code: MB, VCB, TCB, ACB...)</label>
              <input
                type="text"
                value={form.bankInfo.bankCode}
                onChange={e =>
                  setForm({ ...form, bankInfo: { ...form.bankInfo, bankCode: e.target.value.toUpperCase() } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold focus:outline-hidden text-blue-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tài khoản nhận tiền *</label>
              <input
                type="text"
                value={form.bankInfo.accountNumber}
                onChange={e =>
                  setForm({ ...form, bankInfo: { ...form.bankInfo, accountNumber: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên chủ tài khoản (In hoa không dấu) *</label>
              <input
                type="text"
                value={form.bankInfo.accountHolder}
                onChange={e =>
                  setForm({ ...form, bankInfo: { ...form.bankInfo, accountHolder: e.target.value.toUpperCase() } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Socials */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Liên Kết Mạng Xã Hội
              </h3>
              <p className="text-xs text-slate-400">Hiển thị icon liên kết ở Header và Footer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Facebook Fanpage URL</label>
              <input
                type="text"
                value={form.socials.facebook}
                onChange={e =>
                  setForm({ ...form, socials: { ...form.socials, facebook: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Zalo OA / Chat URL</label>
              <input
                type="text"
                value={form.socials.zalo}
                onChange={e =>
                  setForm({ ...form, socials: { ...form.socials, zalo: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">YouTube Channel URL</label>
              <input
                type="text"
                value={form.socials.youtube}
                onChange={e =>
                  setForm({ ...form, socials: { ...form.socials, youtube: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">TikTok Channel URL</label>
              <input
                type="text"
                value={form.socials.tiktok}
                onChange={e =>
                  setForm({ ...form, socials: { ...form.socials, tiktok: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu cài đặt...' : 'Lưu Thay Đổi Cấu Hình'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
