/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/game/host/page.js
 * Objetivo: Painel de Controle do Professor / Anfitrião com conformidade de
 * capacidade máxima de jogadores por plano (`PLAN_LIMITS`) e:
 *   - Atalhos de Teclado de Apresentação (Espaço/Enter: Play/Pause/Gabarito,
 *     Setas Esquerda/Direita: Questão Anterior/Próxima, Q: QR Code, G: Gaveta);
 *   - Persistência da Nuvem de Palavras e Termômetro no Relatório Final (PDF/CSV);
 *   - Modal de QR Code & Link exibindo em tempo real quantos alunos estão ativos;
 *   - Barra de Acesso Rápido sempre visível no topo da projeção;
 *   - Gaveta Lateral Retrátil à esquerda ("▶ 🎛️") para controles secundários.
 * ============================================================================
 */

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/app/components/ThemeProvider";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import ArenaChat from "@/app/components/ArenaChat";
import LiveWordCloud from "@/app/components/LiveWordCloud";
import QuickPulseOverlay from "@/app/components/QuickPulseOverlay";
import { QUIZ_CATEGORIES } from "@/constants/categories";
import { sounds } from "@/lib/soundEffects";
import { usePixPlan } from "@/lib/usePixPlan";

const HOST_PLAN_KEYS = {
  free: "role_explorer", student_pro: "role_student_pro", creator_pro: "role_educator_pro",
  institutional: "owner_institutional", owner: "owner_master",
};

const HOST_CATEGORY_KEYS = {
  "Concurso Público": "host_category_exam", "Conhecimentos Gerais": "host_category_general",
  História: "host_category_history", Português: "host_category_portuguese",
  "Matemática & Raciocínio": "host_category_math", Tecnologia: "host_category_technology",
  Direito: "host_category_law", Atualidades: "host_category_news",
};

// Normalizador defensivo: converte string JSONB ou objeto/array em formato estruturado
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

const HOST_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    subBanner:
      "bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-b border-slate-200 text-slate-900",
    backLink: "text-slate-600 hover:text-indigo-600",
    bannerTitle: "text-slate-900",
    bannerSubtitle: "text-slate-600",
    soundBtn:
      "bg-white border-slate-300 text-slate-700 hover:border-indigo-400 shadow-sm",
    card: "bg-white border-slate-200 shadow-xl shadow-slate-200/50 text-slate-900",
    drawerPanel:
      "bg-white/95 border-r border-slate-200 shadow-2xl text-slate-900 backdrop-blur-xl",
    drawerTab:
      "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-600/30",
    subBox: "bg-slate-50 border-slate-200 text-slate-900",
    input: "bg-slate-50 border-slate-300 text-slate-900",
    neutralBtn:
      "bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800",
    imageWrapper: "bg-slate-100 border-slate-200",
    modalBox: "bg-white border-slate-200 text-slate-900 shadow-2xl",
  },
  "theme-sepia": {
    mainBg: "bg-[#f7f3e8] text-[#292524]",
    subBanner:
      "bg-gradient-to-r from-[#efe7d3] via-[#f7f3e8] to-[#fffdf8] border-b border-[#e0d6bc] text-[#292524]",
    backLink: "text-[#78716c] hover:text-amber-800",
    bannerTitle: "text-[#292524]",
    bannerSubtitle: "text-[#57534e]",
    soundBtn:
      "bg-[#fffdf8] border-[#d6cbb2] text-[#44403c] hover:border-amber-700 shadow-sm",
    card: "bg-[#fffdf8] border-[#e6dec8] shadow-xl shadow-amber-950/10 text-[#292524]",
    drawerPanel:
      "bg-[#fffdf8]/95 border-r border-[#e0d6bc] shadow-2xl text-[#292524] backdrop-blur-xl",
    drawerTab:
      "bg-amber-800 hover:bg-amber-700 text-white border-amber-600 shadow-lg shadow-amber-900/30",
    subBox: "bg-[#faf6eb] border-[#e6dec8] text-[#292524]",
    input: "bg-[#faf6eb] border-[#d6cbb2] text-[#292524]",
    neutralBtn:
      "bg-[#f0e9d6] border-[#d6cbb2] hover:bg-[#e6dec8] text-[#292524]",
    imageWrapper: "bg-[#faf6eb] border-[#e6dec8]",
    modalBox: "bg-[#fffdf8] border-[#e6dec8] text-[#292524] shadow-2xl",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    subBanner:
      "bg-gradient-to-b from-slate-900 to-[#070b19] border-b border-slate-800 text-white",
    backLink: "text-slate-400 hover:text-white",
    bannerTitle: "text-white",
    bannerSubtitle: "text-slate-400",
    soundBtn:
      "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700",
    card: "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/50 text-slate-100",
    drawerPanel:
      "bg-[#0d1326]/95 border-r border-slate-800 shadow-2xl text-slate-100 backdrop-blur-xl",
    drawerTab:
      "bg-purple-600 hover:bg-purple-500 text-white border-purple-400/50 shadow-lg shadow-purple-600/30",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-100",
    input: "bg-slate-950 border-slate-800 text-slate-100",
    neutralBtn:
      "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100",
    imageWrapper: "bg-slate-950/90 border-slate-800",
    modalBox: "bg-[#111625] border-slate-800 text-slate-100 shadow-2xl",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    subBanner:
      "bg-gradient-to-r from-fuchsia-950/40 via-[#080c1f] to-cyan-950/30 border-b border-fuchsia-500/30 text-white",
    backLink: "text-cyan-300/80 hover:text-cyan-200",
    bannerTitle: "text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]",
    bannerSubtitle: "text-cyan-100/75",
    soundBtn:
      "bg-[#0b0f26] border-cyan-500/40 text-cyan-300 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]",
    card: "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(192,38,211,0.15)] text-cyan-50",
    drawerPanel:
      "bg-[#080b1e]/95 border-r border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.25)] text-cyan-50 backdrop-blur-xl",
    drawerTab:
      "bg-gradient-to-b from-fuchsia-600 to-cyan-600 text-white border-cyan-400/60 shadow-[0_0_20px_rgba(217,70,239,0.45)]",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-50",
    input: "bg-[#040612] border-cyan-500/40 text-cyan-100",
    neutralBtn:
      "bg-[#0b0f26] border-cyan-500/40 hover:border-fuchsia-400 text-cyan-100",
    imageWrapper: "bg-[#040612] border-cyan-500/30",
    modalBox:
      "bg-[#090d22] border-fuchsia-500/50 text-cyan-50 shadow-[0_0_40px_rgba(217,70,239,0.3)]",
  },
};

