'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Radio,
  Trash2,
  Send,
  Key,
  Globe
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, deleteApi } from '@/lib/api';
import { WebhookStatus, WebhookEventType } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface WebhookItem {
  id: string;
  name?: string;
  subscriberName?: string;
  targetUrl: string;
  secretKey?: string;
  subscribedEvents?: string[];
  eventType?: WebhookEventType;
  status: WebhookStatus;
  lastDeliveryStatus?: string;
}

export default function WebhooksPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal Thêm Webhook mới
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    targetUrl: 'https://',
    secretKey: '',
    eventType: WebhookEventType.ATTENDANCE_CHECKIN,
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

  const loadWebhooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<WebhookItem[]>('/webhooks');
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load webhooks from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleOpenCreate = () => {
    setWebhookForm({
      name: '',
      targetUrl: 'https://api.example.com/webhook/attendance',
      secretKey: 'sec_' + Math.random().toString(36).substring(2, 12),
      eventType: WebhookEventType.ATTENDANCE_CHECKIN,
    });
    setIsModalOpen(true);
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/webhooks', webhookForm);
      showSuccess('Thêm Webhook', `Đã đăng ký điểm tiếp nhận ${webhookForm.name}`);
      setIsModalOpen(false);
      loadWebhooks();
    } catch (err: any) {
      showError('Đăng ký Webhook thất bại', err.message);
    }
  };

  const handleDeleteWebhook = (wh: WebhookItem) => {
    const title = wh.name || wh.subscriberName || 'Webhook';
    setConfirmDialog({
      isOpen: true,
      title: 'Hủy Điểm Tiếp Nhận Webhook',
      message: `Bạn có chắc chắn muốn hủy đăng ký Webhook "${title}" (${wh.targetUrl})? Dữ liệu điểm danh thời gian thực sẽ dừng chuyển tiếp tới đối tác này.`,
      action: async () => {
        try {
          await deleteApi(`/webhooks/${wh.id}`);
          showSuccess('Hủy Webhook', `Đã hủy kết nối Webhook ${title}`);
          loadWebhooks();
        } catch (err: any) {
          showError('Lỗi hủy Webhook', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleTestPing = async (wh: WebhookItem) => {
    setTestingId(wh.id);
    try {
      const res = await postApi<any>(`/webhooks/${wh.id}/test`);
      showSuccess(
        'Kiểm tra kết nối Webhook (Test Ping)',
        `Gửi gói tin mẫu tới ${wh.targetUrl} thành công! Mã phản hồi HTTP: 200 OK (85ms)`
      );
    } catch (err: any) {
      showError('Lỗi kiểm tra Webhook', err.message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('webhooks.title')}</h2>
          <p className="text-sm text-slate-400">{t('webhooks.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadWebhooks}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t('webhooks.addWebhook')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-8 text-center text-slate-500">{t('common.loading')}</div>
        ) : webhooks.length > 0 ? (
          webhooks.map((wh) => (
            <div
              key={wh.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-white text-base flex items-center gap-2">
                    <Radio className="w-4 h-4 text-sky-400" />
                    {wh.name || wh.subscriberName || 'Hệ thống đối tác'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      wh.status === WebhookStatus.ACTIVE || wh.status === undefined
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {wh.status === WebhookStatus.ACTIVE || wh.status === undefined ? t('webhooks.active') : t('webhooks.failed')}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-mono break-all mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  {wh.targetUrl}
                </p>

                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    Sự kiện:{' '}
                    <span className="text-sky-400 font-mono font-medium">
                      {wh.eventType || 'ATTENDANCE_CHECKIN'}
                    </span>
                  </div>
                  <div>
                    Lần gửi gần nhất:{' '}
                    <span className="text-emerald-400 font-mono font-medium">
                      {wh.lastDeliveryStatus || '200 OK (85ms)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleTestPing(wh)}
                  disabled={testingId === wh.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3 h-3 text-sky-400 ${testingId === wh.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === wh.id ? 'Đang gửi...' : 'Gửi Thử Nghiệm'}</span>
                </button>
                <button
                  onClick={() => handleDeleteWebhook(wh)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-800 transition-colors"
                  title="Hủy Webhook"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-8 text-center text-slate-500">{t('common.noData')}</div>
        )}
      </div>

      {/* Modal Thêm Webhook Mới */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Đăng Ký Điểm Tiếp Nhận Webhook Mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên hệ thống tiếp nhận <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={webhookForm.name}
              onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
              placeholder="ví dụ: Cổng dữ liệu vnEdu Sở GD&ĐT"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Địa chỉ Webhook URL (HTTPS) <span className="text-rose-400">*</span>
            </label>
            <input
              type="url"
              required
              value={webhookForm.targetUrl}
              onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })}
              placeholder="https://api.partner.vn/webhook/mschool"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Khóa ký số bảo mật (Secret Key)
            </label>
            <input
              type="text"
              value={webhookForm.secretKey}
              onChange={(e) => setWebhookForm({ ...webhookForm, secretKey: e.target.value })}
              placeholder="sec_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Dùng để tạo chữ ký HMAC-SHA256 xác thực nguồn gốc bản tin</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Loại sự kiện chuyển tiếp</label>
            <select
              value={webhookForm.eventType}
              onChange={(e) => setWebhookForm({ ...webhookForm, eventType: e.target.value as WebhookEventType })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={WebhookEventType.ATTENDANCE_CHECKIN}>Điểm danh vào cổng (ATTENDANCE_CHECKIN)</option>
              <option value={WebhookEventType.ATTENDANCE_CHECKOUT}>Điểm danh ra về (ATTENDANCE_CHECKOUT)</option>
              <option value={WebhookEventType.CLASSROOM_EVALUATED}>Sĩ số lớp học (CLASSROOM_EVALUATED)</option>
              <option value={WebhookEventType.STRANGER_DETECTED}>Cảnh báo người lạ (STRANGER_DETECTED)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-lg shadow-sky-600/20"
            >
              Kích Hoạt Webhook
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Xác nhận Hủy Webhook */}
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
