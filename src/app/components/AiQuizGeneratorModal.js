"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { QUIZ_CATEGORIES } from "@/constants/categories";

export default function AiQuizGeneratorModal({ isOpen, onClose, onQuizGenerated }) {
  const { language } = useLanguage();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState(QUIZ_CATEGORIES[0]?.id || "Concurso Público");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("médio");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg("Por favor, digite o tema ou assunto do quiz.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          category,
          count: Number(count),
          difficulty,
          language: language || "pt",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar o quiz.");
      }

      // Garante que o objeto gerado carregue a categoria selecionada
      const quizWithCategory = {
        ...data,
        category: data.category || category,
      };

      // Envia as perguntas geradas de volta para o estado do formulário principal
      onQuizGenerated(quizWithCategory);
      onClose();
      setTopic("");
    } catch (err) {
      setErrorMsg(err.message || "Erro ao conectar com a IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">✨</span>
            <h3 className="text-lg font-bold text-[var(--foreground)]">Gerar Quiz com IA</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--foreground)] opacity-70 mb-5 leading-relaxed">
          Escolha a categoria e informe o tema desejado. A IA elaborará perguntas, alternativas e o gabarito adequados ao contexto.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 text-xs font-medium">
          {/* Categoria */}
          <div>
            <label className="block text-[var(--foreground)] mb-1 font-semibold">
              Categoria do Quiz:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {QUIZ_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assunto / Tema */}
          <div>
            <label className="block text-[var(--foreground)] mb-1 font-semibold">
              Tema ou Conteúdo:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Direito Constitucional, Concordância Verbal, Revolução Francesa..."
              disabled={loading}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Quantidade e Nível */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--foreground)] mb-1 font-semibold">
                Nº de Perguntas:
              </label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={loading}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value={3}>3 perguntas</option>
                <option value={5}>5 perguntas</option>
                <option value={8}>8 perguntas</option>
                <option value={10}>10 perguntas</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--foreground)] mb-1 font-semibold">
                Dificuldade:
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={loading}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="fácil">Fácil</option>
                <option value="médio">Médio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] hover:bg-slate-800 py-2.5 rounded-xl transition cursor-pointer font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-bold shadow-lg shadow-purple-600/20"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>A criar quiz...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Gerar Perguntas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}