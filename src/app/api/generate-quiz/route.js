import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fallback inteligente caso a cota do Gemini expire
function generateMockQuiz(topic, category, count, difficulty) {
  const total = Math.min(Math.max(Number(count) || 5, 1), 10);
  const questions = [];

  for (let i = 1; i <= total; i++) {
    questions.push({
      question: `[${category} - ${topic}] Questão ${i} (${difficulty}): Qual é o conceito fundamental relacionado a este ponto?`,
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
    category: category || "Conhecimentos Gerais",
    questions,
  };
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const {
      topic,
      category = "Conhecimentos Gerais",
      count = 5,
      difficulty = "médio",
      language = "pt",
    } = await req.json();

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "O tema do quiz é obrigatório." },
        { status: 400 }
      );
    }

    const totalQuestions = Math.min(Math.max(Number(count) || 5, 1), 10);
    const resolvedCategory = category.trim() || "Conhecimentos Gerais";

    // Se não houver chave configurada, entrega o mock imediatamente
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não configurada. Usando fallback de desenvolvimento.");
      return NextResponse.json(
        generateMockQuiz(topic, resolvedCategory, totalQuestions, difficulty)
      );
    }

    const prompt = `
Atue como um professor e examinador de alto nível e elabore um quiz educativo.
Categoria Principal: "${resolvedCategory}"
Tema Específico: "${topic.trim()}"
Quantidade de questões: ${totalQuestions}
Nível de dificuldade: ${difficulty}
Idioma: ${language}

Diretrizes pedagógicas da Categoria:
- Se a categoria for "Concurso Público" ou "Direito": formule enunciados no estilo de bancas examinadoras (estudos de caso ou aplicação da lei/doutrina).
- Se a categoria for "Português": foque em gramática, interpretação ou concordância de acordo com o tema.
- Se for "História", "Tecnologia" ou "Conhecimentos Gerais": garanta precisão factual e alternativas plausíveis.

Regras estritas:
1. Gere exatamente ${totalQuestions} perguntas.
2. Cada pergunta deve conter exatamente 4 alternativas.
3. Apenas UMA alternativa deve ter "is_correct": true.
4. O campo "time_seconds" deve ser um número inteiro (20 ou 30).
5. Inclua o campo "category" no objeto retornado com o valor exato "${resolvedCategory}".
6. Responda ESTRITAMENTE em formato JSON com esta estrutura:
{
  "title": "Título conciso do Quiz",
  "category": "${resolvedCategory}",
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
        model: "gemini-2.5-flash",
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

        // Garante que o retorno sempre preserva a categoria escolhida
        if (!quizData.category) {
          quizData.category = resolvedCategory;
        }

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
        return NextResponse.json(
          generateMockQuiz(topic, resolvedCategory, totalQuestions, difficulty)
        );
      }

      console.error("Erro na API do Gemini:", apiError);
      return NextResponse.json(
        generateMockQuiz(topic, resolvedCategory, totalQuestions, difficulty)
      );
    }

    return NextResponse.json(
      generateMockQuiz(topic, resolvedCategory, totalQuestions, difficulty)
    );
  } catch (error) {
    console.error("Erro geral na rota /api/generate-quiz:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a geração do quiz." },
      { status: 500 }
    );
  }
}