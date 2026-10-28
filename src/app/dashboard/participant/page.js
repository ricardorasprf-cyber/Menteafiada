import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import ClientParticipantContent from "./ClientParticipantContent";

export const dynamic = "force-dynamic";

export default async function ParticipantDashboard() {
  const { userId } = await auth();
  const user = await currentUser();
  const userName = user?.firstName || "Aluno";

  let userRole = "participant";
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_id", userId)
      .single();
    
    if (data?.role) {
      userRole = data.role;
    }
  }

  return <ClientParticipantContent userName={userName} userRole={userRole} />;
}