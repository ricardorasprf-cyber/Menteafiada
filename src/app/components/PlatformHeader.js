/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/PlatformHeader.js
 * Objetivo: Cabeçalho global unificado reproduzindo fielmente a logo, a
 * comutação de tema em 1 clique ("theme-classic", "theme-dark", "theme-synthwave"),
 * o seletor de idioma sincronizado e o menu autenticado ("Olá, [Nome]") com
 * atalhos completos por perfil (Proprietário, Criador, Gestor e Participante).
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useAuth,
  useUser,
  useClerk,
  SignInButton,
  SignUpButton,
} from '@clerk/nextjs';
import { useTheme } from '@/app/components/ThemeProvider';
import { useLanguage } from '@/contexts/LanguageContext';

// Estilos do cabeçalho alinhados às 3 classes globais da plataforma
const HEADER_THEMES = {
  'theme-classic': {
    header: 'border-slate-200/90 bg-white/95 text-slate-900',
    logoText: 'text-slate-900',
    logoAccent: 'text-indigo-600',
    navLink: 'text-slate-600 hover:text-indigo-600',
    navLinkActive: 'text-indigo-600 font-bold',
    themeBtn:
      'bg-slate-100 border-slate-300 hover:border-indigo-400 text-slate-800 hover:bg-slate-200/70',
    pillButton:
      'bg-slate-100 border-slate-300 hover:border-indigo-400 text-slate-800',
    dropdown: 'bg-white border-slate-200 shadow-xl text-slate-800',
    dropdownDivider: 'border-slate-100',
    dropdownItem: 'text-slate-700 hover:bg-slate-100',
    primaryBtn:
      'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25',
  },
  'theme-dark': {
    header: 'border-slate-800/80 bg-[#070b19]/90 text-slate-100',
    logoText: 'text-white',
    logoAccent: 'text-indigo-400',
    navLink: 'text-slate-400 hover:text-white',
    navLinkActive: 'text-indigo-400 font-bold',
    themeBtn:
      'bg-[#11172b] border-slate-700/80 hover:border-indigo-500/60 text-amber-300 hover:bg-slate-800/90',
    pillButton:
      'bg-[#11172b] border-slate-700/80 hover:border-indigo-500/60 text-slate-100',
    dropdown: 'bg-[#111625] border-slate-800 shadow-2xl text-slate-100',
    dropdownDivider: 'border-slate-800/80',
    dropdownItem: 'text-slate-200 hover:bg-slate-800/70',
    primaryBtn:
      'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40',
  },
  'theme-synthwave': {
    header:
      'border-fuchsia-500/30 bg-[#050714]/92 text-white shadow-[0_4px_30px_rgba(192,38,211,0.18)]',
    logoText: 'text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    logoAccent: 'text-cyan-400',
    navLink:
      'text-cyan-200/70 hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    navLinkActive:
      'text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    themeBtn:
      'bg-[#0b0f26] border-fuchsia-500/60 hover:border-cyan-400 text-cyan-300 shadow-[0_0_18px_rgba(217,70,239,0.3)]',
    pillButton:
      'bg-[#0b0f26] border-cyan-500/40 hover:border-fuchsia-500 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    dropdown:
      'bg-[#090d22] border-fuchsia-500/40 shadow-[0_0_35px_rgba(217,70,239,0.25)] text-cyan-50',
    dropdownDivider: 'border-fuchsia-500/20',
    dropdownItem: 'text-cyan-100 hover:bg-fuchsia-500/15',
    primaryBtn:
      'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.5)]',
  },
};

const LANGUAGES = [
  { code: 'pt', label: 'PT-BR', flag: 'BR' },
  { code: 'en', label: 'EN', flag: 'US' },
  { code: 'es', label: 'ES', flag: 'ES' },
];

