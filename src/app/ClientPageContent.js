"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";

export default function ClientPageContent({ userId, userName, userRole }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans transition-colors duration-300 flex flex-col">
      
      {/* 1. BLOCO SUPERIOR FIXO (Escuro Institucional) */}
      <div className="bg-slate-900 border-b border-slate-800 pb-32 transition-none">
        <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
              <img src="/logo-dark.jpeg" alt="Logo MenteAfiada" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Mente<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Afiada</span>
            </span>
          </div>
          
          <nav className="flex items-center gap-3">
            <LanguageSelector />

            {!userId ? (
              <SignInButton mode="modal">
                <button className="text-sm font-bold text-white bg-purple-500/20 hover:bg-purple-500/30 px-6 py-2.5 rounded-full transition cursor-pointer border border-purple-500/50 shadow-sm">
                  {t("start_now")}
                </button>
              </SignInButton>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/dashboard/participant" className="text-xs font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-full hover:opacity-90 transition shadow-md hidden sm:block">
                  {t("my_courses")}
                </Link>
                <UserMenu userName={userName} userRole={userRole} />
              </div>
            )}
          </nav>
        </header>

        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            {t("hero_title")} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              {t("hero_highlight")}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            {t("hero_subtitle")}
          </p>
        </div>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL (Adaptável) - AGORA FORA DO HEADER ESCURO */}
      <main className="max-w-7xl mx-auto px-6 -mt-24 pb-20 relative z-10 flex-grow w-full">
        <div className="max-w-md mx-auto bg-[var(--card-bg)] text-[var(--foreground)] rounded-3xl p-8 shadow-2xl border border-[var(--card-border)] text-center transition-colors duration-300">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center overflow-hidden border border-purple-500/20">
            <img src="/logo-dark.jpeg" alt="Ícone" className="w-12 h-12 rounded-xl object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            {!userId ? t("start_now") : t("welcome_back")}
          </h2>
          <p className="text-[var(--foreground)] opacity-70 mb-8 text-sm font-medium">
            {!userId ? t("login_desc") : t("ready_desc")}
          </p>
          
          <div className="space-y-4">
            {!userId ? (
              <SignInButton mode="modal">
                <button className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer">
                  <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                  <span className="text-sm">{t("btn_login")}</span>
                </button>
              </SignInButton>
            ) : (
              <Link href="/dashboard/participant" className="w-full flex justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-purple-500/20 text-sm">
                {t("btn_courses")}
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* 3. RODAPÉ */}
      <footer className="py-8 text-center text-sm text-[var(--foreground)] opacity-50 font-medium">
        © {new Date().getFullYear()} MenteAfiada EAD. Todos os direitos reservados.
      </footer>
    </div>
  );
}