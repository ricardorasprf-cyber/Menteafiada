/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/quizzes/page.js
 * Objetivo: Gestão completa de questionários pedagógicos com 4 formatos:
 * 1. Múltipla Escolha (4 alternativas);
 * 2. Completar Lacunas ("___") com palavras sugeridas na sequência lógica;
 * 3. Ordenação Sequencial (etapas procedimentais / cronológicas);
 * 4. Verdadeiro ou Falso Relâmpago.
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/app/components/ThemeProvider";
import AiQuizGeneratorModal from "@/app/components/AiQuizGeneratorModal";
import ImportQuizModal from "@/app/components/ImportQuizModal";
import { QUIZ_CATEGORIES } from "@/constants/categories";

const QUIZZES_PAGE_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    cardPanel:
      "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    tabsContainer: "bg-slate-100 border-slate-200",
    tabInactive: "text-slate-600 hover:text-slate-900",
    quizItemDefault:
      "bg-slate-50 border-slate-200 text-slate-900 hover:border-indigo-400",
    quizItemSelected:
      "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20",
    quizBanner:
      "bg-gradient-to-r from-indigo-700 to-purple-800 border-indigo-600 text-white shadow-xl",
    inputField:
      "bg-slate-50 border-slate-300 text-slate-900 focus:ring-indigo-500",
    questionCard: "bg-slate-50 border-slate-200",
    questionCardEditing:
      "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/70",
    iconBtn:
      "bg-white border-slate-200 hover:bg-slate-100 text-slate-700",
    modalBox: "bg-white border-slate-200 text-slate-900 shadow-2xl",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    cardPanel:
      "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/50 text-slate-100",
    tabsContainer: "bg-slate-950/80 border-slate-800",
    tabInactive: "text-slate-400 hover:text-white",
    quizItemDefault:
      "bg-slate-950/70 border-slate-800 text-slate-100 hover:border-purple-500",
    quizItemSelected:
      "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20",
    quizBanner:
      "bg-gradient-to-r from-purple-700 to-indigo-800 border-purple-600 text-white shadow-xl",
    inputField:
      "bg-slate-950 border-slate-800 text-slate-100 focus:ring-purple-500",
    questionCard: "bg-slate-950/70 border-slate-800",
    questionCardEditing:
      "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10",
    iconBtn:
      "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200",
    modalBox: "bg-[#111625] border-slate-800 text-slate-100 shadow-2xl",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    cardPanel:
      "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(192,38,211,0.15)] text-cyan-50",
    tabsContainer: "bg-[#040612] border-cyan-500/30",
    tabInactive: "text-cyan-200/70 hover:text-cyan-200",
    quizItemDefault:
      "bg-[#040612]/90 border-indigo-500/30 text-cyan-50 hover:border-cyan-400",
    quizItemSelected:
      "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_20px_rgba(217,70,239,0.4)]",
    quizBanner:
      "bg-gradient-to-r from-fuchsia-950 via-[#101438] to-cyan-950 border-fuchsia-500/50 text-white shadow-[0_0_35px_rgba(217,70,239,0.25)]",
    inputField:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500",
    questionCard: "bg-[#040612]/85 border-indigo-500/30",
    questionCardEditing:
      "border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-500/10",
    iconBtn:
      "bg-[#0b0f26] border-cyan-500/40 hover:border-fuchsia-400 text-cyan-200",
    modalBox:
      "bg-[#090d22] border-fuchsia-500/50 text-cyan-50 shadow-[0_0_40px_rgba(217,70,239,0.3)]",
  },
};

