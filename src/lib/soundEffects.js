// src/lib/soundEffects.js

/**
 * Gestor Centralizado de Efeitos Sonoros com Web Audio API.
 * Suporta arranque preguiçoso (lazy initialization), desbloqueio de contexto de áudio
 * e persistência nas preferências do utilizador.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;

    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("sfx_enabled") !== "false";
    }
  }

  /**
   * Inicializa e desbloqueia o contexto de áudio em resposta à interação do utilizador.
   */
  init() {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => {
        console.warn("[SoundManager] Falha ao retomar o contexto de áudio:", err);
      });
    }
  }

  /**
   * Alterna o estado do som e sincroniza no localStorage.
   * @returns {boolean} Novo estado de ativação do som.
   */
  toggle() {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("sfx_enabled", this.enabled ? "true" : "false");
    }
    return this.enabled;
  }

  /**
   * Define explicitamente o estado do som.
   * @param {boolean} state 
   */
  setEnabled(state) {
    this.enabled = Boolean(state);
    if (typeof window !== "undefined") {
      localStorage.setItem("sfx_enabled", this.enabled ? "true" : "false");
    }
  }

  /**
   * 1. Clique de seleção de alternativa ou botão de navegação.
   */
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("[SoundManager] Erro no efeito de clique:", e);
    }
  }

  /**
   * 2. Sinal sonoro de contagem decrescente (últimos segundos).
   */
  playCountdown() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {
      console.warn("[SoundManager] Erro no som de countdown:", e);
    }
  }

  /**
   * 3. Transição para a pergunta seguinte (painel do professor).
   */
  playNextQuestion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("[SoundManager] Erro no efeito next question:", e);
    }
  }

  /**
   * 4. Resposta correta (acorde harmónico ascendente).
   */
  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.2);
      });
    } catch (e) {
      console.warn("[SoundManager] Erro no efeito de resposta correta:", e);
    }
  }

  /**
   * 5. Resposta incorreta (glissando descendente grave).
   */
  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("[SoundManager] Erro no efeito de erro:", e);
    }
  }

  /**
   * 6. Multiplicador de sequência positiva (Streak combo).
   */
  playStreak() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.06);
        osc.stop(this.ctx.currentTime + idx * 0.06 + 0.25);
      });
    } catch (e) {
      console.warn("[SoundManager] Erro no efeito de streak:", e);
    }
  }

  /**
   * 7. Fanfarra de Pódio e Vitória.
   */
  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const fanfare = [
        { f: 523.25, d: 0.12 },
        { f: 523.25, d: 0.12 },
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.35 },
        { f: 587.33, d: 0.15 },
        { f: 659.25, d: 0.15 },
        { f: 783.99, d: 0.55 },
      ];

      let start = this.ctx.currentTime;
      fanfare.forEach((item) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(item.f, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + item.d);

        start += item.d + 0.03;
      });
    } catch (e) {
      console.warn("[SoundManager] Erro na fanfarra de vitória:", e);
    }
  }
}

export const sounds = new SoundManager();