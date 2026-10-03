import React, { useState, useEffect } from 'react';
import { Banner } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const HeroSlider: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const { setWebsitePage } = useApp();

  useEffect(() => {
    api.getBanners().then(res => {
      if (res.success && res.data.length > 0) {
        setBanners(res.data.filter(b => b.isActive));
      }
    }).catch(e => console.error('Failed to load banners:', e));
  }, []);

  // Auto advance slider every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIdx];

  const handlePrev = () => {
    setCurrentIdx(prev => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIdx(prev => (prev + 1) % banners.length);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl mx-auto max-w-7xl">
      {/* Background Image with Overlay */}
      <div className="relative h-[380px] sm:h-[460px] md:h-[500px] w-full">
        <img
          src={currentBanner.imageUrl}
          alt={currentBanner.title}
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-all duration-700 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />

        {/* Content Overlay */}
        <div className="relative h-full max-w-3xl flex flex-col justify-center px-6 sm:px-12 md:px-16 z-10 space-y-4">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {currentBanner.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed line-clamp-3">
            {currentBanner.subtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setWebsitePage('products');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-[#1C86EE]/30 transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm"
            >
              <span>{currentBanner.buttonText || 'Khám Phá Ngay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setWebsitePage('price-list');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-all border border-white/20 cursor-pointer"
            >
              Xem Bảng Giá Nhanh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-20 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-20 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === currentIdx ? 'w-8 bg-[#1C86EE]' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
