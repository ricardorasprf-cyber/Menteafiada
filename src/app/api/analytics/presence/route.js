import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  if (process.env.VERCEL_ENV !== "production") {
    return new Response(null, { status: 204 });
  }

  const { userId } = await auth();
  if (!userId) return new Response(null, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response(null, { status: 503 });

  const supabase = createClient(url, key);
  const { error } = await supabase.from("site_user_presence").upsert({
    clerk_id: userId,
    last_seen_at: new Date().toISOString(),
  });

  return new Response(null, { status: error ? 503 : 204 });
}
