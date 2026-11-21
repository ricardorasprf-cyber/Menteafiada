/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/cron/arena-engine/route.js
 * Objetivo: Motor de controle da Arena que respeita a janela de concentração
 * de 5 minutos (300 segundos) antes do início oficial, avança perguntas a
 * cada 60 segundos, encerra a partida no pódio e grava o histórico.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Janela de concentração antes de iniciar a 1ª pergunta: 5 minutos (300s)
const PRE_START_WINDOW_SECONDS = 300;

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
      return NextResponse.json({
        message: "Nenhuma batalha ativa na Arena no momento.",
      });
    }

    const atualizacoes = [];

    for (const sala of salasArena) {
      const totalPerguntas = sala.quizzes?.questions?.length || 0;
      const indexAtual = sala.current_question_index || 0;

      // 1. Sala aguardando na janela de concentração de 5 minutos (300 segundos)
      if (sala.status === "waiting") {
        const tempoCriacao = new Date(sala.created_at).getTime();
        const decorridoEspera = (agora.getTime() - tempoCriacao) / 1000;

        if (decorridoEspera >= PRE_START_WINDOW_SECONDS) {
          await supabaseAdmin
            .from("game_rooms")
            .update({
              status: "in_progress",
              current_question_index: 0,
              question_started_at: agora.toISOString(),
            })
            .eq("id", sala.id);

          atualizacoes.push({
            pin: sala.pin,
            acao: "Partida iniciada após 5 minutos de concentração",
          });
        }
        continue;
      }

      // 2. Sala em andamento: avança a cada 60 segundos
      if (sala.status === "in_progress") {
        const inicioQuestao = sala.question_started_at
          ? new Date(sala.question_started_at).getTime()
          : agora.getTime();
        const decorridoQuestao = (agora.getTime() - inicioQuestao) / 1000;

        if (decorridoQuestao >= 60) {
          const proximoIndice = indexAtual + 1;

          if (proximoIndice < totalPerguntas) {
            await supabaseAdmin
              .from("game_rooms")
              .update({
                current_question_index: proximoIndice,
                question_started_at: agora.toISOString(),
              })
              .eq("id", sala.id);

            atualizacoes.push({
              pin: sala.pin,
              acao: `Avançou para questão ${proximoIndice + 1}/${totalPerguntas}`,
            });
          } else {
            // Encerra a partida e grava o pódio histórico
            await supabaseAdmin
              .from("game_rooms")
              .update({
                status: "finished",
                finished_at: agora.toISOString(),
              })
              .eq("id", sala.id);

            const { data: participantes } = await supabaseAdmin
              .from("game_room_players")
              .select("*")
              .eq("room_id", sala.id)
              .order("score", { ascending: false });

            if (participantes && participantes.length > 0) {
              const registrosHistorico = participantes.map((p, idx) => ({
                room_id: sala.id,
                pin: sala.pin,
                quiz_title: sala.quizzes?.title || "Batalha Oficial",
                player_name: p.player_name,
                clerk_id: p.clerk_id || null,
                score: p.score || 0,
                rank_position: idx + 1,
                is_podium: idx < 3,
                participated_at: agora.toISOString(),
              }));

              await supabaseAdmin
                .from("arena_participants_history")
                .insert(registrosHistorico);
            }

            atualizacoes.push({
              pin: sala.pin,
              acao: "Partida encerrada e pódio registrado",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processadas: salasArena.length,
      atualizacoes,
    });
  } catch (err) {
    console.error("[Arena Engine] Erro na execução:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}