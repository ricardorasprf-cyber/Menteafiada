/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/cron/arena-battle/route.js
 * Objetivo: Rotina agendada para sortear um quiz oficial e criar automaticamente
 *           uma sala de batalha na Arena às 14h, 16h, 18h e 20h.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Gera um PIN numérico aleatório de 6 dígitos para os alunos entrarem na sala
function gerarPinSala() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

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

    // 1. Busca todos os questionários cadastrados como oficiais
    let { data: officialQuizzes, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, category")
      .eq("is_official", true);

    // Fallback: se nenhum quiz estiver marcado como oficial, seleciona o primeiro disponível
    if (!officialQuizzes || officialQuizzes.length === 0) {
      const { data: allQuizzes } = await supabaseAdmin
        .from("quizzes")
        .select("id, title, category")
        .limit(5);

      officialQuizzes = allQuizzes || [];
    }

    if (officialQuizzes.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Nenhum quiz cadastrado para iniciar a batalha da Arena.",
      });
    }

    // 2. Realiza o sorteio aleatório de um quiz
    const sorteado = officialQuizzes[Math.floor(Math.random() * officialQuizzes.length)];

    // 3. Gera o PIN numérico exclusivo de 6 dígitos
    const pinGerado = gerarPinSala();

    // 4. Cria o registro da sala de jogo oficial da Arena
    const { data: novaSala, error: salaError } = await supabaseAdmin
      .from("game_rooms")
      .insert({
        pin: pinGerado,
        quiz_id: sorteado.id,
        status: "waiting", // Aberta aguardando participantes
        is_arena: true,
        title: `Batalha Oficial: ${sorteado.title}`,
        host_name: "Sistema Educacional (Arena Automática)",
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("id, pin, quiz_id, title, status")
      .single();

    if (salaError) {
      console.error("[Arena Cron] Falha ao instanciar sala:", salaError.message);
      return NextResponse.json({ error: salaError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Batalha da Arena criada com sucesso.",
      room: novaSala,
      pin: novaSala.pin,
      arenaUrl: `/arena/${novaSala.pin}`,
      scheduledTime: new Date().toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
    });
  } catch (err) {
    console.error("[Arena Cron] Erro geral na execução:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}