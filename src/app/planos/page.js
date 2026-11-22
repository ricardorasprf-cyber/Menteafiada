/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/planos/page.js
 * Objetivo: Página visual e interativa de Planos, Assinaturas e Perfis
 * Exclusivos da plataforma, integrada ao ThemeProvider global ("theme-classic",
 * "theme-dark", "theme-synthwave") e ao sistema de autenticação Clerk:
 * - Alternador dinâmico de ciclo de cobrança (Mensal vs. Anual com 20% OFF);
 * - Cards detalhados por perfil: Explorador (Grátis), Aluno Pro, Educador Pro
 *   e Institucional / Escola;
 * - Modal interativo de pré-checkout (PIX / Cartão) e compra avulsa de
 *   videoaulas e e-books;
 * - Matriz comparativa completa de recursos e perguntas frequentes (FAQ).
 * ============================================================================
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/app/components/ThemeProvider";

const PLANS_THEMES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    ambientGlow:
      "bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(99,102,241,0.13),transparent)]",
    badge: "bg-indigo-50 border-indigo-200 text-indigo-700",
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

const PLANS_DATA = [
  {
    id: "free",
    roleTag: "student_free / creator_free",
    icon: "🌱",
    name: "Explorador",
    audience: "Para alunos e professores conhecendo a plataforma",
    monthlyPrice: 0,
    annualPrice: 0,
    priceNote: "Gratuito para sempre",
    featured: false,
    ctaLabel: "Começar Gratuitamente",
    features: [
      "Entrada ilimitada em salas ao vivo via PIN ou QR Code",
      "Participação nas rodadas públicas da Arena Oficial",
      "Criação de até 3 quizzes próprios",
      "Salas ao vivo com até 25 participantes simultâneos",
      "Acesso ao 1º módulo demonstrativo dos cursos",
      "Acesso a e-books e materiais gratuitos de degustação",
    ],
  },
  {
    id: "student_pro",
    roleTag: "student_pro",
    icon: "🎓",
    name: "Aluno Pro",
    audience: "Para estudantes, concurseiros e autodidatas",
    monthlyPrice: 24.9,
    annualPrice: 19.9,
    priceNote: "Acesso total a cursos e e-books",
    featured: false,
    ctaLabel: "Assinar Aluno Pro",
    features: [
      "Tudo do plano Explorador incluído",
      "Acesso ilimitado a todas as videoaulas e trilhas",
      "Download ilimitado de e-books, apostilas e mapas mentais",
      "Banco completo de simulados comentados e revisão",
      "Emissão de certificados digitais verificáveis",
      "Selo VIP e estatísticas avançadas no ranking da Arena",
    ],
  },
  {
    id: "creator_pro",
    roleTag: "creator_pro",
    icon: "🚀",
    name: "Educador Pro",
    audience: "Para professores, mentores e criadores de conteúdo",
    monthlyPrice: 39.9,
    annualPrice: 29.9,
    priceNote: "Mais escolhido por educadores",
    featured: true,
    badgeText: "MAIS POPULAR",
    ctaLabel: "Assinar Educador Pro",
    features: [
      "Criação ilimitada de quizzes e avaliações interativas",
      "Salas ao vivo para até 300 participantes simultâneos",
      "Gerador automático de questões com IA (Gemini)",
      "Exportação completa de notas e relatórios (CSV / PDF)",
      "Publicação de suas próprias videoaulas e e-books",
      "Personalização visual da sala de jogo",
    ],
  },
  {
    id: "institutional",
    roleTag: "manager + creator_pro",
    icon: "🏫",
    name: "Institucional / Escola",
    audience: "Para escolas, cursinhos e treinamentos corporativos",
    monthlyPrice: 149.0,
    annualPrice: 119.0,
    priceNote: "Pacote inicial com 5 licenças docentes",
    featured: false,
    ctaLabel: "Solicitar Proposta / Ativar",
    features: [
      "Painel administrativo do Gestor (distribuição de licenças)",
      "5 contas Educador Pro incluídas (expansível sob demanda)",
      "Salas de grande porte para até 1.000 participantes",
      "Trilhas de videoaulas e PDFs fechadas para seus alunos",
      "Relatórios gerenciais consolidados por turma e docente",
      "Suporte prioritário na implantação pedagógica",
    ],
  },
];

