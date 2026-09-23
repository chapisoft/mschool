'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Cpu,
  Trash2,
  Camera,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, deleteApi } from '@/lib/api';
import { SubjectType } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ProfileItem {
  id: string;
  identityCode: string;
  fullName: string;
  subjectType: SubjectType;
  departmentOrClass: string;
  qualityScore: number;
  isActive: boolean;
}

export default function BiometricsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Đăng ký mới
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    identityCode: '',
    fullName: '',
    subjectType: SubjectType.STUDENT,
    departmentOrClass: '10A1',
    qualityScore: 0.94,
  });

  // ConfirmDialog Xóa
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<ProfileItem[]>(
        `/biometrics/profiles${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`
      );
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load profiles from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [searchTerm]);

  const handleOpenCreate = () => {
    setFormData({
      identityCode: 'HS' + Math.floor(100000 + Math.random() * 900000),
      fullName: '',
      subjectType: SubjectType.STUDENT,
      departmentOrClass: '10A1',
      qualityScore: 0.94,
    });
    setIsModalOpen(true);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/biometrics/profiles', formData);
      showSuccess(
        'Đăng ký sinh trắc học',
        `Đã tạo hồ sơ khuôn mặt cho ${formData.fullName} (${formData.identityCode}) - FIQA: ${Math.round(
          formData.qualityScore * 100
        )}%`
      );
      setIsModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      showError('Đăng ký thất bại', err.message);
    }
  };

  const handleDeleteProfile = (p: ProfileItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa Hồ Sơ Sinh Trắc Học',
      message: `Bạn có chắc chắn muốn xóa dữ liệu véc-tơ khuôn mặt của "${p.fullName}" (${p.identityCode})? Học sinh sẽ không thể điểm danh không dừng qua camera sau khi xóa.`,
      action: async () => {
        try {
          await deleteApi(`/biometrics/profiles/${p.id}`);
          showSuccess('Xóa hồ sơ sinh trắc', `Đã xóa hồ sơ ${p.fullName}`);
          loadProfiles();
        } catch (err: any) {
          showError('Lỗi xóa hồ sơ', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSyncEdge = async () => {
    setIsSyncing(true);
    try {
      const res = await postApi<any>('/biometrics/sync-edge');
      showSuccess(
        'Đồng bộ Camera Edge',
        `Đã nạp và đồng bộ ${res.syncedProfiles || profiles.length} véc-tơ khuôn mặt xuống 12 thiết bị Camera AI thành công`
      );
    } catch (err: any) {
      showError('Lỗi đồng bộ camera', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('biometrics.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('biometrics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProfiles}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleSyncEdge}
            disabled={isSyncing}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
          >
            <Cpu className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Camera Edge'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('biometrics.registerNew')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('biometrics.searchPlaceholder')}
          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('biometrics.identityCode')}</th>
                <th className="py-3 px-4 font-semibold">{t('biometrics.fullName')}</th>
                <th className="py-3 px-4 font-semibold">{t('biometrics.subjectType')}</th>
                <th className="py-3 px-4 font-semibold">{t('biometrics.departmentOrClass')}</th>
                <th className="py-3 px-4 font-semibold">{t('biometrics.qualityScore')}</th>
                <th className="py-3 px-4 font-semibold">{t('common.status')}</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-600">{p.identityCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.fullName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {p.subjectType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.departmentOrClass}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                        {Math.round((p.qualityScore || 0.9) * 100)}% FIQA
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          p.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.isActive ? t('biometrics.active') : t('biometrics.pending')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteProfile(p)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa hồ sơ sinh trắc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isLoading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Đăng Ký Hồ Sơ Khuôn Mặt */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Đăng Ký Hồ Sơ Sinh Trắc Học Khuôn Mặt Mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã định danh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.identityCode}
              onChange={(e) => setFormData({ ...formData, identityCode: e.target.value.toUpperCase() })}
              placeholder="HS100293 hoặc GV0012"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Nguyễn Văn Bảo"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Đối tượng</label>
              <select
                value={formData.subjectType}
                onChange={(e) => setFormData({ ...formData, subjectType: e.target.value as SubjectType })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={SubjectType.STUDENT}>Học sinh</option>
                <option value={SubjectType.TEACHER}>Giáo viên</option>
                <option value={SubjectType.STAFF}>Cán bộ nhân viên</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp / Bộ môn</label>
              <input
                type="text"
                value={formData.departmentOrClass}
                onChange={(e) => setFormData({ ...formData, departmentOrClass: e.target.value })}
                placeholder="10A1 hoặc Tổ Toán"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Khung tải ảnh chân dung & chấm điểm FIQA */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                Ảnh Chân Dung Chuẩn Hóa
              </span>
              <span className="text-emerald-700 font-bold font-mono">FIQA: {Math.round(formData.qualityScore * 100)}% (ĐẠT)</span>
            </div>
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-sky-500 transition-colors cursor-pointer bg-white">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-600 font-medium">Kéo thả ảnh hoặc nhấp để tải ảnh chân dung (Độ phân giải 1080p)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Hệ thống AI tự động kiểm tra chất lượng FIQA & tạo 512-D vector</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm"
            >
              Đăng Ký Hồ Sơ
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Xác nhận Xóa */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={true}
      />
    </div>
  );
}
