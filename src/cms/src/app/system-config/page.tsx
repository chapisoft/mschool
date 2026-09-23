'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RefreshCw,
  Cpu,
  Bell,
  HardDrive,
  Clock,
  ShieldAlert,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, putApi } from '@/lib/api';

interface SystemParameterItem {
  id: string;
  paramKey: string;
  paramValue: string;
  paramGroup: string;
  description: string;
}

export default function SystemConfigPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'AI' | 'NOTIFICATION' | 'STORAGE'>('AI');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<SystemParameterItem[]>('/system-configs');
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((item) => {
          map[item.paramKey] = item.paramValue;
        });
        setConfigs(map);
      }
    } catch (err: any) {
      console.warn('Lỗi tải cấu hình tham số:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleChange = (key: string, value: string) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.entries(configs).map(([k, v]) => ({
        paramKey: k,
        paramValue: v,
        paramGroup:
          k.startsWith('AI_') || k.startsWith('GATE_') || k.startsWith('MORNING_') || k.startsWith('AFTERNOON_')
            ? 'AI'
            : k.startsWith('NOTIF_')
            ? 'NOTIFICATION'
            : 'STORAGE',
      }));

      await putApi('/system-configs', { configs: payload });
      showSuccess('Lưu cấu hình hệ thống', 'Đã cập nhật các tham số vận hành thành công');
    } catch (err: any) {
      showError('Lỗi lưu cấu hình', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfigs({
      AI_FIQA_MIN_SCORE: '0.85',
      AI_SIMILARITY_THRESHOLD: '0.78',
      GATE_COOLDOWN_SECONDS: '90',
      MORNING_LATE_CUTOFF: '07:30',
      AFTERNOON_DEPARTURE_START: '16:00',
      NOTIF_ZNS_ENABLED: 'true',
      NOTIF_SMS_ENABLED: 'false',
      NOTIF_APP_PUSH_ENABLED: 'true',
      SNAPSHOT_RETENTION_DAYS: '90',
      STRANGER_RETENTION_HOURS: '24',
    });
    showInfo('Khôi phục mặc định', 'Đã nạp lại bộ giá trị khuyến nghị chuẩn Viettel/MSCHOOL');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-sky-600" />
            Cấu Hình Tham Số Vận Hành Hệ Thống
          </h2>
          <p className="text-sm text-slate-500">
            Quản trị các ngưỡng chất lượng AI, thời gian Cooldown chống lặp và các chính sách lưu trữ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs chuyển nhóm */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('AI')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'AI'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Tham Số AI & Điểm Danh
        </button>
        <button
          onClick={() => setActiveTab('NOTIFICATION')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'NOTIFICATION'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          Kênh Thông Báo Tức Thời
        </button>
        <button
          onClick={() => setActiveTab('STORAGE')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'STORAGE'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Lưu Trữ & Tuân Thủ Nghị Định 13
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        {activeTab === 'AI' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              Ngưỡng Đánh Giá Khuôn Mặt & Cooldown Cổng
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Ngưỡng chất lượng khuôn mặt (AI FIQA)</label>
                  <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-200">
                    {configs.AI_FIQA_MIN_SCORE || '0.85'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Điểm đánh giá chất lượng hình ảnh từ Face Image Quality Assessment (tối thiểu 0.85). Loại bỏ ảnh mờ nhòe, góc nghiêng quá lớn.
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={configs.AI_FIQA_MIN_SCORE || '0.85'}
                  onChange={(e) => handleChange('AI_FIQA_MIN_SCORE', e.target.value)}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Ngưỡng tương đồng véc-tơ (Cosine Similarity)</label>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-bold text-xs border border-emerald-200">
                    {configs.AI_SIMILARITY_THRESHOLD || '0.78'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Độ tương đồng góc giữa véc-tơ 512 chiều trích xuất và cơ sở dữ liệu để xác định chính xác danh tính.
                </p>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.01"
                  value={configs.AI_SIMILARITY_THRESHOLD || '0.78'}
                  onChange={(e) => handleChange('AI_SIMILARITY_THRESHOLD', e.target.value)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Thời gian Cooldown cổng chống quét lặp</label>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-mono font-bold text-xs border border-amber-200">
                    {configs.GATE_COOLDOWN_SECONDS || '90'} Giây
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Thời gian khóa tạm thời sau khi học sinh quét qua vạch ảo, ngăn chặn điểm danh lặp do đứng chờ trước camera.
                </p>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={configs.GATE_COOLDOWN_SECONDS || '90'}
                  onChange={(e) => handleChange('GATE_COOLDOWN_SECONDS', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-sm font-semibold text-slate-900">Mốc giờ giới hạn điểm danh muộn sáng</label>
                <p className="text-xs text-slate-500">
                  Sau mốc thời gian này, học sinh quét vào cổng sẽ tự động bị đánh dấu là "ĐẾN MUỘN".
                </p>
                <input
                  type="time"
                  value={configs.MORNING_LATE_CUTOFF || '07:30'}
                  onChange={(e) => handleChange('MORNING_LATE_CUTOFF', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'NOTIFICATION' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-600" />
              Thiết Lập Kênh Thông Báo Phụ Huynh & Giáo Viên
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 text-sm">Zalo ZNS Official</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      configs.NOTIF_ZNS_ENABLED === 'true'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {configs.NOTIF_ZNS_ENABLED === 'true' ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Gửi thông báo có gắn logo trường đến tài khoản Zalo của phụ huynh khi con đến trường.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('NOTIF_ZNS_ENABLED', configs.NOTIF_ZNS_ENABLED === 'true' ? 'false' : 'true')}
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    configs.NOTIF_ZNS_ENABLED === 'true'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {configs.NOTIF_ZNS_ENABLED === 'true' ? 'Tắt Kênh Zalo' : 'Kích Hoạt Kênh Zalo'}
                </button>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 text-sm">SMS Brandname</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      configs.NOTIF_SMS_ENABLED === 'true'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {configs.NOTIF_SMS_ENABLED === 'true' ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Kênh dự phòng gửi tin nhắn viễn thông trực tiếp khi không có kết nối Internet.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('NOTIF_SMS_ENABLED', configs.NOTIF_SMS_ENABLED === 'true' ? 'false' : 'true')}
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    configs.NOTIF_SMS_ENABLED === 'true'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {configs.NOTIF_SMS_ENABLED === 'true' ? 'Tắt SMS' : 'Kích Hoạt SMS'}
                </button>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 text-sm">App Push Notification</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      configs.NOTIF_APP_PUSH_ENABLED === 'true'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {configs.NOTIF_APP_PUSH_ENABLED === 'true' ? 'BẬT' : 'TẮT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Đẩy thông báo thời gian thực 0 đồng tới ứng dụng di động mschool của phụ huynh và giáo viên.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('NOTIF_APP_PUSH_ENABLED', configs.NOTIF_APP_PUSH_ENABLED === 'true' ? 'false' : 'true')}
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    configs.NOTIF_APP_PUSH_ENABLED === 'true'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {configs.NOTIF_APP_PUSH_ENABLED === 'true' ? 'Tắt App Push' : 'Kích Hoạt App Push'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'STORAGE' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sky-600" />
              Chính Sách Lưu Trữ Ảnh & Tuân Thủ Nghị Định 13
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Thời hạn lưu trữ ảnh điểm danh (MinIO)</label>
                  <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-200">
                    {configs.SNAPSHOT_RETENTION_DAYS || '90'} Ngày
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Thời gian lưu trữ bằng chứng ảnh chụp crop khuôn mặt tại cổng để phục vụ phụ huynh đối soát (mặc định 1 học kỳ).
                </p>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={configs.SNAPSHOT_RETENTION_DAYS || '90'}
                  onChange={(e) => handleChange('SNAPSHOT_RETENTION_DAYS', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">Thời hạn tự hủy ảnh người lạ (Nghị định 13)</label>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-mono font-bold text-xs border border-purple-200">
                    {configs.STRANGER_RETENTION_HOURS || '24'} Giờ
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Ảnh người lạ lảng vảng trước cổng sẽ tự động xóa triệt để khỏi hệ thống sau thời gian này để bảo đảm quyền riêng tư cá nhân.
                </p>
                <input
                  type="number"
                  min="12"
                  max="72"
                  value={configs.STRANGER_RETENTION_HOURS || '24'}
                  onChange={(e) => handleChange('STRANGER_RETENTION_HOURS', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