export default function PlatformHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, themeInfo, cyclePlatformTheme } = useTheme();
  const langContext = useLanguage();

  const t = HEADER_THEMES[theme] || HEADER_THEMES['theme-classic'];

  // Estados dos dropdowns
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [localLangCode, setLocalLangCode] = useState('pt');

  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  // Sincronização com o LanguageContext global
  const activeLangCode = langContext?.language || localLangCode;
  const activeLangObj =
    LANGUAGES.find((l) => l.code === activeLangCode) || LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    setLocalLangCode(code);
    if (typeof langContext?.changeLanguage === 'function') {
      langContext.changeLanguage(code);
    } else if (typeof langContext?.setLanguage === 'function') {
      langContext.setLanguage(code);
    }
    setLangMenuOpen(false);
  };

  // Dados e cargo do usuário autenticado
  const userName =
    user?.firstName ||
    user?.username ||
    user?.fullName?.split(' ')[0] ||
    'Usuário';

  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    'participant';

  const isOwner = userRole === 'owner';
  const isEducatorOrAdmin = [
    'educator',
    'teacher',
    'creator',
    'manager',
    'admin',
    'owner',
  ].includes(userRole);

  const getRoleBadgeLabel = (role) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gestor';
      case 'creator':
      case 'educator':
      case 'teacher':
        return 'Educador / Criador';
      default:
        return 'Participante';
    }
  };

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path) => {
    setUserMenuOpen(false);
    router.push(path);
  };

  const isHomePage = pathname === '/';

  return (
    <header
      className={`border-b backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors duration-300 print:hidden ${t.header}`}
    >
      {/* Logotipo Oficial MenteAfiada (Idêntico à Tela Inicial) */}
      <div
        className="flex items-center gap-2.5 cursor-pointer group"
        onClick={() => router.push('/')}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-[2px] shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
          <div className="h-full w-full rounded-full bg-[#0b1024] flex items-center justify-center">
            <span className="text-lg">🧠</span>
          </div>
        </div>
        <span className={`text-xl font-extrabold tracking-tight ${t.logoText}`}>
          Mente<span className={t.logoAccent}>Afiada</span>
        </span>
      </div>

      {/* Links Centrais de Navegação (Adaptados automaticamente à página atual) */}
      <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
        {isHomePage ? (
          <>
            <a href="#arena" className={`transition-colors ${t.navLink}`}>
              Arena Batalha
            </a>
            <a href="#como-jogar" className={`transition-colors ${t.navLink}`}>
              Como Jogar?
            </a>
            <a href="#recursos" className={`transition-colors ${t.navLink}`}>
              Diferenciais
            </a>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => router.push('/')}
              className={`transition-colors cursor-pointer ${t.navLink}`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => router.push('/arena')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/arena') ? t.navLinkActive : t.navLink
              }`}
            >
              Arena Batalha
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/participant')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/dashboard/participant')
                  ? t.navLinkActive
                  : t.navLink
              }`}
            >
              Meus Cursos
            </button>
            <button
              type="button"
              onClick={() => router.push('/game/play')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/game/play') ? t.navLinkActive : t.navLink
              }`}
            >
              Entrar por PIN
            </button>
          </>
        )}
      </nav>

      {/* Controles à Direita: Botão 1-Clique de Tema + Idioma + Menu Usuário */}
      <div className="flex items-center gap-2 sm:gap-3 min-h-[42px]">
        {/* Botão Direto de 1 Clique: Claro -> Escuro -> NEON */}
        <button
          type="button"
          onClick={cyclePlatformTheme}
          title="Clique para alternar entre Modo Claro, Modo Escuro e Modo NEON"
          className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${t.themeBtn}`}
        >
          <span className="text-sm leading-none">{themeInfo.icon}</span>
          <span className="hidden xs:inline sm:inline">{themeInfo.label}</span>
        </button>

        {/* Seletor de Idioma (BR PT-BR) */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${t.pillButton}`}
          >
            <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded">
              {activeLangObj.flag}
            </span>
            <span className="hidden md:inline">{activeLangObj.label}</span>
            <svg
              className={`w-3.5 h-3.5 opacity-70 transition-transform ${
                langMenuOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {langMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-36 rounded-xl border py-1.5 z-50 text-xs font-semibold ${t.dropdown}`}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 transition-colors cursor-pointer ${
                    t.dropdownItem
                  } ${
                    activeLangCode === lang.code
                      ? 'text-indigo-500 font-bold'
                      : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold opacity-70">
                      {lang.flag}
                    </span>
                    <span>{lang.label}</span>
                  </span>
                  {activeLangCode === lang.code && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estado: Usuário NÃO Logado */}
        {isLoaded && !isSignedIn && (
          <>
            <SignInButton
              mode="modal"
              forceRedirectUrl={pathname || '/'}
              fallbackRedirectUrl={pathname || '/'}
            >
              <button
                type="button"
                className={`text-sm font-semibold transition-colors px-3 sm:px-4 py-2 rounded-full cursor-pointer ${t.navLink}`}
              >
                Entrar
              </button>
            </SignInButton>

            <SignUpButton
              mode="modal"
              forceRedirectUrl={pathname || '/'}
              fallbackRedirectUrl={pathname || '/'}
            >
              <button
                type="button"
                className={`text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-full active:scale-95 transition-all cursor-pointer ${t.primaryBtn}`}
              >
                Criar Conta Grátis
              </button>
            </SignUpButton>
          </>
        )}

        {/* Estado: Usuário LOGADO (Menu Dropdown Unificado) */}
        {isLoaded && isSignedIn && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border text-sm font-semibold shadow-sm transition-all cursor-pointer ${t.pillButton}`}
            >
              <span className="truncate max-w-[110px] sm:max-w-none">
                Olá, {userName}
              </span>
              <svg
                className={`w-4 h-4 opacity-70 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {userMenuOpen && (
              <div
                className={`absolute right-0 mt-2.5 w-64 rounded-2xl border py-3 z-50 overflow-hidden ${t.dropdown}`}
              >
                {/* Cabeçalho da Conta */}
                <div className={`px-4 pb-3 border-b ${t.dropdownDivider}`}>
                  <p className="text-[10px] font-bold tracking-widest opacity-60 uppercase">
                    CONTA MENTEAFIADA
                  </p>
                  <p className="text-base font-extrabold mt-0.5 truncate">
                    {userName}
                  </p>
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    {getRoleBadgeLabel(userRole)}
                  </span>
                </div>

                {/* Atalhos Administrativos e de Educador */}
                {(isOwner || isEducatorOrAdmin) && (
                  <div className={`py-1.5 border-b ${t.dropdownDivider}`}>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleNavigate('/dashboard/owner')}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-amber-500 transition-colors cursor-pointer ${t.dropdownItem}`}
                      >
                        <span>👑</span>
                        <span>Painel do Proprietário</span>
                      </button>
                    )}

                    {isEducatorOrAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/dashboard/quizzes')}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-purple-500 transition-colors cursor-pointer ${t.dropdownItem}`}
                        >
                          <span>📝</span>
                          <span>Gerenciar Quizzes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/game/host')}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-indigo-500 transition-colors cursor-pointer ${t.dropdownItem}`}
                        >
                          <span>🎮</span>
                          <span>Criar Sala de Jogo</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Navegação Principal do Usuário */}
                <div className="py-1.5">
                  {!isHomePage && (
                    <button
                      type="button"
                      onClick={() => handleNavigate('/')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${t.dropdownItem}`}
                    >
                      <span>🏠</span>
                      <span>Página Inicial</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleNavigate('/arena')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-indigo-500 transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span>⚔️</span>
                    <span>Arena Mensal (Desempenho)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/game/play')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span>🔢</span>
                    <span>Entrar por PIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/completar-perfil')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span>⚙️</span>
                    <span>Configurações</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard/participant')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span>🎓</span>
                    <span>Meus Cursos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard/achievements')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span>🏅</span>
                    <span>Minhas Conquistas</span>
                  </button>
                </div>

                {/* Rodapé do Menu: Sair da conta */}
                <div className={`pt-1.5 border-t ${t.dropdownDivider}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ redirectUrl: '/' });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <span>🚪</span>
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}