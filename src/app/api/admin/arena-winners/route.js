/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/admin/arena-winners/route.js
 * Objetivo: Consulta do histórico de auditagem das Batalhas da Arena,
 *           fornecendo a lista fiel de participantes e colocados no pódio.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    const requesterRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role;

    if (!userId || (requesterRole !== "owner" && requesterRole !== "admin")) {
      return NextResponse.json({ error: "Acesso restrito ao proprietário." }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Consulta os registros ordenados pelas batalhas mais recentes
    const { data: historico, error } = await supabaseAdmin
      .from("arena_participants_history")
      .select("*")
      .order("participated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      totalRegistros: historico ? historico.length : 0,
      vencedoresPodio: (historico || []).filter((h) => h.is_podium),
      todosParticipantes: historico || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}