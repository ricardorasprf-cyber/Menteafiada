/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/arena/page.js
 * Objetivo: Painel central da Arena de Batalhas Educacionais integrado ao
 * ThemeProvider global ("theme-classic", "theme-dark", "theme-synthwave")
 * e ao cabeçalho unificado (PlatformHeader):
 * - Liberação antecipada do link e botão de entrada APENAS nos 5 MINUTOS
 *   anteriores a cada horário oficial (14h, 16h, 18h e 20h - Brasília);
 * - Encerramento imediato do link de acesso assim que a contagem regressiva
 *   de 5 minutos termina (exibindo "Inscrições Encerradas • Batalha em Curso");
 * - Estatísticas da temporada mensal, Liga Educacional, Top 10 e Histórico.
 * ============================================================================
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/app/components/ThemeProvider";

const PRE_OPEN_MINUTES = 5; // Janela exclusiva de 5 minutos antes do início oficial

const ARENA_DASHBOARD_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    seasonBanner:
      "bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-indigo-400/40 text-white shadow-xl shadow-indigo-900/15",
    scheduleCardInactive:
      "bg-white border-slate-200 shadow-sm hover:border-indigo-300",
    scheduleCardActive:
      "border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/40 cursor-pointer hover:scale-[1.02]",
    metricCard:
      "bg-white border-slate-200 shadow-md shadow-slate-200/40 text-slate-900",
    panelCard:
      "bg-white border-slate-200 shadow-lg shadow-slate-200/40 text-slate-900",
    rankRowDefault: "bg-slate-50 border-slate-200",
    rankRowUser: "bg-indigo-50 border-indigo-400 shadow-sm",
    tableHeader: "bg-slate-100 text-slate-600 border-slate-200",
    tableRow: "border-slate-100 hover:bg-slate-50",
    footer: "border-slate-200 text-slate-500",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    seasonBanner:
      "bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 border-purple-700/50 text-white shadow-2xl",
    scheduleCardInactive: "bg-slate-900/90 border-slate-800",
    scheduleCardActive:
      "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/40 cursor-pointer hover:scale-[1.02]",
    metricCard:
      "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/40 text-slate-100",
    panelCard:
      "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/40 text-slate-100",
    rankRowDefault: "bg-slate-950/40 border-slate-800/80",
    rankRowUser: "bg-purple-600/15 border-purple-500/50 shadow-sm",
    tableHeader: "bg-slate-950/60 text-slate-400 border-slate-800",
    tableRow: "border-slate-800/80 hover:bg-slate-800/40",
    footer: "border-slate-800 text-slate-500",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    seasonBanner:
      "bg-gradient-to-r from-fuchsia-950 via-[#0d1130] to-cyan-950 border-fuchsia-500/50 text-white shadow-[0_0_40px_rgba(217,70,239,0.25)]",
    scheduleCardInactive:
      "bg-[#090d22]/90 border-indigo-500/30 hover:border-cyan-400/50",
    scheduleCardActive:
      "border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400/50 cursor-pointer hover:scale-[1.02]",
    metricCard:
      "bg-[#090d22]/90 border-fuchsia-500/30 shadow-[0_0_25px_rgba(192,38,211,0.12)] text-cyan-50",
    panelCard:
      "bg-[#090d22]/95 border-fuchsia-500/35 shadow-[0_0_30px_rgba(192,38,211,0.15)] text-cyan-50",
    rankRowDefault: "bg-[#040612]/80 border-cyan-500/20",
    rankRowUser:
      "bg-fuchsia-500/15 border-fuchsia-400/60 shadow-[0_0_15px_rgba(217,70,239,0.2)]",
    tableHeader: "bg-[#040612] text-cyan-300/80 border-fuchsia-500/25",
    tableRow: "border-indigo-500/20 hover:bg-fuchsia-500/10",
    footer: "border-fuchsia-500/20 text-cyan-200/50",
  },
};

