import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  Sparkles,
  Laptop,
  Briefcase,
  Gamepad2,
  Palette,
  Cpu,
  Armchair,
  Check,
  Search,
  ArrowRight,
  Filter
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

interface FinderProps {
  products: any[];
}

export const SmartLaptopFinder: React.FC<FinderProps> = ({ products }) => {
  const { navigateToProduct, setWebsitePage, setSearchQuery, setActiveCategoryFilter } = useApp();

  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  const purposes = [
    {
      id: 'all',
      title: 'Tất cả nhu cầu',
      desc: 'Xem toàn bộ sản phẩm',
      icon: Filter
    },
    {
      id: 'office',
      title: 'Học tập - Văn phòng',
      desc: 'Pin trâu, mỏng nhẹ, gõ phím êm',
      icon: Laptop,
      keywords: ['macbook', 'air', 'inspiron', 'zenbook', 'gram', 'thinkpad']
    },
    {
      id: 'business',
      title: 'Doanh nhân - Sang trọng',
      desc: 'Vỏ nhôm nguyên khối, bảo mật cao',
      icon: Briefcase,
      keywords: ['xps', 'thinkpad x1', 'macbook pro', 'yoga']
    },
    {
      id: 'gaming',
      title: 'Gaming & eSports',
      desc: 'Tần số quét cao, tản nhiệt tốt, GPU rời',
      icon: Gamepad2,
      keywords: ['legion', 'rog', 'tuf', 'loq', 'rtx']
    },
    {
      id: 'design',
      title: 'Đồ họa - Kỹ thuật 3D',
      desc: 'Màn hình chuẩn màu DCI-P3, CPU khủng',
      icon: Palette,
      keywords: ['pro', 'oled', 'creator', 'rtx', 'precision']
    },
    {
      id: 'ai',
      title: 'Laptop AI Thế Hệ Mới',
      desc: 'Tích hợp NPU AI Core Ultra / M3 / M4',
      icon: Cpu,
      keywords: ['ultra', 'ai', 'm3', 'm4', 'copilot']
    },
    {
      id: 'setup',
      title: 'Setup Công Thái Học',
      desc: 'Bàn nâng hạ, ghế Ergonomic, phím chuột',
      icon: Armchair,
      keywords: ['bàn', 'ghế', 'phím', 'chuột', 'màn hình']
    }
  ];

  const budgets = [
    { id: 'all', label: 'Tất cả mức giá' },
    { id: 'under-15', label: 'Dưới 15 Triệu', min: 0, max: 15000000 },
    { id: '15-25', label: '15 - 25 Triệu', min: 15000000, max: 25000000 },
    { id: '25-40', label: '25 - 40 Triệu', min: 25000000, max: 40000000 },
    { id: 'above-40', label: 'Trên 40 Triệu', min: 40000000, max: 999000000 }
  ];

  const brands = [
    { id: 'all', label: 'Tất cả hãng' },
    { id: 'apple', label: 'Apple (MacBook)' },
    { id: 'lenovo', label: 'Lenovo (ThinkPad/Legion)' },
    { id: 'dell', label: 'Dell (XPS)' },
    { id: 'asus', label: 'Asus (ROG/Zenbook)' },
    { id: 'lg', label: 'LG (Gram)' }
  ];

  // Filtering logic
  const filteredProducts = products.filter(p => {
    // Purpose filter
    if (selectedPurpose !== 'all') {
      const purpose = purposes.find(item => item.id === selectedPurpose);
      if (purpose && purpose.keywords) {
        const text = `${p.name} ${p.shortDesc || ''} ${JSON.stringify(p.specs || {})}`.toLowerCase();
        const matches = purpose.keywords.some(k => text.includes(k.toLowerCase()));
        if (!matches) return false;
      }
    }

    // Budget filter
    if (selectedBudget !== 'all') {
      const budget = budgets.find(b => b.id === selectedBudget);
      if (budget && budget.min !== undefined && budget.max !== undefined) {
        if (p.salePrice < budget.min || p.salePrice > budget.max) return false;
      }
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      const text = `${p.name} ${p.brandId || ''}`.toLowerCase();
      if (!text.includes(selectedBrand.toLowerCase())) return false;
    }

    return true;
  });

  const handleApplyFilter = () => {
    setActiveCategoryFilter(null);
    setWebsitePage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1C86EE] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#5CACEE]" />
            <span>Trợ Lý Chọn Máy Thông Minh GPSOFT Experience</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tìm Thiết Bị Công Nghệ Đúng Gu Của Bạn
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Chọn nhanh theo nhu cầu công việc và ngân sách mong muốn để tìm cỗ máy ưng ý nhất.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#FFFFE8] px-4 py-2 rounded-2xl border border-amber-200/60 self-start sm:self-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">
            Tìm thấy <strong className="text-[#1C86EE] font-black">{filteredProducts.length}</strong> máy phù hợp
          </span>
        </div>
      </div>

      {/* Step 1: Chọn Nhu cầu */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#1C86EE] text-white flex items-center justify-center text-[10px] font-black">
            1
          </span>
          <span>Chọn Mục Đích Sử Dụng Chính:</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {purposes.map(item => {
            const Icon = item.icon;
            const isSelected = selectedPurpose === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedPurpose(item.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C86EE] border-[#1C86EE] text-white shadow-md shadow-[#1C86EE]/25 scale-[1.02]'
                    : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-[#FFFFE8] hover:border-[#5CACEE]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#1C86EE] shadow-xs'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold leading-tight">{item.title}</div>
                <div
                  className={`text-[10px] mt-1 line-clamp-1 ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 & 3: Tầm giá & Thương hiệu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Tầm giá */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#5CACEE] text-slate-950 flex items-center justify-center text-[10px] font-black">
              2
            </span>
            <span>Khoảng Ngân Sách Dự Kiến:</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {budgets.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBudget(b.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedBudget === b.id
                    ? 'bg-[#1C86EE] text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thương hiệu */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
              3
            </span>
            <span>Thương Hiệu Ưu Tiên:</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {brands.map(br => (
              <button
                key={br.id}
                onClick={() => setSelectedBrand(br.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedBrand === br.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {br.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview Matching Results (Top 4) */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Gợi ý hàng đầu theo bộ lọc của bạn:
          </span>

          <button
            onClick={handleApplyFilter}
            className="text-xs font-bold text-[#1C86EE] hover:text-[#1472CE] flex items-center gap-1 cursor-pointer group"
          >
            <span>Xem tất cả {filteredProducts.length} kết quả</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 space-y-2">
            <p>Không có sản phẩm nào khớp hoàn toàn với tiêu chí trên.</p>
            <button
              onClick={() => {
                setSelectedPurpose('all');
                setSelectedBudget('all');
                setSelectedBrand('all');
              }}
              className="text-xs font-bold text-[#1C86EE] hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredProducts.slice(0, 4).map(prod => (
              <div
                key={prod.id}
                onClick={() => navigateToProduct(prod.slug || prod.id)}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-[#1C86EE] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="aspect-square rounded-xl bg-slate-50/70 p-2 overflow-hidden flex items-center justify-center">
                    <img
                      src={prod.thumbnail}
                      alt={prod.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#1C86EE] uppercase">{prod.sku}</span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-[#1C86EE] transition-colors">
                      {prod.name}
                    </h4>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <div className="text-xs font-extrabold text-[#1C86EE]">
                    {formatVnd(prod.salePrice)}
                  </div>
                  {prod.originalPrice > prod.salePrice && (
                    <div className="text-[10px] text-slate-400 line-through">
                      {formatVnd(prod.originalPrice)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
