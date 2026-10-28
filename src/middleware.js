import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Rotas acessíveis sem login, APIs de serviço, webhooks e telas de perfil/onboarding
const isPublicRoute = createRouteMatcher([
  "/",
  "/arena(.*)",
  "/game/play(.*)",
  "/api/(.*)",              // Permite chamadas de API (como salvar a data e webhooks)
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/account(.*)",           // Painel e pendências de conta do Clerk
  "/completar-perfil(.*)",  // Página do formulário de aniversário
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
  // Se for rota pública ou de fluxo de onboarding/API, libera para execução direta
  if (isPublicRoute(request)) {
    return;
  }

  // Para qualquer rota privada, exige autenticação válida
  const session = await auth();

  if (!session.userId) {
    return session.redirectToSignIn({ returnBackUrl: request.url });
  }

  // Obtém o cargo (role) registrado nos metadados da sessão do Clerk
  const userRole =
    session.sessionClaims?.metadata?.role ||
    session.sessionClaims?.publicMetadata?.role ||
    "participant";

  // Barreira 1: Apenas 'owner' acessa o Painel do Proprietário
  if (isOwnerRoute(request) && userRole !== "owner") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Barreira 2: Apenas 'owner', 'manager' ou 'creator' podem gerenciar salas como Host
  if (isHostRoute(request) && !["owner", "manager", "creator"].includes(userRole)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Pula arquivos estáticos e internos do Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Garante execução para rotas de API e trpc
    "/(api|trpc)(.*)",
  ],
};