/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/page.js
 * Objetivo: Página Inicial institucional e interativa da plataforma integrada
 * aos 4 temas globais ("theme-classic", "theme-dark", "theme-synthwave" e
 * "theme-sepia" Papel/Leitura):
 * - Entrada rápida em salas ao vivo via PIN de 6 dígitos;
 * - Acesso direto às Batalhas Oficiais da Arena (14h, 16h, 18h e 20h);
 * - Seção "Como Jogar?", "Diferenciais" e chamada para Planos & Cursos.
 * ============================================================================
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/app/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";

const HOME_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(99,102,241,0.14),transparent)]",
    badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
    card: "bg-white border-slate-200 shadow-xl shadow-slate-200/50 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-800",
    pinInput:
      "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600",
    btnPrimary:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25",
    btnSecondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
    arenaBanner:
      "bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-indigo-400/40 text-white shadow-xl",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(139,92,246,0.2),transparent)]",
    badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    card: "bg-slate-900/90 border-slate-800 shadow-2xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-300",
    pinInput:
      "bg-slate-950 border-slate-700 text-white focus:border-purple-500",
    btnPrimary:
      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40",
    btnSecondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    arenaBanner:
      "bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 border-purple-700/50 text-white shadow-2xl",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    ambientGlow:
      "bg-[radial-gradient(ellipse_90%_65%_at_50%_-10%,rgba(217,70,239,0.28),rgba(34,211,238,0.14),transparent)]",
    badge:
      "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
    card: "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(217,70,239,0.15)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100",
    pinInput:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:border-fuchsia-500",
    btnPrimary:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.5)]",
    btnSecondary:
      "bg-[#0b0f26] hover:border-fuchsia-400 text-cyan-100 border border-cyan-500/40",
    arenaBanner:
      "bg-gradient-to-r from-fuchsia-950 via-[#0d1130] to-cyan-950 border-fuchsia-500/50 text-white shadow-[0_0_40px_rgba(217,70,239,0.25)]",
  },
  "theme-sepia": {
    mainBg: "bg-[#f7f3e8] text-[#292524]",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(180,83,9,0.12),transparent)]",
    badge: "bg-amber-900/10 border-amber-700/30 text-amber-900",
    card: "bg-[#fffdf8] border-[#e6dec8] shadow-xl shadow-amber-950/10 text-[#292524]",
    subBox: "bg-[#f3ece0] border-[#dfd5bc] text-[#44403c]",
    pinInput:
      "bg-[#f5efe2] border-[#d6cbb2] text-[#292524] focus:border-amber-700",
    btnPrimary:
      "bg-gradient-to-r from-amber-700 to-orange-600 hover:from-amber-600 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20",
    btnSecondary:
      "bg-[#f3ece0] hover:bg-[#ebe1cf] text-[#292524] border border-[#d6cbb2]",
    arenaBanner:
      "bg-gradient-to-r from-[#452c1e] via-[#5c3a21] to-[#292524] border-amber-500/40 text-amber-50 shadow-xl",
  },
};

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const styles = HOME_THEMES[theme] || HOME_THEMES["theme-classic"];

  const [pinCode, setPinCode] = useState("");

  const handleJoinByPin = (e) => {
    e.preventDefault();
    const cleaned = pinCode.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length > 0) {
      router.push(`/game/play?pin=${cleaned}`);
    } else {
      router.push("/game/play");
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative font-sans transition-colors duration-300 pb-20 ${styles.mainBg}`}
    >
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 space-y-16">
        {/* HERO SECTION + ENTRADA RÁPIDA POR PIN */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${styles.badge}`}
            >
              <span>🧠</span> {t("home_badge")}
            </span>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.08]">
              {t("home_headline")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500">
                {t("home_highlight")}
              </span>
            </h1>

            <p className="text-sm md:text-lg opacity-80 max-w-2xl leading-relaxed">
              {t("home_description")}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={isSignedIn ? "/dashboard/courses" : "/sign-up"}
                className={`px-7 py-4 rounded-2xl text-xs md:text-sm font-extrabold transition ${styles.btnPrimary}`}
              >
                {isSignedIn
                  ? `🎓 ${t("home_open_courses")}`
                  : `🚀 ${t("sign_up_nav")}`}
              </Link>

              <Link
                href="/planos"
                className={`px-6 py-4 rounded-2xl text-xs md:text-sm font-extrabold transition ${styles.btnSecondary}`}
              >
                💎 {t("home_explore_plans")}
              </Link>
            </div>
          </div>

          {/* Card de Entrada Rápida via PIN */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleJoinByPin}
              className={`border rounded-3xl p-7 md:p-8 space-y-5 ${styles.card}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest opacity-65">
                  {t("home_live_room")}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  ● {t("home_online")}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black">{t("home_pin_title")}</h2>
                <p className="text-xs opacity-70 mt-1">
                  {t("home_pin_help")}
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                aria-label={t("room_pin_code")}
                value={pinCode}
                onChange={(e) =>
                  setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className={`w-full text-center font-mono text-3xl font-black tracking-[0.35em] py-4 px-4 rounded-2xl border outline-none transition ${styles.pinInput}`}
              />

              <button
                type="submit"
                className={`w-full py-4 rounded-2xl text-sm font-extrabold transition cursor-pointer ${styles.btnPrimary}`}
              >
                🎮 {t("home_join_now")}
              </button>
            </form>
          </div>
        </section>

        {/* BANNER ARENA BATALHA */}
        <section
          id="arena"
          className={`rounded-3xl p-7 md:p-10 border flex flex-col md:flex-row items-center justify-between gap-6 ${styles.arenaBanner}`}
        >
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">
              ⚔️ {t("home_arena_badge")}
            </span>
            <h2 className="text-2xl md:text-3xl font-black">
              {t("home_arena_title")}
            </h2>
            <p className="text-xs md:text-sm opacity-85 leading-relaxed">
              {t("home_arena_help")}
            </p>
          </div>

          <Link
            href="/arena"
            className="px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs md:text-sm whitespace-nowrap transition shadow-lg"
          >
            {t("home_arena_action")} →
          </Link>
        </section>

        {/* COMO JOGAR */}
        <section id="como-jogar" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-3xl font-black">
              {t("home_steps_title")}
            </h2>
            <p className="text-xs md:text-sm opacity-75">
              {t("home_steps_intro")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`border rounded-3xl p-6 space-y-3 ${styles.card}`}>
              <span className="text-3xl block">1️⃣</span>
              <h3 className="text-lg font-black">{t("home_choose_quiz")}</h3>
              <p className="text-xs opacity-75 leading-relaxed">
                {t("home_choose_quiz_desc")}
              </p>
            </div>

            <div className={`border rounded-3xl p-6 space-y-3 ${styles.card}`}>
              <span className="text-3xl block">2️⃣</span>
              <h3 className="text-lg font-black">{t("home_share_pin")}</h3>
              <p className="text-xs opacity-75 leading-relaxed">
                {t("home_share_pin_desc")}
              </p>
            </div>

            <div className={`border rounded-3xl p-6 space-y-3 ${styles.card}`}>
              <span className="text-3xl block">3️⃣</span>
              <h3 className="text-lg font-black">
                {t("home_earn_certificates")}
              </h3>
              <p className="text-xs opacity-75 leading-relaxed">
                {t("home_earn_certificates_desc")}
              </p>
            </div>
          </div>
        </section>

        {/* DIFERENCIAIS */}
        <section id="recursos" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={`border rounded-3xl p-5 space-y-2 ${styles.card}`}>
              <span className="text-2xl">🤖</span>
              <h4 className="font-black text-sm">{t("home_ai")}</h4>
              <p className="text-xs opacity-70">
                {t("home_ai_desc")}
              </p>
            </div>

            <div className={`border rounded-3xl p-5 space-y-2 ${styles.card}`}>
              <span className="text-2xl">📜</span>
              <h4 className="font-black text-sm">{t("home_reading")}</h4>
              <p className="text-xs opacity-70">
                {t("home_reading_desc")}
              </p>
            </div>

            <div className={`border rounded-3xl p-5 space-y-2 ${styles.card}`}>
              <span className="text-2xl">📊</span>
              <h4 className="font-black text-sm">{t("home_reports")}</h4>
              <p className="text-xs opacity-70">
                {t("home_reports_desc")}
              </p>
            </div>

            <div className={`border rounded-3xl p-5 space-y-2 ${styles.card}`}>
              <span className="text-2xl">🏅</span>
              <h4 className="font-black text-sm">{t("home_achievements")}</h4>
              <p className="text-xs opacity-70">
                {t("home_achievements_desc")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
