/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/PlatformHeader.js
 * Objetivo: Cabeçalho global unificado reproduzindo fielmente a logo, a
 * comutação de tema em 1 clique ("theme-classic", "theme-dark",
 * "theme-synthwave" e "theme-sepia" Papel/Leitura), o seletor de idioma
 * sincronizado e o menu autenticado ("Olá, [Nome]").
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useAuth,
  useUser,
  useClerk,
} from '@clerk/nextjs';
import { useTheme } from '@/app/components/ThemeProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES } from '@/locales/interfaceCopy';

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
  'theme-sepia': {
    header: 'border-[#e6dec8] bg-[#fffdf8]/95 text-[#292524]',
    logoText: 'text-[#292524]',
    logoAccent: 'text-amber-700',
    navLink: 'text-[#57534e] hover:text-amber-800',
    navLinkActive: 'text-amber-800 font-bold',
    themeBtn:
      'bg-[#f3ece0] border-[#d6cbb2] hover:border-amber-600 text-amber-900 hover:bg-[#ebe1cf]',
    pillButton:
      'bg-[#f3ece0] border-[#d6cbb2] hover:border-amber-600 text-[#292524]',
    dropdown: 'bg-[#fffdf8] border-[#e6dec8] shadow-xl text-[#292524]',
    dropdownDivider: 'border-[#efe9d8]',
    dropdownItem: 'text-[#44403c] hover:bg-[#f5efe2]',
    primaryBtn:
      'bg-gradient-to-r from-amber-700 to-orange-600 hover:from-amber-600 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20',
  },
};

