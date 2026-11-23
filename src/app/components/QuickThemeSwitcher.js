/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/QuickThemeSwitcher.js
 * Objetivo: Seletor rápido de tema visual com suporte aos 4 temas globais:
 * Clássico, Escuro, NEON e Papel (Sépia).
 * ============================================================================
 */

"use client";

import React from "react";
import { useTheme } from "@/app/components/ThemeProvider";

export default function QuickThemeSwitcher({ compact = false }) {
  const { theme, setPlatformTheme, availableThemes } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-slate-500/25 bg-black/10 backdrop-blur-sm">
      {availableThemes.map((item) => {
        const isActive = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlatformTheme(item.id)}
            title={item.fullName}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? "bg-indigo-600 text-white shadow"
                : "opacity-75 hover:opacity-100"
            }`}
          >
            <span>{item.icon}</span>
            {!compact && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
