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

export const dynamic = "force-dynamic";

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

  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

  // Sincronizar parâmetros de URL caso mudem dinamicamente
  useEffect(() => {
    if (urlPin) setPin(urlPin);
    if (urlName) setPlayerName(urlName);
  }, [urlPin, urlName]);

  // Inicializar preferência de áudio local
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

  // Efeitos ao finalizar o jogo: Pódio + Fanfarra + Confetes
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

      confetti({ particleCount: 25, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 25, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    }, 250);
  };

  // Motor Procedural de Efeitos Sonoros via Web Audio API
  const playSoundEffect = (type) => {
    try {
      if (!soundEnabled) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();

      if (type === "CLICK") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === "COUNTDOWN") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } else if (type === "CORRECT") {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
        });
      } else if (type === "WRONG") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "STREAK") {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.25);
        });
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
      console.log("Áudio não suportado ou bloqueado pelo navegador.");
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!pin.trim() || !playerName.trim()) {
      setErrorMsg(t("fill_name"));
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
      setErrorMsg(t("invalid_pin"));
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

    // Consulta segura através da view pública (sem correct_option)
    if (sessionData.quiz_id) {
      const { data: qData } = await supabase
        .from("public_quiz_questions")
        .select("*")
        .eq("quiz_id", sessionData.quiz_id)
        .order("question_order", { ascending: true });

      setQuestions(qData || []);
    } else {
      setQuestions([
        { id: "00000000-0000-0000-0000-000000000001", question_text: "Qual é a capital do Brasil?", options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"], time_seconds: 15 },
        { id: "00000000-0000-0000-0000-000000000002", question_text: "Quanto é 2 + 2 x 2?", options: ["8", "6", "4", "10"], time_seconds: 15 }
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
      setErrorMsg(t("join_error"));
      setLoading(false);
      return;
    }

    setPlayer(playerData);
    setLoading(false);

    subscribeToSession(sessionData.id, playerData.id);
  };

  const subscribeToSession = (sessionId, currentPlayerId) => {
    // 1. Escuta mudanças na sessão (perguntas, tempo, reinício com novo quiz)
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

          // Se o anfitrião carregou um novo quiz na mesma sala (via view pública)
          if (updatedSession.quiz_id && updatedSession.quiz_id !== session?.quiz_id) {
            const { data: newQData } = await supabase
              .from("public_quiz_questions")
              .select("*")
              .eq("quiz_id", updatedSession.quiz_id)
              .order("question_order", { ascending: true });

            if (newQData && newQData.length > 0) {
              setQuestions(newQData);
            }

            // Reseta animações de pódio caso venham de uma partida anterior
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

    // 2. Escuta eventos da tabela de jogadores (Expulsão e atualização via View LGPD anonimizada)
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

          // Consulta segura via view sem expor o clerk_id de outros participantes
          const { data } = await supabase
            .from("public_game_leaderboard")
            .select("*")
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

  // Cronômetro regressivo com bip sonoro nos últimos 5 segundos
  useEffect(() => {
    let interval = null;
    if (session?.time_state === "RODANDO" && timeLeft > 0 && !hasAnswered) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 5 && nextVal > 0) {
            playSoundEffect("COUNTDOWN");
          }
          return nextVal;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session?.time_state, timeLeft, hasAnswered, soundEnabled]);

  // Envio de Resposta com Validação Segura no PostgreSQL (RPC submit_player_answer)
  const handleSelectOption = async (optionIdx) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    playSoundEffect("CLICK");
    setSelectedOption(optionIdx);
    setHasAnswered(true);

    const currentQ = questions[session.current_question_index || 0];

    try {
      const { data, error } = await supabase.rpc("submit_player_answer", {
        p_session_id: session.id,
        p_player_id: player.id,
        p_question_id: currentQ.id,
        p_selected_option: optionIdx,
        p_time_left: timeLeft || 0,
      });

      if (error) {
        console.error("Erro na RPC submit_player_answer:", error.message);
        return;
      }

      if (data?.success) {
        const isCorrect = data.is_correct;
        const totalGained = data.points_earned || 0;
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
            playSoundEffect("STREAK");
          } else {
            playSoundEffect("CORRECT");
          }

          setPlayer((prev) => ({
            ...prev,
            score: (prev?.score || 0) + totalGained,
          }));
        } else {
          setStreak(0);
          setStreakBonus(0);
          playSoundEffect("WRONG");
        }
      }
    } catch (err) {
      console.error("Falha ao registrar resposta:", err);
    }
  };

  const currentQuestion = questions[session?.current_question_index || 0];
  const rankedPlayers = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

  // TELA VISUAL DE REMOÇÃO (KICK)
  if (wasKicked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[var(--card-bg)] border border-rose-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
            🚫
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[var(--foreground)]">
              Acesso Removido
            </h2>
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
            <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
              <div>
                <span className="text-xs text-[var(--foreground)] opacity-70">{t("player")}</span>
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
                <span className="text-xs text-[var(--foreground)] opacity-70">{t("points")}</span>
                <p className="font-mono font-bold text-amber-500">{player.score || 0} pts</p>
              </div>
            </div>

            {session.status === "AGUARDANDO" && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-block w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">{t("waiting_room_title")}</h3>
                <p className="text-xs text-[var(--foreground)] opacity-70">{t("waiting_room_desc")}</p>
              </div>
            )}

            {session.status === "EM_ANDAMENTO" && currentQuestion && (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--foreground)] opacity-70">
                    {t("question")} {(session.current_question_index || 0) + 1} {t("of")} {questions.length}
                  </span>
                  <div className={`flex items-center gap-1.5 bg-[var(--background)] border border-[var(--card-border)] px-3 py-1 rounded-full shadow-sm transition-all ${timeLeft <= 5 ? "border-rose-500 scale-105 animate-pulse" : ""}`}>
                    <span>⏱️</span>
                    <span className={`font-mono font-extrabold text-sm ${timeLeft <= 5 ? "text-rose-500" : "text-amber-500"}`}>{timeLeft}s</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[var(--foreground)] text-center min-h-[50px] flex items-center justify-center">
                  {currentQuestion.question_text}
                </h2>

                {session.time_state === "PAUSADO" && !hasAnswered && (
                  <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] text-center rounded-2xl shadow-sm">
                    <p className="text-sm font-semibold text-amber-500">{t("teacher_paused")}</p>
                    <p className="text-xs text-[var(--foreground)] opacity-70 mt-1">{t("prepare_options")}</p>
                  </div>
                )}

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
                        className={`w-full p-4 font-bold rounded-2xl text-left text-sm transition-all flex items-center justify-between cursor-pointer text-white shadow-md ${colors[i % 4]} ${
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

                {hasAnswered && (
                  <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] text-center space-y-1 animate-in zoom-in-95 duration-200 shadow-sm">
                    <p className="text-emerald-500 font-bold text-sm">{t("answer_registered")}</p>
                    {scoreGained > 0 ? (
                      <div>
                        <p className="text-xs text-amber-500 font-semibold">
                          🎉 {t("correct")} +{scoreGained} pts
                        </p>
                        {streakBonus > 0 && (
                          <p className="text-[11px] text-amber-500 font-bold mt-1 animate-bounce">
                            🔥 {t("streak_bonus")} (+{streakBonus} pts)!
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-500 font-semibold">❌ {t("incorrect")}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {session.status === "FINALIZADO" && (
              <div className="text-center py-6 space-y-6">
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
                  {t("game_over")}
                </h3>
                <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--card-border)] shadow-sm">
                  <p className="text-xs text-[var(--foreground)] opacity-70 font-bold">{t("final_score")}</p>
                  <p className="text-3xl font-black text-emerald-500 mt-1">{player.score || 0} pts</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-[var(--foreground)] opacity-70 font-bold uppercase tracking-widest text-left mb-3">
                    {t("top_3")}
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
                      <span className="text-[var(--foreground)]">
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

        {/* Chat ao Vivo da Arena com Moderação Ativa */}
        <ArenaChat
          sessionId={session.id}
          playerName={player.player_name}
          userClerkId={user?.id}
        />
      </div>
    );
  }

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
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">{t("enter_quiz")}</h2>
            <p className="text-xs text-[var(--foreground)] opacity-70 font-semibold">
              {urlPin ? `${t("connecting_pin")} ${urlPin}` : t("insert_pin")}
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
                  placeholder={t("pin_placeholder")}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] text-amber-500 font-mono font-bold text-center text-xl rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest shadow-sm"
                />
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder={t("name_placeholder")}
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
              {loading ? t("connecting") : t("enter_room")}
            </button>

            {/* Aviso de Privacidade e Minimização de Dados (LGPD - Menores) */}
            <p className="text-[10px] text-[var(--foreground)] opacity-50 text-center leading-normal pt-2">
              🔒 Ao entrar, você concorda com o uso do apelido apenas para a dinâmica da partida. 
              Nenhum dado pessoal sensível é exposto publicamente.
            </p>
          </form>

          {/* Atalho para a Arena de Competições Livres */}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-slate-900">Carregando jogo...</div>}>
      <GamePlayContent />
    </Suspense>
  );
}