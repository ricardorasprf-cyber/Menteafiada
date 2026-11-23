/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/ThemeProvider.js
 * Objetivo: Provedor global de temas visuais da plataforma com 4 modos na
 * sequência oficial:
 * 1. "theme-classic"   -> Claro (Modo Claro Institucional)
 * 2. "theme-sepia"     -> Papel (Leitura Confortável / Sépia)
 * 3. "theme-dark"      -> Escuro (Dark Mode)
 * 4. "theme-synthwave" -> NEON / Synthwave
 * Sincroniza automaticamente as classes no elemento <html>, o localStorage
 * e expõe `cyclePlatformTheme()` para alternância em 1 clique no cabeçalho.
 * ============================================================================
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export const PLATFORM_THEMES = [
  {
    id: "theme-classic",
    shortKey: "classic",
    label: "Claro",
    fullName: "Clássico (MenteAfiada)",
    icon: "☀️",
  },
  {
    id: "theme-sepia",
    shortKey: "sepia",
    label: "Papel",
    fullName: "Papel / Leitura (Sépia)",
    icon: "📜",
  },
  {
    id: "theme-dark",
    shortKey: "dark",
    label: "Escuro",
    fullName: "Modo Escuro (Dark Mode)",
    icon: "🌙",
  },
  {
    id: "theme-synthwave",
    shortKey: "synthwave",
    label: "NEON",
    fullName: "Neon / Synthwave",
    icon: "⚡",
  },
];

const ALL_THEME_CLASSES = PLATFORM_THEMES.map((t) => t.id);

function normalizeThemeId(raw) {
  if (!raw) return "theme-classic";
  const val = String(raw).trim();
  if (ALL_THEME_CLASSES.includes(val)) return val;
  const byShort = PLATFORM_THEMES.find((t) => t.shortKey === val);
  return byShort ? byShort.id : "theme-classic";
}

const ThemeContext = createContext({
  theme: "theme-classic",
  themeInfo: PLATFORM_THEMES[0],
  setPlatformTheme: () => {},
  cyclePlatformTheme: () => {},
  availableThemes: PLATFORM_THEMES,
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("theme-classic");

  const applyThemeToDom = useCallback((targetThemeId) => {
    const normalized = normalizeThemeId(targetThemeId);
    setTheme(normalized);

    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.remove(...ALL_THEME_CLASSES);
      root.classList.add(normalized);

      const shortKey = normalized.replace("theme-", "");
      root.setAttribute("data-theme", shortKey);
      window.localStorage.setItem("app_theme", shortKey);
      window.localStorage.setItem("menteafiada_theme", normalized);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved =
      window.localStorage.getItem("menteafiada_theme") ||
      window.localStorage.getItem("app_theme") ||
      "theme-classic";
    applyThemeToDom(saved);
  }, [applyThemeToDom]);

  const cyclePlatformTheme = useCallback(() => {
    const currentIndex = PLATFORM_THEMES.findIndex((t) => t.id === theme);
    const nextIndex = (currentIndex + 1) % PLATFORM_THEMES.length;
    applyThemeToDom(PLATFORM_THEMES[nextIndex].id);
  }, [theme, applyThemeToDom]);

  const themeInfo =
    PLATFORM_THEMES.find((t) => t.id === theme) || PLATFORM_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeInfo,
        setPlatformTheme: applyThemeToDom,
        cyclePlatformTheme,
        availableThemes: PLATFORM_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
