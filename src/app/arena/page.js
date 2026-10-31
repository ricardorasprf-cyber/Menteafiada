/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/arena/page.js
 * Objetivo: Painel central da Arena de Batalhas Educacionais com:
 *           - Contador regressivo dinâmico da próxima batalha oficial;
 *           - Cards de horário que se transformam em botões de entrada com 1 clique
 *             quando a sala abre nos horários oficiais (14h, 16h, 18h e 20h);
 *           - Eliminação de entrada manual de PIN redundante;
 *           - Estatísticas da temporada mensal e ranking Top 10 isolado;
 *           - Comutador dinâmico de tema (Claro / Escuro).
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ArenaDashboardPage() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();

  // Estados de dados da temporada e métricas
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

  // Estados do Cronograma e Próximas Salas
  const [activeRooms, setActiveRooms] = useState([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [officialQuizzesList, setOfficialQuizzesList] = useState([]);

  // Contador regressivo em tempo real para o banner principal (HH:MM:SS)
  const [nextBattleCountdown, setNextBattleCountdown] = useState({
    targetDate: null,
    targetHourText: "14:00",
    formattedTime: "--:--:--",
    isLiveNow: false,
    livePin: null,
  });

  // Controle de Tema da Janela (Claro / Escuro)
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("menteafiada_theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("menteafiada_theme", newTheme ? "dark" : "light");
  };

  // 1. Calcula as próximas batalhas e alimenta o cronômetro
  const calcularProximosHorarios = (salasAbertas = []) => {
    const horariosFixos = [14, 16, 18, 20];
    const agora = new Date();
    const proximasBatalhas = [];

    // Se houver uma sala aberta no momento, conecta o cronômetro diretamente a ela
    const salaAoVivo = salasAbertas.find((s) => s.status === "waiting" || s.status === "in_progress");

    let diaOffset = 0;
    let proximaDataAlvo = null;
    let proximaHoraTexto = "14:00";

    while (proximasBatalhas.length < 4 && diaOffset < 7) {
      const dataAlvo = new Date(agora);
      dataAlvo.setDate(agora.getDate() + diaOffset);

      for (const hora of horariosFixos) {
        const dataBatalha = new Date(dataAlvo);
        dataBatalha.setHours(hora, 0, 0, 0);

        if (dataBatalha > agora) {
          if (!proximaDataAlvo) {
            proximaDataAlvo = dataBatalha;
            proximaHoraTexto = `${hora}:00h`;
          }

          const diffMs = dataBatalha.getTime() - agora.getTime();
          const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          let tempoRestanteTexto = "";
          if (diffHoras > 0) {
            tempoRestanteTexto = `Inicia em ${diffHoras}h ${diffMinutos}m`;
          } else {
            tempoRestanteTexto = `Inicia em ${diffMinutos} min`;
          }

          const diaFormatado = dataBatalha.toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          });

          // Verifica se já existe sala instanciada para este horário
          const salaAbertaCorrespondente = salasAbertas.find(
            (s) => new Date(s.created_at).getHours() === hora
          );

          proximasBatalhas.push({
            id: `${diaOffset}-${hora}`,
            horaNum: hora,
            tituloRodada: `Batalha Oficial das ${hora}:00h`,
            descricao: "Quiz Oficial Valorado para o Ranking Mensal",
            dataHora: `${hora}:00`,
            diaFormatado: diaOffset === 0 ? "Hoje" : diaOffset === 1 ? "Amanhã" : diaFormatado,
            tempoRestante: tempoRestanteTexto,
            isDisponivel: !!salaAbertaCorrespondente,
            pin: salaAbertaCorrespondente?.pin || null,
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
      isLiveNow: !!salaAoVivo,
      livePin: salaAoVivo?.pin || null,
    }));
  };

  // 2. Temporizador por segundo do Banner Regressivo
  useEffect(() => {
    const timer = setInterval(() => {
      if (nextBattleCountdown.isLiveNow) {
        setNextBattleCountdown((prev) => ({ ...prev, formattedTime: "AO VIVO!" }));
        return;
      }

      if (!nextBattleCountdown.targetDate) return;

      const agora = new Date().getTime();
      const distancia = new Date(nextBattleCountdown.targetDate).getTime() - agora;

      if (distancia <= 0) {
        setNextBattleCountdown((prev) => ({
          ...prev,
          formattedTime: "00:00:00",
          isLiveNow: true,
        }));
        carregarDadosCompletosArena();
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
  }, [nextBattleCountdown.targetDate, nextBattleCountdown.isLiveNow]);

  // 3. Carrega salas ativas, temporada, ranking, histórico e quizzes oficiais
  const carregarDadosCompletosArena = async () => {
    try {
      setLoading(true);

      // Consulta salas da Arena abertas no momento ('waiting' ou 'in_progress')
      const { data: salasAbertas } = await supabase
        .from("game_rooms")
        .select("id, pin, title, status, created_at, quiz_id, quizzes(title, category)")
        .eq("is_arena", true)
        .in("status", ["waiting", "in_progress"])
        .order("created_at", { ascending: false });

      const listaSalas = salasAbertas || [];
      setActiveRooms(listaSalas);
      calcularProximosHorarios(listaSalas);

      // Consulta temporada ativa
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
          rewards: seasonData.rewards_description || "Acessos exclusivos e insígnias para o Top 3",
        });
      }

      // Consulta Quizzes Oficiais cadastrados que entram no sorteio da Arena
      const { data: officialQuizzes } = await supabase
        .from("quizzes")
        .select("id, title, category")
        .eq("is_official", true);

      setOfficialQuizzesList(officialQuizzes || []);

      // Consulta Ranking Mensal Geral (Top 10)
      const { data: rankingData } = await supabase
        .from("arena_monthly_rankings")
        .select("clerk_id, player_name, monthly_score, last_battle_at")
        .eq("season_code", seasonCode)
        .order("monthly_score", { ascending: false })
        .limit(10);

      const topRank = rankingData || [];
      setLeaderboard(topRank);

      // Consulta Estatísticas Pessoais do Aluno
      if (user?.id) {
        const userRankIndex = topRank.findIndex((r) => r.clerk_id === user.id);
        const userPosition = userRankIndex >= 0 ? `#${userRankIndex + 1}` : "Top 20+";

        const userRankingRecord = topRank.find((r) => r.clerk_id === user.id);
        const monthlyScore = userRankingRecord?.monthly_score || 0;

        const { data: userHistory } = await supabase
          .from("arena_participants_history")
          .select("id, pin, quiz_title, score, final_rank, is_podium, participated_at")
          .eq("clerk_id", user.id)
          .order("participated_at", { ascending: false });

        const history = userHistory || [];
        setBattleHistory(history);

        const battles = history.length;
        const podiums = history.filter((h) => h.is_podium).length;
        const totalSessionPoints = history.reduce((acc, h) => acc + (h.score || 0), 0);
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
  };

  useEffect(() => {
    if (isLoaded) {
      carregarDadosCompletosArena();
    }
  }, [user, isLoaded]);

  // Cálculo da Liga Educacional
  const calcularLiga = (pontos) => {
    if (pontos >= 6000) return { nome: "Diamante", badge: "💎", cor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" };
    if (pontos >= 3000) return { nome: "Ouro", badge: "🥇", cor: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
    if (pontos >= 1000) return { nome: "Prata", badge: "🥈", cor: "text-slate-300 border-slate-400/30 bg-slate-400/10" };
    return { nome: "Bronze", badge: "🥉", cor: "text-amber-600 border-amber-700/30 bg-amber-700/10" };
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

  // Estilos de tema dinâmicos
  const themeClasses = isDarkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";

  const cardThemeClasses = isDarkMode
    ? "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/40"
    : "bg-white border-slate-200 shadow-xl shadow-slate-200/50";

  const tableHeaderClasses = isDarkMode
    ? "bg-slate-950/60 text-slate-400 border-slate-800"
    : "bg-slate-100 text-slate-600 border-slate-200";

  const tableRowClasses = isDarkMode
    ? "border-slate-850 hover:bg-slate-800/40"
    : "border-slate-100 hover:bg-slate-50";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col justify-between ${themeClasses}`}>
      {/* Cabeçalho Principal */}
      <header className={`py-4 px-6 border-b ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
              <img
                src="/logo-dark.jpeg"
                alt="Logo MenteAfiada"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Mente
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Afiada
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            {/* Comutador de Cores */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              title="Alternar esquema de cores"
            >
              <span>{isDarkMode ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
            </button>

            <LanguageSelector />
            <UserMenu
              userName={user?.firstName || "MenteAfiada"}
              userRole="owner"
            />
          </nav>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Banner com Contador Regressivo Central para a Próxima Batalha */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 border border-purple-700/50 p-6 md:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
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
                As pontuações acumulam durante todo o mês de forma exclusiva na Arena. 
                {activeSeason.rewards}
              </p>
            </div>

            {/* Painel de Contagem Regressiva / Acesso Imediato */}
            <div className="bg-slate-950/70 border border-purple-500/40 p-5 rounded-2xl w-full md:w-auto flex-shrink-0 space-y-3 backdrop-blur-md shadow-inner text-center md:text-right">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  {nextBattleCountdown.isLiveNow ? "BATALHA EM ANDAMENTO" : `PRÓXIMA BATALHA (${nextBattleCountdown.targetHourText})`}
                </span>
                <span className={`text-2xl md:text-3xl font-mono font-black tracking-widest ${nextBattleCountdown.isLiveNow ? "text-emerald-400 animate-pulse" : "text-white"}`}>
                  {nextBattleCountdown.formattedTime}
                </span>
              </div>

              {nextBattleCountdown.isLiveNow && nextBattleCountdown.livePin ? (
                <Link
                  href={`/arena/${nextBattleCountdown.livePin}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition transform hover:scale-105 cursor-pointer"
                >
                  <span>⚔️</span> ENTRAR NA BATALHA AGORA
                </Link>
              ) : (
                <p className="text-[11px] text-slate-400 max-w-xs">
                  O link de entrada é liberado automaticamente quando o cronômetro zerar.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO: CRONOGRAMA OFICIAL DAS RODADAS COM ENTRADA COM 1 CLIQUE */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <span>📅</span> Rodadas Oficiais da Arena
            </h2>
            <span className="text-xs font-semibold opacity-60">Horários oficiais de Brasília (14h, 16h, 18h e 20h)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingSchedule.map((horario) => {
              // Verifica se a sala está aberta agora para habilitar o clique
              const salaCorrespondente = activeRooms.find(
                (s) => new Date(s.created_at).getHours() === horario.horaNum
              );
              const estaAtiva = !!salaCorrespondente;
              const linkDestino = estaAtiva ? `/arena/${salaCorrespondente.pin}` : null;

              const cardContent = (
                <div
                  className={`p-5 rounded-3xl border flex flex-col justify-between h-48 transition-all ${
                    estaAtiva
                      ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/40 cursor-pointer hover:scale-[1.02]"
                      : isDarkMode
                      ? "bg-slate-900/90 border-slate-800"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          estaAtiva
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {estaAtiva ? "🟡 SALA ABERTA" : horario.diaFormatado}
                      </span>
                      <span className="font-mono font-black text-lg text-amber-500">
                        {horario.dataHora}h
                      </span>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs font-extrabold truncate">{horario.tituloRodada}</p>
                      <span className="text-[10px] opacity-70 block mt-0.5">{horario.descricao}</span>
                    </div>
                  </div>

                  <div>
                    {estaAtiva ? (
                      <div className="w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black text-xs rounded-xl text-center shadow">
                        ⚔️ Entrar Agora (PIN: {salaCorrespondente.pin})
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-500/90 font-semibold flex items-center gap-1.5">
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
          <div className={`p-5 rounded-2xl border ${cardThemeClasses} space-y-1`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              PONTOS DO MÊS
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black text-purple-500">
              {loading ? "..." : userStats.monthlyScore.toLocaleString("pt-BR")}
            </p>
            <span className="text-[11px] opacity-70 block">Exclusivos da Arena</span>
          </div>

          <div className={`p-5 rounded-2xl border ${cardThemeClasses} space-y-1`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              LIGA ATUAL
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-2xl">{ligaAtual.badge}</span>
              <span className={`text-base font-extrabold px-2 py-0.5 rounded-lg border text-xs ${ligaAtual.cor}`}>
                {ligaAtual.nome}
              </span>
            </div>
            <span className="text-[11px] opacity-70 block">Temporada {activeSeason.code}</span>
          </div>

          <div className={`p-5 rounded-2xl border ${cardThemeClasses} space-y-1`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              POSIÇÃO GERAL
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black text-amber-500">
              {loading ? "..." : userStats.rankPosition}
            </p>
            <span className="text-[11px] opacity-70 block">Na temporada ativa</span>
          </div>

          <div className={`p-5 rounded-2xl border ${cardThemeClasses} space-y-1`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
              BATALHAS
            </span>
            <p className="text-2xl md:text-3xl font-mono font-black">
              {loading ? "..." : userStats.battlesCount}
            </p>
            <span className="text-[11px] opacity-70 block">Partidas jogadas</span>
          </div>

          <div className={`p-5 rounded-2xl border col-span-2 md:col-span-1 ${cardThemeClasses} space-y-1`}>
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
          {/* Top 10 */}
          <div className={`lg:col-span-5 p-6 rounded-3xl border space-y-4 ${cardThemeClasses}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>🏆</span> Top 10 da Temporada
              </h2>
              <span className="text-[11px] font-semibold opacity-60">Atualizado ao vivo</span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs opacity-50 py-8 text-center">
                {loading ? "A carregar classificação..." : "Nenhum competidor pontuou nesta temporada ainda."}
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
                        isUser
                          ? "bg-purple-600/15 border-purple-500/50 shadow-sm"
                          : isDarkMode
                          ? "bg-slate-950/40 border-slate-800/80"
                          : "bg-slate-50 border-slate-200"
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

                      <span className="font-mono text-xs font-black text-purple-400">
                        {comp.monthly_score.toLocaleString("pt-BR")} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico de Auditoria */}
          <div className={`lg:col-span-7 p-6 rounded-3xl border space-y-4 ${cardThemeClasses}`}>
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
                  Você ainda não participou de batalhas oficiais nesta temporada.
                </p>
                <p className="text-[11px] opacity-50 max-w-sm mx-auto">
                  Acesse as batalhas automáticas com 1 clique nas rodadas das 14h, 16h, 18h e 20h para pontuar!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${tableHeaderClasses}`}>
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Questionário</th>
                      <th className="py-2.5 px-3 text-center">PIN</th>
                      <th className="py-2.5 px-3 text-center">Posição</th>
                      <th className="py-2.5 px-3 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battleHistory.map((b) => (
                      <tr key={b.id} className={`border-b transition ${tableRowClasses}`}>
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
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "opacity-70"
                              }`}
                            >
                              {b.final_rank}º Lugar
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-purple-400">
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

      {/* Rodapé Institucional */}
      <footer className={`max-w-7xl w-full mx-auto text-center border-t py-4 px-6 ${isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
        <p className="text-[11px] font-medium">
          MenteAfiada © 2026 • Painel de Desempenho e Auditoria da Competição Mensal da Arena
        </p>
      </footer>
    </div>
  );
}