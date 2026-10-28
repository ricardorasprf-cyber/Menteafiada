import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardController() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Redireciona sempre para os cursos (participante)
  // O acesso de gestão (Owner, Manager, Creator) é feito pelos links diretos no menu suspenso
  redirect("/dashboard/participant");
}