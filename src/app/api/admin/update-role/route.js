/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/admin/update-role/route.js
 * Objetivo: Permitir exclusivamente ao Proprietário ('owner') atualizar o
 * papel funcional (role) e o nível de assinatura (plan_tier) de qualquer
 * usuário diretamente nos metadados públicos do Clerk.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Mapeia automaticamente o nível de plano correspondente a cada papel
function resolvePlanTierFromRole(role, explicitPlanTier) {
  if (explicitPlanTier) return explicitPlanTier;
  switch (role) {
    case "owner":
      return "owner";
    case "manager":
      return "institutional";
    case "creator_pro":
    case "creator":
      return "creator_pro";
    case "student_pro":
      return "student_pro";
    default:
      return "free";
  }
}

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    const requesterRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role;

    // Apenas quem é 'owner' pode alterar cargos/planos de terceiros
    if (!userId || requesterRole !== "owner") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { targetClerkId, newRole, planTier } = await req.json();

    if (!targetClerkId || !newRole) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    const resolvedPlanTier = resolvePlanTierFromRole(newRole, planTier);

    // Atualiza o publicMetadata no Clerk com role e plan_tier sincronizados
    const client = await clerkClient();
    await client.users.updateUserMetadata(targetClerkId, {
      publicMetadata: {
        role: newRole,
        plan_tier: resolvedPlanTier,
      },
    });

    return NextResponse.json({
      success: true,
      role: newRole,
      planTier: resolvedPlanTier,
    });
  } catch (error) {
    console.error("Erro ao sincronizar role/plan_tier no Clerk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}