'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, Check } from 'lucide-react';
import { useTranslation, SupportedLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export default function Header() {
  const { language, setLanguage, t } = useTranslation();
  const { user, logout } = useAuth();
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  const currentDate = new Date().toLocaleDateString(
    language === 'vi' ? 'vi-VN' : (language === 'en' ? 'en-US' : (language === 'zh' ? 'zh-CN' : (language === 'ja' ? 'ja-JP' : 'ko-KR'))),
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
      {/* Ngày tháng & Học kỳ */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-600 capitalize">{currentDate}</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
          {t('header.term')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Bộ chọn ngôn ngữ dạng Dropdown tinh tế: Chỉ 1 cờ, bấm vào xổ danh sách */}
        <div className="relative" ref={langDropdownRef}>
          <button
            type="button"
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            title="Đổi ngôn ngữ giao diện"
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="font-bold tracking-wider text-slate-700">{currentLang.code.toUpperCase()}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isLangDropdownOpen ? 'rotate-180 text-sky-600' : ''
              }`}
            />
          </button>

          {/* Menu Dropdown 5 thứ tiếng */}
          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Ngôn ngữ giao diện
              </div>
              <div className="space-y-0.5">
                {languages.map((l) => {
                  const isSelected = language === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-sky-50 text-sky-700 border border-sky-200 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{l.flag}</span>
                        <span>{l.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Thanh tìm kiếm nhanh */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('header.searchPlaceholder')}
            className="w-60 bg-slate-100/90 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Chuông thông báo */}
        <button className="relative p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Khối người dùng */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 border border-sky-400/30 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.avatarText || 'AD'}
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-xs font-bold text-slate-800">{user?.fullName || t('header.roleAdmin')}</p>
            <p className="text-[11px] text-slate-500">{t('header.deptPrincipal')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
