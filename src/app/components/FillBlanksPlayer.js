/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/FillBlanksPlayer.js
 * Objetivo: Renderizar questões interativas do tipo "Completar Lacunas" onde o
 * aluno preenche os espaços ("___") na sequência lógica clicando nas palavras
 * sugeridas no banco de termos.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";

export default function FillBlanksPlayer({
  questionText = "",
  bankWords = [],
  disabled = false,
  onSubmitSequence,
}) {
  // Divide o enunciado pelos marcadores "___"
  const textParts = useMemo(
    () => String(questionText).split("___"),
    [questionText]
  );
  const blanksCount = Math.max(0, textParts.length - 1);

  // Estado dos slots preenchidos (array de índices do banco de palavras)
  const [filledSlots, setFilledSlots] = useState([]);

  // Embaralha o banco de palavras apenas ao carregar a questão
  const shuffledBank = useMemo(() => {
    const items = bankWords.map((word, idx) => ({ id: idx, word }));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [bankWords]);

  useEffect(() => {
    setFilledSlots(Array(blanksCount).fill(null));
  }, [blanksCount, questionText]);

  // Seleciona uma palavra sugerida e preenche a próxima lacuna vazia na sequência
  const handleSelectWordFromBank = (bankItem) => {
    if (disabled) return;
    if (filledSlots.some((s) => s?.id === bankItem.id)) return;

    const firstEmptyIndex = filledSlots.findIndex((s) => s === null);
    if (firstEmptyIndex === -1) return;

    const updated = [...filledSlots];
    updated[firstEmptyIndex] = bankItem;
    setFilledSlots(updated);
  };

  // Remove a palavra de um slot específico devolvendo-a ao banco
  const handleClearSlot = (slotIdx) => {
    if (disabled) return;
    const updated = [...filledSlots];
    updated[slotIdx] = null;
    setFilledSlots(updated);
  };

  const isAllFilled =
    blanksCount > 0 && filledSlots.every((slot) => slot !== null);

  const handleConfirm = () => {
    if (!isAllFilled || disabled) return;
    const selectedSequence = filledSlots.map((slot) => slot.word);
    onSubmitSequence(selectedSequence);
  };

  return (
    <div className="space-y-5">
      {/* Enunciado Interativo com Lacunas Sequenciais */}
      <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--card-border)] text-base font-bold leading-loose text-center">
        {textParts.map((part, idx) => (
          <React.Fragment key={idx}>
            <span>{part}</span>
            {idx < blanksCount && (
              <button
                type="button"
                onClick={() => handleClearSlot(idx)}
                disabled={disabled || !filledSlots[idx]}
                title={
                  filledSlots[idx]
                    ? "Clique para remover esta palavra"
                    : `Lacuna #${idx + 1}`
                }
                className={`mx-1.5 px-3 py-1 rounded-xl border-2 border-dashed font-extrabold text-xs transition-all inline-flex items-center gap-1 align-middle ${
                  filledSlots[idx]
                    ? "bg-purple-600 text-white border-purple-400 border-solid shadow-sm cursor-pointer hover:bg-rose-600 hover:border-rose-400"
                    : "bg-amber-500/10 border-amber-500/50 text-amber-500 min-w-[90px] justify-center cursor-default"
                }`}
              >
                {filledSlots[idx] ? (
                  <>
                    <span>{filledSlots[idx].word}</span>
                    {!disabled && <span className="text-[10px] opacity-80">×</span>}
                  </>
                ) : (
                  <span>({idx + 1}) ___</span>
                )}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Banco de Palavras Sugeridas */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 block text-center">
          Toque nas palavras na ordem lógica para completar:
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {shuffledBank.map((item) => {
            const isUsed = filledSlots.some((s) => s?.id === item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || isUsed}
                onClick={() => handleSelectWordFromBank(item)}
                className={`px-4 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  isUsed
                    ? "opacity-30 border-slate-600 line-through cursor-not-allowed"
                    : "bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/40 shadow-sm active:scale-95"
                }`}
              >
                {item.word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botão de Confirmação da Sequência */}
      <button
        type="button"
        disabled={disabled || !isAllFilled}
        onClick={handleConfirm}
        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 text-sm transition cursor-pointer disabled:opacity-50"
      >
        ✔️ Confirmar Sequência
      </button>
    </div>
  );
}