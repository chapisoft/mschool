'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

export default function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isLoginPage = pathname === '/login';

  // Nếu là trang Login, render trọn vẹn màn hình không có Sidebar/Header
  if (isLoginPage) {
    return <main className="w-full min-h-screen bg-slate-950">{children}</main>;
  }

  // Màn hình chờ khi đang kiểm tra phiên đăng nhập
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Đang xác thực phiên làm việc...
          </p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập và không phải trang login (đang được AuthContext chuyển hướng)
  if (!isAuthenticated) {
    return null;
  }

  // Giao diện chính của hệ thống đã đăng nhập
  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
