/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/courses/page.js
 * Objetivo: Central Exclusiva de "Meus Cursos, Materiais & Certificados",
 * conectada ao Estúdio do Criador (`courses` e `course_lessons`) e ao Player
 * Interativo (`/dashboard/courses/[courseId]`).
 * ============================================================================
 */

"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/app/components/ThemeProvider";

const COURSES_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]",
    badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
    card: "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    subBox: "bg-slate-50 border-slate-200/80 text-slate-700",
    tabBar: "bg-white border-slate-200 shadow-sm",
    tabInactive: "text-slate-600 hover:text-slate-900",
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
    subBox: "bg-slate-950/80 border-slate-800 text-slate-300",
    tabBar: "bg-slate-900 border-slate-800",
    tabInactive: "text-slate-400 hover:text-white",
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
    tabBar: "bg-[#090d22] border-fuchsia-500/40",
    tabInactive: "text-cyan-200/70 hover:text-cyan-100",
    btnPrimary:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.45)]",
    btnSecondary:
      "bg-[#0b0f26] hover:border-fuchsia-400 text-cyan-100 border border-cyan-500/40",
  },
};

const DEFAULT_CATALOG = [
  {
    id: "mat-fundamental",
    isRealDbCourse: false,
    title: "Matemática Básica & Raciocínio Lógico",
    category: "Exatas",
    format: "Videoaulas + Apostila PDF",
    totalLessons: 10,
    workloadHours: 12,
    accessLevel: "free",
    description:
      "Operações fundamentais, frações, porcentagens, regra de três e resolução comentada de problemas.",
    icon: "📐",
    materialsCount: 4,
  },
  {
    id: "ciencias-natureza",
    isRealDbCourse: false,
    title: "Ciências da Natureza & Sustentabilidade",
    category: "Biológicas",
    format: "Videoaulas + Mapas Mentais",
    totalLessons: 8,
    workloadHours: 10,
    accessLevel: "free",
    description:
      "Ecologia, ciclos biogeoquímicos, biodiversidade e desafios ambientais contemporâneos.",
    icon: "🌿",
    materialsCount: 3,
  },
  {
    id: "redacao-dissertativa",
    isRealDbCourse: false,
    title: "Redação Nota Máxima & Argumentação",
    category: "Linguagens",
    format: "Curso Completo + E-book",
    totalLessons: 14,
    workloadHours: 20,
    accessLevel: "pro",
    description:
      "Estrutura dissertativa-argumentativa, repertório sociocultural, coesão e modelos comentados.",
    icon: "✍️",
    materialsCount: 6,
  },
  {
    id: "ebook-produtividade",
    isRealDbCourse: false,
    title: "Guia Prático de Memorização & Estudo Ativo",
    category: "E-book Exclusivo",
    format: "E-book PDF + Flashcards",
    totalLessons: 5,
    workloadHours: 6,
    accessLevel: "pro",
    description:
      "Técnicas de repetição espaçada, mapas mentais e preparação de alta performance para provas.",
    icon: "📘",
    materialsCount: 5,
  },
];

export default function MyCoursesAndMaterialsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const styles = COURSES_THEMES[theme] || COURSES_THEMES["theme-classic"];

  const [activeTab, setActiveTab] = useState("enrolled");
  const [coursesList, setCoursesList] = useState(DEFAULT_CATALOG);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    "participant";
  const planTier =
    user?.publicMetadata?.plan_tier ||
    user?.unsafeMetadata?.plan_tier ||
    "free";

  const hasProAccess =
    ["owner", "admin", "manager", "creator_pro", "student_pro"].includes(
      userRole
    ) || ["student_pro", "creator_pro", "institutional"].includes(planTier);

  const isEducatorOrOwner = [
    "owner",
    "admin",
    "manager",
    "creator",
    "creator_pro",
    "educator",
    "teacher",
  ].includes(userRole);

  const studentFullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Estudante MenteAfiada";

  const loadCoursesAndProgress = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Busca cursos reais publicados no Estúdio do Criador (`courses` + contagem de `course_lessons`)
      const { data: dbCourses } = await supabase
        .from("courses")
        .select("*, course_lessons(id, material_url)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      let realCourseIds = [];

      if (dbCourses && dbCourses.length > 0) {
        const mappedDbCourses = dbCourses.map((c) => {
          const lessonsArr = Array.isArray(c.course_lessons)
            ? c.course_lessons
            : [];
          const pdfsCount = lessonsArr.filter((l) => l.material_url).length;
          return {
            id: String(c.id),
            isRealDbCourse: true,
            title: c.title || "Curso MenteAfiada",
            category: c.category || "Geral",
            format: c.format || "Videoaulas + E-book PDF",
            totalLessons: Math.max(1, lessonsArr.length),
            workloadHours: Number(c.workload_hours || 10),
            accessLevel: c.is_pro ? "pro" : "free",
            description:
              c.description ||
              "Trilha de aprendizagem interativa com videoaulas e materiais em PDF.",
            icon: c.icon || "🎓",
            materialsCount: pdfsCount,
          };
        });
        realCourseIds = mappedDbCourses
          .filter((c) => c.accessLevel === "free")
          .map((c) => c.id);
        setCoursesList([...mappedDbCourses, ...DEFAULT_CATALOG]);
      }

      // 2. Carrega aulas concluídas
      const { data: lessonsData } = await supabase
        .from("lesson_completions")
        .select("*")
        .eq("user_clerk_id", user.id);

      const userLessons = lessonsData || [];
      setCompletedLessons(userLessons);

      // 3. Carrega matrículas (Supabase + localStorage)
      const { data: dbEnrollments } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_clerk_id", user.id);

      const dbEnrolledIds = (dbEnrollments || []).map((e) =>
        String(e.course_id)
      );

      let savedEnrolled = [];
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(
            `menteafiada_enrolled_${user.id}`
          );
          if (raw) savedEnrolled = JSON.parse(raw);
        } catch {
          savedEnrolled = [];
        }
      }

      const startedCourseIds = userLessons
        .map((l) => String(l.course_id))
        .filter(Boolean);

      const defaultFreeIds =
        dbEnrolledIds.length === 0 &&
        savedEnrolled.length === 0 &&
        startedCourseIds.length === 0
          ? ["mat-fundamental", "ciencias-natureza", ...realCourseIds]
          : realCourseIds;

      const mergedEnrolled = Array.from(
        new Set([
          ...dbEnrolledIds,
          ...savedEnrolled,
          ...startedCourseIds,
          ...defaultFreeIds,
        ])
      );

      setEnrolledIds(mergedEnrolled);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded) {
      loadCoursesAndProgress();
    }
  }, [isLoaded, loadCoursesAndProgress]);

  const getCourseProgress = (course) => {
    const count = completedLessons.filter(
      (item) => String(item.course_id) === String(course.id)
    ).length;
    const total = Math.max(1, Number(course.totalLessons || 8));
    const percent = Math.min(100, Math.round((count / total) * 100));
    return {
      completedCount: count,
      totalCount: total,
      percent,
      isCompleted: percent >= 100,
    };
  };

  const handleEnrollCourse = async (course) => {
    if (!user?.id) return;
    setEnrollingId(course.id);

    try {
      await supabase.from("course_enrollments").upsert({
        user_clerk_id: user.id,
        course_id: String(course.id),
      });

      const updated = Array.from(new Set([...enrolledIds, String(course.id)]));
      setEnrolledIds(updated);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `menteafiada_enrolled_${user.id}`,
          JSON.stringify(updated)
        );
      }

      if (course.isRealDbCourse) {
        router.push(`/dashboard/courses/${course.id}`);
      } else {
        setActiveTab("enrolled");
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const handleContinueStudy = async (course) => {
    if (course.isRealDbCourse) {
      router.push(`/dashboard/courses/${course.id}`);
      return;
    }

    if (!user?.id) return;
    const { completedCount, totalCount } = getCourseProgress(course);
    if (completedCount >= totalCount) return;

    const nextLessonIndex = completedCount + 1;
    await supabase.from("lesson_completions").insert({
      user_clerk_id: user.id,
      course_id: String(course.id),
      lesson_id: `${course.id}-aula-${nextLessonIndex}`,
    });

    await loadCoursesAndProgress();
  };

  const enrolledCourses = coursesList.filter((c) =>
    enrolledIds.includes(String(c.id))
  );

  const completedCourses = enrolledCourses.filter(
    (c) => getCourseProgress(c).isCompleted
  );

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative font-sans transition-colors duration-300 pb-20 ${styles.mainBg}`}
    >
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Cabeçalho */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-black uppercase tracking-widest ${styles.badge}`}
            >
              <span>🎓</span> AMBIENTE DE ESTUDOS & MATERIAIS
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Meus Cursos, Materiais & Certificados
            </h1>
            <p className="text-xs md:text-sm opacity-75 max-w-2xl">
              Acompanhe suas matrículas, assista às videoaulas, baixe e-books
              em PDF e emita seus certificados digitais verificáveis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isEducatorOrOwner && (
              <Link
                href="/dashboard/creator"
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${styles.btnSecondary}`}
              >
                🎬 Publicar Curso / E-book
              </Link>
            )}

            <Link
              href="/dashboard/achievements"
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition ${styles.btnSecondary}`}
            >
              🏅 Minhas Conquistas
            </Link>

            {!hasProAccess && (
              <Link
                href="/planos"
                className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition ${styles.btnPrimary}`}
              >
                💎 Liberar Acesso Total
              </Link>
            )}
          </div>
        </section>

        {/* Cards de Resumo */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border space-y-1 ${styles.card}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              CURSOS MATRICULADOS
            </span>
            <p className="text-2xl md:text-3xl font-black text-indigo-500">
              {loading ? "..." : enrolledCourses.length}
            </p>
            <span className="text-[11px] opacity-70 block">
              Trilhas ativas na conta
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.card}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              AULAS CONCLUÍDAS
            </span>
            <p className="text-2xl md:text-3xl font-black text-purple-500">
              {loading ? "..." : completedLessons.length}
            </p>
            <span className="text-[11px] opacity-70 block">
              Progresso registrado
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.card}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              CERTIFICADOS EMITIDOS
            </span>
            <p className="text-2xl md:text-3xl font-black text-emerald-500">
              {loading ? "..." : completedCourses.length}
            </p>
            <span className="text-[11px] opacity-70 block">
              100% de aproveitamento
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.card}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              STATUS DA ASSINATURA
            </span>
            <p className="text-sm md:text-base font-black text-amber-500 pt-1">
              {hasProAccess ? "⭐ Acesso Pro Ativo" : "🌱 Plano Explorador"}
            </p>
            <span className="text-[11px] opacity-70 block">
              {hasProAccess
                ? "Biblioteca e E-books liberados"
                : "Módulos iniciais gratuitos"}
            </span>
          </div>
        </section>

        {/* Abas */}
        <div
          className={`inline-flex flex-wrap items-center p-1.5 rounded-2xl border gap-1 ${styles.tabBar}`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("enrolled")}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === "enrolled"
                ? "bg-indigo-600 text-white shadow"
                : styles.tabInactive
            }`}
          >
            📚 Meus Cursos ({enrolledCourses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === "catalog"
                ? "bg-indigo-600 text-white shadow"
                : styles.tabInactive
            }`}
          >
            🧭 Catálogo de Cursos & E-books ({coursesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("certificates")}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === "certificates"
                ? "bg-indigo-600 text-white shadow"
                : styles.tabInactive
            }`}
          >
            📜 Certificados ({completedCourses.length})
          </button>
        </div>

        {/* ABA 1: MEUS CURSOS */}
        {activeTab === "enrolled" && (
          <section className="space-y-4">
            {loading ? (
              <div
                className={`p-10 rounded-3xl border text-center text-xs ${styles.card}`}
              >
                Carregando seus cursos e materiais...
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div
                className={`p-10 rounded-3xl border text-center space-y-4 ${styles.card}`}
              >
                <span className="text-4xl block">📚</span>
                <h2 className="text-lg font-black">
                  Você ainda não se matriculou em nenhum curso
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className={`px-6 py-3 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
                >
                  Explorar Catálogo de Cursos →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const progress = getCourseProgress(course);

                  return (
                    <div
                      key={course.id}
                      className={`rounded-3xl border p-6 flex flex-col justify-between space-y-5 ${styles.card}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl">{course.icon}</span>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                            {course.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-black leading-snug">
                            {course.title}
                          </h3>
                          <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl border flex items-center justify-between text-[11px] font-bold ${styles.subBox}`}
                        >
                          <span>🎬 {course.totalLessons} aulas</span>
                          <span>📄 {course.materialsCount} PDFs</span>
                          <span>⏱️ {course.workloadHours}h</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="opacity-75">Progresso</span>
                            <span className="text-emerald-500 font-black">
                              {progress.percent}% ({progress.completedCount}/
                              {progress.totalCount})
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-500/20 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        {progress.isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCertificate(course)}
                            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition cursor-pointer shadow"
                          >
                            📜 Visualizar Certificado Oficial
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleContinueStudy(course)}
                            className={`w-full py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer ${styles.btnPrimary}`}
                          >
                            {course.isRealDbCourse
                              ? "🎬 Abrir Sala de Aula & Materiais →"
                              : `▶️ Continuar Aula (${
                                  progress.completedCount + 1
                                }/${progress.totalCount})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ABA 2: CATÁLOGO */}
        {activeTab === "catalog" && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesList.map((course) => {
              const isEnrolled = enrolledIds.includes(String(course.id));
              const isLockedPro = course.accessLevel === "pro" && !hasProAccess;

              return (
                <div
                  key={course.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between space-y-5 ${styles.card}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xl">{course.icon}</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          course.accessLevel === "pro"
                            ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        }`}
                      >
                        {course.accessLevel === "pro"
                          ? "💎 ALUNO PRO"
                          : "🌱 GRATUITO"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-indigo-500">
                        {course.format}
                      </span>
                      <h3 className="text-lg font-black leading-snug mt-0.5">
                        {course.title}
                      </h3>
                      <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-[11px] font-bold ${styles.subBox}`}
                    >
                      <span>🎬 {course.totalLessons} aulas</span>
                      <span>📚 {course.materialsCount} materiais</span>
                      <span>⏱️ {course.workloadHours}h</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    {isEnrolled ? (
                      <button
                        type="button"
                        onClick={() =>
                          course.isRealDbCourse
                            ? router.push(`/dashboard/courses/${course.id}`)
                            : setActiveTab("enrolled")
                        }
                        className={`w-full py-3 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnSecondary}`}
                      >
                        ✓ Já Matriculado • Acessar Aula
                      </button>
                    ) : isLockedPro ? (
                      <Link
                        href="/planos"
                        className="block w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-center text-xs font-black transition shadow"
                      >
                        🔓 Desbloquear com Aluno Pro
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={enrollingId === course.id}
                        onClick={() => handleEnrollCourse(course)}
                        className={`w-full py-3 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
                      >
                        {enrollingId === course.id
                          ? "Matriculando..."
                          : "+ Matricular-se Gratuitamente"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ABA 3: CERTIFICADOS */}
        {activeTab === "certificates" && (
          <section className="space-y-4">
            {completedCourses.length === 0 ? (
              <div
                className={`p-10 rounded-3xl border text-center space-y-4 ${styles.card}`}
              >
                <span className="text-4xl block">📜</span>
                <h2 className="text-lg font-black">
                  Nenhum certificado emitido ainda
                </h2>
                <p className="text-xs opacity-75 max-w-md mx-auto">
                  Conclua 100% das aulas de qualquer curso matriculado para
                  liberar automaticamente o seu certificado digital.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("enrolled")}
                  className={`px-6 py-3 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
                >
                  Ir para Meus Cursos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedCourses.map((course) => {
                  const verificationCode = `MA-${String(course.id)
                    .toUpperCase()
                    .slice(0, 6)}-${String(user?.id || "USER")
                    .slice(-6)
                    .toUpperCase()}`;

                  return (
                    <div
                      key={course.id}
                      className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${styles.card}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                            ✓ CERTIFICADO CONCLUÍDO
                          </span>
                          <span className="text-xs font-mono opacity-70">
                            {course.workloadHours}h
                          </span>
                        </div>
                        <h3 className="text-lg font-black">{course.title}</h3>
                        <p className="text-xs opacity-75">
                          Concedido a <strong>{studentFullName}</strong>
                        </p>
                        <p className="text-[11px] font-mono opacity-65">
                          Código de Autenticidade: {verificationCode}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCertificate(course)}
                        className={`w-full py-3 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
                      >
                        🖨️ Visualizar / Imprimir Certificado
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modal de Certificado Digital */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white text-slate-900 rounded-3xl p-8 md:p-10 border-4 border-indigo-600 shadow-2xl space-y-6 text-center relative">
            <button
              type="button"
              onClick={() => setSelectedCertificate(null)}
              className="absolute top-4 right-5 text-sm font-black text-slate-400 hover:text-slate-800 cursor-pointer print:hidden"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-xs font-black tracking-[0.25em] uppercase text-indigo-600">
                PLATAFORMA EDUCACIONAL MENTEAFIADA
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                CERTIFICADO DE CONCLUSÃO
              </h2>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              Certificamos que{" "}
              <strong className="text-slate-950 text-base">
                {studentFullName}
              </strong>{" "}
              concluiu com êxito todas as etapas e avaliações do curso{" "}
              <strong className="text-indigo-700">
                {selectedCertificate.title}
              </strong>
              , com carga horária total de{" "}
              <strong>{selectedCertificate.workloadHours} horas</strong>.
            </p>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <span>
                Emitido em {new Date().toLocaleDateString("pt-BR")}
              </span>
              <span className="font-mono font-bold text-slate-700">
                Registro: MA-
                {String(selectedCertificate.id).toUpperCase().slice(0, 6)}-
                {String(user?.id || "USER").slice(-6).toUpperCase()}
              </span>
            </div>

            <div className="flex gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold cursor-pointer shadow"
              >
                🖨️ Imprimir / Salvar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}