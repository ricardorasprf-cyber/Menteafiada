"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { QUIZ_CATEGORIES } from "@/constants/categories";

export default function AiQuizGeneratorModal({ isOpen, onClose, onSaveQuiz, maxQuestions = 10 }) {
  const { language } = useLanguage();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState(QUIZ_CATEGORIES[0]?.id || "Concurso Público");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("médio");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [draft, setDraft] = useState(null);

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
          amount: Number(count),
          difficulty,
          language: language || "pt",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar o quiz.");
      }

      if (!Array.isArray(data.questions) || !data.questions.length ||
          data.questions.some((question) => !question || typeof question.question !== "string")) {
        throw new Error("A IA não retornou perguntas. Tente gerar novamente.");
      }

      setDraft({ title: typeof data.title === "string" && data.title.trim() ? data.title : topic, category, questions: data.questions });
    } catch (err) {
      setErrorMsg(err.message || "Erro ao conectar com a IA.");
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index, changes) => {
    setDraft((previous) => ({
      ...previous,
      questions: previous.questions.map((question, position) =>
        position === index ? { ...question, ...changes } : question
      ),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      await onSaveQuiz(draft);
      onClose();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = "w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">✨</span>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{draft ? "Revisar quiz gerado" : "Gerar Quiz com IA"}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!draft && <p className="text-xs text-[var(--foreground)] opacity-70 mb-5 leading-relaxed">
          Escolha a categoria e informe o tema desejado. A IA elaborará perguntas, alternativas e o gabarito adequados ao contexto.
        </p>}

        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {draft ? (
          <form onSubmit={handleSave} className="space-y-4 text-sm">
            <fieldset disabled={loading} className="space-y-4">
              <label className="block">
                Título
                <input className={fieldClass} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
              {draft.questions.map((question, index) => (
                <fieldset key={index} className="space-y-2 rounded-xl border border-[var(--card-border)] p-3">
                  <legend>Pergunta {index + 1}</legend>
                  <textarea aria-label={`Enunciado da pergunta ${index + 1}`} className={fieldClass} required value={question.question ?? ""} onChange={(e) => updateQuestion(index, { question: e.target.value })} />
                  {question.type === "true_false" ? (
                    <label className="block">
                      Gabarito
                      <select className={fieldClass} value={String(question.isTrue ?? "")} onChange={(e) => updateQuestion(index, { isTrue: e.target.value === "true" })}>
                        <option value="" disabled>Selecione a resposta</option>
                        <option value="true">Verdadeiro</option>
                        <option value="false">Falso</option>
                      </select>
                    </label>
                  ) : question.type === "fill_blanks" || question.type === "sequence_order" ? (
                    (question.type === "fill_blanks"
                      ? [["correctSequence", "Respostas das lacunas, uma por linha"], ["distractors", "Distratores, um por linha"]]
                      : [["correctOrder", "Etapas na ordem correta, uma por linha"]]
                    ).map(([field, label]) => (
                      <label key={field} className="block">
                        {label}
                        <textarea className={fieldClass} value={Array.isArray(question[field]) ? question[field].join("\n") : ""} onChange={(e) => updateQuestion(index, { [field]: e.target.value.split("\n") })} />
                      </label>
                    ))
                  ) : (
                    Array.from({ length: 4 }, (_, optionIndex) => {
                      const choices = Array.from({ length: 4 }, (_, position) => question.options?.[position] ?? {});
                      return (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input type="radio" name={`answer-${index}`} aria-label={`Marcar alternativa ${optionIndex + 1} como correta`} checked={choices[optionIndex].is_correct === true} onChange={() => updateQuestion(index, { options: choices.map((choice, position) => ({ ...choice, is_correct: position === optionIndex })) })} />
                          <input className={fieldClass} required aria-label={`Alternativa ${optionIndex + 1}`} value={choices[optionIndex].text ?? ""} onChange={(e) => updateQuestion(index, { options: choices.map((choice, position) => position === optionIndex ? { ...choice, text: e.target.value } : choice) })} />
                        </div>
                      );
                    })
                  )}
                  <label className="block">
                    Tempo em segundos
                    <input className={fieldClass} type="number" min="1" step="1" required value={question.time_seconds ?? 20} onChange={(e) => updateQuestion(index, { time_seconds: e.target.value })} />
                  </label>
                </fieldset>
              ))}
            </fieldset>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="submit" disabled={loading} className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                {loading ? "Salvando..." : "Salvar quiz"}
              </button>
            </div>
          </form>
        ) : (
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
              <input
                type="number"
                min="1"
                max={maxQuestions}
                required
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={loading}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
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
        )}
      </div>
    </div>
  );
}