function HostGameContent() {
  const { user } = useUser();
  const { t, locale } = useLanguage();
  const number = (value) => Number(value || 0).toLocaleString(locale);
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const preselectedQuizId = searchParams?.get("quizId") || "";

  const styles = HOST_STYLES[theme] || HOST_STYLES["theme-classic"];

  // Resolução do plano e limite máximo de jogadores da sala
  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    "participant";
  const planTier =
    user?.publicMetadata?.plan_tier ||
    user?.unsafeMetadata?.plan_tier ||
    "free";
  const userPlan = usePixPlan(user?.id, userRole, planTier);
  const maxRoomPlayers = userPlan.maxPlayersPerRoom;
  const planName = t(HOST_PLAN_KEYS[userPlan.key]);
  const roomLimit = maxRoomPlayers === Infinity ? t("shared_unlimited") : number(maxRoomPlayers);
  const categoryLabel = (category, fallback) =>
    Object.hasOwn(HOST_CATEGORY_KEYS, category) ? t(HOST_CATEGORY_KEYS[category]) : fallback;

  // Estados principais da sessão
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomCapacityWarning, setRoomCapacityWarning] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isPublic, setIsPublic] = useState(false);

  // Estados de controle de tempo, visibilidade das alternativas e revelação do gabarito
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(15);
  const [timeState, setTimeState] = useState("PAUSADO");
  const [hasStartedQuestion, setHasStartedQuestion] = useState(false);
  const [revealCorrectAnswer, setRevealCorrectAnswer] = useState(false);

  // Estados da Gaveta Lateral Retrátil e Interações Fluidas
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFluidInteractions, setShowFluidInteractions] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showWordCloudModal, setShowWordCloudModal] = useState(false);
  const [showQuickPulseModal, setShowQuickPulseModal] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hideNames, setHideNames] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Dados consolidados das interações ao vivo para o Relatório Final (PDF/CSV)
  const [wordCloudReport, setWordCloudReport] = useState(null);
  const [quickPulseReport, setQuickPulseReport] = useState(null);

  // Estados para Novo Quiz com a Mesma Turma
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [nextQuizId, setNextQuizId] = useState("");
  const [resetScores, setResetScores] = useState(false);

  // Estados para Animação Sequencial do Pódio
  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

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
    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    if (session?.status === "FINALIZADO") {
      setIsDrawerOpen(false);
      sounds.playVictory();
      setTimeout(() => setShowPodium3(true), 800);
      setTimeout(() => setShowPodium2(true), 2200);
      setTimeout(() => {
        setShowPodium1(true);
        dispararConfetes20s();
      }, 3800);
    }
  }, [session?.status]);

  const dispararConfetes20s = () => {
    const duracao = 20 * 1000;
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

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setQuizzes(data);
      const validPreselected = data.find((q) => q.id === preselectedQuizId);
      const defaultId = validPreselected ? validPreselected.id : data[0].id;
      setSelectedQuizId(defaultId);
      setNextQuizId(defaultId);
    } else {
      const defaultQuiz = [
        {
          id: "11111111-1111-1111-1111-111111111111",
          title: "Conhecimentos Gerais - MenteAfiada",
          category: "Conhecimentos Gerais",
        },
      ];
      setQuizzes(defaultQuiz);
      setSelectedQuizId("11111111-1111-1111-1111-111111111111");
      setNextQuizId("11111111-1111-1111-1111-111111111111");
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (selectedCategory === "all") return true;
    return (q.category || "Conhecimentos Gerais") === selectedCategory;
  });

  const handleCreateSession = async () => {
    if (!selectedQuizId)
      return alert(t("alert_select_quiz") || "Selecione um quiz primeiro!");

    setLoading(true);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();

    let qData = [];
    const { data } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order"
      )
      .eq("quiz_id", selectedQuizId)
      .order("question_order", { ascending: true });

    if (data && data.length > 0) {
      qData = data;
    } else {
      qData = [
        {
          question_text: "Qual é a capital do Brasil?",
          image_url: null,
          options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
          correct_option: 2,
          time_seconds: 15,
        },
      ];
    }

    setQuestions(qData);
    const initialTime = qData[0]?.time_seconds || 15;

    const { data: sessionData, error } = await supabase
      .from("game_sessions")
      .insert({
        pin: newPin,
        quiz_id:
          selectedQuizId === "11111111-1111-1111-1111-111111111111"
            ? null
            : selectedQuizId,
        host_id: user?.id || "host-anonymous",
        status: "AGUARDANDO",
        time_left: initialTime,
        time_state: "PAUSADO",
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) {
      alert(
        `${t("alert_room_error") || "Erro ao criar sala: "}${error.message}`
      );
    } else if (sessionData) {
      setSession(sessionData);
      setTimer(initialTime);
      setHasStartedQuestion(false);
      setRevealCorrectAnswer(false);
      setIsDrawerOpen(false);
      setRoomCapacityWarning(false);
      setWordCloudReport(null);
      setQuickPulseReport(null);
      subscribeToRealtime(sessionData.id);
    }
    setLoading(false);
  };

  const subscribeToRealtime = (sessionId) => {
    supabase
      .channel(`host-players-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const { data } = await supabase
            .from("game_players")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });

          if (data) {
            // Verifica e aplica conformidade de capacidade máxima de jogadores do plano
            if (
              maxRoomPlayers !== Infinity &&
              data.length > maxRoomPlayers
            ) {
              const allowedPlayers = data.slice(0, maxRoomPlayers);
              const overflowPlayers = data.slice(maxRoomPlayers);
              const overflowIds = overflowPlayers.map((op) => op.id);

              setRoomCapacityWarning(true);
              if (overflowIds.length > 0) {
                await supabase
                  .from("game_players")
                  .delete()
                  .in("id", overflowIds);
              }

              setPlayers(
                [...allowedPlayers].sort(
                  (a, b) => (b.score || 0) - (a.score || 0)
                )
              );
            } else {
              setPlayers(
                [...data].sort((a, b) => (b.score || 0) - (a.score || 0))
              );
            }
          }
        }
      )
      .subscribe();

    supabase
      .channel(`host-answers-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const { data } = await supabase
            .from("player_answers")
            .select("*")
            .eq("session_id", sessionId);
          if (data) setAnswers(data);
        }
      )
      .subscribe();
  };

  const handleKickPlayer = async (playerId, playerName) => {
    if (!confirm(t("host_remove_confirm", { name: playerName })))
      return;

    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("id", playerId);

    if (error) {
      alert(t("host_remove_error") + error.message);
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    }
  };

  const handleStartGame = async () => {
    if (!session) return;
    sounds.playNextQuestion();
    setHasStartedQuestion(false);
    setRevealCorrectAnswer(false);
    setTimeState("PAUSADO");

    const { data } = await supabase
      .from("game_sessions")
      .update({
        status: "EM_ANDAMENTO",
        current_question_index: 0,
        time_state: "PAUSADO",
      })
      .eq("id", session.id)
      .select()
      .single();
    if (data) setSession(data);
  };

  // Controle do ciclo: Play -> Pause -> Mostrar Resposta Certa
  const handlePrimaryAction = useCallback(async () => {
    if (!session) return;

    if (!hasStartedQuestion && timeState === "PAUSADO") {
      setHasStartedQuestion(true);
      setRevealCorrectAnswer(false);
      setTimeState("RODANDO");
      await supabase
        .from("game_sessions")
        .update({ time_state: "RODANDO" })
        .eq("id", session.id);
      return;
    }

    if (timeState === "RODANDO") {
      setTimeState("PAUSADO");
      await supabase
        .from("game_sessions")
        .update({ time_state: "PAUSADO" })
        .eq("id", session.id);
      return;
    }

    if (hasStartedQuestion && timeState === "PAUSADO") {
      setRevealCorrectAnswer((prev) => !prev);
      sounds.playCorrect();
    }
  }, [session, hasStartedQuestion, timeState]);

  useEffect(() => {
    let interval = null;
    if (timeState === "RODANDO" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 5 && nextVal > 0) {
            sounds.playCountdown();
          }
          return nextVal;
        });
      }, 1000);
    } else if (timer === 0 && timeState === "RODANDO") {
      setTimeState("PAUSADO");
      if (session?.id) {
        supabase
          .from("game_sessions")
          .update({ time_state: "PAUSADO" })
          .eq("id", session.id);
      }
    }
    return () => clearInterval(interval);
  }, [timeState, timer, soundEnabled, session?.id]);

  const handlePrevQuestion = useCallback(async () => {
    if (!session) return;
    const prevIdx = Math.max(0, currentQuestionIndex - 1);
    const prevTime = questions[prevIdx]?.time_seconds || 15;
    setCurrentQuestionIndex(prevIdx);
    setTimer(prevTime);
    setTimeState("PAUSADO");
    setHasStartedQuestion(false);
    setRevealCorrectAnswer(false);

    await supabase
      .from("game_sessions")
      .update({
        current_question_index: prevIdx,
        time_left: prevTime,
        time_state: "PAUSADO",
      })
      .eq("id", session.id);
  }, [session, currentQuestionIndex, questions]);

  const handleEndGame = useCallback(async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .update({ status: "FINALIZADO", time_state: "PAUSADO" })
        .eq("id", session.id)
        .select()
        .single();

      if (!error && data) {
        setSession(data);
      } else {
        setSession((prev) => ({ ...prev, status: "FINALIZADO" }));
      }
    } catch (e) {
      setSession((prev) => ({ ...prev, status: "FINALIZADO" }));
    }
  }, [session]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx >= questions.length) {
      await handleEndGame();
      return;
    }

    sounds.playNextQuestion();
    const nextTime = questions[nextIdx]?.time_seconds || 15;
    setCurrentQuestionIndex(nextIdx);
    setTimer(nextTime);
    setTimeState("PAUSADO");
    setHasStartedQuestion(false);
    setRevealCorrectAnswer(false);

    await supabase
      .from("game_sessions")
      .update({
        current_question_index: nextIdx,
        time_left: nextTime,
        time_state: "PAUSADO",
      })
      .eq("id", session.id);
  }, [session, currentQuestionIndex, questions, handleEndGame]);

  // =========================================================================
  // ATALHOS DE TECLADO DE APRESENTAÇÃO (Passador de Slides / Telão)
  // =========================================================================
  useEffect(() => {
    if (!session || session.status === "FINALIZADO") return;

    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (
        showWordCloudModal ||
        showQuickPulseModal ||
        showRoulette ||
        showNewQuizModal
      ) {
        return;
      }

      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        setShowEntryModal((prev) => !prev);
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
        return;
      }

      if (session.status === "EM_ANDAMENTO" && !showEntryModal) {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          handlePrimaryAction();
        } else if (e.key === "ArrowRight" || e.key === "PageDown") {
          e.preventDefault();
          handleNextQuestion();
        } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          handlePrevQuestion();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    session,
    showEntryModal,
    showWordCloudModal,
    showQuickPulseModal,
    showRoulette,
    showNewQuizModal,
    handlePrimaryAction,
    handleNextQuestion,
    handlePrevQuestion,
  ]);

  const handleStartNextQuiz = async () => {
    if (!nextQuizId) return alert(t("host_choose_quiz_first"));

    setLoading(true);

    let newQuestions = [];
    const { data: qData } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order"
      )
      .eq("quiz_id", nextQuizId)
      .order("question_order", { ascending: true });

    if (qData && qData.length > 0) {
      newQuestions = qData;
    }

    setQuestions(newQuestions);
    const initialTime = newQuestions[0]?.time_seconds || 15;

    await supabase.from("player_answers").delete().eq("session_id", session.id);

    if (resetScores) {
      await supabase
        .from("game_players")
        .update({ score: 0 })
        .eq("session_id", session.id);
      setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    }

    const { data: updatedSession, error } = await supabase
      .from("game_sessions")
      .update({
        quiz_id: nextQuizId,
        status: "EM_ANDAMENTO",
        current_question_index: 0,
        time_left: initialTime,
        time_state: "PAUSADO",
      })
      .eq("id", session.id)
      .select()
      .single();

    if (!error && updatedSession) {
      setSession(updatedSession);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setTimer(initialTime);
      setTimeState("PAUSADO");
      setHasStartedQuestion(false);
      setRevealCorrectAnswer(false);
      setShowPodium1(false);
      setShowPodium2(false);
      setShowPodium3(false);
      setShowNewQuizModal(false);
      sounds.playNextQuestion();
    }

    setLoading(false);
  };

  const directGameLink = session
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/game/play?pin=${
        session.pin
      }`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(directGameLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const winnersList = answers
    .filter((a) => a.question_index === currentQuestionIndex && a.is_correct)
    .map((a) => {
      const p = players.find((player) => player.id === a.player_id);
      return p ? p.player_name : t("student_hash") || "Aluno";
    });

  const handleSpinRoulette = () => {
    if (winnersList.length === 0)
      return alert(
        t("alert_no_winners") || "Nenhum aluno acertou esta questão!"
      );
    setIsSpinning(true);
    setRouletteWinner(null);
    let count = 0;
    const interval = setInterval(() => {
      const randomWinner =
        winnersList[Math.floor(Math.random() * winnersList.length)];
      setRouletteWinner(randomWinner);
      count++;
      if (count >= 20) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 150);
  };

  const currentAnswers = answers.filter(
    (a) => a.question_index === currentQuestionIndex
  );
  const correctCount = currentAnswers.filter((a) => a.is_correct).length;
  const wrongCount = currentAnswers.length - correctCount;
  const totalAnswersCount = currentAnswers.length;
  const correctPercent =
    totalAnswersCount > 0
      ? Math.round((correctCount / totalAnswersCount) * 100)
      : 0;
  const wrongPercent = totalAnswersCount > 0 ? 100 - correctPercent : 0;

  const rankedPlayers = [...players].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  const totalGlobalAnswers = answers.length;
  const totalGlobalCorrect = answers.filter((a) => a.is_correct).length;
  const classAccuracyRate =
    totalGlobalAnswers > 0
      ? Math.round((totalGlobalCorrect / totalGlobalAnswers) * 100)
      : 0;

  const questionAnalytics = questions.map((q, idx) => {
    const qAnswers = answers.filter((a) => a.question_index === idx);
    const qCorrect = qAnswers.filter((a) => a.is_correct).length;
    const qTotal = qAnswers.length;
    const accuracy = qTotal > 0 ? Math.round((qCorrect / qTotal) * 100) : 0;
    const errorRate = 100 - accuracy;
    return {
      index: idx + 1,
      text: q.question_text,
      totalAnswers: qTotal,
      correctCount: qCorrect,
      errorCount: qTotal - qCorrect,
      accuracy,
      errorRate,
    };
  });

  const questionsWithAnswers = questionAnalytics.filter(
    (q) => q.totalAnswers > 0
  );
  const hardestQuestion =
    questionsWithAnswers.length > 0
      ? [...questionsWithAnswers].sort((a, b) => b.errorRate - a.errorRate)[0]
      : null;
  const easiestQuestion =
    questionsWithAnswers.length > 0
      ? [...questionsWithAnswers].sort((a, b) => a.errorRate - b.errorRate)[0]
      : null;

  // Exportação CSV incluindo também Nuvem de Palavras e Termômetro
  const handleExportCSV = () => {
    if (players.length === 0 && !wordCloudReport && !quickPulseReport) {
      return alert(t("host_export_empty"));
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += ["arena_rank", "host_student", "arena_score", "correct_hits", "host_answered_total", "host_accuracy"]
      .map((key) => t(key)).join(";") + "\n";

    rankedPlayers.forEach((p, idx) => {
      const pAnswers = answers.filter((a) => a.player_id === p.id);
      const pCorrect = pAnswers.filter((a) => a.is_correct).length;
      const pRate =
        pAnswers.length > 0
          ? Math.round((pCorrect / pAnswers.length) * 100)
          : 0;
      csvContent += `${idx + 1};${p.player_name};${p.score || 0};${pCorrect};${
        pAnswers.length
      };${pRate}%\n`;
    });

    if (wordCloudReport?.words?.length > 0) {
      csvContent += `\n${t("host_cloud")};${t("host_topic")} ${wordCloudReport.prompt}\n`;
      csvContent += `${t("host_word")};${t("host_occurrences")}\n`;
      wordCloudReport.words.forEach((w) => {
        csvContent += `${w.word};${w.count}\n`;
      });
    }

    if (quickPulseReport?.stats?.length > 0) {
      csvContent += `\n${t("host_pulse")};${t("host_prompt")} ${quickPulseReport.question}\n`;
      csvContent += `${t("option_prefix")};${t("host_votes")};${t("host_percentage")}\n`;
      quickPulseReport.stats.forEach((s) => {
        csvContent += `${t(s.label)};${s.count};${s.percent}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `MenteAfiada_Relatorio_PIN_${session?.pin || "sessao"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const activeQuestionObj = questions[currentQuestionIndex];
  const parsedActiveOptions = parseQuestionOptions(activeQuestionObj?.options);
  const activeQuestionType = parsedActiveOptions.type;
  const activeOptionsData = parsedActiveOptions.data;

  // Configuração visual do botão de ação principal
  const getPrimaryButtonConfig = () => {
    if (!hasStartedQuestion && timeState === "PAUSADO") {
      return {
        label: t("release_answers") || "Liberar Respostas (Play)",
        shortLabel: t("play_btn") || "Play",
        icon: "▶",
        style: "bg-emerald-500 hover:bg-emerald-600 text-white",
      };
    }

    if (timeState === "RODANDO") {
      return {
        label: t("pause_answers") || "Pausar Respostas",
        shortLabel: t("host_pause"),
        icon: "⏸",
        style: "bg-amber-500 hover:bg-amber-400 text-slate-950",
      };
    }

    return {
      label: revealCorrectAnswer
        ? t("host_hide_correct")
        : t("host_show_correct"),
      shortLabel: revealCorrectAnswer ? t("host_hide") : t("host_answer_key"),
      icon: "👁️",
      style: revealCorrectAnswer
        ? "bg-slate-700 hover:bg-slate-600 text-white"
        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30",
    };
  };

  const primaryBtn = getPrimaryButtonConfig();

  // Bloco reutilizável de Interações Fluidas (minimizado por padrão dentro da gaveta)
  const renderFluidInteractionsAccordion = () => (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${styles.subBox}`}
    >
      <button
        type="button"
        onClick={() => setShowFluidInteractions((prev) => !prev)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-extrabold cursor-pointer hover:opacity-90 transition"
      >
        <span className="flex items-center gap-1.5 text-cyan-500 truncate">
          <span>✨</span>
          <span>{t("host_interactions")}</span>
        </span>
        <span className="text-[10px] opacity-70 flex items-center gap-1 flex-shrink-0">
          <span>{showFluidInteractions ? "▲" : "▼"}</span>
        </span>
      </button>

      {showFluidInteractions && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-inherit space-y-2.5 animate-in fade-in duration-150">
          <p className="text-[11px] opacity-75">
            {t("host_interactions_help")}
          </p>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setShowWordCloudModal(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>☁️</span>
              <span>{t("host_cloud")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setShowQuickPulseModal(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🌡️</span>
              <span>{t("host_pulse")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans transition-colors duration-300 relative ${styles.mainBg}`}
    >
      {/* ===================================================================== */}
      {/* GAVETA LATERAL RETRÁTIL À ESQUERDA (CONTROLE DO PROFESSOR)            */}
      {/* ===================================================================== */}
      {session && session.status !== "FINALIZADO" && (
        <>
          {isDrawerOpen && (
            <div
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 transition-opacity print:hidden"
            />
          )}

          <aside
            className={`fixed top-[70px] left-0 bottom-0 z-50 flex items-start transition-transform duration-300 ease-in-out print:hidden ${
              isDrawerOpen ? "translate-x-0" : "-translate-x-[calc(100%-44px)]"
            }`}
          >
            {/* Corpo Interno do Painel de Controle */}
            <div
              className={`w-[340px] sm:w-[380px] h-full overflow-y-auto p-5 space-y-4 ${styles.drawerPanel}`}
            >
              <div className="flex items-center justify-between border-b border-inherit pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎛️</span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider">
                      {t("host_room_controls")}
                    </h2>
                    <span className="text-[11px] font-mono opacity-70">
                      PIN: <strong className="text-amber-500">{session.pin}</strong> •{" "}
                      {t("host_students_online", { count: number(players.length), limit: roomLimit })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${styles.neutralBtn}`}
                  title={t("host_close_drawer")}
                >
                  ◀ {t("host_collapse")}
                </button>
              </div>

              {/* Ação Principal: Play -> Pause -> Mostrar Resposta Certa */}
              <button
                type="button"
                onClick={handlePrimaryAction}
                className={`w-full py-3.5 px-4 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2 ${primaryBtn.style}`}
              >
                <span>{primaryBtn.icon}</span>
                <span>{primaryBtn.label}</span>
              </button>

              {/* Navegação de Questões (Anterior / Próxima) */}
              {session.status === "EM_ANDAMENTO" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrevQuestion}
                    className={`py-2.5 border font-bold text-xs rounded-xl transition cursor-pointer ${styles.neutralBtn}`}
                  >
                    {t("prev_question")}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {t("next_question_arrow")}
                  </button>
                </div>
              )}

              {/* Interações Fluidas (Minimizado por padrão) */}
              {renderFluidInteractionsAccordion()}

              {/* Ajuste de Tempo */}
              {session.status === "EM_ANDAMENTO" && (
                <div
                  className={`border rounded-xl p-3 flex items-center justify-between text-xs ${styles.subBox}`}
                >
                  <span className="font-bold opacity-80">{t("host_seconds")}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTimer((prev) => Math.max(5, prev - 5))}
                      className={`px-2.5 py-1 font-bold rounded-lg border cursor-pointer ${styles.neutralBtn}`}
                    >
                      -5s
                    </button>
                    <span
                      className={`font-mono font-black px-1 text-sm ${
                        timer <= 5
                          ? "text-rose-500 animate-pulse"
                          : "text-purple-500"
                      }`}
                    >
                      {timer}s
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimer((prev) => prev + 5)}
                      className={`px-2.5 py-1 font-bold rounded-lg border cursor-pointer ${styles.neutralBtn}`}
                    >
                      +5s
                    </button>
                  </div>
                </div>
              )}

              {/* Acesso QR Code & Áudio */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(true)}
                  className={`py-2.5 px-3 border font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${styles.neutralBtn}`}
                >
                  <span>📱</span>
                  <span>
                    {t("host_qr_short")} ({number(players.length)}/{roomLimit})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleSound}
                  className={`py-2.5 px-3 border font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${styles.neutralBtn}`}
                >
                  <span>{soundEnabled ? "🔊" : "🔇"}</span>
                  <span>{soundEnabled ? t("host_sound_on") : t("host_sound_off")}</span>
                </button>
              </div>

              {/* Rendimento da Questão Atual */}
              {session.status === "EM_ANDAMENTO" && (
                <div
                  className={`border rounded-xl p-3.5 flex items-center gap-3.5 ${styles.subBox}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full border-4 flex items-center justify-center font-black text-xs flex-shrink-0 ${styles.card}`}
                  >
                    {currentAnswers.length}/{players.length}
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="font-bold block opacity-80">
                      {t("question_performance")}
                    </span>
                    <div className="flex items-center gap-2 font-bold text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {t("host_correct_label")} {correctPercent}% ({correctCount})
                    </div>
                    <div className="flex items-center gap-2 font-bold text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {t("host_wrong_label")} {wrongPercent}% ({wrongCount})
                    </div>
                  </div>
                </div>
              )}

              {/* Ranking Parcial */}
              <div className="pt-2 border-t border-inherit space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                    🏆 {t("partial_ranking")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideNames(!hideNames)}
                    className={`text-[10px] border px-2 py-0.5 rounded font-bold cursor-pointer ${styles.neutralBtn}`}
                  >
                    👁 {hideNames ? t("host_show") : t("host_hide")}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {players.length === 0 ? (
                    <p className="text-xs opacity-50 italic">
                      {t("host_no_players")}
                    </p>
                  ) : (
                    players.slice(0, 6).map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex justify-between items-center border px-3 py-1.5 rounded-lg text-xs ${styles.subBox}`}
                      >
                        <span className="font-bold truncate pr-2">
                          #{idx + 1}{" "}
                          {hideNames ? `${t("host_student")} #${number(idx + 1)}` : p.player_name}
                        </span>
                        <span className="font-mono text-emerald-500 font-bold flex-shrink-0">
                          {t("arena_score_points", { score: number(p.score) })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Guia de Atalhos de Apresentação */}
              <div
                className={`border rounded-xl p-3 text-[10px] opacity-75 space-y-1 ${styles.subBox}`}
              >
                <span className="font-extrabold uppercase block text-indigo-400">
                  ⌨️ {t("host_shortcuts")}
                </span>
                <p>
                  <strong>{t("host_space_shortcut")}</strong> {t("host_action_shortcut")}
                </p>
                <p>
                  <strong>{t("host_arrow_shortcut")}</strong> {t("host_question_nav")}
                </p>
                <p>
                  <strong>{t("host_key_q")}</strong> {t("host_qr_short")} • <strong>{t("host_key_g")}</strong>{" "}
                  {t("host_drawer")}
                </p>
              </div>

              {/* Roleta & Encerramento */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowRoulette(true)}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow"
                >
                  🎰 {t("host_draw")}
                </button>

                <button
                  type="button"
                  onClick={handleEndGame}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow"
                >
                  🏆 {t("host_finish")}
                </button>
              </div>
            </div>

            {/* Aba Lateral de Seta (Puxador Fixo na Borda Esquerda) */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              title={
                isDrawerOpen
                  ? t("host_close_drawer")
                  : t("host_open_drawer")
              }
              className={`mt-6 w-11 py-4 rounded-r-2xl border-y border-r flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${styles.drawerTab}`}
            >
              <span className="text-base font-black leading-none">
                {isDrawerOpen ? "◀" : "▶"}
              </span>
              <span className="text-sm leading-none">🎛️</span>
              {session.status === "EM_ANDAMENTO" && (
                <span className="text-[10px] font-mono font-black bg-black/25 px-1.5 py-0.5 rounded">
                  {currentAnswers.length}/{players.length}
                </span>
              )}
            </button>
          </aside>
        </>
      )}

      {/* BANNER CONTEXTUAL DO ANFITRIÃO */}
      <div
        className={`py-6 px-6 transition-colors duration-300 print:hidden ${styles.subBanner}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Link
              href="/"
              className={`inline-flex items-center text-sm font-medium transition-colors group ${styles.backLink}`}
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
              {t("back_home") || "Voltar"}
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
                {t("host_plan_capacity", { plan: planName, limit: roomLimit })}
              </span>

              {session && session.status !== "FINALIZADO" && (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen((prev) => !prev)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${styles.soundBtn}`}
                >
                  <span>{isDrawerOpen ? "◀" : "▶"}</span>
                  <span>🎛️ {t("host_controls")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${styles.soundBtn}`}
                title={t("host_toggle_sound")}
              >
                <span>{soundEnabled ? "🔊" : "🔇"}</span>
                <span className="hidden sm:inline">
                  {soundEnabled ? t("host_sound_on") : t("host_sound_off")}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className={`text-2xl md:text-3xl font-extrabold flex items-center gap-2 ${styles.bannerTitle}`}
              >
                🎮 {t("host_panel_title") || "Painel do Anfitrião"}
              </h1>
              <p
                className={`text-xs md:text-sm font-medium mt-1 ${styles.bannerSubtitle}`}
              >
                {!session
                  ? t("host_panel_desc_waiting") ||
                    "Crie uma sala para começar."
                  : t("host_shortcuts_summary")}
              </p>
            </div>

            {session && session.status !== "FINALIZADO" && (
              <button
                type="button"
                onClick={handleEndGame}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                {t("end_room") || "Encerrar Sala"}
              </button>
            )}
          </div>

          {/* Alerta discreto caso a lotação máxima do plano seja atingida */}
          {roomCapacityWarning && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-600 dark:text-amber-300">
                ⚠️ {t("host_capacity_reached", { plan: planName, limit: roomLimit })}
              </span>
              <Link
                href="/planos"
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black whitespace-nowrap text-center"
              >
                {t("host_upgrade")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL CENTRALIZADO */}
      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10 space-y-8">
        {/* CRIAR SALA */}
        {!session && (
          <div
            className={`max-w-md mx-auto p-8 rounded-3xl border text-center transition-colors duration-300 ${styles.card}`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-500 text-[11px] font-black mb-3">
              <span>👥</span>
              <span>
                {t("host_capacity_limit", { plan: planName, limit: roomLimit })}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {t("new_activity") || "Nova Atividade"}
            </h2>
            <p className="text-sm opacity-70 mb-6">
              {t("select_quiz_desc") || "Escolha um quiz para iniciar a sala."}
            </p>

            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold opacity-80 block mb-1">
                  {t("host_category_filter")}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs font-bold focus:outline-none cursor-pointer mb-2 ${styles.input}`}
                >
                  <option value="all">
                    📂 {t("host_all_categories", { count: number(quizzes.length) })}
                  </option>
                  {QUIZ_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {categoryLabel(cat.id, cat.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold opacity-80 block mb-1">
                  {t("selected_quiz_label") || "Quiz Selecionado"}
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className={`w-full border rounded-xl p-3.5 text-sm font-bold focus:outline-none cursor-pointer shadow-sm ${styles.input}`}
                >
                  {filteredQuizzes.length === 0 ? (
                    <option disabled value="">
                      {t("host_empty_category")}
                    </option>
                  ) : (
                    filteredQuizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{categoryLabel(q.category, q.category || t("host_general"))}] {q.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div
                className={`p-3 border rounded-xl flex items-center gap-3 ${styles.subBox}`}
              >
                <input
                  type="checkbox"
                  id="arenaToggle"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="arenaToggle"
                  className="text-xs font-bold cursor-pointer select-none"
                >
                  ⚔️ {t("host_public_listing")}
                </label>
              </div>

              <button
                type="button"
                onClick={handleCreateSession}
                disabled={loading || !selectedQuizId}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer mt-2 disabled:opacity-50"
              >
                {loading
                  ? t("creating_room") || "A criar..."
                  : `👑 ${t("create_new_room_btn") || "Criar Sala"}`}
              </button>
            </div>
          </div>
        )}

        {/* LOBBY / SALA DE ESPERA */}
        {session && session.status === "AGUARDANDO" && (
          <div
            className={`border rounded-3xl p-6 md:p-8 space-y-6 transition-colors duration-300 ${styles.card}`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-inherit pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70 uppercase tracking-widest font-bold">
                    {t("room_pin_code") || "PIN DA SALA"}
                  </span>
                  {session.is_public && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                      ⚔️ {t("host_public_arena")}
                    </span>
                  )}
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 font-mono tracking-widest mt-1">
                  {session.pin}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWordCloudModal(true)}
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>☁️</span>
                  <span>{t("host_cloud_short")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickPulseModal(true)}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🌡️</span>
                  <span>{t("host_pulse_short")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(true)}
                  className={`px-4 py-3 border text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 ${styles.neutralBtn}`}
                >
                  <span>📱</span>
                  <span>
                    {t("qr_code_link")} ({number(players.length)}/{roomLimit})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-sm shadow-lg transition cursor-pointer"
                >
                  {t("start_match") || "Iniciar Partida"} 🚀
                </button>
              </div>
            </div>

            <div
              className={`border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${styles.subBox}`}
            >
              <div className="w-full truncate">
                <span className="text-[11px] opacity-70 font-bold uppercase block mb-1">
                  {t("direct_link_label") || "Link Direto:"}
                </span>
                <input
                  type="text"
                  readOnly
                  value={directGameLink}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none truncate ${styles.input}`}
                />
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {copiedLink
                  ? `✓ ${t("copied") || "Copiado!"}`
                  : `📋 ${t("copy_link") || "Copiar Link"}`}
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold">
                  {t("connected_students") || "Alunos Inscritos"}
                </h3>
                <span
                  className={`border px-3 py-1 rounded-full text-xs font-bold ${styles.subBox}`}
                >
                  {number(players.length)} / {roomLimit}{" "}
                  {t("connected") || "conectados"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="col-span-full text-center opacity-50 py-6 text-sm">
                    {t("waiting_students") ||
                      "Aguardando entrada de jogadores..."}
                  </p>
                ) : (
                  players.map((p) => (
                    <div
                      key={p.id}
                      className={`border p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold truncate shadow-sm group hover:border-rose-500/40 transition ${styles.subBox}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="opacity-70">👤</span>
                        <span className="truncate">{p.player_name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleKickPlayer(p.id, p.player_name)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-1 rounded-md opacity-60 hover:opacity-100 transition cursor-pointer ml-1"
                        title={t("host_remove_student")}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TELA DE PROJEÇÃO DA PERGUNTA (COM ATALHOS RÁPIDOS SEMPRE VISÍVEIS) */}
        {session && session.status === "EM_ANDAMENTO" && activeQuestionObj && (
          <div
            className={`border rounded-3xl p-6 md:p-8 space-y-6 transition-colors duration-300 ${styles.card}`}
          >
            {/* Barra de Status + Botões de Agilidade */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-inherit pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold opacity-60 uppercase tracking-widest">
                  {t("question") || "Questão"} {currentQuestionIndex + 1}{" "}
                  {t("of") || "de"} {questions.length}
                </span>
                {activeQuestionType === "fill_blanks" && (
                  <span className="bg-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    🧩 {t("host_fill_blanks")}
                  </span>
                )}
                {activeQuestionType === "sequence_order" && (
                  <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    🔀 {t("host_sequence")}
                  </span>
                )}
                {activeQuestionType === "true_false" && (
                  <span className="bg-emerald-500/20 text-emerald-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ⚡ {t("host_true_false")}
                  </span>
                )}
              </div>

              {/* Botões de Agilidade Imediata */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${styles.neutralBtn}`}
                  title={t("host_qr_shortcut")}
                >
                  <span>📱</span>
                  <span>
                    {t("host_qr_short")} ({number(players.length)}/{roomLimit})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWordCloudModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title={t("host_show_cloud")}
                >
                  <span>☁️</span>
                  <span>{t("host_cloud_short")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQuickPulseModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title={t("host_show_pulse")}
                >
                  <span>🌡️</span>
                  <span>{t("host_pulse_short")}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-sm ${primaryBtn.style}`}
                  title={t("host_primary_shortcut")}
                >
                  <span>{primaryBtn.icon}</span>
                  <span>{primaryBtn.label}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
                  title={t("host_next_shortcut")}
                >
                  <span>⏩</span>
                  <span>{t("next_btn")}</span>
                </button>

                <span
                  className={`font-mono font-black text-sm px-3 py-1 rounded-xl border ${
                    timer <= 5
                      ? "border-rose-500 text-rose-500 animate-pulse"
                      : styles.subBox
                  }`}
                >
                  ⏱️ {timer}s
                </span>
              </div>
            </div>

            {activeQuestionObj.image_url && (
              <div
                className={`w-full flex justify-center p-4 rounded-2xl border ${styles.imageWrapper}`}
              >
                <img
                  src={activeQuestionObj.image_url}
                  alt={t("host_question_image")}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="max-h-64 w-auto object-contain rounded-xl shadow-md"
                  onError={(e) => {
                    const originalUrl = activeQuestionObj.image_url;
                    if (!e.currentTarget.src.includes("wsrv.nl")) {
                      e.currentTarget.src = `https://wsrv.nl/?url=${encodeURIComponent(
                        originalUrl
                      )}&w=800&output=webp`;
                    } else {
                      e.currentTarget.style.display = "none";
                    }
                  }}
                />
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-extrabold leading-snug">
              {activeQuestionObj.question_text}
            </h2>

            {/* Estado 1: Antes do Play -> Opções ocultas */}
            {!hasStartedQuestion ? (
              <div
                className={`p-6 rounded-2xl border border-dashed text-center space-y-2 ${styles.subBox}`}
              >
                <p className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">
                  🔒 {t("host_options_hidden")}
                </p>
                <p className="text-xs opacity-70">
                  {t("host_options_hidden_help")}
                </p>
              </div>
            ) : (
              <>
                {activeQuestionType === "fill_blanks" && (
                  <div className="space-y-3">
                    {revealCorrectAnswer && (
                      <div className="p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500 text-sm font-extrabold text-emerald-500 animate-in fade-in duration-200">
                        ✅ {t("host_correct_sequence")}{" "}
                        {(activeOptionsData.correctSequence || []).join(
                          "  →  "
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-xs font-bold opacity-70 block">
                        {t("host_word_bank")}
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {(activeOptionsData.bank || []).map((word, idx) => (
                          <span
                            key={idx}
                            className={`px-4 py-2 rounded-xl border text-sm font-bold ${styles.subBox}`}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeQuestionType === "sequence_order" && (
                  <div className="space-y-2.5">
                    {revealCorrectAnswer ? (
                      <>
                        <span className="text-xs font-extrabold text-emerald-500 block">
                          ✅ {t("host_correct_order")}
                        </span>
                        {(activeOptionsData.correctOrder || []).map(
                          (step, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 text-emerald-500 text-sm font-bold flex items-center gap-3 animate-in fade-in duration-200"
                            >
                              <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-mono flex items-center justify-center">
                                {idx + 1}º
                              </span>
                              <span>{step}</span>
                            </div>
                          )
                        )}
                      </>
                    ) : (
                      <div
                        className={`p-5 rounded-xl border text-xs font-semibold opacity-75 text-center ${styles.subBox}`}
                      >
                        🔀 {t("host_ordering_steps", { count: number(activeOptionsData.correctOrder?.length) })}
                      </div>
                    )}
                  </div>
                )}

                {activeQuestionType === "true_false" && (
                  <div className="grid grid-cols-2 gap-4">
                    {["Verdadeiro", "Falso"].map((label, idx) => {
                      const isCorrectChoice =
                        Number(
                          activeOptionsData.correctIndex ??
                            activeQuestionObj.correct_option
                        ) === idx;
                      const highlight = revealCorrectAnswer && isCorrectChoice;

                      return (
                        <div
                          key={label}
                          className={`p-5 rounded-2xl border font-extrabold text-base flex items-center justify-between transition-all ${
                            highlight
                              ? "bg-emerald-500/15 border-2 border-emerald-500 text-emerald-500 shadow-md"
                              : styles.subBox
                          }`}
                        >
                          <span>{label}</span>
                          {highlight && <span>✅</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeQuestionType === "multiple_choice" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeOptionsData.map((opt, i) => {
                      const isCorrectChoice =
                        i === activeQuestionObj.correct_option;
                      const highlight = revealCorrectAnswer && isCorrectChoice;

                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-2xl border font-semibold text-base flex items-center justify-between transition-all ${
                            highlight
                              ? "bg-emerald-500/15 border-2 border-emerald-500 text-emerald-500 shadow-md"
                              : styles.subBox
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + i)}: {opt}
                          </span>
                          {highlight && <span>✅</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PÓDIO FINAL ANIMADO & RELATÓRIO PÓS-JOGO */}
        {session && session.status === "FINALIZADO" && (
          <div className="space-y-8">
            <div
              className={`border rounded-3xl p-8 text-center space-y-8 transition-colors duration-300 overflow-hidden print:hidden ${styles.card}`}
            >
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 tracking-wider">
                🏆 {t("final_podium_title") || "PÓDIO FINAL"} 🏆
              </h1>

              <div className="flex justify-center items-end gap-2 md:gap-3 h-64 pt-6 px-2 md:px-4 border-b border-inherit pb-4 overflow-hidden">
                <div
                  className={`w-1/3 flex flex-col items-center transition-all duration-700 transform ${
                    showPodium2
                      ? "translate-y-0 opacity-100 scale-100"
                      : "translate-y-full opacity-0 scale-95"
                  }`}
                >
                  <span className="text-xs font-bold truncate w-full mb-1">
                    {rankedPlayers[1] ? rankedPlayers[1].player_name : "---"}
                  </span>
                  <span className="text-[10px] opacity-70 font-mono font-bold mb-2">
                    {rankedPlayers[1] ? rankedPlayers[1].score || 0 : 0} pts
                  </span>
                  <div className="w-full h-36 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-xl border-t-4 border-slate-200 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-slate-800">
                      2º
                    </span>
                  </div>
                </div>

                <div
                  className={`w-1/3 flex flex-col items-center z-10 transition-all duration-700 transform ${
                    showPodium1
                      ? "translate-y-0 opacity-100 scale-105"
                      : "translate-y-full opacity-0 scale-95"
                  }`}
                >
                  <span className="text-2xl mb-1 animate-bounce">👑</span>
                  <span className="text-sm font-black truncate w-full mb-1">
                    {rankedPlayers[0] ? rankedPlayers[0].player_name : "---"}
                  </span>
                  <span className="text-xs text-amber-500 font-mono font-bold mb-2">
                    {rankedPlayers[0] ? rankedPlayers[0].score || 0 : 0} pts
                  </span>
                  <div className="w-full h-48 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-2xl border-t-4 border-yellow-200 flex items-center justify-center shadow-2xl">
                    <span className="text-4xl font-black text-slate-900">
                      1º
                    </span>
                  </div>
                </div>

                <div
                  className={`w-1/3 flex flex-col items-center transition-all duration-700 transform ${
                    showPodium3
                      ? "translate-y-0 opacity-100 scale-100"
                      : "translate-y-full opacity-0 scale-95"
                  }`}
                >
                  <span className="text-xs font-bold truncate w-full mb-1">
                    {rankedPlayers[2] ? rankedPlayers[2].player_name : "---"}
                  </span>
                  <span className="text-[10px] opacity-70 font-mono font-bold mb-2">
                    {rankedPlayers[2] ? rankedPlayers[2].score || 0 : 0} pts
                  </span>
                  <div className="w-full h-28 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-xl border-t-4 border-amber-500 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-white">3º</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RELATÓRIO PEDAGÓGICO (INCLUINDO NUVEM DE PALAVRAS & TERMÔMETRO) */}
            <div
              className={`border rounded-3xl p-8 space-y-8 transition-colors duration-300 print:border-none print:shadow-none print:p-0 ${styles.card}`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-inherit pb-6">
                <div>
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-widest block mb-1">
                    {t("host_report")}
                  </span>
                  <h2 className="text-2xl font-black">
                    {t("host_match_stats")}
                  </h2>
                  <p className="text-xs opacity-70 mt-1">
                    {t("host_report_summary", {
                      pin: session?.pin, students: number(players.length), questions: number(questions.length),
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    📊 {t("owner_visit_export")}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    📄 {t("host_print")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 border rounded-2xl space-y-1 ${styles.subBox}`}
                >
                  <span className="text-xs opacity-70 font-semibold">
                    {t("host_total_accuracy")}
                  </span>
                  <p className="text-2xl font-black text-emerald-500 font-mono">
                    {classAccuracyRate}%
                  </p>
                  <span className="text-[10px] opacity-60 block">
                    {t("host_correct_total", {
                      correct: number(totalGlobalCorrect), total: number(totalGlobalAnswers),
                    })}
                  </span>
                </div>

                <div className="p-4 border border-rose-500/30 bg-rose-500/5 rounded-2xl space-y-1">
                  <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                    ⚠️ {t("host_hardest")}
                  </span>
                  {hardestQuestion ? (
                    <div>
                      <p className="text-sm font-black line-clamp-1">
                        {t("question")} {number(hardestQuestion.index)}: {hardestQuestion.text}
                      </p>
                      <span className="text-[11px] text-rose-500 font-bold font-mono">
                        {t("host_rate_incorrect", { rate: number(hardestQuestion.errorRate), count: number(hardestQuestion.errorCount) })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs opacity-50">{t("host_no_data")}</p>
                  )}
                </div>

                <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-2xl space-y-1">
                  <span className="text-xs text-blue-500 font-bold flex items-center gap-1">
                    ✨ {t("host_easiest")}
                  </span>
                  {easiestQuestion ? (
                    <div>
                      <p className="text-sm font-black line-clamp-1">
                        {t("question")} {number(easiestQuestion.index)}: {easiestQuestion.text}
                      </p>
                      <span className="text-[11px] text-blue-500 font-bold font-mono">
                        {t("host_rate_correct", { rate: number(easiestQuestion.accuracy), count: number(easiestQuestion.correctCount) })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs opacity-50">{t("host_no_data")}</p>
                  )}
                </div>
              </div>

              {(wordCloudReport || quickPulseReport) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {wordCloudReport && (
                    <div
                      className={`p-5 border rounded-2xl space-y-3 ${styles.subBox}`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-500 block">
                        ☁️ {t("host_cloud")} • {t("host_submissions", { count: number(wordCloudReport.totalSubmissions) })}
                      </span>
                      <p className="text-xs font-bold opacity-80">
                        {t("host_topic")} &ldquo;{wordCloudReport.prompt}&rdquo;
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {wordCloudReport.words.slice(0, 12).map((w) => (
                          <span
                            key={w.word}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-xs font-extrabold"
                          >
                            {w.word} ({number(w.count)}×)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickPulseReport && (
                    <div
                      className={`p-5 border rounded-2xl space-y-3 ${styles.subBox}`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider text-amber-500 block">
                        🌡️ {t("host_pulse")} • {t("host_votes_total", { count: number(quickPulseReport.totalResponses) })}
                      </span>
                      <p className="text-xs font-bold opacity-80">
                        {t("host_prompt")} &ldquo;{quickPulseReport.question}&rdquo;
                      </p>
                      <div className="space-y-2">
                        {quickPulseReport.stats.map((s) => (
                          <div
                            key={s.id}
                            className="flex justify-between text-xs font-bold"
                          >
                            <span>
                              {s.icon} {t(s.label)}
                            </span>
                            <span className="font-mono">
                              {s.percent}% ({s.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {t("host_individual_report")}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-inherit opacity-70">
                        <th className="pb-3 font-bold">{t("arena_rank")}</th>
                        <th className="pb-3 font-bold">{t("host_student")}</th>
                        <th className="pb-3 font-bold">{t("arena_score")}</th>
                        <th className="pb-3 font-bold">{t("correct_hits")}</th>
                        <th className="pb-3 font-bold">{t("host_accuracy")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit font-medium">
                      {rankedPlayers.map((p, idx) => {
                        const pAnswers = answers.filter(
                          (a) => a.player_id === p.id
                        );
                        const pCorrect = pAnswers.filter(
                          (a) => a.is_correct
                        ).length;
                        const pRate =
                          pAnswers.length > 0
                            ? Math.round((pCorrect / pAnswers.length) * 100)
                            : 0;

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-purple-500/5 transition"
                          >
                            <td className="py-3 font-mono font-bold">
                              {idx === 0
                                ? "🥇 1º"
                                : idx === 1
                                ? "🥈 2º"
                                : idx === 2
                                ? "🥉 3º"
                                : `#${idx + 1}`}
                            </td>
                            <td className="py-3 font-bold">{p.player_name}</td>
                            <td className="py-3 font-mono font-bold text-amber-500">
                              {p.score || 0} pts
                            </td>
                            <td className="py-3 font-mono">
                              {pCorrect} / {pAnswers.length}
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                  pRate >= 70
                                    ? "bg-emerald-500/20 text-emerald-500"
                                    : pRate >= 40
                                    ? "bg-amber-500/20 text-amber-500"
                                    : "bg-rose-500/20 text-rose-500"
                                }`}
                              >
                                {pRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setNextQuizId(quizzes[0]?.id || "");
                    setShowNewQuizModal(true);
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3 px-8 rounded-xl transition shadow-lg text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔁</span> {t("host_replay_group")}
                </button>

                <Link
                  href="/"
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-md text-xs cursor-pointer text-center"
                >
                  {t("back_to_main_menu") || "Voltar ao Menu Principal"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ENTRADA (QR CODE, PIN, LINK E CONTADOR AO VIVO DE ALUNOS ATIVOS) */}
        {showEntryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div
              className={`border p-6 rounded-3xl max-w-sm w-full text-center space-y-5 relative transition-colors duration-300 ${styles.modalBox}`}
            >
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="absolute top-4 right-4 opacity-50 hover:opacity-100 font-bold cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold">
                📱 {t("student_entry_modal") || "Entrada de Alunos"}
              </h3>

              <div className="space-y-2.5">
                <span className="text-xs opacity-70 uppercase tracking-widest block font-bold">
                  {t("room_pin_code") || "PIN DA SALA"}
                </span>
                <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 font-mono tracking-wider">
                  {session?.pin}
                </p>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 text-xs font-extrabold shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {players.length === 0
                      ? t("host_waiting_capacity", { limit: roomLimit })
                      : t("host_students_online", { count: number(players.length), limit: roomLimit })}
                  </span>
                </div>

                {players.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1 max-h-16 overflow-y-auto">
                    {players.slice(0, 8).map((p) => (
                      <span
                        key={p.id}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${styles.subBox}`}
                      >
                        👤 {p.player_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner mx-auto w-48 h-48 border border-slate-200">
                {directGameLink && (
                  <QRCodeSVG value={directGameLink} size={160} />
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  readOnly
                  value={directGameLink}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none text-center truncate ${styles.input}`}
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink
                    ? `✓ ${t("link_copied_success") || "Copiado!"}`
                    : `📋 ${t("copy_direct_link") || "Copiar Link"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ROLETA */}
        {showRoulette && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div
              className={`border p-6 rounded-3xl max-w-sm w-full text-center space-y-4 relative transition-colors duration-300 ${styles.modalBox}`}
            >
              <button
                type="button"
                onClick={() => setShowRoulette(false)}
                className="absolute top-4 right-4 opacity-50 hover:opacity-100 font-bold cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold">
                {t("draw_winner_modal") || "Sortear Aluno"} 🎰
              </h3>
              <p className="text-xs opacity-70 font-semibold">
                {winnersList.length}{" "}
                {t("students_got_it_right") ||
                  "alunos acertaram esta questão"}
              </p>
              <div className={`py-8 rounded-2xl border ${styles.subBox}`}>
                <p className="text-2xl font-black text-emerald-500 min-h-[36px]">
                  {rouletteWinner || "---"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSpinRoulette}
                disabled={isSpinning}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition cursor-pointer"
              >
                {isSpinning
                  ? t("drawing") || "A sortear..."
                  : t("spin_roulette") || "Girar Roleta"}
              </button>
            </div>
          </div>
        )}

        {/* MODAL SELEÇÃO DE NOVO QUIZ */}
        {showNewQuizModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div
              className={`border p-6 rounded-3xl max-w-md w-full text-left space-y-5 relative transition-colors duration-300 ${styles.modalBox}`}
            >
              <button
                type="button"
                onClick={() => setShowNewQuizModal(false)}
                className="absolute top-4 right-4 opacity-50 hover:opacity-100 font-bold cursor-pointer"
              >
                ✕
              </button>

              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>🎯</span> {t("host_next_quiz")}
                </h3>
                <p className="text-xs opacity-70 mt-1">
                  {t("host_same_students", { count: number(players.length) })}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold opacity-80 block mb-1">
                    {t("host_choose_next")}
                  </label>
                  <select
                    value={nextQuizId}
                    onChange={(e) => setNextQuizId(e.target.value)}
                    className={`w-full border rounded-xl p-3 text-sm font-bold focus:outline-none cursor-pointer ${styles.input}`}
                  >
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.category || t("host_general")}] {q.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`p-3 border rounded-xl flex items-center gap-3 ${styles.subBox}`}
                >
                  <input
                    type="checkbox"
                    id="resetScoresCheck"
                    checked={resetScores}
                    onChange={(e) => setResetScores(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="resetScoresCheck"
                    className="text-xs font-bold cursor-pointer select-none"
                  >
                    {t("host_reset_scores")}
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleStartNextQuiz}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition cursor-pointer text-sm"
                >
                  {loading
                    ? t("host_preparing_round")
                    : t("host_start_new")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INTERAÇÕES AO VIVO DO INSTRUTOR (COM PERSISTÊNCIA NO RELATÓRIO) */}
        {session && (
          <>
            <LiveWordCloud
              sessionId={session.id}
              isHost={true}
              isOpen={showWordCloudModal}
              onClose={() => setShowWordCloudModal(false)}
              onWordsUpdate={setWordCloudReport}
            />
            <QuickPulseOverlay
              sessionId={session.id}
              isHost={true}
              isOpen={showQuickPulseModal}
              onClose={() => setShowQuickPulseModal(false)}
              onPulseUpdate={setQuickPulseReport}
            />
            <ArenaChat
              sessionId={session.id}
              playerName={
                user?.firstName || t("professor_label") || "Host / Professor"
              }
              userClerkId={user?.id}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function HostGamePage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-70px)] bg-slate-950 flex items-center justify-center text-white">
          {t("host_loading_room")}
        </div>
      }
    >
      <HostGameContent />
    </Suspense>
  );
}
