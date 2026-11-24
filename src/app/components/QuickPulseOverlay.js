/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/QuickPulseOverlay.js
 * Objetivo: Termômetro de Compreensão em Tempo Real (Pulso Rápido da Turma).
 * Permite ao instrutor verificar a qualquer momento o nível de entendimento
 * dos alunos com 3 opções visuais, gráfico de barras instantâneo e registro
 * automático no Relatório Final da Partida.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

const PULSE_OPTIONS = [
  {
    id: "understood",
    icon: "👍",
    label: "pulse_understood",
    barColor: "bg-emerald-500",
    btnStyle:
      "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500",
  },
  {
    id: "partial",
    icon: "🤔",
    label: "pulse_partial",
    barColor: "bg-amber-500",
    btnStyle:
      "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-500",
  },
  {
    id: "review",
    icon: "🔄",
    label: "pulse_review",
    barColor: "bg-rose-500",
    btnStyle:
      "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500",
  },
];

export function QuickPulseOverlay({
  sessionId,
  isHost = false,
  playerId = "anon",
  isOpen = false,
  onClose,
  onPulseUpdate,
}) {
  const { t, locale } = useLanguage();
  const [pulseDraft, setPulseQuestion] = useState(null);
  const pulseQuestion = pulseDraft ?? t("pulse_default");
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [votesMap, setVotesMap] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [channelRef, setChannelRef] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`quick-pulse-${sessionId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on("broadcast", { event: "pulse_start" }, ({ payload }) => {
        setActiveQuestion(payload.question);
        setVotesMap({});
        setMyVote(null);
      })
      .on("broadcast", { event: "pulse_stop" }, () => {
        setActiveQuestion(null);
        setMyVote(null);
      })
      .on("broadcast", { event: "pulse_vote" }, ({ payload }) => {
        if (!payload?.voterId || !payload?.optionId) return;
        setVotesMap((prev) => ({
          ...prev,
          [payload.voterId]: payload.optionId,
        }));
      })
      .subscribe();

    setChannelRef(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleStartPulse = async (e) => {
    e.preventDefault();
    if (!pulseQuestion.trim() || !channelRef) return;

    await channelRef.send({
      type: "broadcast",
      event: "pulse_start",
      payload: { question: pulseQuestion.trim() },
    });
  };

  const handleStopPulse = async () => {
    if (!channelRef) return;
    await channelRef.send({
      type: "broadcast",
      event: "pulse_stop",
      payload: {},
    });
    if (onClose) onClose();
  };

  const handleVote = async (optionId) => {
    if (!channelRef || !activeQuestion) return;
    setMyVote(optionId);

    await channelRef.send({
      type: "broadcast",
      event: "pulse_vote",
      payload: {
        voterId: playerId || `guest_${Math.random()}`,
        optionId,
      },
    });
  };

  const stats = useMemo(() => {
    const allVotes = Object.values(votesMap);
    const total = allVotes.length;

    return PULSE_OPTIONS.map((opt) => {
      const count = allVotes.filter((v) => v === opt.id).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { ...opt, count, percent };
    });
  }, [votesMap]);

  const totalResponses = Object.keys(votesMap).length;

  // Notifica o painel do anfitrião para registro no relatório final
  useEffect(() => {
    if (isHost && typeof onPulseUpdate === "function" && totalResponses > 0) {
      onPulseUpdate({
        question: activeQuestion || pulseQuestion,
        stats,
        totalResponses,
      });
    }
  }, [stats, totalResponses, activeQuestion, pulseQuestion, isHost, onPulseUpdate]);

  if (!isHost && !activeQuestion) return null;
  if (isHost && !isOpen && !activeQuestion) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[998] animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              🌡️ {t("pulse_live")}
            </span>
            <h2 className="text-xl font-black mt-1.5">
              {activeQuestion || t("pulse_start")}
            </h2>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={activeQuestion ? handleStopPulse : onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 text-xs font-bold cursor-pointer"
            >
              {t(activeQuestion ? "pulse_end" : "host_close")} ✕
            </button>
          )}
        </div>

        {isHost && !activeQuestion && (
          <form onSubmit={handleStartPulse} className="space-y-4">
            <div>
              <label className="text-xs font-bold opacity-80 block mb-1.5">
                {t("pulse_prompt_label")}
              </label>
              <input
                type="text"
                value={pulseQuestion}
                onChange={(e) => setPulseQuestion(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl shadow-lg text-sm cursor-pointer transition"
            >
              🌡️ {t("pulse_launch")}
            </button>
          </form>
        )}

        {!isHost && activeQuestion && (
          <div className="space-y-3">
            {PULSE_OPTIONS.map((opt) => {
              const isSelected = myVote === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVote(opt.id)}
                  className={`w-full p-4 rounded-2xl border text-left text-sm font-extrabold transition-all flex items-center justify-between cursor-pointer ${
                    opt.btnStyle
                  } ${isSelected ? "ring-4 ring-white/40 scale-[1.01]" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{opt.icon}</span>
                    <span>{t(opt.label)}</span>
                  </span>
                  {isSelected && <span className="text-xs">✓ {t("pulse_sent")}</span>}
                </button>
              );
            })}
          </div>
        )}

        {activeQuestion && (
          <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center text-xs font-bold opacity-75">
              <span>{t("pulse_results")}</span>
              <span>{t("pulse_responses", { count: totalResponses.toLocaleString(locale) })}</span>
            </div>

            <div className="space-y-3">
              {stats.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>
                      {item.icon} {t(item.label)}
                    </span>
                    <span className="font-mono">
                      {item.percent}% ({item.count})
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800/40 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.barColor}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickPulseOverlay;
