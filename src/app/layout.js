/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/layout.js
 * Objetivo: Layout raiz da aplicação com ClerkProvider (suportando proxyUrl
 * oficial `/__clerk` em produção na Vercel para domínios `.vercel.app`),
 * localização pt-BR, ThemeProvider (4 temas globais), LanguageProvider,
 * PlatformHeader e VisitTracker.
 * ============================================================================
 */

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import PlatformHeader from "@/app/components/PlatformHeader";
import VisitTracker from "@/app/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MenteAfiada — Plataforma Educacional Gamificada",
  description:
    "Aprenda jogando, participe de Batalhas Oficiais na Arena, estude trilhas com videoaulas e e-books em PDF e emita certificados digitais.",
};

export default function RootLayout({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const isProductionClerk = publishableKey.startsWith("pk_live_");

  // Ativa o proxy oficial `/__clerk` quando rodando em produção no subdomínio .vercel.app
  const clerkProxyUrl =
    isProductionClerk && process.env.NODE_ENV === "production"
      ? "[https://menteafiada.vercel.app/__clerk](https://menteafiada.vercel.app/__clerk)"
      : undefined;

  return (
    <ClerkProvider localization="{ptBR}" proxyUrl="{clerkProxyUrl}" signInFallbackRedirectUrl="/dashboard/courses" signInUrl="/sign-in" signUpFallbackRedirectUrl="/completar-perfil" signUpUrl="/sign-up">
      <html lang="pt-BR" className="theme-classic" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        >
          <ThemeProvider>
            <LanguageProvider>
              <VisitTracker/>
              <PlatformHeader/>
              <div className="flex-1 flex flex-col">{children}</div>
            </LanguageProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
