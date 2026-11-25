/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/middleware.js
 * Objetivo: Middleware de proteção de rotas com Clerk Auth, garantindo acesso
 * público às rotas de autenticação (`/sign-in`, `/sign-up`), proxy reverso
 * `/__clerk(.*)` e `/api/clerk-proxy(.*)`, webhooks, Arena e cron jobs.
 * ============================================================================
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/__clerk(.*)",
  "/api/clerk-proxy(.*)",
  "/planos(.*)",
  "/arena(.*)",
  "/game/play(.*)",
  "/api/game(.*)",
  "/api/quizzes/official(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/mercado-pago",
  "/api/analytics/visits(.*)",
  "/api/cron/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
