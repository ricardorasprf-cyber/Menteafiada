/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/api/clerk-proxy/[[...path]]/route.js
 * Objetivo: Handler interno do Proxy Reverso Oficial do Clerk em Produção
 * (recebe as chamadas reescritas de `/__clerk/*` via `next.config.mjs` e
 * injeta os cabeçalhos obrigatórios `Clerk-Proxy-Url`, `Clerk-Secret-Key`
 * e `X-Forwarded-For` exigidos pela Frontend API do Clerk).
 * ============================================================================
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyClerkRequest(req, context) {
  try {
    const resolvedParams = await context.params;
    const pathSegments = resolvedParams?.path || [];
    const targetPath = pathSegments.join("/");

    const incomingUrl = new URL(req.url);
    const targetUrl = new URL(
      `https://frontend-api.clerk.services/${targetPath}${incomingUrl.search}`
    );

    const headers = new Headers(req.headers);
    headers.set("Clerk-Proxy-Url", "https://menteafiada.vercel.app/__clerk");
    headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY || "");

    const forwardedFor =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    headers.set("X-Forwarded-For", forwardedFor);
    headers.delete("host");

    const fetchOptions = {
      method: req.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      fetchOptions.body = await req.arrayBuffer();
    }

    const upstreamResponse = await fetch(targetUrl.toString(), fetchOptions);

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Clerk Proxy Error]:", err.message);
    return NextResponse.json(
      { error: "Falha no proxy de autenticação Clerk" },
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
