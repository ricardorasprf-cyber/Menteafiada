/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Habilita prefetch de DNS seguro para acelerar resolução de domínios
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Impede que o MenteAfiada seja embutido em iframes de outros sites (anti-clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Bloqueia tentativas do navegador de adivinhar tipos MIME incorretos (anti-sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla o envio do header Referer protegendo a privacidade dos alunos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desativa acesso a hardware não utilizado (câmera, microfone, GPS)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Força conexões HTTPS estritas em produção (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;