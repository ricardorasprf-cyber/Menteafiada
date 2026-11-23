// scripts/upload-drive.js
/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/upload-drive.js
 * Objetivo: Consolidação e Upload da Base de Conhecimento para o Google Drive:
 * 1. Gera o arquivo principal 'base_conhecimento_gem.md' com Índice Completo
 *    de Arquivos logo no cabeçalho;
 * 2. Gera 4 partições temáticas compactas (~15 a 22 arquivos cada) para
 *    garantir leitura 100% integral sem cortes pela API do Google Docs:
 *    - 'base_01_app_ui.md'          -> Home, Arena, Perfil e Componentes
 *    - 'base_02_apis_lib.md'        -> APIs, Libs, Contextos e Middleware
 *    - 'base_03_infra_sql.md'       -> Infraestrutura, Scripts e Configurações
 *    - 'base_04_dashboards_jogo.md' -> Dashboards, Jogo Ao Vivo, Planos e Auth
 * ============================================================================
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
  "base_01_app_ui.md",
  "base_02_apis_lib.md",
  "base_03_infra_sql.md",
  "base_04_dashboards_jogo.md",
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

  return fileList.sort();
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

function getLangTag(ext) {
  if (["js", "jsx"].includes(ext)) return "JavaScript";
  if (["ts", "tsx"].includes(ext)) return "TypeScript";
  if (ext === "json") return "JSON";
  if (ext === "css") return "CSS";
  if (ext === "sql") return "SQL";
  if (ext === "md") return "Markdown";
  return "text";
}

