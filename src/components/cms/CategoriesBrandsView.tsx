import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Category, Brand } from '../../types/index.ts';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Globe,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { slugify } from '../../utils/format.ts';

export const CategoriesBrandsView: React.FC = () => {
  const { categories, brands, refreshCategoriesAndBrands, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    icon: 'Layers',
    sortOrder: 1,
    description: '',
    isActive: true
  });

  // Brand Modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    slug: '',
    logo: '',
    country: 'Mỹ',
    website: '',
    description: '',
    isActive: true
  });

  // Category handlers
  const handleOpenAddCat = () => {
    setEditingCat(null);
    setCatForm({
      name: '',
      slug: '',
      icon: 'Layers',
      sortOrder: categories.length + 1,
      description: '',
      isActive: true
    });
    setCatModalOpen(true);
  };

  const handleOpenEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({
      name: c.name,
      slug: c.slug,
      icon: c.icon || 'Layers',
      sortOrder: c.sortOrder,
      description: c.description || '',
      isActive: c.isActive
    });
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      const payload = {
        name: catForm.name,
        slug: catForm.slug || slugify(catForm.name),
        icon: catForm.icon,
        sortOrder: Number(catForm.sortOrder),
        description: catForm.description,
        isActive: catForm.isActive
      };
      if (editingCat) {
        await api.updateCategory(editingCat.id, payload);
        showToast('Cập nhật danh mục thành công!', 'success');
      } else {
        await api.createCategory(payload);
        showToast('Tạo danh mục mới thành công!', 'success');
      }
      setCatModalOpen(false);
      refreshCategoriesAndBrands();
    } catch {
      showToast('Thao tác thất bại.', 'error');
    }
  };

  const handleDeleteCat = async (id: string, name: string) => {
    if (!window.confirm(`Xóa danh mục "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      showToast(`Đã xóa danh mục "${name}"!`, 'success');
      refreshCategoriesAndBrands();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  // Brand handlers
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandForm({
      name: '',
      slug: '',
      logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&auto=format&fit=crop&q=80',
      country: 'Mỹ',
      website: '',
      description: '',
      isActive: true
    });
    setBrandModalOpen(true);
  };

  const handleOpenEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({
      name: b.name,
      slug: b.slug,
      logo: b.logo,
      country: b.country,
      website: b.website || '',
      description: b.description || '',
      isActive: b.isActive
    });
    setBrandModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;
    try {
      const payload = {
        name: brandForm.name,
        slug: brandForm.slug || slugify(brandForm.name),
        logo: brandForm.logo,
        country: brandForm.country,
        website: brandForm.website,
        description: brandForm.description,
        isActive: brandForm.isActive
      };
      if (editingBrand) {
        await api.updateBrand(editingBrand.id, payload);
        showToast('Cập nhật thương hiệu thành công!', 'success');
      } else {
        await api.createBrand(payload);
        showToast('Thêm thương hiệu mới thành công!', 'success');
      }
      setBrandModalOpen(false);
      refreshCategoriesAndBrands();
    } catch {
      showToast('Thao tác thất bại.', 'error');
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!window.confirm(`Xóa thương hiệu "${name}"?`)) return;
    try {
      await api.deleteBrand(id);
      showToast(`Đã xóa thương hiệu "${name}"!`, 'success');
      refreshCategoriesAndBrands();
    } catch {
      showToast('Xóa thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Danh Mục & Thương Hiệu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu trúc cây danh mục hàng hóa và đối tác thương hiệu chính thức
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Danh Mục Hàng ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'brands' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Thương Hiệu ({brands.length})
          </button>
        </div>
      </div>

      {activeTab === 'categories' ? (
        /* Categories Table View */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden space-y-4 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Danh Sách Ngành Hàng
            </h3>
            <button
              onClick={handleOpenAddCat}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Danh Mục</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-16 text-center">Thứ Tự</th>
                  <th className="py-3 px-4">Tên Danh Mục</th>
                  <th className="py-3 px-4">Đường Dẫn (Slug)</th>
                  <th className="py-3 px-4">Icon Đại Diện</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">{c.sortOrder}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{c.slug}</td>
                    <td className="py-3 px-4 font-mono text-blue-600">{c.icon || 'Layers'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.isActive ? 'Hiển thị' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditCat(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCat(c.id, c.name)}
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
      ) : (
        /* Brands Grid View */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Danh Sách Thương Hiệu Đối Tác
            </h3>
            <button
              onClick={handleOpenAddBrand}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Thương Hiệu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {brands.map(b => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>{b.country}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditBrand(b)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(b.id, b.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h3>
              <button onClick={() => setCatModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên danh mục *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Icon đại diện</label>
                  <select
                    value={catForm.icon}
                    onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="Smartphone">Smartphone (Điện thoại)</option>
                    <option value="Laptop">Laptop (Máy tính xách tay)</option>
                    <option value="Tablet">Tablet (Máy tính bảng)</option>
                    <option value="Headphones">Headphones (Âm thanh)</option>
                    <option value="Camera">Camera (Máy ảnh)</option>
                    <option value="Monitor">Monitor (Màn hình)</option>
                    <option value="Layers">Layers (Khác)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={catForm.sortOrder}
                    onChange={e => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={catForm.isActive}
                  onChange={e => setCatForm({ ...catForm, isActive: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span className="font-bold text-slate-700">Bật hiển thị trên menu website</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Lưu Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingBrand ? 'Chỉnh Sửa Thương Hiệu' : 'Thêm Thương Hiệu Mới'}
              </h3>
              <button onClick={() => setBrandModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên thương hiệu *</label>
                <input
                  type="text"
                  required
                  value={brandForm.name}
                  onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quốc gia xuất xứ</label>
                  <input
                    type="text"
                    value={brandForm.country}
                    onChange={e => setBrandForm({ ...brandForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Website chính thức</label>
                  <input
                    type="text"
                    value={brandForm.website}
                    onChange={e => setBrandForm({ ...brandForm, website: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Lưu Thương Hiệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
