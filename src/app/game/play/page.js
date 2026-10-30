// src/app/game/play/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";
import ArenaChat from "@/app/components/ArenaChat";
import { sounds } from "@/lib/soundEffects";

export const dynamic = "force-dynamic";

/**
 * Interface interativa do aluno com tratamento defensivo de imagens e
 * transição instantânea para o pódio em tempo real.
 */
function GamePlayContent() {
  const [wasKicked, setWasKicked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { t } = useLanguage();

  const urlPin = searchParams.get("pin") || "";
  const urlName = searchParams.get("name") || "";

  const [pin, setPin] = useState(urlPin);
  const [playerName, setPlayerName] = useState(urlName || user?.firstName || "");
  const [userRole, setUserRole] = useState("participant");
  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scoreGained, setScoreGained] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Estados de Imagem
  const [currentImgSrc, setCurrentImgSrc] = useState("");
  const [imgLoading, setImgLoading] = useState(true);
  const [imgHasFailed, setImgHasFailed] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Estados do Pódio Final
  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

  useEffect(() => {
    if (urlPin) setPin(urlPin);
    if (urlName) setPlayerName(urlName);
  }, [urlPin, urlName]);

  useEffect(() => {
    const savedSfx = localStorage.getItem("sfx_enabled");
    if (savedSfx !== null) {
      const isEnabled = savedSfx !== "false";
      setSoundEnabled(isEnabled);
      sounds.setEnabled(isEnabled);
    }
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sounds.setEnabled(nextState);
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("clerk_id", user.id)
          .single();
        if (data?.role) {
          setUserRole(data.role);
        }
      }
    };
    fetchUserRole();
  }, [user]);

  // Carrega a classificação oficial quando a partida é finalizada
  const loadFinalLeaderboard = async (sessionId) => {
    const { data } = await supabase
      .from("game_players")
      .select("id, player_name, score")
      .eq("session_id", sessionId)
      .order("score", { ascending: false });

    if (data && data.length > 0) {
      setAllPlayers(data);
    }
  };

  // Efeitos ao finalizar: Fanfarra + Pódio progressivo + Confetes
  useEffect(() => {
    if (session?.status === "FINALIZADO") {
      sounds.playVictory();
      if (session?.id) {
        loadFinalLeaderboard(session.id);
      }
      setTimeout(() => setShowPodium3(true), 800);
      setTimeout(() => setShowPodium2(true), 2200);
      setTimeout(() => {
        setShowPodium1(true);
        dispararConfetes();
      }, 3800);
    }
  }, [session?.status]);

  const dispararConfetes = () => {
    const duracao = 15 * 1000;
    const fim = Date.now() + duracao;

    const interval = setInterval(() => {
      const tempoRestante = fim - Date.now();
      if (tempoRestante <= 0) {
        return clearInterval(interval);
      }

      confetti({ particleCount: 25, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 25, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    }, 250);
  };

  const fetchSessionQuestions = async (quizId) => {
    if (!quizId) return [];

    let { data: qData, error: qErr } = await supabase
      .from("questions")
      .select("id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order")
      .eq("quiz_id", quizId)
      .order("question_order", { ascending: true });

    if (qErr || !qData || qData.length === 0) {
      const { data: pubData } = await supabase
        .from("public_quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });
      qData = pubData;
    }

    return qData || [];
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!pin.trim() || !playerName.trim()) {
      setErrorMsg(t("fill_name") || "Preencha o seu nome para continuar.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data: sessionData, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("pin", pin.trim())
      .single();

    if (sessionError || !sessionData) {
      setErrorMsg(t("invalid_pin") || "Código PIN inválido ou sala encerrada.");
      setLoading(false);
      return;
    }

    if (sessionData.status === "FINALIZADO") {
      setErrorMsg("Esta sala já foi encerrada.");
      setLoading(false);
      return;
    }

    setSession(sessionData);
    setTimeLeft(sessionData.time_left || 15);

    if (sessionData.quiz_id) {
      const loadedQuestions = await fetchSessionQuestions(sessionData.quiz_id);
      setQuestions(loadedQuestions);
    } else {
      setQuestions([
        {
          id: "00000000-0000-0000-0000-000000000001",
          question_text: "Qual é a capital do Brasil?",
          image_url: null,
          options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
          time_seconds: 15,
          correct_option: 2,
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          question_text: "Quanto é 2 + 2 x 2?",
          image_url: null,
          options: ["8", "6", "4", "10"],
          time_seconds: 15,
          correct_option: 1,
        },
      ]);
    }

    const { data: playerData, error: playerError } = await supabase
      .from("game_players")
      .insert({
        session_id: sessionData.id,
        player_name: playerName.trim(),
        clerk_id: user?.id || null,
      })
      .select()
      .single();

    if (playerError) {
      setErrorMsg(t("join_error") || "Erro ao entrar na sala. Tente novamente.");
      setLoading(false);
      return;
    }

    setPlayer(playerData);
    setLoading(false);

    subscribeToSession(sessionData.id, playerData.id);
  };

  const subscribeToSession = (sessionId, currentPlayerId) => {
    // 1. Escuta mudanças de status na sessão (inclusive FINALIZADO)
    supabase
      .channel(`play-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          const updatedSession = payload.new;

          // Se a partida foi finalizada pelo professor
          if (updatedSession.status === "FINALIZADO") {
            loadFinalLeaderboard(sessionId);
          }

          if (updatedSession.quiz_id && updatedSession.quiz_id !== session?.quiz_id) {
            const freshQuestions = await fetchSessionQuestions(updatedSession.quiz_id);
            setQuestions(freshQuestions);

            setShowPodium1(false);
            setShowPodium2(false);
            setShowPodium3(false);
            setStreak(0);
            setStreakBonus(0);
          }

          setSession((prevSession) => {
            if (
              prevSession &&
              (prevSession.current_question_index !== updatedSession.current_question_index ||
                prevSession.status !== updatedSession.status ||
                prevSession.quiz_id !== updatedSession.quiz_id)
            ) {
              setHasAnswered(false);
              setSelectedOption(null);
              setScoreGained(0);
            }
            return updatedSession;
          });

          setTimeLeft(updatedSession.time_left || 15);
        }
      )
      .subscribe();

    // 2. Escuta eventos na lista de alunos
    supabase
      .channel(`play-players-events-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId === currentPlayerId) {
              setWasKicked(true);
              setSession(null);
              setPlayer(null);
              setHasAnswered(false);
              return;
            }
          }

          const { data } = await supabase
            .from("game_players")
            .select("id, player_name, score")
            .eq("session_id", sessionId)
            .order("score", { ascending: false });

          if (data) {
            setAllPlayers(data);
            const me = data.find((p) => p.id === currentPlayerId);
            if (me) {
              setPlayer((prev) => (prev ? { ...prev, score: me.score } : prev));
            }
          }
        }
      )
      .subscribe();
  };

  // Cronômetro regressivo
  useEffect(() => {
    let interval = null;
    if (session?.time_state === "RODANDO" && timeLeft > 0 && !hasAnswered) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 5 && nextVal > 0) {
            sounds.playCountdown();
          }
          return nextVal;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session?.time_state, timeLeft, hasAnswered, soundEnabled]);

  const currentQuestion = questions[session?.current_question_index || 0];

  // Gestor de Carregamento de Imagem da Questão
  useEffect(() => {
    if (currentQuestion?.image_url) {
      setCurrentImgSrc(currentQuestion.image_url);
      setImgLoading(true);
      setImgHasFailed(false);
    } else {
      setCurrentImgSrc("");
      setImgLoading(false);
      setImgHasFailed(false);
    }
  }, [currentQuestion?.id, currentQuestion?.image_url, session?.current_question_index]);

  // Envio de Resposta com Validação Segura
  const handleSelectOption = async (optionIdx) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    sounds.playClick();
    const cleanOptionIdx = Number(optionIdx);
    setSelectedOption(cleanOptionIdx);
    setHasAnswered(true);

    const questionIndex = session.current_question_index || 0;
    const currentQ = questions[questionIndex];

    try {
      let isCorrect = false;
      let totalGained = 0;

      const { data: rpcData, error: rpcError } = await supabase.rpc("submit_player_answer", {
        p_session_id: session.id,
        p_player_id: player.id,
        p_question_id: currentQ?.id || null,
        p_selected_option: cleanOptionIdx,
        p_time_left: Number(timeLeft) || 0,
      });

      if (!rpcError && rpcData?.success) {
        isCorrect = Boolean(rpcData.is_correct);
        totalGained = Number(rpcData.points_earned) || 0;
      } else {
        if (typeof currentQ?.correct_option === "number") {
          isCorrect = currentQ.correct_option === cleanOptionIdx;
        }

        if (isCorrect) {
          const basePoints = 500;
          const speedBonus = Math.max(0, (timeLeft || 0) * 25);
          totalGained = basePoints + speedBonus;

          await supabase
            .from("game_players")
            .update({ score: (player?.score || 0) + totalGained })
            .eq("id", player.id);
        }

        await supabase
          .from("player_answers")
          .insert({
            session_id: session.id,
            player_id: player.id,
            question_index: questionIndex,
            selected_option: cleanOptionIdx,
            is_correct: isCorrect,
            time_left: Number(timeLeft) || 0,
          })
          .catch(() => {});
      }

      setScoreGained(totalGained);

      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);

        let bonus = 0;
        if (newStreak === 2) bonus = 100;
        else if (newStreak === 3) bonus = 200;
        else if (newStreak >= 4) bonus = 300;
        setStreakBonus(bonus);

        if (newStreak >= 2) {
          sounds.playStreak();
        } else {
          sounds.playCorrect();
        }

        setPlayer((prev) => ({
          ...prev,
          score: (prev?.score || 0) + totalGained,
        }));
      } else {
        setStreak(0);
        setStreakBonus(0);
        sounds.playWrong();
      }
    } catch (err) {
      console.error("[MenteAfiada] Erro ao registrar resposta do aluno:", err);
    }
  };

  const rankedPlayers = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Remoção (Kick)
  if (wasKicked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[var(--card-bg)] border border-rose-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
            🚫
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[var(--foreground)]">Acesso Removido</h2>
            <p className="text-xs text-[var(--foreground)] opacity-70 leading-relaxed">
              Você foi removido desta sala pelo anfitrião da partida.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setWasKicked(false);
                router.push("/arena");
              }}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg"
            >
              Ir para a Arena Pública ⚔️
            </button>

            <button
              onClick={() => {
                setWasKicked(false);
                router.push("/");
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Voltar ao Início 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Partida Ativa / Pódio
  if (player && session) {
    return (
      <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] flex flex-col transition-colors duration-300">
        <div className="bg-slate-900 border-b border-slate-800 transition-none">
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
                <button
                  onClick={toggleSound}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                  title="Ativar/Desativar Som"
                >
                  {soundEnabled ? "🔊" : "🔇"}
                </button>
                <LanguageSelector />
                {user && <UserMenu userName={user.firstName || "Aluno"} userRole={userRole} />}
              </nav>
            </div>
          </header>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-2xl space-y-6 transition-colors duration-300">
            {/* Placar Superior do Aluno */}
            <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
              <div>
                <span className="text-xs text-[var(--foreground)] opacity-70">{t("player") || "Jogador"}</span>
                <p className="font-bold text-emerald-500 flex items-center gap-1.5">
                  {player.player_name}
                  {streak >= 2 && (
                    <span className="bg-amber-500/20 text-amber-500 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                      🔥 {streak}x Streak
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--foreground)] opacity-70">{t("points") || "Pontos"}</span>
                <p className="font-mono font-bold text-amber-500">{player.score || 0} pts</p>
              </div>
            </div>

            {/* Sala de Espera */}
            {session.status === "AGUARDANDO" && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-block w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  {t("waiting_room_title") || "Você está na sala de espera!"}
                </h3>
                <p className="text-xs text-[var(--foreground)] opacity-70">
                  {t("waiting_room_desc") || "Aguarde o professor clicar em 'Iniciar Partida'..."}
                </p>
              </div>
            )}

            {/* Questão Ativa com Fallback Inteligente de Imagem */}
            {session.status === "EM_ANDAMENTO" && currentQuestion && (
              <div className="space-y-5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--foreground)] opacity-70">
                    {t("question") || "Questão"} {(session.current_question_index || 0) + 1} {t("of") || "de"} {questions.length}
                  </span>
                  <div
                    className={`flex items-center gap-1.5 bg-[var(--background)] border border-[var(--card-border)] px-3 py-1 rounded-full shadow-sm transition-all ${
                      timeLeft <= 5 ? "border-rose-500 scale-105 animate-pulse" : ""
                    }`}
                  >
                    <span>⏱️</span>
                    <span className={`font-mono font-extrabold text-sm ${timeLeft <= 5 ? "text-rose-500" : "text-amber-500"}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>

                {/* Exibição Ilustrativa com Proxy Anti-Bloqueio CORS */}
                {currentImgSrc && !imgHasFailed && (
                  <div className="relative w-full flex flex-col items-center justify-center bg-slate-900/80 p-2.5 rounded-2xl border border-[var(--card-border)] min-h-[140px] overflow-hidden group">
                    {imgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
                        <div className="w-7 h-7 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    <img
                      src={currentImgSrc}
                      alt="Ilustração da Questão"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onLoad={() => setImgLoading(false)}
                      onError={() => {
                        if (!currentImgSrc.includes("wsrv.nl")) {
                          setCurrentImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(currentQuestion.image_url)}&w=800&output=webp`);
                        } else {
                          setImgLoading(false);
                          setImgHasFailed(true);
                        }
                      }}
                      className={`max-h-52 w-auto max-w-full object-contain rounded-xl shadow-md transition-all duration-300 cursor-zoom-in ${
                        imgLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                      }`}
                      onClick={() => setZoomedImage(currentImgSrc)}
                    />

                    {!imgLoading && (
                      <span className="text-[10px] text-slate-400 mt-1 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        🔍 Toque na imagem para ampliar
                      </span>
                    )}
                  </div>
                )}

                <h2 className="text-lg font-bold text-[var(--foreground)] text-center min-h-[44px] flex items-center justify-center leading-snug">
                  {currentQuestion.question_text}
                </h2>

                {session.time_state === "PAUSADO" && !hasAnswered && (
                  <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] text-center rounded-2xl shadow-sm">
                    <p className="text-sm font-semibold text-amber-500">
                      {t("teacher_paused") || "⏳ O professor ainda não liberou o tempo."}
                    </p>
                    <p className="text-xs text-[var(--foreground)] opacity-70 mt-1">
                      {t("prepare_options") || "Prepare-se! As opções serão ativadas assim que der Play."}
                    </p>
                  </div>
                )}

                {/* Alternativas */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options.map((opt, i) => {
                    const colors = [
                      "bg-rose-600 hover:bg-rose-700",
                      "bg-blue-600 hover:bg-blue-700",
                      "bg-amber-600 hover:bg-amber-700",
                      "bg-emerald-600 hover:bg-emerald-700",
                    ];
                    const isSelected = selectedOption === i;

                    return (
                      <button
                        key={i}
                        disabled={hasAnswered || session.time_state !== "RODANDO"}
                        onClick={() => handleSelectOption(i)}
                        className={`w-full p-4 font-bold rounded-2xl text-left text-sm transition-all flex items-center justify-between cursor-pointer text-white shadow-md ${
                          colors[i % 4]
                        } ${
                          hasAnswered || session.time_state !== "RODANDO" ? "opacity-60 cursor-not-allowed" : "active:scale-95"
                        } ${isSelected ? "ring-4 ring-white scale-[1.02]" : ""}`}
                      >
                        <span>
                          {String.fromCharCode(65 + i)}. {opt}
                        </span>
                        {isSelected && <span>✔️</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Imediato */}
                {hasAnswered && (
                  <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] text-center space-y-1 animate-in zoom-in-95 duration-200 shadow-sm">
                    <p className="text-emerald-500 font-bold text-sm">
                      {t("answer_registered") || "Resposta Registada!"}
                    </p>
                    {scoreGained > 0 ? (
                      <div>
                        <p className="text-xs text-amber-500 font-semibold">
                          🎉 {t("correct") || "Correto!"} +{scoreGained} pts
                        </p>
                        {streakBonus > 0 && (
                          <p className="text-[11px] text-amber-500 font-bold mt-1 animate-bounce">
                            🔥 {t("streak_bonus") || "Bónus de Streak"} (+{streakBonus} pts)!
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-500 font-semibold">
                        ❌ {t("incorrect") || "Incorreto! Streak resetado."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PÓDIO FINAL NO PAINEL DO ALUNO */}
            {session.status === "FINALIZADO" && (
              <div className="text-center py-6 space-y-6">
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
                  {t("game_over") || "🏆 Fim de Jogo!"}
                </h3>
                
                <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] shadow-sm">
                  <p className="text-xs text-[var(--foreground)] opacity-70 font-bold">
                    {t("final_score") || "Sua Pontuação Final:"}
                  </p>
                  <p className="text-3xl font-black text-emerald-500 mt-1">{player.score || 0} pts</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[var(--foreground)] opacity-70 font-bold uppercase tracking-widest text-left mb-3">
                    {t("top_3") || "Top 3 Classificados"}
                  </p>
                  {rankedPlayers.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm transition-all duration-500 ${
                        idx === 2 && !showPodium3 ? "opacity-0 translate-y-2" : ""
                      } ${idx === 1 && !showPodium2 ? "opacity-0 translate-y-2" : ""} ${
                        idx === 0 && !showPodium1 ? "opacity-0 scale-95" : "scale-100 opacity-100"
                      }`}
                    >
                      <span className="text-[var(--foreground)] font-bold">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} {p.player_name}
                      </span>
                      <span className="font-mono text-emerald-500 font-bold">{p.score || 0} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Zoom da Imagem */}
        {zoomedImage && (
          <div
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] cursor-zoom-out animate-in fade-in duration-200"
          >
            <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center">
              <img
                src={zoomedImage}
                alt="Imagem Ampliada"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-700"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute -top-3 -right-3 bg-slate-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold border border-slate-600 hover:bg-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Chat da Sala */}
        <ArenaChat
          sessionId={session.id}
          playerName={player.player_name}
          userClerkId={user?.id}
        />
      </div>
    );
  }

  // Formulário Inicial de Acesso por PIN
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col justify-between transition-colors duration-300">
      <div className="bg-slate-900 border-b border-slate-800 transition-none">
        <header className="py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
                <img src="/logo-dark.jpeg" alt="Logo MenteAfiada" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Mente<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Afiada</span>
              </span>
            </Link>

            <nav className="flex items-center gap-3">
              <button
                onClick={toggleSound}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                title="Ativar/Desativar Som"
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              <LanguageSelector />
              {user && <UserMenu userName={user.firstName || "Aluno"} userRole={userRole} />}
            </nav>
          </div>
        </header>
      </div>

      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex items-center justify-center">
        <div className="bg-[var(--card-bg)] w-full rounded-3xl p-8 shadow-2xl border border-[var(--card-border)] text-center transition-colors duration-300 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              {t("enter_quiz") || "Entrar no Quiz"}
            </h2>
            <p className="text-xs text-[var(--foreground)] opacity-70 font-semibold">
              {urlPin
                ? `${t("connecting_pin") || "Conectando à Sala PIN"} ${urlPin}`
                : t("insert_pin") || "Insira o código PIN fornecido pelo professor"}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold shadow-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoinSession} className="space-y-4">
            {!urlPin && (
              <div>
                <input
                  type="text"
                  placeholder={t("pin_placeholder") || "Código PIN da Sala"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] text-amber-500 font-mono font-bold text-center text-xl rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest shadow-sm"
                />
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder={t("name_placeholder") || "Seu Nome ou Apelido"}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] font-bold text-center text-md rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? t("connecting") || "A conectar..." : t("enter_room") || "Entrar na Sala 🚀"}
            </button>

            <p className="text-[10px] text-[var(--foreground)] opacity-50 text-center leading-normal pt-2">
              🔒 Ao entrar, você concorda com o uso do apelido apenas para a dinâmica da partida.
              Nenhum dado pessoal sensível é exposto publicamente.
            </p>
          </form>

          <div className="pt-4 border-t border-[var(--card-border)]">
            <Link
              href="/arena"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold transition"
            >
              <span>⚔️</span> Explorar Salas Abertas na Arena
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-[var(--foreground)] opacity-50 font-semibold bg-[var(--background)] border-t border-[var(--card-border)]">
        © {new Date().getFullYear()} MenteAfiada Realtime Quiz Engine.
      </footer>
    </div>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
          Carregando jogo...
        </div>
      }
    >
      <GamePlayContent />
    </Suspense>
  );
}