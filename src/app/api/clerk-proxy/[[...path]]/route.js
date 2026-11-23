/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/clerk-proxy/[[...path]]/route.js
 * Objetivo: Proxy Reverso Oficial do Clerk em Produção para domínios
 * `.vercel.app` (encaminha requisições `/__clerk/*` para a Frontend API
 * oficial do Clerk com todos os cabeçalhos obrigatórios: `Clerk-Proxy-Url`,
 * `Clerk-Secret-Key`, `X-Forwarded-For`, `X-Forwarded-Proto` e
 * `X-Forwarded-Host`).
 * ============================================================================
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.services";
const CLERK_PROXY_URL = "https://menteafiada.vercel.app/__clerk";

async function proxyClerkRequest(req, context) {
  try {
    const resolvedParams = await context.params;
    const pathSegments = resolvedParams?.path || [];
    const targetPath = pathSegments.join("/");

    const incomingUrl = new URL(req.url);
    const targetUrl = `${CLERK_FRONTEND_API}/${targetPath}${incomingUrl.search}`;

    const secretKey = (process.env.CLERK_SECRET_KEY || "").trim();

    if (!secretKey) {
      console.error("[Clerk Proxy] CLERK_SECRET_KEY não configurada no ambiente.");
      return NextResponse.json(
        { error: "CLERK_SECRET_KEY ausente nas variáveis de ambiente do servidor." },
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

    if (upstreamResponse.status >= 500) {
      const errorText = await upstreamResponse.text();
      console.error(
        `[Clerk Proxy Upstream ${upstreamResponse.status}] ${targetUrl}:`,
        errorText.slice(0, 300)
      );
      return new NextResponse(errorText, {
        status: upstreamResponse.status,
        headers: { "content-type": "application/json" },
      });
    }

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
    console.error("[Clerk Proxy Fatal Error]:", err);
    return NextResponse.json(
      { error: "Falha de conexão com a API do Clerk", detail: err.message },
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