"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import AiQuizGeneratorModal from "@/app/components/AiQuizGeneratorModal";

export default function ManageQuizzesPage() {
  const { user } = useUser();
  const { t } = useLanguage();

  // Estados principais
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("my"); // "my" | "community" | "official"
  const [loading, setLoading] = useState(false);

  // Estados de formulário e modais
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Formulário de Pergunta Manual
  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(15);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const currentUserId = user?.id || "anonymous_teacher";
  const authorName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Professor";

  useEffect(() => {
    fetchQuizzes();
  }, [user, activeTab]);

  // 1. Carregar Quizzes consoante a Aba Ativa
  const fetchQuizzes = async () => {
    setLoading(true);
    let query = supabase.from("quizzes").select("*, questions(id)").order("created_at", { ascending: false });

    if (activeTab === "my") {
      query = query.eq("created_by", currentUserId);
    } else if (activeTab === "community") {
      query = query.eq("is_public", true).eq("is_official", false);
    } else if (activeTab === "official") {
      query = query.eq("is_official", true);
    }

    const { data } = await query;
    if (data) setQuizzes(data);
    setLoading(false);
  };

  // 2. Criar Novo Quiz Manualmente
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        title: newQuizTitle.trim(),
        created_by: currentUserId,
        author_name: authorName,
        is_public: false,
        is_official: false,
      })
      .select()
      .single();

    if (!error && data) {
      setActiveTab("my");
      setQuizzes([data, ...quizzes]);
      setSelectedQuiz(data);
      setQuestions([]);
      setNewQuizTitle("");
      setShowQuizModal(false);
    } else {
      alert("Erro ao criar quiz: " + (error?.message || "Erro desconhecido"));
    }
    setLoading(false);
  };

  // 3. Selecionar Quiz e carregar as perguntas
  const handleSelectQuiz = async (quiz) => {
    setSelectedQuiz(quiz);
    setEditingQuestionId(null);
    resetQuestionForm();

    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("question_order", { ascending: true });

    if (data) setQuestions(data);
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
      const updatedList = quizzes.map((q) => (q.id === quiz.id ? { ...q, is_public: updatedStatus } : q));
      setQuizzes(updatedList);
      if (selectedQuiz?.id === quiz.id) {
        setSelectedQuiz({ ...selectedQuiz, is_public: updatedStatus });
      }
    } else {
      alert("Erro ao atualizar visibilidade: " + error.message);
    }
  };

  // 5. Clonar Quiz da Comunidade / Banco Oficial para o Painel Pessoal
  const handleCloneQuiz = async (quizToClone) => {
    setLoading(true);

    const { data: newQuiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: `${quizToClone.title} (Cópia)`,
        created_by: currentUserId,
        author_name: authorName,
        is_public: false,
        is_official: false,
      })
      .select()
      .single();

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
        image_url: q.image_url,
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
    setLoading(false);
  };

  // 6. Guardar ou Atualizar Pergunta Manual
  const handleSaveQuestion = async (e) => {
    e.preventDefault();

    if (selectedQuiz.created_by !== currentUserId) {
      alert("Apenas pode editar quizzes que lhe pertençam.");
      return;
    }

    if (!questionText.trim() || options.some((opt) => !opt.trim())) {
      alert(t("err_fill_options") || "Preencha a pergunta e todas as opções.");
      return;
    }

    setLoading(true);

    if (editingQuestionId) {
      const { data, error } = await supabase
        .from("questions")
        .update({
          question_text: questionText.trim(),
          image_url: imageUrl.trim() || null,
          options: options,
          correct_option: Number(correctOption),
          time_seconds: Number(timeSeconds),
        })
        .eq("id", editingQuestionId)
        .select()
        .single();

      if (!error && data) {
        setQuestions(questions.map((q) => (q.id === editingQuestionId ? data : q)));
        resetQuestionForm();
      }
    } else {
      const nextOrder = questions.length + 1;
      const { data, error } = await supabase
        .from("questions")
        .insert({
          quiz_id: selectedQuiz.id,
          question_text: questionText.trim(),
          image_url: imageUrl.trim() || null,
          options: options,
          correct_option: Number(correctOption),
          time_seconds: Number(timeSeconds),
          question_order: nextOrder,
        })
        .select()
        .single();

      if (!error && data) {
        setQuestions([...questions, data]);
        resetQuestionForm();
      }
    }

    setLoading(false);
  };

  // 7. Guardar Perguntas Geradas por IA
  const handleQuizGeneratedByAi = async (aiData) => {
    if (!aiData?.questions || aiData.questions.length === 0) return;

    setLoading(true);
    let targetQuizId = selectedQuiz?.id;

    if (!targetQuizId || selectedQuiz?.created_by !== currentUserId) {
      const { data: newQuiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          title: aiData.title || "Novo Quiz com IA",
          created_by: currentUserId,
          author_name: authorName,
          is_public: false,
          is_official: false,
        })
        .select()
        .single();

      if (quizErr || !newQuiz) {
        alert("Erro ao criar quiz: " + (quizErr?.message || ""));
        setLoading(false);
        return;
      }

      targetQuizId = newQuiz.id;
      setActiveTab("my");
      setSelectedQuiz(newQuiz);
      setQuizzes((prev) => [newQuiz, ...prev]);
    }

    const startingOrder = selectedQuiz?.created_by === currentUserId ? questions.length : 0;
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
      setQuestions((prev) => (selectedQuiz?.created_by === currentUserId ? [...prev, ...insertedQuestions] : insertedQuestions));
      fetchQuizzes();
    }

    setLoading(false);
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question_text);
    setImageUrl(q.image_url || "");
    setOptions(q.options || ["", "", "", ""]);
    setCorrectOption(q.correct_option);
    setTimeSeconds(q.time_seconds || 15);
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
    setQuestions(questions.filter((q) => q.id !== id));
    if (editingQuestionId === id) resetQuestionForm();
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm(t("confirm_del_quiz") || "Deseja eliminar este quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", quizId);
    setQuizzes(quizzes.filter((q) => q.id !== quizId));
    if (selectedQuiz?.id === quizId) setSelectedQuiz(null);
  };

  const isOwner = selectedQuiz?.created_by === currentUserId;

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Header */}
      <header className="bg-slate-900 py-4 px-6 border-b border-slate-800">
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
            <UserMenu userName={user?.firstName || "Professor"} userRole="creator" />
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
              <span>📚</span> Banco de Questões & Quizzes
            </h1>
            <p className="text-sm font-medium text-[var(--foreground)] opacity-70 mt-1">
              Explore o acervo oficial, partilhe com outros docentes ou elabore questionários privados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
          {/* PAINEL ESQUERDO COM ABAS E TOOLTIPS */}
          <div className="lg:col-span-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-5 shadow-xl space-y-4">
            
            {/* Navegador de Abas com Tooltips Informativos ao passar o cursor */}
            <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-2xl border border-[var(--card-border)]">
              
              {/* Aba 1: Meus Quizzes */}
              <div className="relative group">
                <button
                  onClick={() => { setActiveTab("my"); setSelectedQuiz(null); }}
                  className={`w-full py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                    activeTab === "my" ? "bg-purple-600 text-white shadow" : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                  }`}
                >
                  Meus Quizzes
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 w-44 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded-xl shadow-xl text-center">
                  Os seus questionários privados. Apenas você pode editar e gerir.
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </div>
              </div>

              {/* Aba 2: Comunidade */}
              <div className="relative group">
                <button
                  onClick={() => { setActiveTab("community"); setSelectedQuiz(null); }}
                  className={`w-full py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                    activeTab === "community" ? "bg-purple-600 text-white shadow" : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                  }`}
                >
                  Comunidade
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 w-48 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded-xl shadow-xl text-center">
                  Quizzes públicos partilhados por outros professores para usar ou clonar.
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </div>
              </div>

              {/* Aba 3: Oficial */}
              <div className="relative group">
                <button
                  onClick={() => { setActiveTab("official"); setSelectedQuiz(null); }}
                  className={`w-full py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                    activeTab === "official" ? "bg-purple-600 text-white shadow" : "text-[var(--foreground)] opacity-70 hover:opacity-100"
                  }`}
                >
                  Oficial 🏛️
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 w-44 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded-xl shadow-xl text-center">
                  Acervo validado e curado pela administração da MenteAfiada.
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </div>
              </div>

            </div>

            {/* Lista de Quizzes da Aba Selecionada */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {quizzes.length === 0 ? (
                <p className="text-xs text-[var(--foreground)] opacity-50 py-10 text-center">
                  {loading ? "A carregar acervo..." : "Nenhum quiz nesta categoria."}
                </p>
              ) : (
                quizzes.map((q) => {
                  const isSelected = selectedQuiz?.id === q.id;
                  const questionCount = q.questions ? q.questions.length : 0;

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
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm truncate">{q.title}</h3>
                          {q.is_official && <span title="Quiz Oficial Validado">⭐</span>}
                        </div>
                        <p className={`text-xs mt-1 flex items-center gap-2 ${isSelected ? "text-purple-100" : "text-[var(--foreground)] opacity-70"}`}>
                          <span>📝 {questionCount} perguntas</span>
                          {q.author_name && <span>• Por {q.author_name}</span>}
                        </p>
                      </div>

                      {/* Botões contextuais da lista */}
                      <div className="flex items-center gap-1">
                        {activeTab === "my" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(q.id);
                            }}
                            className={`${isSelected ? "text-purple-200 hover:text-white" : "text-rose-500 opacity-70 hover:opacity-100"} p-1.5 transition text-xs cursor-pointer`}
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
                            title="Clonar para os meus quizzes"
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

          {/* PAINEL DIREITO: VISUALIZAÇÃO E EDIÇÃO */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedQuiz ? (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-12 text-center text-[var(--foreground)] shadow-xl flex flex-col items-center justify-center min-h-[350px]">
                <span className="text-4xl block mb-4">👈</span>
                <p className="text-base font-bold opacity-80 mb-2">
                  Selecione um quiz ao lado para visualizar, editar ou clonar perguntas.
                </p>
                <p className="text-xs text-[var(--foreground)] opacity-60 max-w-md">
                  Pode utilizar questionários partilhados pela comunidade ou gerar uma avaliação do zero com a inteligência artificial.
                </p>
              </div>
            ) : (
              <>
                {/* CABEÇALHO DO QUIZ SELECIONADO COM CONTROLOS */}
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white border border-purple-600 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                        {isOwner ? "Seu Quiz Pessoal" : `Quiz de ${selectedQuiz.author_name || "Comunidade"}`}
                      </span>
                      {selectedQuiz.is_official && (
                        <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black">
                          OFICIAL
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold mt-0.5 text-white">{selectedQuiz.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão de Alternar Público / Privado (Apenas para o Proprietário) */}
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

                {/* FORMULÁRIO DE EDIÇÃO (DISPONÍVEL APENAS PARA O CRIADOR) */}
                {isOwner ? (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
                      <h3 className="text-md font-bold text-[var(--foreground)]">
                        {editingQuestionId ? "✏️ Editar Questão" : "➕ Adicionar Questão Manual"}
                      </h3>
                      {editingQuestionId && (
                        <button
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
                          placeholder="Ex.: Qual é o resultado da expressão...?"
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                            URL da Imagem (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://exemplo.com/imagem.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
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

                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block">
                          Alternativas (Selecione o botão da resposta correta)
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
                        {loading ? "A processar..." : editingQuestionId ? "💾 Guardar Alterações" : "➕ Adicionar Pergunta"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-xs text-purple-300 flex items-center justify-between">
                    <span>💡 Este quiz pertence a outro autor. Para alterar as suas questões, clique em <strong>Clonar para Editar</strong>.</span>
                  </div>
                )}

                {/* LISTA DE PERGUNTAS REGISTADAS */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--card-border)] pb-3">
                    Perguntas Registadas
                  </h3>

                  {questions.length === 0 ? (
                    <p className="text-xs text-[var(--foreground)] opacity-50 py-4 text-center">
                      Nenhuma questão cadastrada para este quiz.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-purple-500 uppercase">
                              #{idx + 1} • {q.time_seconds}s
                            </span>
                            <h4 className="font-bold text-sm text-[var(--foreground)]">{q.question_text}</h4>
                            <p className="text-xs text-emerald-500 font-semibold">
                              ✅ Correta: {q.options[q.correct_option]}
                            </p>
                          </div>

                          {isOwner && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditQuestion(q)}
                                className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--foreground)] rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/30 text-rose-500 rounded-lg text-xs font-bold transition cursor-pointer"
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

      {/* Modal Novo Quiz Manual */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-3xl max-w-sm w-full space-y-4 relative shadow-2xl">
            <button
              onClick={() => setShowQuizModal(false)}
              className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-[var(--foreground)] text-center">Criar Novo Quiz</h3>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--foreground)] opacity-80 block mb-1.5">
                  Título do Quiz
                </label>
                <input
                  type="text"
                  placeholder="Ex: Biologia Marinha - Unidade 1"
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

      {/* Modal Gerador com IA */}
      <AiQuizGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onQuizGenerated={handleQuizGeneratedByAi}
      />
    </div>
  );
}