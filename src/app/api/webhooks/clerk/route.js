import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";

// Instância administrativa do Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET ausente.");
    return NextResponse.json({ error: "Segredo não configurado." }, { status: 500 });
  }

  // Cabeçalhos de verificação
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

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
    console.error("Assinatura inválida:", err.message);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  try {
    // 1. CRIAÇÃO DE UTILIZADOR
    if (eventType === "user.created") {
      const clerkId = data.id;
      // Garante um e-mail válido mesmo se o teste vier com array vazio
      const email = data.email_addresses?.[0]?.email_address || `${clerkId}@teste.local`;
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
        console.error("Erro Supabase user.created:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // 2. ATUALIZAÇÃO DE UTILIZADOR
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

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("clerk_id", clerkId);

      if (error) {
        console.error("Erro Supabase user.updated:", error.message);
      }
    }

    // 3. EXCLUSÃO DE UTILIZADOR (LGPD)
    if (eventType === "user.deleted") {
      const clerkId = data.id;
      await supabaseAdmin.from("game_players").delete().eq("clerk_id", clerkId);
      await supabaseAdmin.from("profiles").delete().eq("clerk_id", clerkId);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Erro inesperado no processamento do webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}