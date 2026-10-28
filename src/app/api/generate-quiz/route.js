import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fallback inteligente para quando a cota gratuita da Google expirar (erro 429)
function generateMockQuiz(topic, count, difficulty) {
  const total = Math.min(Math.max(Number(count) || 5, 1), 10);
  const questions = [];

  for (let i = 1; i <= total; i++) {
    questions.push({
      question: `[${topic}] Questão ${i} (${difficulty}): Qual é o conceito fundamental relacionado a este ponto?`,
      time_seconds: 20,
      options: [
        { text: `Definição preliminar ou contexto inicial ${i}`, is_correct: false },
        { text: `Resposta correta e estruturada sobre ${topic} (item ${i})`, is_correct: true },
        { text: `Alternativa incorreta ou distrator comum ${i}`, is_correct: false },
        { text: `Outra opção plausível mas incorreta ${i}`, is_correct: false },
      ],
    });
  }

  return {
    title: `Quiz: ${topic.trim()}`,
    questions,
  };
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { topic, count = 5, difficulty = "médio", language = "pt" } = await req.json();

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "O tema do quiz é obrigatório." },
        { status: 400 }
      );
    }

    const totalQuestions = Math.min(Math.max(Number(count) || 5, 1), 10);

    // Se não houver chave configurada, entrega o mock imediatamente
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não configurada. Usando fallback de desenvolvimento.");
      return NextResponse.json(generateMockQuiz(topic, totalQuestions, difficulty));
    }

    const prompt = `
Atue como um professor especialista e elabore um quiz educativo.
Tema: "${topic.trim()}"
Quantidade de questões: ${totalQuestions}
Nível de dificuldade: ${difficulty}
Idioma: ${language}

Regras estritas:
1. Gere exatamente ${totalQuestions} perguntas.
2. Cada pergunta deve conter exatamente 4 alternativas.
3. Apenas UMA alternativa deve ter "is_correct": true.
4. O campo "time_seconds" deve ser um número inteiro (20 ou 30).
5. Responda ESTRITAMENTE em formato JSON com esta estrutura:
{
  "title": "Título conciso do Quiz",
  "questions": [
    {
      "question": "Texto da questão?",
      "time_seconds": 20,
      "options": [
        { "text": "Opção A", "is_correct": false },
        { "text": "Opção B", "is_correct": true },
        { "text": "Opção C", "is_correct": false },
        { "text": "Opção D", "is_correct": false }
      ]
    }
  ]
}
    `;

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
        },
      });

      const rawText = response?.text || "";

      if (rawText) {
        const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const quizData = JSON.parse(cleanedText);
        return NextResponse.json(quizData);
      }
    } catch (apiError) {
      const errMsg = apiError?.message || "";
      const isQuotaExceeded =
        errMsg.includes("429") ||
        errMsg.includes("Quota exceeded") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        apiError?.status === 429;

      if (isQuotaExceeded) {
        console.warn(
          "[Quota Diária Excedida no Gemini] Ativando gerador simulado para não interromper a aplicação."
        );
        return NextResponse.json(generateMockQuiz(topic, totalQuestions, difficulty));
      }

      console.error("Erro na API do Gemini:", apiError);
      // Se for outro erro temporário (ex: 503), também usa o gerador local de contingência
      return NextResponse.json(generateMockQuiz(topic, totalQuestions, difficulty));
    }

    return NextResponse.json(generateMockQuiz(topic, totalQuestions, difficulty));
  } catch (error) {
    console.error("Erro geral na rota /api/generate-quiz:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a geração do quiz." },
      { status: 500 }
    );
  }
}