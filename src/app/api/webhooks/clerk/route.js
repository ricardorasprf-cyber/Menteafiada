import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";

// Instância do Supabase utilizando a chave de serviço para escrita direta e bypass de RLS no backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Erro: CLERK_WEBHOOK_SECRET não configurado nas variáveis de ambiente.");
    return NextResponse.json({ error: "Configuração pendente no servidor." }, { status: 500 });
  }

  // Obter cabeçalhos de verificação do Svix
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Cabeçalhos de assinatura ausentes." }, { status: 400 });
  }

  // Ler o corpo em texto bruto (necessário para validação criptográfica estrita)
  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Falha na validação da assinatura do Webhook:", err.message);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  // 1. EVENTO: NOVO UTILIZADOR CRIADO NO CLERK
  if (eventType === "user.created") {
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address || "";
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
      console.error("Erro ao sincronizar novo perfil no Supabase:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 2. EVENTO: UTILIZADOR ATUALIZADO NO CLERK
  if (eventType === "user.updated") {
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address || "";
    const firstName = data.first_name || "";
    const lastName = data.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Utilizador";
    const updatedRole = data.public_metadata?.role;

    const updatePayload = {
      email,
      name: fullName,
    };

    if (updatedRole) {
      updatePayload.role = updatedRole;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("clerk_id", clerkId);

    if (error) {
      console.error("Erro ao atualizar perfil no Supabase:", error.message);
    }
  }

  // 3. EVENTO: UTILIZADOR ELIMINADO NO CLERK (LGPD)
  if (eventType === "user.deleted") {
    const clerkId = data.id;

    // Elimina respostas e perfil automaticamente
    await supabaseAdmin.from("player_answers").delete().eq("player_id", clerkId);
    await supabaseAdmin.from("game_players").delete().eq("clerk_id", clerkId);
    await supabaseAdmin.from("profiles").delete().eq("clerk_id", clerkId);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}