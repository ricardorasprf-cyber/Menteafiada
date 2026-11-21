/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/generate-quiz/route.js
 * Objetivo: Geração pedagógica automatizada de questionários via Gemini API
 * com suporte aos 4 formatos interativos da plataforma:
 * 1. multiple_choice (Múltipla Escolha com 4 alternativas);
 * 2. fill_blanks (Completar Lacunas "___" com banco de palavras sugeridas);
 * 3. sequence_order (Ordenação Sequencial / Procedimental);
 * 4. true_false (Verdadeiro ou Falso Relâmpago).
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      topic = "",
      difficulty = "médio",
      amount,
      questionCount,
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
    const rawTotal = amount ?? questionCount ?? 5;
    const count = Math.min(Math.max(Number(rawTotal) || 5, 1), 15);

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
      title: parsed.title || `Quiz: ${topic}`,
      category: parsed.category || category,
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    });
  } catch (err) {
    console.error("[Generate Quiz API Error]:", err);
    return NextResponse.json(
      { error: "Falha ao gerar questões com IA: " + err.message },
      { status: 500 }
    );
  }
}