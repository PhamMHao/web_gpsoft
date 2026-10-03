import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Layers, X, ArrowRight, Trash2 } from 'lucide-react';

export const FloatingCompareBar: React.FC = () => {
  const {
    compareList,
    removeFromCompare,
    clearCompare,
    setIsCompareModalOpen,
    viewMode
  } = useApp();

  if (viewMode === 'cms' || compareList.length === 0) return null;

  return (
    <aside
      aria-label="Thanh so sánh sản phẩm"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 max-w-[95vw] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-2 pl-2">
        <div className="w-8 h-8 rounded-xl bg-[#1C86EE] text-white flex items-center justify-center font-bold">
          <Layers className="w-4 h-4" />
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-bold leading-tight">So Sánh Sản Phẩm</div>
          <div className="text-[10px] text-slate-400">Đã chọn ({compareList.length}/4)</div>
        </div>
      </div>

      {/* Thumbnails preview */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {compareList.map(prod => (
          <div
            key={prod.id}
            className="relative group w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 shrink-0 border border-slate-700"
          >
            <img
              src={prod.thumbnail}
              alt={prod.name}
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => removeFromCompare(prod.id)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] opacity-90 hover:opacity-100 shadow-xs cursor-pointer"
              title="Bỏ so sánh"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: Math.max(0, 2 - compareList.length) }).map((_, idx) => (
          <div
            key={`placeholder-${idx}`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0"
          >
            +
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 pr-1">
        <button
          onClick={() => setIsCompareModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#1C86EE]/30 cursor-pointer whitespace-nowrap transition-all"
        >
          <span>So Sánh Ngay</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={clearCompare}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Xóa danh sách so sánh"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
