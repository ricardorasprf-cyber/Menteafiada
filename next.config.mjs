/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: next.config.mjs
 * Objetivo: Configuração do Next.js 16 com rewrite interno de `/__clerk/:path*`
 * para `/api/clerk-proxy/:path*`, contornando a regra de pastas privadas `__`
 * do App Router e viabilizando o Proxy Reverso Oficial do Clerk na Vercel.
 * ============================================================================
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/__clerk/:path*",
        destination: "/api/clerk-proxy/:path*",
      },
    ];
  },
};

export default nextConfig;
