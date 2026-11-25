import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

const source = await readFile(new URL("../../src/app/api/webhooks/mercado-pago/route.js", import.meta.url), "utf8");
const orderId = "ORDTST0123456789";
const requestId = "synthetic-request";
const timestamp = "1795622400";
const secret = "synthetic-webhook-secret";
const endpoint = `https://qa.example.test/api/webhooks/mercado-pago?type=order&data.id=${orderId}`;

function notification({
  url = endpoint,
  signature = createHmac("sha256", secret)
    .update(`id:${orderId};request-id:${requestId};ts:${timestamp};`)
    .digest("hex"),
} = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "x-signature": `ts=${timestamp},v1=${signature}`, "x-request-id": requestId },
    body: JSON.stringify({ data: { id: "ORDUNSIGNED", status: "processed" } }),
  });
}

async function loadRoute({ env = {}, provider } = {}) {
  const calls = [];
  const context = createContext({
    URL, Response, Buffer, AbortSignal,
    process: { env: {
      MERCADO_PAGO_WEBHOOK_QA_ENABLED: "1",
      MERCADO_PAGO_TEST_WEBHOOK_SECRET: secret,
      MERCADO_PAGO_TEST_ACCESS_TOKEN: "synthetic-test-token",
      VERCEL_ENV: "preview",
      ...env,
    } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return provider?.() ?? Response.json({ id: orderId, status: "action_required", status_detail: "waiting_transfer" });
    },
  });
  const route = new SourceTextModule(source, { context });
  await route.link((specifier) => {
    assert.equal(specifier, "node:crypto");
    return new SyntheticModule(["createHmac", "timingSafeEqual"], function () {
      this.setExport("createHmac", createHmac);
      this.setExport("timingSafeEqual", timingSafeEqual);
    }, { context });
  });
  await route.evaluate();
  return { post: route.namespace.POST, calls };
}

test("consulta por GET somente o ID assinado e retorna o estado verificado", async () => {
  const { post, calls } = await loadRoute();
  const response = await post(notification());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: "qa", status: "action_required", statusDetail: "waiting_transfer" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.mercadopago.com/v1/orders/${orderId}`);
  assert.equal(calls[0].options.method ?? "GET", "GET");
  assert.equal(calls[0].options.headers.Authorization, "Bearer synthetic-test-token");
});

test("bloqueia produção, falta de configuração e assinatura inválida antes de consultar a API", async () => {
  for (const [env, request, status] of [
    [{ VERCEL_ENV: "production" }, notification(), 404],
    [{ MERCADO_PAGO_WEBHOOK_QA_ENABLED: "" }, notification(), 404],
    [{ MERCADO_PAGO_TEST_ACCESS_TOKEN: "" }, notification(), 503],
    [{}, notification({ signature: "0".repeat(64) }), 401],
    [{}, notification({ url: endpoint.replace(orderId, "ORDOTHER") }), 401],
    [{}, notification({ url: endpoint + "&data.id=ORDOTHER" }), 400],
    [{}, notification({ url: endpoint.replace("type=order", "type=payment") }), 400],
  ]) {
    const { post, calls } = await loadRoute({ env });
    assert.equal((await post(request)).status, status);
    assert.equal(calls.length, 0);
  }
});

test("retorna erro recuperável para falhas de consulta ou resposta incompatível", async () => {
  for (const provider of [
    () => new Response(null, { status: 503 }),
    () => Response.json({ id: "ORDOTHER", status: "processed" }),
    () => { throw new Error("synthetic network failure"); },
  ]) {
    const { post } = await loadRoute({ provider });
    assert.equal((await post(notification())).status, 502);
  }
});
