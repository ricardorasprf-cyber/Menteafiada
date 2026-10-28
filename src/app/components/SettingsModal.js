"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext"; // 1. Importar o hook de idioma

export default function SettingsModal({ isOpen, onClose }) {
  const { language, changeLanguage } = useLanguage(); // 2. Usar o contexto de idioma
  
  const [bgMusic, setBgMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [showMemes, setShowMemes] = useState(true);
  const [theme, setTheme] = useState("theme-classic");

  useEffect(() => {
    const savedMusic = localStorage.getItem("bg_music") !== "false";
    const savedSfx = localStorage.getItem("sfx_enabled") !== "false";
    const savedMemes = localStorage.getItem("show_memes") !== "false";
    const savedTheme = localStorage.getItem("platform_theme") || "theme-classic";

    setBgMusic(savedMusic);
    setSfx(savedSfx);
    setShowMemes(savedMemes);
    setTheme(savedTheme);
  }, [isOpen]);

  const handleThemeChange = (newThemeClass) => {
    setTheme(newThemeClass);
    localStorage.setItem("platform_theme", newThemeClass);

    // 1. Aplica na tag HTML imediatamente trocando a classe
    const html = document.documentElement;
    html.classList.remove("theme-classic", "theme-dark", "theme-synthwave");
    html.classList.add(newThemeClass);

    // 2. Notifica o ThemeProvider para re-renderizar todas as páginas em tempo real
    window.dispatchEvent(new Event("theme-change"));
  };

  const handleToggle = (key, value, setter) => {
    const nextVal = !value;
    setter(nextVal);
    localStorage.setItem(key, nextVal.toString());
  };

  if (!isOpen) return null;

  return (
   <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in zoom-in-95 duration-150">
      {/* Container Principal Adaptável ao Tema */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 sm:p-8 rounded-3xl max-w-lg w-full space-y-6 relative shadow-2xl text-[var(--foreground)] transition-colors duration-300">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold p-1 cursor-pointer transition-opacity"
        >
          ✕
        </button>

        <div className="border-b border-[var(--card-border)] pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            ⚙️ Configurações da Plataforma
          </h2>
          <p className="text-xs opacity-70 mt-1">
            Ajuste áudio, animações, idioma e o tema visual da plataforma.
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* 1. Selecionar Idioma */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--foreground)] opacity-80 uppercase tracking-wider block">
              Idioma da Plataforma
            </label>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm cursor-pointer"
            >
              <option value="pt">🇵🇹 Português</option>
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>

          {/* 2. Tema Visual da Plataforma */}
          <div className="space-y-2 pb-2">
            <label className="text-xs font-bold text-[var(--foreground)] opacity-80 uppercase tracking-wider block">
              Tema Visual da Plataforma
            </label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm cursor-pointer"
            >
              <option value="theme-classic">☀️ Modo Claro (Branco MenteAfiada)</option>
              <option value="theme-dark">🌙 Modo Escuro (Dark Mode Preto)</option>
              <option value="theme-synthwave">🔮 Neon / Synthwave (Roxo)</option>
            </select>
          </div>

          {/* 3. Música de Fundo */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] shadow-sm">
            <div>
              <p className="text-sm font-bold">Música de Fundo</p>
              <p className="text-xs opacity-70">Tocar música durante as sessões de estudo</p>
            </div>
            <button
              onClick={() => handleToggle("bg_music", bgMusic, setBgMusic)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                bgMusic ? "bg-emerald-500 justify-end" : "bg-slate-400 dark:bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
            </button>
          </div>

          {/* 4. Efeitos Sonoros (SFX) */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] shadow-sm">
            <div>
              <p className="text-sm font-bold">Efeitos Sonoros (SFX)</p>
              <p className="text-xs opacity-70">Sons de resposta certa, errada e pontos</p>
            </div>
            <button
              onClick={() => handleToggle("sfx_enabled", sfx, setSfx)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                sfx ? "bg-emerald-500 justify-end" : "bg-slate-400 dark:bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
            </button>
          </div>

          {/* 5. Exibir Memes e Animações */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] shadow-sm">
            <div>
              <p className="text-sm font-bold">Exibir Memes e Animações</p>
              <p className="text-xs opacity-70">Mostrar imagens divertidas entre as perguntas</p>
            </div>
            <button
              onClick={() => handleToggle("show_memes", showMemes, setShowMemes)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                showMemes ? "bg-emerald-500 justify-end" : "bg-slate-400 dark:bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
            </button>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-sm shadow-lg shadow-purple-600/20"
        >
          Guardar e Concluir
        </button>
      </div>
    </div>
  );
}