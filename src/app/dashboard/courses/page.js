"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

export default function MyCoursesPage() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();

  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lista de cursos da plataforma (pode vir do Supabase ou estático inicial)
  const availableCourses = [
    {
      id: "mat-fundamental",
      title: "Matemática Básica & Raciocínio Lógico",
      category: "Exatas",
      totalLessons: 10,
      description: "Operações fundamentais, frações, porcentagens e problemas práticos.",
      icon: "📐",
    },
    {
      id: "ciencias-natureza",
      title: "Ciências da Natureza & Meio Ambiente",
      category: "Biológicas",
      totalLessons: 8,
      description: "Ecologia, ciclo da matéria, seres vivos e sustentabilidade.",
      icon: "🌿",
    },
    {
      id: "conhecimentos-gerais",
      title: "Cultura Geral, História & Atualidades",
      category: "Humanas",
      totalLessons: 12,
      description: "Fatos históricos, geografia mundial e cidadania.",
      icon: "🌍",
    },
  ];

  useEffect(() => {
    async function fetchCompletedLessons() {
      if (user?.id) {
        setLoading(true);
        const { data } = await supabase
          .from("lesson_completions")
          .select("*")
          .eq("user_clerk_id", user.id);

        setCompletedLessons(data || []);
        setLoading(false);
      }
    }
    if (isLoaded && user) {
      fetchCompletedLessons();
    }
  }, [isLoaded, user]);

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      {/* Header Escuro Institucional */}
      <div className="bg-slate-900 border-b border-slate-800 pb-10 transition-none">
        <header className="py-4 px-6">
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
              <UserMenu userName={user?.firstName || "Aluno"} />
            </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 mt-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4 group">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Voltar ao Início
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                <span>🎓</span> Meus Cursos & Conteúdos
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1">
                Acesse suas trilhas de estudo, videoaulas e materiais didáticos inscritos.
              </p>
            </div>

            <Link
              href="/dashboard/achievements"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold py-2.5 px-5 rounded-2xl text-xs transition flex items-center gap-2"
            >
              🏅 Ver Galeria de Emblemas
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Resumo de Aulas Assistidas */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block mb-1">Engajamento de Estudos</span>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Você já concluiu <span className="text-emerald-500 font-extrabold">{completedLessons.length}</span> aulas no MenteAfiada
            </h2>
          </div>
          <span className="text-xs bg-[var(--background)] border border-[var(--card-border)] px-4 py-2 rounded-xl font-bold">
            📚 Aluno Ativo
          </span>
        </div>

        {/* Grade de Cursos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableCourses.map((course) => {
            const completedInCourse = completedLessons.filter((l) => l.lesson_id.startsWith(course.id)).length;
            const progress = Math.round((completedInCourse / course.totalLessons) * 100);

            return (
              <div
                key={course.id}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-3xl shadow-inner">
                    {course.icon}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      {course.category}
                    </span>
                    <h3 className="font-bold text-lg text-[var(--foreground)] mt-2">{course.title}</h3>
                    <p className="text-xs text-[var(--foreground)] opacity-70 mt-1 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[var(--card-border)]">
                  <div className="flex justify-between text-xs font-semibold text-[var(--foreground)] opacity-80">
                    <span>Progresso do Curso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <button
                    onClick={() => alert(`Acessando as aulas de: ${course.title}`)}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Acessar Conteúdo 📖
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}