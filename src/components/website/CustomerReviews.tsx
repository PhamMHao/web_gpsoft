import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductReview, ReviewStats } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Star,
  ThumbsUp,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Filter,
  ArrowUpDown,
  Send,
  User as UserIcon,
  Check,
  Clock,
  ChevronDown,
  X,
  Award
} from 'lucide-react';
import { formatDate } from '../../utils/format.ts';

interface CustomerReviewsProps {
  product: Product;
}

const QUICK_TAG_SUGGESTIONS = [
  'Giao hàng hỏa tốc 2H',
  'Đóng gói rất kỹ 3 lớp',
  'Đúng mô tả 100%',
  'Máy mới nguyên seal',
  'Camera sắc nét',
  'Pin cực trâu',
  'Nhân viên tư vấn nhiệt tình',
  'Bảo hành chính hãng uy tín'
];

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({ product }) => {
  const { showToast } = useApp();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Sort State
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'rating-desc' | 'rating-asc' | 'helpful'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [variantInput, setVariantInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  // Default variant
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setVariantInput(product.variants[0].title);
    }
  }, [product]);

  // Load reviews from API
  useEffect(() => {
    loadReviews();
  }, [product.id]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await api.getProductReviews(product.id);
      if (res.success) {
        setReviews(res.data);
        setStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle helpful upvote
  const handleUpvote = async (reviewId: string) => {
    if (upvotedIds[reviewId]) {
      showToast('Bạn đã thích đánh giá này rồi.', 'info');
      return;
    }

    try {
      setUpvotedIds(prev => ({ ...prev, [reviewId]: true }));
      // Optimistic update
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
      );
      await api.upvoteReview(reviewId);
      showToast('Cảm ơn bạn đã ghi nhận đánh giá hữu ích!', 'success');
    } catch (e) {
      console.error('Failed to upvote review:', e);
    }
  };

  // Toggle quick tag selection
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Submit new review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      showToast('Vui lòng nhập họ và tên của bạn!', 'error');
      return;
    }
    if (!commentInput.trim() || commentInput.trim().length < 5) {
      showToast('Nội dung đánh giá cần ít nhất 5 ký tự!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitProductReview(product.id, {
        userName: nameInput.trim(),
        userPhone: phoneInput.trim() || undefined,
        userEmail: emailInput.trim() || undefined,
        rating: ratingInput,
        title: titleInput.trim() || undefined,
        comment: commentInput.trim(),
        variantTitle: variantInput || undefined,
        tags: selectedTags
      });

      if (res.success && res.data) {
        showToast('Cảm ơn bạn! Đánh giá đã được đăng thành công.', 'success');
        // Reset form
        setNameInput('');
        setPhoneInput('');
        setEmailInput('');
        setTitleInput('');
        setCommentInput('');
        setSelectedTags([]);
        setIsFormOpen(false);
        // Reload reviews to reflect stats & ordering
        loadReviews();
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể gửi đánh giá lúc này.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (selectedStarFilter !== null) {
      list = list.filter(r => Math.round(r.rating) === selectedStarFilter);
    }

    if (onlyVerified) {
      list = list.filter(r => r.isVerifiedPurchase);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.comment.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          r.userName.toLowerCase().includes(q) ||
          (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'rating-desc') {
        return b.rating - a.rating;
      }
      if (sortBy === 'rating-asc') {
        return a.rating - b.rating;
      }
      if (sortBy === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      }
      return 0;
    });

    return list;
  }, [reviews, selectedStarFilter, onlyVerified, sortBy, searchQuery]);

  // Star Rating Descriptive Text
  const getRatingFeedback = (star: number) => {
    switch (star) {
      case 5:
        return 'Cực kỳ hài lòng / Tuyệt vời ⭐⭐⭐⭐⭐';
      case 4:
        return 'Hài lòng / Sản phẩm rất tốt ⭐⭐⭐⭐';
      case 3:
        return 'Bình thường / Tạm ổn ⭐⭐⭐';
      case 2:
        return 'Chưa hài lòng ⭐⭐';
      case 1:
        return 'Thất vọng / Rất tệ ⭐';
      default:
        return '';
    }
  };

  const effectiveAverage = stats?.averageRating || 5.0;
  const effectiveTotal = stats?.totalReviews || reviews.length;
  const distribution = stats?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <section id="customer-reviews-section" className="space-y-8 pt-8 border-t border-slate-200">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1C86EE]">
            <Award className="w-4 h-4" />
            <span>Trải Nghiệm Khách Hàng Thực Tế</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Đánh Giá & Nhận Xét Về Sản Phẩm
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Tất cả phản hồi từ khách hàng đã trải nghiệm và mua hàng tại GPSOFT
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs shadow-md shadow-[#1C86EE]/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isFormOpen ? 'Đóng Biểu Mẫu' : 'Viết Đánh Giá Của Bạn'}</span>
        </button>
      </div>

      {/* Ratings Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Big Score & Stars (4 cols) */}
          <div className="lg:col-span-4 text-center lg:text-left space-y-3 lg:border-r lg:border-slate-100 lg:pr-8">
            <div className="flex items-baseline justify-center lg:justify-start gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {effectiveAverage.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 5.0</span>
            </div>

            {/* Stars row */}
            <div className="flex items-center justify-center lg:justify-start gap-1">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= Math.round(effectiveAverage);
                return (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      filled
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                  />
                );
              })}
            </div>

            <div className="text-xs font-semibold text-slate-600">
              Dựa trên <strong>{effectiveTotal}</strong> lượt đánh giá thực tế
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{stats?.recommendedPercentage || 98}% khách hàng khuyên dùng</span>
            </div>
          </div>

          {/* Right: Rating Distribution Bars (8 cols) */}
          <div className="lg:col-span-8 space-y-2.5">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = distribution[stars as keyof typeof distribution] || 0;
              const percent = effectiveTotal > 0 ? Math.round((count / effectiveTotal) * 100) : 0;
              const isSelected = selectedStarFilter === stars;

              return (
                <button
                  key={stars}
                  onClick={() => setSelectedStarFilter(isSelected ? null : stars)}
                  className={`w-full flex items-center gap-3 text-xs p-1.5 rounded-xl transition-all cursor-pointer ${
                    isSelected ? 'bg-[#1C86EE]/10 ring-1 ring-[#1C86EE]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-slate-700">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>

                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        stars >= 4
                          ? 'bg-gradient-to-r from-[#1C86EE] to-[#5CACEE]'
                          : stars === 3
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>

                  <div className="w-16 text-right shrink-0 text-slate-500 font-medium">
                    <span className="font-bold text-slate-800">{count}</span>{' '}
                    <span className="text-[10px]">({percent}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review Submission Form Drawer / Card */}
      {isFormOpen && (
        <div className="bg-[#FFFEEA] border border-[#1C86EE]/30 rounded-3xl p-6 sm:p-8 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-[#1C86EE]/20 mb-6">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
              <Sparkles className="w-5 h-5 text-[#1C86EE]" />
              <span>Gửi Đánh Giá Của Bạn Cho: {product.name}</span>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-6">
            {/* Interactive Star Rating Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Mức độ hài lòng của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map(star => {
                    const active = (hoverRating !== null ? hoverRating : ratingInput) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            active
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 fill-slate-100'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-[#1C86EE] ml-2">
                  {getRatingFeedback(hoverRating !== null ? hoverRating : ratingInput)}
                </span>
              </div>
            </div>

            {/* Quick Tags Suggestions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Điểm nổi bật bạn ấn tượng nhất (chọn nhanh):
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAG_SUGGESTIONS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1C86EE] border-[#1C86EE] text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-[#1C86EE]/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Số điện thoại <span className="text-slate-400 font-normal">(để xác thực đã mua)</span>
                </label>
                <input
                  type="tel"
                  placeholder="09xx xxx xxx"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Phiên bản trải nghiệm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Màu Titan / 256GB"
                  value={variantInput}
                  onChange={e => setVariantInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Tiêu đề ngắn gọn <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Máy rất mượt, pin trâu hơn mong đợi..."
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Nội dung chi tiết nhận xét <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Chia sẻ trải nghiệm sử dụng, cảm nhận về chất lượng phần cứng, màn hình, camera hoặc dịch vụ giao hàng..."
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1C86EE] focus:outline-hidden leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Đánh giá được kiểm duyệt văn minh và bảo vệ dữ liệu cá nhân</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs shadow-md shadow-[#1C86EE]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Đăng Nhận Xét Ngay</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Star filter chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc:</span>
          </span>

          <button
            onClick={() => setSelectedStarFilter(null)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedStarFilter === null
                ? 'bg-[#1C86EE] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất Cả ({reviews.length})
          </button>

          {[5, 4, 3, 2, 1].map(stars => {
            const count = distribution[stars as keyof typeof distribution] || 0;
            const isSelected = selectedStarFilter === stars;
            return (
              <button
                key={stars}
                onClick={() => setSelectedStarFilter(isSelected ? null : stars)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C86EE] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{stars}</span>
                <Star className={`w-3 h-3 ${isSelected ? 'fill-white' : 'fill-amber-400 text-amber-400'}`} />
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}

          <button
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
              onlyVerified
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã mua hàng</span>
          </button>
        </div>

        {/* Sort Selection */}
        <div className="flex items-center gap-2 text-xs ml-auto">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sắp xếp:</span>
          </span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#1C86EE] cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="rating-desc">Đánh giá cao nhất</option>
            <option value="rating-asc">Đánh giá thấp nhất</option>
            <option value="helpful">Hữu ích nhất</option>
          </select>
        </div>
      </div>

      {/* Review List Display */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-[#1C86EE] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Đang tải đánh giá từ khách hàng...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#1C86EE]/10 text-[#1C86EE] flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-base">
              Chưa có đánh giá nào phù hợp với bộ lọc này
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy là người đầu tiên để lại nhận xét hoặc bấm làm mới bộ lọc để xem toàn bộ đánh giá.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(selectedStarFilter !== null || onlyVerified || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStarFilter(null);
                  setOnlyVerified(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-5 py-2 bg-[#1C86EE] hover:bg-[#1472CE] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              Viết đánh giá đầu tiên
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(rev => {
            const hasUpvoted = !!upvotedIds[rev.id];

            return (
              <div
                key={rev.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4 transition-all hover:border-[#1C86EE]/40"
              >
                {/* Header: User Info & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    {rev.userAvatar ? (
                      <img
                        src={rev.userAvatar}
                        alt={rev.userName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1C86EE] to-[#5CACEE] text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                        {rev.userName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">
                          {rev.userName}
                        </span>

                        {rev.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã mua hàng tại GPSOFT</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(rev.createdAt)}</span>
                        </span>

                        {rev.variantTitle && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600">
                              Phân loại: {rev.variantTitle}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stars Display */}
                  <div className="flex items-center gap-1 self-start sm:self-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Body */}
                <div className="space-y-2">
                  {rev.title && (
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {rev.title}
                    </h4>
                  )}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Feature Tags */}
                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* GPSOFT Admin Official Reply Box */}
                {rev.adminReply && (
                  <div className="bg-[#FFFFE8] rounded-2xl p-4 border border-[#1C86EE]/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C86EE]">
                        <ShieldCheck className="w-4 h-4 text-[#1C86EE]" />
                        <span>{rev.adminReply.author}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(rev.adminReply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {rev.adminReply.content}
                    </p>
                  </div>
                )}

                {/* Footer Action: Helpful button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    Đánh giá này có hữu ích với bạn không?
                  </div>

                  <button
                    onClick={() => handleUpvote(rev.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hasUpvoted
                        ? 'bg-[#1C86EE]/15 text-[#1C86EE]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-[#1C86EE]' : ''}`} />
                    <span>Hữu ích ({rev.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
