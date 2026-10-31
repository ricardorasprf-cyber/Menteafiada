/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/cron/arena-engine/route.js
 * Objetivo: Motor de controle da Arena que verifica o tempo de início,
 *           avança perguntas a cada 60 segundos, encerra a partida no pódio
 *           e grava o histórico permanente de participantes para premiações.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas no servidor." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const agora = new Date();

    // 1. Busca salas da Arena ativas ('waiting' ou 'in_progress')
    const { data: salasArena, error: salasError } = await supabaseAdmin
      .from("game_rooms")
      .select(`
        id,
        pin,
        status,
        current_question_index,
        question_started_at,
        created_at,
        quiz_id,
        quizzes (
          id,
          title,
          questions (id)
        )
      `)
      .eq("is_arena", true)
      .in("status", ["waiting", "in_progress"]);

    if (salasError || !salasArena || salasArena.length === 0) {
      return NextResponse.json({ message: "Nenhuma batalha ativa na Arena no momento." });
    }

    const atualizacoes = [];

    for (const sala of salasArena) {
      const totalPerguntas = sala.quizzes?.questions?.length || 0;
      const indexAtual = sala.current_question_index || 0;

      // Se a sala estiver aguardando, inicia após 60 segundos de concentração
      if (sala.status === "waiting") {
        const tempoCriacao = new Date(sala.created_at).getTime();
        const decorridoEspera = (agora.getTime() - tempoCriacao) / 1000;

        if (decorridoEspera >= 60) {
          await supabaseAdmin
            .from("game_rooms")
            .update({
              status: "in_progress",
              current_question_index: 0,
              question_started_at: agora.toISOString(),
            })
            .eq("id", sala.id);

          atualizacoes.push({ pin: sala.pin, acao: "Batalha iniciada automaticamente" });
        }
      }

      // Se a sala estiver em andamento, verifica se já passaram 60 segundos
      else if (sala.status === "in_progress") {
        const inicioPergunta = sala.question_started_at
          ? new Date(sala.question_started_at).getTime()
          : agora.getTime();

        const segundosPassados = (agora.getTime() - inicioPergunta) / 1000;

        if (segundosPassados >= 60) {
          const proximoIndex = indexAtual + 1;

          if (proximoIndex < totalPerguntas) {
            // Avança para a próxima pergunta
            await supabaseAdmin
              .from("game_rooms")
              .update({
                current_question_index: proximoIndex,
                question_started_at: agora.toISOString(),
              })
              .eq("id", sala.id);

            atualizacoes.push({
              pin: sala.pin,
              acao: `Avançou para questão #${proximoIndex + 1}`,
            });
          } else {
            // Concluiu todas as perguntas -> Finaliza a sala
            await supabaseAdmin
              .from("game_rooms")
              .update({
                status: "finished",
              })
              .eq("id", sala.id);

            // 2. Gravação de Auditoria e Registro Fiel dos Participantes
            const { data: jogadores } = await supabaseAdmin
              .from("game_players")
              .select("id, player_name, score, clerk_id")
              .eq("room_id", sala.id)
              .order("score", { ascending: false });

            if (jogadores && jogadores.length > 0) {
              const registrosHistorico = jogadores.map((jogador, idx) => ({
                room_id: sala.id,
                pin: sala.pin,
                quiz_id: sala.quiz_id,
                quiz_title: sala.quizzes?.title || "Batalha Arena",
                clerk_id: jogador.clerk_id || null,
                player_name: jogador.player_name,
                score: jogador.score || 0,
                final_rank: idx + 1,
                is_podium: idx < 3,
                eligible_for_reward: true,
                reward_claimed: false,
                participated_at: agora.toISOString(),
              }));

              await supabaseAdmin
                .from("arena_participants_history")
                .insert(registrosHistorico);
            }

            atualizacoes.push({
              pin: sala.pin,
              acao: "Batalha finalizada -> Histórico permanente registrado",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      salasProcessadas: salasArena.length,
      atualizacoes,
    });
  } catch (err) {
    console.error("[Arena Engine] Erro na execução:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}