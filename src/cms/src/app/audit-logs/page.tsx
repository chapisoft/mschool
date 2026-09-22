'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { fetchApi } from '@/lib/api';
import { AuditActionCode } from '@/types/enums';

interface AuditLogEntry {
  id: number;
  actionCode: AuditActionCode;
  userName: string;
  entityName: string;
  entityId: string;
  reason: string;
  ipAddress: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<AuditLogEntry[]>('/audit-logs');
      setLogs(data);
    } catch (err: any) {
      console.warn('Failed to load audit logs from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('audit.title')}</h2>
          <p className="text-sm text-slate-400">{t('audit.subtitle')}</p>
        </div>
        <button
          onClick={loadAuditLogs}
          disabled={isLoading}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('audit.filterPlaceholder')}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{t('audit.time')}</th>
                <th className="py-3 px-4">{t('audit.user')}</th>
                <th className="py-3 px-4">{t('audit.action')}</th>
                <th className="py-3 px-4">{t('audit.target')}</th>
                <th className="py-3 px-4">{t('audit.reason')}</th>
                <th className="py-3 px-4">{t('audit.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">{log.createdAt || '--'}</td>
                    <td className="py-3 px-4 font-semibold text-white">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-mono font-bold border border-sky-800">
                        {log.actionCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.entityName} #{log.entityId}</td>
                    <td className="py-3 px-4 text-slate-200">{log.reason || '--'}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {isLoading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
