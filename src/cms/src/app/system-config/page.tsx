'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RefreshCw,
  Cpu,
  Bell,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, putApi } from '@/lib/api';
import { SystemConfigKey, SystemConfigGroup } from '@/types/enums';

interface SystemParameterItem {
  id: string;
  paramKey: string;
  paramValue: string;
  paramGroup: string;
  description: string;
}

export default function SystemConfigPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<SystemConfigGroup>(SystemConfigGroup.AI);
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
      console.warn('Failed to load system configs:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleChange = (key: SystemConfigKey, value: string) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const resolveParamGroup = (key: string): SystemConfigGroup => {
    if (
      key.startsWith('AI_') ||
      key.startsWith('GATE_') ||
      key.startsWith('MORNING_') ||
      key.startsWith('AFTERNOON_')
    ) {
      return SystemConfigGroup.AI;
    }
    if (key.startsWith('NOTIF_')) {
      return SystemConfigGroup.NOTIFICATION;
    }
    if (key.startsWith('SNAPSHOT_') || key.startsWith('STRANGER_')) {
      return SystemConfigGroup.STORAGE;
    }
    if (key.startsWith('CAMERA_') || key.startsWith('RTSP_')) {
      return SystemConfigGroup.CAMERA_NETWORK;
    }
    return SystemConfigGroup.GENERAL;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.entries(configs).map(([k, v]) => ({
        paramKey: k,
        paramValue: v,
        paramGroup: resolveParamGroup(k),
      }));

      await putApi('/system-configs', { configs: payload });
      showSuccess(t('sysconfig.saveSuccessTitle'), t('sysconfig.saveSuccessMsg'));
    } catch (err: any) {
      showError(t('sysconfig.saveErrorTitle'), err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-sky-600" />
            {t('sysconfig.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('sysconfig.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadConfigs}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('sysconfig.reloadBtn')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? t('sysconfig.saving') : t('sysconfig.saveBtn')}</span>
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
          onClick={() => setActiveTab(SystemConfigGroup.AI)}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === SystemConfigGroup.AI
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          {t('sysconfig.tabAi')}
        </button>
        <button
          onClick={() => setActiveTab(SystemConfigGroup.NOTIFICATION)}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === SystemConfigGroup.NOTIFICATION
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          {t('sysconfig.tabNotification')}
        </button>
        <button
          onClick={() => setActiveTab(SystemConfigGroup.STORAGE)}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === SystemConfigGroup.STORAGE
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          {t('sysconfig.tabStorage')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">{t('common.loading')}</div>
        ) : (
          <>
            {activeTab === SystemConfigGroup.AI && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  {t('sysconfig.sectionAiTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">{t('sysconfig.aiFiqaLabel')}</label>
                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-200">
                        {configs[SystemConfigKey.AI_FIQA_MIN_SCORE] || ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.aiFiqaDesc')}
                    </p>
                    <input
                      type="range"
                      min="0.5"
                      max="0.99"
                      step="0.01"
                      value={configs[SystemConfigKey.AI_FIQA_MIN_SCORE] || '0.5'}
                      onChange={(e) => handleChange(SystemConfigKey.AI_FIQA_MIN_SCORE, e.target.value)}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">{t('sysconfig.aiSimilarityLabel')}</label>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-bold text-xs border border-emerald-200">
                        {configs[SystemConfigKey.AI_SIMILARITY_THRESHOLD] || ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.aiSimilarityDesc')}
                    </p>
                    <input
                      type="range"
                      min="0.6"
                      max="0.95"
                      step="0.01"
                      value={configs[SystemConfigKey.AI_SIMILARITY_THRESHOLD] || '0.6'}
                      onChange={(e) => handleChange(SystemConfigKey.AI_SIMILARITY_THRESHOLD, e.target.value)}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">{t('sysconfig.gateCooldownLabel')}</label>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-mono font-bold text-xs border border-amber-200">
                        {configs[SystemConfigKey.GATE_COOLDOWN_SECONDS] || ''} {t('sysconfig.gateCooldownUnit')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.gateCooldownDesc')}
                    </p>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={configs[SystemConfigKey.GATE_COOLDOWN_SECONDS] || ''}
                      onChange={(e) => handleChange(SystemConfigKey.GATE_COOLDOWN_SECONDS, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="text-sm font-semibold text-slate-900">{t('sysconfig.morningLateLabel')}</label>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.morningLateDesc')}
                    </p>
                    <input
                      type="time"
                      value={configs[SystemConfigKey.MORNING_LATE_CUTOFF] || ''}
                      onChange={(e) => handleChange(SystemConfigKey.MORNING_LATE_CUTOFF, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === SystemConfigGroup.NOTIFICATION && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-600" />
                  {t('sysconfig.sectionNotifTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 text-sm">{t('sysconfig.zaloZnsLabel')}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          configs[SystemConfigKey.NOTIF_ZNS_ENABLED] === 'true'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {configs[SystemConfigKey.NOTIF_ZNS_ENABLED] === 'true' ? t('sysconfig.statusOn') : t('sysconfig.statusOff')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{t('sysconfig.zaloZnsDesc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          SystemConfigKey.NOTIF_ZNS_ENABLED,
                          configs[SystemConfigKey.NOTIF_ZNS_ENABLED] === 'true' ? 'false' : 'true'
                        )
                      }
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        configs[SystemConfigKey.NOTIF_ZNS_ENABLED] === 'true'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {configs[SystemConfigKey.NOTIF_ZNS_ENABLED] === 'true'
                        ? `${t('sysconfig.btnTurnOff')} ${t('sysconfig.zaloZnsLabel')}`
                        : `${t('sysconfig.btnTurnOn')} ${t('sysconfig.zaloZnsLabel')}`}
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 text-sm">{t('sysconfig.smsBrandnameLabel')}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          configs[SystemConfigKey.NOTIF_SMS_ENABLED] === 'true'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {configs[SystemConfigKey.NOTIF_SMS_ENABLED] === 'true' ? t('sysconfig.statusOn') : t('sysconfig.statusOff')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{t('sysconfig.smsBrandnameDesc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          SystemConfigKey.NOTIF_SMS_ENABLED,
                          configs[SystemConfigKey.NOTIF_SMS_ENABLED] === 'true' ? 'false' : 'true'
                        )
                      }
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        configs[SystemConfigKey.NOTIF_SMS_ENABLED] === 'true'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {configs[SystemConfigKey.NOTIF_SMS_ENABLED] === 'true'
                        ? `${t('sysconfig.btnTurnOff')} ${t('sysconfig.smsBrandnameLabel')}`
                        : `${t('sysconfig.btnTurnOn')} ${t('sysconfig.smsBrandnameLabel')}`}
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 text-sm">{t('sysconfig.appPushLabel')}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          configs[SystemConfigKey.NOTIF_APP_PUSH_ENABLED] === 'true'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {configs[SystemConfigKey.NOTIF_APP_PUSH_ENABLED] === 'true' ? t('sysconfig.statusOn') : t('sysconfig.statusOff')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{t('sysconfig.appPushDesc')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          SystemConfigKey.NOTIF_APP_PUSH_ENABLED,
                          configs[SystemConfigKey.NOTIF_APP_PUSH_ENABLED] === 'true' ? 'false' : 'true'
                        )
                      }
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        configs[SystemConfigKey.NOTIF_APP_PUSH_ENABLED] === 'true'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {configs[SystemConfigKey.NOTIF_APP_PUSH_ENABLED] === 'true'
                        ? `${t('sysconfig.btnTurnOff')} ${t('sysconfig.appPushLabel')}`
                        : `${t('sysconfig.btnTurnOn')} ${t('sysconfig.appPushLabel')}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === SystemConfigGroup.STORAGE && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-600" />
                  {t('sysconfig.sectionStorageTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">{t('sysconfig.snapshotRetentionLabel')}</label>
                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-200">
                        {configs[SystemConfigKey.SNAPSHOT_RETENTION_DAYS] || ''} {t('sysconfig.snapshotRetentionUnit')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.snapshotRetentionDesc')}
                    </p>
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={configs[SystemConfigKey.SNAPSHOT_RETENTION_DAYS] || ''}
                      onChange={(e) => handleChange(SystemConfigKey.SNAPSHOT_RETENTION_DAYS, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">{t('sysconfig.strangerRetentionLabel')}</label>
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-mono font-bold text-xs border border-purple-200">
                        {configs[SystemConfigKey.STRANGER_RETENTION_HOURS] || ''} {t('sysconfig.strangerRetentionUnit')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t('sysconfig.strangerRetentionDesc')}
                    </p>
                    <input
                      type="number"
                      min="12"
                      max="72"
                      value={configs[SystemConfigKey.STRANGER_RETENTION_HOURS] || ''}
                      onChange={(e) => handleChange(SystemConfigKey.STRANGER_RETENTION_HOURS, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
