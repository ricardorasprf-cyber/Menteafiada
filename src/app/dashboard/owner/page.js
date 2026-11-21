/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/owner/page.js
 * Objetivo: Painel de Controle do Proprietário integrado ao ThemeProvider
 * global ("theme-classic", "theme-dark", "theme-synthwave") e ao cabeçalho
 * unificado (PlatformHeader):
 * - Gestão de perfis com ordenação hierárquica e sincronização Clerk/Supabase;
 * - Cálculo de faixa etária em conformidade com a LGPD;
 * - Alternador entre Gestão de Perfis e Salas & Legado (AdminRoomsManager);
 * - Suporte dinâmico aos modos Claro, Escuro e NEON.
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/app/components/ThemeProvider";
import AdminRoomsManager from "@/app/components/AdminRoomsManager";
import { excluirPerfil } from "./actions";

// Tokens visuais alinhados às 3 classes globais da plataforma
const OWNER_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    subBanner:
      "bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-b border-slate-200 text-slate-900",
    backLink: "text-slate-600 hover:text-indigo-600",
    bannerTitle: "text-slate-900",
    bannerSubtitle: "text-slate-600",
    moduleSwitchBox: "bg-white border-slate-200 shadow-sm",
    moduleBtnInactive: "text-slate-600 hover:text-slate-900",
    tabInactive:
      "bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-sm",
    tabInactiveBadge: "bg-slate-100 text-slate-700",
    tableWrapper:
      "bg-white border-slate-200 shadow-xl shadow-slate-200/50 text-slate-900",
    tableHeader: "bg-slate-100/80 border-slate-200 text-slate-600",
    tableDivider: "divide-slate-100",
    ageBadge: "bg-slate-100 text-slate-700 border-slate-200",
    roleSelect:
      "bg-white border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    subBanner:
      "bg-gradient-to-b from-slate-900 to-[#070b19] border-b border-slate-800 text-white",
    backLink: "text-slate-400 hover:text-white",
    bannerTitle: "text-white",
    bannerSubtitle: "text-slate-400",
    moduleSwitchBox: "bg-slate-900/90 border-slate-800",
    moduleBtnInactive: "text-slate-400 hover:text-white",
    tabInactive:
      "bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-800",
    tabInactiveBadge: "bg-slate-800 text-slate-300",
    tableWrapper:
      "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/60 text-slate-200",
    tableHeader: "bg-slate-950/60 border-slate-800 text-slate-400",
    tableDivider: "divide-slate-800",
    ageBadge: "bg-slate-800 text-slate-300 border-slate-700",
    roleSelect:
      "bg-slate-950 border-slate-700 text-white focus:ring-purple-500 focus:border-purple-500",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    subBanner:
      "bg-gradient-to-r from-fuchsia-950/40 via-[#080c1f] to-cyan-950/30 border-b border-fuchsia-500/30 text-white",
    backLink: "text-cyan-300/80 hover:text-cyan-200",
    bannerTitle: "text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]",
    bannerSubtitle: "text-cyan-100/75",
    moduleSwitchBox:
      "bg-[#090d22] border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.2)]",
    moduleBtnInactive: "text-cyan-200/70 hover:text-cyan-100",
    tabInactive:
      "bg-[#090d22]/90 text-cyan-100/80 hover:border-cyan-400/60 hover:text-white border-indigo-500/30",
    tabInactiveBadge: "bg-[#040612] text-cyan-300 border border-cyan-500/30",
    tableWrapper:
      "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_35px_rgba(192,38,211,0.18)] text-cyan-50",
    tableHeader: "bg-[#040612] border-fuchsia-500/30 text-cyan-300/80",
    tableDivider: "divide-indigo-500/20",
    ageBadge: "bg-[#040612] text-cyan-300 border-cyan-500/30",
    roleSelect:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500 focus:border-fuchsia-500",
  },
};

