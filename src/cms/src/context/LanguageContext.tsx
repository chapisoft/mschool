'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import vi from '../i18n/vi.json';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';

export type SupportedLanguage = 'vi' | 'en' | 'zh' | 'ja' | 'ko';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, fallbackOrParams?: string | Record<string, any>, params?: Record<string, any>) => string;
}

const translations: Record<SupportedLanguage, any> = {
  vi,
  en,
  zh,
  ja,
  ko,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (path: string, fallbackOrParams?: string | Record<string, any>) => {
    if (typeof fallbackOrParams === 'string') return fallbackOrParams;
    return path;
  },
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('mschool_language') as SupportedLanguage;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('mschool_language', lang);
  };

  const t = (path: string, fallbackOrParams?: string | Record<string, any>, maybeParams?: Record<string, any>): string => {
    let fallback: string | undefined;
    let params: Record<string, any> | undefined;

    if (typeof fallbackOrParams === 'string') {
      fallback = fallbackOrParams;
      params = maybeParams;
    } else if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
      params = fallbackOrParams;
    }

    const keys = path.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback sang tiếng Việt nếu thiếu
        let fallbackVal: any = translations['vi'];
        for (const fKey of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && fKey in fallbackVal) {
            fallbackVal = fallbackVal[fKey];
          } else {
            return fallback || path;
          }
        }
        current = fallbackVal;
        break;
      }
    }

    let result = typeof current === 'string' ? current : (fallback || path);

    if (params && typeof result === 'string') {
      Object.keys(params).forEach((pKey) => {
        result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(params[pKey]));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
