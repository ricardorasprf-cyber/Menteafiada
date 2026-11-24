// scripts/upload-drive.js
/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: scripts/upload-drive.js
 * Objetivo: Consolidação e Upload da Base de Conhecimento para o Google Drive:
 *   1. Gera o arquivo índice principal 'base_conhecimento_gem.md' com o Índice
 *      Completo de Arquivos no topo;
 *   2. Gera partições micro-granulares (~18 a 24 KB cada, 3 a 6 arquivos por
 *      partição) para garantir leitura 100% integral sem cortes pela API do
 *      Google Docs em qualquer arquivo do projeto.
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
  "base_foco_atual.md",
  "base_foco_parte2.md",
  "base_01_app_ui.md",
  "base_02_apis_lib.md",
  "base_03_infra_sql.md",
  "base_04_dashboards_jogo.md",
  "base_05_apis_core.md",
  "base_06_libs_contexts.md",
  "base_07_ui_components.md",
  "base_08_courses_creator.md",
  "base_09_quizzes_game_planos.md",
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
  content += `Atualização: ${readable} | ISO: \`${iso}\` | Arquivos: ${files.length}\n\n`;

  content += "### 📂 Índice de Arquivos\n";
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

async function upsertDriveDocument(drive, targetFileName, localFilePath, updateTime, parentFolderId = null) {
  const searchRes = await drive.files.list({
    q: `name = '${targetFileName}' and trashed = false`,
    fields: "files(id, name, parents)",
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
      fields: "id, name, modifiedTime, parents",
    });
    console.log(`☁️ [Google Drive] '${targetFileName}' atualizado (ID: ${updateRes.data.id}) às ${updateTime}`);
    return updateRes.data;
  } else {
    const fileMetadata = {
      name: targetFileName,
      mimeType: "application/vnd.google-apps.document",
      ...(parentFolderId ? { parents: [parentFolderId] } : {}),
    };
    const createRes = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name, parents",
    });
    console.log(`🆕 [Google Drive] '${targetFileName}' criado e sincronizado (ID: ${createRes.data.id}) às ${updateTime}`);
    return createRes.data;
  }
}

