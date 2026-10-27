import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations.ts';

interface LanguageContextType {
  lang: Language;
  language: Language;
  setLang: (lang: Language) => void;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  language: 'fr',
  setLang: () => {},
  setLanguage: () => {},
  t: (_path: string, fallback?: string) => fallback || ''
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('wtm_lang');
        if (saved === 'en' || saved === 'fr') return saved;
        // Auto-detect browser language safely
        const browserLang = navigator?.language ? navigator.language.slice(0, 2) : 'fr';
        if (browserLang === 'en') return 'en';
      }
    } catch (e) {
      console.warn('LocalStorage not available', e);
    }
    return 'fr';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('wtm_lang', newLang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang;
      }
    } catch (e) {}
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Helper function to retrieve nested translation key, e.g. t('groups.title') or t('common.save')
   */
  const t = (path: string, fallback?: string): string => {
    const parts = path.split('.');
    let current: any = translations[lang];

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to French if missing in current lang
        let frFallback: any = translations.fr;
        for (const p of parts) {
          if (frFallback && typeof frFallback === 'object' && p in frFallback) {
            frFallback = frFallback[p];
          } else {
            frFallback = undefined;
            break;
          }
        }
        return (typeof frFallback === 'string' ? frFallback : fallback || path);
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <LanguageContext.Provider value={{ lang, language: lang, setLang, setLanguage: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
