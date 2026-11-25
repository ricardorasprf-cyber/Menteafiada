/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/analytics/visits/route.js
 * Objetivo: Endpoint de telemetria de visitas com proteção LGPD:
 *   - POST: Registra cada acesso ao site (público ou autenticado);
 *   - GET: Restrito exclusivamente aos papéis 'owner' e 'admin' (evita
 *     exposição pública de nomes e e-mails de usuários).
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

// GET: Consulta os totais globais e a lista de visitas por usuário (RESTRITO A OWNER/ADMIN)
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    const sessionRole = sessionClaims?.metadata?.role || sessionClaims?.publicMetadata?.role;
    let requesterRole = sessionRole;
    if (userId && !sessionRole) {
      const user = await currentUser();
      if (user?.id === userId) requesterRole = user.publicMetadata?.role;
    }

    if (!userId || (requesterRole !== "owner" && requesterRole !== "admin")) {
      return NextResponse.json(
        { error: "Acesso restrito à auditoria do proprietário." },
        { status: 403 }
      );
    }

    if (new URL(req.url).searchParams.get("presence") === "1") {
      if (process.env.VERCEL_ENV !== "production") return Response.json({ onlineIds: [] });

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return new Response(null, { status: 503 });

      const supabase = createClient(url, key);
      const cutoff = new Date(Date.now() - 120_000).toISOString();
      const onlineIds = [];
      const pageSize = 200;
      let cursor;
      while (true) {
        const page = supabase
          .from("site_user_presence")
          .select("clerk_id")
          .gt("last_seen_at", cutoff)
          .order("clerk_id", { ascending: true })
          .limit(pageSize);
        const { data, error } = await (cursor ? page.gt("clerk_id", cursor) : page);
        if (error) return new Response(null, { status: 503 });
        onlineIds.push(...data.map((row) => row.clerk_id));
        if (data.length < pageSize) break;
        cursor = data.at(-1).clerk_id;
      }
      return Response.json({ onlineIds });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Credenciais do Supabase não configuradas." },
        { status: 500 }
      );
    }

    const { data: globalMetrics } = await supabaseAdmin
      .from("site_global_metrics")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const groups = new Map();
    let cursor;
    const pageSize = 200;
    while (true) {
      const page = supabaseAdmin
        .from("user_visit_counts")
        .select("clerk_id,user_name,user_email,visit_count,last_visited_at")
        .order("clerk_id", { ascending: true })
        .limit(pageSize);
      const { data: rows, error } = await (cursor ? page.gt("clerk_id", cursor) : page);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const row of rows) {
        const email = row.user_email?.trim().toLowerCase();
        const key = email ? `email:${email}` : `clerk:${row.clerk_id}`;
        const group = groups.get(key);
        const latest =
          !group || Date.parse(row.last_visited_at) > Date.parse(group.last_visited_at)
            ? row
            : group;
        const clerkIds = group?.clerk_ids ?? [];
        clerkIds.push(row.clerk_id);
        groups.set(key, {
          clerk_id: latest.clerk_id,
          clerk_ids: clerkIds,
          user_name: latest.user_name,
          user_email: email || null,
          visit_count: (group?.visit_count ?? 0) + Number(row.visit_count),
          last_visited_at: latest.last_visited_at,
        });
      }

      if (rows.length < pageSize) break;
      cursor = rows.at(-1).clerk_id;
    }
    const users = [...groups.values()].sort((a, b) => b.visit_count - a.visit_count);

    return NextResponse.json({
      success: true,
      metrics: {
        totalVisits: Number(globalMetrics?.total_visits || 0),
        authenticatedVisits: Number(globalMetrics?.authenticated_visits || 0),
        anonymousVisits: Number(globalMetrics?.anonymous_visits || 0),
        uniqueLoggedUsers: users.length,
        updatedAt: globalMetrics?.updated_at || null,
      },
      users,
    });
  } catch (err) {
    console.error("[Visits API GET] Exceção:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
