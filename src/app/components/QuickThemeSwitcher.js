/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/QuickThemeSwitcher.js
 * Objetivo: Botão flutuante discreto de 1 clique disponível em todas as
 * páginas da plataforma para alternar rapidamente entre Modo Claro,
 * Modo Escuro e Modo NEON sem precisar abrir o modal de configurações.
 * ============================================================================
 */

'use client';

import React from 'react';
import { useTheme } from '@/app/components/ThemeProvider';

export default function QuickThemeSwitcher() {
  const { theme, themeInfo, cyclePlatformTheme } = useTheme();

  // Estilização adaptativa conforme o tema ativo no momento
  const getButtonStyle = () => {
    if (theme === 'theme-synthwave') {
      return 'bg-[#0b0f26]/95 border-fuchsia-500/70 text-cyan-300 shadow-[0_0_20px_rgba(217,70,239,0.45)] hover:border-cyan-400';
    }
    if (theme === 'theme-dark') {
      return 'bg-slate-900/95 border-slate-700 text-amber-300 shadow-xl hover:border-indigo-500';
    }
    return 'bg-white/95 border-slate-300 text-slate-800 shadow-lg hover:border-indigo-500';
  };

  return (
    <button
      type="button"
      onClick={cyclePlatformTheme}
      title="Clique para alternar o modo de exibição (Claro, Escuro ou NEON)"
      aria-label={`Alternar tema atual: ${themeInfo.label}`}
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full border text-xs font-extrabold backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${getButtonStyle()}`}
    >
      <span className="text-sm leading-none">{themeInfo.icon}</span>
      <span>{themeInfo.label}</span>
    </button>
  );
}