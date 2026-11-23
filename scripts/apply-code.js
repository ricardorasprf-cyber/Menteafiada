/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/apply-code.js
 * Objetivo: Aplicador Automático de Arquivos no VS Code a partir da Área de
 * Transferência (Clipboard) com extração cirúrgica entre cercas Markdown
 * (``` ... ```) e leitura estrita em UTF-8.
 * Uso: Clique no botão "Copiar" no final da resposta e pressione Ctrl + Shift + B.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

function extractFilesFromClipboard(clipboardText) {
  const results = [];
  if (!clipboardText || clipboardText.trim().length === 0) {
    return results;
  }

  const normalizedText = clipboardText.replace(/\r\n/g, "\n");

  // Captura exclusivamente cabeçalhos no formato:
  // "### 1. Arquivo Completo: caminho/do/arquivo.ext"
  // seguidos por bloco cercado ```linguagem ... ```
  const fileBlockRegex =
    /^#{1,4}\s+\d+\.\s+Arquivo(?:\s+Completo)?(?:\s+Atualizado)?\s*:\s*`?((?:src|scripts|public)\/[a-zA-Z0-9_\-\[\]\.\/]+\.(?:js|jsx|ts|tsx|css|json|sql|md)|(?:package\.json|jsconfig\.json|\.gitignore|vercel\.json))`?\s*\n+```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```(?=\s*\n|$)/gm;

  let match;
  while ((match = fileBlockRegex.exec(normalizedText)) !== null) {
    const filePath = match[1].trim().replace(/\\/g, "/");
    const code = match[2].trimEnd();

    if (filePath && code.length > 5) {
      const existingIndex = results.findIndex((r) => r.filePath === filePath);
      if (existingIndex >= 0) {
        results[existingIndex].code = code;
      } else {
        results.push({ filePath, code });
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
      "⚠️  Nenhum bloco de arquivo completo identificado na área de transferência."
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