/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/dashboard/owner/page.js
 * Objetivo: Painel de Controle do Proprietário integrado ao ThemeProvider
 * global ("theme-classic", "theme-dark", "theme-synthwave") e ao cabeçalho
 * unificado (PlatformHeader):
 * - Gestão unificada de Perfis & Planos Exclusivos (Proprietário, Institucional,
 *   Educador Pro, Aluno Pro e Explorador Gratuito) com sincronização
 *   automática Clerk/Supabase;
 * - Precificação Dinâmica Vinculada ao Supabase (`subscription_plans`);
 * - Recepção e Auditoria Financeira em Tempo Real (`payment_transactions`):
 *   exibe o valor real captalizado via PIX e Cartão (bruto, taxas e líquido),
 *   faturamento mensal e extrato detalhado de pagamentos efetivados;
 * - Alternador entre:
 *   1. Perfis & Planos;
 *   2. Planos & Receita (Caixa Real PIX + Editor de preços + Extrato);
 *   3. Salas & Legado (AdminRoomsManager);
 *   4. Controle de Visitações (VisitsAnalyticsPanel).
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/app/components/ThemeProvider";
import AdminRoomsManager from "@/app/components/AdminRoomsManager";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitsAnalyticsPanel } from "@/app/components/VisitsAnalyticsPanel";
import { excluirPerfil } from "./actions";

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
    subCard: "bg-slate-50 border-slate-200/80 text-slate-800",
    ageBadge: "bg-slate-100 text-slate-700 border-slate-200",
    roleSelect:
      "bg-white border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500",
    priceInput:
      "bg-white border-slate-300 text-slate-900 focus:border-indigo-600",
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
    subCard: "bg-slate-950/80 border-slate-800 text-slate-200",
    ageBadge: "bg-slate-800 text-slate-300 border-slate-700",
    roleSelect:
      "bg-slate-950 border-slate-700 text-white focus:ring-purple-500 focus:border-purple-500",
    priceInput:
      "bg-slate-950 border-slate-700 text-white focus:border-purple-500",
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
    tabInactiveBadge:
      "bg-[#040612] text-cyan-300 border border-cyan-500/30",
    tableWrapper:
      "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_35px_rgba(192,38,211,0.18)] text-cyan-50",
    tableHeader: "bg-[#040612] border-fuchsia-500/30 text-cyan-300/80",
    tableDivider: "divide-indigo-500/20",
    subCard: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100",
    ageBadge: "bg-[#040612] text-cyan-300 border-cyan-500/30",
    roleSelect:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500 focus:border-fuchsia-500",
    priceInput:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:border-fuchsia-500",
  },
};

const DEFAULT_PLANS_CONFIG = [
  {
    id: "free",
    role_key: "student_free",
    name: "Explorador",
    regular_monthly_price: 0,
    monthly_price: 0,
    annual_monthly_price: 0,
    max_quizzes: 3,
    max_players_per_room: 25,
  },
  {
    id: "student_pro",
    role_key: "student_pro",
    name: "Aluno Pro",
    regular_monthly_price: 24.9,
    monthly_price: 9.9,
    annual_monthly_price: 7.4,
    max_quizzes: 5,
    max_players_per_room: 25,
  },
  {
    id: "creator_pro",
    role_key: "creator_pro",
    name: "Educador Pro",
    regular_monthly_price: 39.9,
    monthly_price: 19.9,
    annual_monthly_price: 14.9,
    max_quizzes: 9999,
    max_players_per_room: 300,
  },
  {
    id: "institutional",
    role_key: "manager",
    name: "Institucional / Escola",
    regular_monthly_price: 149.0,
    monthly_price: 79.9,
    annual_monthly_price: 59.9,
    max_quizzes: 9999,
    max_players_per_room: 1000,
  },
];

