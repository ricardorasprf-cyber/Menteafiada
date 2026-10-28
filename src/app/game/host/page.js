"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";

export default function HostGamePage() {
  const { user } = useUser();
  const { t } = useLanguage();

  // Estados do Jogo
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  // Estados da Interface do Painel
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(15);
  const [timeState, setTimeState] = useState("PAUSADO");
  const [showPanelDetails, setShowPanelDetails] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hideNames, setHideNames] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Estados para Animação Sequencial do Pódio
  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

  // Inicializar preferência de áudio
  useEffect(() => {
    const savedSfx = localStorage.getItem("sfx_enabled");
    if (savedSfx !== null) {
      setSoundEnabled(savedSfx !== "false");
    }
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem("sfx_enabled", nextState ? "true" : "false");
  };

  // Motor Procedural de Efeitos Sonoros via Web Audio API
  const playSoundEffect = (type) => {
    try {
      if (!soundEnabled) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();

      if (type === "COUNTDOWN") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "NEXT_QUESTION") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "VICTORY") {
        const fanfare = [
          { f: 523.25, d: 0.12 },
          { f: 523.25, d: 0.12 },
          { f: 523.25, d: 0.12 },
          { f: 659.25, d: 0.35 },
          { f: 587.33, d: 0.15 },
          { f: 659.25, d: 0.15 },
          { f: 783.99, d: 0.55 },
        ];
        let start = ctx.currentTime;
        fanfare.forEach((item) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(item.f, start);
          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + item.d);
          start += item.d + 0.03;
        });
      }
    } catch (e) {
      console.log("Áudio não suportado ou bloqueado.");
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  // Efeito para acionar a Animação do Pódio + Fanfarra + Confetes de 20 segundos
  useEffect(() => {
    if (session?.status === "FINALIZADO") {
      playSoundEffect("VICTORY");
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
    const { data } = await supabase.from("quizzes").select("*");
    if (data && data.length > 0) {
      setQuizzes(data);
      setSelectedQuizId(data[0].id);
    } else {
      const defaultQuiz = [{ id: "11111111-1111-1111-1111-111111111111", title: "Conhecimentos Gerais - MenteAfiada" }];
      setQuizzes(defaultQuiz);
      setSelectedQuizId("11111111-1111-1111-1111-111111111111");
    }
  };

  const handleCreateSession = async () => {
    if (!selectedQuizId) return alert(t("alert_select_quiz"));

    setLoading(true);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();

    let qData = [];
    const { data } = await supabase.from("questions").select("*").eq("quiz_id", selectedQuizId).order("question_order", { ascending: true });

    if (data && data.length > 0) {
      qData = data;
    } else {
      qData = [
        { question_text: "Qual é a capital do Brasil?", options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"], correct_option: 2, time_seconds: 15 },
        { question_text: "Quanto é 2 + 2 x 2?", options: ["8", "6", "4", "10"], correct_option: 1, time_seconds: 15 }
      ];
    }

    setQuestions(qData);
    const initialTime = qData[0]?.time_seconds || 15;

    const { data: sessionData, error } = await supabase
      .from("game_sessions")
      .insert({
        pin: newPin,
        quiz_id: selectedQuizId === "11111111-1111-1111-1111-111111111111" ? null : selectedQuizId,
        host_id: user?.id || "host-anonymous",
        status: "AGUARDANDO",
        time_left: initialTime,
        time_state: "PAUSADO"
      })
      .select()
      .single();

    if (error) {
      alert(`${t("alert_room_error")}${error.message}`);
    } else if (sessionData) {
      setSession(sessionData);
      setTimer(initialTime);
      subscribeToRealtime(sessionData.id);
    }
    setLoading(false);
  };

  const subscribeToRealtime = (sessionId) => {
    supabase.channel(`host-players-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${sessionId}` }, async () => {
        const { data } = await supabase.from("game_players").select("*").eq("session_id", sessionId).order("score", { ascending: false });
        if (data) setPlayers(data);
      })
      .subscribe();

    supabase.channel(`host-answers-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "player_answers", filter: `session_id=eq.${sessionId}` }, async () => {
        const { data } = await supabase.from("player_answers").select("*").eq("session_id", sessionId);
        if (data) setAnswers(data);
      })
      .subscribe();
  };

  const handleStartGame = async () => {
    if (!session) return;
    playSoundEffect("NEXT_QUESTION");
    const { data } = await supabase.from("game_sessions").update({ status: "EM_ANDAMENTO", current_question_index: 0, time_state: "PAUSADO" }).eq("id", session.id).select().single();
    if (data) setSession(data);
  };

  const toggleTimeState = async () => {
    const newState = timeState === "RODANDO" ? "PAUSADO" : "RODANDO";
    setTimeState(newState);
    await supabase.from("game_sessions").update({ time_state: newState }).eq("id", session.id);
  };

  // Cronómetro com contagem decrescente sonora nos últimos 5 segundos
  useEffect(() => {
    let interval = null;
    if (timeState === "RODANDO" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 5 && nextVal > 0) {
            playSoundEffect("COUNTDOWN");
          }
          return nextVal;
        });
      }, 1000);
    } else if (timer === 0) {
      setTimeState("PAUSADO");
    }
    return () => clearInterval(interval);
  }, [timeState, timer, soundEnabled]);

  const handleNextQuestion = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx >= questions.length) {
      await supabase.from("game_sessions").update({ status: "FINALIZADO" }).eq("id", session.id);
      setSession((prev) => ({ ...prev, status: "FINALIZADO" }));
      return;
    }

    playSoundEffect("NEXT_QUESTION");
    const nextTime = questions[nextIdx]?.time_seconds || 15;
    setCurrentQuestionIndex(nextIdx);
    setTimer(nextTime);
    setTimeState("PAUSADO");

    await supabase.from("game_sessions").update({ current_question_index: nextIdx, time_left: nextTime, time_state: "PAUSADO" }).eq("id", session.id);
  };

  const handleEndGame = async () => {
    if (!confirm(t("alert_end_room"))) return;
    await supabase.from("game_sessions").update({ status: "FINALIZADO" }).eq("id", session.id);
    setSession((prev) => ({ ...prev, status: "FINALIZADO" }));
  };

  const directGameLink = session ? `${typeof window !== "undefined" ? window.location.origin : ""}/game/play?pin=${session.pin}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(directGameLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const winnersList = answers.filter((a) => a.question_index === currentQuestionIndex && a.is_correct).map((a) => {
    const p = players.find((player) => player.id === a.player_id);
    return p ? p.player_name : t("student_hash");
  });

  const handleSpinRoulette = () => {
    if (winnersList.length === 0) return alert(t("alert_no_winners"));
    setIsSpinning(true);
    setRouletteWinner(null);
    let count = 0;
    const interval = setInterval(() => {
      const randomWinner = winnersList[Math.floor(Math.random() * winnersList.length)];
      setRouletteWinner(randomWinner);
      count++;
      if (count >= 20) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 150);
  };

  const currentAnswers = answers.filter((a) => a.question_index === currentQuestionIndex);
  const correctCount = currentAnswers.filter((a) => a.is_correct).length;
  const wrongCount = currentAnswers.length - correctCount;
  const totalAnswersCount = currentAnswers.length;
  const correctPercent = totalAnswersCount > 0 ? Math.round((correctCount / totalAnswersCount) * 100) : 0;
  const wrongPercent = totalAnswersCount > 0 ? 100 - correctPercent : 0;

  const rankedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      
      {/* BLOCO SUPERIOR FIXO (Escuro Institucional) */}
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
              <button
                onClick={toggleSound}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                title="Ativar/Desativar Som"
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              <LanguageSelector />
              <UserMenu userName={user?.firstName || t("professor_label")} userRole="creator" />
            </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 mt-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4 group">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            {t("back_home")}
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                🎮 {t("host_panel_title")}
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1">
                {!session 
                  ? t("host_panel_desc_waiting") 
                  : t("host_panel_desc_active")}
              </p>
            </div>
            
            {session && session.status !== "FINALIZADO" && (
              <button 
                onClick={handleEndGame}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                {t("end_room")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (Adaptável Claro/Escuro) */}
      <main className="max-w-4xl mx-auto px-6 py-10 relative z-10 space-y-8">
        
        {/* CRIAR SALA */}
        {!session && (
          <div className="max-w-md mx-auto bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] text-center shadow-xl transition-colors duration-300">
            <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">{t("new_activity")}</h2>
            <p className="text-sm text-[var(--foreground)] opacity-70 mb-6">{t("select_quiz_desc")}</p>
            <div className="space-y-4 text-left">
              <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1">{t("selected_quiz_label")}</label>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3.5 text-sm font-bold focus:outline-none cursor-pointer shadow-sm"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <button onClick={handleCreateSession} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer mt-2">
                {loading ? t("creating_room") : `👑 ${t("create_new_room_btn")}`}
              </button>
            </div>
          </div>
        )}

        {/* LOBBY / SALA DE ESPERA */}
        {session && session.status === "AGUARDANDO" && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-[var(--card-border)] pb-6">
              <div>
                <span className="text-xs text-[var(--foreground)] opacity-70 uppercase tracking-widest font-bold">{t("room_pin_code")}</span>
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 font-mono tracking-widest mt-1">{session.pin}</h1>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowEntryModal(true)} className="px-4 py-3 bg-[var(--background)] border border-[var(--card-border)] hover:opacity-80 text-[var(--foreground)] text-sm font-bold rounded-xl shadow transition cursor-pointer">
                  📱 {t("qr_code_link")}
                </button>
                <button onClick={handleStartGame} className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-md shadow-lg transition cursor-pointer">
                  {t("start_match")} 🚀
                </button>
              </div>
            </div>

            <div className="bg-[var(--background)] border border-[var(--card-border)] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full truncate">
                <span className="text-[11px] text-[var(--foreground)] opacity-70 font-bold uppercase block mb-1">{t("direct_link_label")}</span>
                <input type="text" readOnly value={directGameLink} className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] font-mono focus:outline-none truncate" />
              </div>
              <button onClick={copyToClipboard} className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer">
                {copiedLink ? `✓ ${t("copied")}` : `📋 ${t("copy_link")}`}
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-[var(--foreground)]">{t("connected_students")}</h3>
                <span className="bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] px-3 py-1 rounded-full text-xs font-bold">
                  {players.length} {t("connected")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="col-span-full text-center text-[var(--foreground)] opacity-50 py-6 text-sm">{t("waiting_students")}</p>
                ) : (
                  players.map((p) => (
                    <div key={p.id} className="bg-[var(--background)] border border-[var(--card-border)] p-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] truncate shadow-sm">
                      <span className="opacity-70">👤</span> {p.player_name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAINEL DE CONTROLO DO PROFESSOR (EM_ANDAMENTO) */}
        {session && session.status === "EM_ANDAMENTO" && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-[var(--background)] border border-[var(--card-border)] px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--foreground)] opacity-80 flex items-center gap-1.5">
                  👤 {t("professor_label")}
                </span>
                <span className="bg-[var(--background)] border border-[var(--card-border)] px-3 py-1.5 rounded-lg text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  👤 {currentAnswers.length} {t("of")} {players.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShowEntryModal(true)} className="px-3 py-1.5 bg-[var(--background)] border border-[var(--card-border)] hover:opacity-80 text-[var(--foreground)] font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer">
                  🔲 {t("entry_btn")}
                </button>
                <button onClick={toggleTimeState} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer">
                  {timeState === "RODANDO" ? "⏸" : "▶"} {t("play_btn")}
                </button>
                <button onClick={handleNextQuestion} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer">
                  ⏩ {t("next_btn")}
                </button>
                <button onClick={() => setShowPanelDetails(!showPanelDetails)} className="px-2 py-1.5 bg-[var(--background)] border border-[var(--card-border)] hover:opacity-80 text-[var(--foreground)] text-xs rounded-lg cursor-pointer">
                  ⚙ {showPanelDetails ? "▲" : "▼"}
                </button>
              </div>
            </div>

            {showPanelDetails && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={toggleTimeState} className={`py-3 px-4 font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 ${timeState === "RODANDO" ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-white"}`}>
                    {timeState === "RODANDO" ? `⏸ ${t("pause_answers")}` : `▶ ${t("release_answers")}`}
                  </button>

                  <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 flex items-center justify-between text-xs shadow-sm">
                    <span className="text-[var(--foreground)] font-bold opacity-80">{t("music_label")}</span>
                    <select className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded px-2 py-1 text-[var(--foreground)] font-bold focus:outline-none cursor-pointer">
                      <option>{t("music_synth")}</option>
                      <option>{t("music_none")}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-3 flex items-center justify-between text-xs shadow-sm">
                  <span className="text-[var(--foreground)] font-bold opacity-80">{t("time_adjustment")}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTimer((prev) => Math.max(5, prev - 5))} className="px-3 py-1 bg-[var(--card-bg)] hover:opacity-80 text-[var(--foreground)] font-bold rounded-lg border border-[var(--card-border)] cursor-pointer">-5s</button>
                    <span className={`font-mono font-bold px-1 text-sm ${timer <= 5 ? "text-rose-500 animate-pulse" : "text-purple-500"}`}>{timer}s</span>
                    <button onClick={() => setTimer((prev) => prev + 5)} className="px-3 py-1 bg-[var(--card-bg)] hover:opacity-80 text-[var(--foreground)] font-bold rounded-lg border border-[var(--card-border)] cursor-pointer">+5s</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))} className="py-2.5 bg-[var(--background)] border border-[var(--card-border)] hover:opacity-80 text-[var(--foreground)] font-bold text-xs rounded-xl transition cursor-pointer">
                    ← {t("prev_question")}
                  </button>
                  <button onClick={handleNextQuestion} className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                    {t("next_question_arrow")} →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowRoulette(true)} className="py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-md">
                    ⚙ {t("draw_winner")}
                  </button>
                  <button onClick={() => setSession((prev) => ({ ...prev, status: "FINALIZADO" }))} className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md">
                    🏆 {t("finish_quiz")}
                  </button>
                </div>

                <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full border-4 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center font-bold text-sm text-[var(--foreground)]">
                    {totalAnswersCount}
                  </div>
                  <div className="text-xs space-y-1.5">
                    <span className="text-[var(--foreground)] font-bold block opacity-80">{t("question_performance")}</span>
                    <div className="flex items-center gap-2 font-bold text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {t("correct_hits")}: {correctPercent}% ({correctCount})
                    </div>
                    <div className="flex items-center gap-2 font-bold text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {t("wrong_hits")}: {wrongPercent}% ({wrongCount})
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--card-border)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">🏆 {t("partial_ranking")}</span>
                    <button onClick={() => setHideNames(!hideNames)} className="text-[10px] bg-[var(--background)] border border-[var(--card-border)] px-2.5 py-1 rounded text-[var(--foreground)] opacity-70 hover:opacity-100 font-bold cursor-pointer">
                      👁 {hideNames ? t("showing_names") : t("hiding_names")}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {players.length === 0 ? (
                      <p className="text-xs text-[var(--foreground)] opacity-50 italic">{t("no_answers_yet")}</p>
                    ) : (
                      players.slice(0, 5).map((p, idx) => (
                        <div key={p.id} className="flex justify-between items-center bg-[var(--background)] border border-[var(--card-border)] px-3 py-1.5 rounded-lg text-xs shadow-sm">
                          <span className="text-[var(--foreground)] font-bold">#{idx + 1} {hideNames ? `${t("student_hash")} #${idx + 1}` : p.player_name}</span>
                          <span className="font-mono text-emerald-500 font-bold">{p.score || 0} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARTÃO DA PERGUNTA NO HOST */}
        {session && session.status === "EM_ANDAMENTO" && questions[currentQuestionIndex] && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-4 transition-colors duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--foreground)] opacity-50 uppercase tracking-widest">{t("question")} {currentQuestionIndex + 1} {t("of")} {questions.length}</span>
              <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full border ${timer <= 5 ? "border-rose-500 text-rose-500 animate-pulse" : "border-[var(--card-border)] text-[var(--foreground)]"}`}>⏱️ {timer}s</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">{questions[currentQuestionIndex].question_text}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[currentQuestionIndex].options.map((opt, i) => (
                <div key={i} className={`p-3.5 rounded-xl border font-semibold text-sm flex items-center justify-between ${i === questions[currentQuestionIndex].correct_option ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "bg-[var(--background)] border-[var(--card-border)] text-[var(--foreground)]"}`}>
                  <span>{String.fromCharCode(65 + i)}: {opt}</span>
                  {i === questions[currentQuestionIndex].correct_option && <span>✅</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PÓDIO FINAL ANIMADO */}
        {session && session.status === "FINALIZADO" && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 shadow-xl text-center space-y-8 transition-colors duration-300 overflow-hidden">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 tracking-wider">🏆 {t("final_podium_title")} 🏆</h1>

            <div className="flex justify-center items-end gap-2 md:gap-3 h-64 pt-6 px-2 md:px-4 border-b border-[var(--card-border)] pb-4 overflow-hidden">
              
              {/* 2º LUGAR */}
              <div className={`w-1/3 flex flex-col items-center transition-all duration-700 transform ${showPodium2 ? "translate-y-0 opacity-100 scale-100" : "translate-y-full opacity-0 scale-95"}`}>
                <span className="text-xs font-bold text-[var(--foreground)] truncate w-full mb-1">
                  {rankedPlayers[1] ? rankedPlayers[1].player_name : "---"}
                </span>
                <span className="text-[10px] text-[var(--foreground)] opacity-70 font-mono font-bold mb-2">
                  {rankedPlayers[1] ? rankedPlayers[1].score || 0 : 0} pts
                </span>
                <div className="w-full h-36 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-xl border-t-4 border-slate-200 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-black text-slate-800">2º</span>
                </div>
              </div>

              {/* 1º LUGAR */}
              <div className={`w-1/3 flex flex-col items-center z-10 transition-all duration-700 transform ${showPodium1 ? "translate-y-0 opacity-100 scale-105" : "translate-y-full opacity-0 scale-95"}`}>
                <span className="text-2xl mb-1 animate-bounce">👑</span>
                <span className="text-sm font-black text-[var(--foreground)] truncate w-full mb-1">
                  {rankedPlayers[0] ? rankedPlayers[0].player_name : "---"}
                </span>
                <span className="text-xs text-amber-500 font-mono font-bold mb-2">
                  {rankedPlayers[0] ? rankedPlayers[0].score || 0 : 0} pts
                </span>
                <div className="w-full h-48 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-2xl border-t-4 border-yellow-200 flex items-center justify-center shadow-2xl">
                  <span className="text-4xl font-black text-slate-900">1º</span>
                </div>
              </div>

              {/* 3º LUGAR */}
              <div className={`w-1/3 flex flex-col items-center transition-all duration-700 transform ${showPodium3 ? "translate-y-0 opacity-100 scale-100" : "translate-y-full opacity-0 scale-95"}`}>
                <span className="text-xs font-bold text-[var(--foreground)] truncate w-full mb-1">
                  {rankedPlayers[2] ? rankedPlayers[2].player_name : "---"}
                </span>
                <span className="text-[10px] text-[var(--foreground)] opacity-70 font-mono font-bold mb-2">
                  {rankedPlayers[2] ? rankedPlayers[2].score || 0 : 0} pts
                </span>
                <div className="w-full h-28 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-xl border-t-4 border-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-black text-white">3º</span>
                </div>
              </div>
            </div>

            {/* LISTA DO 4º LUGAR EM DIANTE */}
            {rankedPlayers.length > 3 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 text-left">
                {rankedPlayers.slice(3).map((p, idx) => (
                  <div key={p.id} className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl flex justify-between items-center text-xs shadow-sm">
                    <span className="font-bold text-[var(--foreground)]">#{idx + 4} {p.player_name}</span>
                    <span className="font-mono font-bold text-emerald-500">{p.score || 0} pts</span>
                  </div>
                ))}
              </div>
            )}

            <Link href="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-md">
              {t("back_to_main_menu")}
            </Link>
          </div>
        )}

        {/* MODAL ENTRADA (QR CODE & LINK DIRETO) */}
        {showEntryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-3xl max-w-sm w-full text-center space-y-5 relative shadow-2xl transition-colors duration-300">
              <button onClick={() => setShowEntryModal(false)} className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold cursor-pointer">✕</button>
              <h3 className="text-xl font-bold text-[var(--foreground)]">📱 {t("student_entry_modal")}</h3>
              <div>
                <span className="text-xs text-[var(--foreground)] opacity-70 uppercase tracking-widest block mb-1 font-bold">{t("room_pin_code")}</span>
                <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 font-mono tracking-wider">{session?.pin}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner mx-auto w-48 h-48 border border-slate-200">
                {directGameLink && <QRCodeSVG value={directGameLink} size={160} />}
              </div>
              <div className="space-y-3">
                <input type="text" readOnly value={directGameLink} className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)] font-mono font-bold focus:outline-none text-center truncate" />
                <button onClick={copyToClipboard} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
                  {copiedLink ? `✓ ${t("link_copied_success")}` : `📋 ${t("copy_direct_link")}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ROLETA */}
        {showRoulette && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-3xl max-w-sm w-full text-center space-y-4 relative shadow-2xl transition-colors duration-300">
              <button onClick={() => setShowRoulette(false)} className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold cursor-pointer">✕</button>
              <h3 className="text-xl font-bold text-[var(--foreground)]">{t("draw_winner_modal")} 🎰</h3>
              <p className="text-xs text-[var(--foreground)] opacity-70 font-semibold">{winnersList.length} {t("students_got_it_right")}</p>
              <div className="py-8 bg-[var(--background)] rounded-2xl border border-[var(--card-border)]">
                <p className="text-2xl font-black text-emerald-500 min-h-[36px]">{rouletteWinner || "---"}</p>
              </div>
              <button onClick={handleSpinRoulette} disabled={isSpinning} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition cursor-pointer">
                {isSpinning ? t("drawing") : t("spin_roulette")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}