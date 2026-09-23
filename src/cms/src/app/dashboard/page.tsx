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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <Activity className="w-4 h-4 animate-spin text-emerald-600" />
            {t('dashboard.syncLive')}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Thẻ Thống Kê Chỉ Số KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tổng học sinh */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.totalStudents')}</span>
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {stats ? stats.totalStudents.toLocaleString() : '--'}
          </div>
        </div>

        {/* Đã có mặt */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.present')}</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {stats ? stats.present.toLocaleString() : '--'}
          </div>
        </div>

        {/* Đi muộn */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.late')}</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {stats ? stats.late.toLocaleString() : '--'}
          </div>
        </div>

        {/* Vắng mặt */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.absent')}</span>
            <UserX className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {stats ? stats.absent.toLocaleString() : '--'}
          </div>
        </div>

        {/* Cảnh báo người lạ */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.strangerAlerts')}</span>
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600">
            {stats ? stats.strangerAlerts.toLocaleString() : '--'}
          </div>
        </div>
      </div>

      {/* Bảng Nhật Ký Quét Cổng Thực Tế */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-600" />
            {t('dashboard.recentFeeds')}
          </h3>
          <span className="text-xs text-slate-500">
            {t('dashboard.attendanceRate')}: <span className="text-emerald-600 font-bold">{stats ? `${stats.rate}%` : '--'}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedTime')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedStudent')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedClass')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedCamera')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedDirection')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.feedStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentFeeds.length > 0 ? (
                recentFeeds.map((feed) => (
                  <tr key={feed.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{feed.time}</td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs">
                        {feed.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{feed.name}</div>
                        <div className="text-xs text-slate-500">{feed.code}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{feed.className}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{feed.camera}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        feed.type === Direction.IN
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {feed.type === Direction.IN ? t('dashboard.in') : t('dashboard.out')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        feed.status === AttendanceStatus.LATE
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {feed.status === AttendanceStatus.LATE ? t('dashboard.lateStatus') : t('dashboard.onTime')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
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