// Normaliza papéis legados ('creator' -> 'creator_pro', 'participant' -> 'student_free')
function normalizeUserRole(rawRole) {
  if (!rawRole || rawRole === "participant" || rawRole === "student_free") {
    return "student_free";
  }
  if (rawRole === "creator" || rawRole === "creator_pro") {
    return "creator_pro";
  }
  return rawRole;
}

export default function OwnerDashboard() {
  const { user } = useUser();
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const formatNumber = (value) => Number(value || 0).toLocaleString(locale);
  const currentUserId = user?.id;
  const styles = OWNER_STYLES[theme] || OWNER_STYLES["theme-classic"];

  const [currentSection, setCurrentSection] = useState("perfis");
  const [users, setUsers] = useState([]);
  const [plansConfig, setPlansConfig] = useState(DEFAULT_PLANS_CONFIG);
  const [transactions, setTransactions] = useState([]);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansFeedback, setPlansFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);

    // 1. Busca usuários cadastrados
    const { data: usersData, error: usersErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!usersErr && usersData) {
      setUsers(usersData);
    }

    // 2. Busca preços vinculados dinamicamente da tabela subscription_plans
    const { data: dbPlans, error: plansErr } = await supabase
      .from("subscription_plans")
      .select("*");

    if (!plansErr && dbPlans && dbPlans.length > 0) {
      const orderMap = {
        free: 1,
        student_pro: 2,
        creator_pro: 3,
        institutional: 4,
      };
      const sorted = [...dbPlans].sort(
        (a, b) => (orderMap[a.id] || 9) - (orderMap[b.id] || 9)
      );
      setPlansConfig(sorted);
    }

    // 3. Busca transações financeiras reais (PIX / Cartão) liquidadas
    try {
      const response = await fetch("/api/payments/owner", { cache: "no-store" });
      if (!response.ok) throw new Error("Extrato indispon?vel.");
      const { transactions } = await response.json();
      setTransactions(transactions);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper para obter o preço mensal dinâmico de um papel
  const getDynamicMonthlyPrice = (roleKey) => {
    const found = plansConfig.find((p) => p.role_key === roleKey);
    return found ? Number(found.monthly_price || 0) : 0;
  };

  const formatBRL = (val) =>
    Number(val || 0).toLocaleString(locale, {
      style: "currency",
      currency: "BRL",
    });

  const formatDateTimeBR = (isoStr) => {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Atualiza campo de preço no estado local do editor
  const handlePlanFieldChange = (planId, field, rawValue) => {
    const numValue = Math.max(0, parseFloat(rawValue) || 0);
    setPlansConfig((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: numValue } : p))
    );
  };

  // Salva os novos valores no Supabase (atualizando simultaneamente o painel e /planos)
  const handleSavePlansPricing = async () => {
    setSavingPlans(true);
    setPlansFeedback("");

    try {
      for (const plan of plansConfig) {
        const response = await fetch("/api/payments/owner", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: plan.id,
            regular_monthly_price: Number(plan.regular_monthly_price || 0),
            monthly_price: Number(plan.monthly_price || 0),
            annual_monthly_price: Number(plan.annual_monthly_price || 0),
            annual_total_price: plan.annual_total_price == null || plan.annual_total_price === ""
              ? null : Number(plan.annual_total_price),
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao salvar o preço.");
        }
      }

      setPlansFeedback("owner_pricing_saved");
      setTimeout(() => setPlansFeedback(""), 5000);
    } catch (err) {
      console.error("Erro ao salvar os planos:", err);
      setPlansFeedback("owner_pricing_error");
    } finally {
      setSavingPlans(false);
    }
  };

  const handleRoleChange = async (userId, selectedRole) => {
    const targetUser = users.find((u) => u.id === userId);
    setSavingRoleId(userId);

    const dbRoleValue =
      selectedRole === "student_free" ? "participant" : selectedRole;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: dbRoleValue } : u))
    );

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ role: dbRoleValue })
      .eq("id", userId);

    if (dbError) {
      console.error("Erro ao atualizar perfil no Supabase:", dbError);
      alert(t("owner_profile_error"));
      fetchInitialData();
      setSavingRoleId(null);
      return;
    }

    const targetClerkId = targetUser?.clerk_id || targetUser?.id;
    if (targetClerkId) {
      try {
        const res = await fetch("/api/admin/update-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetClerkId,
            newRole: dbRoleValue,
            planTier:
              selectedRole === "student_free"
                ? "free"
                : selectedRole === "manager"
                ? "institutional"
                : selectedRole,
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

    setSavingRoleId(null);
  };

  const handleDeleteUser = async (userItem) => {
    const displayName = userItem.name || userItem.email || t("user_name_fallback");
    const confirmacao = window.confirm(t("owner_confirm_delete", { name: displayName }));

    if (!confirmacao) return;

    setDeletingId(userItem.id);
    const targetClerkId = userItem.clerk_id || userItem.id;
    const res = await excluirPerfil(userItem.id, targetClerkId);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userItem.id));
    } else {
      console.error("Erro ao excluir perfil:", res.error);
      alert(t("owner_delete_error"));
    }
    setDeletingId(null);
  };

  const rolePriority = {
    owner: 1,
    manager: 2,
    creator_pro: 3,
    student_pro: 4,
    student_free: 5,
  };

  const filteredUsers = users
    .filter((u) => {
      if (activeTab === "all") return true;
      const norm = normalizeUserRole(u.role);
      return norm === activeTab;
    })
    .sort((a, b) => {
      const priorityA = rolePriority[normalizeUserRole(a.role)] || 6;
      const priorityB = rolePriority[normalizeUserRole(b.role)] || 6;
      return priorityA - priorityB;
    });

  const formatAgeFromBirthdate = (dateString) => {
    if (!dateString) return t("owner_no_value");
    const birth = new Date(dateString);
    if (isNaN(birth.getTime())) return t("owner_no_value");
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return t(age === 1 ? "owner_age_one" : "owner_age_years", { count: formatNumber(age) });
  };

  const counts = {
    all: users.length,
    owner: users.filter((u) => normalizeUserRole(u.role) === "owner").length,
    manager: users.filter((u) => normalizeUserRole(u.role) === "manager")
      .length,
    creator_pro: users.filter(
      (u) => normalizeUserRole(u.role) === "creator_pro"
    ).length,
    student_pro: users.filter(
      (u) => normalizeUserRole(u.role) === "student_pro"
    ).length,
    student_free: users.filter(
      (u) => normalizeUserRole(u.role) === "student_free"
    ).length,
  };

  // Indicadores Financeiros: Caixa Real (PIX/Cartão efetivados) vs. Projeção MRR
  const approvedTransactions = transactions.filter(
    (t) => t.status === "approved"
  );

  const realCapitalizedGross = approvedTransactions.reduce(
    (acc, t) => acc + Number(t.gross_amount || 0),
    0
  );

  const sumNet = (items) => items.some((item) => item.net_amount == null)
    ? null : items.reduce((sum, item) => sum + Number(item.net_amount), 0);
  const realCapitalizedNet = sumNet(approvedTransactions);

  const pixTransactions = approvedTransactions.filter(
    (t) => String(t.payment_method).toLowerCase() === "pix"
  );

  const realPixTotal = sumNet(pixTransactions);

  const now = new Date();
  const currentMonthRevenue = sumNet(approvedTransactions
    .filter((t) => {
      const d = new Date(t.paid_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }));

  const estimatedMRR = users.reduce((acc, u) => {
    const norm = normalizeUserRole(u.role);
    return acc + getDynamicMonthlyPrice(norm);
  }, 0);

  const activePaidAccounts =
    counts.manager + counts.creator_pro + counts.student_pro;

  const tabs = [
    { id: "all", label: t("owner_all"), count: counts.all, icon: "📋" },
    { id: "owner", label: t("owner_owners"), count: counts.owner, icon: "👑" },
    {
      id: "manager",
      label: t("owner_institutional"),
      count: counts.manager,
      icon: "🏫",
    },
    {
      id: "creator_pro",
      label: t("role_educator_pro"),
      count: counts.creator_pro,
      icon: "🚀",
    },
    {
      id: "student_pro",
      label: t("role_student_pro"),
      count: counts.student_pro,
      icon: "🎓",
    },
    {
      id: "student_free",
      label: t("role_explorer"),
      count: counts.student_free,
      icon: "🌱",
    },
  ];

  const getRoleRowStyle = (rawRole) => {
    const norm = normalizeUserRole(rawRole);
    switch (norm) {
      case "owner":
        return "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-500";
      case "manager":
        return "bg-cyan-500/10 hover:bg-cyan-500/15 border-l-4 border-cyan-500";
      case "creator_pro":
        return "bg-purple-500/10 hover:bg-purple-500/15 border-l-4 border-purple-500";
      case "student_pro":
        return "bg-indigo-500/10 hover:bg-indigo-500/15 border-l-4 border-indigo-500";
      case "student_free":
      default:
        return "bg-emerald-500/10 hover:bg-emerald-500/15 border-l-4 border-emerald-500";
    }
  };

  const getPlanBadgeDisplay = (rawRole) => {
    const norm = normalizeUserRole(rawRole);
    const dynamicPrice = getDynamicMonthlyPrice(norm);
    const monthly = (key) =>
      t("owner_plan_monthly", { plan: t(key), price: formatBRL(dynamicPrice) });

    switch (norm) {
      case "owner":
        return {
          text: t("owner_master"),
          cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",
        };
      case "manager":
        return {
          text: monthly("owner_institutional"),
          cls: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
        };
      case "creator_pro":
        return {
          text: monthly("role_educator_pro"),
          cls: "bg-purple-500/15 text-purple-500 border-purple-500/30",
        };
      case "student_pro":
        return {
          text: monthly("role_student_pro"),
          cls: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
        };
      default:
        return {
          text: `${t("owner_explorer")} • ${formatBRL(dynamicPrice)}`,
          cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        };
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans transition-colors duration-300 ${styles.mainBg}`}
    >
      {/* Banner Administrativo Superior */}
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
            {t("back_home")}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1
                className={`text-3xl md:text-4xl font-extrabold mb-2 ${styles.bannerTitle}`}
              >
                {t("owner_title")}
              </h1>
              <p className={`text-sm md:text-base ${styles.bannerSubtitle}`}>
                {t("owner_intro")}
              </p>
            </div>

            {/* Seletor de Módulo Administrativo */}
            <div
              className={`flex flex-wrap items-center p-1.5 rounded-2xl border gap-1.5 self-start lg:self-auto ${styles.moduleSwitchBox}`}
            >
              <button
                type="button"
                onClick={() => setCurrentSection("perfis")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  currentSection === "perfis"
                    ? "bg-purple-600 text-white shadow"
                    : styles.moduleBtnInactive
                }`}
              >
                👥 {t("owner_profiles_plans")}
              </button>

              <button
                type="button"
                onClick={() => setCurrentSection("assinaturas")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  currentSection === "assinaturas"
                    ? "bg-emerald-600 text-white shadow"
                    : styles.moduleBtnInactive
                }`}
              >
                💳 {t("owner_revenue_tab")}
              </button>

              <button
                type="button"
                onClick={() => setCurrentSection("salas")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  currentSection === "salas"
                    ? "bg-indigo-600 text-white shadow"
                    : styles.moduleBtnInactive
                }`}
              >
                🎮 {t("owner_rooms_tab")}
              </button>

              <button
                type="button"
                onClick={() => setCurrentSection("visitas")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  currentSection === "visitas"
                    ? "bg-cyan-600 text-white shadow"
                    : styles.moduleBtnInactive
                }`}
              >
                📊 {t("owner_visits_tab")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-20 relative z-10">
        {currentSection === "visitas" ? (
          <VisitsAnalyticsPanel />
        ) : currentSection === "salas" ? (
          <AdminRoomsManager />
        ) : currentSection === "assinaturas" ? (
          /* ================================================================= */
          /* MÓDULO: CAIXA REAL PIX + EDITOR DE PREÇOS + EXTRATO DE PAGAMENTOS */
          /* ================================================================= */
          <div className="space-y-6">
            {/* Cards de Recepção Financeira Real vs. Projeção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`rounded-3xl p-6 border space-y-1 ${styles.tableWrapper}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">
                  💠 {t("owner_net_received")}
                </span>
                <p className="text-3xl font-black text-emerald-500">
                  {realCapitalizedNet == null ? "—" : formatBRL(realCapitalizedNet)}
                </p>
                <span className="text-xs opacity-70 block">
                  {t("owner_settled_gross", {
                    count: formatNumber(approvedTransactions.length), gross: formatBRL(realCapitalizedGross),
                  })}
                </span>
              </div>

              <div
                className={`rounded-3xl p-6 border space-y-1 ${styles.tableWrapper}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500 block">
                  ⚡ {t("owner_pix_received")}
                </span>
                <p className="text-3xl font-black text-cyan-500">
                  {realPixTotal == null ? "—" : formatBRL(realPixTotal)}
                </p>
                <span className="text-xs opacity-70 block">
                  {t("owner_pix_count", { count: formatNumber(pixTransactions.length) })}
                </span>
              </div>

              <div
                className={`rounded-3xl p-6 border space-y-1 ${styles.tableWrapper}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">
                  📅 {t("owner_monthly_revenue")}
                </span>
                <p className="text-3xl font-black text-indigo-500">
                  {currentMonthRevenue == null ? "—" : formatBRL(currentMonthRevenue)}
                </p>
                <span className="text-xs opacity-70 block">
                  {t("owner_estimated_revenue", { amount: formatBRL(estimatedMRR) })}
                </span>
              </div>

              <div
                className={`rounded-3xl p-6 border space-y-1 ${styles.tableWrapper}`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                  👥 {t("owner_subscribers")}
                </span>
                <p className="text-3xl font-black text-amber-500">
                  {formatNumber(activePaidAccounts)}{" "}
                  <span className="text-sm font-bold opacity-70">
                    / {formatNumber(users.length)}
                  </span>
                </p>
                <span className="text-xs opacity-70 block">
                  {t("owner_paid_breakdown", {
                    students: formatNumber(counts.student_pro), teachers: formatNumber(counts.creator_pro),
                    schools: formatNumber(counts.manager),
                  })}
                </span>
              </div>
            </div>

            {/* Editor Vinculado de Preços (Sincroniza com /planos e MRR) */}
            <div
              className={`rounded-3xl p-6 md:p-8 border space-y-6 ${styles.tableWrapper}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    💎 {t("owner_pricing")}
                  </h2>
                  <p className="text-xs opacity-70 mt-1">
                    {t("owner_pricing_help")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href="/planos"
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition"
                  >
                    {t("owner_open_pricing")}
                  </Link>
                  <button
                    type="button"
                    disabled={savingPlans}
                    onClick={handleSavePlansPricing}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition cursor-pointer shadow disabled:opacity-50"
                  >
                    {savingPlans
                      ? t("saving")
                      : `💾 ${t("owner_save_pricing")}`}
                  </button>
                </div>
              </div>

              {plansFeedback && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-500">
                  {t(plansFeedback)}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {plansConfig.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-5 rounded-2xl border space-y-3.5 ${styles.subCard}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">{plan.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500 font-bold">
                        {plan.role_key}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] opacity-70 font-bold mb-1">
                          {t("owner_regular_price")}
                        </label>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          disabled={plan.id === "free"}
                          value={plan.regular_monthly_price}
                          onChange={(e) =>
                            handlePlanFieldChange(
                              plan.id,
                              "regular_monthly_price",
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none disabled:opacity-40 ${styles.priceInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] opacity-70 font-bold mb-1">
                          {t("owner_monthly_price")}
                        </label>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          disabled={plan.id === "free"}
                          value={plan.monthly_price}
                          onChange={(e) =>
                            handlePlanFieldChange(
                              plan.id,
                              "monthly_price",
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-black text-emerald-500 outline-none disabled:opacity-40 ${styles.priceInput}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] opacity-70 font-bold mb-1">
                          {t("owner_annual_price")}
                        </label>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          disabled={plan.id === "free"}
                          value={plan.annual_monthly_price}
                          onChange={(e) =>
                            handlePlanFieldChange(
                              plan.id,
                              "annual_monthly_price",
                              e.target.value
                            )
                          }
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none disabled:opacity-40 ${styles.priceInput}`}
                        />
                      </div>
                    </div>
                    {plan.id === "creator_pro" && (
                      <label className="block mt-3 text-[11px] font-bold">
                        {t("owner_annual_total_price")}
                        <input
                          type="number" min="0" step="0.01"
                          value={plan.annual_total_price ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlansConfig((previous) => previous.map((item) => item.id === plan.id
                              ? { ...item, annual_total_price: value } : item));
                          }}
                          className={`block mt-1 w-full px-3 py-2 rounded-xl border text-xs ${styles.priceInput}`}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extrato de Pagamentos Efetivos Recepcionados (PIX & Cartão) */}
            <div
              className={`rounded-3xl p-6 md:p-8 border space-y-5 ${styles.tableWrapper}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black">
                    🧾 {t("owner_payment_statement")}
                  </h2>
                  <p className="text-xs opacity-70 mt-0.5">
                    {t("owner_payment_statement_help")}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {t("owner_settled_count", { count: formatNumber(approvedTransactions.length) })}
                </span>
              </div>

              {transactions.length === 0 ? (
                <div
                  className={`p-8 rounded-2xl border text-center space-y-2 ${styles.subCard}`}
                >
                  <span className="text-3xl block">💠</span>
                  <p className="text-sm font-extrabold">
                    {t("owner_no_payments")}
                  </p>
                  <p className="text-xs opacity-70 max-w-lg mx-auto">
                    {t("owner_no_payments_help")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b text-[11px] font-bold uppercase tracking-wider ${styles.tableHeader}`}
                      >
                        <th className="py-3.5 px-4">{t("arena_datetime")}</th>
                        <th className="py-3.5 px-4">{t("owner_payer")}</th>
                        <th className="py-3.5 px-4">{t("owner_product")}</th>
                        <th className="py-3.5 px-4 text-center">{t("owner_method")}</th>
                        <th className="py-3.5 px-4 text-right">{t("owner_gross")}</th>
                        <th className="py-3.5 px-4 text-right">{t("owner_fee")}</th>
                        <th className="py-3.5 px-4 text-right">{t("owner_net")}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${styles.tableDivider}`}>
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="py-3.5 px-4 font-mono opacity-80 whitespace-nowrap">
                            {formatDateTimeBR(tx.paid_at)}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold">{tx.payer_name}</p>
                            <p className="text-[11px] opacity-65">
                              {tx.payer_email || "—"}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {tx.plan_name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                              {tx.payment_method?.toLowerCase() === "card" ? t("owner_card") : tx.payment_method}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono opacity-80">
                            {formatBRL(tx.gross_amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-500">
                            {tx.gateway_fee == null ? "—" : `-${formatBRL(tx.gateway_fee)}`}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-500">
                            {tx.net_amount == null ? "—" : formatBRL(tx.net_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* MÓDULO: GESTÃO DE PERFIS & PLANOS DE USUÁRIOS                     */
          /* ================================================================= */
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20 scale-105"
                        : styles.tabInactive
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? "bg-purple-800 text-purple-100"
                          : styles.tabInactiveBadge
                      }`}
                    >
                      {formatNumber(tab.count)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-3xl border overflow-hidden transition-colors duration-300 ${styles.tableWrapper}`}
            >
              {loading ? (
                <div className="p-12 text-center opacity-60 font-medium">
                  {t("owner_profiles_loading")}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center opacity-60 font-medium">
                  {t("owner_profiles_empty")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`border-b text-[11px] font-bold uppercase tracking-wider ${styles.tableHeader}`}
                      >
                        <th className="py-4 px-5">{t("owner_user")}</th>
                        <th className="py-4 px-5">{t("owner_email")}</th>
                        <th className="py-4 px-5">{t("owner_age")}</th>
                        <th className="py-4 px-5">{t("owner_current_plan")}</th>
                        <th className="py-4 px-5">{t("owner_role")}</th>
                        <th className="py-4 px-5 text-right">{t("owner_actions")}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${styles.tableDivider}`}>
                      {filteredUsers.map((u) => {
                        const isSelf =
                          currentUserId &&
                          (u.clerk_id === currentUserId ||
                            u.id === currentUserId);
                        const isDeleting = deletingId === u.id;
                        const isSavingRole = savingRoleId === u.id;
                        const normalizedRole = normalizeUserRole(u.role);
                        const planBadge = getPlanBadgeDisplay(u.role);

                        return (
                          <tr
                            key={u.id}
                            className={`transition-colors ${getRoleRowStyle(
                              u.role
                            )}`}
                          >
                            <td className="py-4 px-5 font-semibold whitespace-nowrap">
                              {u.name || t("owner_no_name")}
                              {isSelf && (
                                <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                                  {t("owner_you")}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-5 text-sm opacity-80">
                              {u.email || "—"}
                            </td>

                            <td className="py-4 px-5 text-xs font-bold whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-lg border ${styles.ageBadge}`}
                              >
                                {formatAgeFromBirthdate(u.birth_date)}
                              </span>
                            </td>

                            <td className="py-4 px-5 text-xs whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${planBadge.cls}`}
                              >
                                {planBadge.text}
                              </span>
                            </td>

                            <td className="py-4 px-5 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <select
                                  value={normalizedRole}
                                  aria-label={t("owner_role")}
                                  disabled={isSavingRole}
                                  onChange={(e) =>
                                    handleRoleChange(u.id, e.target.value)
                                  }
                                  className={`border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 transition cursor-pointer disabled:opacity-50 ${styles.roleSelect}`}
                                >
                                  <option value="student_free">
                                    🌱 {t("owner_explorer")} (
                                    {formatBRL(
                                      getDynamicMonthlyPrice("student_free")
                                    )}
                                    )
                                  </option>
                                  <option value="student_pro">
                                    🎓 {t("role_student_pro")} (
                                    {formatBRL(
                                      getDynamicMonthlyPrice("student_pro")
                                    )}
                                    )
                                  </option>
                                  <option value="creator_pro">
                                    🚀 {t("role_educator_pro")} (
                                    {formatBRL(
                                      getDynamicMonthlyPrice("creator_pro")
                                    )}
                                    )
                                  </option>
                                  <option value="manager">
                                    🏫 {t("owner_institutional")} (
                                    {formatBRL(
                                      getDynamicMonthlyPrice("manager")
                                    )}
                                    )
                                  </option>
                                  <option value="owner">
                                    👑 {t("role_owner")}
                                  </option>
                                </select>
                                {isSavingRole && (
                                  <span className="text-[11px] text-indigo-500 font-bold animate-pulse">
                                    {t("saving")}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              {!isSelf ? (
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteUser(u)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition disabled:opacity-50 cursor-pointer"
                                  title={t("owner_delete_title")}
                                >
                                  <span>🗑️</span>
                                  <span>
                                    {t(isDeleting ? "owner_deleting" : "owner_delete")}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[11px] opacity-50 italic">
                                  {t("owner_protected")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
