import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  X,
  Trash2,
  ShoppingCart,
  Check,
  Cpu,
  HardDrive,
  Monitor,
  Zap,
  Weight,
  ShieldCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatVnd } from '../../utils/format.ts';

export const CompareModal: React.FC = () => {
  const {
    compareList,
    removeFromCompare,
    clearCompare,
    isCompareModalOpen,
    setIsCompareModalOpen,
    addToCart,
    navigateToProduct
  } = useApp();

  if (!isCompareModalOpen) return null;

  const getSpecValue = (product: any, key: string, fallback = 'Đang cập nhật') => {
    if (!product.specs) return fallback;
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(product.specs)) {
      if (k.toLowerCase().includes(lowerKey)) return String(v);
    }
    return fallback;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FFFFE8]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1C86EE]/15 text-[#1C86EE] text-[11px] font-bold uppercase tracking-wider">
                ThinkPro Compare Tool
              </span>
              <span className="text-xs text-slate-400">({compareList.length}/4 sản phẩm)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
              So Sánh Chi Tiết Thông Số Kỹ Thuật
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {compareList.length > 0 && (
              <button
                onClick={clearCompare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            )}

            <button
              onClick={() => setIsCompareModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {compareList.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
                <Layers className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Chưa có sản phẩm nào trong danh sách so sánh</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy nhấn nút "So sánh" trên các sản phẩm công nghệ bạn đang phân vân để xem bảng đối chiếu chi tiết CPU, RAM, màn hình và giá bán.
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1C86EE] text-white text-xs font-bold shadow-md shadow-[#1C86EE]/20 hover:bg-[#1472CE] transition-all cursor-pointer"
              >
                Tiếp tục xem sản phẩm
              </button>
            </div>
          ) : (
            <div className="min-w-[650px]">
              {/* Product Cards Row */}
              <div className="grid grid-cols-5 gap-4 pb-6 border-b border-slate-200">
                <div className="flex flex-col justify-end p-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sản phẩm đối chiếu
                </div>

                {compareList.map(prod => (
                  <div
                    key={prod.id}
                    className="relative bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3 group"
                  >
                    <button
                      onClick={() => removeFromCompare(prod.id)}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-white/90 text-slate-400 hover:text-rose-600 shadow-xs cursor-pointer z-10"
                      title="Xóa khỏi so sánh"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-2">
                      <div className="aspect-square rounded-xl bg-white p-2 border border-slate-100 overflow-hidden flex items-center justify-center">
                        <img
                          src={prod.thumbnail}
                          alt={prod.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C86EE]">
                          {prod.sku}
                        </span>
                        <h4
                          onClick={() => {
                            setIsCompareModalOpen(false);
                            navigateToProduct(prod.slug || prod.id);
                          }}
                          className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-[#1C86EE] transition-colors cursor-pointer"
                        >
                          {prod.name}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <div>
                        <div className="text-sm font-extrabold text-[#1C86EE]">
                          {formatVnd(prod.salePrice)}
                        </div>
                        {prod.originalPrice > prod.salePrice && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {formatVnd(prod.originalPrice)}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => addToCart(prod)}
                          className="py-1.5 px-2 rounded-lg bg-[#1C86EE] hover:bg-[#1472CE] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Mua</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsCompareModalOpen(false);
                            navigateToProduct(prod.slug || prod.id);
                          }}
                          className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#1C86EE] hover:border-[#1C86EE] text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty slots placeholders */}
                {Array.from({ length: 4 - compareList.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                      +
                    </div>
                    <span className="text-[11px] font-medium">Thêm sản phẩm khác để so sánh</span>
                  </div>
                ))}
              </div>

              {/* Specs Rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {/* Vi xử lý (CPU) */}
                <div className="grid grid-cols-5 py-3 items-center">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#1C86EE]" />
                    <span>Vi xử lý (CPU)</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'CPU') || getSpecValue(prod, 'Chip', 'Intel / AMD')}
                    </div>
                  ))}
                </div>

                {/* Bộ nhớ RAM */}
                <div className="grid grid-cols-5 py-3 items-center bg-slate-50/50">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Bộ nhớ RAM</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'RAM', '16GB DDR5 / LPDDR5X')}
                    </div>
                  ))}
                </div>

                {/* Ổ cứng lưu trữ */}
                <div className="grid grid-cols-5 py-3 items-center">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ổ cứng SSD</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'SSD') || getSpecValue(prod, 'Ổ cứng', '512GB NVMe PCIe')}
                    </div>
                  ))}
                </div>

                {/* Màn hình */}
                <div className="grid grid-cols-5 py-3 items-center bg-slate-50/50">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#5CACEE]" />
                    <span>Màn hình</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'Màn hình', '14 - 16 inch IPS / OLED')}
                    </div>
                  ))}
                </div>

                {/* Card đồ họa (GPU) */}
                <div className="grid grid-cols-5 py-3 items-center">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Đồ họa (GPU)</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'GPU') || getSpecValue(prod, 'VGA', 'Intel Arc / NVIDIA RTX')}
                    </div>
                  ))}
                </div>

                {/* Cân nặng & Kích thước */}
                <div className="grid grid-cols-5 py-3 items-center bg-slate-50/50">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5 text-slate-500" />
                    <span>Trọng lượng</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-slate-800 pr-4">
                      {getSpecValue(prod, 'Trọng lượng') || getSpecValue(prod, 'Khối lượng', '~1.3 kg')}
                    </div>
                  ))}
                </div>

                {/* Tình trạng & Bảo hành */}
                <div className="grid grid-cols-5 py-3 items-center">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bảo hành GPSOFT</span>
                  </div>
                  {compareList.map(prod => (
                    <div key={prod.id} className="font-medium text-emerald-700 pr-4">
                      12 - 24 tháng chính hãng (1 đổi 1 30 ngày)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cam kết hàng chính hãng 100%, có sẵn tại showroom trải nghiệm</span>
          </div>
          <button
            onClick={() => setIsCompareModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
          >
            Đóng bảng so sánh
          </button>
        </div>
      </div>
    </div>
  );
};