export default function OwnerDashboard() {
  const { user } = useUser();
  const { theme } = useTheme();
  const currentUserId = user?.id;

  const styles = OWNER_STYLES[theme] || OWNER_STYLES["theme-classic"];

  // Controle de Seção Principal: 'perfis' ou 'salas'
  const [currentSection, setCurrentSection] = useState("perfis");

  // Estados dos Usuários
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    const targetUser = users.find((u) => u.id === userId);

    // Otimisticamente atualiza o estado da UI
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    // 1. Atualiza no Supabase
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (dbError) {
      console.error("Erro ao atualizar perfil no Supabase:", dbError);
      alert("Erro ao atualizar o perfil. Tente novamente.");
      fetchUsers();
      return;
    }

    // 2. Sincroniza com os metadados do Clerk para validar no proxy/middleware
    const targetClerkId = targetUser?.clerk_id || targetUser?.id;

    if (targetClerkId) {
      try {
        const res = await fetch("/api/admin/update-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetClerkId,
            newRole,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.warn("Aviso ao sincronizar cargo no Clerk:", errData?.error);
        }
      } catch (err) {
        console.error("Falha na chamada de sincronização com o Clerk:", err);
      }
    }
  };

  // Função para deletar um perfil
  const handleDeleteUser = async (userItem) => {
    const displayName = userItem.name || userItem.email || "este utilizador";
    const confirmacao = window.confirm(
      `Tem certeza de que deseja excluir permanentemente o cadastro de "${displayName}"? Esta ação apagará os dados do banco e o acesso do usuário.`
    );

    if (!confirmacao) return;

    setDeletingId(userItem.id);
    const targetClerkId = userItem.clerk_id || userItem.id;

    const res = await excluirPerfil(userItem.id, targetClerkId);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userItem.id));
    } else {
      alert(res.error || "Erro ao excluir perfil.");
    }
    setDeletingId(null);
  };

  // Peso de ordenação por cargo: Proprietário -> Criador -> Gestor -> Participante
  const rolePriority = {
    owner: 1,
    creator: 2,
    manager: 3,
    participant: 4,
  };

  // Filtragem e Ordenação Hierárquica
  const filteredUsers = users
    .filter((u) => {
      if (activeTab === "all") return true;
      const role = u.role || "participant";
      return role === activeTab;
    })
    .sort((a, b) => {
      const priorityA = rolePriority[a.role || "participant"] || 5;
      const priorityB = rolePriority[b.role || "participant"] || 5;
      return priorityA - priorityB;
    });

  // Cálculo de faixa etária protegida (Princípio da Minimização - LGPD)
  const formatAgeFromBirthdate = (dateString) => {
    if (!dateString) return "N/D";
    const birth = new Date(dateString);
    if (isNaN(birth.getTime())) return "N/D";

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Contadores para as abas
  const counts = {
    all: users.length,
    owner: users.filter((u) => u.role === "owner").length,
    creator: users.filter((u) => u.role === "creator").length,
    manager: users.filter((u) => u.role === "manager").length,
    participant: users.filter((u) => !u.role || u.role === "participant").length,
  };

  // Ordem das abas: Proprietários -> Criadores -> Gestores -> Participantes
  const tabs = [
    { id: "all", label: "Todos", count: counts.all, icon: "📋" },
    { id: "owner", label: "Proprietários", count: counts.owner, icon: "👑" },
    { id: "creator", label: "Criadores", count: counts.creator, icon: "🎨" },
    { id: "manager", label: "Gestores", count: counts.manager, icon: "🏢" },
    {
      id: "participant",
      label: "Participantes",
      count: counts.participant,
      icon: "🎓",
    },
  ];

  // Formatação Condicional das Linhas
  const getRoleRowStyle = (role) => {
    const currentRole = role || "participant";
    switch (currentRole) {
      case "owner":
        return "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-500";
      case "creator":
        return "bg-purple-500/10 hover:bg-purple-500/15 border-l-4 border-purple-500";
      case "manager":
        return "bg-blue-500/10 hover:bg-blue-500/15 border-l-4 border-blue-500";
      case "participant":
      default:
        return "bg-emerald-500/10 hover:bg-emerald-500/15 border-l-4 border-emerald-500";
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans transition-colors duration-300 ${styles.mainBg}`}
    >
      {/* Sub-Banner Administrativo (Sem duplicar o PlatformHeader global) */}
      <section
        className={`pb-16 pt-8 px-6 transition-colors duration-300 ${styles.subBanner}`}
      >
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className={`inline-flex items-center text-sm font-medium transition-colors mb-5 group ${styles.backLink}`}
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Voltar para a Página Inicial
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1
                className={`text-3xl md:text-4xl font-extrabold mb-2 ${styles.bannerTitle}`}
              >
                Painel de Controle do Proprietário
              </h1>
              <p className={`text-sm ${styles.bannerSubtitle}`}>
                Gerencie perfis, monitore partidas em tempo real e execute
                manutenções de legado.
              </p>
            </div>

            {/* Alternador de Módulos (Perfis vs Salas) */}
            <div
              className={`flex border p-1.5 rounded-2xl gap-1 self-start md:self-auto ${styles.moduleSwitchBox}`}
            >
              <button
                type="button"
                onClick={() => setCurrentSection("perfis")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  currentSection === "perfis"
                    ? "bg-purple-600 text-white shadow-md"
                    : styles.moduleBtnInactive
                }`}
              >
                <span>👥</span> Gestão de Perfis
              </button>

              <button
                type="button"
                onClick={() => setCurrentSection("salas")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  currentSection === "salas"
                    ? "bg-purple-600 text-white shadow-md"
                    : styles.moduleBtnInactive
                }`}
              >
                <span>🎮</span> Salas & Legado
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-20 relative z-10">
        {/* SEÇÃO 1: GESTÃO DE PERFIS */}
        {currentSection === "perfis" && (
          <div className="space-y-6">
            {/* NAVEGAÇÃO POR ABAS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                      : styles.tabInactive
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? "bg-white/20 text-white"
                        : styles.tabInactiveBadge
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* TABELA DE UTILIZADORES COM COLUNA DE AÇÕES */}
            <div
              className={`rounded-3xl border overflow-hidden transition-colors duration-300 ${styles.tableWrapper}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-xs uppercase tracking-wider ${styles.tableHeader}`}
                    >
                      <th className="p-4 font-bold">Nome</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Idade (LGPD)</th>
                      <th className="p-4 font-bold">Cargo (Role)</th>
                      <th className="p-4 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${styles.tableDivider}`}>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-8 text-center opacity-60 font-medium"
                        >
                          A carregar utilizadores...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-8 text-center opacity-60 font-medium"
                        >
                          Nenhum utilizador encontrado nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((userItem) => {
                        const isSelf =
                          userItem.clerk_id === currentUserId ||
                          userItem.email ===
                            user?.primaryEmailAddress?.emailAddress;

                        return (
                          <tr
                            key={userItem.id}
                            className={`transition-all ${getRoleRowStyle(
                              userItem.role
                            )}`}
                          >
                            <td className="p-4 font-bold flex items-center gap-2">
                              <span>
                                {userItem.role === "owner" && "👑"}
                                {userItem.role === "creator" && "🎨"}
                                {userItem.role === "manager" && "🏢"}
                                {(!userItem.role ||
                                  userItem.role === "participant") &&
                                  "🎓"}
                              </span>
                              <span>{userItem.name || "Sem Nome"}</span>
                            </td>
                            <td className="p-4 font-mono text-xs md:text-sm opacity-80">
                              {userItem.email}
                            </td>
                            <td className="p-4 text-sm font-medium">
                              <span
                                className={`px-2.5 py-1 rounded-md border font-mono text-xs ${styles.ageBadge}`}
                              >
                                {formatAgeFromBirthdate(
                                  userItem.data_nascimento
                                )}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={userItem.role || "participant"}
                                onChange={(e) =>
                                  handleRoleChange(userItem.id, e.target.value)
                                }
                                className={`border text-sm rounded-lg block w-full p-2 cursor-pointer outline-none font-bold backdrop-blur-sm ${styles.roleSelect}`}
                              >
                                <option value="owner">
                                  👑 Proprietário (Admin)
                                </option>
                                <option value="creator">🎨 Criador</option>
                                <option value="manager">🏢 Gestor</option>
                                <option value="participant">
                                  🎓 Participante (Aluno)
                                </option>
                              </select>
                            </td>
                            <td className="p-4 text-center">
                              {isSelf ? (
                                <span className="text-xs opacity-50 italic font-semibold">
                                  Você
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(userItem)}
                                  disabled={deletingId === userItem.id}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                                  title="Excluir perfil permanentemente"
                                >
                                  {deletingId === userItem.id ? (
                                    <span>Apagando...</span>
                                  ) : (
                                    <>
                                      <span>🗑️</span>
                                      <span>Excluir</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: GESTÃO DE SALAS & LEGADO */}
        {currentSection === "salas" && (
          <div className="space-y-4">
            <AdminRoomsManager />
          </div>
        )}
      </main>
    </div>
  );
}