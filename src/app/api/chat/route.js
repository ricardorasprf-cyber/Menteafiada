import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

// Respostas instantâneas para navegação e dúvidas comuns da plataforma
const KNOWLEDGE_BASE = {
  pt: {
    jogar: "🎮 **Como jogar um Quiz:**\n\n1. O professor cria e abre uma sala de jogo e partilha o **PIN** de 6 dígitos.\n2. No ecrã inicial (ou em `/game/play`), digite o PIN e o seu nome/apelido.\n3. Aguarde o professor iniciar a partida para responder às perguntas no seu ecrã!",
    criar: "🏫 **Como criar e aplicar uma sala:**\n\n1. Vá ao menu **'Gerenciar Quizzes'** (`/dashboard/quizzes`) para criar as suas perguntas e alternativas.\n2. Depois, aceda a **'Criar Sala de Jogo'** (`/game/host`), escolha o quiz e clique em **Criar Nova Sala**.\n3. Partilhe o PIN ou o QR Code gerado com os alunos!",
    cursos: "📚 **Aceder aos seus cursos:**\n\nBasta aceder a **'Meus Cursos'** (`/dashboard/participant`) no menu superior para ver os módulos matriculados e acompanhar a sua barra de progresso.",
    perfil: "👤 **Completar Perfil:**\n\nNovos utilizadores devem aceder a `/completar-perfil` para registar a data de nascimento e desbloquear todas as funcionalidades.",
    padrao: "Olá! Sou o Afiadinho. Posso ajudar-te a entrar num quiz com PIN, gerir perguntas no painel do professor ou acompanhar os teus cursos matriculados. O que gostarias de saber?"
  },
  en: {
    jogar: "🎮 **How to play a Quiz:**\n\n1. Get the 6-digit **PIN** code from your teacher.\n2. On the home page (or `/game/play`), enter the PIN and your nickname.\n3. Wait for the host to start the game to submit your answers!",
    criar: "🏫 **How to host a game:**\n\n1. Go to **'Manage Quizzes'** (`/dashboard/quizzes`) to prepare questions.\n2. Go to **'Create Game Room'** (`/game/host`), pick your quiz and create the room.\n3. Share the PIN or QR Code with your participants!",
    cursos: "📚 **Accessing your courses:**\n\nGo to **'My Courses'** (`/dashboard/participant`) to see your enrolled modules and track your progress.",
    perfil: "👤 **Profile Completion:**\n\nVisit `/completar-perfil` to set your birth date and unlock platform features.",
    padrao: "Hi! I'm Afiadinho. I can help you join a quiz with a PIN, create questions in the teacher dashboard, or access your courses. How can I help?"
  },
  es: {
    jogar: "🎮 **Cómo jugar un Quiz:**\n\n1. Pídele al profesor el código **PIN** de 6 dígitos.\n2. En la página principal (o `/game/play`), introduce el PIN y tu apodo.\n3. ¡Espera a que el profesor inicie la partida para responder!",
    criar: "🏫 **Cómo crear una sala:**\n\n1. Ve a **'Gestionar Quizzes'** (`/dashboard/quizzes`) para crear preguntas.\n2. Entra en **'Crear Sala de Juego'** (`/game/host`), elige el quiz y genera la sala.\n3. Comparte el PIN o QR Code con los estudiantes.",
    cursos: "📚 **Ver tus cursos:**\n\nEntra en **'Mis Cursos'** (`/dashboard/participant`) para seguir tu progreso de aprendizaje.",
    perfil: "👤 **Completar Perfil:**\n\nVisita `/completar-perfil` para registrar tu fecha de nacimiento.",
    padrao: "¡Hola! Soy Afiadinho. Puedo ayudarte a unirte a un quiz, gestionar preguntas o revisar tus cursos. ¿Qué necesitas saber?"
  }
};

// Deteta intenções frequentes para resposta imediata
function matchLocalIntent(text, lang) {
  const t = (text || "").toLowerCase();
  const dict = KNOWLEDGE_BASE[lang] || KNOWLEDGE_BASE.pt;

  if (t.includes("jogar") || t.includes("pin") || t.includes("play") || t.includes("entrar")) return dict.jogar;
  if (t.includes("criar") || t.includes("sala") || t.includes("host") || t.includes("professor")) return dict.criar;
  if (t.includes("curso") || t.includes("course") || t.includes("progresso") || t.includes("aula")) return dict.cursos;
  if (t.includes("perfil") || t.includes("nascimento") || t.includes("idade")) return dict.perfil;
  if (t === "olá" || t === "ola" || t === "hello" || t === "hi" || t === "hola") return dict.padrao;

  return null;
}

export async function POST(req) {
  try {
    const { messages, language = "pt" } = await req.json();

    const lastUserMsg = messages?.filter((m) => m.role === "user").pop();
    const query = lastUserMsg?.content || "";

    // 1. Resposta local instantânea (elimina 100% dos congelamentos para perguntas frequentes)
    const localAnswer = matchLocalIntent(query, language);
    if (localAnswer) {
      return new Response(localAnswer, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 2. Se for uma pergunta livre, consulta o Gemini com timeout de segurança
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = KNOWLEDGE_BASE[language]?.padrao || KNOWLEDGE_BASE.pt.padrao;
      return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Você é o Afiadinho, assistente virtual da plataforma educacional MenteAfiada.
Ajude alunos e professores de forma prática, concisa e amigável.
Idioma obrigatório de resposta: ${language}.
    `;

    // Timeout de 5 segundos para a IA: se a Google estiver congestionada, responde de imediato
    const fetchWithTimeout = Promise.race([
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: query,
        config: { systemInstruction, temperature: 0.7 },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 5000))
    ]);

    const response = await fetchWithTimeout;
    const reply = response?.text || (KNOWLEDGE_BASE[language]?.padrao || KNOWLEDGE_BASE.pt.padrao);

    return new Response(reply, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (err) {
    console.warn("IA indisponível ou timeout atingido. Ativando resposta de contingência.");
    const fallback = KNOWLEDGE_BASE.pt.padrao;
    return new Response(fallback, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}