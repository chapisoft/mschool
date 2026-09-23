import React from 'react';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import AppLayoutContent from '@/components/AppLayoutContent';

export const metadata = {
  title: 'MSCHOOL - Hệ thống Quản trị Trường học Thông minh',
  description: 'Nền tảng điểm danh khuôn mặt không dừng, ma trận phòng học và quản lý an ninh học đường',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="light">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="bg-slate-50 text-slate-800 min-h-screen antialiased selection:bg-sky-500/20 selection:text-sky-900">
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <AppLayoutContent>{children}</AppLayoutContent>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
