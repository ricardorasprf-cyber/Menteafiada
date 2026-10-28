"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

export const dynamic = "force-dynamic";

function GamePlayContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { t } = useLanguage();

  const urlPin = searchParams.get("pin") || "";
  const [pin, setPin] = useState(urlPin);
  const [playerName, setPlayerName] = useState(user?.firstName || "");
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

  const [showPodium3, setShowPodium3] = useState(false);
  const [showPodium2, setShowPodium2] = useState(false);
  const [showPodium1, setShowPodium1] = useState(false);

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

  useEffect(() => {
    if (session?.status === "FINALIZADO") {
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

  const playSoundEffect = (type) => {
    try {
      const sfxEnabled = localStorage.getItem("sfx_enabled") !== "false";
      if (!sfxEnabled) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "CORRECT") {
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
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
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
      }
    } catch (e) {
      console.log("Áudio não suportado.");
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

    setSession(sessionData);
    setTimeLeft(sessionData.time_left || 15);

    if (sessionData.quiz_id) {
      const { data: qData } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", sessionData.quiz_id)
        .order("question_order", { ascending: true });

      setQuestions(qData || []);
    } else {
      setQuestions([
        { question_text: "Qual é a capital do Brasil?", options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"], correct_option: 2, time_seconds: 15 },
        { question_text: "Quanto é 2 + 2 x 2?", options: ["8", "6", "4", "10"], correct_option: 1, time_seconds: 15 }
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

    subscribeToSession(sessionData.id);
  };

  const subscribeToSession = (sessionId) => {
    supabase
      .channel(`play-session-${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const updatedSession = payload.new;
        setSession((prevSession) => {
          if (prevSession && prevSession.current_question_index !== updatedSession.current_question_index) {
            setHasAnswered(false);
            setSelectedOption(null);
          }
          return updatedSession;
        });
        setTimeLeft(updatedSession.time_left || 15);
      })
      .subscribe();

    supabase
      .channel(`play-players-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${sessionId}` }, async () => {
        const { data } = await supabase.from("game_players").select("*").eq("session_id", sessionId).order("score", { ascending: false });
        if (data) setAllPlayers(data);
      })
      .subscribe();
  };

  useEffect(() => {
    let interval = null;
    if (session?.time_state === "RODANDO" && timeLeft > 0 && !hasAnswered) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [session?.time_state, timeLeft, hasAnswered]);

  const handleSelectOption = async (optionIdx) => {
    if (hasAnswered || session?.time_state !== "RODANDO") return;

    setSelectedOption(optionIdx);
    setHasAnswered(true);

    const currentQ = questions[session.current_question_index || 0];
    const isCorrect = optionIdx === currentQ?.correct_option;

    let basePoints = 0;
    let bonus = 0;
    let newStreak = 0;

    if (isCorrect) {
      newStreak = streak + 1;
      setStreak(newStreak);

      basePoints = 500 + Math.round(((timeLeft || 15) / 15) * 500);

      if (newStreak === 2) bonus = 100;
      else if (newStreak === 3) bonus = 200;
      else if (newStreak >= 4) bonus = 300;

      setStreakBonus(bonus);

      if (newStreak >= 2) {
        playSoundEffect("STREAK");
      } else {
        playSoundEffect("CORRECT");
      }
    } else {
      setStreak(0);
      setStreakBonus(0);
      playSoundEffect("WRONG");
    }

    const totalGained = basePoints + bonus;
    setScoreGained(totalGained);

    if (isCorrect) {
      const newScore = (player?.score || 0) + totalGained;
      setPlayer((prev) => ({ ...prev, score: newScore }));

      await supabase.from("game_players").update({ score: newScore }).eq("id", player.id);
    }

    await supabase.from("player_answers").insert({
      session_id: session.id,
      player_id: player.id,
      question_index: session.current_question_index || 0,
      selected_option: optionIdx,
      is_correct: isCorrect,
      score_gained: totalGained,
      time_left: timeLeft,
    });
  };

  const currentQuestion = questions[session?.current_question_index || 0];
  const rankedPlayers = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

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
                  <div className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--card-border)] px-3 py-1 rounded-full shadow-sm">
                    <span>⏱️</span>
                    <span className="font-mono text-amber-500 font-extrabold text-sm">{timeLeft}s</span>
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
                        className={`w-full p-4 font-bold rounded-2xl text-left text-sm transition flex items-center justify-between cursor-pointer text-white shadow-md ${colors[i % 4]} ${
                          hasAnswered || session.time_state !== "RODANDO" ? "opacity-60 cursor-not-allowed" : ""
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
                      className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl flex justify-between items-center text-xs font-semibold shadow-sm"
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
              <LanguageSelector />
              {user && <UserMenu userName={user.firstName || "Aluno"} userRole={userRole} />}
            </nav>
          </div>
        </header>
      </div>

      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex items-center justify-center">
        <div className="bg-[var(--card-bg)] w-full rounded-3xl p-8 shadow-2xl border border-[var(--card-border)] text-center transition-colors duration-300">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">{t("enter_quiz")}</h2>
          <p className="text-xs text-[var(--foreground)] opacity-70 mb-6 font-semibold">
            {urlPin ? `${t("connecting_pin")} ${urlPin}` : t("insert_pin")}
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold shadow-sm">
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
          </form>
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