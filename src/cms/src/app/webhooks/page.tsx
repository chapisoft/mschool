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
    targetUrl: '',
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
      targetUrl: '',
      secretKey: '',
      eventType: WebhookEventType.ATTENDANCE_CHECKIN,
    });
    setIsModalOpen(true);
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/webhooks', webhookForm);
      showSuccess(t('webhooks.createSuccessTitle'), t('webhooks.createSuccessMsg', { name: webhookForm.name }));
      setIsModalOpen(false);
      loadWebhooks();
    } catch (err: any) {
      showError(t('webhooks.createError'), err.message);
    }
  };

  const handleDeleteWebhook = (wh: WebhookItem) => {
    const title = wh.name || wh.subscriberName || t('webhooks.defaultPartnerName');
    setConfirmDialog({
      isOpen: true,
      title: t('webhooks.deleteConfirmTitle'),
      message: t('webhooks.deleteConfirmMsg', { title, url: wh.targetUrl }),
      action: async () => {
        try {
          await deleteApi(`/webhooks/${wh.id}`);
          showSuccess(t('webhooks.deleteSuccessTitle'), t('webhooks.deleteSuccessMsg', { title }));
          loadWebhooks();
        } catch (err: any) {
          showError(t('webhooks.deleteError'), err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleTestPing = async (wh: WebhookItem) => {
    setTestingId(wh.id);
    try {
      await postApi<any>(`/webhooks/${wh.id}/test`);
      showSuccess(
        t('webhooks.testPingTitle'),
        t('webhooks.pingSuccess', { url: wh.targetUrl })
      );
    } catch (err: any) {
      showError(t('webhooks.testPingError'), err.message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('webhooks.title')}</h2>
          <p className="text-sm text-slate-500">{t('webhooks.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadWebhooks}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('webhooks.addWebhook')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-8 text-center text-slate-500 font-medium">{t('common.loading')}</div>
        ) : webhooks.length > 0 ? (
          webhooks.map((wh) => (
            <div
              key={wh.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Radio className="w-4 h-4 text-sky-600" />
                    {wh.name || wh.subscriberName || t('webhooks.defaultPartnerName')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      wh.status === WebhookStatus.ACTIVE || wh.status === undefined
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {wh.status === WebhookStatus.ACTIVE || wh.status === undefined ? t('webhooks.active') : t('webhooks.failed')}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-mono break-all mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {wh.targetUrl}
                </p>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    {t('webhooks.eventLabel')}{' '}
                    <span className="text-sky-700 font-mono font-semibold">
                      {wh.eventType || 'ATTENDANCE_CHECKIN'}
                    </span>
                  </div>
                  <div>
                    {t('webhooks.lastDeliveryLabel')}{' '}
                    <span className="text-emerald-700 font-mono font-semibold">
                      {wh.lastDeliveryStatus || '--'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleTestPing(wh)}
                  disabled={testingId === wh.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3 h-3 text-sky-600 ${testingId === wh.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === wh.id ? t('webhooks.sending') : t('webhooks.sendTestBtn')}</span>
                </button>
                <button
                  onClick={() => handleDeleteWebhook(wh)}
                  className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                  title={t('webhooks.deleteTooltip')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-8 text-center text-slate-500 font-medium">{t('common.noData')}</div>
        )}
      </div>

      {/* Modal Thêm Webhook Mới */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('webhooks.modalTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('webhooks.nameLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={webhookForm.name}
              onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
              placeholder={t('webhooks.namePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('webhooks.urlLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={webhookForm.targetUrl}
              onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })}
              placeholder={t('webhooks.urlPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('webhooks.secretLabel')}
            </label>
            <input
              type="text"
              value={webhookForm.secretKey}
              onChange={(e) => setWebhookForm({ ...webhookForm, secretKey: e.target.value })}
              placeholder={t('webhooks.placeholderSecret')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">{t('webhooks.secretHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('webhooks.eventTypeLabel')}</label>
            <select
              value={webhookForm.eventType}
              onChange={(e) => setWebhookForm({ ...webhookForm, eventType: e.target.value as WebhookEventType })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value={WebhookEventType.ATTENDANCE_CHECKIN}>{t('webhooks.eventCheckIn')}</option>
              <option value={WebhookEventType.ATTENDANCE_CHECKOUT}>{t('webhooks.eventCheckOut')}</option>
              <option value={WebhookEventType.CLASSROOM_EVALUATED}>{t('webhooks.eventClassroom')}</option>
              <option value={WebhookEventType.STRANGER_DETECTED}>{t('webhooks.eventStranger')}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs"
            >
              {t('webhooks.activateBtn')}
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
