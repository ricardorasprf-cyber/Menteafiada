"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import SettingsModal from "./SettingsModal";
import { useLanguage } from "@/contexts/LanguageContext"; // 1. Importar o hook

export default function UserMenu({ userName, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { signOut } = useClerk();
  
  const { t } = useLanguage(); // 2. Chamar a função de tradução

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative z-50" ref={dropdownRef}>
        {/* Botão de Perfil - Fixo para Fundo Escuro */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-slate-800/50 hover:bg-slate-800 py-2 px-4 rounded-full border border-slate-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-sm"
        >
          <span>{t("hello")}, {userName}</span>
          <svg
            className={`w-4 h-4 opacity-70 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Estilo "Pill" com Glassmorphism - Adaptável ao Tema */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-64 bg-[var(--card-bg)]/95 backdrop-blur-xl text-[var(--foreground)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-[var(--card-border)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-3 py-3 mb-1 border-b border-[var(--card-border)]/50">
              <p className="text-[10px] uppercase font-extrabold opacity-40 tracking-wider">{t("account_title")}</p>
              <p className="text-sm font-bold truncate mt-1">{userName}</p>
            </div>

            <div className="space-y-1">
              {userRole === "owner" && (
                <Link
                  href="/dashboard/owner"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors"
                >
                  <span className="opacity-80">👑</span> {t("admin_panel")}
                </Link>
              )}

              {(userRole === "creator" || userRole === "owner") && (
                <Link
                  href="/dashboard/quizzes"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors"
                >
                  <span className="opacity-80">📝</span> {t("manage_quizzes")}
                </Link>
              )}

              {(userRole === "creator" || userRole === "owner") && (
                <Link
                  href="/game/host"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors"
                >
                  <span className="opacity-80">🎮</span> {t("create_room")}
                </Link>
              )}

              <Link
                href="/game/play"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors"
              >
                <span className="opacity-80">🔢</span> {t("join_pin")}
              </Link>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <span className="opacity-80">⚙️</span> {t("settings")}
              </button>

              <Link
                href="/dashboard/participant"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-slate-500/10 transition-colors"
              >
                <span className="opacity-80">🎓</span> {t("my_courses")}
              </Link>
            </div>

            <div className="pt-1 mt-1 border-t border-[var(--card-border)]/50">
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <span className="opacity-80">🚪</span> {t("logout")}
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}