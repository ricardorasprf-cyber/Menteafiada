/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/push-focus.js
 * Objetivo: Enviar exclusivamente os arquivos selecionados para o documento
 * 'base_foco_atual.md' no Google Drive (e 'base_foco_parte2.md' se passar de
 * 22 KB), utilizando `google.auth.JWT` nativo (sem deprecation warnings).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const FOCUS_DOC_1 = "base_foco_atual.md";
const FOCUS_DOC_2 = "base_foco_parte2.md";
const MAX_CHUNK_CHARS = 22000;

const IGNORED_DIRS = [
  "node_modules",
  ".next",
  ".git",
  ".vscode",
  "public",
  "dist",
  "build",
];

function resolveCredentialsPath() {
  const possiblePaths = [
    path.join(process.cwd(), "scripts", "suas-credenciais-google.json"),
    path.join(process.cwd(), "scripts", "google-credentials.json"),
    path.join(process.cwd(), "google-credentials.json"),
    path.join(process.cwd(), "suas-credenciais-google.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  const scriptsDir = path.join(process.cwd(), "scripts");
  if (fs.existsSync(scriptsDir)) {
    const jsonFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".json"));
    for (const f of jsonFiles) {
      const full = path.join(scriptsDir, f);
      try {
        const parsed = JSON.parse(fs.readFileSync(full, "utf-8"));
        if (parsed.type === "service_account" && parsed.client_email) {
          return full;
        }
      } catch (e) {}
    }
  }

  return null;
}

function createDriveClient(credentialsPath) {
  const creds = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  const privateKey = String(creds.private_key || "").replace(/\\n/g, "\n");

  const jwtClient = new google.auth.JWT({
    email: creds.client_email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth: jwtClient });
}

function getAllProjectFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
    if (
      IGNORED_DIRS.some((ig) => rel === ig || rel.startsWith(ig + "/")) ||
      entry.toLowerCase().includes("credenciais")
    ) {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllProjectFiles(fullPath, fileList);
    } else if (/\.(js|jsx|ts|tsx|json|md|css|sql)$/i.test(entry)) {
      fileList.push(rel);
    }
  }
  return fileList.sort();
}

function getLangTag(filePath) {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  if (["js", "jsx"].includes(ext)) return "JavaScript";
  if (["ts", "tsx"].includes(ext)) return "TypeScript";
  if (ext === "json") return "JSON";
  if (ext === "css") return "CSS";
  if (ext === "sql") return "SQL";
  return "Markdown";
}

async function upsertDriveDoc(drive, docName, textContent, readableDate) {
  const tempPath = path.join(process.cwd(), docName);
  fs.writeFileSync(tempPath, textContent, "utf-8");

  const searchRes = await drive.files.list({
    q: `name = '${docName}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const existingFile = searchRes.data.files?.[0];
  if (!existingFile) {
    console.warn(
      `\n⚠️ Documento '${docName}' não encontrado no Google Drive.\n` +
        `   Crie um Documento Google chamado '${docName}' na mesma pasta do 'base_conhecimento_gem.md' e compartilhe como Editor com a Service Account.`
    );
    return false;
  }

  const updateRes = await drive.files.update({
    fileId: existingFile.id,
    media: {
      mimeType: "text/markdown",
      body: fs.createReadStream(tempPath),
    },
    fields: "id, name, modifiedTime",
  });

  console.log(
    `☁️ [Google Drive] '${docName}' sincronizado (ID: ${updateRes.data.id}) às ${readableDate}`
  );
  return true;
}

async function run() {
  const rawArgs = process.argv.slice(2).map((a) => a.trim()).filter(Boolean);

  console.log("=======================================================");
  console.log("🎯 MenteAfiada — Sincronização Seletiva (Foco de Edição)");
  console.log("=======================================================");

  if (rawArgs.length === 0) {
    console.warn("⚠️ Informe ao menos 1 caminho ou termo de arquivo.");
    console.log("   Exemplo: npm run focus src/app/api/generate-quiz/route.js");
    process.exit(1);
  }

  const allFiles = getAllProjectFiles(process.cwd());
  const matchedSet = new Set();

  for (const term of rawArgs) {
    const normalizedTerm = term.replace(/\\/g, "/").toLowerCase();
    const exact = allFiles.find((f) => f.toLowerCase() === normalizedTerm);
    if (exact) {
      matchedSet.add(exact);
      continue;
    }
    const partials = allFiles.filter(
      (f) => f.toLowerCase().includes(normalizedTerm) && !f.startsWith("base_")
    );
    partials.forEach((p) => matchedSet.add(p));
  }

  const selectedFiles = Array.from(matchedSet);
  if (selectedFiles.length === 0) {
    console.error("❌ Nenhum arquivo encontrado para:", rawArgs.join(", "));
    process.exit(1);
  }

  const now = new Date();
  const readable = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  let fullContent = `# Foco de Edição Atual — Projeto MenteAfiada\n`;
  fullContent += `Atualização: ${readable} | ISO: \`${now.toISOString()}\` | Arquivos Selecionados: ${selectedFiles.length}\n\n`;
  selectedFiles.forEach((rel, idx) => {
    fullContent += `${idx + 1}. \`${rel}\`\n`;
  });
  fullContent += `\n---\n\n`;

  for (const rel of selectedFiles) {
    const fullPath = path.join(process.cwd(), rel);
    const fileData = fs.readFileSync(fullPath, "utf-8");
    const lang = getLangTag(rel);
    fullContent += `## Arquivo: ${rel}\n`;
    fullContent += "```" + ` ${lang}\n`;
    fullContent += fileData;
    fullContent += `\n\`\`\`\n\n`;
  }

  const sizeKB = (Buffer.byteLength(fullContent, "utf8") / 1024).toFixed(1);
  console.log(`📦 Arquivos selecionados (${selectedFiles.length}):`);
  selectedFiles.forEach((f) => console.log(`   • ${f}`));
  console.log(`📏 Tamanho total: ${sizeKB} KB`);

  const credentialsPath = resolveCredentialsPath();
  if (!credentialsPath) {
    console.error("❌ Arquivo de credenciais Google não localizado.");
    process.exit(1);
  }

  const drive = createDriveClient(credentialsPath);

  const part1 = fullContent.slice(0, MAX_CHUNK_CHARS);
  await upsertDriveDoc(drive, FOCUS_DOC_1, part1, readable);

  if (fullContent.length > MAX_CHUNK_CHARS) {
    const part2 =
      `# Foco de Edição Atual (Continuação — Parte 2)\nAtualização: ${readable}\n\n` +
      fullContent.slice(MAX_CHUNK_CHARS, MAX_CHUNK_CHARS * 2);
    await upsertDriveDoc(drive, FOCUS_DOC_2, part2, readable);
  }

  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("❌ Erro no push-focus:", err.message);
  process.exit(1);
});
