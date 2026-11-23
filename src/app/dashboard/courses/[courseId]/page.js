/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/courses/[courseId]/page.js
 * Objetivo: Sala de Aula Interativa do Aluno (Player de Videoaulas,
 * Leitura de Notas, Download de E-books/Apostilas PDF, Marcação de Conclusão
 * persistida em `lesson_completions` e Emissão de Certificado Digital).
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/app/components/ThemeProvider";

const PLAYER_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    card: "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-700",
    btnPrimary:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    card: "bg-slate-900/95 border-slate-800 shadow-xl text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-300",
    btnPrimary:
      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    card: "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.2)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100",
    btnPrimary:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow",
  },
};

// Converte URLs padrão do YouTube ou Vimeo para formato Embed seguro
function resolveVideoEmbed(url) {
  if (!url) return null;
  const cleanUrl = url.trim();

  // YouTube watch?v= ou youtu.be/
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Vídeo direto (.mp4, .webm)
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(cleanUrl)) {
    return {
      type: "video",
      src: cleanUrl,
    };
  }

  return {
    type: "external",
    src: cleanUrl,
  };
}

export default function CourseClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.courseId || "");
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const styles = PLAYER_THEMES[theme] || PLAYER_THEMES["theme-classic"];

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);

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

  const loadClassroom = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);

    try {
      // 1. Busca dados do curso
      const { data: dbCourse } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();

      if (dbCourse) {
        setCourse(dbCourse);

        // 2. Busca aulas vinculadas
        const { data: dbLessons } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("course_id", dbCourse.id)
          .order("lesson_order", { ascending: true });

        setLessons(dbLessons || []);
      }

      // 3. Busca progresso concluído pelo aluno
      if (user?.id) {
        const { data: completions } = await supabase
          .from("lesson_completions")
          .select("lesson_id")
          .eq("user_clerk_id", user.id)
          .eq("course_id", courseId);

        setCompletedLessonIds(
          (completions || []).map((item) => String(item.lesson_id))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, user?.id]);

  useEffect(() => {
    if (isLoaded) {
      loadClassroom();
    }
  }, [isLoaded, loadClassroom]);

  const activeLesson = lessons[activeLessonIndex] || null;
  const isLessonCompleted = activeLesson
    ? completedLessonIds.includes(String(activeLesson.id))
    : false;

  const isLessonLocked =
    Boolean(course?.is_pro) &&
    !hasProAccess &&
    !Boolean(activeLesson?.is_free_preview) &&
    activeLessonIndex > 0;

  const handleCompleteLesson = async () => {
    if (!user?.id || !activeLesson?.id || isLessonCompleted) return;
    setMarkingDone(true);

    try {
      await supabase.from("lesson_completions").upsert({
        user_clerk_id: user.id,
        course_id: courseId,
        lesson_id: String(activeLesson.id),
      });

      setCompletedLessonIds((prev) =>
        Array.from(new Set([...prev, String(activeLesson.id)]))
      );

      // Avança automaticamente para a próxima aula se houver
      if (activeLessonIndex + 1 < lessons.length) {
        setActiveLessonIndex((prev) => prev + 1);
      }
    } finally {
      setMarkingDone(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center font-sans ${styles.mainBg}`}
      >
        <p className="text-sm font-bold animate-pulse">
          Preparando sala de aula...
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center p-6 font-sans ${styles.mainBg}`}
      >
        <div
          className={`max-w-md w-full border rounded-3xl p-8 text-center space-y-4 ${styles.card}`}
        >
          <span className="text-4xl block">📚</span>
          <h1 className="text-xl font-black">Curso não encontrado</h1>
          <p className="text-xs opacity-75">
            Este curso pode ser um módulo demonstrativo ou ainda não possui
            aulas cadastradas no banco de dados.
          </p>
          <Link
            href="/dashboard/courses"
            className={`inline-block px-6 py-3 rounded-2xl text-xs font-extrabold ${styles.btnPrimary}`}
          >
            ← Voltar para Meus Cursos
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = Math.max(1, lessons.length);
  const progressPercent =
    lessons.length > 0
      ? Math.min(
          100,
          Math.round((completedLessonIds.length / totalLessons) * 100)
        )
      : 0;

  const embedInfo = activeLesson?.video_url
    ? resolveVideoEmbed(activeLesson.video_url)
    : null;

  return (
    <div
      className={`min-h-[calc(100vh-70px)] px-4 sm:px-6 py-8 font-sans ${styles.mainBg}`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Topo: Voltar + Título + Progresso */}
        <div
          className={`border rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${styles.card}`}
        >
          <div className="space-y-1">
            <Link
              href="/dashboard/courses"
              className="text-xs font-bold text-indigo-500 hover:underline inline-block"
            >
              ← Voltar para Meus Cursos & Materiais
            </Link>
            <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <span>{course.icon}</span>
              <span>{course.title}</span>
            </h1>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>Progresso Geral</span>
              <span className="text-emerald-500 font-black">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-500/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Grade Principal: Player & Material (8 col) + Índice de Aulas (4 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Player de Aula + E-book */}
          <div className="lg:col-span-8 space-y-5">
            {lessons.length === 0 ? (
              <div
                className={`border rounded-3xl p-10 text-center space-y-3 ${styles.card}`}
              >
                <span className="text-4xl block">🎬</span>
                <h2 className="text-lg font-black">
                  Aulas em preparação pelo educador
                </h2>
                <p className="text-xs opacity-75">
                  As videoaulas e apostilas em PDF deste curso serão
                  disponibilizadas aqui em breve.
                </p>
              </div>
            ) : isLessonLocked ? (
              <div
                className={`border rounded-3xl p-10 text-center space-y-5 ${styles.card}`}
              >
                <span className="text-5xl block">🔒</span>
                <h2 className="text-xl font-black">
                  Conteúdo Exclusivo Aluno Pro
                </h2>
                <p className="text-xs md:text-sm opacity-75 max-w-md mx-auto">
                  Você assistiu à aula demonstrativa gratuita! Assine o plano{" "}
                  <strong>Aluno Pro</strong> para desbloquear todas as
                  videoaulas, e-books em PDF e o certificado oficial.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/planos")}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
                >
                  💎 Desbloquear Acesso Completo
                </button>
              </div>
            ) : (
              <div className={`border rounded-3xl p-6 space-y-5 ${styles.card}`}>
                {/* Área do Vídeo */}
                {embedInfo?.type === "iframe" && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800">
                    <iframe
                      src={embedInfo.src}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {embedInfo?.type === "video" && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                    <video
                      src={embedInfo.src}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                )}

                {embedInfo?.type === "external" && (
                  <div
                    className={`p-5 rounded-2xl border flex items-center justify-between ${styles.subBox}`}
                  >
                    <span className="text-xs font-bold">
                      🎥 Videoaula hospedada em link externo:
                    </span>
                    <a
                      href={embedInfo.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold ${styles.btnPrimary}`}
                    >
                      Assistir Aula ↗
                    </a>
                  </div>
                )}

                {/* Título e Notas da Aula */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-500 text-[10px] font-black">
                      AULA {activeLessonIndex + 1} DE {lessons.length}
                    </span>
                    <span className="text-xs opacity-65">
                      ⏱️ {activeLesson?.duration_minutes || 15} min
                    </span>
                  </div>
                  <h2 className="text-xl font-black">{activeLesson?.title}</h2>
                  {activeLesson?.summary && (
                    <p className="text-xs md:text-sm opacity-80 leading-relaxed">
                      {activeLesson.summary}
                    </p>
                  )}
                </div>

                {/* Bloco de Download de E-book / Apostila PDF */}
                {activeLesson?.material_url && (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${styles.subBox}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📘</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                          MATERIAL COMPLEMENTAR / E-BOOK
                        </span>
                        <p className="text-xs font-extrabold">
                          {activeLesson.material_title ||
                            "Apostila de Apoio em PDF"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={activeLesson.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black text-center transition"
                    >
                      📥 Baixar / Abrir PDF
                    </a>
                  </div>
                )}

                {/* Botão de Concluir Aula */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-inherit">
                  <span className="text-xs opacity-70">
                    {isLessonCompleted
                      ? "✅ Aula concluída e registrada no seu histórico."
                      : "Marque como concluída após assistir e revisar o material."}
                  </span>

                  <button
                    type="button"
                    disabled={isLessonCompleted || markingDone}
                    onClick={handleCompleteLesson}
                    className={`px-6 py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
                      isLessonCompleted
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 cursor-default"
                        : styles.btnPrimary
                    }`}
                  >
                    {isLessonCompleted
                      ? "✓ Aula Concluída"
                      : markingDone
                      ? "Registrando..."
                      : "Concluir Aula e Avançar →"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista Lateral de Módulos e Aulas */}
          <div className={`lg:col-span-4 border rounded-3xl p-5 space-y-4 ${styles.card}`}>
            <h3 className="text-base font-black">
              📋 Conteúdo Programático ({lessons.length})
            </h3>

            <div className="space-y-2">
              {lessons.map((item, idx) => {
                const done = completedLessonIds.includes(String(item.id));
                const active = idx === activeLessonIndex;
                const locked =
                  Boolean(course?.is_pro) &&
                  !hasProAccess &&
                  !Boolean(item.is_free_preview) &&
                  idx > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveLessonIndex(idx)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                      active
                        ? "border-indigo-500 bg-indigo-500/15"
                        : styles.subBox
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold truncate">
                        {idx + 1}. {item.title}
                      </p>
                      <span className="text-[10px] opacity-65 block mt-0.5">
                        {item.duration_minutes} min{" "}
                        {item.material_url ? "• 📘 PDF" : ""}
                      </span>
                    </div>

                    <span className="text-sm shrink-0">
                      {done ? "✅" : locked ? "🔒" : "▶️"}
                    </span>
                  </button>
                );
              })}
            </div>

            {progressPercent >= 100 && (
              <div className="pt-2">
                <Link
                  href="/dashboard/courses"
                  className="block w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-center text-xs font-extrabold transition"
                >
                  🏆 Emitir Certificado Oficial
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}