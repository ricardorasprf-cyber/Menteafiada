/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/participant/page.js
 * Objetivo: Galeria de Conquistas & Emblemas do Participante, adaptada ao
 * cabeçalho global unificado (PlatformHeader) e aos 3 modos de exibição
 * ("theme-classic", "theme-dark" e "theme-synthwave").
 * ============================================================================
 */

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/app/components/ThemeProvider";
import { evaluateAndUnlockBadges } from "@/lib/badgeEvaluator";

// Tokens visuais alinhados às 3 classes globais da plataforma
const PAGE_STYLES = {
  "theme-classic": {
    heroBanner:
      "bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-b border-slate-200 text-slate-900",
    backLink: "text-slate-600 hover:text-indigo-600",
    heroTitle: "text-slate-900",
    heroSubtitle: "text-slate-600",
    ctaBtn:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    progressCard:
      "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    progressTrack: "bg-slate-100 border-slate-200",
    categoryActive:
      "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20",
    categoryInactive:
      "bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600",
    badgeUnlocked:
      "bg-white border-indigo-300 shadow-md hover:border-indigo-500 hover:shadow-lg",
    badgeLocked:
      "bg-slate-50 border-slate-200 opacity-60 grayscale hover:opacity-80",
    badgeIconBox: "bg-slate-100 border-slate-200",
    badgeDivider: "border-slate-100",
    modalCard: "bg-white border-slate-200 text-slate-900 shadow-2xl",
    modalInfoBox: "bg-slate-50 border-slate-200",
  },
  "theme-dark": {
    heroBanner:
      "bg-gradient-to-b from-slate-900 to-[#070b19] border-b border-slate-800/80 text-white",
    backLink: "text-slate-400 hover:text-white",
    heroTitle: "text-white",
    heroSubtitle: "text-slate-400",
    ctaBtn:
      "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
    progressCard: "bg-slate-900/80 border-slate-800 shadow-xl text-slate-100",
    progressTrack: "bg-slate-950 border-slate-800",
    categoryActive:
      "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20",
    categoryInactive:
      "bg-slate-900/70 text-slate-300 border-slate-800 hover:border-purple-500/50 hover:text-white",
    badgeUnlocked:
      "bg-slate-900/85 border-purple-500/40 shadow-lg hover:border-purple-400",
    badgeLocked:
      "bg-slate-900/40 border-slate-800/80 opacity-50 grayscale hover:opacity-75",
    badgeIconBox: "bg-slate-950 border-slate-800",
    badgeDivider: "border-slate-800",
    modalCard: "bg-[#111625] border-slate-800 text-slate-100 shadow-2xl",
    modalInfoBox: "bg-slate-950 border-slate-800",
  },
  "theme-synthwave": {
    heroBanner:
      "bg-gradient-to-r from-fuchsia-950/40 via-[#080c1f] to-cyan-950/30 border-b border-fuchsia-500/30 text-white",
    backLink: "text-cyan-300/80 hover:text-cyan-200",
    heroTitle: "text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]",
    heroSubtitle: "text-cyan-100/75",
    ctaBtn:
      "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    progressCard:
      "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.18)] text-cyan-50",
    progressTrack: "bg-[#040612] border-cyan-500/30",
    categoryActive:
      "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white border-cyan-400/60 shadow-[0_0_15px_rgba(217,70,239,0.4)]",
    categoryInactive:
      "bg-[#090d22]/80 text-cyan-200/80 border-indigo-500/30 hover:border-cyan-400/60 hover:text-white",
    badgeUnlocked:
      "bg-[#090d22]/90 border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.18)] hover:border-fuchsia-400",
    badgeLocked:
      "bg-[#060919]/70 border-indigo-500/20 opacity-50 grayscale hover:opacity-75",
    badgeIconBox: "bg-[#040612] border-cyan-500/30",
    badgeDivider: "border-fuchsia-500/20",
    modalCard:
      "bg-[#090d22] border-fuchsia-500/50 text-cyan-50 shadow-[0_0_40px_rgba(217,70,239,0.3)]",
    modalInfoBox: "bg-[#040612] border-cyan-500/30",
  },
};

