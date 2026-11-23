/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/clerk-proxy/[[...path]]/route.js
 * Objetivo: Proxy Reverso Completo do Clerk em Produção para domínios
 * `.vercel.app`:
 *   1. Roteia bundles estáticos `/__clerk/npm/*` diretamente da CDN oficial
 *      (`cdn.jsdelivr.net/npm/*`) com cache e MIME type JavaScript;
 *   2. Roteia todas as chamadas da Frontend API (`/v1/*`, OAuth, sessões)
 *      para `https://frontend-api.clerk.services` com os cabeçalhos
 *      obrigatórios `Clerk-Proxy-Url`, `Clerk-Secret-Key` e `X-Forwarded-For`.
 * ============================================================================
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.services";
const CLERK_NPM_CDN = "https://cdn.jsdelivr.net";
const CLERK_PROXY_URL = "https://menteafiada.vercel.app/__clerk";

async function proxyClerkRequest(req, context) {
  try {
    const resolvedParams = await context.params;
    const pathSegments = resolvedParams?.path || [];
    const targetPath = pathSegments.join("/");
    const incomingUrl = new URL(req.url);

    // 1. Bundles do SDK (@clerk/clerk-js, @clerk/ui) solicitados sob /__clerk/npm/*
    if (targetPath.startsWith("npm/")) {
      const cdnUrl = `${CLERK_NPM_CDN}/${targetPath}${incomingUrl.search}`;
      const cdnRes = await fetch(cdnUrl, {
        method: "GET",
        headers: {
          "User-Agent": req.headers.get("user-agent") || "MenteAfiada-Proxy/1.0",
        },
      });

      if (!cdnRes.ok) {
        return NextResponse.json(
          { error: `Falha ao carregar bundle Clerk CDN (${cdnRes.status})` },
          { status: cdnRes.status }
        );
      }

      const scriptBuffer = await cdnRes.arrayBuffer();
      return new NextResponse(scriptBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            cdnRes.headers.get("content-type") ||
            "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }

    // 2. Chamadas da Frontend API do Clerk (/v1/*, OAuth callback, sessões)
    const targetUrl = `${CLERK_FRONTEND_API}/${targetPath}${incomingUrl.search}`;
    const secretKey = (process.env.CLERK_SECRET_KEY || "").trim();

    if (!secretKey) {
      console.error("[Clerk Proxy] CLERK_SECRET_KEY ausente no ambiente.");
      return NextResponse.json(
        { error: "CLERK_SECRET_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const headers = new Headers();
    const allowedForwardHeaders = [
      "accept",
      "accept-language",
      "content-type",
      "cookie",
      "user-agent",
      "origin",
      "referer",
      "authorization",
      "clerk-api-version",
      "x-clerk-auth-status",
      "x-clerk-auth-reason",
      "x-clerk-auth-message",
    ];

    for (const key of allowedForwardHeaders) {
      const val = req.headers.get(key);
      if (val) headers.set(key, val);
    }

    // Cabeçalhos obrigatórios pela especificação oficial de Proxy do Clerk
    headers.set("Clerk-Proxy-Url", CLERK_PROXY_URL);
    headers.set("Clerk-Secret-Key", secretKey);
    headers.set("X-Forwarded-Proto", "https");
    headers.set("X-Forwarded-Host", "menteafiada.vercel.app");

    const forwardedFor =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    headers.set("X-Forwarded-For", forwardedFor);

    const fetchOptions = {
      method: req.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      fetchOptions.body = await req.arrayBuffer();
    }

    const upstreamResponse = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        lowerKey !== "content-length" &&
        lowerKey !== "transfer-encoding"
      ) {
        responseHeaders.append(key, value);
      }
    });

    const bodyBuffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(bodyBuffer, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Clerk Proxy Error]:", err);
    return NextResponse.json(
      { error: "Falha no proxy reverso do Clerk", detail: err.message },
      { status: 502 }
    );
  }
}

export async function GET(req, context) {
  return proxyClerkRequest(req, context);
}

export async function POST(req, context) {
  return proxyClerkRequest(req, context);
}

export async function PUT(req, context) {
  return proxyClerkRequest(req, context);
}

export async function PATCH(req, context) {
  return proxyClerkRequest(req, context);
}

export async function DELETE(req, context) {
  return proxyClerkRequest(req, context);
}

export async function OPTIONS(req, context) {
  return proxyClerkRequest(req, context);
}
