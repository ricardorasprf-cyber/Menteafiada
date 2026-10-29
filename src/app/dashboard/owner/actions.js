"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { createClerkClient } from "@clerk/nextjs/server";

export async function excluirPerfil(profileId, targetClerkId) {
  try {
    const { userId, sessionClaims } = await auth();

    // 1. Apenas Proprietários podem excluir contas
    const userRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role;

    if (!userId || userRole !== "owner") {
      return { success: false, error: "Ação não permitida. Apenas Proprietários podem excluir contas." };
    }

    // 2. Proteção contra auto-exclusão
    if (userId === targetClerkId) {
      return { success: false, error: "Você não pode excluir a sua própria conta de Proprietário." };
    }

    // 3. Exclui o registro da tabela profiles do Supabase
    const { error: dbError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (dbError) {
      console.error("Erro ao excluir do Supabase:", dbError);
      return { success: false, error: dbError.message };
    }

    // 4. Se houver um ID válido do Clerk, exclui o usuário no Clerk
    if (targetClerkId && !targetClerkId.startsWith("anon_")) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        await clerk.users.deleteUser(targetClerkId);
      } catch (clerkErr) {
        console.warn("Aviso ao remover do Clerk (usuário pode já ter sido removido):", clerkErr.message);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Erro interno ao excluir:", err);
    return { success: false, error: err.message || "Erro interno do servidor." };
  }
}