export default function ParticipantDashboard() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const styles = PAGE_STYLES[theme] || PAGE_STYLES["theme-classic"];

  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [activeCategory, setActiveCategory] = useState("todas");

  useEffect(() => {
    async function loadBadges() {
      if (user?.id) {
        setLoading(true);
        const data = await evaluateAndUnlockBadges(user.id);
        setBadges(data);
        setLoading(false);
      }
    }
    if (isLoaded && user) {
      loadBadges();
    }
  }, [isLoaded, user]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const progressPercent =
    badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;

  const categories = [
    { id: "todas", label: "Todas" },
    { id: "geral", label: "Gerais" },
    { id: "aulas", label: "Aulas" },
    { id: "vitoria", label: "Vitórias" },
    { id: "precisao", label: "Precisão" },
    { id: "streak", label: "Sequências" },
    { id: "velocidade", label: "Velocidade" },
    { id: "pontos", label: "Pontuações" },
  ];

  const filteredBadges =
    activeCategory === "todas"
      ? badges
      : badges.filter((b) => b.category?.toLowerCase() === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Banner de Cabeçalho da Seção (Sem duplicar a barra superior global) */}
      <section className={`py-8 px-6 transition-colors duration-300 ${styles.heroBanner}`}>
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className={`inline-flex items-center text-sm font-medium transition-colors mb-4 group ${styles.backLink}`}
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
            Voltar ao Início
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className={`text-3xl font-extrabold flex items-center gap-3 ${styles.heroTitle}`}>
                <span>🏅</span> Galeria de Conquistas & Emblemas
              </h1>
              <p className={`text-sm font-medium mt-1 ${styles.heroSubtitle}`}>
                Acompanhe o seu progresso, medalhas desbloqueadas e marcos de evolução no jogo.
              </p>
            </div>

            <Link
              href="/game/play"
              className={`font-extrabold py-3 px-6 rounded-2xl text-xs transition cursor-pointer flex items-center gap-2 ${styles.ctaBtn}`}
            >
              🎮 Entrar num Quiz ao Vivo
            </Link>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Cartão de Resumo do Progresso */}
        <div
          className={`border rounded-3xl p-6 transition-colors duration-300 ${styles.progressCard}`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block mb-1">
                Status da Coleção
              </span>
              <h2 className="text-xl font-bold">
                Você desbloqueou{" "}
                <span className="text-emerald-500 font-extrabold">
                  {unlockedCount}
                </span>{" "}
                de <span className="opacity-70">{badges.length}</span> emblemas
              </h2>
            </div>
            <span className="font-mono text-2xl font-black text-amber-500">
              {progressPercent}%
            </span>
          </div>

          {/* Barra de Progresso */}
          <div
            className={`w-full border rounded-full h-3.5 overflow-hidden shadow-inner p-0.5 ${styles.progressTrack}`}
          >
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filtros por Categoria */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                activeCategory === c.id
                  ? styles.categoryActive
                  : styles.categoryInactive
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Galeria de Badges */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs opacity-60 font-semibold">
              Calculando suas conquistas...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredBadges.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  b.unlocked
                    ? `${styles.badgeUnlocked} hover:scale-[1.02]`
                    : styles.badgeLocked
                }`}
              >
                {b.unlocked && (
                  <span className="absolute top-3 right-3 text-[10px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Desbloqueado ✓
                  </span>
                )}

                <div className="space-y-3">
                  <div
                    className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shadow-inner ${styles.badgeIconBox}`}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{b.title}</h3>
                    <p className="text-xs opacity-70 mt-1 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-medium opacity-65 ${styles.badgeDivider}`}
                >
                  <span>Categoria: {b.category?.toUpperCase()}</span>
                  <span>{b.unlocked ? "⭐ Concluído" : "🔒 Bloqueado"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Detalhes da Conquista */}
        {selectedBadge && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div
              className={`border p-8 rounded-3xl max-w-sm w-full text-center space-y-5 relative transition-colors duration-300 animate-in zoom-in-95 ${styles.modalCard}`}
            >
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 opacity-50 hover:opacity-100 font-bold cursor-pointer"
              >
                ✕
              </button>

              <div
                className={`w-20 h-20 rounded-3xl border flex items-center justify-center text-4xl shadow-inner mx-auto ${styles.badgeIconBox}`}
              >
                {selectedBadge.icon}
              </div>

              <div>
                <h3 className="text-xl font-black">{selectedBadge.title}</h3>
                <p className="text-xs opacity-70 mt-2 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>

              <div
                className={`p-3 border rounded-2xl text-xs space-y-1 ${styles.modalInfoBox}`}
              >
                <p className="font-bold">
                  Estado:{" "}
                  {selectedBadge.unlocked
                    ? "🎉 Conquistado!"
                    : "🔒 Ainda não desbloqueado"}
                </p>
                {selectedBadge.unlocked_at && (
                  <p className="text-[10px] opacity-60 font-mono">
                    Em: {new Date(selectedBadge.unlocked_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-xs opacity-50 border-t border-[var(--card-border)]">
        © {new Date().getFullYear()} MenteAfiada Realtime Quiz Engine.
      </footer>
    </div>
  );
}