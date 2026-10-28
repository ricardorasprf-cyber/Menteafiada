"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { dictionaries } from "@/locales/dictionaries";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("pt");

  useEffect(() => {
    // Lê o idioma salvo ou define português como padrão
    const savedLang = localStorage.getItem("platform_lang") || "pt";
    setLanguage(savedLang);
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("platform_lang", lang);
  };

  // Função mágica de tradução
  const t = (key) => {
    return dictionaries[language]?.[key] || dictionaries["pt"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook para usar nos componentes
export const useLanguage = () => useContext(LanguageContext);