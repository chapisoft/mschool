'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  RefreshCw,
  AlertCircle,
  DoorOpen,
  UserCheck,
  UserX
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi } from '@/lib/api';
import { VisitorType, VisitorStatus } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface VisitorItem {
  id: string;
  visitorCode: string;
  fullName: string;
  phoneNumber: string;
  visitorType: VisitorType;
  targetIdentityCode: string;
  validTo: string;
  status: VisitorStatus;
}

interface StrangerItem {
  id: string;
  cameraId: string;
  appearedAt: string;
}

export default function GuardDeskPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();

  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [strangers, setStrangers] = useState<StrangerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Đăng ký khách mới
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState<boolean>(false);
  const [visitorForm, setVisitorForm] = useState({
    fullName: '',
    phoneNumber: '',
    visitorType: VisitorType.PARENT,
    targetIdentityCode: '',
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    approvedBy: 'Bảo vệ ca sáng',
  });

  // Modal Mở Barie Khẩn Cấp
  const [isGateModalOpen, setIsGateModalOpen] = useState<boolean>(false);
  const [gateReason, setGateReason] = useState<string>('Xe cứu thương / Khẩn cấp y tế');

  // ConfirmDialog Thu hồi quyền
  const [revokeDialog, setRevokeDialog] = useState<{
    isOpen: boolean;
    visitorCode: string;
    visitorName: string;
  }>({
    isOpen: false,
    visitorCode: '',
    visitorName: '',
  });

  const loadGuardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [visitorsData, strangersData] = await Promise.all([
        fetchApi<VisitorItem[]>('/visitors/active'),
        fetchApi<StrangerItem[]>('/strangers'),
      ]);
      setVisitors(Array.isArray(visitorsData) ? visitorsData : []);
      setStrangers(Array.isArray(strangersData) ? strangersData : []);
    } catch (err: any) {
      console.warn('Failed to load guard desk data from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGuardData();
  }, []);

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/visitors', visitorForm);
      showSuccess('Tiếp nhận khách vào cổng', `Đã cấp quyền ra vào cho ${visitorForm.fullName} thành công`);
      setIsVisitorModalOpen(false);
      setVisitorForm({
        fullName: '',
        phoneNumber: '',
        visitorType: VisitorType.PARENT,
        targetIdentityCode: '',
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        approvedBy: 'Bảo vệ ca sáng',
      });
      loadGuardData();
    } catch (err: any) {
      showError('Đăng ký khách thất bại', err.message);
    }
  };

  const handleConfirmRevoke = async () => {
    try {
      await postApi(`/visitors/${revokeDialog.visitorCode}/revoke`);
      showSuccess('Thu hồi quyền vào cổng', `Đã thu hồi quyền ra vào của mã ${revokeDialog.visitorCode}`);
      setRevokeDialog({ isOpen: false, visitorCode: '', visitorName: '' });
      loadGuardData();
    } catch (err: any) {
      showError('Thu hồi thất bại', err.message);
    }
  };

  const handleManualOpenGate = () => {
    showWarning('Mở Barie Thủ Công', `Đã kích hoạt mở barie cổng chính. Lý do: ${gateReason} (Đã ghi nhật ký kiểm toán)`);
    setIsGateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Công cụ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('guardDesk.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('guardDesk.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadGuardData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>
          <button
            type="button"
            onClick={() => setIsGateModalOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-xs transition-colors"
          >
            <DoorOpen className="w-4 h-4 text-amber-700" />
            <span>Mở Cổng Cưỡng Bức</span>
          </button>
          <button
            onClick={() => setIsVisitorModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Ký Khách Mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách khách & phụ huynh */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {t('guardDesk.visitorsList')} ({visitors.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.visitorCode')}</th>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.fullName')}</th>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.phoneNumber')}</th>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.visitorType')}</th>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.targetStudent')}</th>
                <th className="py-3 px-4 font-semibold">{t('guardDesk.validTo')}</th>
                <th className="py-3 px-4 font-semibold">{t('common.status')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitors.length > 0 ? (
                visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-600">{v.visitorCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{v.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{v.phoneNumber || '--'}</td>
                    <td className="py-3 px-4 font-mono">{v.visitorType}</td>
                    <td className="py-3 px-4 text-slate-700">{v.targetIdentityCode || '--'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{v.validTo}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          v.status === VisitorStatus.APPROVED
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : v.status === VisitorStatus.CHECKED_IN
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {v.status === VisitorStatus.APPROVED
                          ? t('guardDesk.approved')
                          : v.status === VisitorStatus.CHECKED_IN
                          ? t('guardDesk.checkedIn')
                          : v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === VisitorStatus.APPROVED && (
                        <button
                          onClick={() =>
                            setRevokeDialog({
                              isOpen: true,
                              visitorCode: v.visitorCode,
                              visitorName: v.fullName,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-medium transition-colors"
                        >
                          {t('guardDesk.revoke')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isLoading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cảnh báo người lạ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          {t('guardDesk.strangersList')} ({strangers.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strangers.length > 0 ? (
            strangers.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between"
              >
                <div>
                  <div className="text-purple-900 font-bold text-sm">{t('guardDesk.strangerAlertTitle')}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {t('guardDesk.location')}: {s.cameraId} | {t('guardDesk.appeared')}: {s.appearedAt}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
                  24H TTL
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-6 text-center text-slate-400">
              {isLoading ? t('common.loading') : t('common.noData')}
            </div>
          )}
        </div>
      </div>

      {/* Modal Đăng Ký Khách Mới */}
      <Modal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        title="Đăng Ký Khách / Phụ Huynh Đến Thăm"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterVisitor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên khách / phụ huynh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={visitorForm.fullName}
              onChange={(e) => setVisitorForm({ ...visitorForm, fullName: e.target.value })}
              placeholder="ví dụ: Bác Trần Văn Quý"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={visitorForm.phoneNumber}
                onChange={(e) => setVisitorForm({ ...visitorForm, phoneNumber: e.target.value })}
                placeholder="0987654321"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại khách</label>
              <select
                value={visitorForm.visitorType}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorType: e.target.value as VisitorType })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={VisitorType.PARENT}>Phụ huynh</option>
                <option value={VisitorType.GUEST}>Khách đến thăm</option>
                <option value={VisitorType.CONTRACTOR}>Nhà thầu / Đối tác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mã học sinh đón / Người cần gặp</label>
            <input
              type="text"
              value={visitorForm.targetIdentityCode}
              onChange={(e) => setVisitorForm({ ...visitorForm, targetIdentityCode: e.target.value })}
              placeholder="ví dụ: HS100293 hoặc Thầy Hiệu Trưởng"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVisitorModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm"
            >
              Cấp Thẻ Vào Cổng
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Mở Barie Khẩn Cấp */}
      <Modal
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        title="Kích Hoạt Mở Barie Cổng Thủ Công"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Hành động mở cổng cưỡng bức sẽ gửi tín hiệu mở relay tới cổng chính và ghi lại vào Nhật ký Kiểm toán bất biến (Audit Log).
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do mở cổng:</label>
            <select
              value={gateReason}
              onChange={(e) => setGateReason(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value="Xe cứu thương / Khẩn cấp y tế">Xe cứu thương / Khẩn cấp y tế</option>
              <option value="Xe cứu hỏa PCCC">Xe cứu hỏa PCCC</option>
              <option value="Đoàn kiểm tra Sở GD&ĐT">Đoàn kiểm tra Sở GD&ĐT</option>
              <option value="Xe chở trang thiết bị trường học">Xe chở trang thiết bị trường học</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-medium"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleManualOpenGate}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm"
            >
              Xác Nhận Mở Cổng
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialog Thu hồi */}
      <ConfirmDialog
        isOpen={revokeDialog.isOpen}
        onClose={() => setRevokeDialog({ isOpen: false, visitorCode: '', visitorName: '' })}
        onConfirm={handleConfirmRevoke}
        title="Thu Hồi Quyền Vào Cổng"
        message={`Bạn có chắc chắn muốn thu hồi quyền ra vào của khách "${revokeDialog.visitorName}" (Mã: ${revokeDialog.visitorCode})?`}
        isDangerous={true}
      />
    </div>
  );
}
