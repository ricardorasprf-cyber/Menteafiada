/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/creator/page.js
 * Objetivo: Estúdio de Criação e Gestão de Cursos, Videoaulas e E-books PDF,
 * integrado ao ThemeProvider global ("theme-classic", "theme-dark",
 * "theme-synthwave") e ao Supabase (`courses` e `course_lessons`):
 * - Criação e edição de cursos com classificação de acesso (Gratuito vs.
 *   Exclusivo Aluno Pro), carga horária, categoria e ícone;
 * - Adição e ordenação de módulos/aulas com link de videoaula (YouTube,
 *   Vimeo ou MP4), resumo pedagógico e anexo de E-book / Apostila PDF;
 * - Exibição de aviso de plano caso um usuário gratuito tente publicar
 *   cursos exclusivos sem o perfil Educador Pro.
 * ============================================================================
 */

"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/app/components/ThemeProvider";

const CREATOR_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]",
    badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
    card: "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    subBox: "bg-slate-50 border-slate-200/80 text-slate-800",
    input:
      "bg-white border-slate-300 text-slate-900 focus:border-indigo-600",
    btnPrimary:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20",
    btnSecondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]",
    badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    card: "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-200",
    input:
      "bg-slate-950 border-slate-700 text-white focus:border-purple-500",
    btnPrimary:
      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/40",
    btnSecondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    ambientGlow:
      "bg-[radial-gradient(ellipse_90%_65%_at_50%_-10%,rgba(217,70,239,0.26),rgba(34,211,238,0.14),transparent)]",
    badge:
      "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
    card: "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(217,70,239,0.15)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100",
    input:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:border-fuchsia-500",
    btnPrimary:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.45)]",
    btnSecondary:
      "bg-[#0b0f26] hover:border-fuchsia-400 text-cyan-100 border border-cyan-500/40",
  },
};

const ICON_OPTIONS = ["🎓", "📐", "🌿", "✍️", "📘", "💻", "🧪", "⚖️", "🌍", "🚀"];

