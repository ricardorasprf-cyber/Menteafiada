import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET ausente.");
      return new NextResponse("Webhook secret missing", { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Credenciais do Supabase ausentes.");
      return new NextResponse("Supabase credentials missing", { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Cabeçalhos de verificação
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse("Assinatura ausente", { status: 400 });
    }

    // Leitura do body bruto
    const body = await req.text();
    const wh = new Webhook(WEBHOOK_SECRET);

    let eventPayload;
    try {
      eventPayload = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Falha ao validar assinatura:", err.message);
      return new NextResponse("Assinatura inválida", { status: 400 });
    }

    // Garante compatibilidade caso o retorno do svix seja string ou objeto
    const evt = typeof eventPayload === "string" ? JSON.parse(eventPayload) : eventPayload;

    if (!evt || !evt.type) {
      console.error("Evento inválido recebido:", evt);
      return new NextResponse("Evento mal formatado", { status: 400 });
    }

    const eventType = evt.type;
    const data = evt.data || {};

    // 1. EVENTO: CRIAÇÃO DE USUÁRIO
    if (eventType === "user.created") {
      const clerkId = data.id;
      const email =
        data.email_addresses?.[0]?.email_address || `${clerkId}@teste.local`;
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "Novo Utilizador";
      const initialRole = data.public_metadata?.role || "participant";

      const { error } = await supabaseAdmin.from("profiles").upsert(
        {
          clerk_id: clerkId,
          email: email,
          name: fullName,
          role: initialRole,
        },
        { onConflict: "clerk_id" }
      );

      if (error) {
        console.error("Erro no Supabase profiles:", error.message);
        return new NextResponse(`Supabase error: ${error.message}`, { status: 500 });
      }
    }

    // 2. EVENTO: ATUALIZAÇÃO DE USUÁRIO
    if (eventType === "user.updated") {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "Utilizador";
      const updatedRole = data.public_metadata?.role;

      const updatePayload = { name: fullName };
      if (email) updatePayload.email = email;
      if (updatedRole) updatePayload.role = updatedRole;

      await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("clerk_id", clerkId);
    }

    // 3. EVENTO: EXCLUSÃO DE USUÁRIO (LGPD)
    if (eventType === "user.deleted") {
      const clerkId = data.id;
      await supabaseAdmin.from("game_players").delete().eq("clerk_id", clerkId);
      await supabaseAdmin.from("profiles").delete().eq("clerk_id", clerkId);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("Erro no webhook:", err);
    return new NextResponse(`Erro interno: ${err.message}`, { status: 500 });
  }
}