import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Sessão inválida ou não autenticada." }, { status: 401 });
    }

    // 1. Apaga respostas e histórico pedagógico atrelado ao aluno no Supabase
    await supabase.from("player_answers").delete().eq("player_id", userId);
    await supabase.from("game_players").delete().eq("clerk_id", userId);

    // 2. Apaga o registo de perfil (LGPD - Eliminação de Dados Pessoais)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("clerk_id", userId);

    if (profileError) {
      console.error("Erro ao apagar perfil no Supabase:", profileError);
    }

    // 3. Elimina o utilizador do diretório de autenticação do Clerk
    const client = await clerkClient();
    await client.users.deleteUser(userId);

    return NextResponse.json({ success: true, message: "Dados e conta eliminados com sucesso." });
  } catch (error) {
    console.error("Falha ao executar pedido de eliminação LGPD:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}