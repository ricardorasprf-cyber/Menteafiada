/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/configuracoes/page.js
 * Objetivo: Página de Configurações e Preferências do Usuário (música, SFX,
 * memes e seletor de tema visual na ordem oficial: Claro, Papel, Escuro
 * e Neon/Synthwave).
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/app/components/ThemeProvider";

export default function ConfiguracoesPage() {
  const { user } = useUser();
  const { setPlatformTheme } = useTheme();
  const userName = user?.firstName || "Utilizador";

  const [preferences, setPreferences] = useState({
    music: true,
    sfx: true,
    memes: true,
    theme: "classic",
  });

  const [userRole, setUserRole] = useState("participant");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) fetchUserData();
  }, [user]);

  useEffect(() => {
    const theme = preferences.theme || "classic";
    document.documentElement.setAttribute("data-theme", theme);
  }, [preferences.theme]);

  const fetchUserData = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("game_preferences, role")
      .eq("clerk_id", user.id)
      .single();

    if (data?.game_preferences) {
      setPreferences(data.game_preferences);
    }
    if (data?.role) {
      setUserRole(data.role);
    }
    setLoading(false);
  };

  const handleToggle = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    setSaving(true);

    setPlatformTheme(`theme-${preferences.theme}`);

    const { error } = await supabase
      .from("profiles")
      .update({ game_preferences: preferences })
      .eq("clerk_id", user.id);

    if (!error) {
      alert("Configurações guardadas com sucesso!");
    } else {
      alert("Erro ao guardar configurações.");
    }
    setSaving(false);
  };

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case "sepia":
        return {
          bg: "bg-[#f7f3e8] text-[#292524]",
          card: "bg-[#fffdf8] border-[#e6dec8] text-[#292524] shadow-xl shadow-amber-950/10",
          header: "bg-[#3b2f23]",
          textMuted: "text-[#78716c]",
        };
      case "dark":
        return {
          bg: "bg-slate-950 text-slate-100",
          card: "bg-slate-900 border-slate-800 text-white shadow-2xl shadow-purple-950/20",
          header: "bg-black border-b border-slate-800",
          textMuted: "text-slate-400",
        };
      case "synthwave":
        return {
          bg: "bg-purple-950 text-pink-100",
          card: "bg-slate-900/90 border-pink-500/30 text-white shadow-2xl shadow-pink-500/20 backdrop-blur",
          header: "bg-slate-950 border-b border-pink-500/20",
          textMuted: "text-pink-300/70",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-900",
          card: "bg-white border-slate-100 text-slate-900 shadow-xl shadow-slate-200/50",
          header: "bg-slate-900",
          textMuted: "text-slate-400",
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${styles.bg}`}
    >
      <header
        className={`pb-24 pt-6 px-6 transition-colors duration-300 ${styles.header}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
              <img
                src="/logo-dark.jpeg"
                alt="Logo MenteAfiada"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Mente
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Afiada
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <UserMenu userName={userName} userRole={userRole} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6 group"
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Voltar para a Página Inicial
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Configurações do Jogo
          </h1>
          <p className="text-slate-400">
            Personalize a sua experiência de aprendizagem e gamificação.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 -mt-12 pb-20 relative z-10">
        <div
          className={`rounded-3xl p-8 border transition-all duration-300 ${styles.card}`}
        >
          {loading ? (
            <p className="text-center py-8 text-slate-400">
              A carregar preferências...
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-slate-800/20">
                <div>
                  <h3 className="font-semibold">Música de Fundo</h3>
                  <p className={`text-xs ${styles.textMuted}`}>
                    Tocar música durante as sessões de estudo
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("music")}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.music ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                      preferences.music ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-slate-800/20">
                <div>
                  <h3 className="font-semibold">Efeitos Sonoros (SFX)</h3>
                  <p className={`text-xs ${styles.textMuted}`}>
                    Sons de resposta certa, errada e pontos
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("sfx")}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.sfx ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                      preferences.sfx ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-slate-800/20">
                <div>
                  <h3 className="font-semibold">Exibir Memes e Animações</h3>
                  <p className={`text-xs ${styles.textMuted}`}>
                    Mostrar imagens divertidas entre as perguntas
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("memes")}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    preferences.memes ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                      preferences.memes ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-semibold mb-2">
                  Tema Visual da Plataforma
                </label>
                <select
                  value={preferences.theme}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPreferences({ ...preferences, theme: next });
                    setPlatformTheme(`theme-${next}`);
                  }}
                  className="w-full bg-slate-800/15 border border-slate-500/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer font-medium"
                >
                  <option value="classic">☀️ Claro (MenteAfiada)</option>
                  <option value="sepia">📜 Papel / Leitura (Sépia)</option>
                  <option value="dark">🌙 Modo Escuro (Dark Mode)</option>
                  <option value="synthwave">⚡ Neon / Synthwave</option>
                </select>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="mt-8 w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition duration-200 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {saving ? "A guardar alterações..." : "Guardar Preferências"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

```

### Como Aplicar

Clique no botão **Copiar** no final desta mensagem e pressione **`Ctrl + Shift + B`** no VS Code — agora o botão do cabeçalho e o seletor rápido alternam exatamente na ordem **☀️ Claro → 📜 Papel → 🌙 Escuro → ⚡ NEON**.
