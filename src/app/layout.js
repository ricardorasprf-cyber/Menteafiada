/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/layout.js
 * Objetivo: Layout raiz da aplicação que injeta globalmente o ClerkProvider,
 * LanguageProvider, ThemeProvider, PlatformHeader (cabeçalho unificado em
 * todas as páginas) e AfiadinhoAvatar.
 * ============================================================================
 */

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";
import PlatformHeader from "@/app/components/PlatformHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AfiadinhoAvatar from "@/app/components/AfiadinhoAvatar";

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