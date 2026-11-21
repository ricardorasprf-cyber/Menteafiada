/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/game/play/page.js
 * Objetivo: Interface interativa do aluno com correção de validação de resposta
 * e gravação garantida em player_answers e game_players:
 * 1. Múltipla Escolha (com normalização numérica de correct_option);
 * 2. Completar Lacunas ("___") com palavras sugeridas em sequência;
 * 3. Ordenação Sequencial / Procedimental;
 * 4. Verdadeiro ou Falso Relâmpago;
 * 5. Nuvem de Palavras e Termômetro de Compreensão ao vivo.
 * ============================================================================
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/app/components/ThemeProvider";
import confetti from "canvas-confetti";
import ArenaChat from "@/app/components/ArenaChat";
import LiveWordCloud from "@/app/components/LiveWordCloud";
import QuickPulseOverlay from "@/app/components/QuickPulseOverlay";
import FillBlanksPlayer from "@/app/components/FillBlanksPlayer";
import SequenceOrderingPlayer from "@/app/components/SequenceOrderingPlayer";
import { sounds } from "@/lib/soundEffects";

export const dynamic = "force-dynamic";

// Normalizador defensivo: garante leitura correta mesmo se options vier serializado como string
function parseQuestionOptions(rawOptions) {
  let parsed = rawOptions;
  if (typeof rawOptions === "string") {
    try {
      parsed = JSON.parse(rawOptions);
    } catch {
      parsed = [];
    }
  }

  if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
    return {
      type: parsed.type || "multiple_choice",
      data: parsed,
    };
  }

  return {
    type: "multiple_choice",
    data: Array.isArray(parsed) ? parsed : [],
  };
}

const PLAY_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    card: "bg-white border-slate-200 shadow-2xl shadow-slate-200/60 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-900",
    input:
      "bg-slate-50 border-slate-300 text-slate-900 focus:ring-indigo-500",
    pinInput:
      "bg-slate-50 border-slate-300 text-indigo-600 focus:ring-indigo-500",
    soundBtn:
      "bg-white border-slate-300 text-slate-700 hover:border-indigo-400 shadow-sm",
    imageWrapper: "bg-slate-100 border-slate-200",
    footer: "bg-white border-slate-200 text-slate-500",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    card: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-100",
    input:
      "bg-slate-950 border-slate-800 text-slate-100 focus:ring-purple-500",
    pinInput:
      "bg-slate-950 border-slate-800 text-amber-400 focus:ring-purple-500",
    soundBtn:
      "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800",
    imageWrapper: "bg-slate-950/90 border-slate-800",
    footer: "bg-[#070b19] border-slate-800/80 text-slate-500",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    card: "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.2)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-50",
    input:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500",
    pinInput:
      "bg-[#040612] border-cyan-500/50 text-cyan-300 focus:ring-fuchsia-500 shadow-[inset_0_0_12px_rgba(34,211,238,0.12)]",
    soundBtn:
      "bg-[#0b0f26] border-cyan-500/40 text-cyan-300 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]",
    imageWrapper: "bg-[#040612] border-cyan-500/30",
    footer: "bg-[#03040c] border-fuchsia-500/20 text-cyan-200/50",
  },
};