export default function ArenaDashboardPage() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const styles =
    ARENA_DASHBOARD_STYLES[theme] || ARENA_DASHBOARD_STYLES["theme-classic"];

  const [activeSeason, setActiveSeason] = useState({
    code: "2026-11",
    title: "Temporada Novembro 2026",
    rewards: "Top 3 ganham acesso antecipado exclusivo e certificados VIP",
  });
  const [userStats, setUserStats] = useState({
    monthlyScore: 0,
    battlesCount: 0,
    podiumsCount: 0,
    averageScore: 0,
    rankPosition: "-",
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeRooms, setActiveRooms] = useState([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [ensuringPreOpen, setEnsuringPreOpen] = useState(false);

  const [nextBattleCountdown, setNextBattleCountdown] = useState({
    targetDate: null,
    targetHourText: "14:00",
    formattedTime: "--:--:--",
    isPreOpenWindow: false, // True SOMENTE nos 5 minutos antes do início
    isClosedInProgress: false, // True quando a contagem regressiva de 5 min acabou
    livePin: null,
  });

  // 1. Calcula as próximas batalhas: libera o link 5 min antes e ENCERRA o link quando a contagem acaba
  const calcularProximosHorarios = useCallback((salasAbertas = []) => {
    const horariosFixos = [14, 16, 18, 20];
    const agora = new Date();
    const proximasBatalhas = [];

    const salaAoVivo = salasAbertas.find(
      (s) => s.status === "waiting" || s.status === "in_progress"
    );

    let diaOffset = 0;
    let proximaDataAlvo = null;
    let proximaHoraTexto = "14:00";
    let emJanelaPreAbertura = false;
    let rodadaJaIniciadaFechada = false;
    let pinJanelaAtual = null;

    while (proximasBatalhas.length < 4 && diaOffset < 7) {
      const dataAlvo = new Date(agora);
      dataAlvo.setDate(agora.getDate() + diaOffset);

      for (const hora of horariosFixos) {
        const dataInicioBatalha = new Date(dataAlvo);
        dataInicioBatalha.setHours(hora, 0, 0, 0);

        const dataAberturaAntecipada = new Date(
          dataInicioBatalha.getTime() - PRE_OPEN_MINUTES * 60 * 1000
        );
        // Exibe o card informativo da rodada em curso por até 15 min após o início (mas SEM link de entrada)
        const dataFimEstimado = new Date(
          dataInicioBatalha.getTime() + 15 * 60 * 1000
        );

        const estaNaJanela5Min =
          agora >= dataAberturaAntecipada && agora < dataInicioBatalha;
        const jaPassouDoInicio =
          agora >= dataInicioBatalha && agora <= dataFimEstimado;

        const salaAbertaCorrespondente =
          salasAbertas.find((s) => {
            const created = new Date(s.created_at);
            const diffMin =
              Math.abs(dataInicioBatalha.getTime() - created.getTime()) /
              (1000 * 60);
            return diffMin <= 20;
          }) ||
          (estaNaJanela5Min || jaPassouDoInicio ? salaAoVivo : null);

        if (dataFimEstimado > agora) {
          if (!proximaDataAlvo) {
            proximaDataAlvo = estaNaJanela5Min
              ? dataInicioBatalha
              : dataAberturaAntecipada;
            proximaHoraTexto = `${hora}:00h`;
            emJanelaPreAbertura = estaNaJanela5Min;
            rodadaJaIniciadaFechada = jaPassouDoInicio;
            pinJanelaAtual = estaNaJanela5Min
              ? salaAbertaCorrespondente?.pin || null
              : null;
          }

          const diffParaAbrirMs =
            dataAberturaAntecipada.getTime() - agora.getTime();
          const diffParaIniciarMs =
            dataInicioBatalha.getTime() - agora.getTime();

          let tempoRestanteTexto = "";
          if (estaNaJanela5Min) {
            const mins = Math.max(0, Math.floor(diffParaIniciarMs / 60000));
            const secs = Math.max(
              0,
              Math.floor((diffParaIniciarMs % 60000) / 1000)
            );
            tempoRestanteTexto = `Acesso aberto! Fecha em ${mins}m ${String(
              secs
            ).padStart(2, "0")}s`;
          } else if (jaPassouDoInicio) {
            tempoRestanteTexto = "Acesso encerrado • Partida em curso";
          } else {
            const diffHoras = Math.floor(diffParaAbrirMs / (1000 * 60 * 60));
            const diffMinutos = Math.floor(
              (diffParaAbrirMs % (1000 * 60 * 60)) / (1000 * 60)
            );
            const horaAberturaStr = `${String(hora - 1).padStart(2, "0")}:55h`;
            if (diffHoras > 0) {
              tempoRestanteTexto = `Abre às ${horaAberturaStr} (em ${diffHoras}h ${diffMinutos}m)`;
            } else {
              tempoRestanteTexto = `Abre às ${horaAberturaStr} (em ${diffMinutos} min)`;
            }
          }

          const diaFormatado = dataInicioBatalha.toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          });

          // REGRA ESTRITA: Link de entrada disponível APENAS durante a contagem de 5 minutos antes do início
          const podeEntrarAgora = estaNaJanela5Min;

          proximasBatalhas.push({
            id: `${diaOffset}-${hora}`,
            horaNum: hora,
            tituloRodada: `Batalha Oficial das ${hora}:00h`,
            descricao: "Quiz Oficial Valorado para o Ranking Mensal",
            dataHora: `${hora}:00`,
            diaFormatado:
              diaOffset === 0
                ? "Hoje"
                : diaOffset === 1
                ? "Amanhã"
                : diaFormatado,
            tempoRestante: tempoRestanteTexto,
            isDisponivel: podeEntrarAgora,
            isPreOpen: estaNaJanela5Min,
            isEncerradaEmCurso: jaPassouDoInicio,
            pin: podeEntrarAgora ? salaAbertaCorrespondente?.pin || null : null,
          });

          if (proximasBatalhas.length === 4) break;
        }
      }
      diaOffset++;
    }

    setUpcomingSchedule(proximasBatalhas);

    setNextBattleCountdown((prev) => ({
      ...prev,
      targetDate: proximaDataAlvo,
      targetHourText: proximaHoraTexto,
      isPreOpenWindow: emJanelaPreAbertura,
      isClosedInProgress: rodadaJaIniciadaFechada,
      livePin: pinJanelaAtual,
    }));
  }, []);

  // 2. Carrega salas ativas, temporada, ranking e histórico
  const carregarDadosCompletosArena = useCallback(async () => {
    try {
      setLoading(true);

      const { data: salasAbertas } = await supabase
        .from("game_rooms")
        .select(
          "id, pin, title, status, created_at, quiz_id, quizzes(title, category)"
        )
        .eq("is_arena", true)
        .in("status", ["waiting", "in_progress"])
        .order("created_at", { ascending: false });

      const listaSalas = salasAbertas || [];
      setActiveRooms(listaSalas);
      calcularProximosHorarios(listaSalas);

      const { data: seasonData } = await supabase
        .from("arena_seasons")
        .select("season_code, title, rewards_description")
        .eq("is_active", true)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const seasonCode = seasonData?.season_code || "2026-11";
      if (seasonData) {
        setActiveSeason({
          code: seasonData.season_code,
          title: seasonData.title,
          rewards:
            seasonData.rewards_description ||
            "Acessos exclusivos e insígnias para o Top 3",
        });
      }

      const { data: rankingData } = await supabase
        .from("arena_monthly_rankings")
        .select("clerk_id, player_name, monthly_score, last_battle_at")
        .eq("season_code", seasonCode)
        .order("monthly_score", { ascending: false })
        .limit(10);

      const topRank = rankingData || [];
      setLeaderboard(topRank);

      if (user?.id) {
        const userRankIndex = topRank.findIndex((r) => r.clerk_id === user.id);
        const userPosition =
          userRankIndex >= 0 ? `#${userRankIndex + 1}` : "Top 20+";

        const userRankingRecord = topRank.find((r) => r.clerk_id === user.id);
        const monthlyScore = userRankingRecord?.monthly_score || 0;

        const { data: userHistory } = await supabase
          .from("arena_participants_history")
          .select(
            "id, pin, quiz_title, score, final_rank, is_podium, participated_at"
          )
          .eq("clerk_id", user.id)
          .order("participated_at", { ascending: false });

        const history = userHistory || [];
        setBattleHistory(history);

        const battles = history.length;
        const podiums = history.filter((h) => h.is_podium).length;
        const totalSessionPoints = history.reduce(
          (acc, h) => acc + (h.score || 0),
          0
        );
        const avg = battles > 0 ? Math.round(totalSessionPoints / battles) : 0;

        setUserStats({
          monthlyScore: monthlyScore > 0 ? monthlyScore : totalSessionPoints,
          battlesCount: battles,
          podiumsCount: podiums,
          averageScore: avg,
          rankPosition: userPosition,
        });
      }
    } catch (err) {
      console.error("[Arena Dashboard] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, calcularProximosHorarios]);

  const garantirSalaPreAbertura = useCallback(async () => {
    if (ensuringPreOpen) return;
    setEnsuringPreOpen(true);
    try {
      const res = await fetch("/api/cron/arena-battle?preopen=1");
      if (res.ok) {
        await carregarDadosCompletosArena();
      }
    } catch (err) {
      console.warn("[Arena Pre-Open] Aviso:", err);
    } finally {
      setEnsuringPreOpen(false);
    }
  }, [ensuringPreOpen, carregarDadosCompletosArena]);

  // 3. Temporizador por segundo: libera o link nos 5 min anteriores e encerra ao zerar
  useEffect(() => {
    const timer = setInterval(() => {
      calcularProximosHorarios(activeRooms);

      if (
        nextBattleCountdown.isPreOpenWindow &&
        !nextBattleCountdown.livePin &&
        !loading &&
        !ensuringPreOpen
      ) {
        garantirSalaPreAbertura();
      }

      if (!nextBattleCountdown.targetDate) {
        return;
      }

      const agora = new Date().getTime();
      const distancia =
        new Date(nextBattleCountdown.targetDate).getTime() - agora;

      if (distancia <= 0) {
        setNextBattleCountdown((prev) => ({
          ...prev,
          formattedTime: "00:00:00",
        }));
      } else {
        const h = Math.floor(distancia / (1000 * 60 * 60));
        const m = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distancia % (1000 * 60)) / 1000);

        const hh = h < 10 ? `0${h}` : h;
        const mm = m < 10 ? `0${m}` : m;
        const ss = s < 10 ? `0${s}` : s;

        setNextBattleCountdown((prev) => ({
          ...prev,
          formattedTime: `${hh}:${mm}:${ss}`,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeRooms,
    nextBattleCountdown.targetDate,
    nextBattleCountdown.isPreOpenWindow,
    nextBattleCountdown.livePin,
    loading,
    ensuringPreOpen,
    calcularProximosHorarios,
    garantirSalaPreAbertura,
  ]);

  useEffect(() => {
    if (isLoaded) {
      carregarDadosCompletosArena();
    }
  }, [user, isLoaded, carregarDadosCompletosArena]);

  useEffect(() => {
    const channel = supabase
      .channel("arena-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms" },
        () => carregarDadosCompletosArena()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarDadosCompletosArena]);

  const calcularLiga = (pontos) => {
    if (pontos >= 6000)
      return {
        nome: "Diamante",
        badge: "💎",
        cor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
      };
    if (pontos >= 3000)
      return {
        nome: "Ouro",
        badge: "🥇",
        cor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      };
    if (pontos >= 1000)
      return {
        nome: "Prata",
        badge: "🥈",
        cor: "text-slate-300 border-slate-400/30 bg-slate-400/10",
      };
    return {
      nome: "Bronze",
      badge: "🥉",
      cor: "text-amber-600 border-amber-700/30 bg-amber-700/10",
    };
  };

  const ligaAtual = calcularLiga(userStats.monthlyScore);

  const formatarData = (isoDate) => {
    if (!isoDate) return "—";
    const d = new Date(isoDate);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans transition-colors duration-300 flex flex-col justify-between ${styles.mainBg}`}
    >
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Banner com Contador Regressivo Central para a Próxima Batalha */}
        <div
          className={`border p-6 md:p-8 rounded-3xl relative overflow-hidden transition-all duration-300 ${styles.seasonBanner}`}
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow">
                  TEMPORADA MENSAL ATIVA
                </span>
                <span className="bg-white/10 text-purple-200 text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {activeSeason.code}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {activeSeason.title}
              </h1>
              <p className="text-xs md:text-sm text-purple-200/90 leading-relaxed">
                As pontuações acumulam durante todo o mês de forma exclusiva na
                Arena. {activeSeason.rewards}
              </p>
            </div>

            {/* Painel de Contagem Regressiva / Acesso Exclusivo nos 5 Minutos Anteriores */}
            <div className="bg-slate-950/75 border border-purple-500/40 p-5 rounded-2xl w-full md:w-auto flex-shrink-0 space-y-3 backdrop-blur-md shadow-inner text-center md:text-right">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  {nextBattleCountdown.isPreOpenWindow
                    ? `SALA ABERTA • PORTÕES FECHAM EM:`
                    : nextBattleCountdown.isClosedInProgress
                    ? `RODADA DAS ${nextBattleCountdown.targetHourText} EM ANDAMENTO`
                    : `ABERTURA DA SALA (${nextBattleCountdown.targetHourText})`}
                </span>
                <span
                  className={`text-2xl md:text-3xl font-mono font-black tracking-widest ${
                    nextBattleCountdown.isPreOpenWindow
                      ? "text-emerald-400 animate-pulse"
                      : nextBattleCountdown.isClosedInProgress
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {nextBattleCountdown.isClosedInProgress
                    ? "ENCERRADA"
                    : nextBattleCountdown.formattedTime}
                </span>
              </div>

              {nextBattleCountdown.isPreOpenWindow &&
              nextBattleCountdown.livePin ? (
                <Link
                  href={`/arena/${nextBattleCountdown.livePin}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition transform hover:scale-105 cursor-pointer"
                >
                  <span>⚔️</span> ENTRAR NA BATALHA AGORA (PIN{" "}
                  {nextBattleCountdown.livePin})
                </Link>
              ) : nextBattleCountdown.isPreOpenWindow ? (
                <button
                  type="button"
                  onClick={garantirSalaPreAbertura}
                  disabled={ensuringPreOpen}
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  <span>🚀</span>{" "}
                  {ensuringPreOpen
                    ? "Preparando Sala..."
                    : "LIBERAR ACESSO À SALA AGORA"}
                </button>
              ) : nextBattleCountdown.isClosedInProgress ? (
                <p className="text-[11px] text-rose-300 max-w-xs font-semibold">
                  🔒 Acesso encerrado para esta rodada. Aguarde a próxima janela
                  oficial (5 min antes).
                </p>
              ) : (
                <p className="text-[11px] text-slate-300 max-w-xs">
                  O link de entrada é liberado <strong>5 minutos antes</strong>{" "}
                  e encerra automaticamente no horário de início.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO: CRONOGRAMA OFICIAL DAS RODADAS (ABRE 5 MIN ANTES E FECHA NO INÍCIO) */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <span>📅</span> Rodadas Oficiais da Arena
            </h2>
            <span className="text-xs font-semibold opacity-65">
              Horários oficiais de Brasília (14h, 16h, 18h e 20h) • Acesso
              exclusivo nos 5 min antes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingSchedule.map((horario) => {
              const estaAtiva = horario.isDisponivel && !!horario.pin;
              const linkDestino = estaAtiva ? `/arena/${horario.pin}` : null;

              const cardContent = (
                <div
                  className={`p-5 rounded-3xl border flex flex-col justify-between h-48 transition-all ${
                    horario.isDisponivel
                      ? styles.scheduleCardActive
                      : styles.scheduleCardInactive
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          horario.isDisponivel
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 animate-pulse"
                            : horario.isEncerradaEmCurso
                            ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                            : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        }`}
                      >
                        {horario.isPreOpen
                          ? "🟢 ABERTA (5 MIN)"
                          : horario.isEncerradaEmCurso
                          ? "🔒 ENCERRADA"
                          : horario.diaFormatado}
                      </span>
                      <span className="font-mono font-black text-lg text-amber-500">
                        {horario.dataHora}h
                      </span>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs font-extrabold truncate">
                        {horario.tituloRodada}
                      </p>
                      <span className="text-[10px] opacity-70 block mt-0.5">
                        {horario.descricao}
                      </span>
                    </div>
                  </div>

                  <div>
                    {estaAtiva ? (
                      <div className="w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black text-xs rounded-xl text-center shadow">
                        ⚔️ Entrar Agora (PIN: {horario.pin})
                      </div>
                    ) : horario.isDisponivel ? (
                      <button
                        type="button"
                        onClick={garantirSalaPreAbertura}
                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black text-xs rounded-xl text-center shadow cursor-pointer"
                      >
                        🚀 Abrir Sala Agora
                      </button>
                    ) : horario.isEncerradaEmCurso ? (
                      <span className="text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                        <span>🔒</span> {horario.tempoRestante}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1.5">
                        <span>⏳</span> {horario.tempoRestante}
                      </span>
                    )}
                  </div>
                </div>
              );

              return linkDestino ? (
                <Link key={horario.id} href={linkDestino} className="block">
                  {cardContent}
                </Link>
              ) : (
                <div key={horario.id}>{cardContent}</div>
              );
            })}
          </div>
        </div>

        {/* Grade de Métricas Pessoais do Competidor */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={`p-5 rounded-2xl border space-y-1 ${styles.metricCard}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              PONTOS DO MÊS
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black text-purple-500">
              {loading ? "..." : userStats.monthlyScore.toLocaleString("pt-BR")}
            </p>
            <span className="text-[11px] opacity-70 block">
              Exclusivos da Arena
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.metricCard}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              LIGA ATUAL
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-2xl">{ligaAtual.badge}</span>
              <span
                className={`font-extrabold px-2 py-0.5 rounded-lg border text-xs ${ligaAtual.cor}`}
              >
                {ligaAtual.nome}
              </span>
            </div>
            <span className="text-[11px] opacity-70 block">
              Temporada {activeSeason.code}
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.metricCard}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              POSIÇÃO GERAL
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black text-amber-500">
              {loading ? "..." : userStats.rankPosition}
            </p>
            <span className="text-[11px] opacity-70 block">
              Na temporada ativa
            </span>
          </div>

          <div className={`p-5 rounded-2xl border space-y-1 ${styles.metricCard}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              BATALHAS
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black">
              {loading ? "..." : userStats.battlesCount}
            </p>
            <span className="text-[11px] opacity-70 block">
              Partidas jogadas
            </span>
          </div>

          <div
            className={`p-5 rounded-2xl border col-span-2 md:col-span-1 space-y-1 ${styles.metricCard}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              PÓDIOS (TOP 3)
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black text-emerald-500">
              {loading ? "..." : userStats.podiumsCount}
            </p>
            <span className="text-[11px] opacity-70 block">Troféus obtidos</span>
          </div>
        </div>

        {/* Tabela de Líderes + Histórico */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-5 p-6 rounded-3xl border space-y-4 ${styles.panelCard}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>🏆</span> Top 10 da Temporada
              </h2>
              <span className="text-[11px] font-semibold opacity-60">
                Atualizado ao vivo
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs opacity-50 py-8 text-center">
                {loading
                  ? "A carregar classificação..."
                  : "Nenhum competidor pontuou nesta temporada ainda."}
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((comp, idx) => {
                  const isUser = user?.id && comp.clerk_id === user.id;
                  let medalha = `${idx + 1}º`;
                  if (idx === 0) medalha = "🥇 1º";
                  else if (idx === 1) medalha = "🥈 2º";
                  else if (idx === 2) medalha = "🥉 3º";

                  return (
                    <div
                      key={comp.clerk_id || idx}
                      className={`p-3 rounded-2xl flex items-center justify-between border transition ${
                        isUser ? styles.rankRowUser : styles.rankRowDefault
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs w-10 text-center text-amber-500">
                          {medalha}
                        </span>
                        <div>
                          <p className="text-xs font-bold truncate max-w-[150px]">
                            {comp.player_name} {isUser && "(Você)"}
                          </p>
                          <span className="text-[10px] opacity-60">
                            {formatarData(comp.last_battle_at)}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-black text-purple-500">
                        {comp.monthly_score.toLocaleString("pt-BR")} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`lg:col-span-7 p-6 rounded-3xl border space-y-4 ${styles.panelCard}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>📜</span> Seu Histórico de Batalhas
              </h2>
              <span className="text-[11px] font-semibold opacity-60">
                {battleHistory.length} registros auditados
              </span>
            </div>

            {battleHistory.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <span className="text-4xl block">⚔️</span>
                <p className="text-xs font-bold opacity-75">
                  Você ainda não participou de batalhas oficiais nesta
                  temporada.
                </p>
                <p className="text-[11px] opacity-50 max-w-sm mx-auto">
                  Acesse as batalhas automáticas nos 5 minutos anteriores às
                  rodadas das 14h, 16h, 18h e 20h para pontuar!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr
                      className={`border-b text-[10px] uppercase font-bold tracking-wider ${styles.tableHeader}`}
                    >
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Questionário</th>
                      <th className="py-2.5 px-3 text-center">PIN</th>
                      <th className="py-2.5 px-3 text-center">Posição</th>
                      <th className="py-2.5 px-3 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battleHistory.map((b) => (
                      <tr
                        key={b.id}
                        className={`border-b transition ${styles.tableRow}`}
                      >
                        <td className="py-3 px-3 font-mono opacity-80 whitespace-nowrap">
                          {formatarData(b.participated_at)}
                        </td>
                        <td className="py-3 px-3 font-semibold truncate max-w-[200px]">
                          {b.quiz_title || "Batalha da Arena"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-500">
                          {b.pin}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {b.final_rank ? (
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                b.final_rank === 1
                                  ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                                  : b.final_rank <= 3
                                  ? "bg-purple-500/20 text-purple-400"
                                  : "opacity-70"
                              }`}
                            >
                              {b.final_rank}º Lugar
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-purple-500">
                          +{b.score || 0} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer
        className={`max-w-7xl w-full mx-auto text-center border-t py-4 px-6 ${styles.footer}`}
      >
        <p className="text-[11px] font-medium">
          MenteAfiada © 2026 • Painel de Desempenho e Auditoria da Competição
          Mensal da Arena
        </p>
      </footer>
    </div>
  );
}