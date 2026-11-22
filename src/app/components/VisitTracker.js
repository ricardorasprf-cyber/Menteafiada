/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/VisitTracker.js
 * Objetivo: Componente cliente invisível que registra automaticamente as
 * visitações do portal (menteafiada.vercel.app), distinguindo acessos
 * anônimos de sessões autenticadas via Clerk.
 * ============================================================================
 */

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function VisitTracker() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const lastTrackedSignature = useRef("");

  useEffect(() => {
    if (!isLoaded || !pathname) return;

    // Ignora rotas internas de API
    if (pathname.startsWith("/api")) return;

    const identityKey = user?.id || "anon";
    const signature = `${identityKey}::${pathname}`;

    // Evita disparos repetidos na mesma rota dentro da mesma renderização
    if (lastTrackedSignature.current === signature) return;

    // Controle por sessão para evitar contagem duplicada em atualizações rápidas (< 30s)
    const storageKey = `ma_visit_${signature}`;
    const lastTs = Number(sessionStorage.getItem(storageKey) || 0);
    const now = Date.now();

    if (now - lastTs < 30 * 1000) {
      return;
    }

    lastTrackedSignature.current = signature;
    sessionStorage.setItem(storageKey, String(now));

    fetch("/api/analytics/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagePath: pathname }),
      keepalive: true,
    }).catch(() => {
      // Falha silenciosa para nunca interferir na navegação do usuário
    });
  }, [pathname, user?.id, isLoaded]);

  return null;
}

export default VisitTracker;