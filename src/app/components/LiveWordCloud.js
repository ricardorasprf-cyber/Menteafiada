/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/LiveWordCloud.js
 * Objetivo: Nuvem de Palavras interativa em tempo real para salas ao vivo.
 * Permite ao instrutor abrir uma rodada de brainstorming em qualquer ponto
 * da aula/quiz, visualizar as palavras dos alunos ganhando destaque
 * proporcional à frequência e enviar o histórico consolidado para o
 * Relatório Final da Partida.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

const CLOUD_PALETTE = [
  "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
  "text-purple-500 bg-purple-500/10 border-purple-500/30",
  "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  "text-amber-500 bg-amber-500/10 border-amber-500/30",
  "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
  "text-rose-500 bg-rose-500/10 border-rose-500/30",
];

export function LiveWordCloud({
  sessionId,
  isHost = false,
  playerName = "Participante",
  isOpen = false,
  onClose,
  onWordsUpdate,
}) {
  const { t, locale } = useLanguage();
  const [promptDraft, setPromptQuestion] = useState(null);
  const promptQuestion = promptDraft ?? t("cloud_default");
  const [activePrompt, setActivePrompt] = useState(null);
  const [wordsList, setWordsList] = useState([]);
  const [studentInput, setStudentInput] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [channelRef, setChannelRef] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`wordcloud-session-${sessionId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on("broadcast", { event: "wc_start" }, ({ payload }) => {
        setActivePrompt(payload.prompt);
        setWordsList([]);
        setSubmittedCount(0);
      })
      .on("broadcast", { event: "wc_stop" }, () => {
        setActivePrompt(null);
      })
      .on("broadcast", { event: "wc_submit" }, ({ payload }) => {
        if (!payload?.word) return;
        const normalized = String(payload.word).trim().toUpperCase();
        if (!normalized) return;

        setWordsList((prev) => [
          ...prev,
          {
            word: normalized,
            author: payload.author || "Anônimo",
            ts: Date.now(),
          },
        ]);
      })
      .subscribe();

    setChannelRef(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleStartCloud = async (e) => {
    e.preventDefault();
    if (!promptQuestion.trim() || !channelRef) return;

    await channelRef.send({
      type: "broadcast",
      event: "wc_start",
      payload: { prompt: promptQuestion.trim() },
    });
  };

  const handleStopCloud = async () => {
    if (!channelRef) return;
    await channelRef.send({
      type: "broadcast",
      event: "wc_stop",
      payload: {},
    });
    if (onClose) onClose();
  };

  const handleSendWord = async (e) => {
    e.preventDefault();
    const cleaned = studentInput.trim();
    if (!cleaned || !channelRef || submittedCount >= 3) return;

    await channelRef.send({
      type: "broadcast",
      event: "wc_submit",
      payload: {
        word: cleaned,
        author: playerName,
      },
    });

    setStudentInput("");
    setSubmittedCount((prev) => prev + 1);
  };

  const aggregatedWords = useMemo(() => {
    const map = new Map();
    wordsList.forEach((item) => {
      map.set(item.word, (map.get(item.word) || 0) + 1);
    });

    const entries = Array.from(map.entries()).map(([word, count], index) => ({
      word,
      count,
      colorClass: CLOUD_PALETTE[index % CLOUD_PALETTE.length],
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [wordsList]);

  // Notifica o painel do anfitrião para registro no relatório final
  useEffect(() => {
    if (isHost && typeof onWordsUpdate === "function" && aggregatedWords.length > 0) {
      onWordsUpdate({
        prompt: activePrompt || promptQuestion,
        words: aggregatedWords,
        totalSubmissions: wordsList.length,
      });
    }
  }, [aggregatedWords, activePrompt, promptQuestion, wordsList.length, isHost, onWordsUpdate]);

  const maxFrequency =
    aggregatedWords.length > 0 ? aggregatedWords[0].count : 1;

  if (!isHost && !activePrompt) {
    return null;
  }

  if (isHost && !isOpen && !activePrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[998] animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              ☁️ {t("cloud_live")}
            </span>
            <h2 className="text-xl md:text-2xl font-black mt-1.5">
              {activePrompt || t("cloud_start")}
            </h2>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={activePrompt ? handleStopCloud : onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 text-xs font-bold cursor-pointer"
            >
              {activePrompt ? t("cloud_stop") : `${t("host_close")} ✕`}
            </button>
          )}
        </div>

        {isHost && !activePrompt && (
          <form onSubmit={handleStartCloud} className="space-y-4">
            <div>
              <label className="text-xs font-bold opacity-80 block mb-1.5">
                {t("cloud_prompt_label")}
              </label>
              <input
                type="text"
                value={promptQuestion}
                onChange={(e) => setPromptQuestion(e.target.value)}
                placeholder={t("cloud_example")}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg text-sm cursor-pointer transition"
            >
              🚀 {t("cloud_project")}
            </button>
          </form>
        )}

        {!isHost && activePrompt && (
          <form onSubmit={handleSendWord} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                maxLength={28}
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                disabled={submittedCount >= 3}
                placeholder={
                  submittedCount >= 3
                    ? t("cloud_limit")
                    : t("cloud_input")
                }
                className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={!studentInput.trim() || submittedCount >= 3}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {t("cloud_submit")}
              </button>
            </div>
            <p className="text-[11px] opacity-60">
              {t("cloud_counter", { count: submittedCount.toLocaleString(locale) })}
            </p>
          </form>
        )}

        {activePrompt && (
          <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-6 min-h-[240px] flex flex-wrap items-center justify-center gap-3 content-center">
            {aggregatedWords.length === 0 ? (
              <div className="text-center space-y-2 opacity-60">
                <span className="text-4xl block animate-bounce">☁️</span>
                <p className="text-xs font-semibold">
                  {t("cloud_waiting")}
                </p>
              </div>
            ) : (
              aggregatedWords.map((item) => {
                const ratio = item.count / maxFrequency;
                const fontSizeRem = (0.85 + ratio * 1.4).toFixed(2);

                return (
                  <span
                    key={item.word}
                    style={{ fontSize: `${fontSizeRem}rem` }}
                    className={`px-3.5 py-1.5 rounded-2xl border font-black tracking-tight transition-all duration-300 shadow-sm inline-flex items-center gap-1.5 animate-in zoom-in-90 ${item.colorClass}`}
                  >
                    <span>{item.word}</span>
                    {item.count > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20">
                        {item.count}x
                      </span>
                    )}
                  </span>
                );
              })
            )}
          </div>
        )}

        {activePrompt && (
          <div className="flex items-center justify-between text-xs opacity-70 pt-1">
            <span>
              {t("cloud_total")}{" "}
              <strong>{wordsList.length}</strong>
            </span>
            <span>{t("cloud_unique")} {aggregatedWords.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveWordCloud;
