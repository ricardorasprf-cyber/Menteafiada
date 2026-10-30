"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import AiQuizGeneratorModal from "@/app/components/AiQuizGeneratorModal";
import ImportQuizModal from "@/app/components/ImportQuizModal";
import { QUIZ_CATEGORIES } from "@/constants/categories";

export default function ManageQuizzesPage() {
  const { user } = useUser();
  const { t } = useLanguage();

  // Estados principais de visualização e controle de dados
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("my"); // "my" | "community" | "official"
  const [loading, setLoading] = useState(false);

  // Estados dos Modais de Criação, IA e Importação de Arquivo Estruturado
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState(QUIZ_CATEGORIES[0]?.id || "Concurso Público");
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Formulário Manual de Criação e Edição de Perguntas
  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(15);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const currentUserId = user?.id || "anonymous_teacher";
  const authorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "Professor";

  useEffect(() => {
    fetchQuizzes();
  }, [user, activeTab]);

  // 1. Carregar Quizzes consoante a Aba Ativa
  const fetchQuizzes = async () => {
    setLoading(true);
    let query = supabase
      .from("quizzes")
      .select("*, questions(id, image_url)")
      .order("created_at", { ascending: false });

    if (activeTab === "my") {
      query = query.eq("created_by", currentUserId);
    } else if (activeTab === "community") {
      query = query.eq("is_public", true).eq("is_official", false);
    } else if (activeTab === "official") {
      query = query.eq("is_official", true);
    }

    const { data, error } = await query;
    if (!error && data) {
      setQuizzes(data);
    }
    setLoading(false);
  };

  /**
   * Utilitário defensivo para inserção de quiz no Supabase.
   * Evita erros no schema cache do PostgREST.
   */
  const insertQuizDefensive = async (payload) => {
    let result = await supabase.from("quizzes").insert(payload).select().single();

    if (result.error && result.error.message?.includes("author_name")) {
      console.warn("[MenteAfiada] Schema sem 'author_name'. Retentando inserção com fallback.");
      const fallbackPayload = { ...payload };
      delete fallbackPayload.author_name;
      result = await supabase.from("quizzes").insert(fallbackPayload).select().single();
    }

    return result;
  };

  // 2. Criar Novo Quiz Manualmente
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    setLoading(true);

    const initialPayload = {
      title: newQuizTitle.trim(),
      category: newQuizCategory,
      created_by: currentUserId,
      author_name: authorName,
      is_public: false,
      is_official: false,
      is_arena_eligible: true,
    };

    const { data, error } = await insertQuizDefensive(initialPayload);

    if (!error && data) {
      setActiveTab("my");
      setQuizzes((prev) => [data, ...prev]);
      setSelectedQuiz(data);
      setQuestions([]);
      setNewQuizTitle("");
      setNewQuizCategory(QUIZ_CATEGORIES[0]?.id || "Concurso Público");
      setShowQuizModal(false);
    } else {
      alert("Erro ao criar quiz: " + (error?.message || "Erro desconhecido"));
    }
    setLoading(false);
  };

  // 3. Selecionar Quiz e carregar as perguntas vinculadas (garantindo o campo image_url)
  const handleSelectQuiz = async (quiz) => {
    setSelectedQuiz(quiz);
    setEditingQuestionId(null);
    resetQuestionForm();

    const { data, error } = await supabase
      .from("questions")
      .select("id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order")
      .eq("quiz_id", quiz.id)
      .order("question_order", { ascending: true });

    if (!error && data) {
      setQuestions(data);
    }
  };

  // 4. Alternar Visibilidade Pública/Privada do Quiz
  const toggleShareQuiz = async (quiz) => {
    if (quiz.created_by !== currentUserId) return;

    const updatedStatus = !quiz.is_public;
    const { error } = await supabase
      .from("quizzes")
      .update({ is_public: updatedStatus })
      .eq("id", quiz.id);

    if (!error) {
      const updatedList = quizzes.map((q) =>
        q.id === quiz.id ? { ...q, is_public: updatedStatus } : q
      );
      setQuizzes(updatedList);
      if (selectedQuiz?.id === quiz.id) {
        setSelectedQuiz({ ...selectedQuiz, is_public: updatedStatus });
      }
    } else {
      alert("Erro ao atualizar visibilidade: " + error.message);
    }
  };

  // 5. Clonar Quiz com perguntas e imagens
  const handleCloneQuiz = async (quizToClone) => {
    setLoading(true);

    const clonePayload = {
      title: `${quizToClone.title} (Cópia)`,
      category: quizToClone.category || "Conhecimentos Gerais",
      created_by: currentUserId,
      author_name: authorName,
      is_public: false,
      is_official: false,
      is_arena_eligible: true,
    };

    const { data: newQuiz, error: quizError } = await insertQuizDefensive(clonePayload);

    if (quizError || !newQuiz) {
      alert("Falha ao clonar quiz: " + (quizError?.message || ""));
      setLoading(false);
      return;
    }

    const { data: originalQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizToClone.id);

    if (originalQuestions && originalQuestions.length > 0) {
      const clonedQuestionsPayload = originalQuestions.map((q) => ({
        quiz_id: newQuiz.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        options: q.options,
        correct_option: q.correct_option,
        time_seconds: q.time_seconds,
        question_order: q.question_order,
      }));

      await supabase.from("questions").insert(clonedQuestionsPayload);
    }

    alert("Quiz clonado com sucesso para a aba 'Meus Quizzes'!");
    setActiveTab("my");
    setSelectedQuiz(newQuiz);
    setQuizzes((prev) => [newQuiz, ...prev]);
    handleSelectQuiz(newQuiz);
    setLoading(false);
  };

  // 6. Salvar ou Atualizar Pergunta Manualmente (com persistência de image_url)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();

    if (!selectedQuiz || selectedQuiz.created_by !== currentUserId) {
      alert("Você só pode editar questionários que você mesmo criou.");
      return;
    }

    if (!questionText.trim() || options.some((opt) => !opt.trim())) {
      alert(t("err_fill_options") || "Preencha a pergunta e todas as opções.");
      return;
    }

    setLoading(true);

    const sanitizedImageUrl = imageUrl.trim() ? imageUrl.trim() : null;

    if (editingQuestionId) {
      const { data, error } = await supabase
        .from("questions")
        .update({
          question_text: questionText.trim(),
          image_url: sanitizedImageUrl,
          options: options,
          correct_option: Number(correctOption),
          time_seconds: Number(timeSeconds),
        })
        .eq("id", editingQuestionId)
        .select()
        .single();

      if (!error && data) {
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestionId ? data : q)));
        resetQuestionForm();
      } else {
        alert("Erro ao atualizar pergunta: " + (error?.message || ""));
      }
    } else {
      const nextOrder = questions.length + 1;
      const { data, error } = await supabase
        .from("questions")
        .insert({
          quiz_id: selectedQuiz.id,
          question_text: questionText.trim(),
          image_url: sanitizedImageUrl,
          options: options,
          correct_option: Number(correctOption),
          time_seconds: Number(timeSeconds),
          question_order: nextOrder,
        })
        .select()
        .single();

      if (!error && data) {
        setQuestions((prev) => [...prev, data]);
        resetQuestionForm();
      } else {
        alert("Erro ao adicionar pergunta: " + (error?.message || ""));
      }
    }

    setLoading(false);
  };

  // 7. Receber e Gravar Questões Geradas pela IA
  const handleQuizGeneratedByAi = async (aiData) => {
    if (!aiData?.questions || aiData.questions.length === 0) return;

    setLoading(true);
    let targetQuizId = selectedQuiz?.id;

    if (!targetQuizId || selectedQuiz?.created_by !== currentUserId) {
      const resolvedCat = aiData.category || "Conhecimentos Gerais";

      const aiQuizPayload = {
        title: aiData.title || "Novo Quiz com IA",
        category: resolvedCat,
        created_by: currentUserId,
        author_name: authorName,
        is_public: false,
        is_official: false,
        is_arena_eligible: true,
      };

      const { data: newQuiz, error: quizErr } = await insertQuizDefensive(aiQuizPayload);

      if (quizErr || !newQuiz) {
        alert("Erro ao criar quiz gerado: " + (quizErr?.message || ""));
        setLoading(false);
        return;
      }

      targetQuizId = newQuiz.id;
      setActiveTab("my");
      setSelectedQuiz(newQuiz);
      setQuizzes((prev) => [newQuiz, ...prev]);
    }

    const startingOrder =
      selectedQuiz?.created_by === currentUserId ? questions.length : 0;

    const questionsToInsert = aiData.questions.map((q, idx) => {
      const correctIdx = q.options.findIndex((opt) => opt.is_correct === true);
      return {
        quiz_id: targetQuizId,
        question_text: q.question,
        image_url: null,
        options: q.options.map((opt) => opt.text),
        correct_option: correctIdx >= 0 ? correctIdx : 0,
        time_seconds: q.time_seconds || 20,
        question_order: startingOrder + idx + 1,
      };
    });

    const { data: insertedQuestions, error: insertErr } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select();

    if (!insertErr && insertedQuestions) {
      setQuestions((prev) =>
        selectedQuiz?.created_by === currentUserId
          ? [...prev, ...insertedQuestions]
          : insertedQuestions
      );
      fetchQuizzes();
    } else if (insertErr) {
      alert("Erro ao salvar questões da IA: " + insertErr.message);
    }

    setLoading(false);
  };

  // 8. Callback ao concluir importação estruturada (recarrega os dados do banco para garantir integridade)
  const handleImportComplete = async (newQuiz) => {
    setActiveTab("my");
    setSelectedQuiz(newQuiz);
    setQuizzes((prev) => [newQuiz, ...prev.filter((q) => q.id !== newQuiz.id)]);

    // Recarrega as questões do banco para garantir que image_url esteja presente em cada item
    const { data: freshQuestions } = await supabase
      .from("questions")
      .select("id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order")
      .eq("quiz_id", newQuiz.id)
      .order("question_order", { ascending: true });

    setQuestions(freshQuestions || []);
    resetQuestionForm();
    alert("Questionário e acervo integrados com sucesso!");
  };

  // 9. Edição de questão com preenchimento obrigatório e seguro da URL da Imagem
  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question_text || "");
    // Trata valores nulos, indefinidos ou strings vazias
    setImageUrl(q.image_url ? String(q.image_url).trim() : "");
    setOptions(Array.isArray(q.options) ? q.options : ["", "", "", ""]);
    setCorrectOption(typeof q.correct_option === "number" ? q.correct_option : 0);
    setTimeSeconds(q.time_seconds || 15);

    // Faz rolagem suave até o formulário de edição
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setImageUrl("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    setTimeSeconds(15);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm(t("confirm_del_question") || "Deseja eliminar esta pergunta?")) return;
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingQuestionId === id) resetQuestionForm();
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm(t("confirm_del_quiz") || "Deseja eliminar este quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", quizId);
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(null);
      setQuestions([]);
    }
  };

  const isOwner = selectedQuiz?.created_by === currentUserId;

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Cabeçalho Fixo */}
      <header className="bg-slate-900 py-4 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
              <img
                src="/logo-dark.jpeg"
                alt="Logo MenteAfiada"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Mente
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Afiada
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <LanguageSelector />
            <UserMenu userName={user?.firstName || "Professor"} userRole="creator" />
          </nav>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
              <span>📚</span> Banco de Questões & Quizzes
            </h1>
            <p className="text-sm font-medium text-[var(--foreground)] opacity-70 mt-1">
              Importe questões com imagens, explore o acervo oficial ou elabore questionários por categoria.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              title="Importar questões por JSON, CSV ou TXT com URLs de imagens"
            >
              <span>📥</span> Importar Arquivo
            </button>

            <button
              onClick={() => setShowAiModal(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
            >
              <span>✨</span> Gerar com IA
            </button>

            <Link
              href="/game/host"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              🎮 {t("create_room") || "Criar Sala"}
            </Link>

            <button
              onClick={() => setShowQuizModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              ➕ {t("create_new_quiz") || "Novo Quiz"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Painel Esquerdo: Lista e Abas */}
          <div className="lg:col-span-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-5 shadow-xl space-y-4">
            <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-2xl border border-[var(--card-border)]">
              <button
                onClick={() => {
                  setActiveTab("my");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "my"
                    ? "bg-purple-600 text-white shadow"
                    : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                }`}
              >
                Meus Quizzes
              </button>

              <button
                onClick={() => {
                  setActiveTab("community");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "community"
                    ? "bg-purple-600 text-white shadow"
                    : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                }`}
              >
                Comunidade
              </button>

              <button
                onClick={() => {
                  setActiveTab("official");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "official"
                    ? "bg-purple-600 text-white shadow"
                    : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                }`}
              >
                Oficial 🏛️
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {quizzes.length === 0 ? (
                <p className="text-xs text-[var(--foreground)] opacity-50 py-10 text-center">
                  {loading ? "A carregar acervo..." : "Nenhum quiz nesta categoria."}
                </p>
              ) : (
                quizzes.map((q) => {
                  const isSelected = selectedQuiz?.id === q.id;
                  const questionCount = q.questions ? q.questions.length : 0;
                  const cat = QUIZ_CATEGORIES.find((c) => c.id === q.category);

                  return (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuiz(q)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-500 shadow-md"
                          : "bg-[var(--background)] border-[var(--card-border)] text-[var(--foreground)] hover:border-purple-500"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? "bg-purple-800 text-purple-100"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {cat ? `${cat.icon} ${cat.label}` : q.category || "Geral"}
                          </span>
                          <h3 className="font-bold text-sm truncate">{q.title}</h3>
                          {q.is_official && <span title="Quiz Oficial">⭐</span>}
                        </div>
                        <p
                          className={`text-xs mt-1.5 flex items-center gap-2 ${
                            isSelected ? "text-purple-100" : "text-[var(--foreground)] opacity-70"
                          }`}
                        >
                          <span>📝 {questionCount} perguntas</span>
                          {q.author_name && <span>Por {q.author_name}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {activeTab === "my" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(q.id);
                            }}
                            className={`${
                              isSelected
                                ? "text-purple-200 hover:text-white"
                                : "text-rose-500 opacity-70 hover:opacity-100"
                            } p-1.5 transition text-xs cursor-pointer`}
                            title="Eliminar quiz"
                          >
                            🗑️
                          </button>
                        )}
                        {activeTab !== "my" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneQuiz(q);
                            }}
                            className="bg-purple-500/20 hover:bg-purple-500 text-purple-200 hover:text-white px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Clonar para Meus Quizzes"
                          >
                            📋 Copiar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Painel Direito: Exibição e Gerenciamento */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedQuiz ? (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-12 text-center text-[var(--foreground)] shadow-xl flex flex-col items-center justify-center min-h-[350px]">
                <span className="text-4xl block mb-4">👈</span>
                <p className="text-base font-bold opacity-80 mb-2">
                  Selecione um quiz ao lado para visualizar, editar ou clonar perguntas.
                </p>
                <p className="text-xs text-[var(--foreground)] opacity-60 max-w-md">
                  Importe simulados estruturados com imagens (.JSON, .CSV, .TXT) ou utilize a IA.
                </p>
              </div>
            ) : (
              <>
                {/* Banner de Identificação do Quiz */}
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white border border-purple-600 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                        {isOwner
                          ? "Seu Quiz Pessoal"
                          : `Quiz de ${selectedQuiz.author_name || "Comunidade"}`}
                      </span>
                      <span className="bg-purple-900/60 border border-purple-400/40 text-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        📂 {selectedQuiz.category || "Conhecimentos Gerais"}
                      </span>
                      {selectedQuiz.is_official && (
                        <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black">
                          OFICIAL
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold mt-1 text-white">{selectedQuiz.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <button
                        onClick={() => toggleShareQuiz(selectedQuiz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                          selectedQuiz.is_public
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500/30"
                            : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <span>{selectedQuiz.is_public ? "🌐 Público" : "🔒 Privado"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCloneQuiz(selectedQuiz)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        📋 Clonar para Editar
                      </button>
                    )}

                    <span className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-full text-xs font-black shadow">
                      {questions.length} questões
                    </span>
                  </div>
                </div>

                {/* Formulário de Pergunta com Preview Bidirecional da URL da Imagem */}
                {isOwner ? (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
                      <h3 className="text-md font-bold text-[var(--foreground)] flex items-center gap-2">
                        {editingQuestionId ? (
                          <>
                            <span>✏️</span> Editar Questão
                          </>
                        ) : (
                          <>
                            <span>➕</span> Adicionar Questão Manual
                          </>
                        )}
                      </h3>
                      {editingQuestionId && (
                        <button
                          type="button"
                          onClick={resetQuestionForm}
                          className="text-xs text-purple-500 font-bold hover:underline cursor-pointer"
                        >
                          Cancelar edição
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                          Enunciado da Pergunta
                        </label>
                        <input
                          type="text"
                          placeholder="Ex.: Qual é o significado da placa ilustrada?"
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                            URL da Imagem Ilustrativa (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://exemplo.com/imagem_placa.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                            Tempo Limite
                          </label>
                          <select
                            value={timeSeconds}
                            onChange={(e) => setTimeSeconds(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] font-bold rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value={10}>10 segundos</option>
                            <option value={15}>15 segundos</option>
                            <option value={20}>20 segundos</option>
                            <option value={30}>30 segundos</option>
                            <option value={60}>60 segundos</option>
                          </select>
                        </div>
                      </div>

                      {/* Exibição visual imediata quando a URL estiver preenchida */}
                      {imageUrl.trim().length > 0 && (
                        <div className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl flex items-center gap-3">
                          <img
                            src={imageUrl}
                            alt="Prévia da Questão"
                            className="w-16 h-16 rounded-xl object-contain border border-[var(--card-border)] bg-slate-900"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            onLoad={(e) => {
                              e.currentTarget.style.display = "block";
                            }}
                          />
                          <div className="text-xs truncate flex-1">
                            <span className="font-bold text-purple-400 block">Prévia da Imagem Carregada</span>
                            <span className="opacity-60 text-[11px] font-mono truncate block">{imageUrl}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block">
                          Alternativas (Marque o seletor da resposta correta)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 rounded-xl border ${
                                correctOption === idx
                                  ? "bg-emerald-500/10 border-emerald-500"
                                  : "bg-[var(--background)] border-[var(--card-border)]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="correctOption"
                                checked={correctOption === idx}
                                onChange={() => setCorrectOption(idx)}
                                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                              />
                              <span className="font-mono text-xs font-bold text-[var(--foreground)] opacity-70">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <input
                                type="text"
                                placeholder={`Opção ${String.fromCharCode(65 + idx)}`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...options];
                                  newOpts[idx] = e.target.value;
                                  setOptions(newOpts);
                                }}
                                className="w-full bg-transparent text-sm font-semibold text-[var(--foreground)] focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer text-sm"
                      >
                        {loading
                          ? "A processar..."
                          : editingQuestionId
                          ? "💾 Guardar Alterações"
                          : "➕ Adicionar Pergunta"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-xs text-purple-300 flex items-center justify-between">
                    <span>
                      💡 Este quiz pertence a outro autor. Para alterar suas perguntas, clique em{" "}
                      <strong>Clonar para Editar</strong>.
                    </span>
                  </div>
                )}

                {/* Lista de Questões Já Cadastradas com Exibição de Imagens */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--card-border)] pb-3">
                    Perguntas Registradas ({questions.length})
                  </h3>

                  {questions.length === 0 ? (
                    <p className="text-xs text-[var(--foreground)] opacity-50 py-4 text-center">
                      Nenhuma questão cadastrada para este quiz.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className={`p-4 bg-[var(--background)] border rounded-2xl flex items-center justify-between gap-4 transition ${
                            editingQuestionId === q.id
                              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5"
                              : "border-[var(--card-border)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {q.image_url ? (
                              <img
                                src={q.image_url}
                                alt="Ilustração da Questão"
                                className="w-14 h-14 rounded-xl object-contain border border-[var(--card-border)] flex-shrink-0 bg-slate-900"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[10px] text-slate-500 flex-shrink-0 font-bold">
                                Sem img
                              </div>
                            )}

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1.5">
                                <span>#{idx + 1} • {q.time_seconds}s</span>
                                {q.image_url && (
                                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded text-[9px]">
                                    🖼️ Com Imagem
                                  </span>
                                )}
                              </span>
                              <h4 className="font-bold text-sm text-[var(--foreground)]">
                                {q.question_text}
                              </h4>
                              <p className="text-xs text-emerald-500 font-semibold">
                                ✅ Correta: {q.options?.[q.correct_option] || "N/A"}
                              </p>
                            </div>
                          </div>

                          {isOwner && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditQuestion(q)}
                                className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--foreground)] rounded-lg text-xs font-bold transition cursor-pointer"
                                title="Editar esta questão e carregar dados no formulário"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/30 text-rose-500 rounded-lg text-xs font-bold transition cursor-pointer"
                                title="Eliminar pergunta"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Criação Manual de Quiz */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-3xl max-w-sm w-full space-y-4 relative shadow-2xl">
            <button
              onClick={() => setShowQuizModal(false)}
              className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-[var(--foreground)] text-center">
              Criar Novo Quiz
            </h3>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                  Categoria
                </label>
                <select
                  value={newQuizCategory}
                  onChange={(e) => setNewQuizCategory(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold cursor-pointer"
                >
                  {QUIZ_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                  Título do Quiz
                </label>
                <input
                  type="text"
                  placeholder="Ex: Legislação de Trânsito"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition cursor-pointer text-sm shadow-lg shadow-emerald-500/20"
              >
                {loading ? "A criar..." : "Criar Quiz"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerador com Inteligência Artificial */}
      <AiQuizGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onQuizGenerated={handleQuizGeneratedByAi}
      />

      {/* Modal de Importação Estruturada de Arquivos com Imagens */}
      <ImportQuizModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
        currentUserId={currentUserId}
        authorName={authorName}
      />
    </div>
  );
}