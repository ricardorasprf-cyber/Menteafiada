/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/quizzes/page.js
 * Objetivo: Gestão completa de questionários pedagógicos com 4 formatos e
 * conformidade estrita de cotas e permissões por plano (`PLAN_LIMITS`):
 *   1. Múltipla Escolha (4 alternativas);
 *   2. Completar Lacunas ("___") com palavras sugeridas na sequência lógica;
 *   3. Ordenação Sequencial (etapas procedimentais / cronológicas);
 *   4. Verdadeiro ou Falso Relâmpago.
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
import { formatLimitValue } from "@/lib/planLimits";
import { usePixPlan } from "@/lib/usePixPlan";

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
  "theme-sepia": {
    mainBg: "bg-[#f7f3e8] text-[#292524]",
    cardPanel:
      "bg-[#fffdf8] border-[#e6dec8] shadow-lg shadow-amber-950/10 text-[#292524]",
    tabsContainer: "bg-[#f0e9d6] border-[#e0d6bc]",
    tabInactive: "text-[#78716c] hover:text-[#292524]",
    quizItemDefault:
      "bg-[#faf6eb] border-[#e6dec8] text-[#292524] hover:border-amber-600",
    quizItemSelected:
      "bg-amber-800 text-white border-amber-700 shadow-md shadow-amber-900/20",
    quizBanner:
      "bg-gradient-to-r from-[#4a3728] to-[#2f2319] border-amber-900/40 text-amber-50 shadow-xl",
    inputField:
      "bg-[#faf6eb] border-[#d6cbb2] text-[#292524] focus:ring-amber-700",
    questionCard: "bg-[#faf6eb] border-[#e6dec8]",
    questionCardEditing:
      "border-amber-700 ring-2 ring-amber-700/20 bg-amber-100/70",
    iconBtn:
      "bg-[#fffdf8] border-[#d6cbb2] hover:bg-[#f0e9d6] text-[#44403c]",
    modalBox: "bg-[#fffdf8] border-[#e6dec8] text-[#292524] shadow-2xl",
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

  // Resolução centralizada do plano e cotas do usuário
  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    "participant";
  const planTier =
    user?.publicMetadata?.plan_tier ||
    user?.unsafeMetadata?.plan_tier ||
    "free";
  const userPlan = usePixPlan(user?.id, userRole, planTier);

  const [quizzes, setQuizzes] = useState([]);
  const [myQuizCount, setMyQuizCount] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("my");
  const [quizListRevision, setQuizListRevision] = useState(0);
  const [loadingQuizList, setLoadingQuizList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [togglingOfficial, setTogglingOfficial] = useState(false);

  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState(
    QUIZ_CATEGORIES[0]?.id || "Concurso Público"
  );
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState("");

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
  const authenticatedUserId = user?.id;
  const authorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "Professor";

  useEffect(() => {
    if (!isLoaded || !authenticatedUserId) return;
    const controller = new AbortController();

    async function loadQuizCount() {
      const { count, error } = await supabase
        .from("quizzes")
        .select("id", { count: "exact", head: true })
        .eq("created_by", authenticatedUserId)
        .abortSignal(controller.signal);
      if (!controller.signal.aborted && !error && typeof count === "number") {
        setMyQuizCount(count);
      }
    }

    loadQuizCount();
    return () => controller.abort();
  }, [authenticatedUserId, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const controller = new AbortController();

    async function loadQuizList() {
      if (controller.signal.aborted) return;
      setLoadingQuizList(true);
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

      const { data, error } = await query.abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (!error && data) setQuizzes(data);
      setLoadingQuizList(false);
    }

    queueMicrotask(loadQuizList);
    return () => controller.abort();
  }, [activeTab, currentUserId, isLoaded, quizListRevision]);

  const canCreateAnotherQuiz = myQuizCount < userPlan.maxQuizzes;

  const openCreateQuizWithQuotaCheck = () => {
    if (!canCreateAnotherQuiz) {
      setUpgradeModalReason(
        `Você atingiu o limite de ${userPlan.maxQuizzes} questionários do plano ${userPlan.label}. Faça upgrade para criar mais questionários ou exclua um antigo.`
      );
      return;
    }
    setShowQuizModal(true);
  };

  const openAiModalWithQuotaCheck = () => {
    if (!userPlan.canUseAiGenerator) {
      setUpgradeModalReason(
        `O Gerador de Questionários com IA não está disponível no plano ${userPlan.label}. Faça upgrade para o Aluno Pro ou Criador Pro para gerar questões automaticamente.`
      );
      return;
    }
    if (!canCreateAnotherQuiz) {
      setUpgradeModalReason(
        `Você já atingiu o limite de ${userPlan.maxQuizzes} questionários do plano ${userPlan.label}.`
      );
      return;
    }
    setShowAiModal(true);
  };

  const openImportModalWithQuotaCheck = () => {
    if (!userPlan.canImportBulk) {
      setUpgradeModalReason(
        `A Importação em Lote de arquivos é exclusiva para assinantes Aluno Pro, Criador Pro e Institucional.`
      );
      return;
    }
    if (!canCreateAnotherQuiz) {
      setUpgradeModalReason(
        `Você já atingiu o limite de ${userPlan.maxQuizzes} questionários do plano ${userPlan.label}.`
      );
      return;
    }
    setShowImportModal(true);
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

    if (!canCreateAnotherQuiz) {
      setShowQuizModal(false);
      setUpgradeModalReason(
        `Limite de ${userPlan.maxQuizzes} questionários atingido no plano ${userPlan.label}.`
      );
      return;
    }

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
      setMyQuizCount((prev) => prev + 1);
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

  const handleSaveGeneratedQuiz = async ({ title, category, questions: draftQuestions }) => {
    if (!user?.id || !userPlan.canUseAiGenerator || !canCreateAnotherQuiz) {
      throw new Error("Sua conta ou seu plano não permite salvar outro quiz gerado.");
    }
    if (!title.trim() || !draftQuestions.length) {
      throw new Error("Informe um título e revise as perguntas do quiz.");
    }
    if (draftQuestions.length > userPlan.maxQuestionsPerQuiz) {
      throw new Error(`Seu plano permite até ${userPlan.maxQuestionsPerQuiz} questões por quiz.`);
    }

    const cleanText = (value) => typeof value === "string" ? value.trim() : "";
    const cleanLines = (value) => Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
    const payloadQuestions = draftQuestions.map((question, index) => {
      const questionText = cleanText(question.question);
      const seconds = Number(question.time_seconds ?? 20);
      const invalid = (message) => new Error(`Pergunta ${index + 1}. ${message}`);
      if (!questionText || !Number.isSafeInteger(seconds) || seconds < 1) {
        throw invalid("Informe o enunciado e um tempo inteiro positivo.");
      }

      let options;
      let correctOption = 0;
      switch (question.type) {
        case "fill_blanks": {
          const correctSequence = cleanLines(question.correctSequence);
          const blankCount = (questionText.match(/___/g) || []).length;
          if (!blankCount || blankCount !== correctSequence.length) {
            throw invalid("Use ___ para cada lacuna e informe uma resposta por lacuna.");
          }
          const bank = [...new Set([...correctSequence, ...cleanLines(question.distractors)])]
            .sort(() => Math.random() - 0.5);
          options = { type: "fill_blanks", correctSequence, bank };
          break;
        }
        case "sequence_order": {
          const correctOrder = cleanLines(question.correctOrder);
          if (correctOrder.length < 2 || new Set(correctOrder).size !== correctOrder.length) {
            throw invalid("Informe pelo menos duas etapas distintas na ordem correta.");
          }
          options = { type: "sequence_order", correctOrder };
          break;
        }
        case "true_false":
          if (typeof question.isTrue !== "boolean") {
            throw invalid("Selecione verdadeiro ou falso.");
          }
          correctOption = question.isTrue ? 0 : 1;
          options = { type: "true_false", choices: ["Verdadeiro", "Falso"], correctIndex: correctOption };
          break;
        default: {
          const choices = Array.isArray(question.options) ? question.options : [];
          options = choices.map((choice) => cleanText(choice?.text));
          if (options.length !== 4 || options.some((option) => !option) ||
              choices.filter((choice) => choice?.is_correct === true).length !== 1) {
            throw invalid("Preencha as quatro alternativas e marque exatamente uma como correta.");
          }
          correctOption = choices.findIndex((choice) => choice.is_correct === true);
        }
      }

      return {
        question_text: questionText,
        options,
        correct_option: correctOption,
        time_seconds: seconds,
        question_order: index + 1,
      };
    });

    const { data: quiz, error: quizError } = await insertQuizDefensive({
      title: title.trim(),
      category,
      created_by: user.id,
      author_name: authorName,
      is_public: false,
      is_official: false,
      is_arena_eligible: true,
    });
    if (quizError || !quiz) {
      throw new Error("Falha ao criar o quiz. " + (quizError?.message || ""));
    }

    let persistedQuestions;
    try {
      const { data, error } = await supabase.from("questions")
        .insert(payloadQuestions.map((question) => ({ ...question, quiz_id: quiz.id })))
        .select("id, quiz_id, question_text, image_url, options, correct_option, time_seconds, question_order");
      if (error) throw error;
      persistedQuestions = data.sort((first, second) => first.question_order - second.question_order);
    } catch (error) {
      const cleanup = await supabase.from("quizzes").delete()
        .eq("id", quiz.id).eq("created_by", user.id).select("id");
      if (cleanup.error || !cleanup.data?.length) {
        throw new Error("Falha ao salvar as perguntas. Confira se ficou um quiz incompleto antes de tentar novamente.");
      }
      throw new Error("Falha ao salvar as perguntas. " + error.message);
    }

    setMyQuizCount((previous) => previous + 1);
    setActiveTab("my");
    setQuizzes((previous) => [{ ...quiz, questions: persistedQuestions }, ...previous]);
    setSelectedQuiz(quiz);
    setQuestions(persistedQuestions);
    setEditingQuestionId(null);
    resetQuestionForm();
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
    if (!userPlan.canAccessOwnerPanel) {
      alert("Apenas o proprietário da plataforma pode homologar quizzes oficiais.");
      return;
    }
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
    if (!canCreateAnotherQuiz) {
      setUpgradeModalReason(
        `Você atingiu o limite de ${userPlan.maxQuizzes} questionários no plano ${userPlan.label}. Libere espaço ou faça upgrade para clonar quizzes.`
      );
      return;
    }

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

    const { data: clonedQuiz, error: cloneErr } = await insertQuizDefensive(
      clonePayload
    );

    if (!cloneErr && clonedQuiz) {
      const { data: sourceQuestions } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizToClone.id)
        .order("question_order", { ascending: true });

      if (sourceQuestions && sourceQuestions.length > 0) {
        // Respeita o limite de questões por quiz do plano ao clonar
        const limitedQuestions = sourceQuestions.slice(
          0,
          userPlan.maxQuestionsPerQuiz === Infinity
            ? sourceQuestions.length
            : userPlan.maxQuestionsPerQuiz
        );

        const clonedQuestions = limitedQuestions.map((q, idx) => ({
          quiz_id: clonedQuiz.id,
          question_text: q.question_text,
          image_url: q.image_url || null,
          options: q.options,
          correct_option: q.correct_option,
          time_seconds: q.time_seconds || 20,
          question_order: idx + 1,
        }));

        await supabase.from("questions").insert(clonedQuestions);
      }

      setMyQuizCount((prev) => prev + 1);
      setActiveTab("my");
      alert("📋 Questionário copiado para 'Meus Quizzes'!");
    } else {
      alert("Erro ao copiar questionário.");
    }
    setLoading(false);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedQuiz || !questionText.trim()) return;

    // Trava de limite de questões por quiz apenas ao ADICIONAR nova questão
    if (
      !editingQuestionId &&
      questions.length >= userPlan.maxQuestionsPerQuiz
    ) {
      setUpgradeModalReason(
        `Você atingiu o limite de ${userPlan.maxQuestionsPerQuiz} questões por quiz do plano ${userPlan.label}. Faça upgrade para adicionar mais questões.`
      );
      return;
    }

    setSavingQuestion(true);
    try {
      let structuredOptions = null;
      let resolvedCorrectOption = 0;

      if (questionFormat === "fill_blanks") {
        const correctSequence = correctBlanksText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const distractors = distractorBlanksText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (correctSequence.length === 0) {
          alert(
            "Informe ao menos uma palavra correta separada por vírgula para preencher as lacunas (___)."
          );
          setSavingQuestion(false);
          return;
        }

        const bank = Array.from(
          new Set([...correctSequence, ...distractors])
        ).sort(() => Math.random() - 0.5);

        structuredOptions = {
          type: "fill_blanks",
          correctSequence,
          bank,
        };
        resolvedCorrectOption = 0;
      } else if (questionFormat === "sequence_order") {
        const validSteps = sequenceSteps.map((s) => s.trim()).filter(Boolean);
        if (validSteps.length < 2) {
          alert("Informe pelo menos 2 etapas em ordem para a sequência.");
          setSavingQuestion(false);
          return;
        }
        structuredOptions = {
          type: "sequence_order",
          correctOrder: validSteps,
        };
        resolvedCorrectOption = 0;
      } else if (questionFormat === "true_false") {
        structuredOptions = {
          type: "true_false",
          choices: ["Verdadeiro", "Falso"],
          correctIndex: Number(trueFalseAnswer),
        };
        resolvedCorrectOption = Number(trueFalseAnswer);
      } else {
        const cleanOptions = options.map((o) => o.trim());
        if (cleanOptions.some((o) => !o)) {
          alert("Preencha todas as 4 alternativas da questão.");
          setSavingQuestion(false);
          return;
        }
        structuredOptions = cleanOptions;
        resolvedCorrectOption = Number(correctOption);
      }

      const payload = {
        quiz_id: selectedQuiz.id,
        question_text: questionText.trim(),
        image_url: imageUrl.trim() || null,
        options: structuredOptions,
        correct_option: resolvedCorrectOption,
        time_seconds: Number(timeSeconds) || 20,
      };

      if (editingQuestionId) {
        const { data, error } = await supabase
          .from("questions")
          .update(payload)
          .eq("id", editingQuestionId)
          .select()
          .single();

        if (!error && data) {
          setQuestions((prev) =>
            prev.map((q) => (q.id === editingQuestionId ? data : q))
          );
          resetQuestionForm();
        } else {
          alert("Erro ao atualizar questão: " + error?.message);
        }
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert({
            ...payload,
            question_order: questions.length + 1,
          })
          .select()
          .single();

        if (!error && data) {
          setQuestions((prev) => [...prev, data]);
          resetQuestionForm();
        } else {
          alert("Erro ao salvar questão: " + error?.message);
        }
      }
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question_text || "");
    setImageUrl(q.image_url || "");
    setTimeSeconds(q.time_seconds || 20);

    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
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
          steps.length >= 4
            ? steps
            : [...steps, ...Array(4 - steps.length).fill("")]
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
    setMyQuizCount((prev) => Math.max(0, prev - 1));
    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(null);
      setQuestions([]);
    }
  };

  const isCreatorOfQuiz = selectedQuiz?.created_by === currentUserId;
  const isQuestionQuotaReached =
    !editingQuestionId && questions.length >= userPlan.maxQuestionsPerQuiz;

  return (
    <div
      className={`min-h-[calc(100vh-70px)] px-4 sm:px-6 py-8 font-sans transition-colors duration-300 ${styles.mainBg}`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho + Barra de Cota do Plano Atual */}
        <div
          className={`border rounded-3xl p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${styles.cardPanel}`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
                Plano: {userPlan.label}
              </span>
              <span className="text-xs font-bold opacity-75">
                • Quizzes: {myQuizCount} / {formatLimitValue(userPlan.maxQuizzes)}
              </span>
              <span className="text-xs font-bold opacity-75">
                • Máx. Questões/Quiz: {formatLimitValue(userPlan.maxQuestionsPerQuiz)}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              📚 Banco de Questões & Quizzes
            </h1>
            <p className="text-xs opacity-75">
              Crie questões de Múltipla Escolha, Completar Lacunas, Ordenação
              Sequencial ou Verdadeiro/Falso.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openImportModalWithQuotaCheck}
              className={`font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg ${
                userPlan.canImportBulk
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                  : "bg-slate-500/20 text-current opacity-80 border border-slate-500/30 hover:opacity-100"
              }`}
            >
              <span>{userPlan.canImportBulk ? "📥" : "🔒"}</span> Importar Arquivo
            </button>

            <button
              type="button"
              onClick={openAiModalWithQuotaCheck}
              className={`font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg ${
                userPlan.canUseAiGenerator
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/20"
                  : "bg-slate-500/20 text-current opacity-80 border border-slate-500/30 hover:opacity-100"
              }`}
            >
              <span>{userPlan.canUseAiGenerator ? "✨" : "🔒"}</span> Gerar com IA
            </button>

            <Link
              href="/game/host"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              🎮 {t("create_room") || "Criar Sala"}
            </Link>

            <button
              type="button"
              onClick={openCreateQuizWithQuotaCheck}
              className={`font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer shadow-lg ${
                canCreateAnotherQuiz
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20"
              }`}
            >
              {canCreateAnotherQuiz ? "➕" : "🔒"}{" "}
              {t("create_new_quiz") || "Novo Quiz"}
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
                  {loadingQuizList
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
                          📂 {selectedQuiz.category || "Conhecimentos Gerais"}
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
                      {questions.length} /{" "}
                      {formatLimitValue(userPlan.maxQuestionsPerQuiz)} questões
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/20 flex items-center gap-3 flex-wrap">
                    {userPlan.canAccessOwnerPanel && (
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
                    )}

                    {isCreatorOfQuiz && (
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
                    )}

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
                      <div className="flex justify-between items-center flex-wrap gap-2">
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
                            className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Cancelar Edição
                          </button>
                        )}
                      </div>

                      {isQuestionQuotaReached && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-300">
                            🔒 Limite de {userPlan.maxQuestionsPerQuiz} questões
                            atingido neste quiz ({userPlan.label}).
                          </p>
                          <Link
                            href="/planos"
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs text-center"
                          >
                            Ampliar Limite →
                          </Link>
                        </div>
                      )}

                      {/* Seletor dos 4 Formatos */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {[
                          { id: "multiple_choice", label: "🔘 Múltipla Escolha" },
                          { id: "fill_blanks", label: "🧩 Completar Lacunas" },
                          { id: "sequence_order", label: "🔢 Ordenar Etapas" },
                          { id: "true_false", label: "⚡ Verdadeiro / Falso" },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setQuestionFormat(fmt.id)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              questionFormat === fmt.id
                                ? "bg-indigo-600 text-white border-indigo-500 shadow"
                                : styles.iconBtn
                            }`}
                          >
                            {fmt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold mb-1.5 opacity-80">
                          {questionFormat === "fill_blanks"
                            ? "Frase com lacunas (use ___ para cada espaço a preencher):"
                            : "Enunciado da Questão:"}
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder={
                            questionFormat === "fill_blanks"
                              ? "Ex: A capital do Brasil é ___ e fica localizada na região ___."
                              : "Digite a pergunta aqui..."
                          }
                          className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:ring-2 ${styles.inputField}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 opacity-80">
                            URL da Imagem (Opcional):
                          </label>
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1.5 opacity-80">
                            Tempo Limite (segundos):
                          </label>
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={timeSeconds}
                            onChange={(e) => setTimeSeconds(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                          />
                        </div>
                      </div>

                      {/* Campos específicos por formato */}
                      {questionFormat === "multiple_choice" && (
                        <div className="space-y-2.5">
                          <label className="block text-xs font-bold opacity-80">
                            Alternativas (marque a bolinha da resposta correta):
                          </label>
                          {options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={Number(correctOption) === idx}
                                onChange={() => setCorrectOption(idx)}
                                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => {
                                  const next = [...options];
                                  next[idx] = e.target.value;
                                  setOptions(next);
                                }}
                                placeholder={`Alternativa ${String.fromCharCode(
                                  65 + idx
                                )}`}
                                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {questionFormat === "fill_blanks" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 opacity-80">
                              Palavras Corretas na Ordem (separadas por vírgula):
                            </label>
                            <input
                              type="text"
                              required
                              value={correctBlanksText}
                              onChange={(e) =>
                                setCorrectBlanksText(e.target.value)
                              }
                              placeholder="Ex: Brasília, Centro-Oeste"
                              className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 opacity-80">
                              Palavras Distratoras Extras (opcional):
                            </label>
                            <input
                              type="text"
                              value={distractorBlanksText}
                              onChange={(e) =>
                                setDistractorBlanksText(e.target.value)
                              }
                              placeholder="Ex: Salvador, Sudeste"
                              className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                            />
                          </div>
                        </div>
                      )}

                      {questionFormat === "sequence_order" && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold opacity-80">
                            Etapas na Ordem Cronológica/Lógica Correta:
                          </label>
                          {sequenceSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 font-black text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={step}
                                onChange={(e) => {
                                  const next = [...sequenceSteps];
                                  next[idx] = e.target.value;
                                  setSequenceSteps(next);
                                }}
                                placeholder={`Passo ${idx + 1}`}
                                className={`flex-1 px-4 py-2 rounded-xl border text-xs outline-none focus:ring-2 ${styles.inputField}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {questionFormat === "true_false" && (
                        <div className="flex gap-3">
                          {[
                            { val: 0, label: "✅ Verdadeiro" },
                            { val: 1, label: "❌ Falso" },
                          ].map((tf) => (
                            <button
                              key={tf.val}
                              type="button"
                              onClick={() => setTrueFalseAnswer(tf.val)}
                              className={`flex-1 py-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                                Number(trueFalseAnswer) === tf.val
                                  ? "bg-emerald-600 text-white border-emerald-500 shadow"
                                  : styles.iconBtn
                              }`}
                            >
                              {tf.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={savingQuestion || isQuestionQuotaReached}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
                      >
                        {savingQuestion
                          ? "A guardar questão..."
                          : editingQuestionId
                          ? "💾 Atualizar Questão"
                          : "➕ Adicionar Questão ao Quiz"}
                      </button>
                    </form>
                  </div>
                ) : null}

                {/* Lista de Questões Cadastradas */}
                <div
                  className={`border rounded-3xl p-6 space-y-4 transition-colors duration-300 ${styles.cardPanel}`}
                >
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-75">
                    Questões deste Questionário ({questions.length})
                  </h3>

                  {questions.length === 0 ? (
                    <p className="text-xs opacity-60 py-6 text-center">
                      Nenhuma questão adicionada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition ${
                            editingQuestionId === q.id
                              ? styles.questionCardEditing
                              : styles.questionCard
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-indigo-500">
                                #{idx + 1}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/15">
                                {q.options?.type === "fill_blanks"
                                  ? "Completar Lacunas"
                                  : q.options?.type === "sequence_order"
                                  ? "Ordenação"
                                  : q.options?.type === "true_false"
                                  ? "V ou F"
                                  : "Múltipla Escolha"}
                              </span>
                              <span className="text-[10px] opacity-60">
                                ⏱️ {q.time_seconds || 20}s
                              </span>
                            </div>
                            <p className="text-sm font-bold">{q.question_text}</p>
                          </div>

                          {isCreatorOfQuiz && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditQuestion(q)}
                                className={`p-2 rounded-xl border text-xs cursor-pointer ${styles.iconBtn}`}
                                title="Editar questão"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className={`p-2 rounded-xl border text-xs text-rose-500 cursor-pointer ${styles.iconBtn}`}
                                title="Excluir questão"
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
      </div>

      {/* Modal Criar Novo Quiz */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full border rounded-3xl p-6 space-y-5 ${styles.modalBox}`}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black">➕ Novo Questionário</h2>
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                className="text-sm opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Título do Questionário:
                </label>
                <input
                  type="text"
                  required
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="Ex: Simulado de Direito Constitucional"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 ${styles.inputField}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Categoria:
                </label>
                <select
                  value={newQuizCategory}
                  onChange={(e) => setNewQuizCategory(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 ${styles.inputField}`}
                >
                  {QUIZ_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${styles.iconBtn}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  {loading ? "A criar..." : "Criar Questionário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aviso de Upgrade de Plano */}
      {upgradeModalReason && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full border rounded-3xl p-7 text-center space-y-5 ${styles.modalBox}`}
          >
            <span className="text-4xl block">🚀</span>
            <h3 className="text-xl font-black">Recurso Exclusivo de Plano</h3>
            <p className="text-xs opacity-80 leading-relaxed">
              {upgradeModalReason}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUpgradeModalReason("")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold border cursor-pointer ${styles.iconBtn}`}
              >
                Agora não
              </button>
              <Link
                href="/planos"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold text-center shadow-lg"
              >
                Conhecer Planos Pro →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modais IA e Importação (liberados apenas conforme PLAN_LIMITS) */}
      {showAiModal && userPlan.canUseAiGenerator && (
        <AiQuizGeneratorModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          maxQuestions={userPlan.maxAiQuestionsPerRequest}
          onSaveQuiz={handleSaveGeneratedQuiz}
        />
      )}

      {showImportModal && userPlan.canImportBulk && (
        <ImportQuizModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          currentUserId={user?.id}
          authorName={authorName}
          maxQuestions={userPlan.maxQuestionsPerQuiz}
          onImportComplete={(createdQuiz) => {
            setMyQuizCount((prev) => prev + 1);
            setActiveTab("my");
            setQuizListRevision((previous) => previous + 1);
            if (createdQuiz) handleSelectQuiz(createdQuiz);
          }}
        />
      )}
    </div>
  );
}
