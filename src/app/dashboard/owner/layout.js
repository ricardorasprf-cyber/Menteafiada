/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/layout.js
 * Objetivo: Layout raiz da aplicação que injeta globalmente o ClerkProvider
 * (localizado em pt-BR), LanguageProvider, ThemeProvider, PlatformHeader,
 * VisitTracker (registro silencioso de visitações) e AfiadinhoAvatar.
 * ============================================================================
 */

import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";
import PlatformHeader from "@/app/components/PlatformHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AfiadinhoAvatar from "@/app/components/AfiadinhoAvatar";
import { VisitTracker } from "@/app/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MenteAfiada EAD",
  description: "Plataforma moderna de educação a distância",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      localization={ptBR}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
    >
      <html lang="pt-BR" className="theme-classic" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300`}
        >
          <LanguageProvider>
            <ThemeProvider>
              <VisitTracker />
              <PlatformHeader />
              {children}
              <AfiadinhoAvatar />
            </ThemeProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}