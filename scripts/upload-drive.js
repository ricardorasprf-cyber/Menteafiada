// scripts/upload-drive.js

/**
 * Script de Consolidação e Upload da Base de Conhecimento para o Google Drive.
 * Executado via: npm run push-drive
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const OUTPUT_FILE = "base_conhecimento_gem.md";

const IGNORED_PATHS = [
  "node_modules",
  ".next",
  ".git",
  ".vscode",
  "public",
  "dist",
  "build",
  OUTPUT_FILE,
  "temp_base.md",
  "package-lock.json",
  "google-credentials.json",
  "suas-credenciais-google.json",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
];

const ALLOWED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".sql",
];

function resolveCredentialsPath() {
  const possiblePaths = [
    path.join(process.cwd(), "scripts", "suas-credenciais-google.json"),
    path.join(process.cwd(), "scripts", "google-credentials.json"),
    path.join(process.cwd(), "google-credentials.json"),
    path.join(process.cwd(), "suas-credenciais-google.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
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

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");

    const isIgnored = IGNORED_PATHS.some((ignored) => {
      return (
        relativePath === ignored ||
        relativePath.startsWith(ignored + "/") ||
        path.basename(fullPath) === ignored ||
        path.basename(fullPath).toLowerCase().includes("credenciais")
      );
    });

    if (isIgnored) return;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        fileList.push(fullPath);
      }
    }
  });

  return fileList;
}

function getFormattedDateTime() {
  const now = new Date();

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return {
    readable: formattedDate,
    iso: now.toISOString(),
  };
}

function buildKnowledgeBase(files) {
  const { readable, iso } = getFormattedDateTime();

  let content = "";
  content += "# Base de Conhecimento do Projeto MenteAfiada\n";
  content += "Código-fonte consolidado para alimentação da Gem de IA e Auditoria Educacional.\n\n";
  content += "---\n";
  content += "### 🕒 Metadados de Atualização\n";
  content += `- **Última Atualização Registrada:** ${readable} (Horário de Brasília)\n`;
  content += `- **Timestamp ISO 8601:** \`${iso}\`\n`;
  content += `- **Total de Arquivos Rastreados:** ${files.length}\n`;
  content += `- **Comando de Origem:** \`npm run push-drive\`\n`;
  content += "---\n\n";

  let processedCount = 0;

  files.forEach((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    const fileExtension = path.extname(filePath).replace(".", "").toLowerCase();

    let langTag = "text";
    if (["js", "jsx"].includes(fileExtension)) langTag = "JavaScript";
    else if (["ts", "tsx"].includes(fileExtension)) langTag = "TypeScript";
    else if (fileExtension === "json") langTag = "JSON";
    else if (fileExtension === "css") langTag = "CSS";
    else if (fileExtension === "sql") langTag = "SQL";
    else if (fileExtension === "md") langTag = "Markdown";

    try {
      const fileData = fs.readFileSync(filePath, "utf-8");

      content += `## Arquivo: ${relativePath}\n`;
      content += "```" + ` ${langTag}\n`;
      content += fileData;
      content += "\n```\n\n";

      processedCount++;
    } catch (err) {
      console.warn(`[Aviso] Falha ao ler arquivo: ${relativePath} (${err.message})`);
    }
  });

  return { content, processedCount, readable };
}

async function uploadToDrive(filePath, updateTime) {
  const credentialsPath = resolveCredentialsPath();

  if (!credentialsPath) {
    console.warn("\n⚠️  [Google Drive] Arquivo de credenciais não localizado.");
    return;
  }

  const relativeCredPath = path.relative(process.cwd(), credentialsPath).replace(/\\/g, "/");
  console.log(`🔑 [Google Drive] Credencial identificada: '${relativeCredPath}'`);

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const searchRes = await drive.files.list({
      q: `name = '${OUTPUT_FILE}' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    const existingFile = searchRes.data.files?.[0];
    const media = {
      mimeType: "text/markdown",
      body: fs.createReadStream(filePath),
    };

    if (existingFile) {
      const updateRes = await drive.files.update({
        fileId: existingFile.id,
        media: media,
        fields: "id, name, modifiedTime",
      });

      console.log(`\n☁️  [Google Drive] Documento sincronizado com sucesso no Drive!`);
      console.log(`   • ID do Arquivo: ${updateRes.data.id}`);
      console.log(`   • Atualizado em: ${updateTime}`);
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: OUTPUT_FILE,
          mimeType: "text/markdown",
        },
        media: media,
        fields: "id, name",
      });

      console.log(`\n☁️  [Google Drive] Novo documento criado com sucesso no Drive!`);
      console.log(`   • ID do Arquivo: ${createRes.data.id}`);
      console.log(`   • Criado em: ${updateTime}`);
    }
  } catch (error) {
    console.error(`\n❌ [Google Drive] Falha durante a transmissão:`, error.message);
  }
}

async function run() {
  console.log("=======================================================");
  console.log("🚀 MenteAfiada: Consolidando Base de Conhecimento...");
  console.log("=======================================================");

  const startTime = Date.now();
  const allFiles = getFilesRecursively(process.cwd());

  const { content, processedCount, readable } = buildKnowledgeBase(allFiles);

  const outputPath = path.join(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outputPath, content, "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);

  console.log(`✅ Arquivo local '${OUTPUT_FILE}' gerado.`);
  console.log(`   • Registrado em: ${readable}`);
  console.log(`   • Arquivos lidos: ${processedCount}`);
  console.log(`   • Tamanho gerado: ${fileSizeKB} KB`);
  console.log(`   • Tempo de execução: ${elapsed}s`);

  await uploadToDrive(outputPath, readable);
  console.log("=======================================================\n");
}

run();