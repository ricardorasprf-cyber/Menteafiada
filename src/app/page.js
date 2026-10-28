import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import ClientPageContent from "./ClientPageContent"; // Chama o layout visual corrigido

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();
  
  let userName = "";
  let userRole = "participant";

  if (userId) {
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
    
    userName = user?.firstName || "Aluno";

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          clerk_id: userId,
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Aluno MenteAfiada",
          email: userEmail,
        },
        { onConflict: 'clerk_id' }
      )
      .select('data_nascimento, role')
      .single();

    if (error) {
      console.error("Erro do Supabase:", error.message);
    }

    if (!data || !data.data_nascimento) {
      redirect('/completar-perfil');
    }

    if (data?.role) {
      userRole = data.role;
    }
  }

  // Passamos os dados para o componente visual Client-Side
  return <ClientPageContent userId={userId} userName={userName} userRole={userRole} />;
}