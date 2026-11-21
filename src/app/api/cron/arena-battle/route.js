/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/cron/arena-battle/route.js
 * Objetivo: Rotina agendada (e sob demanda na janela de 5 min antes) para
 * sortear um quiz oficial e abrir a sala da Arena com 5 minutos de
 * antecedência às rodadas oficiais (14h, 16h, 18h e 20h - Brasília).
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function gerarPinSala() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const isPreOpenTrigger = searchParams.get("preopen") === "1";

    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Permite chamada autenticada pelo Cron OU gatilho automático da janela de 5 min
    if (cronSecret && !isPreOpenTrigger && authHeader !== `Bearer ${cronSecret}`) {
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

    // 1. Verifica se já existe uma sala da Arena aberta ('waiting' ou 'in_progress')
    // Evita duplicidade caso o aluno abra a página durante os 5 minutos anteriores
    const { data: salasExistentes } = await supabaseAdmin
      .from("game_rooms")
      .select("id, pin, quiz_id, title, status, created_at")
      .eq("is_arena", true)
      .in("status", ["waiting", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (salasExistentes && salasExistentes.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyOpen: true,
        message: "Sala oficial da Arena já está aberta para entrada.",
        room: salasExistentes[0],
        pin: salasExistentes[0].pin,
        arenaUrl: `/arena/${salasExistentes[0].pin}`,
      });
    }

    // 2. Busca questionários cadastrados como oficiais
    let { data: officialQuizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, category")
      .eq("is_official", true);

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

    // 3. Sorteia aleatoriamente um quiz e gera PIN exclusivo
    const sorteado =
      officialQuizzes[Math.floor(Math.random() * officialQuizzes.length)];
    const pinGerado = gerarPinSala();

    // 4. Cria a sala em status 'waiting' (janela de 5 minutos antes do início)
    const { data: novaSala, error: salaError } = await supabaseAdmin
      .from("game_rooms")
      .insert({
        pin: pinGerado,
        quiz_id: sorteado.id,
        status: "waiting",
        is_arena: true,
        title: `Batalha Oficial: ${sorteado.title}`,
        host_name: "Sistema Educacional (Arena Automática)",
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("id, pin, quiz_id, title, status, created_at")
      .single();

    if (salaError) {
      console.error("[Arena Cron] Falha ao instanciar sala:", salaError.message);
      return NextResponse.json({ error: salaError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Sala da Arena aberta com 5 minutos de antecedência.",
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