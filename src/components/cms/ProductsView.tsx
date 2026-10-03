import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Product, ProductVariant, ProductCondition } from '../../types/index.ts';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  Check,
  Sparkles,
  Layers,
  Tag,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { formatVnd, slugify } from '../../utils/format.ts';
import { genId } from '../../utils/id.ts';

export const ProductsView: React.FC = () => {
  const { categories, brands, showToast, navigateToProduct } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    categoryId: '',
    brandId: '',
    originalPrice: 0,
    salePrice: 0,
    condition: 'new' as ProductCondition,
    stock: 10,
    shortDesc: '',
    description: '',
    thumbnail: '',
    galleryInput: '',
    gallery: [] as string[],
    isFeatured: false,
    isNew: true,
    metaTitle: '',
    metaDesc: '',
    specs: {} as Record<string, string>,
    variants: [] as ProductVariant[]
  });

  // Specs helper state
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');

  // Variant helper state
  const [varTitle, setVarTitle] = useState('');
  const [varSku, setVarSku] = useState('');
  const [varPrice, setVarPrice] = useState(0);
  const [varStock, setVarStock] = useState(5);

  useEffect(() => {
    loadProducts();
  }, [selectedCat, selectedBrand]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        category: selectedCat || undefined,
        brand: selectedBrand || undefined
      });
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error('Products load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      sku: `TP-${Date.now().toString().slice(-4)}`,
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
      originalPrice: 15000000,
      salePrice: 13500000,
      condition: 'new',
      stock: 10,
      shortDesc: '',
      description: '',
      thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
      galleryInput: '',
      gallery: [],
      isFeatured: false,
      isNew: true,
      metaTitle: '',
      metaDesc: '',
      specs: { 'Màn hình': '6.1 inch OLED', 'Bộ nhớ': '128GB', 'Bảo hành': '24 tháng chính hãng' },
      variants: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: p.categoryId,
      brandId: p.brandId,
      originalPrice: p.originalPrice,
      salePrice: p.salePrice,
      condition: p.condition,
      stock: p.stock,
      shortDesc: p.shortDesc,
      description: p.description,
      thumbnail: p.thumbnail,
      galleryInput: '',
      gallery: p.gallery || [],
      isFeatured: p.isFeatured,
      isNew: p.isNew,
      metaTitle: p.seo?.metaTitle || '',
      metaDesc: p.seo?.metaDesc || '',
      specs: { ...(p.specs || {}) },
      variants: [...(p.variants || [])]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" không?`)) return;
    try {
      const res = await api.deleteProduct(id);
      if (res.success) {
        showToast(`Đã xóa sản phẩm "${name}" thành công!`, 'success');
        loadProducts();
      }
    } catch {
      showToast('Xóa sản phẩm thất bại.', 'error');
    }
  };

  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setFormData(prev => ({
      ...prev,
      specs: { ...prev.specs, [specKey.trim()]: specVal.trim() }
    }));
    setSpecKey('');
    setSpecVal('');
  };

  const handleRemoveSpec = (key: string) => {
    setFormData(prev => {
      const nextSpecs = { ...prev.specs };
      delete nextSpecs[key];
      return { ...prev, specs: nextSpecs };
    });
  };

  const handleAddVariant = () => {
    if (!varTitle.trim()) return;
    const newVariant: ProductVariant = {
      id: genId('v'),
      title: varTitle.trim(),
      sku: varSku.trim() || `${formData.sku}-${varTitle.trim().replace(/\s+/g, '-').toUpperCase()}`,
      price: varPrice > 0 ? varPrice : formData.salePrice,
      stock: varStock,
      attributes: { 'Phiên bản': varTitle.trim() }
    };
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
    setVarTitle('');
    setVarSku('');
    setVarPrice(0);
    setVarStock(5);
  };

  const handleRemoveVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
  };

  const handleAddGalleryUrl = () => {
    if (!formData.galleryInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      gallery: [...prev.gallery, prev.galleryInput.trim()],
      galleryInput: ''
    }));
  };

  const handleRemoveGalleryUrl = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      showToast('Vui lòng điền tên sản phẩm và mã SKU!', 'error');
      return;
    }

    try {
      const payload: Partial<Product> = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name),
        sku: formData.sku,
        categoryId: formData.categoryId,
        brandId: formData.brandId,
        originalPrice: Number(formData.originalPrice),
        salePrice: Number(formData.salePrice),
        condition: formData.condition,
        stock: Number(formData.stock),
        shortDesc: formData.shortDesc,
        description: formData.description,
        thumbnail: formData.thumbnail,
        gallery: formData.gallery,
        isFeatured: formData.isFeatured,
        isNew: formData.isNew,
        specs: formData.specs,
        variants: formData.variants,
        seo: {
          metaTitle: formData.metaTitle || formData.name,
          metaDesc: formData.metaDesc || formData.shortDesc,
          metaKeywords: ''
        }
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast('Cập nhật sản phẩm thành công!', 'success');
      } else {
        await api.createProduct(payload);
        showToast('Thêm sản phẩm mới thành công!', 'success');
      }

      setIsModalOpen(false);
      loadProducts();
    } catch {
      showToast('Lưu thông tin sản phẩm thất bại.', 'error');
    }
  };

  const filtered = products.filter(p => {
    return (
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Danh Sách Sản Phẩm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng <strong className="text-blue-600 font-bold">{products.length}</strong> sản phẩm trong kho hệ thống
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên máy, mã SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả thương hiệu</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải sản phẩm...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Không có sản phẩm nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 w-16">Ảnh</th>
                  <th className="py-3.5 px-4">Tên Sản Phẩm</th>
                  <th className="py-3.5 px-4">Mã SKU</th>
                  <th className="py-3.5 px-4">Tình Trạng</th>
                  <th className="py-3.5 px-4 text-right">Giá Bán</th>
                  <th className="py-3.5 px-4 text-center">Tồn Kho</th>
                  <th className="py-3.5 px-4 text-center">Nổi Bật</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                      <div className="truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {p.variants?.length ? `${p.variants.length} biến thể` : 'Tiêu chuẩn'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 font-semibold">{p.sku}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.condition === 'new'
                            ? 'bg-blue-100 text-blue-700'
                            : p.condition === 'like_new'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {p.condition === 'new'
                          ? 'Mới 100%'
                          : p.condition === 'like_new'
                          ? 'Like New'
                          : 'Cũ 98%'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                      {formatVnd(p.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          p.stock <= 5
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.isFeatured ? (
                        <span className="text-amber-500 font-bold">★ Có</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
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

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? `Chỉnh Sửa Sản Phẩm: ${editingProduct.name}` : 'Thêm Sản Phẩm Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              {/* Row 1: Name, SKU, Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Tên sản phẩm *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 2: Category, Brand, Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Danh mục</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thương hiệu</label>
                  <select
                    value={formData.brandId}
                    onChange={e => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tình trạng máy</label>
                  <select
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value as ProductCondition })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="new">Mới 100% Nguyên Seal</option>
                    <option value="like_new">Like New 99%</option>
                    <option value="used">Cũ 98% Đã qua sử dụng</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Prices & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giá khuyến mãi (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={formData.salePrice}
                    onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold text-blue-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giá gốc niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số lượng tồn kho</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Thumbnail & Gallery URL */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ảnh đại diện Thumbnail (URL)</label>
                  <input
                    type="text"
                    value={formData.thumbnail}
                    onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Gallery List */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Album ảnh bổ sung (Gallery)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Dán link ảnh https://..."
                      value={formData.galleryInput}
                      onChange={e => setFormData({ ...formData, galleryInput: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-900"
                    >
                      Thêm ảnh
                    </button>
                  </div>
                  {formData.gallery.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pt-2">
                      {formData.gallery.map((url, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-lg border border-slate-200 p-0.5 shrink-0 bg-slate-50">
                          <img src={url} alt="Gallery" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryUrl(idx)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 5: Specs Builder */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-800 block">Thông Số Kỹ Thuật (Key - Value)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên thông số (VD: RAM)"
                    value={specKey}
                    onChange={e => setSpecKey(e.target.value)}
                    className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Giá trị (VD: 16GB LPDDR5X)"
                    value={specVal}
                    onChange={e => setSpecVal(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(formData.specs).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]"
                    >
                      <strong>{k}:</strong> {v}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(k)}
                        className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 6: Variants Builder */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-800 block">Phiên Bản / Biến Thể Cấu Hình</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Tên biến thể (256GB / Đen)"
                    value={varTitle}
                    onChange={e => setVarTitle(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl col-span-2"
                  />
                  <input
                    type="number"
                    placeholder="Giá bán"
                    value={varPrice || ''}
                    onChange={e => setVarPrice(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Thêm bản
                  </button>
                </div>

                {formData.variants.length > 0 && (
                  <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 mt-2">
                    {formData.variants.map(v => (
                      <div key={v.id} className="p-2 flex items-center justify-between">
                        <div>
                          <strong>{v.title}</strong> - {formatVnd(v.price)} (Tồn: {v.stock})
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 7: Short Desc & Description */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={formData.shortDesc}
                    onChange={e => setFormData({ ...formData, shortDesc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mô tả bài viết chi tiết</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 8: Checkboxes */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700">Đánh dấu Nổi Bật (Trang chủ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={e => setFormData({ ...formData, isNew: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700">Hàng Mới Về</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  {editingProduct ? 'Cập Nhật Sản Phẩm' : 'Tạo Sản Phẩm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
