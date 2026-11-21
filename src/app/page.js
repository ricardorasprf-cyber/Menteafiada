/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/page.js
 * Objetivo: Tela inicial conectada ao ThemeProvider oficial da plataforma
 * ("theme-classic", "theme-dark", "theme-synthwave"), utilizando o cabeçalho
 * global unificado (PlatformHeader):
 * - Entrada dinâmica por PIN de 6 dígitos individuais;
 * - Banner Ao Vivo da Arena Oficial com abertura antecipada do link de
 *   entrada 5 MINUTOS ANTES das rodadas oficiais (14h, 16h, 18h e 20h);
 * - Bento Grid de Trilhas por Perfil e indicadores de prova social.
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/components/ThemeProvider';

const PRE_OPEN_MINUTES = 5; // Libera entrada na Arena 5 minutos antes do início oficial

// Mapeamento visual para as 3 classes oficiais do globals.css
const PAGE_STYLES = {
  'theme-classic': {
    mainBg: 'bg-slate-50 text-slate-900',
    ambientGlow:
      'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]',
    heroBadge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    heroTitle: 'from-slate-900 via-slate-800 to-slate-600',
    heroTitleAccent: 'from-indigo-600 via-purple-600 to-indigo-500',
    heroSubtitle: 'text-slate-600',
    pinCard:
      'bg-white border-slate-200 shadow-xl shadow-slate-200/60 hover:border-indigo-400',
    pinCardGlow: 'from-indigo-500/5 to-purple-500/5',
    pinTitle: 'text-indigo-600',
    pinInput:
      'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20',
    primaryBtn:
      'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25',
    floatingBadge: 'bg-white/95 border-slate-200 shadow-lg',
    arenaSection: 'bg-slate-100/70 border-slate-200',
    arenaCard:
      'bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-indigo-200 shadow-md',
    arenaTitleAccent: 'text-indigo-600',
    arenaTimerBox: 'bg-white border-slate-200 shadow-sm',
    arenaTimerText: 'text-amber-600',
    arenaSecondaryBtn:
      'bg-white border-slate-300 hover:border-indigo-500 text-slate-800 hover:text-indigo-600',
    bentoCard:
      'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md',
    bentoText: 'text-slate-600',
    bentoList: 'text-slate-700',
    tutorialBanner:
      'bg-gradient-to-r from-white to-indigo-50/70 border-slate-200 shadow-sm',
    statBox: 'bg-slate-50 border-slate-200',
    statsDivider: 'border-slate-200',
    statsNumber: 'from-indigo-600 to-purple-600',
    footer: 'border-slate-200 bg-white text-slate-600',
  },
  'theme-dark': {
    mainBg: 'bg-[#070b19] text-slate-100',
    ambientGlow:
      'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.16),rgba(255,255,255,0))]',
    heroBadge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    heroTitle: 'from-white via-slate-100 to-slate-400',
    heroTitleAccent: 'from-purple-400 via-indigo-300 to-indigo-400',
    heroSubtitle: 'text-slate-400',
    pinCard:
      'bg-slate-900/90 border-slate-800 shadow-xl hover:border-purple-500/40',
    pinCardGlow: 'from-purple-500/10 to-indigo-500/10',
    pinTitle: 'text-purple-400',
    pinInput:
      'bg-slate-950/80 border-slate-700/80 text-white focus:border-purple-500 focus:ring-purple-500/20',
    primaryBtn:
      'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40',
    floatingBadge: 'bg-slate-900/90 border-slate-700/60 shadow-xl',
    arenaSection: 'bg-[#070b19] border-slate-900/80',
    arenaCard:
      'bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border-purple-500/20',
    arenaTitleAccent: 'text-purple-400',
    arenaTimerBox: 'bg-slate-950/60 border-slate-800/80',
    arenaTimerText: 'text-amber-400',
    arenaSecondaryBtn:
      'bg-slate-900 border-slate-700/80 hover:border-purple-500 text-slate-200 hover:text-white',
    bentoCard:
      'bg-slate-900/60 border-slate-800 hover:border-indigo-500/30',
    bentoText: 'text-slate-400',
    bentoList: 'text-slate-300',
    tutorialBanner:
      'bg-gradient-to-r from-slate-900 to-indigo-950/20 border-slate-800',
    statBox: 'bg-slate-950/40 border-slate-800',
    statsDivider: 'border-slate-900/60',
    statsNumber: 'from-purple-400 to-indigo-400',
    footer: 'border-slate-900/60 bg-[#070b19]/90 text-slate-400',
  },
  'theme-synthwave': {
    mainBg: 'bg-[#03040c] text-cyan-50',
    ambientGlow:
      'bg-[radial-gradient(ellipse_90%_80%_at_50%_-15%,rgba(217,70,239,0.28),rgba(34,211,238,0.12),transparent)]',
    heroBadge:
      'border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]',
    heroTitle: 'from-white via-cyan-100 to-fuchsia-200',
    heroTitleAccent:
      'from-cyan-400 via-fuchsia-400 to-purple-400 drop-shadow-[0_0_18px_rgba(217,70,239,0.5)]',
    heroSubtitle: 'text-slate-300',
    pinCard:
      'bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_35px_rgba(192,38,211,0.2)] hover:border-cyan-400/70',
    pinCardGlow: 'from-cyan-500/15 via-fuchsia-500/15 to-purple-500/15',
    pinTitle: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    pinInput:
      'bg-[#040612] border-cyan-500/40 text-cyan-300 focus:border-fuchsia-400 focus:ring-fuchsia-500/30 shadow-[inset_0_0_12px_rgba(34,211,238,0.12)]',
    primaryBtn:
      'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.5)]',
    floatingBadge:
      'bg-[#090d22]/95 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]',
    arenaSection: 'bg-[#03040c] border-fuchsia-500/20',
    arenaCard:
      'bg-gradient-to-r from-fuchsia-950/50 via-[#0c112b] to-cyan-950/40 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.18)]',
    arenaTitleAccent:
      'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]',
    arenaTimerBox:
      'bg-[#040612]/90 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]',
    arenaTimerText:
      'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]',
    arenaSecondaryBtn:
      'bg-[#0b0f26] border-cyan-400/50 hover:border-fuchsia-400 text-cyan-200 hover:text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]',
    bentoCard:
      'bg-[#080c1f]/90 border-indigo-500/30 hover:border-cyan-400/60 shadow-[0_0_25px_rgba(79,70,229,0.12)]',
    bentoText: 'text-slate-300',
    bentoList: 'text-cyan-100/90',
    tutorialBanner:
      'bg-gradient-to-r from-[#090d22] via-fuchsia-950/25 to-cyan-950/25 border-fuchsia-500/30 shadow-[0_0_30px_rgba(192,38,211,0.12)]',
    statBox: 'bg-[#040612]/80 border-cyan-500/30',
    statsDivider: 'border-fuchsia-500/20',
    statsNumber:
      'from-cyan-400 via-fuchsia-400 to-purple-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]',
    footer: 'border-fuchsia-500/20 bg-[#03040c] text-slate-400',
  },
};

