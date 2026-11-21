/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/SequenceOrderingPlayer.js
 * Objetivo: Componente interativo para questões do tipo "Ordenação Sequencial".
 * Permite ao aluno organizar etapas procedimentais, fluxos operacionais ou
 * eventos cronológicos na ordem lógica exata.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";

export default function SequenceOrderingPlayer({
  questionText = "",
  items = [],
  disabled = false,
  onSubmitOrder,
}) {
  // Embaralha os passos ao carregar a questão
  const shuffledItems = useMemo(() => {
    const list = items.map((label, idx) => ({ id: idx, label }));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [items]);

  const [orderedList, setOrderedList] = useState([]);

  useEffect(() => {
    setOrderedList([]);
  }, [questionText, items]);

  // Adiciona uma etapa ao final da sequência montada pelo aluno
  const handlePickStep = (stepObj) => {
    if (disabled) return;
    if (orderedList.some((s) => s.id === stepObj.id)) return;
    setOrderedList((prev) => [...prev, stepObj]);
  };

  // Remove uma etapa da sequência devolvendo-a ao banco
  const handleRemoveStep = (stepId) => {
    if (disabled) return;
    setOrderedList((prev) => prev.filter((s) => s.id !== stepId));
  };

  const isComplete = items.length > 0 && orderedList.length === items.length;

  const handleConfirm = () => {
    if (!isComplete || disabled) return;
    onSubmitOrder(orderedList.map((s) => s.label));
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-center leading-snug">
        {questionText}
      </h2>

      {/* Área da Sequência Ordenada pelo Aluno */}
      <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--card-border)] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-70">
          <span>Sua Sequência Lógica:</span>
          <span>
            {orderedList.length} / {items.length} etapas
          </span>
        </div>

        {orderedList.length === 0 ? (
          <div className="py-6 text-center border-2 border-dashed border-amber-500/30 rounded-xl text-xs opacity-60">
            Clique nas etapas abaixo na ordem correta (1º, 2º, 3º...)
          </div>
        ) : (
          <div className="space-y-2">
            {orderedList.map((step, index) => (
              <button
                key={step.id}
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveStep(step.id)}
                title="Clique para remover esta etapa da sequência"
                className="w-full p-3 rounded-xl bg-purple-600/15 border border-purple-500/40 text-left text-xs font-extrabold flex items-center justify-between gap-3 transition hover:bg-rose-500/15 hover:border-rose-500/40 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-mono font-black flex items-center justify-center flex-shrink-0">
                    {index + 1}º
                  </span>
                  <span>{step.label}</span>
                </div>
                {!disabled && (
                  <span className="text-[11px] opacity-60 font-bold">✕</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Banco de Etapas Disponíveis */}
      {orderedList.length < items.length && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 block text-center">
            Etapas Disponíveis (Selecione a próxima):
          </span>
          <div className="grid grid-cols-1 gap-2">
            {shuffledItems.map((step) => {
              const isSelected = orderedList.some((s) => s.id === step.id);
              if (isSelected) return null;

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePickStep(step)}
                  className="w-full p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-left text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-between"
                >
                  <span>{step.label}</span>
                  <span className="text-[10px] opacity-75">+ Selecionar</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão de Confirmação */}
      <button
        type="button"
        disabled={disabled || !isComplete}
        onClick={handleConfirm}
        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 text-sm transition cursor-pointer disabled:opacity-50"
      >
        ✔️ Confirmar Ordem Sequencial
      </button>
    </div>
  );
}