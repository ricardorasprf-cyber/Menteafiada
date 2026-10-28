"use client";

import { useEffect } from "react";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    // Escuta alterações salvas no localStorage entre abas ou ao iniciar
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("platform_theme") || "theme-classic";
      const html = document.documentElement;

      html.classList.remove("theme-classic", "theme-dark", "theme-synthwave");
      html.classList.add(savedTheme);
    };

    // Aplica o tema na montagem inicial
    applyTheme();

    // Escuta o evento customizado enviado pelo SettingsModal para trocar a cor sem dar refresh
    window.addEventListener("theme-change", applyTheme);

    return () => {
      window.removeEventListener("theme-change", applyTheme);
    };
  }, []);

  return <>{children}</>;
}