export default function HomePage() {
  const router = useRouter();
  const { theme } = useTheme();

  const t = PAGE_STYLES[theme] || PAGE_STYLES['theme-classic'];

  // Estados para gerenciar a entrada do PIN de 6 dígitos
  const [pinInputs, setPinInputs] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Estados da Arena (Batalhas Automáticas com abertura 5 min antes)
  const [nextBattleTime, setNextBattleTime] = useState('Calculando...');
  const [isArenaLive, setIsArenaLive] = useState(false);
  const [isArenaPreOpen, setIsArenaPreOpen] = useState(false);
  const [activeArenaPin, setActiveArenaPin] = useState(null);
  const [ensuringArenaRoom, setEnsuringArenaRoom] = useState(false);

  // ---------------------------------------------------------------------------
  // Lógica da Entrada Dinâmica de PIN (6 dígitos)
  // ---------------------------------------------------------------------------
  const handlePinChange = (index, value) => {
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    const newInputs = [...pinInputs];
    newInputs[index] = value;
    setPinInputs(newInputs);
    setPinError('');

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && pinInputs[index] === '' && index > 0) {
      const newInputs = [...pinInputs];
      newInputs[index - 1] = '';
      setPinInputs(newInputs);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) {
      setPinError('O PIN deve conter exatamente 6 números.');
      return;
    }

    const digits = pastedData.split('');
    setPinInputs(digits);
    inputRefs.current[5]?.focus();
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    const pinStr = pinInputs.join('');
    if (pinStr.length < 6) {
      setPinError('Insira os 6 dígitos para entrar no jogo!');
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');
    router.push(`/game/play?pin=${pinStr}`);
  };

  // ---------------------------------------------------------------------------
  // Consulta Sala Oficial Ativa + Garantia de Abertura 5 Minutos Antes
  // ---------------------------------------------------------------------------
  const fetchOpenArenaRoom = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('game_rooms')
        .select('id, pin, status')
        .eq('is_arena', true)
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveArenaPin(data[0].pin);
        return data[0].pin;
      }
      setActiveArenaPin(null);
      return null;
    } catch {
      return null;
    }
  }, []);

  const ensureArenaPreOpen = useCallback(async () => {
    if (ensuringArenaRoom) return;
    setEnsuringArenaRoom(true);
    try {
      const res = await fetch('/api/cron/arena-battle?preopen=1');
      if (res.ok) {
        const json = await res.json();
        if (json.pin) {
          setActiveArenaPin(json.pin);
        } else {
          await fetchOpenArenaRoom();
        }
      }
    } catch {
      // Silencioso em caso de oscilação de rede
    } finally {
      setEnsuringArenaRoom(false);
    }
  }, [ensuringArenaRoom, fetchOpenArenaRoom]);

  useEffect(() => {
    fetchOpenArenaRoom();

    const channel = supabase
      .channel('home-arena-pin-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => fetchOpenArenaRoom()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOpenArenaRoom]);

  // ---------------------------------------------------------------------------
  // Lógica de Contagem Regressiva para a Arena (14h, 16h, 18h, 20h)
  // Libera entrada antecipada 5 MINUTOS ANTES (13:55, 15:55, 17:55, 19:55)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const exibirContagem = (ms) => {
      const safeMs = Math.max(0, ms);
      const totalSegundos = Math.floor(safeMs / 1000);
      const h = Math.floor(totalSegundos / 3600);
      const m = Math.floor((totalSegundos % 3600) / 60);
      const s = totalSegundos % 60;

      const formatado = `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setNextBattleTime(formatado);
    };

    const updateArenaCountdown = () => {
      const agora = new Date();
      const horariosBatalha = [14, 16, 18, 20];

      let estadoEncontrado = false;

      for (const h of horariosBatalha) {
        const inicioBatalha = new Date(agora);
        inicioBatalha.setHours(h, 0, 0, 0);

        const aberturaAntecipada = new Date(
          inicioBatalha.getTime() - PRE_OPEN_MINUTES * 60 * 1000
        );
        const fimBatalha = new Date(inicioBatalha.getTime() + 15 * 60 * 1000);

        // 1. Janela de 5 minutos antes do início (Sala Aberta para Concentração)
        if (agora >= aberturaAntecipada && agora < inicioBatalha) {
          setIsArenaLive(true);
          setIsArenaPreOpen(true);
          exibirContagem(inicioBatalha.getTime() - agora.getTime());
          if (!activeArenaPin && !ensuringArenaRoom) {
            ensureArenaPreOpen();
          }
          estadoEncontrado = true;
          break;
        }

        // 2. Partida oficial em andamento (durante os 15 min da rodada)
        if (agora >= inicioBatalha && agora <= fimBatalha) {
          setIsArenaLive(true);
          setIsArenaPreOpen(false);
          setNextBattleTime('AO VIVO AGORA!');
          if (!activeArenaPin && !ensuringArenaRoom) {
            ensureArenaPreOpen();
          }
          estadoEncontrado = true;
          break;
        }

        // 3. Próxima rodada do dia ainda por abrir
        if (aberturaAntecipada > agora) {
          setIsArenaLive(false);
          setIsArenaPreOpen(false);
          exibirContagem(aberturaAntecipada.getTime() - agora.getTime());
          estadoEncontrado = true;
          break;
        }
      }

      // 4. Todas as rodadas de hoje já encerraram -> contagem até às 13:55h de amanhã
      if (!estadoEncontrado) {
        const amanhaInicio = new Date(agora);
        amanhaInicio.setDate(amanhaInicio.getDate() + 1);
        amanhaInicio.setHours(14, 0, 0, 0);
        const amanhaAbertura = new Date(
          amanhaInicio.getTime() - PRE_OPEN_MINUTES * 60 * 1000
        );

        setIsArenaLive(false);
        setIsArenaPreOpen(false);
        exibirContagem(amanhaAbertura.getTime() - agora.getTime());
      }
    };

    updateArenaCountdown();
    const interval = setInterval(updateArenaCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeArenaPin, ensuringArenaRoom, ensureArenaPreOpen]);

  // Destino direto: se já houver sala aberta na janela de 5 min ou ao vivo, leva direto ao PIN
  const handleArenaActionClick = async () => {
    if (isArenaLive && activeArenaPin) {
      router.push(`/arena/${activeArenaPin}`);
      return;
    }
    if (isArenaLive && !activeArenaPin) {
      await ensureArenaPreOpen();
      router.push('/arena');
      return;
    }
    router.push('/arena');
  };

  return (
    <main
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 selection:bg-purple-600 selection:text-white ${t.mainBg}`}
    >
      {/* Glow Ambiental */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${t.ambientGlow}`}
      />

      {/* -----------------------------------------------------------------------
          HERO SECTION COM ENTRADA DE PIN
          ----------------------------------------------------------------------- */}
      <section className="relative px-6 pt-12 pb-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col items-start gap-6">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${t.heroBadge}`}
          >
            <span className="flex h-2 w-2 rounded-full bg-current animate-pulse" />
            Nova Geração do Aprendizado Gamificado
          </div>

          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight bg-gradient-to-b bg-clip-text text-transparent ${t.heroTitle}`}
          >
            Desafie sua mente <br />
            <span
              className={`bg-gradient-to-r bg-clip-text text-transparent ${t.heroTitleAccent}`}
            >
              em tempo real.
            </span>
          </h1>

          <p className={`text-base md:text-lg max-w-xl leading-relaxed ${t.heroSubtitle}`}>
            Participe de salas instantâneas com seus colegas de classe ou enfrente
            batalhas na nossa Arena contra estudantes de todo o país. O
            conhecimento nunca foi tão dinâmico!
          </p>

          <form
            onSubmit={handleJoinGame}
            className={`w-full max-w-md border p-6 rounded-2xl backdrop-blur-sm relative group transition-all duration-300 mt-4 ${t.pinCard}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500 pointer-events-none ${t.pinCardGlow}`}
            />

            <h3
              className={`text-sm font-semibold tracking-wider uppercase mb-4 ${t.pinTitle}`}
            >
              🎯 Entrar em uma Sala de Jogo
            </h3>

            <div
              className="flex justify-between gap-2 md:gap-3 mb-4 relative z-10"
              onPaste={handlePinPaste}
            >
              {pinInputs.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  placeholder="-"
                  className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold border rounded-xl focus:outline-none focus:ring-4 transition-all active:scale-95 ${t.pinInput}`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-red-500 text-xs font-semibold mb-4 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
                ⚠️ {pinError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmittingPin}
              className={`relative z-10 w-full flex justify-center items-center gap-2 font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer ${t.primaryBtn}`}
            >
              {isSubmittingPin ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Conectando à Sala...
                </>
              ) : (
                'JOGAR AGORA 🚀'
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 flex justify-center relative">
          <div className="relative w-72 h-72 md:w-96 md:h-96">
            <div
              className={`absolute inset-0 blur-[60px] animate-pulse ${
                theme === 'theme-synthwave'
                  ? 'bg-gradient-to-tr from-fuchsia-600/45 via-cyan-500/35 to-purple-600/30'
                  : 'bg-gradient-to-tr from-purple-600/25 via-indigo-500/20 to-pink-500/15'
              }`}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 border-2 border-dashed border-indigo-500/30 rounded-full animate-spin [animation-duration:40s]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 md:w-64 md:h-64 border border-dashed border-purple-500/25 rounded-full animate-spin [animation-duration:20s] [animation-direction:reverse]" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative transform hover:scale-105 transition-transform duration-700 select-none">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full blur-md opacity-40 animate-pulse" />
                <span className="relative text-8xl md:text-9xl drop-shadow-[0_0_35px_rgba(168,85,247,0.7)] animate-bounce [animation-duration:4s]">
                  🧠
                </span>
              </div>
            </div>

            <div
              className={`absolute top-4 left-4 border px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-500 backdrop-blur-sm animate-bounce [animation-duration:3s] ${t.floatingBadge}`}
            >
              🥇 Arena Hall of Fame
            </div>
            <div
              className={`absolute bottom-8 -right-4 border px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-500 backdrop-blur-sm animate-bounce [animation-duration:3.5s] ${t.floatingBadge}`}
            >
              🧠 Atividade Recomendada
            </div>
            <div
              className={`absolute top-1/2 -left-10 border px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-500 backdrop-blur-sm animate-bounce [animation-duration:4s] ${t.floatingBadge}`}
            >
              🎯 Quiz Oficial Ativo
            </div>
          </div>
        </div>
      </section>

      {/* -----------------------------------------------------------------------
          BANNER DINÂMICO DA ARENA (ABERTURA ANTECIPADA 5 MINUTOS ANTES)
          ----------------------------------------------------------------------- */}
      <section
        id="arena"
        className={`px-6 py-8 border-t border-b transition-colors duration-300 ${t.arenaSection}`}
      >
        <div
          className={`max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border p-6 md:p-8 rounded-2xl relative overflow-hidden ${t.arenaCard}`}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col gap-2 relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 justify-center md:justify-start">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isArenaPreOpen
                    ? 'bg-emerald-500 animate-ping'
                    : isArenaLive
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span
                className={`text-xs font-extrabold uppercase tracking-widest ${
                  isArenaPreOpen ? 'text-emerald-500' : 'text-amber-500'
                }`}
              >
                {isArenaPreOpen
                  ? 'Portões Abertos (5 min antes)'
                  : isArenaLive
                  ? 'Batalha Acontecendo'
                  : 'Arena Oficial Diária'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              A Grande Batalha{' '}
              <span className={t.arenaTitleAccent}>MenteAfiada</span>
            </h2>
            <p className={`text-sm max-w-md ${t.bentoText}`}>
              {isArenaPreOpen
                ? 'A sala oficial já está aberta para entrada antecipada! Clique em Entrar Agora e aguarde o início.'
                : 'Participe de combates rápidos e dinâmicos para desafiar seus reflexos e conquistar medalhas para o seu perfil.'}
            </p>
          </div>

          <div
            className={`flex flex-col items-center gap-3 relative z-10 border px-6 py-4 rounded-xl backdrop-blur-md ${t.arenaTimerBox}`}
          >
            <span className={`text-xs font-medium ${t.bentoText}`}>
              {isArenaPreOpen
                ? 'Sala Aberta! Inicia em:'
                : isArenaLive
                ? 'Entrada Autorizada'
                : 'Abertura da Sala (5 min antes):'}
            </span>
            <div
              className={`text-3xl font-black font-mono tracking-widest animate-pulse ${
                isArenaLive ? 'text-emerald-500' : t.arenaTimerText
              }`}
            >
              {nextBattleTime}
            </div>
            <span className="text-xs opacity-60">
              Rodadas hoje: 14h, 16h, 18h e 20h
            </span>
          </div>

          <button
            type="button"
            onClick={handleArenaActionClick}
            className={`w-full md:w-auto relative z-10 px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              isArenaLive
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-transparent text-slate-950 font-black shadow-lg shadow-emerald-950/30 hover:scale-105'
                : t.arenaSecondaryBtn
            }`}
          >
            ⚔️{' '}
            {isArenaLive
              ? activeArenaPin
                ? `ENTRAR AGORA (PIN ${activeArenaPin})`
                : 'ENTRAR NA SALA AGORA'
              : 'Ver Grade & Histórico'}
          </button>
        </div>
      </section>

      {/* -----------------------------------------------------------------------
          BENTO GRID DE TRILHAS POR PERFIL
          ----------------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-black tracking-tight mb-4">
            Escolha sua Jornada
          </h2>
          <p className={`text-sm ${t.bentoText}`}>
            Tanto faz se você quer desafiar ou ser desafiado. Criamos a melhor
            ferramenta educacional para impulsionar suas conquistas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div
            className={`md:col-span-7 border p-8 rounded-3xl flex flex-col justify-between group transition-all duration-300 ${t.bentoCard}`}
          >
            <div>
              <div className="text-4xl mb-6 select-none">🎮</div>
              <h3 className="text-2xl font-bold mb-2">Para Alunos</h3>
              <p className={`text-sm leading-relaxed mb-6 ${t.bentoText}`}>
                Desafie seus amigos, entre no top 10 do ranking e acumule
                conquistas! Estude para suas avaliações jogando quizzes
                interativos e dinâmicos de forma leve.
              </p>

              <ul className={`space-y-3 mb-8 text-sm ${t.bentoList}`}>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-500 font-bold">✓</span> Arena
                  competitiva 24h
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-500 font-bold">✓</span> Histórico
                  de erros & acertos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-500 font-bold">✓</span>{' '}
                  Customização de avatar e medalhas
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard/participant')}
              className="w-full sm:w-auto self-start bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
            >
              Iniciar Desafios
            </button>
          </div>

          <div
            className={`md:col-span-5 border p-8 rounded-3xl flex flex-col justify-between group transition-all duration-300 ${t.bentoCard}`}
          >
            <div>
              <div className="text-4xl mb-6 select-none">🏫</div>
              <h3 className="text-2xl font-bold mb-2">Para Professores</h3>
              <p className={`text-sm leading-relaxed mb-6 ${t.bentoText}`}>
                Gerencie questionários personalizados, engaje seus alunos
                gerando salas automáticas ou monitorando através de relatórios
                e controle tudo direto pelo seu celular ou computador.
              </p>

              <ul className={`space-y-3 mb-8 text-sm ${t.bentoList}`}>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span> Gerador
                  de quizzes simplificado
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span>{' '}
                  Relatórios detalhados de acertos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold">✓</span> Suporte
                  para QR Code e PIN
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard/quizzes')}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
            >
              Criar Quiz
            </button>
          </div>

          <div
            id="como-jogar"
            className={`md:col-span-12 border p-8 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 ${t.tutorialBanner}`}
          >
            <div className="max-w-xl">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 block">
                TUTORIAL RÁPIDO
              </span>
              <h3 className="text-xl font-bold mb-3">
                Como entrar em um Quiz usando o PIN?
              </h3>
              <ol className={`space-y-2 text-sm ${t.bentoText}`}>
                <li>
                  1. Insira os 6 dígitos fornecidos pelo seu professor no campo
                  do topo desta página.
                </li>
                <li>
                  2. Escolha o seu apelido de exibição da sala para iniciar.
                </li>
                <li>
                  3. Espere o coordenador / professor acionar a partida.
                </li>
              </ol>
            </div>

            <div className="flex gap-4 self-stretch sm:self-auto flex-col sm:flex-row justify-center items-center">
              <div
                className={`text-center px-6 py-4 rounded-xl border ${t.statBox}`}
              >
                <div className="text-xl font-bold">100%</div>
                <div className="text-xs opacity-60">Gratuito</div>
              </div>
              <div
                className={`text-center px-6 py-4 rounded-xl border ${t.statBox}`}
              >
                <div className="text-xl font-bold">Web / Mobile</div>
                <div className="text-xs opacity-60">Dispositivos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -----------------------------------------------------------------------
          PROVA SOCIAL E INDICADORES
          ----------------------------------------------------------------------- */}
      <section id="recursos" className="max-w-7xl mx-auto px-6 pb-24">
        <div
          className={`border-t pt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center ${t.statsDivider}`}
        >
          <div>
            <div
              className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent mb-1 ${t.statsNumber}`}
            >
              +15k
            </div>
            <div className="text-xs font-medium opacity-60 uppercase tracking-wider">
              Quizzes Jogados
            </div>
          </div>
          <div>
            <div
              className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent mb-1 ${t.statsNumber}`}
            >
              98%
            </div>
            <div className="text-xs font-medium opacity-60 uppercase tracking-wider">
              Aprovação de Alunos
            </div>
          </div>
          <div>
            <div
              className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent mb-1 ${t.statsNumber}`}
            >
              24h
            </div>
            <div className="text-xs font-medium opacity-60 uppercase tracking-wider">
              Batalhas na Arena
            </div>
          </div>
          <div>
            <div
              className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent mb-1 ${t.statsNumber}`}
            >
              Real-time
            </div>
            <div className="text-xs font-medium opacity-60 uppercase tracking-wider">
              Gamificação e Placar
            </div>
          </div>
        </div>
      </section>

      {/* -----------------------------------------------------------------------
          FOOTER
          ----------------------------------------------------------------------- */}
      <footer className={`mt-auto border-t px-6 py-12 ${t.footer}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              <span className="text-lg">🧠</span>
            </div>
            <span className="text-sm font-bold tracking-tight">
              Mente<span className="text-purple-500 font-extrabold">Afiada</span>{' '}
              © {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex gap-6 text-xs opacity-75">
            <a href="#" className="hover:opacity-100 transition-opacity">
              Termos de Uso
            </a>
            <a href="#" className="hover:opacity-100 transition-opacity">
              Privacidade
            </a>
            <a href="#" className="hover:opacity-100 transition-opacity">
              Auditabilidade
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}