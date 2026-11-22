/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/sign-up/[[...sign-up]]/page.js
 * Objetivo: Tela de Cadastro (Criação de Conta) institucional integrada ao
 * ThemeProvider global ("theme-classic", "theme-dark", "theme-synthwave"):
 * - Layout moderno em duas colunas com benefícios para alunos e professores;
 * - Componente <SignUp /> do Clerk customizado dinamicamente conforme o tema
 *   ativo (Claro, Escuro ou NEON Synthwave).
 * ============================================================================
 */

"use client";

import React from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useTheme } from "@/app/components/ThemeProvider";

const SIGNUP_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_80%_70%_at_50%_-10%,rgba(99,102,241,0.14),transparent)]",
    infoCard:
      "bg-white border-slate-200 shadow-xl shadow-slate-200/60 text-slate-900",
    badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    featureBox: "bg-slate-50 border-slate-200/80 text-slate-700",
    clerkAppearance: {
      variables: {
        colorPrimary: "#4f46e5",
        colorBackground: "#ffffff",
        colorText: "#0f172a",
        colorTextSecondary: "#475569",
        colorInputBackground: "#f8fafc",
        colorInputText: "#0f172a",
        borderRadius: "1rem",
      },
      elements: {
        card: "shadow-2xl shadow-slate-200/70 border border-slate-200 rounded-3xl",
        headerTitle: "font-black text-slate-900 text-xl",
        headerSubtitle: "text-slate-500 text-xs",
        socialButtonsBlockButton:
          "border border-slate-300 hover:bg-slate-50 font-bold rounded-xl transition",
        formButtonPrimary:
          "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 py-3",
        formFieldInput:
          "rounded-xl border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20",
        footerActionLink: "text-indigo-600 hover:text-indigo-500 font-bold",
      },
    },
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    ambientGlow:
      "bg-[radial-gradient(ellipse_80%_70%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]",
    infoCard:
      "bg-slate-900/90 border-slate-800 shadow-2xl shadow-slate-950/80 text-slate-100",
    badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    featureBox: "bg-slate-950/70 border-slate-800 text-slate-300",
    clerkAppearance: {
      variables: {
        colorPrimary: "#7c3aed",
        colorBackground: "#0f172a",
        colorText: "#f8fafc",
        colorTextSecondary: "#94a3b8",
        colorInputBackground: "#020617",
        colorInputText: "#f8fafc",
        borderRadius: "1rem",
      },
      elements: {
        card: "shadow-2xl shadow-black/60 border border-slate-800 bg-slate-900 rounded-3xl",
        headerTitle: "font-black text-white text-xl",
        headerSubtitle: "text-slate-400 text-xs",
        socialButtonsBlockButton:
          "border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-100 font-bold rounded-xl transition",
        socialButtonsBlockButtonText: "text-slate-100 font-bold",
        dividerLine: "bg-slate-800",
        dividerText: "text-slate-400",
        formFieldLabel: "text-slate-300 font-semibold",
        formButtonPrimary:
          "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-extrabold rounded-xl shadow-lg shadow-purple-900/40 py-3",
        formFieldInput:
          "rounded-xl border-slate-700 bg-slate-950 text-white focus:border-purple-500",
        footerActionText: "text-slate-400",
        footerActionLink: "text-purple-400 hover:text-purple-300 font-bold",
      },
    },
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    ambientGlow:
      "bg-[radial-gradient(ellipse_90%_75%_at_50%_-10%,rgba(217,70,239,0.28),rgba(34,211,238,0.14),transparent)]",
    infoCard:
      "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.22)] text-cyan-50",
    badge:
      "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
    featureBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100/90",
    clerkAppearance: {
      variables: {
        colorPrimary: "#d946ef",
        colorBackground: "#090d22",
        colorText: "#ecfeff",
        colorTextSecondary: "#a5f3fc",
        colorInputBackground: "#040612",
        colorInputText: "#22d3ee",
        borderRadius: "1rem",
      },
      elements: {
        card: "shadow-[0_0_45px_rgba(217,70,239,0.28)] border border-fuchsia-500/40 bg-[#090d22] rounded-3xl",
        headerTitle: "font-black text-white text-xl",
        headerSubtitle: "text-cyan-200/80 text-xs",
        socialButtonsBlockButton:
          "border border-cyan-500/40 bg-[#040612] hover:border-fuchsia-400 text-cyan-100 font-bold rounded-xl transition",
        socialButtonsBlockButtonText: "text-cyan-100 font-bold",
        dividerLine: "bg-fuchsia-500/30",
        dividerText: "text-cyan-300/70",
        formFieldLabel: "text-cyan-200 font-semibold",
        formButtonPrimary:
          "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 font-extrabold rounded-xl shadow-[0_0_25px_rgba(217,70,239,0.5)] py-3",
        formFieldInput:
          "rounded-xl border-cyan-500/40 bg-[#040612] text-cyan-300 focus:border-fuchsia-400",
        footerActionText: "text-cyan-200/70",
        footerActionLink: "text-cyan-400 hover:text-fuchsia-400 font-bold",
      },
    },
  },
};

export default function SignUpPage() {
  const { theme } = useTheme();
  const styles = SIGNUP_STYLES[theme] || SIGNUP_STYLES["theme-classic"];

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative flex items-center justify-center px-6 py-12 font-sans transition-colors duration-300 ${styles.mainBg}`}
    >
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Coluna Esquerda: Boas-Vindas & Benefícios */}
        <div
          className={`lg:col-span-6 border rounded-3xl p-8 md:p-10 space-y-6 ${styles.infoCard}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${styles.badge}`}
            >
              <span>🚀</span> CRIE SUA CONTA GRATUITA
            </span>

            <Link
              href="/"
              className="text-xs font-bold opacity-70 hover:opacity-100 transition inline-flex items-center gap-1"
            >
              <span>←</span> Início
            </Link>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              Aprenda jogando, compita e evolua todos os dias.
            </h1>
            <p className="text-xs md:text-sm opacity-75 leading-relaxed">
              Cadastre-se gratuitamente no MenteAfiada para salvar seu progresso,
              subir nas ligas da Arena e criar seus próprios quizzes interativos.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 ${styles.featureBox}`}
            >
              <span className="text-xl">🎓</span>
              <div>
                <h2 className="text-xs font-extrabold">Para Estudantes</h2>
                <p className="text-[11px] opacity-75 mt-0.5">
                  Participe de salas ao vivo, acumule XP e conquiste lugares no
                  pódio oficial.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 ${styles.featureBox}`}
            >
              <span className="text-xl">🏫</span>
              <div>
                <h2 className="text-xs font-extrabold">
                  Para Professores & Instrutores
                </h2>
                <p className="text-[11px] opacity-75 mt-0.5">
                  Crie avaliações gamificadas, enquetes em tempo real e
                  acompanhe relatórios de acertos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Cartão de Cadastro do Clerk */}
        <div className="lg:col-span-6 flex justify-center">
          <SignUp
            appearance={styles.clerkAppearance}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}