"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LANGUAGES = [
  { code: "pt", label: "PT-BR", flag: "🇧🇷", name: "Português" },
  { code: "en", label: "EN", flag: "🇺🇸", name: "English" },
  { code: "es", label: "ES", flag: "🇪🇸", name: "Español" },
];

export default function LanguageSelector() {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Botão Fixo no Cabeçalho Escuro */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 py-2 px-3.5 rounded-full border border-slate-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
      >
        <span>{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <svg
          className={`w-3.5 h-3.5 opacity-70 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu Flutuante (Glassmorphism dinâmico) */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-40 bg-[var(--card-bg)]/95 backdrop-blur-xl text-[var(--foreground)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-[var(--card-border)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-1">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer ${
                    isSelected ? "text-purple-500 bg-purple-500/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{lang.flag}</span> 
                    <span>{lang.name}</span>
                  </div>
                  {isSelected && <span>✔️</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}