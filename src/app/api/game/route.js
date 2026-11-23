/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/game/answer/route.js
 * Objetivo: Endpoint seguro e idempotente para registro de respostas nas
 * batalhas da Arena e salas ao vivo:
 * - Impede pontuação duplicada caso o participante saia, recarregue a página
 *   ou tente reenviar a mesma questão;
 * - Valida a resposta diretamente no banco de dados via RPC atômica
 *   (submit_game_answer_secure);
 * - Disponibiliza consulta GET para verificar se o jogador já respondeu à
 *   questão atual ao reentrar na sala.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET: Verifica se o jogador já respondeu à questão atual ao reentrar na sala
export async function GET(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuração do Supabase ausente." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const playerId = searchParams.get("playerId");
    const questionId = searchParams.get("questionId");

    if (!roomId || !playerId || !questionId) {
      return NextResponse.json(
        { error: "Parâmetros roomId, playerId e questionId são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: existingAnswer, error } = await supabaseAdmin
      .from("game_answers")
      .select("id, selected_option, is_correct, points_earned")
      .eq("room_id", roomId)
      .eq("player_id", playerId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyAnswered: Boolean(existingAnswer),
      answer: existingAnswer || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Registra a resposta de forma atômica e impede soma repetida de pontos
export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuração do Supabase ausente." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      roomId,
      playerId,
      questionId,
      selectedOption,
      isCorrect,
      pointsEarned,
    } = body;

    if (!roomId || !playerId || !questionId) {
      return NextResponse.json(
        { error: "Dados obrigatórios ausentes (roomId, playerId, questionId)." },
        { status: 400 }
      );
    }

    // Verifica se a sala ainda está ativa ('in_progress')
    const { data: room, error: roomErr } = await supabaseAdmin
      .from("game_rooms")
      .select("id, status")
      .eq("id", roomId)
      .maybeSingle();

    if (roomErr || !room) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    if (room.status === "finished") {
      return NextResponse.json(
        { error: "Esta partida já foi encerrada." },
        { status: 409 }
      );
    }

    // Executa validação adicional por usuário autenticado (Clerk), se disponível
    const { userId } = await auth();
    if (userId) {
      const { data: userPlayers } = await supabaseAdmin
        .from("game_players")
        .select("id")
        .eq("room_id", roomId)
        .eq("clerk_id", userId);

      const playerIdsForUser = (userPlayers || []).map((p) => p.id);

      if (playerIdsForUser.length > 0) {
        const { data: previousUserAnswer } = await supabaseAdmin
          .from("game_answers")
          .select("id")
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .in("player_id", playerIdsForUser)
          .maybeSingle();

        if (previousUserAnswer) {
          const { data: currentPlayer } = await supabaseAdmin
            .from("game_players")
            .select("score")
            .eq("id", playerId)
            .maybeSingle();

          return NextResponse.json({
            success: true,
            accepted: false,
            duplicate: true,
            score: Number(currentPlayer?.score || 0),
            message: "Esta conta já respondeu a esta questão nesta Arena.",
          });
        }
      }
    }

    // Chama a função RPC atômica no Supabase para garantir unicidade e recálculo exato
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "submit_game_answer_secure",
      {
        p_room_id: roomId,
        p_player_id: playerId,
        p_question_id: questionId,
        p_selected_option: String(selectedOption ?? ""),
        p_is_correct: Boolean(isCorrect),
        p_points_earned: Number(pointsEarned || 0),
      }
    );

    if (rpcError) {
      console.error("[Game Answer API] Erro RPC:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...rpcResult,
    });
  } catch (err) {
    console.error("[Game Answer API] Exceção interna:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}