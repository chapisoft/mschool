'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Grid,
  ShieldCheck,
  BookOpenCheck,
  Fingerprint,
  Radio,
  Camera,
  School,
  FileSearch,
  Users,
  KeyRound,
  Sliders,
  Layers,
  LogOut
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import MSchoolLogo from '@/components/MSchoolLogo';

const menuGroups = [
  {
    titleKey: 'nav.groupAttendance',
    titleDefault: 'Điểm danh & Giám sát',
    items: [
      { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
      { key: 'nav.classroomMatrix', href: '/classroom-matrix', icon: Grid },
      { key: 'nav.guardDesk', href: '/guard-desk', icon: ShieldCheck },
      { key: 'nav.attendanceLedger', href: '/attendance-ledger', icon: BookOpenCheck },
      { key: 'nav.biometrics', href: '/biometrics', icon: Fingerprint },
      { key: 'nav.cameras', href: '/cameras', icon: Camera },
      { key: 'nav.classes', href: '/classes', icon: School },
    ],
  },
  {
    titleKey: 'nav.groupSystemAdmin',
    titleDefault: 'Quản trị hệ thống',
    items: [
      { key: 'nav.users', href: '/users', icon: Users },
      { key: 'nav.roles', href: '/roles', icon: KeyRound },
    ],
  },
  {
    titleKey: 'nav.groupConfig',
    titleDefault: 'Cấu hình & Tích hợp',
    items: [
      { key: 'nav.systemConfig', href: '/system-config', icon: Sliders },
      { key: 'nav.masterData', href: '/master-data', icon: Layers },
      { key: 'nav.webhooks', href: '/webhooks', icon: Radio },
      { key: 'nav.auditLogs', href: '/audit-logs', icon: FileSearch },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-screen">
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-slate-900/50">
        <MSchoolLogo size={34} showText={true} />
      </div>

      <nav className="flex-1 px-3.5 py-4 space-y-6 overflow-y-auto">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t(group.titleKey)}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Nút Đăng xuất bám đáy Sidebar thay cho icon và mã ngôn ngữ */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/80">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800/60 hover:border-rose-500/30 transition-all duration-200 group"
          title={t('common.logout')}
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span>{t('common.logout')}</span>
          </div>
          <span className="text-[10px] bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded font-mono group-hover:bg-rose-500/20 group-hover:text-rose-300 transition-colors">
            v1.2
          </span>
        </button>
      </div>
    </aside>
  );
}
