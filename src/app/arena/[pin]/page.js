/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/arena/[pin]/page.js
 * Objetivo: Sala Oficial de Batalha da Arena (/arena/[pin]):
 * - Permite ingresso apenas enquanto a sala estiver aguardando início ('waiting')
 *   ou para participantes já registrados naquela sessão (reconexão segura);
 * - Bloqueia entrada de novos competidores assim que a contagem regressiva
 *   de 5 minutos termina e a batalha começa;
 * - Garante trava anti-duplicação por questão em player_answers, impedindo
 *   que o participante saia e responda novamente para acumular pontos.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useTheme } from "@/app/components/ThemeProvider";
import confetti from "canvas-confetti";
import ArenaChat from "@/app/components/ArenaChat";
import { sounds } from "@/lib/soundEffects";

const ARENA_ROOM_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    card: "bg-white border-slate-200 shadow-2xl shadow-slate-200/60 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-900",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    card: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-100",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    card: "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.2)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-50",
  },
};

export default function ArenaBattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const pin = String(params?.pin || "").trim();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const styles = ARENA_ROOM_STYLES[theme] || ARENA_ROOM_STYLES["theme-classic"];

  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessClosedMsg, setAccessClosedMsg] = useState("");

  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [alreadyLocked, setAlreadyLocked] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [scoreGained, setScoreGained] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const playerDisplayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Competidor Arena";

  // Carrega questões do quiz oficial da Arena
  const loadQuestions = useCallback(async (quizId) => {
    if (!quizId) return;
    let { data } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("question_order", { ascending: true });

    if (!data || data.length === 0) {
      const { data: pub } = await supabase
        .from("public_quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });
      data = pub;
    }
    setQuestions(data || []);
  }, []);

  // Verifica se o competidor já respondeu à questão atual no banco
  const checkExistingAnswer = useCallback(
    async (sessionId, playerId, qIdx) => {
      if (!sessionId || !playerId) return;
      const { data: existing } = await supabase
        .from("player_answers")
        .select("id, selected_option")
        .eq("session_id", sessionId)
        .eq("player_id", playerId)
        .eq("question_index", Number(qIdx))
        .maybeSingle();

      if (existing) {
        setHasAnswered(true);
        setAlreadyLocked(true);
        setSelectedOption(existing.selected_option);
        setScoreGained(0);
      } else {
        setHasAnswered(false);
        setAlreadyLocked(false);
        setSelectedOption(null);
        setScoreGained(0);
      }
    },
    []
  );

  // Inicializa entrada na sala da Arena (bloqueando ingressos tardios após o início)
  useEffect(() => {
    if (!isLoaded || !pin) return;

    async function initArenaRoom() {
      setLoading(true);
      setAccessClosedMsg("");

      // Busca sala na game_rooms (ou game_sessions)
      const { data: arenaRoom } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("pin", pin)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!arenaRoom) {
        setAccessClosedMsg("Sala da Arena não encontrada ou já encerrada.");
        setLoading(false);
        return;
      }

      if (arenaRoom.status === "finished" || arenaRoom.status === "FINALIZADO") {
        setAccessClosedMsg("Esta batalha da Arena já foi finalizada.");
        setLoading(false);
        return;
      }

      // Verifica se o jogador já estava inscrito antes do fechamento dos portões
      let existingPlayer = null;
      if (user?.id) {
        const { data: byClerk } = await supabase
          .from("game_players")
          .select("*")
          .eq("session_id", arenaRoom.id)
          .eq("clerk_id", user.id)
          .maybeSingle();
        if (byClerk) existingPlayer = byClerk;
      }

      if (!existingPlayer && typeof window !== "undefined") {
        const savedId = window.localStorage.getItem(
          `menteafiada_arena_player_${arenaRoom.id}`
        );
        if (savedId) {
          const { data: bySaved } = await supabase
            .from("game_players")
            .select("*")
            .eq("id", savedId)
            .eq("session_id", arenaRoom.id)
            .maybeSingle();
          if (bySaved) existingPlayer = bySaved;
        }
      }

      // REGRA DE FECHAMENTO: Se a partida já começou ('in_progress') e o usuário não entrou nos 5 min antes, bloqueia!
      const isAlreadyStarted =
        arenaRoom.status === "in_progress" ||
        arenaRoom.status === "EM_ANDAMENTO";

      if (isAlreadyStarted && !existingPlayer) {
        setAccessClosedMsg(
          "🔒 O tempo de entrada (5 minutos antes do início) encerrou e esta batalha já está em andamento. Participe da próxima rodada oficial!"
        );
        setLoading(false);
        return;
      }

      let activePlayer = existingPlayer;
      if (!activePlayer) {
        const { data: created, error: createErr } = await supabase
          .from("game_players")
          .insert({
            session_id: arenaRoom.id,
            player_name: playerDisplayName,
            clerk_id: user?.id || null,
            score: 0,
          })
          .select("*")
          .single();

        if (createErr) {
          setAccessClosedMsg("Não foi possível registrar sua entrada na Arena.");
          setLoading(false);
          return;
        }
        activePlayer = created;
      }

      if (typeof window !== "undefined" && activePlayer?.id) {
        window.localStorage.setItem(
          `menteafiada_arena_player_${arenaRoom.id}`,
          activePlayer.id
        );
      }

      setRoom(arenaRoom);
      setPlayer(activePlayer);
      const qIdx = Number(arenaRoom.current_question_index || 0);
      setCurrentIdx(qIdx);

      await loadQuestions(arenaRoom.quiz_id);
      await checkExistingAnswer(arenaRoom.id, activePlayer.id, qIdx);

      const { data: rank } = await supabase
        .from("game_players")
        .select("id, player_name, score")
        .eq("session_id", arenaRoom.id)
        .order("score", { ascending: false });
      setPlayersList(rank || []);

      setLoading(false);
    }

    initArenaRoom();
  }, [
    isLoaded,
    pin,
    user?.id,
    playerDisplayName,
    loadQuestions,
    checkExistingAnswer,
  ]);

  // Realtime da sala da Arena
  useEffect(() => {
    if (!room?.id || !player?.id) return;

    const channel = supabase
      .channel(`arena-live-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${room.id}`,
        },
        async (payload) => {
          const updated = payload.new;
          setRoom(updated);
          const nextIdx = Number(updated.current_question_index || 0);
          setCurrentIdx(nextIdx);
          setTimeLeft(updated.time_left || 15);
          await checkExistingAnswer(room.id, player.id, nextIdx);

          if (updated.status === "finished" || updated.status === "FINALIZADO") {
            sounds.playVictory();
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
        },
        async () => {
          const { data: rank } = await supabase
            .from("game_players")
            .select("id, player_name, score")
            .eq("session_id", room.id)
            .order("score", { ascending: false });
          if (rank) setPlayersList(rank);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, player?.id, checkExistingAnswer]);

  // Submissão blindada de resposta na Arena
  const handleArenaAnswer = async (optIdx) => {
    if (hasAnswered || !room?.id || !player?.id) return;

    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    sounds.playClick();
    setHasAnswered(true);
    setSelectedOption(optIdx);

    const isCorrect = Number(currentQ.correct_option) === Number(optIdx);
    const gained = isCorrect ? 500 + Math.max(0, timeLeft) * 25 : 0;

    // Verifica no banco se já existe resposta registrada para esta questão
    const { data: dup } = await supabase
      .from("player_answers")
      .select("id")
      .eq("session_id", room.id)
      .eq("player_id", player.id)
      .eq("question_index", currentIdx)
      .maybeSingle();

    if (dup) {
      setAlreadyLocked(true);
      setScoreGained(0);
      return;
    }

    const { error: insErr } = await supabase.from("player_answers").insert({
      session_id: room.id,
      player_id: player.id,
      question_index: currentIdx,
      selected_option: Number(optIdx),
      is_correct: isCorrect,
      time_left: Math.max(0, timeLeft),
    });

    if (insErr && insErr.code === "23505") {
      setAlreadyLocked(true);
      setScoreGained(0);
      return;
    }

    setScoreGained(gained);
    if (isCorrect) {
      sounds.playCorrect();
      const { data: fresh } = await supabase
        .from("game_players")
        .select("score")
        .eq("id", player.id)
        .single();
      const newTotal = Number(fresh?.score || 0) + gained;

      setPlayer((prev) => ({ ...prev, score: newTotal }));
      await supabase
        .from("game_players")
        .update({ score: newTotal })
        .eq("id", player.id);
    } else {
      sounds.playWrong();
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center font-sans ${styles.mainBg}`}
      >
        <p className="text-sm font-bold animate-pulse">
          Conectando à Arena Oficial #{pin}...
        </p>
      </div>
    );
  }

  if (accessClosedMsg) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center p-6 font-sans ${styles.mainBg}`}
      >
        <div
          className={`max-w-md w-full border rounded-3xl p-8 text-center space-y-5 ${styles.card}`}
        >
          <span className="text-4xl block">🔒</span>
          <h1 className="text-xl font-black">Acesso à Rodada Encerrado</h1>
          <p className="text-xs opacity-75 leading-relaxed">{accessClosedMsg}</p>
          <Link
            href="/arena"
            className="inline-block w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
          >
            ← Voltar ao Cronograma da Arena
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const parsedOptions = Array.isArray(currentQuestion?.options)
    ? currentQuestion.options
    : typeof currentQuestion?.options === "string"
    ? JSON.parse(currentQuestion.options || "[]")
    : [];

  return (
    <div
      className={`min-h-[calc(100vh-70px)] px-4 sm:px-6 py-8 font-sans ${styles.mainBg}`}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className={`border rounded-3xl p-6 space-y-5 ${styles.card}`}
        >
          <div className="flex items-center justify-between border-b border-inherit pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">
                ⚔️ ARENA OFICIAL • PIN #{pin}
              </span>
              <p className="font-extrabold text-sm mt-0.5">
                {player?.player_name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] opacity-65 block">PONTUAÇÃO</span>
              <span className="font-mono font-black text-amber-500 text-lg">
                {player?.score || 0} pts
              </span>
            </div>
          </div>

          {room?.status === "waiting" && (
            <div className="text-center py-8 space-y-3">
              <div className="inline-block w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-black">
                Você garantiu sua vaga na Arena!
              </h2>
              <p className="text-xs opacity-75">
                Os portões fecham no horário exato da rodada. A batalha iniciará
                automaticamente em instantes.
              </p>
            </div>
          )}

          {(room?.status === "in_progress" ||
            room?.status === "EM_ANDAMENTO") &&
            currentQuestion && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold opacity-75">
                  <span>
                    Questão {currentIdx + 1} de {questions.length}
                  </span>
                  <span>🛡️ 1 resposta por questão</span>
                </div>

                <h2 className="text-lg font-bold text-center">
                  {currentQuestion.question_text}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {parsedOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleArenaAnswer(idx)}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-bold text-white transition cursor-pointer ${
                        [
                          "bg-rose-600 hover:bg-rose-500",
                          "bg-blue-600 hover:bg-blue-500",
                          "bg-amber-600 hover:bg-amber-500",
                          "bg-emerald-600 hover:bg-emerald-500",
                        ][idx % 4]
                      } ${hasAnswered ? "opacity-60 cursor-not-allowed" : ""} ${
                        selectedOption === idx ? "ring-4 ring-white" : ""
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </button>
                  ))}
                </div>

                {hasAnswered && (
                  <div
                    className={`p-4 rounded-2xl border text-center text-xs font-bold ${styles.subBox}`}
                  >
                    {alreadyLocked ? (
                      <span className="text-amber-500">
                        🔒 Resposta já registrada para esta questão!
                      </span>
                    ) : scoreGained > 0 ? (
                      <span className="text-emerald-500">
                        🎉 Correto! +{scoreGained} pts
                      </span>
                    ) : (
                      <span className="text-rose-500">
                        ❌ Resposta registrada! Aguarde a próxima questão.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

          {(room?.status === "finished" || room?.status === "FINALIZADO") && (
            <div className="text-center py-6 space-y-4">
              <h2 className="text-2xl font-black text-amber-500">
                🏆 Batalha Encerrada!
              </h2>
              <p className="text-sm font-bold">
                Pontuação Final: {player?.score || 0} pts
              </p>
              <div className="space-y-2 text-left">
                {playersList.slice(0, 5).map((p, i) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex justify-between text-xs font-bold ${styles.subBox}`}
                  >
                    <span>
                      {i + 1}º {p.player_name}
                    </span>
                    <span className="text-emerald-500">{p.score} pts</span>
                  </div>
                ))}
              </div>
              <Link
                href="/arena"
                className="inline-block w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-xs"
              >
                Voltar ao Ranking da Arena
              </Link>
            </div>
          )}
        </div>

        {room?.id && player?.player_name && (
          <ArenaChat
            sessionId={room.id}
            playerName={player.player_name}
            userClerkId={user?.id}
          />
        )}
      </div>
    </div>
  );
}