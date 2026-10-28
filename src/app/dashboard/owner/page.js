"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserMenu from "@/app/components/UserMenu";
import { useUser } from "@clerk/nextjs";
import AdminRoomsManager from "@/app/components/AdminRoomsManager";

export default function OwnerDashboard() {
  const { user } = useUser();
  const userName = user?.firstName || "Admin";

  // Controle de Seção Principal: 'perfis' ou 'salas'
  const [currentSection, setCurrentSection] = useState("perfis");

  // Estados dos Usuários
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
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
    const targetUser = users.find((u) => u.id === userId);

    // Otimisticamente atualiza o estado da UI
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    // 1. Atualiza no Supabase
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (dbError) {
      console.error("Erro ao atualizar perfil no Supabase:", dbError);
      alert("Erro ao atualizar o perfil. Tente novamente.");
      fetchUsers();
      return;
    }

    // 2. Sincroniza com os metadados do Clerk para validar no middleware
    const targetClerkId = targetUser?.clerk_id || targetUser?.id;

    if (targetClerkId) {
      try {
        const res = await fetch("/api/admin/update-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetClerkId,
            newRole,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.warn("Aviso ao sincronizar cargo no Clerk:", errData?.error);
        }
      } catch (err) {
        console.error("Falha na chamada de sincronização com o Clerk:", err);
      }
    }
  };

  // Peso de ordenação por cargo: Proprietário -> Criador -> Gestor -> Participante
  const rolePriority = {
    owner: 1,
    creator: 2,
    manager: 3,
    participant: 4,
  };

  // Filtragem e Ordenação Hierárquica
  const filteredUsers = users
    .filter((u) => {
      if (activeTab === "all") return true;
      const role = u.role || "participant";
      return role === activeTab;
    })
    .sort((a, b) => {
      const priorityA = rolePriority[a.role || "participant"] || 5;
      const priorityB = rolePriority[b.role || "participant"] || 5;
      return priorityA - priorityB;
    });

  // Cálculo de faixa etária protegida (Princípio da Minimização - LGPD)
  const formatAgeFromBirthdate = (dateString) => {
    if (!dateString) return "N/D";
    const birth = new Date(dateString);
    if (isNaN(birth.getTime())) return "N/D";

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Contadores para as abas
  const counts = {
    all: users.length,
    owner: users.filter((u) => u.role === "owner").length,
    creator: users.filter((u) => u.role === "creator").length,
    manager: users.filter((u) => u.role === "manager").length,
    participant: users.filter((u) => !u.role || u.role === "participant").length,
  };

  // Ordem reordenada das abas: Proprietários -> Criadores -> Gestores -> Participantes
  const tabs = [
    { id: "all", label: "Todos", count: counts.all, icon: "📋" },
    { id: "owner", label: "Proprietários", count: counts.owner, icon: "👑" },
    { id: "creator", label: "Criadores", count: counts.creator, icon: "🎨" },
    { id: "manager", label: "Gestores", count: counts.manager, icon: "🏢" },
    { id: "participant", label: "Participantes", count: counts.participant, icon: "🎓" },
  ];

  // Formatação Condicional das Linhas
  const getRoleRowStyle = (role) => {
    const currentRole = role || "participant";
    switch (currentRole) {
      case "owner":
        return "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-500";
      case "creator":
        return "bg-purple-500/10 hover:bg-purple-500/15 border-l-4 border-purple-500";
      case "manager":
        return "bg-blue-500/10 hover:bg-blue-500/15 border-l-4 border-blue-500";
      case "participant":
      default:
        return "bg-emerald-500/10 hover:bg-emerald-500/15 border-l-4 border-emerald-500";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans transition-colors duration-300">
      <header className="bg-slate-900 pb-20 pt-6 px-6">
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

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Painel de Controle do Proprietário</h1>
              <p className="text-slate-400 text-sm">
                Gerencie perfis, monitore partidas em tempo real e execute manutenções de legado.
              </p>
            </div>

            {/* Alternador de Módulos (Perfis vs Salas) */}
            <div className="flex bg-slate-800/90 border border-slate-700 p-1.5 rounded-2xl gap-1">
              <button
                onClick={() => setCurrentSection("perfis")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  currentSection === "perfis"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>👥</span> Gestão de Perfis
              </button>

              <button
                onClick={() => setCurrentSection("salas")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  currentSection === "salas"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🎮</span> Salas & Legado
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-20 relative z-10">
        
        {/* SEÇÃO 1: GESTÃO DE PERFIS */}
        {currentSection === "perfis" && (
          <div className="space-y-6">
            {/* NAVEGAÇÃO POR ABAS NA NOVA ORDEM */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                      <th className="p-4 font-semibold">Idade (LGPD)</th>
                      <th className="p-4 font-semibold">Cargo (Role)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">
                          A carregar utilizadores...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">
                          Nenhum utilizador encontrado nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((userItem) => (
                        <tr
                          key={userItem.id}
                          className={`transition-all ${getRoleRowStyle(userItem.role)}`}
                        >
                          <td className="p-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                            <span>
                              {userItem.role === "owner" && "👑"}
                              {userItem.role === "creator" && "🎨"}
                              {userItem.role === "manager" && "🏢"}
                              {(!userItem.role || userItem.role === "participant") && "🎓"}
                            </span>
                            {userItem.name}
                          </td>
                          <td className="p-4 text-sm">{userItem.email}</td>
                          <td className="p-4 text-sm font-medium">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs">
                              {formatAgeFromBirthdate(userItem.data_nascimento)}
                            </span>
                          </td>
                          <td className="p-4">
                            <select
                              value={userItem.role || "participant"}
                              onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                              className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 cursor-pointer outline-none font-bold backdrop-blur-sm"
                            >
                              <option value="owner">👑 Proprietário (Admin)</option>
                              <option value="creator">🎨 Criador</option>
                              <option value="manager">🏢 Gestor</option>
                              <option value="participant">🎓 Participante (Aluno)</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: GESTÃO DE SALAS & LEGADO */}
        {currentSection === "salas" && (
          <div className="space-y-4">
            <AdminRoomsManager />
          </div>
        )}

      </main>
    </div>
  );
}