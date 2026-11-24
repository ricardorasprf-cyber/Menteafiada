"use client";

import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { dictionaries } from "@/locales/dictionaries";
import { interfaceCopy, LANGUAGES } from "@/locales/interfaceCopy";

const LanguageContext = createContext();
const STORAGE_KEY = "platform_lang";
const isSupportedLanguage = (code) => LANGUAGES.some((language) => language.code === code);

function detectBrowserLanguage() {
  const { languages = [], language } = window.navigator;
  return [...languages, language]
    .map((tag) => tag?.toLowerCase().split("-")[0])
    .find(isSupportedLanguage) || "pt";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("pt");
  const languageIndex = LANGUAGES.findIndex((entry) => entry.code === language);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let saved;
      try {
        saved = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // A navegação também funciona com o armazenamento bloqueado.
      }
      setLanguage(isSupportedLanguage(saved) ? saved : detectBrowserLanguage());
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANGUAGES[languageIndex].locale;
  }, [languageIndex]);

  const changeLanguage = useCallback((lang) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguage(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Mantém a seleção em memória durante a navegação.
    }
  }, []);

  const t = useCallback((key, values) => {
    const text = interfaceCopy[key]?.[languageIndex] ?? dictionaries[language]?.[key] ?? dictionaries.pt[key] ?? key;
    return values
      ? text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
      : text;
  }, [language, languageIndex]);

  return (
    <LanguageContext.Provider value={{ language, locale: LANGUAGES[languageIndex].locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook para usar nos componentes
export const useLanguage = () => useContext(LanguageContext);