function buildKnowledgeBase(files, customTitle = "Base de Conhecimento do Projeto MenteAfiada") {
  const { readable, iso } = getFormattedDateTime();

  const relativePaths = files.map((f) =>
    path.relative(process.cwd(), f).replace(/\\/g, "/")
  );

  let content = "";
  content += `# ${customTitle}\n`;
  content += "Código-fonte consolidado para alimentação da Gem de IA e Auditoria Educacional.\n\n";
  content += "---\n";
  content += "### 🕒 Metadados de Atualização\n";
  content += `- **Última Atualização Registrada:** ${readable} (Horário de Brasília)\n`;
  content += `- **Timestamp ISO 8601:** \`${iso}\`\n`;
  content += `- **Total de Arquivos Rastreados:** ${files.length}\n`;
  content += `- **Comando de Origem:** \`npm run push-drive\`\n`;
  content += "---\n\n";

  // Índice Completo no topo para visibilidade total
  content += "### 📂 Índice Completo de Arquivos Rastreados\n";
  relativePaths.forEach((rel, idx) => {
    content += `${idx + 1}. \`${rel}\`\n`;
  });
  content += "\n---\n\n";

  let processedCount = 0;

  files.forEach((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    const fileExtension = path.extname(filePath).replace(".", "").toLowerCase();
    const langTag = getLangTag(fileExtension);

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

async function upsertDriveDocument(drive, targetFileName, localFilePath, updateTime) {
  const searchRes = await drive.files.list({
    q: `name = '${targetFileName}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const existingFile = searchRes.data.files?.[0];

  const media = {
    mimeType: "text/markdown",
    body: fs.createReadStream(localFilePath),
  };

  if (existingFile) {
    const updateRes = await drive.files.update({
      fileId: existingFile.id,
      media: media,
      fields: "id, name, modifiedTime",
    });
    console.log(`☁️  [Google Drive] '${targetFileName}' sincronizado (ID: ${updateRes.data.id}) às ${updateTime}`);
  } else {
    console.warn(`⚠️  [Google Drive] Arquivo '${targetFileName}' não encontrado no Drive. Crie-o e compartilhe como Editor com a Service Account.`);
  }
}

async function run() {
  console.log("=======================================================");
  console.log("🚀 MenteAfiada: Consolidando Base de Conhecimento...");
  console.log("=======================================================");

  const startTime = Date.now();
  const allFiles = getFilesRecursively(process.cwd());

  // 1. Documento principal completo (com Índice no topo)
  const { content, processedCount, readable } = buildKnowledgeBase(allFiles);
  const outputPath = path.join(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outputPath, content, "utf-8");

  // 2. Partições temáticas compactas (~15 a 22 arquivos cada)
  const uiComponentsFiles = allFiles.filter((f) => {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    return (
      rel === "src/app/ClientPageContent.js" ||
      rel.startsWith("src/app/arena/") ||
      rel.startsWith("src/app/completar-perfil/") ||
      rel.startsWith("src/app/components/")
    );
  });

  const dashboardsGameFiles = allFiles.filter((f) => {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    return (
      rel.startsWith("src/app/") &&
      !rel.startsWith("src/app/api/") &&
      !uiComponentsFiles.includes(f)
    );
  });

  const apiLibFiles = allFiles.filter((f) => {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    return (
      rel.startsWith("src/app/api/") ||
      rel.startsWith("src/lib/") ||
      rel.startsWith("src/contexts/") ||
      rel.startsWith("src/constants/") ||
      rel.startsWith("src/locales/") ||
      rel === "src/middleware.js"
    );
  });

  const infraFiles = allFiles.filter((f) => {
    return (
      !uiComponentsFiles.includes(f) &&
      !dashboardsGameFiles.includes(f) &&
      !apiLibFiles.includes(f)
    );
  });

  const part1Path = path.join(process.cwd(), "base_01_app_ui.md");
  const part2Path = path.join(process.cwd(), "base_02_apis_lib.md");
  const part3Path = path.join(process.cwd(), "base_03_infra_sql.md");
  const part4Path = path.join(process.cwd(), "base_04_dashboards_jogo.md");

  fs.writeFileSync(
    part1Path,
    buildKnowledgeBase(uiComponentsFiles, "MenteAfiada — Parte 1: Arena, Perfil e Componentes UI").content,
    "utf-8"
  );
  fs.writeFileSync(
    part2Path,
    buildKnowledgeBase(apiLibFiles, "MenteAfiada — Parte 2: APIs, Libs e Contextos").content,
    "utf-8"
  );
  fs.writeFileSync(
    part3Path,
    buildKnowledgeBase(infraFiles, "MenteAfiada — Parte 3: Infraestrutura, Scripts e SQL").content,
    "utf-8"
  );
  fs.writeFileSync(
    part4Path,
    buildKnowledgeBase(dashboardsGameFiles, "MenteAfiada — Parte 4: Dashboards, Jogo Ao Vivo, Planos e Auth").content,
    "utf-8"
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);

  console.log(`✅ Arquivo principal '${OUTPUT_FILE}' gerado (${fileSizeKB} KB, ${processedCount} arquivos).`);
  console.log(
    `✅ Partições compactas: Parte 1 UI (${uiComponentsFiles.length}), Parte 2 APIs/Lib (${apiLibFiles.length}), Parte 3 Infra (${infraFiles.length}), Parte 4 Dashboards/Jogo (${dashboardsGameFiles.length}).`
  );
  console.log(`   • Tempo de execução: ${elapsed}s`);

  const credentialsPath = resolveCredentialsPath();
  if (!credentialsPath) {
    console.warn("\n⚠️  [Google Drive] Arquivo de credenciais não localizado.");
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    await upsertDriveDocument(drive, OUTPUT_FILE, outputPath, readable);
    await upsertDriveDocument(drive, "base_01_app_ui.md", part1Path, readable);
    await upsertDriveDocument(drive, "base_02_apis_lib.md", part2Path, readable);
    await upsertDriveDocument(drive, "base_03_infra_sql.md", part3Path, readable);
    await upsertDriveDocument(drive, "base_04_dashboards_jogo.md", part4Path, readable);
  } catch (error) {
    console.error(`\n❌ [Google Drive] Falha durante a transmissão:`, error.message);
  }

  console.log("=======================================================\n");
}

run();