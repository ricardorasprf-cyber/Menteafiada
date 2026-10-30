import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const data_nascimento = body?.data_nascimento;

    if (!data_nascimento) {
      return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ data_nascimento })
      .eq("clerk_id", userId);

    if (error) {
      console.error("Erro Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro interno:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}