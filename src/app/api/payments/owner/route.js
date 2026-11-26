import { currentUser } from "@clerk/nextjs/server";
import { getPaymentsDatabase } from "@/lib/pixCheckout";

async function isOwner() {
  return (await currentUser())?.publicMetadata?.role === "owner";
}

export async function GET() {
  if (!await isOwner()) return new Response(null, { status: 403 });
  const { data, error } = await getPaymentsDatabase().from("payment_transactions")
    .select("*").order("paid_at", { ascending: false }).limit(200);
  if (error) return new Response(null, { status: 503 });
  return Response.json({ transactions: data });
}

export async function PATCH(request) {
  if (!await isOwner()) return new Response(null, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!["free", "student_pro", "creator_pro", "institutional"].includes(body?.id)) {
    return new Response(null, { status: 400 });
  }
  const values = {};
  for (const field of ["regular_monthly_price", "monthly_price", "annual_monthly_price"]) {
    if (!validPrice(body[field])) return new Response(null, { status: 400 });
    values[field] = body[field];
  }
  if (body.id === "creator_pro") {
    if (body.annual_total_price !== null && !validPrice(body.annual_total_price)) {
      return new Response(null, { status: 400 });
    }
    values.annual_total_price = body.annual_total_price;
  }
  const { data, error } = await getPaymentsDatabase().from("subscription_plans")
    .update({ ...values, updated_at: new Date().toISOString() }).eq("id", body.id).select("id").maybeSingle();
  if (error || !data) return new Response(null, { status: 503 });
  return Response.json({ saved: true });
}

function validPrice(value) {
  return typeof value === "number" && value >= 0 && /^\d{1,8}(\.\d{1,2})?$/.test(String(value));
}
