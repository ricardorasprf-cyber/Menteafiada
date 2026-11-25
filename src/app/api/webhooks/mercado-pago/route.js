import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function validSignature(request, orderId, secret) {
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id");
  const parts = new Map(signature.split(",").map((part) => part.trim().split("=")));
  const timestamp = parts.get("ts");
  const digest = parts.get("v1");

  if (!requestId || !/^\d{10,13}$/.test(timestamp ?? "") || !/^[a-f0-9]{64}$/i.test(digest ?? "")) {
    return false;
  }

  const manifest = `id:${orderId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(digest, "hex"));
}

export async function POST(request) {
  if (process.env.VERCEL_ENV === "production" || process.env.MERCADO_PAGO_WEBHOOK_QA_ENABLED !== "1") {
    return new Response(null, { status: 404 });
  }

  const secret = process.env.MERCADO_PAGO_TEST_WEBHOOK_SECRET?.trim();
  const token = process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN?.trim();
  if (!secret || !token) return new Response(null, { status: 503 });

  const { searchParams } = new URL(request.url);
  const orderIds = searchParams.getAll("data.id");
  const [orderId] = orderIds;
  if (searchParams.get("type") !== "order" || orderIds.length !== 1 || !/^ORD[A-Z0-9]{1,77}$/i.test(orderId ?? "")) {
    return new Response(null, { status: 400 });
  }
  if (!validSignature(request, orderId, secret)) return new Response(null, { status: 401 });

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return new Response(null, { status: 502 });

    const order = await response.json();
    if (order.id !== orderId || typeof order.status !== "string") {
      return new Response(null, { status: 502 });
    }

    return Response.json({
      mode: "qa",
      status: order.status,
      statusDetail: order.status_detail ?? null,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
