import { currentUser } from "@clerk/nextjs/server";
import { getPaymentsDatabase, getPixAccess, isPixCheckoutEnabled, requestPixOrder, settlePixOrder } from "@/lib/pixCheckout";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    const accessUntil = await getPixAccess(user.id);
    return Response.json({ enabled: isPixCheckoutEnabled(), accessUntil });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function POST(request) {
  if (!isPixCheckoutEnabled()) return new Response(null, { status: 404 });
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const email = user.primaryEmailAddress;
  if (email?.verification?.status !== "verified") return new Response(null, { status: 422 });
  const body = await request.json().catch(() => null);
  if (body?.orderId != null && !/^ORD[A-Z0-9]{1,77}$/i.test(body.orderId)) {
    return new Response(null, { status: 400 });
  }
  if (!Number.isSafeInteger(body?.expectedCents) || body.expectedCents <= 0) {
    return new Response(null, { status: 400 });
  }

  try {
    const db = getPaymentsDatabase();
    const pending = () => db.from("pix_charges").select("*")
      .eq("clerk_id", user.id).eq("pending", true).maybeSingle();
    let { data: charge, error } = body.orderId
      ? await db.from("pix_charges").select("*").eq("clerk_id", user.id)
        .eq("order_id", body.orderId).maybeSingle()
      : await pending();
    if (error) throw error;
    if (body.orderId && !charge) return new Response(null, { status: 404 });
    if (charge?.access_until) {
      return Response.json({ orderId: charge.order_id, status: "paid", accessUntil: charge.access_until });
    }
    if (!charge) {
      const { data: plan, error: planError } = await db.from("subscription_plans")
        .select("annual_total_price, annual_monthly_price").eq("id", "creator_pro").eq("is_active", true).single();
      if (planError) throw planError;
      const cents = plan.annual_total_price == null
        ? Math.round(Number(plan.annual_monthly_price) * 100) * 12
        : Math.round(Number(plan.annual_total_price) * 100);
      if (cents !== body.expectedCents) return Response.json({ reason: "price_changed" }, { status: 409 });
      ({ data: charge, error } = await db.from("pix_charges").insert({
        clerk_id: user.id, payer_email: email.emailAddress,
        payer_name: user.fullName || email.emailAddress, amount: (cents / 100).toFixed(2),
      }).select().single());
      if (error?.code === "23505") ({ data: charge, error } = await pending());
      if (error || !charge) throw error ?? new Error("Cobrança indisponível.");
    }

    const order = await requestPixOrder(charge);
    if (!charge.order_id) {
      const { error: bindError } = await db.from("pix_charges").update({ order_id: order.id })
        .eq("reference", charge.reference).is("order_id", null);
      if (bindError) throw bindError;
    }
    if (order.status === "processed") {
      const result = await settlePixOrder(order);
      if (!["confirmed", "already_confirmed"].includes(result)) throw new Error("Confirmação inválida.");
      return Response.json({ orderId: order.id, status: "paid", accessUntil: await getPixAccess(user.id) });
    }
    if (["expired", "canceled", "failed"].includes(order.status)) {
      const { error: closeError } = await db.from("pix_charges").update({ pending: false })
        .eq("reference", charge.reference).is("access_until", null);
      if (closeError) throw closeError;
      return Response.json({ status: order.status });
    }
    const pix = order.transactions?.payments?.[0]?.payment_method;
    return Response.json({
      orderId: order.id, status: "pending", amount: Number(charge.amount),
      code: pix?.id === "pix" ? pix.qr_code : null,
      image: pix?.id === "pix" ? pix.qr_code_base64 : null,
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
