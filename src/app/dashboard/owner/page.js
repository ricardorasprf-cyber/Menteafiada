"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import { useUser } from "@clerk/nextjs";

export default function OwnerDashboard() {
  const { user } = useUser();
  const userName = user?.firstName || "Admin";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'owner', 'manager', 'creator', 'participant'

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Erro ao atualizar o perfil. Tente novamente.");
      fetchUsers();
    }
  };

  // Filtragem dos utilizadores de acordo com a aba selecionada
  const filteredUsers = users.filter((u) => {
    if (activeTab === "all") return true;
    const role = u.role || "participant";
    return role === activeTab;
  });

  // Contadores para as abas
  const counts = {
    all: users.length,
    owner: users.filter((u) => u.role === "owner").length,
    manager: users.filter((u) => u.role === "manager").length,
    creator: users.filter((u) => u.role === "creator").length,
    participant: users.filter((u) => (!u.role || u.role === "participant")).length,
  };

  const tabs = [
    { id: "all", label: "Todos", count: counts.all, icon: "📋" },
    { id: "owner", label: "Proprietários", count: counts.owner, icon: "👑" },
    { id: "manager", label: "Gestores", count: counts.manager, icon: "🏢" },
    { id: "creator", label: "Criadores", count: counts.creator, icon: "🎨" },
    { id: "participant", label: "Participantes", count: counts.participant, icon: "🎓" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans transition-colors duration-300">
      <header className="bg-slate-900 pb-24 pt-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-white">
              <img src="/logo-dark.jpeg" alt="Logo MenteAfiada" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Mente<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Afiada</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            <UserMenu userName={userName} userRole="owner" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6 group">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Voltar para a Página Inicial
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Gestão de Perfis</h1>
          <p className="text-slate-400">Administre os utilizadores, criadores e gestores da plataforma.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-12 pb-20 relative z-10">
        
        {/* NAVEGAÇÃO POR ABAS (TABS) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-blue-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TABELA DE UTILIZADORES */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Data Nasc.</th>
                  <th className="p-4 font-semibold">Cargo (Role)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">A carregar utilizadores...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhum utilizador encontrado nesta categoria.</td></tr>
                ) : (
                  filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">{userItem.name}</td>
                      <td className="p-4 text-sm">{userItem.email}</td>
                      <td className="p-4 text-sm">{userItem.data_nascimento || "N/D"}</td>
                      <td className="p-4">
                        <select
                          value={userItem.role || 'participant'}
                          onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 cursor-pointer outline-none font-medium"
                        >
                          <option value="participant">Participante (Aluno)</option>
                          <option value="creator">Criador</option>
                          <option value="manager">Gestor</option>
                          <option value="owner">Proprietário (Admin)</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}