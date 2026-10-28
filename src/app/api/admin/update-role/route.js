import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    const requesterRole =
      sessionClaims?.metadata?.role ||
      sessionClaims?.publicMetadata?.role;

    // Apenas quem é 'owner' pode alterar cargos de terceiros
    if (!userId || requesterRole !== "owner") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { targetClerkId, newRole } = await req.json();

    if (!targetClerkId || !newRole) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    // Atualiza o publicMetadata no Clerk
    const client = await clerkClient();
    await client.users.updateUserMetadata(targetClerkId, {
      publicMetadata: {
        role: newRole,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao sincronizar role no Clerk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}