import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

const source = await readFile(new URL("../../src/lib/pixCheckout.js", import.meta.url), "utf8");
const reference = "11111111-2222-4333-8444-555555555555";

async function load({ env = {}, fetch, rpc } = {}) {
  const context = createContext({ process: { env }, fetch, AbortSignal });
  const checkout = new SourceTextModule(source, { context });
  await checkout.link(() => new SyntheticModule(["createClient"], function () {
    this.setExport("createClient", () => ({ rpc }));
  }, { context }));
  await checkout.evaluate();
  return checkout.namespace;
}

test("a emissão usa o valor persistido e mantém a chave idempotente na repetição", async () => {
  const requests = [];
  const api = await load({
    env: { MERCADO_PAGO_ACCESS_TOKEN: "synthetic" },
    fetch: async (url, options) => {
      requests.push([url, options.headers["X-Idempotency-Key"], JSON.parse(options.body)]);
      return { ok: true, json: async () => ({ id: "ORDTEST", external_reference: reference, total_amount: "1.00" }) };
    },
  });
  const charge = { reference, amount: "1.00", payer_email: "buyer@example.test" };
  await api.requestPixOrder(charge);
  await api.requestPixOrder(charge);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0][1], reference);
  assert.equal(requests[0][2].total_amount, "1.00");
  assert.equal(requests[0][2].transactions.payments[0].amount, "1.00");
});

test("um 402 com ordem Pix terminal e sem valor pago é recuperado", async () => {
  const order = {
    id: "ORDSYNTHETIC", external_reference: reference, currency: "BRL",
    status: "failed", total_amount: "1.00", total_paid_amount: "0.00",
    transactions: { payments: [{
      amount: "1.00", status: "failed", status_detail: "processing_error",
      payment_method: { id: "pix", type: "bank_transfer" },
    }] },
  };
  let data = order;
  const api = await load({
    env: { MERCADO_PAGO_ACCESS_TOKEN: "synthetic" },
    fetch: async () => ({
      ok: false, status: 402,
      json: async () => ({ errors: [{ code: "failed" }], data }),
    }),
  });
  const charge = { reference, amount: "1.00", payer_email: "buyer@example.test" };
  assert.equal(await api.requestPixOrder(charge), order);
  for (const incompatible of [
    { external_reference: "other" }, { total_amount: "2.00" },
    { total_paid_amount: "1.00" }, { status: "action_required" },
  ]) {
    data = { ...order, ...incompatible };
    await assert.rejects(api.requestPixOrder(charge));
  }
  await assert.rejects(api.requestPixOrder({ ...charge, order_id: order.id }));
});

test("a confirmação só envia à RPC uma ordem Pix creditada com valores coerentes", async () => {
  const calls = [];
  const api = await load({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "synthetic" },
    rpc: async (name, args) => {
      calls.push([name, args.p_amount]);
      return { data: calls.length === 1 ? "confirmed" : "already_confirmed" };
    },
  });
  const order = {
    id: "ORDTEST", external_reference: reference, country_code: "BRA",
    status: "processed", status_detail: "accredited", total_amount: "1.00", total_paid_amount: "1.00",
    transactions: { payments: [{
      id: "TESTPAYMENT", status: "processed", status_detail: "accredited",
      amount: "1.00", payment_method: { id: "pix", type: "bank_transfer" },
    }] },
  };
  assert.equal(await api.settlePixOrder({ ...order, total_paid_amount: "0.99" }), "amount_mismatch");
  assert.equal(await api.settlePixOrder({ ...order, status: "action_required" }), "ignored");
  assert.equal(await api.settlePixOrder(order), "confirmed");
  assert.equal(await api.settlePixOrder(order), "already_confirmed");
  assert.deepEqual(calls, [["confirm_pix_charge", "1.00"], ["confirm_pix_charge", "1.00"]]);
});