export default function PlatformHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, themeInfo, cyclePlatformTheme } = useTheme();
  const { language: activeLangCode, changeLanguage, t: translate } = useLanguage();

  const t = HEADER_THEMES[theme] || HEADER_THEMES['theme-classic'];

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  const activeLangObj =
    LANGUAGES.find((l) => l.code === activeLangCode) || LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    changeLanguage(code);
    setLangMenuOpen(false);
  };

  const userName =
    user?.firstName ||
    user?.username ||
    user?.fullName?.split(' ')[0] ||
    translate('user_name_fallback');

  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    'participant';

  const planTier =
    user?.publicMetadata?.plan_tier ||
    user?.unsafeMetadata?.plan_tier ||
    'free';

  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager' || isOwner;
  const isEducator = [
    'educator',
    'teacher',
    'creator',
    'creator_pro',
    'manager',
    'admin',
    'owner',
  ].includes(userRole);

  const isPaidPlan =
    isOwner ||
    ['student_pro', 'creator_pro', 'institutional'].includes(planTier) ||
    ['creator_pro', 'student_pro', 'manager'].includes(userRole);

  const getRoleBadgeInfo = (role, tier) => {
    if (role === 'owner') {
      return {
        label: `👑 ${translate('role_owner')}`,
        style: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
      };
    }
    if (role === 'manager' || tier === 'institutional') {
      return {
        label: `🏫 ${translate('role_manager')}`,
        style: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
      };
    }
    if (
      role === 'creator_pro' ||
      tier === 'creator_pro' ||
      ['creator', 'educator', 'teacher'].includes(role)
    ) {
      return {
        label:
          tier === 'creator_pro' || role === 'creator_pro'
            ? `🚀 ${translate('role_educator_pro')}`
            : `📝 ${translate('role_educator')}`,
        style: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
      };
    }
    if (role === 'student_pro' || tier === 'student_pro') {
      return {
        label: `🎓 ${translate('role_student_pro')}`,
        style: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
      };
    }
    return {
      label: `🌱 ${translate('role_explorer')}`,
      style: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    };
  };

  const roleBadge = getRoleBadgeInfo(userRole, planTier);

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
  const showAuthenticatedMenu = Boolean(isLoaded && isSignedIn);

  return (
    <header
      className={`border-b backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors duration-300 print:hidden ${t.header}`}
    >
      {/* Logotipo Oficial MenteAfiada */}
      <div
        className="flex items-center gap-2.5 cursor-pointer group shrink-0"
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

      {/* Links Centrais de Navegação */}
      <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold whitespace-nowrap">
        {isHomePage ? (
          <>
            <a href="#arena" className={`transition-colors ${t.navLink}`}>
              {translate('arena_nav')}
            </a>
            <a href="#como-jogar" className={`transition-colors ${t.navLink}`}>
              {translate('how_to_play')}
            </a>
            <a href="#recursos" className={`transition-colors ${t.navLink}`}>
              {translate('features_nav')}
            </a>
            <button
              type="button"
              onClick={() => router.push('/planos')}
              className="transition-colors cursor-pointer flex items-center gap-1.5 text-amber-600 font-bold hover:opacity-80"
            >
              <span>💎</span>
              <span>{translate('plans_nav')}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => router.push('/')}
              className={`transition-colors cursor-pointer ${t.navLink}`}
            >
              {translate('home_nav')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/arena')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/arena') ? t.navLinkActive : t.navLink
              }`}
            >
              {translate('arena_nav')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/courses')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/dashboard/courses')
                  ? t.navLinkActive
                  : t.navLink
              }`}
            >
              {translate('my_courses')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/game/play')}
              className={`transition-colors cursor-pointer ${
                pathname?.startsWith('/game/play') ? t.navLinkActive : t.navLink
              }`}
            >
              {translate('join_pin')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/planos')}
              className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                pathname?.startsWith('/planos') ? t.navLinkActive : t.navLink
              }`}
            >
              <span>💎</span>
              <span>{translate('plans_nav')}</span>
            </button>
          </>
        )}
      </nav>

      {/* Controles à Direita */}
      <div className="flex items-center gap-2 sm:gap-3 min-h-[42px] shrink-0">
        <button
          type="button"
          onClick={cyclePlatformTheme}
          title={translate('change_theme')}
          className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${t.themeBtn}`}
        >
          <span className="text-sm leading-none">{themeInfo?.icon || '☀️'}</span>
          <span className="hidden xs:inline sm:inline">
            {translate(`theme_${themeInfo?.shortKey || 'classic'}`)}
          </span>
        </button>

        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            aria-label={translate('language_menu')}
            aria-expanded={langMenuOpen}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${t.pillButton}`}
          >
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded">
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
                  lang={lang.locale}
                  aria-pressed={activeLangCode === lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 whitespace-nowrap transition-colors cursor-pointer ${
                    t.dropdownItem
                  } ${
                    activeLangCode === lang.code
                      ? 'text-indigo-600 font-bold'
                      : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold opacity-70">
                      {lang.flag}
                    </span>
                    <span>{lang.name}</span>
                  </span>
                  {activeLangCode === lang.code && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estado: Usuário NÃO Logado */}
        {!showAuthenticatedMenu && (
          <>
            <button
              type="button"
              onClick={() => router.push('/sign-in')}
              className={`text-sm font-semibold whitespace-nowrap transition-colors px-3 sm:px-4 py-2 rounded-full cursor-pointer ${t.navLink}`}
            >
              {translate('sign_in_nav')}
            </button>

            <button
              type="button"
              onClick={() => router.push('/sign-up')}
              className={`text-xs sm:text-sm font-semibold whitespace-nowrap px-4 sm:px-5 py-2 rounded-full active:scale-95 transition-all cursor-pointer ${t.primaryBtn}`}
            >
              {translate('sign_up_nav')}
            </button>
          </>
        )}

        {/* Estado: Usuário LOGADO */}
        {showAuthenticatedMenu && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap shadow-sm transition-all cursor-pointer ${t.pillButton}`}
            >
              <span className="truncate max-w-[120px] sm:max-w-[180px]">
                {translate('hello')}, {userName}
              </span>
              <svg
                className={`w-4 h-4 opacity-70 shrink-0 transition-transform duration-200 ${
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
                className={`absolute right-0 mt-2.5 w-72 rounded-2xl border py-3 z-50 overflow-hidden ${t.dropdown}`}
              >
                <div className={`px-4 pb-3 border-b ${t.dropdownDivider}`}>
                  <p className="text-[10px] font-bold tracking-widest opacity-60 uppercase whitespace-nowrap">
                    {translate('account_title')}
                  </p>
                  <p className="text-base font-extrabold mt-0.5 truncate">
                    {userName}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${roleBadge.style}`}
                  >
                    {roleBadge.label}
                  </span>
                </div>

                {/* Bloco 1: Gestão Administrativa, Cursos e Quizzes */}
                {(isOwner || isManager || isEducator) && (
                  <div className={`py-1.5 border-b ${t.dropdownDivider}`}>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleNavigate('/dashboard/owner')}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-amber-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                      >
                        <span className="w-5 text-center shrink-0">👑</span>
                        <span>{translate('owner_panel')}</span>
                      </button>
                    )}

                    {isManager && !isOwner && (
                      <button
                        type="button"
                        onClick={() => handleNavigate('/dashboard/manager')}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-cyan-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                      >
                        <span className="w-5 text-center shrink-0">🏫</span>
                        <span>{translate('manager_panel')}</span>
                      </button>
                    )}

                    {isEducator && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/dashboard/creator')}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-emerald-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                        >
                          <span className="w-5 text-center shrink-0">🎬</span>
                          <span>{translate('creator_studio')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/dashboard/quizzes')}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-purple-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                        >
                          <span className="w-5 text-center shrink-0">📝</span>
                          <span>{translate('manage_quizzes')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/game/host')}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-indigo-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                        >
                          <span className="w-5 text-center shrink-0">🎮</span>
                          <span>{translate('create_live_room')}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Bloco 2: Navegação Principal & Conteúdos */}
                <div className="py-1.5">
                  {!isHomePage && (
                    <button
                      type="button"
                      onClick={() => handleNavigate('/')}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                    >
                      <span className="w-5 text-center shrink-0">🏠</span>
                      <span>{translate('home_nav')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleNavigate('/arena')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-indigo-600 whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="w-5 text-center shrink-0">⚔️</span>
                    <span>{translate('monthly_arena')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/game/play')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="w-5 text-center shrink-0">🔢</span>
                    <span>{translate('join_pin')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard/courses')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="w-5 text-center shrink-0">🎓</span>
                    <span>{translate('courses_materials')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard/achievements')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="w-5 text-center shrink-0">🏅</span>
                    <span>{translate('my_achievements')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/planos')}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="flex items-center gap-3 text-emerald-600">
                      <span className="w-5 text-center shrink-0">💎</span>
                      <span>{translate('plans_subscriptions')}</span>
                    </span>
                    {!isPaidPlan && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        PRO
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/completar-perfil')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${t.dropdownItem}`}
                  >
                    <span className="w-5 text-center shrink-0">⚙️</span>
                    <span>{translate('settings')}</span>
                  </button>
                </div>

                <div className={`pt-1.5 border-t ${t.dropdownDivider}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ redirectUrl: '/' });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <span className="w-5 text-center shrink-0">🚪</span>
                    <span>{translate('logout')}</span>
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
