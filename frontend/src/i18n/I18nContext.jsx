import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en';
import vi from './locales/vi';

const dictionaries = {
  en,
  vi,
};

const I18nContext = createContext({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, fallback) => key,
});

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('vface_lang') || 'en';
  });

  const setLanguage = (lang) => {
    if (lang === 'en' || lang === 'vi') {
      setLanguageState(lang);
      localStorage.setItem('vface_lang', lang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'vi' : 'en';
    setLanguage(nextLang);
  };

  const t = (key, fallback = '') => {
    const currentDict = dictionaries[language] || dictionaries.en;
    if (currentDict && key in currentDict) {
      return currentDict[key];
    }
    // Fallback to English dictionary
    if (dictionaries.en && key in dictionaries.en) {
      return dictionaries.en[key];
    }
    return fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

export default I18nContext;
