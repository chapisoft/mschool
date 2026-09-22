'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { fetchApi } from '@/lib/api';
import { AttendanceStatus, Direction } from '@/types/enums';

interface DashboardStats {
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  strangerAlerts: number;
  rate: number;
}

interface AttendanceFeedItem {
  id: string;
  name: string;
  code: string;
  className: string;
  time: string;
  camera: string;
  type: Direction;
  status: AttendanceStatus;
  avatar: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFeeds, setRecentFeeds] = useState<AttendanceFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, feedsData] = await Promise.all([
        fetchApi<DashboardStats>('/dashboard/stats'),
        fetchApi<AttendanceFeedItem[]>('/dashboard/recent-feeds'),
      ]);
      setStats(statsData);
      setRecentFeeds(feedsData);
    } catch (err: any) {
      console.warn('Backend API not responding, showing empty state:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner & Tiêu đề */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4 animate-spin text-emerald-400" />
            {t('dashboard.syncLive')}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Thẻ Thống Kê Chỉ Số KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tổng học sinh */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.totalStudents')}</span>
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {stats ? stats.totalStudents.toLocaleString() : '--'}
          </div>
        </div>

        {/* Đã có mặt */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.present')}</span>
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {stats ? stats.present.toLocaleString() : '--'}
          </div>
        </div>

        {/* Đi muộn */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.late')}</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {stats ? stats.late.toLocaleString() : '--'}
          </div>
        </div>

        {/* Vắng mặt */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.absent')}</span>
            <UserX className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400">
            {stats ? stats.absent.toLocaleString() : '--'}
          </div>
        </div>

        {/* Cảnh báo người lạ */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">{t('dashboard.strangerAlerts')}</span>
            <ShieldAlert className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400">
            {stats ? stats.strangerAlerts.toLocaleString() : '--'}
          </div>
        </div>
      </div>

      {/* Bảng Nhật Ký Quét Cổng Thực Tế */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            {t('dashboard.recentFeeds')}
          </h3>
          <span className="text-xs text-slate-400">
            {t('dashboard.attendanceRate')}: <span className="text-emerald-400 font-bold">{stats ? `${stats.rate}%` : '--'}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-700/80">
              <tr>
                <th className="py-3 px-4">{t('dashboard.feedTime')}</th>
                <th className="py-3 px-4">{t('dashboard.feedStudent')}</th>
                <th className="py-3 px-4">{t('dashboard.feedClass')}</th>
                <th className="py-3 px-4">{t('dashboard.feedCamera')}</th>
                <th className="py-3 px-4">{t('dashboard.feedDirection')}</th>
                <th className="py-3 px-4">{t('dashboard.feedStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentFeeds.length > 0 ? (
                recentFeeds.map((feed) => (
                  <tr key={feed.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{feed.time}</td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                        {feed.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{feed.name}</div>
                        <div className="text-xs text-slate-400">{feed.code}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">{feed.className}</td>
                    <td className="py-3 px-4 text-xs text-slate-400">{feed.camera}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        feed.type === Direction.IN
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {feed.type === Direction.IN ? t('dashboard.in') : t('dashboard.out')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        feed.status === AttendanceStatus.LATE
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {feed.status === AttendanceStatus.LATE ? t('dashboard.lateStatus') : t('dashboard.onTime')}
                      </span>
                    </td>
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
