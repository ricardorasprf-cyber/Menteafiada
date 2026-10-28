"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ArenaPage() {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useLanguage();

  const [activeRooms, setActiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (user?.firstName) {
      setPlayerName(user.firstName);
    }
  }, [user]);

  const fetchRooms = async () => {
    setLoading(true);

    try {
      // 1. Busca as sessões públicas que estão aguardando início
      const { data: sessions, error: sessionErr } = await supabase
        .from("game_sessions")
        .select("id, pin, quiz_id, created_at")
        .eq("status", "AGUARDANDO")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (sessionErr) {
        console.error("Erro ao buscar salas da arena:", sessionErr);
        setLoading(false);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setActiveRooms([]);
        setLoading(false);
        return;
      }

      // 2. Coleta os detalhes de cada sala (título do quiz e total de alunos)
      const roomsWithDetails = await Promise.all(
        sessions.map(async (room) => {
          let quizTitle = "Conhecimentos Gerais - MenteAfiada";
          let quizDesc = "Competição aberta para todos os níveis.";

          if (room.quiz_id) {
            const { data: qData } = await supabase
              .from("quizzes")
              .select("title, description")
              .eq("id", room.quiz_id)
              .single();

            if (qData) {
              quizTitle = qData.title || quizTitle;
              quizDesc = qData.description || quizDesc;
            }
          }

          // Total de jogadores na sala
          const { count } = await supabase
            .from("game_players")
            .select("id", { count: "exact", head: true })
            .eq("session_id", room.id);

          return {
            ...room,
            quizTitle,
            quizDesc,
            playerCount: count || 0,
          };
        })
      );

      setActiveRooms(roomsWithDetails);
    } catch (err) {
      console.error("Erro inesperado no feed da arena:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel("arena-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions" },
        () => fetchRooms()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players" },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoinArenaGame = (pin) => {
    const finalName = playerName.trim() || "Competidor";
    router.push(`/game/play?pin=${pin}&name=${encodeURIComponent(finalName)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Bloco Superior Fixo */}
      <div className="bg-slate-900 border-b border-slate-800 pb-10">
        <header className="py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
                <img
                  src="/logo-dark.jpeg"
                  alt="Logo MenteAfiada"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Mente
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Afiada
                </span>
                <span className="ml-2 text-xs font-mono font-bold text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  ARENA
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-3">
              <LanguageSelector />
              {user && (
                <UserMenu
                  userName={user?.firstName || "Competidor"}
                  userRole="participant"
                />
              )}
            </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 mt-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4 group"
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
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                ⚔️ Arena MenteAfiada: Competições Livres
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1">
                Dispute partidas abertas em tempo real contra outros jogadores e acumule emblemas.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold px-2">Seu Nick:</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nome na partida"
                className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal da Arena */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Salas Disponíveis Agora ({activeRooms.length})
          </h2>
          <button
            onClick={fetchRooms}
            className="text-xs bg-[var(--card-bg)] border border-[var(--card-border)] px-3 py-1.5 rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
          >
            🔄 Atualizar Feed
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-[var(--foreground)] opacity-60 font-semibold">
              Procurando partidas abertas...
            </p>
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-12 text-center space-y-4">
            <span className="text-4xl block">🛡️</span>
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Nenhuma sala pública aberta no momento
            </h3>
            <p className="text-xs text-[var(--foreground)] opacity-60 max-w-md mx-auto">
              Nenhum anfitrião marcou a opção pública na criação da sala ainda. Você pode entrar por um PIN privado ou aguardar uma nova disputa.
            </p>
            <div className="pt-2">
              <Link
                href="/game/play"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition"
              >
                Entrar com PIN Privado 🔢
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-purple-500/50 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-5 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Aguardando Início
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      PIN: {room.pin}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--foreground)] line-clamp-1">
                    {room.quizTitle}
                  </h3>
                  <p className="text-xs text-[var(--foreground)] opacity-70 line-clamp-2">
                    {room.quizDesc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--foreground)] opacity-80">
                    👥 {room.playerCount} {room.playerCount === 1 ? "jogador" : "jogadores"}
                  </span>

                  <button
                    onClick={() => handleJoinArenaGame(room.pin)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    Batalhar ⚔️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}