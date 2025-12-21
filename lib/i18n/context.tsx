'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, messages, Messages } from './messages';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Messages;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem('language') as Language;
    if (stored && (stored === 'en' || stored === 'ar')) {
      setLanguageState(stored);
      document.documentElement.lang = stored;
      document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t: messages[language],
    dir: language === 'ar' ? 'rtl' : 'ltr',
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useLanguage() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within an I18nProvider');
  }
  return {
    language: context.language,
    setLanguage: context.setLanguage,
    messages: context.t,
  };
}
