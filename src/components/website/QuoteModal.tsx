import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { LEAD_SOURCE } from '../../utils/leadSource.ts';
import { X, Send, Building2, CheckCircle2, Wrench } from 'lucide-react';

export const QuoteModal: React.FC = () => {
  const { isQuoteModalOpen, setIsQuoteModalOpen, quoteProductPrefill, quoteRequestType, showToast } = useApp();
  // P1.3 — cùng 1 modal phục vụ 2 luồng: báo giá doanh nghiệp (`quote`) và yêu cầu bảo hành (`warranty`).
  const isWarranty = quoteRequestType === 'warranty';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (quoteProductPrefill) {
      setForm(prev => ({
        ...prev,
        subject: isWarranty
          ? `Yêu cầu bảo hành cho: ${quoteProductPrefill}`
          : `Yêu cầu báo giá cho: ${quoteProductPrefill}`
      }));
    }
  }, [quoteProductPrefill, isWarranty]);

  if (!isQuoteModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      showToast('Vui lòng điền họ tên và số điện thoại!', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitLead({
        type: quoteRequestType,
        name: form.name,
        phone: form.phone,
        email: form.email,
        subject: form.subject || (isWarranty ? 'Yêu cầu bảo hành & sửa chữa' : 'Yêu cầu báo giá doanh nghiệp'),
        message: form.message,
        interestedProduct: quoteProductPrefill,
        // P2.3 — modal dùng chung cho 2 luồng (báo giá doanh nghiệp / bảo hành) ⇒ nguồn `quote-modal`.
        source: LEAD_SOURCE.quoteModal
      });

      if (res.success) {
        setSubmitted(true);
        showToast(
          isWarranty
            ? 'Đã gửi yêu cầu bảo hành! Kỹ thuật viên sẽ liên hệ bạn ngay.'
            : 'Yêu cầu báo giá của bạn đã được gửi thành công!',
          'success'
        );
      }
    } catch {
      showToast('Có lỗi xảy ra, vui lòng gọi hotline trực tiếp.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 my-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#FFFEEA]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1C86EE] to-[#5CACEE] text-white flex items-center justify-center font-bold shadow-md shadow-[#1C86EE]/20">
              {isWarranty ? <Wrench className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isWarranty ? 'Gửi Yêu Cầu Bảo Hành & Sửa Chữa' : 'Yêu Cầu Báo Giá Doanh Nghiệp'}
              </h3>
              <p className="text-xs text-slate-500">
                {isWarranty
                  ? 'Kỹ thuật viên sẽ gọi xác nhận trong 15 phút (giờ hành chính)'
                  : 'Chiết khấu theo số lượng & hỗ trợ hóa đơn VAT'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsQuoteModalOpen(false);
              setSubmitted(false);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">
              {isWarranty ? 'Đã Gửi Yêu Cầu Bảo Hành Thành Công!' : 'Đã Gửi Yêu Cầu Báo Giá Thành Công!'}
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              {isWarranty
                ? 'GPSOFT đã ghi nhận yêu cầu. Vui lòng mang máy kèm phiếu bảo hành tới showroom gần nhất hoặc chờ kỹ thuật viên gọi xác nhận thời gian tiếp nhận.'
                : 'Chuyên viên phụ trách khách hàng doanh nghiệp GPSOFT sẽ gửi bảng báo giá chi tiết qua Zalo / Email trong vòng 30 phút.'}
            </p>
            <button
              onClick={() => {
                setIsQuoteModalOpen(false);
                setSubmitted(false);
              }}
              className="px-5 py-2.5 bg-[#1C86EE] text-white rounded-xl text-xs font-bold hover:bg-[#1472CE] cursor-pointer shadow-md shadow-[#1C86EE]/20"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Họ và tên / Đơn vị *</label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A - Công ty ABC"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="email@congty.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                {isWarranty ? 'Sản phẩm cần bảo hành / Mã phiếu' : 'Sản phẩm / Dịch vụ quan tâm'}
              </label>
              <input
                type="text"
                placeholder={isWarranty ? 'MacBook Pro 14 M3 — serial C02XT1ABCD' : 'iPhone 16 Pro Max 256GB x 10 chiếc...'}
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">{isWarranty ? 'Tình trạng máy khi tiếp nhận' : 'Ghi chú thêm'}</label>
              <textarea
                rows={3}
                placeholder={
                  isWarranty
                    ? 'Ví dụ: máy sập nguồn đột ngột từ 20/09, bàn phím liệt 3 phím, pin chai...'
                    : 'Yêu cầu xuất VAT, địa điểm giao nhận, thời gian cần hàng...'
                }
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1C86EE] focus:bg-white focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1C86EE] to-[#5CACEE] hover:from-[#1472CE] hover:to-[#489bdf] text-white font-bold text-xs shadow-md shadow-[#1C86EE]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submitting ? 'Đang gửi...' : isWarranty ? 'Gửi Yêu Cầu Bảo Hành' : 'Gửi Yêu Cầu Báo Giá'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
