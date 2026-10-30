/**
 * ============================================================================
 * Ferramenta Educacional - Automação de Sincronização Periódica
 * ============================================================================
 * Objetivo: Executar o comando 'npm run push-drive' logo no arranque e,
 *           seguidamente, a cada 5 minutos enquanto o projeto estiver ativo.
 *
 * Melhorias de UX/Monitorização:
 * - Execução imediata no arranque: Garante confirmação visual no terminal sem
 *   necessidade de esperar 5 minutos para saber se a tarefa iniciou.
 * - Tratamento de concorrência com bloqueio atómico.
 * - Saída estruturada e com carimbos de data/hora para auditoria simples.
 */

const { exec } = require('child_process');

// Definições de intervalo (5 minutos convertidos para milissegundos)
const INTERVALO_MINUTOS = 5;
const INTERVALO_MS = INTERVALO_MINUTOS * 60 * 1000;
const COMANDO_PUSH = 'npm run push-drive';

let emExecucao = false;

/**
 * Retorna o horário atual formatado no padrão local (HH:MM:SS)
 * @returns {string}
 */
function obterTimestamp() {
  const agora = new Date();
  return agora.toLocaleTimeString('pt-PT', { hour12: false });
}

/**
 * Executa o comando de sincronização de forma assíncrona com gestão de estado.
 */
function executarSincronizacao() {
  if (emExecucao) {
    console.log(`[${obterTimestamp()}] ⚠️ Um processo de sincronização ainda se encontra ativo. O novo ciclo aguardará.`);
    return;
  }

  emExecucao = true;
  console.log(`\n[${obterTimestamp()}] 🚀 A executar '${COMANDO_PUSH}'...`);

  exec(COMANDO_PUSH, (erro, stdout, stderr) => {
    emExecucao = false;

    if (erro) {
      console.error(`[${obterTimestamp()}] ❌ Erro ao executar '${COMANDO_PUSH}':`);
      console.error(erro.message);
      return;
    }

    if (stderr && stderr.trim().length > 0) {
      console.warn(`[${obterTimestamp()}] ⚠️ Avisos gerados na execução:\n${stderr}`);
    }

    if (stdout && stdout.trim().length > 0) {
      console.log(`[${obterTimestamp()}] 📋 Resultado:\n${stdout.trim()}`);
    }

    console.log(`[${obterTimestamp()}] ✅ Sincronização concluída com sucesso. Próxima execução programada para daqui a ${INTERVALO_MINUTOS} minutos.`);
  });
}

// Cabeçalho de confirmação inicial
console.log(`=======================================================`);
console.log(`  Sincronizador Periódico para Ambiente de Ensino`);
console.log(`  Estado: ATIVO`);
console.log(`  Ciclo de agendamento: A cada ${INTERVALO_MINUTOS} minutos`);
console.log(`=======================================================`);

// Execução inicial de confirmação (garante feedback imediato na abertura da pasta)
executarSincronizacao();

// Agendamento das execuções periódicas subsequentes
setInterval(executarSincronizacao, INTERVALO_MS);