/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/planos/page.js
 * Objetivo: Página visual e interativa de Planos, Assinaturas e Perfis
 * Exclusivos conectada dinamicamente à tabela `subscription_plans` do
 * Supabase (sincronizada em tempo real com o Painel do Proprietário),
 * integrada ao ThemeProvider global ("theme-classic", "theme-dark",
 * "theme-synthwave") e ao Clerk Auth.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/app/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";

const PLANS_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(99,102,241,0.13),transparent)]",
    badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
    promoBanner:
      "bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/20",
    toggleBox: "bg-white border-slate-200 shadow-sm",
    toggleInactive: "text-slate-600 hover:text-slate-900",
    card: "bg-white border-slate-200 shadow-xl shadow-slate-200/50 text-slate-900",
    cardFeatured:
      "bg-white border-2 border-indigo-600 shadow-2xl shadow-indigo-500/20 text-slate-900",
    subBox: "bg-slate-50 border-slate-200/80 text-slate-700",
    btnSecondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
    btnPrimary:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25",
    tableHeader: "bg-slate-100 text-slate-700 border-slate-200",
    tableRow: "border-slate-100 hover:bg-slate-50",
    modalBg: "bg-white border-slate-200 text-slate-900",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]",
    badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    promoBanner:
      "bg-gradient-to-r from-purple-700 via-indigo-700 to-fuchsia-700 text-white shadow-xl shadow-purple-950/50",
    toggleBox: "bg-slate-900 border-slate-800",
    toggleInactive: "text-slate-400 hover:text-white",
    card: "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/60 text-slate-100",
    cardFeatured:
      "bg-slate-900 border-2 border-purple-500 shadow-2xl shadow-purple-900/40 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-300",
    btnSecondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    btnPrimary:
      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40",
    tableHeader: "bg-slate-950/80 text-slate-300 border-slate-800",
    tableRow: "border-slate-800/80 hover:bg-slate-800/40",
    modalBg: "bg-slate-900 border-slate-700 text-slate-100",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    ambientGlow:
      "bg-[radial-gradient(ellipse_90%_65%_at_50%_-10%,rgba(217,70,239,0.28),rgba(34,211,238,0.14),transparent)]",
    badge:
      "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
    promoBanner:
      "bg-gradient-to-r from-fuchsia-600 via-purple-700 to-cyan-600 text-white shadow-[0_0_30px_rgba(217,70,239,0.4)]",
    toggleBox:
      "bg-[#090d22] border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.2)]",
    toggleInactive: "text-cyan-200/70 hover:text-cyan-100",
    card: "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(217,70,239,0.15)] text-cyan-50",
    cardFeatured:
      "bg-[#090d22] border-2 border-cyan-400 shadow-[0_0_45px_rgba(34,211,238,0.28)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-100",
    btnSecondary:
      "bg-[#0b0f26] hover:border-fuchsia-400 text-cyan-100 border border-cyan-500/40",
    btnPrimary:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.5)]",
    tableHeader: "bg-[#040612] text-cyan-300 border-fuchsia-500/30",
    tableRow: "border-indigo-500/20 hover:bg-fuchsia-500/10",
    modalBg: "bg-[#090d22] border-fuchsia-500/50 text-cyan-50",
  },
};

