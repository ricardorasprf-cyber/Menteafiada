/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/ThemeProvider.js
 * Objetivo: Gerenciar globalmente os modos de exibição da plataforma
 * ("theme-classic", "theme-dark" e "theme-synthwave") com suporte a
 * alternância cíclica de 1 clique e sincronização em tempo real com o
 * SettingsModal e localStorage ("platform_theme").
 * ============================================================================
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Ordem cíclica oficial dos temas da plataforma
export const THEME_LIST = [
  {
    id: 'theme-classic',
    label: 'Modo Claro',
    shortLabel: 'Claro',
    icon: '☀️',
  },
  {
    id: 'theme-dark',
    label: 'Modo Escuro',
    shortLabel: 'Escuro',
    icon: '🌙',
  },
  {
    id: 'theme-synthwave',
    label: 'Modo NEON',
    shortLabel: 'NEON',
    icon: '⚡',
  },
];

const ThemeContext = createContext({
  theme: 'theme-classic',
  themeInfo: THEME_LIST[0],
  setPlatformTheme: () => {},
  cyclePlatformTheme: () => {},
});

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('theme-classic');

  // Aplica a classe no <html> e sincroniza o estado React
  const syncThemeFromStorage = useCallback(() => {
    const savedTheme = localStorage.getItem('platform_theme') || 'theme-classic';
    const validTheme = THEME_LIST.some((t) => t.id === savedTheme)
      ? savedTheme
      : 'theme-classic';

    const html = document.documentElement;
    html.classList.remove('theme-classic', 'theme-dark', 'theme-synthwave');
    html.classList.add(validTheme);

    setTheme(validTheme);
  }, []);

  useEffect(() => {
    // Aplica o tema na montagem inicial
    syncThemeFromStorage();

    // Escuta o evento customizado enviado pelo SettingsModal ou pelo botão global
    window.addEventListener('theme-change', syncThemeFromStorage);
    // Escuta alterações feitas em outras abas do navegador
    window.addEventListener('storage', syncThemeFromStorage);

    return () => {
      window.removeEventListener('theme-change', syncThemeFromStorage);
      window.removeEventListener('storage', syncThemeFromStorage);
    };
  }, [syncThemeFromStorage]);

  // Define um tema específico e notifica toda a plataforma (incluindo SettingsModal)
  const setPlatformTheme = useCallback((newThemeId) => {
    const validTheme = THEME_LIST.some((t) => t.id === newThemeId)
      ? newThemeId
      : 'theme-classic';

    localStorage.setItem('platform_theme', validTheme);

    const html = document.documentElement;
    html.classList.remove('theme-classic', 'theme-dark', 'theme-synthwave');
    html.classList.add(validTheme);

    setTheme(validTheme);

    // Dispara o evento padrão já utilizado pelo SettingsModal
    window.dispatchEvent(new Event('theme-change'));
  }, []);

  // Alterna ciclicamente com 1 clique: Claro -> Escuro -> NEON -> Claro
  const cyclePlatformTheme = useCallback(() => {
    const currentIndex = THEME_LIST.findIndex((t) => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEME_LIST.length;
    setPlatformTheme(THEME_LIST[nextIndex].id);
  }, [theme, setPlatformTheme]);

  const themeInfo =
    THEME_LIST.find((t) => t.id === theme) || THEME_LIST[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeInfo,
        setPlatformTheme,
        cyclePlatformTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook utilitário para qualquer página ou componente acessar ou alternar o tema
export function useTheme() {
  return useContext(ThemeContext);
}