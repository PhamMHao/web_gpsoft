import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { MediaFile } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  UploadCloud,
  Copy,
  Check,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/format.ts';

export const FileManagerView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'library' | 'cloudinary'>('library');

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');

  const loadMedia = async () => {
    try {
      const res = await api.getMedia();
      if (res.success) setFiles(res.data || []);
    } catch {
      showToast('Không tải được thư viện media.', 'error');
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  // Cloudinary settings
  const [cloudinaryConfig, setCloudinaryConfig] = useState({
    cloudName: 'gpsoft-store',
    apiKey: '984712398412394',
    apiSecret: '••••••••••••••••••••••••••',
    uploadPreset: 'ml_default',
    autoOptimize: true
  });

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Đã sao chép link ảnh vào clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await api.uploadFile(file);
      if (res.success && res.data) {
        setFiles(prev => [res.data, ...prev]);
        showToast('Tải ảnh lên thành công!', 'success');
      }
    } catch {
      showToast('Tải ảnh thất bại.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = newUrlInput.trim();
    if (!url) return;
    try {
      const filename = url.split('/').pop()?.split('?')[0] || `image-${Date.now()}.jpg`;
      const res = await api.createMedia({ url, filename, originalName: filename });
      if (res.success && res.data) {
        setFiles(prev => [res.data, ...prev]);
        setNewUrlInput('');
        showToast('Đã thêm ảnh vào thư viện!', 'success');
      }
    } catch {
      showToast('Thêm ảnh thất bại.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa tệp này khỏi thư viện?')) return;
    try {
      await api.deleteMedia(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      showToast('Đã xóa ảnh khỏi thư viện.', 'info');
    } catch {
      showToast('Xóa ảnh thất bại.', 'error');
    }
  };

  const handleSaveCloudinary = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Đã lưu cấu hình Cloudinary thành công! Sẵn sàng upload CDN.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Thư Viện Đa Phương Tiện & Quản Lý File
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu trữ hình ảnh sản phẩm, banner, tài liệu PDF và đồng bộ Cloudinary CDN
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'library' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Thư Viện Ảnh ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('cloudinary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cloudinary' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Cấu Hình Cloudinary CDN
          </button>
        </div>
      </div>

      {activeTab === 'library' ? (
        /* Library View */
        <div className="space-y-6">
          {/* Upload Box & URL Adder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload form file */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Tải File Từ Máy Tính</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hỗ trợ định dạng JPG, PNG, WEBP, PDF tối đa 10MB
                </p>
              </div>

              <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors block">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-700 block">
                  {uploading ? 'Đang tải file lên...' : 'Nhấp để chọn file hoặc kéo thả vào đây'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Tự động nén và tối ưu hiển thị</span>
              </label>
            </div>

            {/* Quick URL adder */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Thêm Bằng Đường Dẫn Trực Tuyến</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dán trực tiếp URL ảnh từ Unsplash, Cloudinary hoặc nguồn khác
                </p>
              </div>

              <form onSubmit={handleAddUrl} className="space-y-3">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newUrlInput}
                  onChange={e => setNewUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Lưu Vào Thư Viện
                </button>
              </form>
            </div>
          </div>

          {/* Media Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Tất Cả Tệp Tin Trong Thư Viện ({files.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map(file => (
                <div
                  key={file.id}
                  className="group rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="aspect-square relative overflow-hidden bg-white p-2">
                    <img
                      src={file.url}
                      alt={file.originalName || file.filename || file.name || 'media'}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="p-3 bg-white border-t border-slate-100 space-y-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 truncate" title={file.originalName || file.filename || file.name}>
                        {file.originalName || file.filename || file.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatBytes(file.size)} • {formatDate(file.uploadedAt || file.createdAt, 'date')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        onClick={() => handleCopyUrl(file.id, file.url)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === file.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Cloudinary Integration Tab */
        <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
              ☁
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cấu Hình Kết Nối Cloudinary CDN</h3>
              <p className="text-xs text-slate-500">
                Lưu trữ và phân phối hình ảnh qua mạng lưới máy chủ CDN toàn cầu tốc độ cao
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCloudinary} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Cloud Name *</label>
              <input
                type="text"
                required
                value={cloudinaryConfig.cloudName}
                onChange={e => setCloudinaryConfig({ ...cloudinaryConfig, cloudName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">API Key *</label>
              <input
                type="text"
                required
                value={cloudinaryConfig.apiKey}
                onChange={e => setCloudinaryConfig({ ...cloudinaryConfig, apiKey: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">API Secret *</label>
              <input
                type="password"
                required
                value={cloudinaryConfig.apiSecret}
                onChange={e => setCloudinaryConfig({ ...cloudinaryConfig, apiSecret: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Upload Preset (Tùy chọn)</label>
              <input
                type="text"
                value={cloudinaryConfig.uploadPreset}
                onChange={e => setCloudinaryConfig({ ...cloudinaryConfig, uploadPreset: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={cloudinaryConfig.autoOptimize}
                onChange={e => setCloudinaryConfig({ ...cloudinaryConfig, autoOptimize: e.target.checked })}
                className="rounded text-blue-600 w-4 h-4"
              />
              <span className="font-bold text-slate-700">
                Tự động tối ưu định dạng ảnh WebP/AVIF và nén chất lượng (f_auto, q_auto)
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Lưu Cấu Hình & Kiểm Tra Kết Nối Cloudinary
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
