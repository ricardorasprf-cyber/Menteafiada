/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/apply-code.js
 * Objetivo: Aplicador Automático de Arquivos no VS Code a partir da Área de
 * Transferência (Clipboard) com leitura estrita em UTF-8 (sem caracteres ):
 * - Suporta clique direto no botão "Copiar resposta" do Gemini;
 * - Identifica todos os arquivos completos marcados com cabeçalhos contendo
 *   o caminho do arquivo (ex.: `1. Arquivo Completo: src/app/globals.css`);
 * - Cria automaticamente quaisquer diretórios inexistentes (`fs.mkdirSync`);
 * - Ignora referências ao próprio `scripts/apply-code.js` para evitar
 *   auto-sobrescrita acidental.
 * Uso: Pressione Ctrl + Shift + B no VS Code (ou rode `npm run apply`).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Lê o texto da área de transferência em UTF-8 estrito (evita corrupção de acentos)
function readClipboardText() {
  try {
    if (process.platform === "win32") {
      const psCmd =
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw";
      return execSync(`powershell -NoProfile -Command "${psCmd}"`, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    }
    if (process.platform === "darwin") {
      return execSync("pbpaste", {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    }
    return execSync("xclip -o -selection clipboard", {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    console.error("❌ Não foi possível ler a área de transferência:", err.message);
    return "";
  }
}

// Limpa resíduos visuais que o navegador adiciona ao copiar blocos de código
function sanitizeExtractedCode(rawCode) {
  let cleaned = rawCode.replace(/\r\n/g, "\n").trim();

  const noisePrefixes = [
    /^Copiar código\s*\n+/i,
    /^Copy code\s*\n+/i,
    /^(javascript|js|jsx|typescript|ts|tsx|css|json|sql|html|bash|markdown|md)\s*\n+/i,
  ];

  for (const regex of noisePrefixes) {
    cleaned = cleaned.replace(regex, "");
  }

  return cleaned.trimEnd();
}

// Extrai arquivos completos copiados via botão "Copiar resposta" ou seleção
function extractFilesFromClipboard(clipboardText) {
  const results = [];
  if (!clipboardText || clipboardText.trim().length === 0) {
    return results;
  }

  const normalizedText = clipboardText.replace(/\r\n/g, "\n");

  // Procura linhas de cabeçalho de arquivo como:
  // "### 1. Arquivo Completo: src/app/globals.css" ou "1. Arquivo Completo: src/..."
  const headerLineRegex =
    /^(?:#{1,4}\s*)?(?:\d+\.\s*)?(?:Arquivo(?:\s+Completo)?(?:\s+Atualizado)?\s*:\s*)?`?((?:src|scripts|public)\/[a-zA-Z0-9_\-\[\]\.\/]+\.(?:js|jsx|ts|tsx|css|json|sql|md)|(?:package\.json|jsconfig\.json|\.gitignore|vercel\.json))`?\s*$/gm;

  const headers = [];
  let hMatch;
  while ((hMatch = headerLineRegex.exec(normalizedText)) !== null) {
    const detectedPath = hMatch[1].trim().replace(/\\/g, "/");
    // Protege o próprio script aplicador contra auto-sobrescrita
    if (detectedPath === "scripts/apply-code.js") continue;

    headers.push({
      filePath: detectedPath,
      headerEndIndex: hMatch.index + hMatch[0].length,
      headerStartIndex: hMatch.index,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const current = headers[i];
    const nextStart =
      i + 1 < headers.length
        ? headers[i + 1].headerStartIndex
        : normalizedText.length;

    let slice = normalizedText.slice(current.headerEndIndex, nextStart);

    // Remove cercas de crase tripla se existirem no início/fim do bloco
    slice = slice.replace(/^\s*```[a-zA-Z0-9_-]*\n/, "");
    slice = slice.replace(/\n```\s*$/, "");

    // Corta qualquer seção explicativa final após "---"
    const trailingDivider = slice.search(/\n---+\s*\n/);
    if (trailingDivider !== -1) {
      slice = slice.slice(0, trailingDivider);
    }

    const cleanedCode = sanitizeExtractedCode(slice);

    if (cleanedCode.length > 15) {
      const existingIndex = results.findIndex(
        (r) => r.filePath === current.filePath
      );
      if (existingIndex >= 0) {
        results[existingIndex].code = cleanedCode;
      } else {
        results.push({ filePath: current.filePath, code: cleanedCode });
      }
    }
  }

  return results;
}

function run() {
  console.log("=======================================================");
  console.log("⚡ MenteAfiada — Aplicador Automático de Código (VS Code)");
  console.log("=======================================================");

  const clipboardText = readClipboardText();
  const extractedFiles = extractFilesFromClipboard(clipboardText);

  if (extractedFiles.length === 0) {
    console.warn(
      "⚠️  Nenhum arquivo completo identificado na área de transferência."
    );
    console.log(
      "   Dica: Clique no botão 'Copiar' no final da resposta da Gem e pressione Ctrl + Shift + B."
    );
    return;
  }

  console.log(
    `📦 ${extractedFiles.length} arquivo(s) identificado(s) para gravação:\n`
  );

  let appliedCount = 0;

  extractedFiles.forEach(({ filePath, code }) => {
    const fullTargetPath = path.join(process.cwd(), filePath);
    const targetDir = path.dirname(fullTargetPath);

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(
          `   📁 Pasta criada: ${path.relative(process.cwd(), targetDir)}`
        );
      }

      fs.writeFileSync(fullTargetPath, code + "\n", "utf8");
      console.log(`   ✅ Arquivo gravado: ${filePath}`);
      appliedCount++;
    } catch (err) {
      console.error(`   ❌ Erro ao gravar ${filePath}:`, err.message);
    }
  });

  console.log(
    `\n🎉 Concluído! ${appliedCount} arquivo(s) atualizado(s) no VS Code.`
  );

  const args = process.argv.slice(2);
  if (args.includes("--sync")) {
    console.log("\n☁️  Iniciando sincronização automática com o Google Drive...");
    try {
      execSync("npm run push-drive", { stdio: "inherit" });
    } catch (err) {
      console.warn("⚠️  Aviso ao sincronizar Drive:", err.message);
    }
  }

  console.log("=======================================================\n");
}

run();