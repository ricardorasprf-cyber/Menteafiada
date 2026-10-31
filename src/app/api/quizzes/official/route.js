/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/quizzes/official/route.js
 * Objetivo: Fornecer a listagem de todos os questionários pedagógicos validados
 *           como oficiais pelo proprietário (owner), garantindo total resiliência
 *           contra variações de colunas e schemas no Supabase.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Força a renderização dinâmica para sempre trazer dados em tempo real
export const dynamic = "force-dynamic";

/**
 * Manipulador GET - Consulta questionários com is_official === true
 */
export async function GET() {
  try {
    // 1. Consulta inicial resiliente selecionando colunas estruturais seguras
    // Evita selecionar 'difficulty' ou joins que possam quebrar a execução se ausentes no banco
    const { data: quizzes, error } = await supabase
      .from("quizzes")
      .select("id, title, is_official, created_at")
      .eq("is_official", true)
      .order("created_at", { ascending: false });

    // 2. Se houver erro na consulta do Supabase, retorna resposta amigável estruturada
    if (error) {
      console.error("[Official Quizzes API] Falha na consulta:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 3. Busca a contagem de perguntas de forma segura e não bloqueante por quiz
    const formattedQuizzes = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        let questionCount = 0;

        try {
          // Consulta apenas a contagem de registros na tabela questions associada ao quiz_id
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("quiz_id", quiz.id);

          questionCount = count || 0;
        } catch (e) {
          questionCount = 0;
        }

        return {
          id: quiz.id,
          title: quiz.title || "Quiz Educacional",
          category: "Conhecimentos Gerais",
          difficulty: "médio",
          totalQuestions: questionCount,
          createdAt: quiz.created_at,
          isOfficial: Boolean(quiz.is_official),
        };
      })
    );

    return NextResponse.json({
      success: true,
      total: formattedQuizzes.length,
      quizzes: formattedQuizzes,
    });
  } catch (err) {
    console.error("[Official Quizzes API] Erro inesperado no servidor:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}