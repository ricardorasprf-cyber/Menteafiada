/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/auto-push.js
 * Objetivo: Executar o comando 'npm run push-drive' logo no arranque e,
 * seguidamente, a cada 10 minutos em segundo plano enquanto o VS Code
 * estiver aberto.
 * 
 * Recursos:
 * - Execução imediata na inicialização para garantir sincronia instantânea;
 * - Bloqueio atômico de concorrência (evita duas execuções simultâneas);
 * - Logs estruturados com horário local (America/Sao_Paulo).
 * ============================================================================
 */

const { exec } = require("child_process");

// Intervalo configurado para 10 minutos (em milissegundos)
const INTERVALO_MINUTOS = 10;
const INTERVALO_MS = INTERVALO_MINUTOS * 60 * 1000;
const COMANDO_PUSH = "npm run push-drive";

let emExecucao = false;

/**
 * Retorna o horário atual formatado no padrão local (HH:MM:SS)
 * @returns {string}
 */
function obterTimestamp() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
}

/**
 * Executa o comando de sincronização de forma assíncrona com gestão de estado.
 */
function executarSincronizacao() {
  if (emExecucao) {
    console.log(
      `[${obterTimestamp()}] ⚠️ Sincronização anterior ainda em andamento. Aguardando próximo ciclo.`
    );
    return;
  }

  emExecucao = true;
  console.log(`\n[${obterTimestamp()}] 🚀 Executando '${COMANDO_PUSH}'...`);

  exec(COMANDO_PUSH, (erro, stdout, stderr) => {
    emExecucao = false;

    if (erro) {
      console.error(
        `[${obterTimestamp()}] ❌ Erro ao executar '${COMANDO_PUSH}':`
      );
      console.error(erro.message);
      return;
    }

    if (stderr && stderr.trim().length > 0) {
      console.warn(
        `[${obterTimestamp()}] ⚠️ Avisos na execução:\n${stderr.trim()}`
      );
    }

    if (stdout && stdout.trim().length > 0) {
      console.log(`[${obterTimestamp()}] 📋 Resultado:\n${stdout.trim()}`);
    }

    console.log(
      `[${obterTimestamp()}] ✅ Sincronização concluída. Próxima execução em ${INTERVALO_MINUTOS} minutos.`
    );
  });
}

// Cabeçalho de confirmação inicial
console.log("=======================================================");
console.log(" MenteAfiada — Sincronizador Automático (Google Drive)");
console.log(" Estado: ATIVO EM SEGUNDO PLANO");
console.log(` Intervalo: A cada ${INTERVALO_MINUTOS} minutos`);
console.log("=======================================================");

// Execução imediata ao iniciar
executarSincronizacao();

// Agendamento periódico a cada 10 minutos
setInterval(executarSincronizacao, INTERVALO_MS);