/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/arena/[pin]/page.js
 * Objetivo: Interface de execução da Arena de Batalha Educacional com:
 *           - Pódio dinâmico e fiel exibindo a pontuação real conquistada;
 *           - Pontuação exclusiva e acumulada por Temporada Mensal;
 *           - Painel reativo com pontos da rodada e total do mês;
 *           - Comutador dinâmico de tema da janela (Claro / Escuro);
 *           - Temporizador de 60 segundos com avanço automatizado;
 *           - Celebração com efeitos comemorativos (confetti).
 * ============================================================================
 */

"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import confetti from "canvas-confetti";
import Link from "next/link";

export default function ArenaBattlePage({ params }) {
  // Desempacotamento assíncrono de parâmetros de rota (Next.js 16 / React 19)
  const resolvedParams = use(params);
  const rawPin = resolvedParams?.pin;
  const pin = rawPin ? String(rawPin).trim() : "";

  const { user } = useUser();

  // Estados de dados da sala e das perguntas
  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(null);

  // Controle da Temporada Mensal (Exemplo: '2026-11')
  const [currentSeasonCode, setCurrentSeasonCode] = useState("2026-11");
  const [seasonTitle, setSeasonTitle] = useState("Temporada Mensal");

  // Estados de Interatividade e Pontuação
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState(null);

  // Pontuação isolada da batalha em andamento (acumula a cada acerto)
  const [sessionScore, setSessionScore] = useState(0);
  // Pontuação acumulada mensal exclusiva da Arena
  const [monthlyAccumulatedScore, setMonthlyAccumulatedScore] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);

  // Controle de Tema da Janela (Claro / Escuro)
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("menteafiada_theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("menteafiada_theme", newTheme ? "dark" : "light");
  };

  // 1. Carregamento dos dados da sala, perguntas e ranking mensal
  const carregarDadosArena = async () => {
    if (!pin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setQueryError(null);

      // Consulta a temporada mensal ativa
      const { data: seasonData } = await supabase
        .from("arena_seasons")
        .select("season_code, title")
        .eq("is_active", true)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const activeSeason = seasonData?.season_code || "2026-11";
      setCurrentSeasonCode(activeSeason);
      if (seasonData?.title) setSeasonTitle(seasonData.title);

      // Consulta direta dos dados da sala da Arena
      const { data: roomData, error: roomErr } = await supabase
        .from("game_rooms")
        .select("id, pin, title, status, current_question_index, question_started_at, quiz_id, created_at")
        .eq("pin", pin)
        .maybeSingle();

      if (roomErr) {
        console.error("[Arena] Erro ao buscar sala:", roomErr.message);
        setQueryError(roomErr.message);
        setLoading(false);
        return;
      }

      if (!roomData) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setRoom(roomData);
      setCurrentQuestionIndex(roomData.current_question_index || 0);

      // Consulta o acumulado mensal prévio do competidor na Arena
      if (user?.id) {
        const { data: userMonthly } = await supabase
          .from("arena_monthly_rankings")
          .select("monthly_score")
          .eq("season_code", activeSeason)
          .eq("clerk_id", user.id)
          .maybeSingle();

        if (userMonthly) {
          setMonthlyAccumulatedScore(userMonthly.monthly_score || 0);
        }
      }

      // Carrega as questões pedagógicas do quiz
      if (roomData.quiz_id) {
        const { data: questionsData } = await supabase
          .from("questions")
          .select("id, question_text, options, correct_option, time_seconds, question_order, image_url")
          .eq("quiz_id", roomData.quiz_id)
          .order("question_order", { ascending: true });

        setQuestions(questionsData || []);
      }

      // Carrega competidores cadastrados na partida
      const { data: playersData } = await supabase
        .from("game_players")
        .select("id, player_name, score, clerk_id")
        .eq("room_id", roomData.id)
        .order("score", { ascending: false });

      setPlayers(playersData || []);

      // Sincroniza o competidor na partida atual
      await sincronizarCompetidor(roomData.id, playersData || []);
    } catch (err) {
      console.error("[Arena] Exceção:", err);
      setQueryError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sincronizarCompetidor = async (roomId, listaJogadores) => {
    const sessionKey = `arena_player_session_${pin}`;
    const savedPlayerId = sessionStorage.getItem(sessionKey);

    let playerEncontrado = null;

    if (savedPlayerId) {
      playerEncontrado = listaJogadores.find((p) => p.id === savedPlayerId);
    }

    if (!playerEncontrado && user?.id) {
      playerEncontrado = listaJogadores.find((p) => p.clerk_id === user.id);
    }

    if (playerEncontrado) {
      setCurrentPlayerId(playerEncontrado.id);
      setSessionScore(playerEncontrado.score || 0);
      sessionStorage.setItem(sessionKey, playerEncontrado.id);
    } else {
      const nomeFinal =
        user?.firstName ||
        user?.fullName ||
        `Competidor_${Math.floor(100 + Math.random() * 900)}`;

      const { data: novoPlayer, error: insErr } = await supabase
        .from("game_players")
        .insert({
          room_id: roomId,
          player_name: nomeFinal,
          clerk_id: user?.id || null,
          score: 0,
        })
        .select()
        .single();

      if (!insErr && novoPlayer) {
        setCurrentPlayerId(novoPlayer.id);
        setSessionScore(0);
        sessionStorage.setItem(sessionKey, novoPlayer.id);
        setPlayers((prev) => [...prev, novoPlayer]);
      }
    }
  };

  useEffect(() => {
    carregarDadosArena();

    if (!pin) return;

    // Sincronização em tempo real via canais Postgres
    const channel = supabase
      .channel(`arena-live-interactive-${pin}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `pin=eq.${pin}` },
        async (payload) => {
          setRoom(payload.new);
          setCurrentQuestionIndex(payload.new.current_question_index || 0);
          setSelectedOption(null);
          setHasAnswered(false);
          setAnswerFeedback(null);
          setSecondsRemaining(60);

          // Ao término da batalha, recarrega a lista consolidada com os scores finais
          if (payload.new.status === "finished") {
            const { data: freshPlayers } = await supabase
              .from("game_players")
              .select("id, player_name, score, clerk_id")
              .eq("room_id", payload.new.id)
              .order("score", { ascending: false });

            if (freshPlayers && freshPlayers.length > 0) {
              setPlayers(freshPlayers);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players" },
        () => {
          if (room?.id) {
            supabase
              .from("game_players")
              .select("id, player_name, score, clerk_id")
              .eq("room_id", room.id)
              .order("score", { ascending: false })
              .then(({ data }) => {
                if (data) {
                  setPlayers(data);
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin, user?.id, room?.id]);

  // 2. Temporizador decrescente de 60 segundos por questão
  useEffect(() => {
    if (room?.status !== "in_progress") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          avancarPerguntaAutomaticamente();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.status, currentQuestionIndex, questions.length]);

  // 3. Submissão interativa com incremento isolado na temporada mensal
  const handleSelectOption = async (optionIndex) => {
    if (hasAnswered || room?.status !== "in_progress") return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    setSelectedOption(optionIndex);
    setHasAnswered(true);

    const isCorrect = Number(optionIndex) === Number(currentQ.correct_option);
    // Pontuação base de 500 pontos + bonificação de velocidade
    const points = isCorrect ? 500 + Math.max(0, secondsRemaining) * 10 : 0;

    setAnswerFeedback({
      isCorrect,
      pointsEarned: points,
    });

    if (points > 0) {
      // 1. Atualização imediata do placar da batalha atual
      const newSessionTotal = sessionScore + points;
      setSessionScore(newSessionTotal);

      // 2. Atualiza a lista de competidores localmente
      setPlayers((prev) => {
        const updated = prev.map((p) =>
          p.id === currentPlayerId || (user?.id && p.clerk_id === user.id)
            ? { ...p, score: newSessionTotal }
            : p
        );
        return updated.sort((a, b) => (b.score || 0) - (a.score || 0));
      });

      // 3. Atualiza o score na tabela transitória game_players
      if (currentPlayerId) {
        await supabase
          .from("game_players")
          .update({ score: newSessionTotal })
          .eq("id", currentPlayerId);
      } else if (user?.id && room?.id) {
        await supabase
          .from("game_players")
          .update({ score: newSessionTotal })
          .eq("room_id", room.id)
          .eq("clerk_id", user.id);
      }

      // 4. Atualiza o acumulado mensal perpétuo e exclusivo da Arena
      if (user?.id) {
        const playerName = user.firstName || user.fullName || "Competidor";
        const novoTotalMensal = monthlyAccumulatedScore + points;
        setMonthlyAccumulatedScore(novoTotalMensal);

        await supabase.from("arena_monthly_rankings").upsert(
          {
            season_code: currentSeasonCode,
            clerk_id: user.id,
            player_name: playerName,
            monthly_score: novoTotalMensal,
            last_battle_at: new Date().toISOString(),
          },
          { onConflict: "season_code, clerk_id" }
        );
      }
    }
  };

  // 4. Avanço automatizado entre perguntas ou encerramento no pódio com sincronização forçada
  const avancarPerguntaAutomaticamente = async () => {
    if (!room || questions.length === 0) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption(null);
      setHasAnswered(false);
      setAnswerFeedback(null);
      setSecondsRemaining(60);

      await supabase
        .from("game_rooms")
        .update({
          current_question_index: nextIndex,
          question_started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
    } else {
      // Garante que o score final do jogador esteja gravado no banco antes de fechar a sala
      if (currentPlayerId && sessionScore > 0) {
        await supabase
          .from("game_players")
          .update({ score: sessionScore })
          .eq("id", currentPlayerId);
      }

      // Conclui a batalha
      await supabase
        .from("game_rooms")
        .update({ status: "finished" })
        .eq("id", room.id);

      // Busca a classificação final real e ordenada dos competidores
      const { data: finalPlayers } = await supabase
        .from("game_players")
        .select("id, player_name, score, clerk_id")
        .eq("room_id", room.id)
        .order("score", { ascending: false });

      if (finalPlayers && finalPlayers.length > 0) {
        // Se o score do competidor local na resposta do banco ainda não refletir a sessão, aplica o valor atual
        const playersNormalizados = finalPlayers.map((p) => {
          if (p.id === currentPlayerId || (user?.id && p.clerk_id === user.id)) {
            return { ...p, score: Math.max(p.score || 0, sessionScore) };
          }
          return p;
        });

        setPlayers(playersNormalizados.sort((a, b) => (b.score || 0) - (a.score || 0)));
      } else {
        // Fallback imediato: garante que os pontos da sessão do usuário logado apareçam no 1º lugar
        setPlayers([
          {
            id: currentPlayerId || "self",
            player_name: user?.firstName || user?.fullName || "Você",
            score: sessionScore,
          },
        ]);
      }

      setRoom((prev) => ({ ...prev, status: "finished" }));
      dispararConfetti();
    }
  };

  const dispararConfetti = () => {
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { y: 0.6 },
    });
  };

  useEffect(() => {
    if (room?.status === "finished") {
      dispararConfetti();
      // Força a atualização dos competidores caso a tela abra diretamente no status finished
      if (room?.id) {
        supabase
          .from("game_players")
          .select("id, player_name, score, clerk_id")
          .eq("room_id", room.id)
          .order("score", { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              const normalizados = data.map((p) => {
                if (p.id === currentPlayerId || (user?.id && p.clerk_id === user.id)) {
                  return { ...p, score: Math.max(p.score || 0, sessionScore) };
                }
                return p;
              });
              setPlayers(normalizados.sort((a, b) => (b.score || 0) - (a.score || 0)));
            }
          });
      }
    }
  }, [room?.status, room?.id, sessionScore, currentPlayerId, user?.id]);

  // Estilos de tema dinâmicos
  const themeClasses = isDarkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-100 text-slate-900";

  const cardThemeClasses = isDarkMode
    ? "bg-slate-900/90 border-slate-800 shadow-slate-950/50"
    : "bg-white border-slate-200 shadow-slate-300/40";

  const subcardThemeClasses = isDarkMode
    ? "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-purple-500/60 hover:bg-slate-900"
    : "bg-slate-50 border-slate-200 text-slate-800 hover:border-purple-500/60 hover:bg-slate-100";

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center space-y-4 ${themeClasses}`}>
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold opacity-75">Carregando Batalha da Arena...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${themeClasses}`}>
        <span className="text-6xl mb-4">🏟️</span>
        <h1 className="text-2xl font-black">Sala de Batalha não encontrada</h1>
        <p className="text-sm opacity-70 mt-2 max-w-md">
          O PIN informado ({pin}) não corresponde a uma sala da Arena ativa.
        </p>
        {queryError && (
          <p className="text-rose-500 font-mono text-xs mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            {queryError}
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => carregarDadosArena()}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Identificação e cálculo fiel dos 3 colocados do pódio
  // Garante que o competidor autenticado com pontuação na sessão ocupe o topo
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const campeaoScore = Math.max(
    sortedPlayers[0]?.score || 0,
    sessionScore
  );

  const top1 = {
    player_name: sortedPlayers[0]?.player_name || user?.firstName || user?.fullName || "Você",
    score: campeaoScore,
  };

  const top2 = sortedPlayers[1] || null;
  const top3 = sortedPlayers[2] || null;

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between p-4 md:p-8 transition-colors duration-300 ${themeClasses}`}>
      {/* Barra Superior da Arena com Indicadores Mensais */}
      <header className={`max-w-6xl w-full mx-auto flex items-center justify-between border-b pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚔️</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                ARENA OFICIAL
              </span>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                🏆 {seasonTitle} ({currentSeasonCode})
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-extrabold truncate max-w-md mt-0.5">
              {room.title || "Batalha da Arena"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Comutador de Tema (Claro / Escuro) */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              isDarkMode
                ? "bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
            }`}
            title="Alternar esquema de cores da janela"
          >
            <span>{isDarkMode ? "☀️" : "🌙"}</span>
            <span className="hidden sm:inline">{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
          </button>

          {/* Placar da Batalha Atual */}
          <div className="bg-purple-600/15 border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-center shadow-sm">
            <span className="text-[9px] font-bold text-purple-400 uppercase block">NESTA BATALHA</span>
            <span className="text-base font-mono font-black text-purple-400">
              +{sessionScore} <span className="text-[10px] opacity-70">pts</span>
            </span>
          </div>

          {/* Acumulado Mensal Exclusivo da Temporada */}
          <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-center shadow-sm">
            <span className="text-[9px] font-bold text-amber-500 uppercase block">RANKING DO MÊS</span>
            <span className="text-base font-mono font-black text-amber-500">
              {monthlyAccumulatedScore} <span className="text-[10px] opacity-70">pts</span>
            </span>
          </div>

          {/* Código PIN */}
          <div className={`px-3.5 py-1.5 rounded-xl text-center border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-bold opacity-60 uppercase block">PIN</span>
            <span className="text-base font-mono font-black text-amber-500 tracking-wider">{room.pin}</span>
          </div>
        </div>
      </header>

      {/* 1. ESTADO: SALA DE ESPERA */}
      {room.status === "waiting" && (
        <main className="max-w-3xl w-full mx-auto my-auto text-center space-y-6 py-12">
          <div className="w-24 h-24 mx-auto bg-amber-500/10 border-2 border-amber-500/30 rounded-full flex items-center justify-center text-4xl shadow-xl shadow-amber-500/10 animate-pulse">
            ⏳
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black">A Batalha vai Começar!</h2>
            <p className="text-sm opacity-75 max-w-md mx-auto">
              Seus pontos nesta rodada somarão diretamente ao seu ranking do mês na Arena. Os melhores colocados do mês receberão recompensas de acesso exclusivo!
            </p>
          </div>

          {/* Competidores Conectados */}
          <div className={`border p-6 rounded-3xl max-w-lg mx-auto shadow-xl ${cardThemeClasses}`}>
            <span className="text-xs font-bold opacity-60 uppercase block mb-3">
              Competidores Registrados na Sala ({players.length})
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {players.length === 0 ? (
                <span className="text-xs opacity-50 italic">Aguardando competidores entrarem com o PIN...</span>
              ) : (
                players.map((p) => (
                  <span
                    key={p.id}
                    className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-xs font-bold text-purple-400 shadow-sm"
                  >
                    🛡️ {p.player_name} ({p.score || 0} pts)
                  </span>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase
                .from("game_rooms")
                .update({
                  status: "in_progress",
                  current_question_index: 0,
                  question_started_at: new Date().toISOString(),
                })
                .eq("id", room.id);

              setRoom((prev) => ({ ...prev, status: "in_progress" }));
            }}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-orange-500/25 text-sm hover:scale-105 transition cursor-pointer"
          >
            🚀 Iniciar Batalha Agora
          </button>
        </main>
      )}

      {/* 2. ESTADO: BATALHA EM ANDAMENTO */}
      {room.status === "in_progress" && (
        <main className="max-w-4xl w-full mx-auto my-auto space-y-6 py-6">
          <div className={`flex items-center justify-between gap-4 border p-4 rounded-2xl ${cardThemeClasses}`}>
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">
              Questão {currentQuestionIndex + 1} de {questions.length || 1}
            </span>

            {/* Temporizador Regressivo de 1 Minuto */}
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-70">Tempo restante:</span>
              <span
                className={`text-lg font-mono font-black px-3 py-1 rounded-xl border ${
                  secondsRemaining <= 10
                    ? "bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                }`}
              >
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
            </div>
          </div>

          {currentQuestion ? (
            <div className={`border p-8 rounded-3xl shadow-2xl space-y-6 ${cardThemeClasses}`}>
              <h2 className="text-xl md:text-2xl font-black text-center leading-snug">
                {currentQuestion.question_text}
              </h2>

              {/* Imagem Ilustrativa com tratamento defensivo */}
              {currentQuestion.image_url && (
                <div className={`max-w-xs mx-auto overflow-hidden rounded-2xl border ${isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-100"}`}>
                  <img
                    src={currentQuestion.image_url}
                    alt="Ilustração da Questão"
                    className="w-full h-48 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Grid Interativo de Alternativas Clicáveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {Array.isArray(currentQuestion.options) &&
                  currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    let dynamicStyle = subcardThemeClasses;

                    if (hasAnswered) {
                      if (isSelected) {
                        dynamicStyle = answerFeedback?.isCorrect
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/30 cursor-default"
                          : "border-rose-500 bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/30 cursor-default";
                      } else {
                        dynamicStyle = "border-slate-700/40 opacity-40 cursor-default";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        disabled={hasAnswered}
                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 group cursor-pointer ${dynamicStyle}`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 transition ${
                            isSelected
                              ? answerFeedback?.isCorrect
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-rose-500 text-white"
                              : "bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm font-semibold flex-1 leading-snug">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Feedback Visual Imediato */}
              {hasAnswered && answerFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-center text-xs font-bold border animate-in fade-in zoom-in-95 duration-200 ${
                    answerFeedback.isCorrect
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {answerFeedback.isCorrect ? (
                    <span>
                      🎉 Resposta Correta! +{answerFeedback.pointsEarned} pontos adicionados ao seu ranking mensal da Arena ({sessionScore} pts nesta batalha).
                    </span>
                  ) : (
                    <span>
                      ❌ Resposta Incorreta. Concentre-se para pontuar na próxima pergunta!
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={`border p-8 rounded-3xl text-center space-y-3 ${cardThemeClasses}`}>
              <p className="text-sm opacity-60">Carregando conteúdo da questão...</p>
            </div>
          )}
        </main>
      )}

      {/* 3. ESTADO: PÓDIO DOS VENCEDORES COM PONTUAÇÃO REAL CONSOLIDADA */}
      {room.status === "finished" && (
        <main className="max-w-4xl w-full mx-auto my-auto text-center space-y-8 py-10">
          <div className="space-y-2">
            <span className="text-6xl block">🏆</span>
            <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Grande Pódio da Batalha
            </h2>
            <p className="text-sm opacity-75">
              Pontuação homologada no ranking da {seasonTitle}!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 items-end pt-8 max-w-2xl mx-auto">
            {/* 2º Lugar */}
            <div className={`border rounded-2xl p-4 flex flex-col items-center space-y-2 h-48 justify-end shadow-lg ${cardThemeClasses}`}>
              <span className="text-2xl">🥈</span>
              <p className="font-extrabold text-xs md:text-sm truncate w-full text-center">
                {top2?.player_name || "Vago"}
              </p>
              <span className="text-xs font-bold text-amber-500">
                {top2 && top2.score !== undefined ? `${top2.score} pts` : "—"}
              </span>
              <div className={`w-full py-2 rounded-xl font-black text-xs ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>
                2º LUGAR
              </div>
            </div>

            {/* 1º Lugar (Campeão Oficial) - Exibe pontuação real consolidada */}
            <div className="bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-2 border-amber-400 rounded-3xl p-5 flex flex-col items-center space-y-3 h-64 justify-end shadow-2xl shadow-amber-400/20">
              <span className="text-4xl animate-bounce">👑</span>
              <p className="font-black text-sm md:text-base text-amber-500 truncate w-full text-center">
                {top1.player_name}
              </p>
              <span className="text-sm font-black bg-amber-500/20 px-3.5 py-1 rounded-full border border-amber-500/30 text-amber-400">
                {top1.score} pts
              </span>
              <div className="w-full bg-amber-400 py-3 rounded-2xl font-black text-sm text-slate-950 shadow-lg">
                1º LUGAR
              </div>
            </div>

            {/* 3º Lugar */}
            <div className={`border rounded-2xl p-4 flex flex-col items-center space-y-2 h-40 justify-end shadow-lg ${cardThemeClasses}`}>
              <span className="text-2xl">🥉</span>
              <p className="font-extrabold text-xs md:text-sm truncate w-full text-center">
                {top3?.player_name || "Vago"}
              </p>
              <span className="text-xs font-bold text-amber-500">
                {top3 && top3.score !== undefined ? `${top3.score} pts` : "—"}
              </span>
              <div className={`w-full py-1.5 rounded-xl font-black text-xs ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"}`}>
                3º LUGAR
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition shadow-lg border border-slate-700 cursor-pointer"
            >
              <span>🏠</span> Concluir Batalha e Voltar ao Início
            </Link>
          </div>
        </main>
      )}

      {/* Rodapé Institucional da Arena */}
      <footer className={`max-w-6xl w-full mx-auto text-center border-t pt-4 ${isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
        <p className="text-[11px] font-medium">
          MenteAfiada © 2026 • Sistema de Competição Pedagógica e Auditoria Educacional
        </p>
      </footer>
    </div>
  );
}