function GamePlayContent() {
  const [wasKicked, setWasKicked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const styles = PLAY_STYLES[theme] || PLAY_STYLES["theme-classic"];

  const urlPin = searchParams.get("pin") || "";
  const urlName = searchParams.get("name") || "";

  const [pin, setPin] = useState(urlPin);
  const [playerName, setPlayerName] = useState(
    urlName || user?.firstName || ""
  );
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

  const [currentImgSrc, setCurrentImgSrc] = useState("");
  const [imgLoading, setImgLoading] = useState(true);
  const [imgHasFailed, setImgHasFailed] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

  useEffect(() => {
    if (urlPin) setPin(urlPin);
    if (urlName) setPlayerName(urlName);
  }, [urlPin, urlName]);

  useEffect(() => {
    if (!urlName && user?.firstName && !playerName) {
      setPlayerName(user.firstName);
    }
  }, [user, urlName, playerName]);

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

      confetti({
        particleCount: 25,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        particleCount: 25,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      });
    }, 250);
  };

  const fetchSessionQuestions = async (quizId) => {
    if (!quizId) return [];

    let { data: qData, error: qErr } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order"
      )
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

          if (updatedSession.status === "FINALIZADO") {
            loadFinalLeaderboard(sessionId);
          }

          if (
            updatedSession.quiz_id &&
            updatedSession.quiz_id !== session?.quiz_id
          ) {
            const freshQuestions = await fetchSessionQuestions(
              updatedSession.quiz_id
            );
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
              (prevSession.current_question_index !==
                updatedSession.current_question_index ||
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
  const parsedCurrentOptions = parseQuestionOptions(currentQuestion?.options);
  const currentQuestionType = parsedCurrentOptions.type;
  const currentOptionsData = parsedCurrentOptions.data;

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
  }, [
    currentQuestion?.id,
    currentQuestion?.image_url,
    session?.current_question_index,
  ]);

  /**
   * Gravação unificada e resiliente de resposta no Supabase:
   * - Calcula pontuação e bônus de velocidade
   * - Persiste o registro em `player_answers` (para o rendimento em tempo real do Host)
   * - Atualiza `game_players` com o novo score acumulado
   */
  const processAnswerSubmission = async (isCorrect, selectedIndexForDb = 0) => {
    const questionIndex = Number(session.current_question_index || 0);
    const safeTimeLeft = Math.max(0, Number(timeLeft) || 0);
    const basePoints = 500;
    const speedBonus = safeTimeLeft * 25;
    const totalGained = isCorrect ? basePoints + speedBonus : 0;

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

    try {
      // 1. Grava explicitamente em player_answers para o Host contabilizar Acertos/Erros ao vivo
      const { error: ansError } = await supabase.from("player_answers").insert({
        session_id: session.id,
        player_id: player.id,
        question_index: questionIndex,
        selected_option: Number(selectedIndexForDb),
        is_correct: Boolean(isCorrect),
        time_left: safeTimeLeft,
      });

      if (ansError) {
        console.warn(
          "[MenteAfiada] Aviso ao gravar em player_answers:",
          ansError.message
        );
      }

      // 2. Atualiza pontuação do jogador na sala
      if (totalGained > 0) {
        const { error: scoreError } = await supabase
          .from("game_players")
          .update({ score: (player?.score || 0) + totalGained })
          .eq("id", player.id);

        if (scoreError) {
          console.warn(
            "[MenteAfiada] Aviso ao atualizar pontuação:",
            scoreError.message
          );
        }
      }
    } catch (err) {
      console.error("[MenteAfiada] Falha ao sincronizar resposta:", err);
    }
  };

  // 1. Submissão para Múltipla Escolha (conversão numérica garantida)
  const handleSelectOption = async (optionIdx) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    sounds.playClick();
    const cleanOptionIdx = Number(optionIdx);
    setSelectedOption(cleanOptionIdx);
    setHasAnswered(true);

    const expectedOption =
      currentQuestion?.correct_option !== undefined &&
      currentQuestion?.correct_option !== null
        ? Number(currentQuestion.correct_option)
        : -1;

    const isCorrect = expectedOption === cleanOptionIdx;

    await processAnswerSubmission(isCorrect, cleanOptionIdx);
  };

  // 2. Submissão para Verdadeiro ou Falso Relâmpago
  const handleSelectTrueFalse = async (choiceIdx) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    sounds.playClick();
    const cleanChoice = Number(choiceIdx);
    setSelectedOption(cleanChoice);
    setHasAnswered(true);

    const expectedIdx = Number(
      currentOptionsData?.correctIndex ??
        currentQuestion?.correct_option ??
        0
    );
    const isCorrect = expectedIdx === cleanChoice;

    await processAnswerSubmission(isCorrect, cleanChoice);
  };

  // 3. Submissão para Completar Lacunas
  const handleSubmitFillBlanks = async (selectedSequence) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    sounds.playClick();
    setHasAnswered(true);

    const expectedSequence = currentOptionsData?.correctSequence || [];
    const isCorrect =
      expectedSequence.length === selectedSequence.length &&
      expectedSequence.every(
        (word, idx) =>
          word.trim().toLowerCase() ===
          String(selectedSequence[idx] || "").trim().toLowerCase()
      );

    await processAnswerSubmission(isCorrect, isCorrect ? 0 : -1);
  };

  // 4. Submissão para Ordenação Sequencial
  const handleSubmitSequenceOrder = async (submittedOrder) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    sounds.playClick();
    setHasAnswered(true);

    const expectedOrder = currentOptionsData?.correctOrder || [];
    const isCorrect =
      expectedOrder.length === submittedOrder.length &&
      expectedOrder.every(
        (step, idx) =>
          step.trim().toLowerCase() ===
          String(submittedOrder[idx] || "").trim().toLowerCase()
      );

    await processAnswerSubmission(isCorrect, isCorrect ? 0 : -1);
  };

  const rankedPlayers = [...allPlayers].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  if (wasKicked) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center p-6 font-sans transition-colors duration-300 ${styles.mainBg}`}
      >
        <div
          className={`max-w-md w-full border border-rose-500/40 rounded-3xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200 ${styles.card}`}
        >
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
            🚫
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black">Acesso Removido</h2>
            <p className="text-xs opacity-70 leading-relaxed">
              Você foi removido desta sala pelo anfitrião da partida.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setWasKicked(false);
                router.push("/arena");
              }}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg"
            >
              Ir para a Arena Pública ⚔️
            </button>

            <button
              type="button"
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

  if (player && session) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] font-sans flex flex-col transition-colors duration-300 ${styles.mainBg}`}
      >
        <div className="max-w-lg w-full mx-auto px-6 pt-5 flex items-center justify-between">
          <span className="text-xs font-mono font-bold opacity-60">
            SALA PIN: <strong className="text-amber-500">{session.pin}</strong>
          </span>

          <button
            type="button"
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${styles.soundBtn}`}
            title="Ativar/Desativar Som"
          >
            <span>{soundEnabled ? "🔊" : "🔇"}</span>
            <span>{soundEnabled ? "Som Ativado" : "Som Mudo"}</span>
          </button>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center p-6">
          <div
            className={`max-w-lg w-full border rounded-3xl p-6 space-y-6 transition-colors duration-300 ${styles.card}`}
          >
            <div className="flex justify-between items-center border-b border-inherit pb-4">
              <div>
                <span className="text-xs opacity-70">
                  {t("player") || "Jogador"}
                </span>
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
                <span className="text-xs opacity-70">
                  {t("points") || "Pontos"}
                </span>
                <p className="font-mono font-bold text-amber-500">
                  {player.score || 0} pts
                </p>
              </div>
            </div>

            {session.status === "AGUARDANDO" && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-block w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <h3 className="text-xl font-bold">
                  {t("waiting_room_title") || "Você está na sala de espera!"}
                </h3>
                <p className="text-xs opacity-70">
                  {t("waiting_room_desc") ||
                    "Aguarde o professor clicar em 'Iniciar Partida'..."}
                </p>
              </div>
            )}

            {session.status === "EM_ANDAMENTO" && currentQuestion && (
              <div className="space-y-5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="opacity-70">
                    {t("question") || "Questão"}{" "}
                    {(session.current_question_index || 0) + 1}{" "}
                    {t("of") || "de"} {questions.length}
                  </span>
                  <div
                    className={`flex items-center gap-1.5 border px-3 py-1 rounded-full shadow-sm transition-all ${
                      styles.subBox
                    } ${
                      timeLeft <= 5
                        ? "border-rose-500 scale-105 animate-pulse"
                        : ""
                    }`}
                  >
                    <span>⏱️</span>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        timeLeft <= 5 ? "text-rose-500" : "text-amber-500"
                      }`}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                </div>

                {currentImgSrc && !imgHasFailed && (
                  <div
                    className={`relative w-full flex flex-col items-center justify-center p-2.5 rounded-2xl border min-h-[140px] overflow-hidden group ${styles.imageWrapper}`}
                  >
                    {imgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
                        <div className="w-7 h-7 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
                          setCurrentImgSrc(
                            `https://wsrv.nl/?url=${encodeURIComponent(
                              currentQuestion.image_url
                            )}&w=800&output=webp`
                          );
                        } else {
                          setImgLoading(false);
                          setImgHasFailed(true);
                        }
                      }}
                      className={`max-h-52 w-auto max-w-full object-contain rounded-xl shadow-md transition-all duration-300 cursor-zoom-in ${
                        imgLoading
                          ? "opacity-0 scale-95"
                          : "opacity-100 scale-100"
                      }`}
                      onClick={() => setZoomedImage(currentImgSrc)}
                    />
                  </div>
                )}

                {session.time_state === "PAUSADO" && !hasAnswered && (
                  <div
                    className={`p-4 border text-center rounded-2xl shadow-sm ${styles.subBox}`}
                  >
                    <p className="text-sm font-semibold text-amber-500">
                      {t("teacher_paused") ||
                        "⏳ O professor ainda não liberou o tempo."}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {t("prepare_options") ||
                        "Prepare-se! As opções serão ativadas assim que der Play."}
                    </p>
                  </div>
                )}

                {/* RENDERIZAÇÃO POR FORMATO DE QUESTÃO */}
                {currentQuestionType === "fill_blanks" && (
                  <FillBlanksPlayer
                    questionText={currentQuestion.question_text}
                    bankWords={currentOptionsData?.bank || []}
                    disabled={hasAnswered || session.time_state !== "RODANDO"}
                    onSubmitSequence={handleSubmitFillBlanks}
                  />
                )}

                {currentQuestionType === "sequence_order" && (
                  <SequenceOrderingPlayer
                    questionText={currentQuestion.question_text}
                    items={currentOptionsData?.correctOrder || []}
                    disabled={hasAnswered || session.time_state !== "RODANDO"}
                    onSubmitOrder={handleSubmitSequenceOrder}
                  />
                )}

                {currentQuestionType === "true_false" && (
                  <>
                    <h2 className="text-lg font-bold text-center min-h-[44px] flex items-center justify-center leading-snug">
                      {currentQuestion.question_text}
                    </h2>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        disabled={
                          hasAnswered || session.time_state !== "RODANDO"
                        }
                        onClick={() => handleSelectTrueFalse(0)}
                        className={`p-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg transition-all flex flex-col items-center gap-2 cursor-pointer ${
                          hasAnswered || session.time_state !== "RODANDO"
                            ? "opacity-60 cursor-not-allowed"
                            : "active:scale-95"
                        } ${
                          selectedOption === 0 ? "ring-4 ring-white scale-105" : ""
                        }`}
                      >
                        <span className="text-3xl">✅</span>
                        <span>VERDADEIRO</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          hasAnswered || session.time_state !== "RODANDO"
                        }
                        onClick={() => handleSelectTrueFalse(1)}
                        className={`p-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-base shadow-lg transition-all flex flex-col items-center gap-2 cursor-pointer ${
                          hasAnswered || session.time_state !== "RODANDO"
                            ? "opacity-60 cursor-not-allowed"
                            : "active:scale-95"
                        } ${
                          selectedOption === 1 ? "ring-4 ring-white scale-105" : ""
                        }`}
                      >
                        <span className="text-3xl">❌</span>
                        <span>FALSO</span>
                      </button>
                    </div>
                  </>
                )}

                {currentQuestionType === "multiple_choice" && (
                  <>
                    <h2 className="text-lg font-bold text-center min-h-[44px] flex items-center justify-center leading-snug">
                      {currentQuestion.question_text}
                    </h2>

                    <div className="grid grid-cols-1 gap-3">
                      {currentOptionsData.map((opt, i) => {
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
                            type="button"
                            disabled={
                              hasAnswered || session.time_state !== "RODANDO"
                            }
                            onClick={() => handleSelectOption(i)}
                            className={`w-full p-4 font-bold rounded-2xl text-left text-sm transition-all flex items-center justify-between cursor-pointer text-white shadow-md ${
                              colors[i % 4]
                            } ${
                              hasAnswered || session.time_state !== "RODANDO"
                                ? "opacity-60 cursor-not-allowed"
                                : "active:scale-95"
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
                  </>
                )}

                {hasAnswered && (
                  <div
                    className={`p-4 rounded-2xl border text-center space-y-1 animate-in zoom-in-95 duration-200 shadow-sm ${styles.subBox}`}
                  >
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
                            🔥 {t("streak_bonus") || "Bónus de Streak"} (+
                            {streakBonus} pts)!
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

            {session.status === "FINALIZADO" && (
              <div className="text-center py-6 space-y-6">
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
                  {t("game_over") || "🏆 Fim de Jogo!"}
                </h3>

                <div
                  className={`p-4 rounded-2xl border shadow-sm ${styles.subBox}`}
                >
                  <p className="text-xs opacity-70 font-bold">
                    {t("final_score") || "Sua Pontuação Final:"}
                  </p>
                  <p className="text-3xl font-black text-emerald-500 mt-1">
                    {player.score || 0} pts
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs opacity-70 font-bold uppercase tracking-widest text-left mb-3">
                    {t("top_3") || "Top 3 Classificados"}
                  </p>
                  {rankedPlayers.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`p-3 border rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm transition-all duration-500 ${
                        styles.subBox
                      } ${
                        idx === 2 && !showPodium3
                          ? "opacity-0 translate-y-2"
                          : ""
                      } ${
                        idx === 1 && !showPodium2
                          ? "opacity-0 translate-y-2"
                          : ""
                      } ${
                        idx === 0 && !showPodium1
                          ? "opacity-0 scale-95"
                          : "scale-100 opacity-100"
                      }`}
                    >
                      <span className="font-bold">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}{" "}
                        {p.player_name}
                      </span>
                      <span className="font-mono text-emerald-500 font-bold">
                        {p.score || 0} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute -top-3 -right-3 bg-slate-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold border border-slate-600 hover:bg-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* INTERAÇÕES AO VIVO DISPARADAS PELO INSTRUTOR */}
        <LiveWordCloud
          sessionId={session.id}
          isHost={false}
          playerName={player.player_name}
        />
        <QuickPulseOverlay
          sessionId={session.id}
          isHost={false}
          playerId={player.id}
        />
        <ArenaChat
          sessionId={session.id}
          playerName={player.player_name}
          userClerkId={user?.id}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans flex flex-col justify-between transition-colors duration-300 ${styles.mainBg}`}
    >
      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex items-center justify-center">
        <div
          className={`w-full rounded-3xl p-8 border text-center transition-colors duration-300 space-y-6 ${styles.card}`}
        >
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t("enter_quiz") || "Entrar no Quiz"}
            </h2>
            <p className="text-xs opacity-70 font-semibold">
              {urlPin
                ? `${t("connecting_pin") || "Conectando à Sala PIN"} ${urlPin}`
                : t("insert_pin") ||
                  "Insira o código PIN fornecido pelo professor"}
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
                  className={`w-full border font-mono font-bold text-center text-xl rounded-xl p-3.5 focus:outline-none focus:ring-2 tracking-widest shadow-sm ${styles.pinInput}`}
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
                className={`w-full border font-bold text-center text-md rounded-xl p-3.5 focus:outline-none focus:ring-2 shadow-sm ${styles.input}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? t("connecting") || "A conectar..."
                : t("enter_room") || "Entrar na Sala 🚀"}
            </button>

            <p className="text-[10px] opacity-55 text-center leading-normal pt-2">
              🔒 Ao entrar, você concorda com o uso do apelido apenas para a
              dinâmica da partida. Nenhum dado pessoal sensível é exposto
              publicamente.
            </p>
          </form>

          <div className="pt-4 border-t border-inherit">
            <Link
              href="/arena"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/30 rounded-xl text-xs font-bold transition"
            >
              <span>⚔️</span> Explorar Salas Abertas na Arena
            </Link>
          </div>
        </div>
      </main>

      <footer
        className={`py-6 text-center text-xs font-semibold border-t transition-colors duration-300 ${styles.footer}`}
      >
        © {new Date().getFullYear()} MenteAfiada Realtime Quiz Engine.
      </footer>
    </div>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-70px)] flex items-center justify-center text-white bg-slate-950">
          Carregando jogo...
        </div>
      }
    >
      <GamePlayContent />
    </Suspense>
  );
}