'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import MSchoolLogo from '@/components/MSchoolLogo';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        router.replace('/dashboard');
      } else {
        setErrorMessage(result.message || 'Đăng nhập không thành công');
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Các quầng sáng trang trí nền tinh tế */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Khung Thẻ Đăng Nhập Hiện Đại Theme Sáng */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 relative">
          {/* Huy hiệu bảo mật góc trên */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cổng Xác Thực An Ninh Học Đường</span>
            </div>
          </div>

          {/* Logo & Tiêu đề */}
          <div className="flex flex-col items-center text-center mb-8">
            <MSchoolLogo size={64} className="mb-3" />
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 tracking-wider">
              MSCHOOL
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Hệ thống Quản trị Trường học Thông minh
            </p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Nhập Liệu */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tài khoản (vd: admin)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 hover:from-sky-500 hover:via-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng Nhập Quản Trị</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Gợi ý tài khoản thử nghiệm */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Tài khoản thử nghiệm sẵn có:</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                <span>Tài khoản: <strong className="text-slate-900">admin</strong></span>
                <span>Mật khẩu: <strong className="text-slate-900">Admin@2026</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer bản quyền */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 MSCHOOL. Nền tảng Quản trị và Điểm danh Khuôn mặt Thông minh.
        </p>
      </div>
    </div>
  );
}
