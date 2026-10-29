"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function salvarDataNascimento(dataFormatada) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!dataFormatada) {
      return { success: false, error: "Data não fornecida." };
    }

    // 1. Tenta atualizar o registro existente
    const { data, error } = await supabase
      .from("profiles")
      .update({ data_nascimento: dataFormatada })
      .eq("clerk_id", userId)
      .select();

    if (error) {
      console.error("Erro no Supabase update:", error);
      return { success: false, error: error.message };
    }

    // 2. Se o usuário ainda não tiver perfil na tabela, insere o novo registro
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          clerk_id: userId,
          data_nascimento: dataFormatada,
        });

      if (insertError) {
        console.error("Erro no Supabase insert:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Erro interno:", err);
    return { success: false, error: err.message || "Erro interno do servidor." };
  }
}