async function run() {
  console.log("=======================================================");
  console.log("🚀 MenteAfiada: Consolidando Base Micro-Particionada...");
  console.log("=======================================================");

  const startTime = Date.now();
  const allFiles = getFilesRecursively(process.cwd());

  const byRel = (predicate) =>
    allFiles.filter((f) => predicate(path.relative(process.cwd(), f).replace(/\\/g, "/")));

  const { content, processedCount, readable } = buildKnowledgeBase(allFiles);
  const outputPath = path.join(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outputPath, content, "utf-8");

  const partitions = [
    {
      fileName: "base_01_app_ui.md",
      title: "MenteAfiada — Parte 1: Home, Arena e Perfil",
      files: byRel(
        (rel) =>
          rel === "src/app/ClientPageContent.js" ||
          rel.startsWith("src/app/arena/") ||
          rel.startsWith("src/app/completar-perfil/")
      ),
    },
    {
      fileName: "base_02_apis_lib.md",
      title: "MenteAfiada — Parte 2: APIs Admin, Analytics, Chat e Proxy",
      files: byRel(
        (rel) =>
          rel.startsWith("src/app/api/admin/") ||
          rel.startsWith("src/app/api/analytics/") ||
          rel.startsWith("src/app/api/chat/") ||
          rel.startsWith("src/app/api/clerk-proxy/")
      ),
    },
    {
      fileName: "base_03_infra_sql.md",
      title: "MenteAfiada — Parte 3: Infraestrutura, Scripts e Vercel",
      files: byRel((rel) => !rel.startsWith("src/")),
    },
    {
      fileName: "base_04_dashboards_jogo.md",
      title: "MenteAfiada — Parte 4: Dashboards Gerais, Layout e CSS",
      files: byRel(
        (rel) =>
          rel.startsWith("src/app/dashboard/achievements/") ||
          rel.startsWith("src/app/dashboard/configuracoes/") ||
          rel.startsWith("src/app/dashboard/manager/") ||
          rel.startsWith("src/app/dashboard/participant/") ||
          rel === "src/app/dashboard/page.js" ||
          rel === "src/app/globals.css" ||
          rel === "src/app/layout.js" ||
          rel === "src/app/page.js"
      ),
    },
    {
      fileName: "base_05_apis_core.md",
      title: "MenteAfiada — Parte 5: APIs Core (Cron, Game, IA, Quizzes, User, Webhooks)",
      files: byRel(
        (rel) =>
          rel.startsWith("src/app/api/") &&
          !rel.startsWith("src/app/api/admin/") &&
          !rel.startsWith("src/app/api/analytics/") &&
          !rel.startsWith("src/app/api/chat/") &&
          !rel.startsWith("src/app/api/clerk-proxy/")
      ),
    },
    {
      fileName: "base_06_libs_contexts.md",
      title: "MenteAfiada — Parte 6: Libs, Contextos, Categorias, Dicionários e Middleware",
      files: byRel(
        (rel) =>
          rel.startsWith("src/lib/") ||
          rel.startsWith("src/contexts/") ||
          rel.startsWith("src/constants/") ||
          rel.startsWith("src/locales/") ||
          rel === "src/middleware.js"
      ),
    },
    {
      fileName: "base_07_ui_components.md",
      title: "MenteAfiada — Parte 7: Componentes UI (UserMenu, Modais, Players, Header)",
      files: byRel((rel) => rel.startsWith("src/app/components/")),
    },
    {
      fileName: "base_08_courses_creator.md",
      title: "MenteAfiada — Parte 8: Cursos, Sala de Aula, Criador e Owner",
      files: byRel(
        (rel) =>
          rel.startsWith("src/app/dashboard/courses/") ||
          rel.startsWith("src/app/dashboard/creator/") ||
          rel.startsWith("src/app/dashboard/owner/")
      ),
    },
    {
      fileName: "base_09_quizzes_game_planos.md",
      title: "MenteAfiada — Parte 9: Gerenciar Quizzes, Jogo Ao Vivo, Planos e Auth",
      files: byRel(
        (rel) =>
          rel.startsWith("src/app/dashboard/quizzes/") ||
          rel.startsWith("src/app/game/") ||
          rel.startsWith("src/app/planos/") ||
          rel.startsWith("src/app/sign-in/") ||
          rel.startsWith("src/app/sign-up/")
      ),
    },
  ];

  partitions.forEach((p) => {
    const pPath = path.join(process.cwd(), p.fileName);
    const built = buildKnowledgeBase(p.files, p.title);
    fs.writeFileSync(pPath, built.content, "utf-8");
    const kb = (fs.statSync(pPath).size / 1024).toFixed(1);
    console.log(`   📄 ${p.fileName}: ${p.files.length} arquivos (${kb} KB)`);
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n✅ Arquivo índice '${OUTPUT_FILE}' gerado (${fileSizeKB} KB, ${processedCount} arquivos) em ${elapsed}s.`);

  const credentialsPath = resolveCredentialsPath();
  if (!credentialsPath) {
    console.warn("\n⚠️ [Google Drive] Arquivo de credenciais não localizado.");
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["[https://www.googleapis.com/auth/drive](https://www.googleapis.com/auth/drive)"],
    });
    const drive = google.drive({ version: "v3", auth });

    const mainDoc = await upsertDriveDocument(drive, OUTPUT_FILE, outputPath, readable);
    const parentFolderId = mainDoc?.parents?.[0] || null;

    for (const p of partitions) {
      const pPath = path.join(process.cwd(), p.fileName);
      await upsertDriveDocument(drive, p.fileName, pPath, readable, parentFolderId);
    }
  } catch (error) {
    console.error(`\n❌ [Google Drive] Falha durante a transmissão:`, error.message);
  }

  console.log("=======================================================\n");
}

run();
