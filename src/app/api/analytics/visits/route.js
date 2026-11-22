/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/analytics/visits/route.js
 * Objetivo: Endpoint responsável por:
 * - POST: Registrar cada acesso ao site (total geral + contador individual
 *   por login Clerk quando o usuário estiver autenticado);
 * - GET: Fornecer o resumo consolidado (total de acessos, acessos logados,
 *   acessos anônimos e lista de visitas por usuário) para auditoria.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

// POST: Registra uma nova visita (autenticada ou anônima)
export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const pagePath = String(body?.pagePath || "/").slice(0, 255);

    // Verifica no servidor se há sessão ativa do Clerk
    const { userId } = await auth();
    let userName = null;
    let userEmail = null;

    if (userId) {
      try {
        const user = await currentUser();
        if (user) {
          userName =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            "Usuário";
          userEmail =
            user.primaryEmailAddress?.emailAddress ||
            user.emailAddresses?.[0]?.emailAddress ||
            null;
        }
      } catch {
        // Segue com userId mesmo se currentUser oscilar
      }
    }

    // Executa a função atômica RPC no Supabase
    const { error: rpcError } = await supabaseAdmin.rpc("register_site_visit", {
      p_clerk_id: userId || null,
      p_user_name: userName,
      p_user_email: userEmail,
      p_page_path: pagePath,
    });

    if (rpcError) {
      console.error("[Visits API POST] Erro ao registrar visita:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      authenticated: Boolean(userId),
    });
  } catch (err) {
    console.error("[Visits API POST] Exceção:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Consulta os totais globais e a quantidade de visitas por login
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
    }

    // 1. Busca métricas globais
    const { data: globalMetrics } = await supabaseAdmin
      .from("site_global_metrics")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    // 2. Busca visitas individuais por usuário autenticado (ordenado pelos mais ativos)
    const { data: usersVisits, error: usersErr } = await supabaseAdmin
      .from("user_visit_counts")
      .select("*")
      .order("visit_count", { ascending: false })
      .limit(200);

    if (usersErr) {
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalVisits: Number(globalMetrics?.total_visits || 0),
        authenticatedVisits: Number(globalMetrics?.authenticated_visits || 0),
        anonymousVisits: Number(globalMetrics?.anonymous_visits || 0),
        uniqueLoggedUsers: (usersVisits || []).length,
        updatedAt: globalMetrics?.updated_at || null,
      },
      users: usersVisits || [],
    });
  } catch (err) {
    console.error("[Visits API GET] Exceção:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}