export default function CreatorCoursesStudioPage() {
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const styles = CREATOR_THEMES[theme] || CREATOR_THEMES["theme-classic"];

  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    "participant";
  const planTier =
    user?.publicMetadata?.plan_tier ||
    user?.unsafeMetadata?.plan_tier ||
    "free";

  const isOwner = userRole === "owner";
  const canPublishCourses =
    isOwner ||
    ["creator", "creator_pro", "educator", "teacher", "manager", "admin"].includes(
      userRole
    ) ||
    ["creator_pro", "institutional"].includes(planTier);

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Formulário de Novo Curso
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "Exatas",
    format: "Videoaulas + E-book PDF",
    icon: "🎓",
    workload_hours: 10,
    is_pro: false,
  });
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Formulário de Nova Aula / E-book
  const [lessonForm, setLessonForm] = useState({
    title: "",
    summary: "",
    video_url: "",
    material_title: "",
    material_url: "",
    duration_minutes: 15,
    is_free_preview: true,
  });
  const [savingLesson, setSavingLesson] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      let query = supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      // O Proprietário vê todos os cursos; o educador vê os seus próprios cursos
      if (!isOwner) {
        query = query.eq("creator_clerk_id", user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setCourses(data);
        if (data.length > 0 && !selectedCourse) {
          setSelectedCourse(data[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOwner, selectedCourse]);

  const loadLessonsForCourse = useCallback(async (courseId) => {
    if (!courseId) {
      setLessons([]);
      return;
    }

    const { data, error } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("lesson_order", { ascending: true });

    if (!error && data) {
      setLessons(data);
    } else {
      setLessons([]);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadCourses();
    }
  }, [isLoaded, user?.id, loadCourses]);

  useEffect(() => {
    if (selectedCourse?.id) {
      loadLessonsForCourse(selectedCourse.id);
    }
  }, [selectedCourse?.id, loadLessonsForCourse]);

  // Criar Novo Curso
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title.trim() || !user?.id) return;

    setCreatingCourse(true);
    setFeedbackMsg("");

    try {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          creator_clerk_id: user.id,
          title: courseForm.title.trim(),
          description: courseForm.description.trim(),
          category: courseForm.category,
          format: courseForm.format,
          icon: courseForm.icon,
          workload_hours: Number(courseForm.workload_hours || 10),
          is_pro: Boolean(courseForm.is_pro),
          is_published: true,
        })
        .select("*")
        .single();

      if (error) {
        setFeedbackMsg(
          `⚠️ Erro ao salvar curso: ${error.message}. Verifique se o SQL da tabela courses foi executado.`
        );
      } else if (data) {
        setCourses((prev) => [data, ...prev]);
        setSelectedCourse(data);
        setCourseForm({
          title: "",
          description: "",
          category: "Exatas",
          format: "Videoaulas + E-book PDF",
          icon: "🎓",
          workload_hours: 10,
          is_pro: false,
        });
        setFeedbackMsg(
          "✅ Curso publicado com sucesso! Adicione agora as videoaulas e e-books ao lado."
        );
      }
    } finally {
      setCreatingCourse(false);
    }
  };

  // Adicionar Aula / Videoaula / E-book ao Curso Selecionado
  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourse?.id || !lessonForm.title.trim()) return;

    setSavingLesson(true);
    setFeedbackMsg("");

    try {
      const nextOrder = lessons.length + 1;
      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          course_id: selectedCourse.id,
          lesson_order: nextOrder,
          title: lessonForm.title.trim(),
          summary: lessonForm.summary.trim(),
          video_url: lessonForm.video_url.trim() || null,
          material_title:
            lessonForm.material_title.trim() || "Material de Apoio (PDF)",
          material_url: lessonForm.material_url.trim() || null,
          duration_minutes: Number(lessonForm.duration_minutes || 15),
          is_free_preview: Boolean(lessonForm.is_free_preview),
        })
        .select("*")
        .single();

      if (error) {
        setFeedbackMsg(`⚠️ Erro ao adicionar aula: ${error.message}`);
      } else if (data) {
        setLessons((prev) => [...prev, data]);
        setLessonForm({
          title: "",
          summary: "",
          video_url: "",
          material_title: "",
          material_url: "",
          duration_minutes: 15,
          is_free_preview: false,
        });
        setFeedbackMsg("✅ Aula e material adicionados à trilha do curso!");
      }
    } finally {
      setSavingLesson(false);
    }
  };

  // Excluir Aula
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Remover esta aula do curso?")) return;
    await supabase.from("course_lessons").delete().eq("id", lessonId);
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // Excluir Curso
  const handleDeleteCourse = async (courseId) => {
    if (
      !window.confirm(
        "Excluir este curso e todas as suas videoaulas/materiais?"
      )
    )
      return;

    await supabase.from("courses").delete().eq("id", courseId);
    const remaining = courses.filter((c) => c.id !== courseId);
    setCourses(remaining);
    setSelectedCourse(remaining[0] || null);
  };

  if (isLoaded && !canPublishCourses) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center p-6 font-sans ${styles.mainBg}`}
      >
        <div
          className={`max-w-lg w-full border rounded-3xl p-8 text-center space-y-5 ${styles.card}`}
        >
          <span className="text-5xl block">🚀</span>
          <h1 className="text-2xl font-black">
            Estúdio Exclusivo para Educadores
          </h1>
          <p className="text-xs md:text-sm opacity-75 leading-relaxed">
            Para publicar seus próprios cursos em videoaulas, apostilas e
            e-books em PDF na plataforma MenteAfiada, ative o perfil{" "}
            <strong>Educador Pro</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/planos"
              className={`flex-1 py-3.5 rounded-2xl text-xs font-extrabold ${styles.btnPrimary}`}
            >
              💎 Conhecer Plano Educador Pro
            </Link>
            <Link
              href="/dashboard/courses"
              className={`flex-1 py-3.5 rounded-2xl text-xs font-bold ${styles.btnSecondary}`}
            >
              Ver Cursos como Aluno
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative font-sans transition-colors duration-300 pb-20 ${styles.mainBg}`}
    >
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Cabeçalho do Estúdio */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-black uppercase tracking-widest ${styles.badge}`}
            >
              <span>🎬</span> ESTÚDIO DE CURSOS, VIDEOAULAS & E-BOOKS
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Publicar & Gerenciar Conteúdos
            </h1>
            <p className="text-xs md:text-sm opacity-75 max-w-2xl">
              Estruture trilhas com videoaulas, apostilas em PDF e e-books. Tudo
              o que você publicar aqui aparece automaticamente no catálogo dos
              alunos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/dashboard/quizzes"
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${styles.btnSecondary}`}
            >
              📝 Gerenciar Quizzes
            </Link>
            <Link
              href="/dashboard/courses"
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${styles.btnPrimary}`}
            >
              🎓 Ver Vitrine dos Alunos ↗
            </Link>
          </div>
        </section>

        {feedbackMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-500">
            {feedbackMsg}
          </div>
        )}

        {/* Grade Principal: Coluna Esquerda (Novo Curso + Lista) | Coluna Direita (Módulos / Videoaulas / E-books) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUNA ESQUERDA: Criar Curso & Cursos Publicados */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleCreateCourse}
              className={`border rounded-3xl p-6 space-y-4 ${styles.card}`}
            >
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>➕</span> Novo Curso ou E-book
              </h2>

              <div>
                <label className="block text-xs font-extrabold mb-1">
                  Título do Curso / Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Dominando Matemática para Concursos"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">
                  Descrição e Objetivos
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o que o aluno aprenderá neste curso ou e-book..."
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${styles.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold mb-1">
                    Categoria
                  </label>
                  <select
                    value={courseForm.category}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, category: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                  >
                    <option value="Exatas">Exatas</option>
                    <option value="Linguagens">Linguagens</option>
                    <option value="Biológicas">Biológicas</option>
                    <option value="Humanas">Humanas</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="E-book Exclusivo">E-book Exclusivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold mb-1">
                    Carga Horária (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={courseForm.workload_hours}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        workload_hours: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold mb-1">
                    Formato Principal
                  </label>
                  <select
                    value={courseForm.format}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, format: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                  >
                    <option value="Videoaulas + E-book PDF">
                      Videoaulas + E-book PDF
                    </option>
                    <option value="Curso em Vídeo">Curso em Vídeo</option>
                    <option value="E-book PDF + Simulados">
                      E-book PDF + Simulados
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={courseForm.is_pro ? "pro" : "free"}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        is_pro: e.target.value === "pro",
                      })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                  >
                    <option value="free">🌱 Gratuito (Aberto)</option>
                    <option value="pro">💎 Exclusivo Aluno Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1.5">
                  Ícone de Destaque
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCourseForm({ ...courseForm, icon: ic })}
                      className={`h-9 w-9 rounded-xl border text-base flex items-center justify-center cursor-pointer transition ${
                        courseForm.icon === ic
                          ? "border-indigo-500 bg-indigo-500/20 scale-105"
                          : styles.subBox
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingCourse}
                className={`w-full py-3.5 rounded-2xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50 ${styles.btnPrimary}`}
              >
                {creatingCourse ? "Publicando Curso..." : "Publicar Curso Agora"}
              </button>
            </form>

            {/* Lista de Cursos Publicados */}
            <div className={`border rounded-3xl p-6 space-y-4 ${styles.card}`}>
              <h3 className="text-base font-black">
                📚 Cursos Publicados ({courses.length})
              </h3>

              {loading ? (
                <p className="text-xs opacity-65">Carregando cursos...</p>
              ) : courses.length === 0 ? (
                <p className="text-xs opacity-65">
                  Nenhum curso criado no banco ainda. Use o formulário acima
                  para criar o primeiro!
                </p>
              ) : (
                <div className="space-y-2.5">
                  {courses.map((c) => {
                    const isSelected = selectedCourse?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCourse(c)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/15"
                            : styles.subBox
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">{c.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold truncate">
                              {c.title}
                            </p>
                            <span className="text-[10px] opacity-70 block">
                              {c.category} • {c.workload_hours}h •{" "}
                              {c.is_pro ? "💎 Aluno Pro" : "🌱 Gratuito"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(c.id);
                          }}
                          className="text-xs text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg cursor-pointer"
                          title="Excluir curso"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: Gerenciador de Videoaulas & E-books do Curso Selecionado */}
          <div className="lg:col-span-7 space-y-6">
            {!selectedCourse ? (
              <div
                className={`border rounded-3xl p-12 text-center space-y-3 ${styles.card}`}
              >
                <span className="text-4xl block">👈</span>
                <h2 className="text-lg font-black">
                  Crie ou selecione um curso ao lado
                </h2>
                <p className="text-xs opacity-70 max-w-md mx-auto">
                  Após criar um curso, você poderá adicionar aqui as videoaulas
                  (YouTube, Vimeo ou MP4) e os links de download dos e-books e
                  apostilas em PDF.
                </p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleAddLesson}
                  className={`border rounded-3xl p-6 space-y-4 ${styles.card}`}
                >
                  <div className="flex items-center justify-between border-b border-inherit pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        ESTRUTURANDO CONTEÚDO DE:
                      </span>
                      <h2 className="text-lg font-black">
                        {selectedCourse.icon} {selectedCourse.title}
                      </h2>
                    </div>
                    <Link
                      href={`/dashboard/courses/${selectedCourse.id}`}
                      className="text-xs font-bold text-emerald-500 hover:underline"
                    >
                      Pré-visualizar Player ↗
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold mb-1">
                        Título da Aula / Módulo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex.: Aula 01 - Fundamentos e Exercícios Resolvidos"
                        value={lessonForm.title}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            title: e.target.value,
                          })
                        }
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">
                        Duração (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={lessonForm.duration_minutes}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            duration_minutes: e.target.value,
                          })
                        }
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${styles.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      Link da Videoaula (YouTube, Vimeo ou MP4 direto)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lessonForm.video_url}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          video_url: e.target.value,
                        })
                      }
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${styles.input}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold mb-1">
                        Título do E-book / Apostila PDF
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: E-book Resumo Esquematizado (PDF)"
                        value={lessonForm.material_title}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            material_title: e.target.value,
                          })
                        }
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${styles.input}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">
                        Link do Arquivo PDF / Google Drive
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={lessonForm.material_url}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            material_url: e.target.value,
                          })
                        }
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${styles.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      Resumo / Notas de Estudo da Aula
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Orientações de estudo ou resumo complementar..."
                      value={lessonForm.summary}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          summary: e.target.value,
                        })
                      }
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${styles.input}`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lessonForm.is_free_preview}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            is_free_preview: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Liberar como aula demonstrativa gratuita</span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingLesson}
                      className={`px-6 py-3 rounded-2xl text-xs font-extrabold cursor-pointer disabled:opacity-50 ${styles.btnPrimary}`}
                    >
                      {savingLesson
                        ? "Salvando..."
                        : "+ Adicionar Aula & Material"}
                    </button>
                  </div>
                </form>

                {/* Lista de Aulas Cadastradas no Curso */}
                <div className={`border rounded-3xl p-6 space-y-4 ${styles.card}`}>
                  <h3 className="text-base font-black">
                    🎬 Grade de Aulas & E-books ({lessons.length})
                  </h3>

                  {lessons.length === 0 ? (
                    <p className="text-xs opacity-65">
                      Nenhuma aula cadastrada neste curso ainda. Preencha o
                      formulário acima para adicionar a Aula 01.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${styles.subBox}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500 text-[10px] font-black">
                                AULA {index + 1}
                              </span>
                              <span className="text-xs font-extrabold">
                                {lesson.title}
                              </span>
                              {lesson.is_free_preview && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                                  Degustação Grátis
                                </span>
                              )}
                            </div>

                            {lesson.summary && (
                              <p className="text-xs opacity-75">
                                {lesson.summary}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold opacity-80">
                              <span>⏱️ {lesson.duration_minutes} min</span>
                              {lesson.video_url && (
                                <span className="text-purple-500">
                                  🎥 Vídeo vinculado
                                </span>
                              )}
                              {lesson.material_url && (
                                <span className="text-amber-500">
                                  📘 {lesson.material_title || "PDF anexado"}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="text-xs text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl cursor-pointer"
                            title="Remover aula"
                          >
                            🗑️
                          </button>
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
    </div>
  );
}