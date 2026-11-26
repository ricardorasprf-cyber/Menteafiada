/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/generate-quiz/route.js
 * Objetivo: Geração pedagógica automatizada de questionários via Gemini API
 * com suporte aos 4 formatos interativos da plataforma e conformidade estrita
 * de cotas por plano (`PLAN_LIMITS`):
 *   1. multiple_choice (Múltipla Escolha com 4 alternativas);
 *   2. fill_blanks (Completar Lacunas "___" com banco de palavras sugeridas);
 *   3. sequence_order (Ordenação Sequencial / Procedimental);
 *   4. true_false (Verdadeiro ou Falso Relâmpago).
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { resolveUserPlan } from "@/lib/planLimits";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 1. Verificação de autenticação e nível de plano via Clerk
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Autenticação obrigatória para gerar questões com IA." },
        { status: 401 }
      );
    }

    const userRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role ||
      "participant";
    const planTier =
      sessionClaims?.metadata?.plan_tier ||
      sessionClaims?.publicMetadata?.plan_tier ||
      "free";

    let plan = resolveUserPlan(userRole, planTier);
    if (process.env.VERCEL_ENV === "production" &&
        process.env.MERCADO_PAGO_PIX_ENABLED === "1" &&
        ["free", "student_pro"].includes(plan.key)) {
      const { getPixAccess } = await import("@/lib/pixCheckout");
      if (await getPixAccess(userId)) plan = resolveUserPlan(userRole, "creator_pro");
    }

    // 2. Bloqueio do perfil Explorador (Grátis) no Gerador IA
    if (!plan.canUseAiGenerator) {
      return NextResponse.json(
        {
          error:
            "O Gerador de Quizzes com IA é exclusivo para assinantes Aluno Pro, Professor Pro ou Institucional.",
          code: "PLAN_UPGRADE_REQUIRED",
          currentPlan: plan.key,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      topic = "",
      difficulty = "médio",
      amount,
      questionCount,
      count: legacyCount,
      category = "Conhecimentos Gerais",
      language = "pt-BR",
      mixedFormats = true,
    } = body;

    if (!String(topic).trim()) {
      return NextResponse.json(
        { error: "Informe um tema ou conteúdo base para gerar as questões." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3. Limita o número de questões geradas ao teto permitido pelo plano atual
    const rawTotal = amount ?? questionCount ?? legacyCount ?? 5;
    const requestedCount = Number(rawTotal);
    if (
      !["number", "string"].includes(typeof rawTotal) ||
      !Number.isSafeInteger(requestedCount) ||
      requestedCount < 1
    ) {
      return NextResponse.json(
        { error: "Informe uma quantidade inteira e positiva de questões." },
        { status: 400 }
      );
    }
    const count = Math.min(requestedCount, plan.maxAiQuestionsPerRequest);

    const prompt = `
Você é um especialista em avaliação educacional da plataforma MenteAfiada.
Gere um questionário pedagógico no idioma "${language}" sobre o tema: "${topic}".
Categoria sugerida: "${category}".
Nível de dificuldade: "${difficulty}".
Quantidade exata de questões: ${count}.

${
  mixedFormats
    ? `Varie os formatos entre os 4 tipos suportados pela plataforma:
1) "multiple_choice": pergunta tradicional com 4 alternativas ("options": [{"text": "...", "is_correct": true/false}, ...], exatamente 1 correta).
2) "fill_blanks": frase contendo 1 ou 2 lacunas marcadas obrigatoriamente por "___" (três underlines), com "correctSequence" (array exato das palavras que preenchem cada "___" na ordem) e "distractors" (array de 2 palavras extras plausíveis).
3) "sequence_order": comando solicitando ordenar etapas/passos, com "correctOrder" (array de 3 ou 4 etapas na ordem cronológica/lógica exata).
4) "true_false": afirmação objetiva, com "isTrue" (boolean true ou false).`
    : `Todas as questões devem ser do tipo "multiple_choice" com 4 alternativas.`
}

Responda ESTRITAMENTE com um objeto JSON válido (sem blocos markdown \`\`\`json) seguindo exatamente esta estrutura:
{
  "title": "Título sugerido para o quiz",
  "category": "${category}",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Enunciado da questão?",
      "time_seconds": 20,
      "options": [
        { "text": "Alternativa A", "is_correct": false },
        { "text": "Alternativa B", "is_correct": true },
        { "text": "Alternativa C", "is_correct": false },
        { "text": "Alternativa D", "is_correct": false }
      ]
    },
    {
      "type": "fill_blanks",
      "question": "Frase com ___ para completar o ___ corretamente.",
      "time_seconds": 25,
      "correctSequence": ["palavra1", "palavra2"],
      "distractors": ["distrator1", "distrator2"]
    },
    {
      "type": "sequence_order",
      "question": "Ordene as etapas do procedimento:",
      "time_seconds": 30,
      "correctOrder": ["Passo 1", "Passo 2", "Passo 3"]
    },
    {
      "type": "true_false",
      "question": "Afirmação objetiva para julgar como verdadeira ou falsa.",
      "time_seconds": 15,
      "isTrue": true
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const rawOutput = response.text || "{}";
    const cleanedJson = rawOutput
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json({
      success: true,
      planApplied: plan.key,
      maxQuestionsAllowed: plan.maxAiQuestionsPerRequest,
      title: parsed.title || `Quiz: ${topic}`,
      category: parsed.category || category,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, count)
        : [],
    });
  } catch (err) {
    console.error("[Generate Quiz API Error]:", err);
    return NextResponse.json(
      { error: "Falha ao gerar questões com IA: " + err.message },
      { status: 500 }
    );
  }
}