const INITIAL_PLANS_DATA = [
  {
    id: "free",
    roleTag: "student_free / creator_free",
    icon: "🌱",
    name: "Explorador",
    audience: "plans_free_audience",
    regularMonthlyPrice: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    priceNote: "plans_free_note",
    featured: false,
    ctaLabel: "plans_free_cta",
    features: [
      "plans_feature_join",
      "plans_feature_arena",
      "plans_feature_own_quizzes",
      "plans_feature_25",
      "plans_feature_intro",
      "plans_feature_samples",
    ],
  },
  {
    id: "student_pro",
    roleTag: "student_pro",
    icon: "🎓",
    name: "Aluno Pro",
    audience: "plans_student_audience",
    regularMonthlyPrice: 24.9,
    monthlyPrice: 9.9,
    annualPrice: 7.4,
    priceNote: "plans_student_note",
    featured: false,
    ctaLabel: "plans_student_cta",
    features: [
      "plans_feature_all_free",
      "plans_feature_videos",
      "plans_feature_downloads",
      "plans_feature_practice",
      "plans_feature_certificates",
      "plans_feature_vip",
    ],
  },
  {
    id: "creator_pro",
    roleTag: "creator_pro",
    icon: "🚀",
    name: "Educador Pro",
    audience: "plans_creator_audience",
    regularMonthlyPrice: 39.9,
    monthlyPrice: 19.9,
    annualPrice: 14.9,
    priceNote: "plans_creator_note",
    featured: true,
    badgeText: "plans_popular",
    ctaLabel: "plans_creator_cta",
    features: [
      "plans_feature_unlimited_quiz",
      "plans_feature_300",
      "plans_feature_ai",
      "plans_feature_reports",
      "plans_feature_publish",
      "plans_feature_room_style",
    ],
  },
  {
    id: "institutional",
    roleTag: "manager + creator_pro",
    icon: "🏫",
    name: "Institucional / Escola",
    audience: "plans_school_audience",
    regularMonthlyPrice: 149.0,
    monthlyPrice: 79.9,
    annualPrice: 59.9,
    priceNote: "plans_school_note",
    featured: false,
    ctaLabel: "plans_school_cta",
    features: [
      "plans_feature_manager",
      "plans_feature_licenses",
      "plans_feature_1000",
      "plans_feature_private_content",
      "plans_feature_class_reports",
      "plans_feature_support",
    ],
  },
];

