"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { evaluateAndUnlockBadges } from "@/lib/badgeEvaluator";

export default function ParticipantDashboard() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();

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
  const progressPercent = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;

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
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Header Institucional */}
      <div className="bg-slate-900 border-b border-slate-800 pb-10 transition-none">
        <header className="py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
                <img src="/logo-dark.jpeg" alt="Logo MenteAfiada" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Mente<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Afiada</span>
              </span>
            </Link>

            <nav className="flex items-center gap-3">
              <LanguageSelector />
              <UserMenu userName={user?.firstName || "Aluno"} userRole="participant" />
            </nav>
          </div>
        </header>

        {/* Título e Botão de Ação */}
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4 group">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Voltar ao Início
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                <span>🏅</span> Galeria de Conquistas & Emblemas
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1">
                Acompanhe o seu progresso, medalhas desbloqueadas e marcos de evolução no jogo.
              </p>
            </div>

            <Link
              href="/game/play"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-xs transition cursor-pointer flex items-center gap-2"
            >
              🎮 Entrar num Quiz ao Vivo
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Cartão de Resumo do Progresso */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl transition-colors duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block mb-1">Status da Coleção</span>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Você desbloqueou <span className="text-emerald-500 font-extrabold">{unlockedCount}</span> de{" "}
                <span className="opacity-70">{badges.length}</span> emblemas
              </h2>
            </div>
            <span className="font-mono text-2xl font-black text-amber-500">{progressPercent}%</span>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-full h-3.5 overflow-hidden shadow-inner p-0.5">
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Filtros por Categoria */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                activeCategory === c.id
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20"
                  : "bg-[var(--card-bg)] text-[var(--foreground)] border-[var(--card-border)] hover:opacity-80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Galeria de Badges */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-[var(--foreground)] opacity-60 font-semibold">Calculando suas conquistas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredBadges.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-lg flex flex-col justify-between relative overflow-hidden ${
                  b.unlocked
                    ? "bg-[var(--card-bg)] border-purple-500/40 hover:border-purple-500 hover:scale-[1.02]"
                    : "bg-[var(--card-bg)] border-[var(--card-border)] opacity-50 grayscale hover:opacity-75"
                }`}
              >
                {b.unlocked && (
                  <span className="absolute top-3 right-3 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    Desbloqueado ✓
                  </span>
                )}

                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-3xl shadow-inner">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--foreground)]">{b.title}</h3>
                    <p className="text-xs text-[var(--foreground)] opacity-70 mt-1 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center justify-between text-[11px] font-medium opacity-60">
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
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-8 rounded-3xl max-w-sm w-full text-center space-y-5 relative shadow-2xl transition-colors duration-300 animate-in zoom-in-95">
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="w-20 h-20 rounded-3xl bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-4xl shadow-inner mx-auto">
                {selectedBadge.icon}
              </div>

              <div>
                <h3 className="text-xl font-black text-[var(--foreground)]">{selectedBadge.title}</h3>
                <p className="text-xs text-[var(--foreground)] opacity-70 mt-2 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl text-xs space-y-1">
                <p className="font-bold text-[var(--foreground)]">
                  Estado: {selectedBadge.unlocked ? "🎉 Conquistado!" : "🔒 Ainda não desbloqueado"}
                </p>
                {selectedBadge.unlocked_at && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    Em: {new Date(selectedBadge.unlocked_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <button
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
      <footer className="py-6 text-center text-xs text-[var(--foreground)] opacity-50 border-t border-[var(--card-border)]">
        © {new Date().getFullYear()} MenteAfiada Realtime Quiz Engine.
      </footer>
    </div>
  );
}