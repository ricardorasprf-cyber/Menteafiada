/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: next.config.mjs
 * Objetivo: Configuração do Next.js 16 com rewrite interno de `/__clerk/:path*`
 * para `/api/clerk-proxy/:path*`, garantindo o roteamento transparente do
 * Proxy Reverso Oficial do Clerk em produção na Vercel.
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