const COMPARISON_MATRIX = [
  {
    feature: "plans_matrix_join",
    free: "shared_unlimited",
    student: "shared_unlimited",
    creator: "shared_unlimited",
    school: "shared_unlimited",
  },
  {
    feature: "plans_matrix_arena",
    free: "plans_included",
    student: "plans_vip",
    creator: "plans_pro_badge",
    school: "plans_tournaments",
  },
  {
    feature: "plans_matrix_videos",
    free: "plans_first_module",
    student: "plans_full_access",
    creator: "plans_with_publish",
    school: "plans_with_own_courses",
  },
  {
    feature: "plans_matrix_downloads",
    free: "plans_samples",
    student: "plans_unlimited_pdf",
    creator: "plans_unlimited_publish",
    school: "plans_unlimited_school",
  },
  {
    feature: "plans_matrix_certificates",
    free: "—",
    student: "plans_included",
    creator: "plans_included",
    school: "plans_custom_logo",
  },
  {
    feature: "plans_matrix_quizzes",
    free: "plans_up_to_3",
    student: "plans_up_to_5",
    creator: "shared_unlimited",
    school: "shared_unlimited",
  },
  {
    feature: "plans_matrix_limit",
    free: "plans_up_to_25",
    student: "plans_up_to_25",
    creator: "plans_up_to_300",
    school: "plans_up_to_1000",
  },
  {
    feature: "plans_matrix_ai",
    free: "—",
    student: "—",
    creator: "shared_unlimited",
    school: "shared_unlimited",
  },
  {
    feature: "plans_matrix_reports",
    free: "plans_on_screen",
    student: "plans_personal_report",
    creator: "plans_full_export",
    school: "plans_audit",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const styles = PLANS_THEMES[theme] || PLANS_THEMES["theme-classic"];

  const [plans, setPlans] = useState(INITIAL_PLANS_DATA);
  const [billingCycle, setBillingCycle] = useState("annual"); // 'monthly' | 'annual'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pixEnabled, setPixEnabled] = useState(false);
  const [pix, setPix] = useState(null);
  const [pixBusy, setPixBusy] = useState(false);
  const [pixError, setPixError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    fetch("/api/payments/pix", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPixEnabled(data?.enabled === true))
      .catch(() => {});
    return () => controller.abort();
  }, [user?.id]);

  const annualTotal = (plan) => plan.annualTotal ?? plan.annualPrice * 12;
  const canPayPix = pixEnabled && selectedPlan?.id === "creator_pro" && billingCycle === "annual";

  async function submitPix() {
    setPixBusy(true);
    setPixError("");
    try {
      const response = await fetch("/api/payments/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedCents: Math.round(annualTotal(selectedPlan) * 100),
          orderId: pix?.status === "pending" ? pix.orderId : undefined,
        }),
      });
      if (response.status === 409) {
        setPixError(t("plans_pix_price_changed"));
        return;
      }
      if (!response.ok) throw new Error();
      setPix(await response.json());
    } catch {
      setPixError(t("plans_pix_error"));
    } finally {
      setPixBusy(false);
    }
  }

  // Sincroniza automaticamente com os preços configurados no Painel do Proprietário (subscription_plans)
  useEffect(() => {
    async function loadDynamicPricing() {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*");

      if (!error && data && data.length > 0) {
        setPlans((prev) =>
          prev.map((item) => {
            const dbMatch = data.find((d) => d.id === item.id);
            if (!dbMatch) return item;
            return {
              ...item,
              name: dbMatch.name || item.name,
              regularMonthlyPrice: Number(
                dbMatch.regular_monthly_price ?? item.regularMonthlyPrice
              ),
              monthlyPrice: Number(dbMatch.monthly_price ?? item.monthlyPrice),
              annualPrice: Number(
                dbMatch.annual_monthly_price ?? item.annualPrice
              ),
              annualTotal: dbMatch.annual_total_price == null ? null : Number(dbMatch.annual_total_price),
            };
          })
        );
      }
    }

    loadDynamicPricing();
  }, []);

  const formatBRL = (val) =>
    Number(val || 0).toLocaleString(locale, {
      style: "currency",
      currency: "BRL",
    });

  const displayPlanName = (plan) => {
    const original = INITIAL_PLANS_DATA.find((entry) => entry.id === plan.id);
    if (original?.name !== plan.name) return plan.name;
    return t({
      free: "owner_explorer", student_pro: "role_student_pro",
      creator_pro: "role_educator_pro", institutional: "plans_school_name",
    }[plan.id]);
  };

  const handleSelectPlan = (plan) => {
    if (plan.id === "free") {
      if (isSignedIn) {
        router.push("/dashboard/courses");
      } else {
        router.push("/sign-up");
      }
      return;
    }

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setPix(null);
    setPixError("");
    setSelectedPlan(plan);
  };

  const studentProPlan = plans.find((p) => p.id === "student_pro");
  const creatorProPlan = plans.find((p) => p.id === "creator_pro");
  const institutionalPlan = plans.find((p) => p.id === "institutional");

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative font-sans transition-colors duration-300 pb-24 ${styles.mainBg}`}
    >
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 space-y-12">
        {/* Faixa Promocional de Lançamento */}
        <div
          className={`rounded-2xl px-5 py-3 text-center text-xs md:text-sm font-extrabold tracking-wide flex flex-wrap items-center justify-center gap-2 ${styles.promoBanner}`}
        >
          <span>🔥 {t("plans_promo")}</span>
          <span className="font-normal opacity-95">
            {t("plans_promo_desc")}
          </span>
        </div>

        {/* Cabeçalho & Seletor Mensal / Anual */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${styles.badge}`}
            >
              <span>💎</span> {t("plans_badge")}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {t("plans_title")}
          </h1>

          <p className="text-sm md:text-base opacity-75 leading-relaxed">
            {t("plans_intro")}
          </p>

          {/* Alternador Mensal / Anual */}
          <div className="pt-2 flex justify-center">
            <div
              className={`inline-flex items-center p-1.5 rounded-2xl border gap-1 ${styles.toggleBox}`}
            >
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-indigo-600 text-white shadow"
                    : styles.toggleInactive
                }`}
              >
                {t("plans_monthly")}
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-indigo-600 text-white shadow"
                    : styles.toggleInactive
                }`}
              >
                <span>{t("plans_annual")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                  {t("plans_discount")}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Grid de 4 Planos Dinâmicos */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const activePrice =
              billingCycle === "annual" ? annualTotal(plan) / 12 : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 md:p-7 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 border ${
                  plan.featured ? styles.cardFeatured : styles.card
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
                    {t(plan.badgeText)}
                  </span>
                )}

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{plan.icon}</span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {plan.roleTag}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-black">{displayPlanName(plan)}</h2>
                    <p className="text-xs opacity-70 mt-1 leading-relaxed">
                      {t(plan.audience)}
                    </p>
                  </div>

                  {/* Preço Sincronizado com o Banco */}
                  <div className={`p-4 rounded-2xl border ${styles.subBox}`}>
                    {activePrice === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black">{formatBRL(0)}</span>
                        <span className="text-xs opacity-70">{t("plans_forever")}</span>
                      </div>
                    ) : (
                      <div>
                        {plan.regularMonthlyPrice > activePrice && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs line-through opacity-55">
                              {t("plans_from")} {formatBRL(plan.regularMonthlyPrice)}
                            </span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                              {t("plans_launch")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black">
                            {formatBRL(activePrice)}
                          </span>
                          <span className="text-xs opacity-70">{t("plans_per_month")}</span>
                        </div>
                        {billingCycle === "annual" && (
                          <span className="text-[11px] text-emerald-500 font-bold block mt-0.5">
                            {t("plans_annual_total", { amount: formatBRL(annualTotal(plan)) })}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] opacity-75 font-medium block mt-1.5">
                      {t(plan.priceNote)}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-emerald-500 font-black mt-0.5">
                          ✓
                        </span>
                        <span className="opacity-90 leading-snug">{t(feat)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
                      plan.featured ? styles.btnPrimary : styles.btnSecondary
                    }`}
                  >
                    {t(plan.ctaLabel)}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Destaque de Compra Avulsa */}
        <section
          className={`border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 ${styles.card}`}
        >
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shrink-0">
              📚
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                {t("plans_one_time")}
              </span>
              <h3 className="text-lg md:text-xl font-black">
                {t("plans_single_title")}
              </h3>
              <p className="text-xs md:text-sm opacity-75 max-w-2xl">
                {t("plans_single_desc")}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/courses"
            className={`px-6 py-3.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition ${styles.btnPrimary}`}
          >
            {t("plans_explore")}
          </Link>
        </section>

        {/* Tabela Comparativa Detalhada */}
        <section
          className={`border rounded-3xl p-6 md:p-8 space-y-6 ${styles.card}`}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-black">
              {t("plans_comparison")}
            </h2>
            <p className="text-xs opacity-70 mt-1">
              {t("plans_comparison_desc")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] uppercase font-extrabold tracking-wider ${styles.tableHeader}`}
                >
                  <th className="py-3.5 px-4">{t("plans_feature")}</th>
                  <th className="py-3.5 px-4 text-center">{t("owner_explorer")}</th>
                  <th className="py-3.5 px-4 text-center">
                    {t("role_student_pro")}
                    <span className="block text-[10px] font-normal opacity-75">
                      {formatBRL(studentProPlan?.monthlyPrice)}{t("plans_per_month")}
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center text-indigo-500">
                    {t("role_educator_pro")}
                    <span className="block text-[10px] font-normal opacity-80">
                      {formatBRL(creatorProPlan?.monthlyPrice)}{t("plans_per_month")}
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {t("owner_institutional")}
                    <span className="block text-[10px] font-normal opacity-75">
                      {formatBRL(institutionalPlan?.monthlyPrice)}{t("plans_per_month")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_MATRIX.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition ${styles.tableRow}`}
                  >
                    <td className="py-3.5 px-4 font-bold">{t(row.feature)}</td>
                    <td className="py-3.5 px-4 text-center opacity-75">
                      {t(row.free)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {t(row.student)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-indigo-500">
                      {t(row.creator)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {t(row.school)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal de Pré-Checkout */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full border rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl ${styles.modalBg}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  {t("plans_summary")}
                </span>
                <h3 className="text-xl font-black mt-0.5">
                  {selectedPlan.icon} {displayPlanName(selectedPlan)}
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  {t("plans_account")} {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-sm font-black opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${styles.subBox}`}>
              <div className="flex justify-between items-center text-xs">
                <span>{t("plans_cycle")}</span>
                <strong className="uppercase">
                  {t(billingCycle === "annual" ? "plans_annual" : "plans_monthly")}
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>{t("plans_profile")}</span>
                <span className="font-mono font-bold text-indigo-500">
                  {selectedPlan.roleTag}
                </span>
              </div>
              <div className="flex justify-between items-center text-base font-black pt-2 border-t border-inherit mt-2">
                <span>{t("plans_total")}</span>
                <span>
                  {formatBRL(
                    billingCycle === "annual"
                      ? annualTotal(selectedPlan)
                      : selectedPlan.monthlyPrice
                  )}
                  <span className="text-xs font-normal opacity-70">
                    {" "}{t(billingCycle === "annual" ? "plans_per_year" : "plans_per_month")}
                  </span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold block">
                {t("plans_payment_method")}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="p-3 rounded-xl border border-emerald-500 bg-emerald-500/15 text-emerald-500 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span>💠</span> {t("plans_pix")}
                </div>

                <button
                  type="button"
                  disabled
                  className={`p-3 rounded-xl border text-xs font-bold cursor-not-allowed opacity-60 ${styles.subBox}`}
                >
                  <span>💳</span> {t("plans_card")}
                  <span className="block mt-1">{t("plans_card_soon")}</span>
                </button>
              </div>
            </div>

            {!canPayPix && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                {t("plans_demo")}
              </div>
            )}
            {pixError && <p role="alert" className="text-sm">{pixError}</p>}
            {pix?.status === "pending" && (
              <div className="space-y-2 text-sm">
                <p role="status">{t("plans_pix_waiting", { amount: formatBRL(pix.amount) })}</p>
                {pix.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mx-auto" width="160" height="160"
                    src={`data:image/png;base64,${pix.image}`} alt="QR Code Pix" />
                )}
                {pix.code && (
                  <label className="block">
                    {t("plans_pix_code")}
                    <input className="block w-full rounded border p-2" readOnly value={pix.code}
                      onFocus={(event) => event.target.select()} />
                    <button type="button" className="underline"
                      onClick={() => navigator.clipboard.writeText(pix.code).catch(() => {
                        setPixError(t("plans_pix_manual_copy"));
                      })}>
                      {t("plans_pix_copy")}
                    </button>
                  </label>
                )}
              </div>
            )}
            {pix?.status === "paid" && (
              <p role="status">{t("plans_pix_paid", { date: new Date(pix.accessUntil).toLocaleDateString(locale) })}</p>
            )}
            {pix?.status === "failed" && (
              <p role="status">{t("plans_pix_failed")}</p>
            )}
            {["expired", "canceled"].includes(pix?.status) && (
              <p role="status">{t("plans_pix_closed")}</p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer ${styles.btnSecondary}`}
              >
                {t("plans_back")}
              </button>

              <button
                type="button"
                onClick={submitPix}
                data-mp-checkout-cta="create-order"
                disabled={!canPayPix || pixBusy || pix?.status === "paid"}
                className={`flex-1 py-3 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50 ${styles.btnPrimary}`}
              >
                {pixBusy ? t("plans_pix_loading") : pix?.status === "pending" ? t("plans_pix_verify") : t("plans_payment_cta")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