const COMPARISON_MATRIX = [
  {
    feature: "Participação em salas ao vivo via PIN / QR Code",
    free: "Ilimitado",
    student: "Ilimitado",
    creator: "Ilimitado",
    school: "Ilimitado",
  },
  {
    feature: "Batalhas Oficiais da Arena (14h, 16h, 18h, 20h)",
    free: "Incluído",
    student: "Incluído + Selo VIP",
    creator: "Incluído + Selo Pro",
    school: "Incluído + Torneios Privados",
  },
  {
    feature: "Biblioteca de Videoaulas e Trilhas Gravadas",
    free: "1º módulo grátis",
    student: "Acesso Total",
    creator: "Acesso + Publicação",
    school: "Acesso + Trilhas Próprias",
  },
  {
    feature: "Download de E-books, Apostilas e Mapas Mentais",
    free: "Amostras grátis",
    student: "Ilimitado (PDF)",
    creator: "Ilimitado + Publicação",
    school: "Ilimitado Institucional",
  },
  {
    feature: "Certificados Digitais Verificáveis",
    free: "—",
    student: "Incluído",
    creator: "Incluído",
    school: "Personalizado com Logo",
  },
  {
    feature: "Quizzes Criados pelo Usuário",
    free: "Até 3 quizzes",
    student: "Até 5 quizzes",
    creator: "Ilimitado",
    school: "Ilimitado",
  },
  {
    feature: "Limite de Alunos por Sala Ao Vivo",
    free: "Até 25 alunos",
    student: "Até 25 alunos",
    creator: "Até 300 alunos",
    school: "Até 1.000 alunos",
  },
  {
    feature: "Gerador de Questões com IA (Gemini)",
    free: "—",
    student: "—",
    creator: "Ilimitado",
    school: "Ilimitado",
  },
  {
    feature: "Exportação de Relatórios e Notas (CSV / PDF)",
    free: "Visualização na tela",
    student: "Boletim pessoal",
    creator: "Exportação Completa",
    school: "Auditoria Multi-turmas",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { theme } = useTheme();
  const styles = PLANS_THEMES[theme] || PLANS_THEMES["theme-classic"];

  const [billingCycle, setBillingCycle] = useState("annual"); // 'monthly' | 'annual'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");

  const formatBRL = (val) =>
    val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const handleSelectPlan = (plan) => {
    if (plan.id === "free") {
      if (isSignedIn) {
        router.push("/dashboard/participant");
      } else {
        router.push("/sign-up");
      }
      return;
    }

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setSelectedPlan(plan);
  };

  return (
    <div
      className={`min-h-[calc(100vh-70px)] relative font-sans transition-colors duration-300 pb-24 ${styles.mainBg}`}
    >
      {/* Glow Ambiental */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${styles.ambientGlow}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 space-y-14">
        {/* Cabeçalho & Seletor Mensal / Anual */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${styles.badge}`}
            >
              <span>💎</span> PLANOS & PERFIS EXCLUSIVOS
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Potencialize seu aprendizado e suas aulas no MenteAfiada
          </h1>

          <p className="text-sm md:text-base opacity-75 leading-relaxed">
            Comece gratuitamente nas salas ao vivo ou desbloqueie acesso
            completo a videoaulas, e-books exclusivos, geração de quizzes com
            IA e relatórios avançados.
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
                Cobrança Mensal
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
                <span>Plano Anual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                  -20% OFF
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Grid de 4 Planos */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {PLANS_DATA.map((plan) => {
            const activePrice =
              billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 md:p-7 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 border ${
                  plan.featured ? styles.cardFeatured : styles.card
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {plan.badgeText}
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
                    <h2 className="text-xl font-black">{plan.name}</h2>
                    <p className="text-xs opacity-70 mt-1 leading-relaxed">
                      {plan.audience}
                    </p>
                  </div>

                  {/* Preço */}
                  <div className={`p-4 rounded-2xl border ${styles.subBox}`}>
                    {activePrice === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black">R$ 0</span>
                        <span className="text-xs opacity-70">/ para sempre</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black">
                            {formatBRL(activePrice)}
                          </span>
                          <span className="text-xs opacity-70">/ mês</span>
                        </div>
                        {billingCycle === "annual" && (
                          <span className="text-[11px] text-emerald-500 font-bold block mt-0.5">
                            Cobrado anualmente ({formatBRL(activePrice * 12)}/ano)
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] opacity-70 block mt-1">
                      {plan.priceNote}
                    </span>
                  </div>

                  {/* Lista de Benefícios */}
                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-emerald-500 font-black mt-0.5">
                          ✓
                        </span>
                        <span className="opacity-90 leading-snug">{feat}</span>
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
                    {plan.ctaLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Destaque de Compra Avulsa (Videoaulas & E-books) */}
        <section
          className={`border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 ${styles.card}`}
        >
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shrink-0">
              📚
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                MODALIDADE FLEXÍVEL • SEM MENSALIDADE
              </span>
              <h3 className="text-lg md:text-xl font-black">
                Prefere adquirir apenas um Curso ou E-book específico?
              </h3>
              <p className="text-xs md:text-sm opacity-75 max-w-2xl">
                Você pode manter sua conta gratuita e desbloquear cursos
                completos, apostilas em PDF ou pacotes de simulados com{" "}
                <strong>pagamento único via PIX ou Cartão</strong>, liberando o
                acesso direto na sua área &ldquo;Meus Cursos&rdquo;.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/participant"
            className={`px-6 py-3.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition ${styles.btnPrimary}`}
          >
            Explorar Catálogo de Cursos →
          </Link>
        </section>

        {/* Tabela Comparativa Detalhada */}
        <section className={`border rounded-3xl p-6 md:p-8 space-y-6 ${styles.card}`}>
          <div>
            <h2 className="text-xl md:text-2xl font-black">
              Comparativo Completo de Recursos por Perfil
            </h2>
            <p className="text-xs opacity-70 mt-1">
              Veja em detalhes o que cada perfil desbloqueia na plataforma.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] uppercase font-extrabold tracking-wider ${styles.tableHeader}`}
                >
                  <th className="py-3.5 px-4">Funcionalidade / Recurso</th>
                  <th className="py-3.5 px-4 text-center">Explorador</th>
                  <th className="py-3.5 px-4 text-center">Aluno Pro</th>
                  <th className="py-3.5 px-4 text-center text-indigo-500">
                    Educador Pro
                  </th>
                  <th className="py-3.5 px-4 text-center">Institucional</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_MATRIX.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition ${styles.tableRow}`}
                  >
                    <td className="py-3.5 px-4 font-bold">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center opacity-75">
                      {row.free}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {row.student}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-indigo-500">
                      {row.creator}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {row.school}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal de Pré-Checkout (Preparado para Integração PIX / Cartão) */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full border rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl ${styles.modalBg}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  RESUMO DA ASSINATURA
                </span>
                <h3 className="text-xl font-black mt-0.5">
                  {selectedPlan.icon} {selectedPlan.name}
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  Conta: {user?.primaryEmailAddress?.emailAddress}
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
                <span>Ciclo selecionado:</span>
                <strong className="uppercase">
                  {billingCycle === "annual" ? "Anual (-20%)" : "Mensal"}
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Perfil ativado automaticamente:</span>
                <span className="font-mono font-bold text-indigo-500">
                  {selectedPlan.roleTag}
                </span>
              </div>
              <div className="flex justify-between items-center text-base font-black pt-2 border-t border-inherit mt-2">
                <span>Total:</span>
                <span>
                  {formatBRL(
                    billingCycle === "annual"
                      ? selectedPlan.annualPrice * 12
                      : selectedPlan.monthlyPrice
                  )}
                  <span className="text-xs font-normal opacity-70">
                    {billingCycle === "annual" ? " / ano" : " / mês"}
                  </span>
                </span>
              </div>
            </div>

            {/* Escolha da Forma de Pagamento */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold block">
                Forma de Pagamento:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    paymentMethod === "pix"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                      : styles.subBox
                  }`}
                >
                  <span>💠</span> PIX Instantâneo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    paymentMethod === "card"
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-500"
                      : styles.subBox
                  }`}
                >
                  <span>💳</span> Cartão de Crédito
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed">
              <strong>Modo de Pré-Lançamento:</strong> A vitrine de planos está
              ativa. Assim que você conectar sua chave do{" "}
              <strong>Mercado Pago</strong>, <strong>Asaas</strong> ou{" "}
              <strong>Stripe</strong>, este botão gerará a cobrança real e
              promoverá o perfil automaticamente via Webhook.
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer ${styles.btnSecondary}`}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  alert(
                    `Checkout preparado para o plano "${selectedPlan.name}" via ${paymentMethod.toUpperCase()}.\n\nPróximo passo: conectar as credenciais do gateway de pagamento (Mercado Pago, Asaas ou Stripe) para gerar o QR Code PIX / Link de Cartão.`
                  );
                  setSelectedPlan(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-extrabold cursor-pointer ${styles.btnPrimary}`}
              >
                Continuar para Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}