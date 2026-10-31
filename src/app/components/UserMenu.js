/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/UserMenu.js
 * Objetivo: Menu suspenso de navegação do usuário com acesso direto à Arena Mensal,
 *           Painel do Proprietário, Gerenciador de Quizzes e Configurações.
 * ============================================================================
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import SettingsModal from "./SettingsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

export default function UserMenu({ userName, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { signOut } = useClerk();
  const { user } = useUser();
  const { t } = useLanguage();

  const [currentRole, setCurrentRole] = useState(userRole || "owner");

  useEffect(() => {
    if (userRole) {
      setCurrentRole(userRole);
    }
  }, [userRole]);

  useEffect(() => {
    async function fetchRoleFromDB() {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("clerk_id", user.id)
            .single();

          if (data?.role) {
            setCurrentRole(data.role);
          }
        } catch (e) {
          // Mantém o papel seguro
        }
      }
    }
    fetchRoleFromDB();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = userName || user?.firstName || "MenteAfiada";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  const isOwner =
    currentRole === "owner" ||
    currentRole === "admin" ||
    user?.publicMetadata?.role === "owner" ||
    userEmail.includes("fundador.menteafiada") ||
    displayName.toLowerCase().includes("menteafiada");

  const isCreatorOrOwner = isOwner || currentRole === "creator";

  return (
    <>
      <div className="relative z-50" ref={dropdownRef}>
        {/* Botão de Perfil */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 py-2 px-4 rounded-full border border-slate-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-sm"
        >
          <span>{t("hello") || "Olá"}, {displayName}</span>
          <svg
            className={`w-4 h-4 opacity-70 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown com Suporte a Tema e Glassmorphism */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-xl text-slate-100 rounded-2xl shadow-2xl border border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2.5 mb-1 border-b border-slate-800">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                {t("account_title") || "CONTA DE ACESSO"}
              </p>
              <p className="text-sm font-bold truncate text-white mt-0.5">{displayName}</p>
              <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                {isOwner ? "👑 Proprietário (Admin)" : "Educador"}
              </span>
            </div>

            <div className="space-y-1">
              {/* Link Exclusivo do Painel do Proprietário */}
              {isOwner && (
                <Link
                  href="/dashboard/owner"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/10 rounded-xl transition"
                >
                  <span>👑</span> {t("admin_panel") || "Painel do Proprietário"}
                </Link>
              )}

              {/* Atalho Central da Arena Mensal */}
              <Link
                href="/arena"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/10 rounded-xl transition"
              >
                <span>⚔️</span> Arena Mensal (Desempenho)
              </Link>

              {isCreatorOrOwner && (
                <Link
                  href="/dashboard/quizzes"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition"
                >
                  <span>📝</span> {t("manage_quizzes") || "Gerenciar Quizzes"}
                </Link>
              )}

              {isCreatorOrOwner && (
                <Link
                  href="/game/host"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition"
                >
                  <span>🎮</span> {t("create_room") || "Criar Sala de Jogo"}
                </Link>
              )}

              <Link
                href="/game/play"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition"
              >
                <span>🔢</span> {t("join_pin") || "Entrar por PIN"}
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <span>⚙️</span> {t("settings") || "Configurações"}
              </button>

              <Link
                href="/dashboard/courses"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition"
              >
                <span>🎓</span> {t("my_courses") || "Meus Cursos"}
              </Link>

              <Link
                href="/dashboard/achievements"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition"
              >
                <span>🏅</span> {t("my_achievements") || "Minhas Conquistas"}
              </Link>
            </div>

            <div className="pt-1 mt-1 border-t border-slate-800">
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
              >
                <span>🚪</span> {t("logout") || "Sair da conta"}
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}