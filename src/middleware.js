import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Rotas acessíveis sem login (Home, Arena, Entrada em Jogos e Webhooks de autenticação)
const isPublicRoute = createRouteMatcher([
  "/",
  "/arena(.*)",
  "/game/play(.*)",
  "/api/webhooks(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// 2. Rotas restritas que exigem nível Proprietário (Owner)
const isOwnerRoute = createRouteMatcher([
  "/dashboard/owner(.*)",
]);

// 3. Rotas restritas a Anfitriões/Professores (Owner, Manager ou Creator)
const isHostRoute = createRouteMatcher([
  "/game/host(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Se a rota for pública, libera o acesso direto (inclui alunos no /game/play)
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Para qualquer rota privada, exige autenticação válida
  const session = await auth();
  if (!session.userId) {
    return session.redirectToSignIn({ returnBackUrl: request.url });
  }

  // Obtém o cargo (role) registrado nos metadados da sessão do Clerk
  // Estrutura padrão Clerk: sessionClaims.metadata.role ou sessionClaims.publicMetadata.role
  const userRole =
    session.sessionClaims?.metadata?.role ||
    session.sessionClaims?.publicMetadata?.role ||
    "participant";

  // Barreira 1: Apenas 'owner' acessa o Painel do Proprietário
  if (isOwnerRoute(request) && userRole !== "owner") {
    // Redireciona usuários sem privilégio de volta para a Home
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Barreira 2: Apenas 'owner', 'manager' ou 'creator' podem criar e gerenciar salas como Host
  if (isHostRoute(request) && !["owner", "manager", "creator"].includes(userRole)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Pula arquivos estáticos e internos do Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Sempre executa para rotas de API e trpc
    "/(api|trpc)(.*)",
  ],
};