/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/admin/toggle-official/route.js
 * Objetivo: Permitir exclusivamente ao utilizador com papel 'owner' (proprietário)
 *           validar ou revogar o status de quiz oficial da plataforma.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();

    // Extrai a role do utilizador garantindo suporte aos metadados do Clerk
    const requesterRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role;

    // Trava de segurança: apenas a credencial de proprietário ('owner') pode validar quizzes
    if (!userId || requesterRole !== "owner") {
      return NextResponse.json(
        { error: "Acesso restrito. Apenas o proprietário (owner) pode validar quizzes oficiais." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { quizId, isOfficial } = body;

    if (!quizId || typeof isOfficial !== "boolean") {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes ou inválidos (quizId, isOfficial)." },
        { status: 400 }
      );
    }

    // Inicializa o cliente administrativo do Supabase com privilégios de service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Configuração do Supabase ausente no servidor." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Atualiza o estado de validação oficial do quiz no Supabase
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .update({ is_official: isOfficial })
      .eq("id", quizId)
      .select("id, title, is_official")
      .single();

    if (error) {
      console.error("[Admin Quizzes API] Erro ao atualizar status oficial:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Quiz "${data.title}" ${isOfficial ? "validado como Oficial" : "removido da lista oficial"}.`,
      quiz: data,
    });
  } catch (err) {
    console.error("[Admin Quizzes API] Exceção interna:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}