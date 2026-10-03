import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Banner, MenuItem } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Image as ImageIcon,
  Menu as MenuIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';

export const BannersMenuView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'banners' | 'menus'>('banners');

  // Banners state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '/products',
    buttonText: 'Khám Phá Ngay',
    sortOrder: 1,
    isActive: true
  });

  // Menus state
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    title: '',
    url: '',
    position: 'header' as 'header' | 'footer',
    sortOrder: 1,
    isExternal: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [banRes, menuRes] = await Promise.all([
        api.getBanners(),
        api.getMenus()
      ]);
      if (banRes.success) setBanners(banRes.data);
      if (menuRes.success && menuRes.data) {
        const flattened = menuRes.data.flatMap(m =>
          (m.items || []).map(item => ({
            ...item,
            position: m.location as 'header' | 'footer'
          }))
        );
        setMenus(flattened);
      }
    } catch (e) {
      console.error('Failed to load banners and menus:', e);
    }
  };

  // Banner CRUD
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      subtitle: '',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
      link: '/products',
      buttonText: 'Xem Ngay',
      sortOrder: banners.length + 1,
      isActive: true
    });
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: Banner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle,
      image: b.image || b.imageUrl || '',
      link: b.link || b.linkUrl || '',
      buttonText: b.buttonText,
      sortOrder: b.sortOrder,
      isActive: b.isActive
    });
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) return;
    try {
      const payload = {
        title: bannerForm.title,
        subtitle: bannerForm.subtitle,
        imageUrl: bannerForm.image,
        image: bannerForm.image,
        linkUrl: bannerForm.link,
        link: bannerForm.link,
        buttonText: bannerForm.buttonText,
        sortOrder: bannerForm.sortOrder,
        isActive: bannerForm.isActive
      };
      if (editingBanner) {
        await api.updateBanner(editingBanner.id, payload);
        showToast('Cập nhật banner thành công!', 'success');
      } else {
        await api.createBanner(payload);
        showToast('Thêm banner mới thành công!', 'success');
      }
      setBannerModalOpen(false);
      loadData();
    } catch {
      showToast('Lưu banner thất bại.', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Xóa banner quảng cáo này?')) return;
    try {
      await api.deleteBanner(id);
      showToast('Đã xóa banner!', 'success');
      loadData();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  // Menu CRUD
  const handleOpenAddMenu = () => {
    setEditingMenu(null);
    setMenuForm({
      title: '',
      url: '/products',
      position: 'header',
      sortOrder: menus.length + 1,
      isExternal: false
    });
    setMenuModalOpen(true);
  };

  const handleOpenEditMenu = (m: MenuItem) => {
    setEditingMenu(m);
    setMenuForm({
      title: m.title || m.label || '',
      url: m.url,
      position: (m.position === 'footer' ? 'footer' : 'header'),
      sortOrder: m.sortOrder || 1,
      isExternal: m.isExternal || false
    });
    setMenuModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.title.trim()) return;
    try {
      if (editingMenu) {
        await api.updateMenu(editingMenu.id, menuForm);
        showToast('Cập nhật menu thành công!', 'success');
      } else {
        await api.createMenu(menuForm);
        showToast('Thêm menu thành công!', 'success');
      }
      setMenuModalOpen(false);
      loadData();
    } catch {
      showToast('Lưu menu thất bại.', 'error');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!window.confirm('Xóa liên kết menu này?')) return;
    try {
      await api.deleteMenu(id);
      showToast('Đã xóa menu item!', 'success');
      loadData();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Banner & Menu Điều Hướng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình thanh trượt Slider trang chủ và liên kết menu Header / Footer
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('banners')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'banners' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Banner Slider ({banners.length})
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'menus' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Menu Điều Hướng ({menus.length})
          </button>
        </div>
      </div>

      {activeTab === 'banners' ? (
        /* Banners Section */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Danh Sách Banner Quảng Cáo Slider
            </h3>
            <button
              onClick={handleOpenAddBanner}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Banner Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map(b => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col justify-between"
              >
                <div className="aspect-21/9 relative bg-slate-900">
                  <img src={b.image || b.imageUrl} alt={b.title} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      {b.subtitle}
                    </span>
                    <h4 className="text-base font-extrabold">{b.title}</h4>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-mono text-[11px]">Thứ tự: {b.sortOrder}</span> •{' '}
                    <span className={b.isActive ? 'text-emerald-600 font-bold' : 'text-slate-400 font-semibold'}>
                      {b.isActive ? 'Đang bật' : 'Tắt'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditBanner(b)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Menus Section */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Danh Sách Menu Hệ Thống
            </h3>
            <button
              onClick={handleOpenAddMenu}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Menu Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-16 text-center">Thứ Tự</th>
                  <th className="py-3 px-4">Tên Mục Menu</th>
                  <th className="py-3 px-4">Đường Dẫn (URL)</th>
                  <th className="py-3 px-4 text-center">Vị Trí</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menus.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">{m.sortOrder || 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.title || m.label}</td>
                    <td className="py-3 px-4 font-mono text-blue-600">{m.url}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        {m.position || 'header'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditMenu(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(m.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
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
        </div>
      )}

      {/* Banner Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingBanner ? 'Sửa Banner Slider' : 'Thêm Banner Slider Mới'}
              </h3>
              <button onClick={() => setBannerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề chính *</label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phụ đề (Subtitle)</label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={e => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ảnh Banner (URL)</label>
                <input
                  type="text"
                  required
                  value={bannerForm.image}
                  onChange={e => setBannerForm({ ...bannerForm, image: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Link liên kết</label>
                  <input
                    type="text"
                    value={bannerForm.link}
                    onChange={e => setBannerForm({ ...bannerForm, link: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={bannerForm.sortOrder}
                    onChange={e => setBannerForm({ ...bannerForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={bannerForm.isActive}
                  onChange={e => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span className="font-bold text-slate-700">Bật hiển thị trên trang chủ</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Lưu Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingMenu ? 'Sửa Menu Item' : 'Thêm Menu Item Mới'}
              </h3>
              <button onClick={() => setMenuModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên hiển thị trên menu *</label>
                <input
                  type="text"
                  required
                  value={menuForm.title}
                  onChange={e => setMenuForm({ ...menuForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Đường dẫn liên kết (URL) *</label>
                <input
                  type="text"
                  required
                  value={menuForm.url}
                  onChange={e => setMenuForm({ ...menuForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Vị trí đặt menu</label>
                  <select
                    value={menuForm.position}
                    onChange={e => setMenuForm({ ...menuForm, position: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="header">Header (Thanh trên cùng)</option>
                    <option value="footer">Footer (Chân trang)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thứ tự</label>
                  <input
                    type="number"
                    value={menuForm.sortOrder}
                    onChange={e => setMenuForm({ ...menuForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Lưu Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
