'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { fetchApi } from '@/lib/api';
import { AttendanceStatus, OverrideReasonCategory, UserRole } from '@/types/enums';

interface AttendanceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  studentName: string;
  identityCode: string;
  classroomCode: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export default function AttendanceOverrideModal({
  isOpen,
  onClose,
  recordId,
  studentName,
  identityCode,
  classroomCode,
  currentStatus,
  onSuccess
}: AttendanceOverrideModalProps) {
  const { t } = useTranslation();
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [reasonCategory, setReasonCategory] = useState<OverrideReasonCategory>(OverrideReasonCategory.MEDICAL_NOTE);
  const [reasonDetail, setReasonDetail] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Kiểm tra tính hợp lệ tối thiểu 10 ký tự
    if (!reasonDetail || reasonDetail.trim().length < 10) {
      setErrorMsg(t('overrideModal.errorMinChars'));
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi(`/attendance/records/${recordId}/override`, {
        method: 'POST',
        headers: {
          'X-User-Role': UserRole.ROLE_SUPERVISOR,
        },
        body: JSON.stringify({
          newStatus,
          reasonCategory,
          reasonDetail,
          attachmentUri: attachmentName ? `s3://evidence/${attachmentName}` : ''
        })
      });

      setSuccessMsg(t('overrideModal.success'));
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi yêu cầu điều chỉnh');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              {t('overrideModal.title')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('overrideModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin học sinh */}
        <div className="p-6 bg-slate-50/60 border-b border-slate-100 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500">{t('overrideModal.student')}:</span>
            <div className="font-semibold text-slate-900 mt-0.5">{studentName} ({identityCode})</div>
          </div>
          <div>
            <span className="text-slate-500">Lớp học:</span>
            <div className="font-semibold text-slate-900 mt-0.5">{classroomCode}</div>
          </div>
          <div>
            <span className="text-slate-500">{t('overrideModal.currentStatus')}:</span>
            <div className="font-semibold text-rose-600 mt-0.5">{currentStatus}</div>
          </div>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('overrideModal.newStatus')}</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value={AttendanceStatus.PRESENT}>PRESENT (Có mặt / Bổ sung check-in)</option>
              <option value={AttendanceStatus.LATE}>LATE (Đến muộn có lý do)</option>
              <option value={AttendanceStatus.ABSENT}>ABSENT (Vắng có phép)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('overrideModal.reasonCategory')}</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as OverrideReasonCategory)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value={OverrideReasonCategory.MEDICAL_NOTE}>Giấy khám sức khỏe / Đơn bệnh viện</option>
              <option value={OverrideReasonCategory.FAMILY_EMERGENCY}>Gia đình có việc đột xuất có đơn</option>
              <option value={OverrideReasonCategory.OFFICIAL_DISPATCH}>Tham gia hoạt động / Đội tuyển trường</option>
              <option value={OverrideReasonCategory.SYSTEM_ERROR}>Lỗi kỹ thuật thiết bị quét</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('overrideModal.reasonDetail')}</label>
            <textarea
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={3}
              placeholder="Nhập giải trình chi tiết tối thiểu 10 ký tự..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-200 transition-colors"
            >
              {t('overrideModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? t('overrideModal.submitting') : t('overrideModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