export default function ManageQuizzesPage() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const styles =
    QUIZZES_PAGE_STYLES[theme] || QUIZZES_PAGE_STYLES["theme-classic"];

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("my");
  const [loading, setLoading] = useState(false);
  const [togglingOfficial, setTogglingOfficial] = useState(false);

  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState(
    QUIZ_CATEGORIES[0]?.id || "Concurso Público"
  );
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Format: "multiple_choice" | "fill_blanks" | "sequence_order" | "true_false"
  const [questionFormat, setQuestionFormat] = useState("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(20);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Campos para Completar Lacunas
  const [correctBlanksText, setCorrectBlanksText] = useState("");
  const [distractorBlanksText, setDistractorBlanksText] = useState("");

  // Campos para Ordenação Sequencial
  const [sequenceSteps, setSequenceSteps] = useState(["", "", "", ""]);

  // Campo para Verdadeiro ou Falso
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(0); // 0 = Verdadeiro, 1 = Falso

  const currentUserId = user?.id || "anonymous_teacher";
  const authorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "Professor";

  useEffect(() => {
    if (isLoaded) {
      fetchQuizzes();
    }
  }, [user, activeTab, isLoaded]);

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

  const insertQuizDefensive = async (payload) => {
    let result = await supabase
      .from("quizzes")
      .insert(payload)
      .select()
      .single();

    if (result.error && result.error.message?.includes("author_name")) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.author_name;
      result = await supabase
        .from("quizzes")
        .insert(fallbackPayload)
        .select()
        .single();
    }

    return result;
  };

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

  const handleSelectQuiz = async (quiz) => {
    setSelectedQuiz(quiz);
    setEditingQuestionId(null);
    resetQuestionForm();

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order"
      )
      .eq("quiz_id", quiz.id)
      .order("question_order", { ascending: true });

    if (!error && data) {
      setQuestions(data);
    }
  };

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

  const handleToggleOfficialStatus = async (quiz) => {
    setTogglingOfficial(true);
    const newStatus = !quiz.is_official;

    try {
      const res = await fetch("/api/admin/toggle-official", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          isOfficial: newStatus,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        atualizarQuizNaLista(quiz.id, newStatus);
      } else {
        const { error: sbError } = await supabase
          .from("quizzes")
          .update({ is_official: newStatus })
          .eq("id", quiz.id);

        if (!sbError) {
          atualizarQuizNaLista(quiz.id, newStatus);
        } else {
          alert(
            "Não foi possível atualizar o status oficial: " +
              (json.error || sbError.message)
          );
        }
      }
    } catch (err) {
      const { error: sbError } = await supabase
        .from("quizzes")
        .update({ is_official: newStatus })
        .eq("id", quiz.id);

      if (!sbError) {
        atualizarQuizNaLista(quiz.id, newStatus);
      } else {
        alert("Erro ao atualizar o questionário.");
      }
    } finally {
      setTogglingOfficial(false);
    }
  };

  const atualizarQuizNaLista = (quizId, newStatus) => {
    const updated = quizzes.map((q) =>
      q.id === quizId ? { ...q, is_official: newStatus } : q
    );
    setQuizzes(updated);

    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz({ ...selectedQuiz, is_official: newStatus });
    }

    alert(
      newStatus
        ? "⭐ Questionário homologado como OFICIAL DA ARENA com sucesso!"
        : "Questionário removido da listagem oficial."
    );
  };

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

    const { data: newQuiz, error: quizError } =
      await insertQuizDefensive(clonePayload);

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

  // Salvar ou Atualizar Pergunta nos 4 Formatos
  const handleSaveQuestion = async (e) => {
    e.preventDefault();

    if (!selectedQuiz || selectedQuiz.created_by !== currentUserId) {
      alert("Apenas pode editar questionários que você mesmo criou.");
      return;
    }

    if (!questionText.trim()) {
      alert("Preencha o enunciado da pergunta.");
      return;
    }

    let finalOptionsPayload = options;
    let finalCorrectOption = Number(correctOption);

    if (questionFormat === "fill_blanks") {
      const blanksInText = (questionText.match(/___/g) || []).length;
      const correctWords = correctBlanksText
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      const distractorWords = distractorBlanksText
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);

      if (blanksInText === 0) {
        alert(
          "Use '___' (três underlines) no enunciado para marcar onde ficarão as lacunas!"
        );
        return;
      }

      if (correctWords.length !== blanksInText) {
        alert(
          `O enunciado possui ${blanksInText} lacuna(s) '___', mas você informou ${correctWords.length} palavra(s) correta(s).`
        );
        return;
      }

      finalOptionsPayload = {
        type: "fill_blanks",
        correctSequence: correctWords,
        bank: [...correctWords, ...distractorWords],
      };
      finalCorrectOption = 0;
    } else if (questionFormat === "sequence_order") {
      const validSteps = sequenceSteps.map((s) => s.trim()).filter(Boolean);
      if (validSteps.length < 3) {
        alert("Informe pelo menos 3 etapas na ordem cronológica/lógica exata.");
        return;
      }

      finalOptionsPayload = {
        type: "sequence_order",
        correctOrder: validSteps,
      };
      finalCorrectOption = 0;
    } else if (questionFormat === "true_false") {
      finalOptionsPayload = {
        type: "true_false",
        choices: ["Verdadeiro", "Falso"],
        correctIndex: Number(trueFalseAnswer),
      };
      finalCorrectOption = Number(trueFalseAnswer);
    } else {
      if (options.some((opt) => !opt.trim())) {
        alert(t("err_fill_options") || "Preencha todas as 4 opções.");
        return;
      }
    }

    setLoading(true);
    const sanitizedImageUrl = imageUrl.trim() ? imageUrl.trim() : null;

    if (editingQuestionId) {
      const { data, error } = await supabase
        .from("questions")
        .update({
          question_text: questionText.trim(),
          image_url: sanitizedImageUrl,
          options: finalOptionsPayload,
          correct_option: finalCorrectOption,
          time_seconds: Number(timeSeconds),
        })
        .eq("id", editingQuestionId)
        .select()
        .single();

      if (!error && data) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestionId ? data : q))
        );
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
          options: finalOptionsPayload,
          correct_option: finalCorrectOption,
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

      const { data: newQuiz, error: quizErr } =
        await insertQuizDefensive(aiQuizPayload);

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
      const qType = q.type || "multiple_choice";

      if (qType === "fill_blanks") {
        const seq = Array.isArray(q.correctSequence) ? q.correctSequence : [];
        const distractors = Array.isArray(q.distractors) ? q.distractors : [];
        return {
          quiz_id: targetQuizId,
          question_text: q.question,
          image_url: null,
          options: {
            type: "fill_blanks",
            correctSequence: seq,
            bank: [...seq, ...distractors],
          },
          correct_option: 0,
          time_seconds: q.time_seconds || 25,
          question_order: startingOrder + idx + 1,
        };
      }

      if (qType === "sequence_order") {
        const order = Array.isArray(q.correctOrder) ? q.correctOrder : [];
        return {
          quiz_id: targetQuizId,
          question_text: q.question,
          image_url: null,
          options: {
            type: "sequence_order",
            correctOrder: order,
          },
          correct_option: 0,
          time_seconds: q.time_seconds || 30,
          question_order: startingOrder + idx + 1,
        };
      }

      if (qType === "true_false") {
        const correctIdx = q.isTrue === false ? 1 : 0;
        return {
          quiz_id: targetQuizId,
          question_text: q.question,
          image_url: null,
          options: {
            type: "true_false",
            choices: ["Verdadeiro", "Falso"],
            correctIndex: correctIdx,
          },
          correct_option: correctIdx,
          time_seconds: q.time_seconds || 15,
          question_order: startingOrder + idx + 1,
        };
      }

      const optsList = Array.isArray(q.options) ? q.options : [];
      const correctIdx = optsList.findIndex((opt) => opt.is_correct === true);
      return {
        quiz_id: targetQuizId,
        question_text: q.question,
        image_url: null,
        options: optsList.map((opt) =>
          typeof opt === "string" ? opt : opt.text
        ),
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

  const handleImportComplete = async (newQuiz) => {
    setActiveTab("my");
    setSelectedQuiz(newQuiz);
    setQuizzes((prev) => [newQuiz, ...prev.filter((q) => q.id !== newQuiz.id)]);

    const { data: freshQuestions } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order"
      )
      .eq("quiz_id", newQuiz.id)
      .order("question_order", { ascending: true });

    setQuestions(freshQuestions || []);
    resetQuestionForm();
    alert("Questionário e acervo integrados com sucesso!");
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question_text || "");
    setImageUrl(q.image_url ? String(q.image_url).trim() : "");
    setTimeSeconds(q.time_seconds || 20);

    if (q.options && !Array.isArray(q.options)) {
      if (q.options.type === "fill_blanks") {
        setQuestionFormat("fill_blanks");
        const seq = q.options.correctSequence || [];
        const bank = q.options.bank || [];
        const distractors = bank.filter((w) => !seq.includes(w));
        setCorrectBlanksText(seq.join(", "));
        setDistractorBlanksText(distractors.join(", "));
      } else if (q.options.type === "sequence_order") {
        setQuestionFormat("sequence_order");
        const steps = q.options.correctOrder || ["", "", "", ""];
        setSequenceSteps(
          steps.length >= 4 ? steps : [...steps, ...Array(4 - steps.length).fill("")]
        );
      } else if (q.options.type === "true_false") {
        setQuestionFormat("true_false");
        setTrueFalseAnswer(Number(q.options.correctIndex ?? q.correct_option ?? 0));
      }
    } else {
      setQuestionFormat("multiple_choice");
      setOptions(Array.isArray(q.options) ? q.options : ["", "", "", ""]);
      setCorrectOption(
        typeof q.correct_option === "number" ? q.correct_option : 0
      );
    }

    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionFormat("multiple_choice");
    setQuestionText("");
    setImageUrl("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    setCorrectBlanksText("");
    setDistractorBlanksText("");
    setSequenceSteps(["", "", "", ""]);
    setTrueFalseAnswer(0);
    setTimeSeconds(20);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm(t("confirm_del_question") || "Deseja eliminar esta pergunta?"))
      return;
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

  const isCreatorOfQuiz = selectedQuiz?.created_by === currentUserId;

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans transition-colors duration-300 ${styles.mainBg}`}
    >
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <span>📚</span> Banco de Questões & Quizzes
            </h1>
            <p className="text-sm font-medium opacity-70 mt-1">
              Crie questões de Múltipla Escolha, Completar Lacunas, Ordenação
              Sequencial ou Verdadeiro/Falso.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <span>📥</span> Importar Arquivo
            </button>

            <button
              type="button"
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
              type="button"
              onClick={() => setShowQuizModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              ➕ {t("create_new_quiz") || "Novo Quiz"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Painel Esquerdo: Lista e Abas */}
          <div
            className={`lg:col-span-4 border rounded-3xl p-5 space-y-4 transition-colors duration-300 ${styles.cardPanel}`}
          >
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-2xl border ${styles.tabsContainer}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("my");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "my"
                    ? "bg-purple-600 text-white shadow"
                    : styles.tabInactive
                }`}
              >
                Meus Quizzes
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("community");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "community"
                    ? "bg-purple-600 text-white shadow"
                    : styles.tabInactive
                }`}
              >
                Comunidade
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("official");
                  setSelectedQuiz(null);
                }}
                className={`py-2 text-[11px] font-bold rounded-xl transition cursor-pointer text-center ${
                  activeTab === "official"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : styles.tabInactive
                }`}
              >
                Oficial 🏛️
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {quizzes.length === 0 ? (
                <p className="text-xs opacity-50 py-10 text-center">
                  {loading
                    ? "A carregar acervo..."
                    : "Nenhum quiz nesta categoria."}
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
                          ? styles.quizItemSelected
                          : styles.quizItemDefault
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? "bg-black/25 text-white"
                                : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                            }`}
                          >
                            {cat
                              ? `${cat.icon} ${cat.label}`
                              : q.category || "Geral"}
                          </span>
                          <h3 className="font-bold text-sm truncate">
                            {q.title}
                          </h3>
                          {q.is_official && (
                            <span
                              title="Quiz Oficial da Plataforma"
                              className="text-amber-300"
                            >
                              ⭐
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1.5 flex items-center gap-2 ${
                            isSelected ? "text-white/90" : "opacity-70"
                          }`}
                        >
                          <span>📝 {questionCount} perguntas</span>
                          {q.author_name && <span>Por {q.author_name}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {activeTab === "my" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(q.id);
                            }}
                            className={`${
                              isSelected
                                ? "text-white/80 hover:text-white"
                                : "text-rose-500 opacity-70 hover:opacity-100"
                            } p-1.5 transition text-xs cursor-pointer`}
                            title="Eliminar quiz"
                          >
                            🗑️
                          </button>
                        )}
                        {activeTab !== "my" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneQuiz(q);
                            }}
                            className="bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
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

          {/* Painel Direito */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedQuiz ? (
              <div
                className={`border rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300 ${styles.cardPanel}`}
              >
                <span className="text-4xl block mb-4">👈</span>
                <p className="text-base font-bold opacity-85 mb-2">
                  Selecione um quiz ao lado para visualizar ou adicionar
                  questões interativas.
                </p>
                <p className="text-xs opacity-60 max-w-md">
                  Combine Múltipla Escolha, Completar Lacunas, Ordenação
                  Sequencial e Verdadeiro/Falso na mesma aula.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`border p-6 rounded-3xl space-y-4 ${styles.quizBanner}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                          {isCreatorOfQuiz
                            ? "Seu Quiz Pessoal"
                            : `Quiz de ${
                                selectedQuiz.author_name || "Comunidade"
                              }`}
                        </span>
                        <span className="bg-black/25 border border-white/20 text-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          📂{" "}
                          {selectedQuiz.category || "Conhecimentos Gerais"}
                        </span>
                        {selectedQuiz.is_official && (
                          <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow">
                            <span>⭐</span> OFICIAL DA ARENA
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-extrabold mt-1 text-white">
                        {selectedQuiz.title}
                      </h2>
                    </div>

                    <span className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-full text-xs font-black shadow flex-shrink-0">
                      {questions.length} questões
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/20 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleToggleOfficialStatus(selectedQuiz)}
                      disabled={togglingOfficial}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-lg border ${
                        selectedQuiz.is_official
                          ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-500"
                          : "bg-amber-400 border-amber-300 text-slate-950 hover:bg-amber-300 shadow-amber-400/25"
                      } disabled:opacity-50`}
                    >
                      {togglingOfficial ? (
                        "A sincronizar..."
                      ) : selectedQuiz.is_official ? (
                        <>
                          <span>❌</span> Revogar Status Oficial
                        </>
                      ) : (
                        <>
                          <span>⭐</span> Homologar como Oficial (Arena)
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleShareQuiz(selectedQuiz)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                        selectedQuiz.is_public
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-slate-900/70 border-white/20 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span>
                        {selectedQuiz.is_public ? "🌐 Público" : "🔒 Privado"}
                      </span>
                    </button>

                    <Link
                      href={`/game/host?quizId=${selectedQuiz.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 border border-white/20"
                    >
                      <span>🎮</span> Abrir Sala com este Quiz
                    </Link>
                  </div>
                </div>

                {/* Formulário de Pergunta com os 4 Formatos */}
                {isCreatorOfQuiz ? (
                  <div
                    className={`border rounded-3xl p-6 space-y-6 transition-colors duration-300 ${styles.cardPanel}`}
                  >
                    <div className="space-y-3 border-b border-inherit pb-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-bold flex items-center gap-2">
                          {editingQuestionId ? (
                            <>
                              <span>✏️</span> Editar Questão
                            </>
                          ) : (
                            <>
                              <span>➕</span> Nova Questão Interativa
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

                      {/* Barra de Seleção dos 4 Formatos */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setQuestionFormat("multiple_choice")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            questionFormat === "multiple_choice"
                              ? "bg-purple-600 text-white border-purple-500 shadow"
                              : styles.questionCard
                          }`}
                        >
                          🔘 Múltipla Escolha
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionFormat("fill_blanks")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            questionFormat === "fill_blanks"
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                              : styles.questionCard
                          }`}
                        >
                          🧩 Completar Lacunas
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionFormat("sequence_order")}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            questionFormat === "sequence_order"
                              ? "bg-indigo-600 text-white border-indigo-500 shadow"
                              : styles.questionCard
                          }`}
                        >
                          🔀 Ordenar Sequência
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionFormat("true_false");
                            setTimeSeconds(10);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            questionFormat === "true_false"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow"
                              : styles.questionCard
                          }`}
                        >
                          ⚡ Verdadeiro / Falso
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold opacity-80 block mb-1.5">
                          {questionFormat === "fill_blanks"
                            ? "Frase com Lacunas (use ___ onde o aluno deve preencher)"
                            : questionFormat === "sequence_order"
                            ? "Comando da Ordenação (Ex.: Ordene as etapas da abordagem)"
                            : "Enunciado da Pergunta"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            questionFormat === "fill_blanks"
                              ? "Ex.: O condutor deve manter ___ de segurança e respeitar o ___ da via."
                              : questionFormat === "sequence_order"
                              ? "Ex.: Coloque na ordem correta os passos de sinalização de emergência:"
                              : questionFormat === "true_false"
                              ? "Ex.: A ultrapassagem pela direita é permitida quando o veículo à frente sinaliza conversão à esquerda."
                              : "Ex.: Qual é o significado da placa ilustrada?"
                          }
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 font-medium ${styles.inputField}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold opacity-80 block mb-1.5">
                            URL da Imagem Ilustrativa (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://exemplo.com/imagem.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 font-mono ${styles.inputField}`}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold opacity-80 block mb-1.5">
                            Tempo Limite
                          </label>
                          <select
                            value={timeSeconds}
                            onChange={(e) => setTimeSeconds(e.target.value)}
                            className={`w-full border font-bold rounded-xl p-3 text-xs focus:outline-none focus:ring-2 cursor-pointer ${styles.inputField}`}
                          >
                            <option value={10}>10 segundos (Relâmpago)</option>
                            <option value={15}>15 segundos</option>
                            <option value={20}>20 segundos</option>
                            <option value={30}>30 segundos</option>
                            <option value={45}>45 segundos</option>
                            <option value={60}>60 segundos</option>
                          </select>
                        </div>
                      </div>

                      {imageUrl.trim().length > 0 && (
                        <div
                          className={`p-3 border rounded-2xl flex items-center gap-3 ${styles.questionCard}`}
                        >
                          <img
                            src={imageUrl}
                            alt="Prévia da Questão"
                            className="w-16 h-16 rounded-xl object-contain border border-slate-700 bg-slate-900"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            onLoad={(e) => {
                              e.currentTarget.style.display = "block";
                            }}
                          />
                          <div className="text-xs truncate flex-1">
                            <span className="font-bold text-purple-500 block">
                              Prévia da Imagem Carregada
                            </span>
                            <span className="opacity-60 text-[11px] font-mono truncate block">
                              {imageUrl}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* FORMATO 1: COMPLETAR LACUNAS */}
                      {questionFormat === "fill_blanks" && (
                        <div className="space-y-4 pt-2">
                          <div>
                            <label className="text-xs font-bold text-emerald-500 block mb-1.5">
                              ✅ Palavras Corretas na Sequência Exata (separadas
                              por vírgula):
                            </label>
                            <input
                              type="text"
                              placeholder="Ex.: distância, limite"
                              value={correctBlanksText}
                              onChange={(e) =>
                                setCorrectBlanksText(e.target.value)
                              }
                              className={`w-full border rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 ${styles.inputField}`}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-amber-500 block mb-1.5">
                              🧩 Palavras Distratoras Extras no Banco (opcional,
                              separadas por vírgula):
                            </label>
                            <input
                              type="text"
                              placeholder="Ex.: ultrapassagem, farol, acostamento"
                              value={distractorBlanksText}
                              onChange={(e) =>
                                setDistractorBlanksText(e.target.value)
                              }
                              className={`w-full border rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 ${styles.inputField}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* FORMATO 2: ORDENAÇÃO SEQUENCIAL */}
                      {questionFormat === "sequence_order" && (
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-bold text-indigo-400 block">
                            🔀 Informe as etapas na ORDEM CORRETA (o sistema
                            embaralhará automaticamente para o aluno):
                          </label>
                          <div className="space-y-2.5">
                            {sequenceSteps.map((step, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border ${styles.questionCard}`}
                              >
                                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center flex-shrink-0">
                                  {idx + 1}º
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Etapa ${idx + 1} ${
                                    idx === 3 ? "(opcional)" : ""
                                  }`}
                                  value={step}
                                  onChange={(e) => {
                                    const updated = [...sequenceSteps];
                                    updated[idx] = e.target.value;
                                    setSequenceSteps(updated);
                                  }}
                                  className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FORMATO 3: VERDADEIRO OU FALSO RELÂMPAGO */}
                      {questionFormat === "true_false" && (
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold opacity-80 block">
                            ⚡ Selecione o gabarito da afirmação:
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setTrueFalseAnswer(0)}
                              className={`p-4 rounded-2xl border font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                                trueFalseAnswer === 0
                                  ? "bg-emerald-500 text-white border-emerald-400 shadow-lg"
                                  : styles.questionCard
                              }`}
                            >
                              <span>✅</span> VERDADEIRO
                            </button>
                            <button
                              type="button"
                              onClick={() => setTrueFalseAnswer(1)}
                              className={`p-4 rounded-2xl border font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                                trueFalseAnswer === 1
                                  ? "bg-rose-600 text-white border-rose-500 shadow-lg"
                                  : styles.questionCard
                              }`}
                            >
                              <span>❌</span> FALSO
                            </button>
                          </div>
                        </div>
                      )}

                      {/* FORMATO 4: MÚLTIPLA ESCOLHA */}
                      {questionFormat === "multiple_choice" && (
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-bold opacity-80 block">
                            Alternativas (Marque o seletor da resposta correta)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {options.map((opt, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${
                                  correctOption === idx
                                    ? "bg-emerald-500/10 border-emerald-500"
                                    : styles.questionCard
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="correctOption"
                                  checked={correctOption === idx}
                                  onChange={() => setCorrectOption(idx)}
                                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                />
                                <span className="font-mono text-xs font-bold opacity-70">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Opção ${String.fromCharCode(
                                    65 + idx
                                  )}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...options];
                                    newOpts[idx] = e.target.value;
                                    setOptions(newOpts);
                                  }}
                                  className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-xs text-purple-400 flex items-center justify-between">
                    <span>
                      💡 Este quiz pertence a outro autor. Para alterar suas
                      perguntas, clique em <strong>Clonar para Editar</strong>.
                    </span>
                  </div>
                )}

                {/* Lista de Questões */}
                <div
                  className={`border rounded-3xl p-6 space-y-4 transition-colors duration-300 ${styles.cardPanel}`}
                >
                  <h3 className="text-sm font-bold border-b border-inherit pb-3">
                    Perguntas Registradas ({questions.length})
                  </h3>

                  {questions.length === 0 ? (
                    <p className="text-xs opacity-50 py-4 text-center">
                      Nenhuma questão cadastrada para este quiz.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, idx) => {
                        const qType =
                          q.options && !Array.isArray(q.options)
                            ? q.options.type
                            : "multiple_choice";

                        let typeBadge = {
                          icon: "🔘",
                          label: "Múltipla Escolha",
                          answerPreview:
                            q.options?.[q.correct_option] || "N/A",
                        };

                        if (qType === "fill_blanks") {
                          typeBadge = {
                            icon: "🧩",
                            label: "Completar Lacunas",
                            answerPreview:
                              q.options.correctSequence?.join(" → "),
                          };
                        } else if (qType === "sequence_order") {
                          typeBadge = {
                            icon: "🔀",
                            label: "Ordenação Sequencial",
                            answerPreview:
                              q.options.correctOrder?.join(" → "),
                          };
                        } else if (qType === "true_false") {
                          typeBadge = {
                            icon: "⚡",
                            label: "Verdadeiro / Falso",
                            answerPreview:
                              Number(q.options.correctIndex ?? q.correct_option) === 0
                                ? "Verdadeiro"
                                : "Falso",
                          };
                        }

                        return (
                          <div
                            key={q.id || idx}
                            className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition ${
                              editingQuestionId === q.id
                                ? styles.questionCardEditing
                                : styles.questionCard
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {q.image_url ? (
                                <img
                                  src={q.image_url}
                                  alt="Ilustração da Questão"
                                  className="w-14 h-14 rounded-xl object-contain border border-slate-700 flex-shrink-0 bg-slate-900"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  className={`w-14 h-14 rounded-xl border flex items-center justify-center text-lg flex-shrink-0 ${styles.iconBtn}`}
                                >
                                  {typeBadge.icon}
                                </div>
                              )}

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-purple-500 uppercase flex items-center gap-1.5 flex-wrap">
                                  <span>
                                    #{idx + 1} • {q.time_seconds}s
                                  </span>
                                  <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded text-[9px]">
                                    {typeBadge.icon} {typeBadge.label}
                                  </span>
                                </span>
                                <h4 className="font-bold text-sm">
                                  {q.question_text}
                                </h4>
                                <p className="text-xs text-emerald-500 font-semibold">
                                  ✅ Gabarito: {typeBadge.answerPreview}
                                </p>
                              </div>
                            </div>

                            {isCreatorOfQuiz && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestion(q)}
                                  className={`p-2 border rounded-lg text-xs font-bold transition cursor-pointer ${styles.iconBtn}`}
                                  title="Editar esta questão"
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
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {showQuizModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div
            className={`border p-6 rounded-3xl max-w-sm w-full space-y-4 relative ${styles.modalBox}`}
          >
            <button
              type="button"
              onClick={() => setShowQuizModal(false)}
              className="absolute top-4 right-4 opacity-50 hover:opacity-100 font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-center">Criar Novo Quiz</h3>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  Categoria
                </label>
                <select
                  value={newQuizCategory}
                  onChange={(e) => setNewQuizCategory(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 font-semibold cursor-pointer ${styles.inputField}`}
                >
                  {QUIZ_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  Título do Quiz
                </label>
                <input
                  type="text"
                  placeholder="Ex: Legislação de Trânsito"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 font-semibold ${styles.inputField}`}
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

      <AiQuizGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onQuizGenerated={handleQuizGeneratedByAi}
      />

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