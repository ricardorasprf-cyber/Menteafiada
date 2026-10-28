"use client";

import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ClientParticipantContent({ userName, userRole }) {
  const { t } = useLanguage();

  const mockCourses = [
    {
      id: 1,
      title: t("course_logic_title"),
      description: t("course_logic_desc"),
      progress: 100,
      icon: "🧠",
      color: "bg-blue-500/20 text-blue-500 border border-blue-500/30"
    },
    {
      id: 2,
      title: t("course_web_title"),
      description: t("course_web_desc"),
      progress: 45,
      icon: "💻",
      color: "bg-purple-500/20 text-purple-500 border border-purple-500/30"
    },
    {
      id: 3,
      title: t("course_db_title"),
      description: t("course_db_desc"),
      progress: 0,
      icon: "🗄️",
      color: "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans transition-colors duration-300">
      
      {/* BLOCO SUPERIOR FIXO (Escuro Institucional) */}
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
              <UserMenu userName={userName} userRole={userRole} />
            </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 mt-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-4 group">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            {t("back_home")}
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{t("my_courses_page_title")}</h1>
          <p className="text-sm font-medium text-slate-400">{t("my_courses_page_desc")}</p>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (Adaptável Claro/Escuro) */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course) => (
            <div 
              key={course.id} 
              className="bg-[var(--card-bg)] rounded-3xl p-6 shadow-xl border border-[var(--card-border)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 ${course.color}`}>
                {course.icon}
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{course.title}</h3>
              <p className="text-[var(--foreground)] opacity-70 text-sm mb-6 flex-grow">{course.description}</p>
              
              <div className="mb-6">
                <div className="flex justify-between text-xs text-[var(--foreground)] opacity-80 mb-2 font-bold">
                  <span>{t("progress")}</span>
                  <span className="font-mono text-emerald-500">{course.progress}%</span>
                </div>
                <div className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>

              <button className="w-full bg-[var(--background)] hover:opacity-80 text-[var(--foreground)] font-bold py-3 px-4 rounded-xl border border-[var(--card-border)] transition duration-200 cursor-pointer text-sm shadow-sm">
                {course.progress === 0 ? t("btn_start_course") : course.progress === 100 ? t("btn_review_course") : t("btn_continue_course")}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}