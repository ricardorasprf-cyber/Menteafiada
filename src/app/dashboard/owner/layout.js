import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function OwnerLayout({ children }) {
  const { userId } = await auth();

  // 1. Se não estiver logado, rua! (Vai para a Home)
  if (!userId) {
    redirect('/');
  }

  // 2. Vai à base de dados verificar quem é esta pessoa
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('clerk_id', userId)
    .single();

  // 3. A VERIFICAÇÃO DE SEGURANÇA: Se a role não for 'owner', bloqueia o acesso!
  if (profile?.role !== 'owner') {
    // Redireciona de volta para '/dashboard', onde o nosso roteador 
    // vai apanhá-lo e mandá-lo para o lugar correto (ex: /dashboard/participant)
    redirect('/dashboard');
  }

  // Se passar no teste de segurança, desenha a página (children)
  return <>{children}</>;
}