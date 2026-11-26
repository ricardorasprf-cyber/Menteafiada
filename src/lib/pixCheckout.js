import { createClient } from "@supabase/supabase-js";

const ordersUrl = "https://api.mercadopago.com/v1/orders";

export function getPaymentsDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de pagamentos indisponível.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isPixCheckoutEnabled() {
  return process.env.VERCEL_ENV === "production" && process.env.MERCADO_PAGO_PIX_ENABLED === "1";
}

export async function getPixAccess(userId) {
  if (!isPixCheckoutEnabled()) return null;
  const { data, error } = await getPaymentsDatabase().from("pix_charges")
    .select("access_until").eq("clerk_id", userId)
    .gt("access_until", new Date().toISOString())
    .order("access_until", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.access_until ?? null;
}

export async function settlePixOrder(order) {
  const payments = order.transactions?.payments;
  if (order.status !== "processed" || order.status_detail !== "accredited" ||
      !Array.isArray(payments) || payments.length !== 1 ||
      !/^[a-f0-9-]{36}$/.test(order.external_reference ?? "") ||
      (order.currency_id ? order.currency_id !== "BRL" : order.country_code !== "BRA")) return "ignored";

  const [payment] = payments;
  if (payment.status !== "processed" || payment.status_detail !== "accredited" ||
      payment.payment_method?.id !== "pix" || payment.payment_method?.type !== "bank_transfer" ||
      !payment.id) return "ignored";
  const paid = String(payment.paid_amount ?? order.total_paid_amount ?? "");
  if (!/^\d{1,8}\.\d{2}$/.test(paid) || Number(paid) <= 0 ||
      Number(order.total_amount) !== Number(paid) || Number(payment.amount) !== Number(paid) ||
      (order.total_paid_amount != null && Number(order.total_paid_amount) !== Number(paid))) {
    return "amount_mismatch";
  }
  const { data, error } = await getPaymentsDatabase().rpc("confirm_pix_charge", {
    p_reference: order.external_reference, p_order_id: order.id,
    p_payment_id: payment.id, p_amount: paid,
  });
  if (error) throw error;
  return data;
}

export async function requestPixOrder(charge) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("Credencial do Pix indisponível.");
  const headers = { Authorization: `Bearer ${token}` };
  const options = { headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) };
  const amount = Number(charge.amount).toFixed(2);
  const response = charge.order_id
    ? await fetch(`${ordersUrl}/${encodeURIComponent(charge.order_id)}`, options)
    : await fetch(ordersUrl, {
        ...options, method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "X-Idempotency-Key": charge.reference },
        body: JSON.stringify({
          type: "online", processing_mode: "automatic", external_reference: charge.reference,
          total_amount: amount, payer: { email: charge.payer_email },
          transactions: { payments: [{ amount, payment_method: { id: "pix", type: "bank_transfer" } }] },
        }),
      });
  if (!response.ok) throw new Error("Falha na Orders API.");
  const order = await response.json();
  if (!/^ORD[A-Z0-9]{1,77}$/i.test(order.id ?? "") ||
      (charge.order_id && order.id !== charge.order_id) ||
      order.external_reference !== charge.reference || Number(order.total_amount) !== Number(amount)) {
    throw new Error("Ordem Pix incompatível com a cobrança.");
  }
  return order;
}
