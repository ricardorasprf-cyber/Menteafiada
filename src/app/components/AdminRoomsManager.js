"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminRoomsManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("TODAS"); // TODAS | ATIVAS | LEGADO
  const [purging, setPurging] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .select(`
          id,
          pin,
          status,
          is_public,
          created_at,
          host_id,
          quiz_id,
          quizzes (title),
          game_players (count)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSessions(data);
      }
    } catch (err) {
      console.error("Erro ao carregar sessões no painel admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Cria um canal com identificador único para evitar conflitos de ciclo de vida
    const channelId = `admin-rooms-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions" },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Forçar encerramento imediato de sala ativa
  const handleForceCloseSession = async (sessionId) => {
    if (!confirm("Deseja realmente forçar o encerramento imediato desta sala?")) return;

    setActionLoadingId(sessionId);
    const { error } = await supabase
      .from("game_sessions")
      .update({ status: "FINALIZADO" })
      .eq("id", sessionId);

    if (error) {
      alert("Erro ao encerrar sala: " + error.message);
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: "FINALIZADO" } : s))
      );
    }
    setActionLoadingId(null);
  };

  // Excluir sala individualmente
  const handleDeleteSession = async (sessionId, pin) => {
    if (!confirm(`Tem certeza que deseja apagar permanentemente a sala PIN ${pin}? Todos os dados atrelados serão removidos.`)) return;

    setActionLoadingId(sessionId);
    const { error } = await supabase
      .from("game_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      alert("Erro ao excluir sala: " + error.message);
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
    setActionLoadingId(null);
  };

  // Executar a rotina de exclusão de legado (Salas finalizadas > 7 dias ou abandonadas)
  const handlePurgeLegacy = async () => {
    const days = prompt("Expurgar salas finalizadas com mais de quantos dias? (Padrão: 7)", "7");
    if (days === null) return;

    setPurging(true);
    const { data: count, error } = await supabase.rpc("purge_legacy_sessions", {
      days_old: parseInt(days, 10) || 7,
    });

    if (error) {
      alert("Erro ao executar limpeza: " + error.message);
    } else {
      alert(`Limpeza concluída! ${count || 0} salas legadas foram eliminadas.`);
      fetchSessions();
    }
    setPurging(false);
  };

  // Filtros
  const filteredSessions = sessions.filter((s) => {
    if (filter === "ATIVAS") return s.status === "AGUARDANDO" || s.status === "EM_ANDAMENTO";
    if (filter === "LEGADO") return s.status === "FINALIZADO";
    return true;
  });

  const activeCount = sessions.filter((s) => s.status !== "FINALIZADO").length;
  const legacyCount = sessions.filter((s) => s.status === "FINALIZADO").length;

  return (
    <div className="space-y-6">
      {/* Barra de Ações & Estatísticas de Salas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl">
          <span className="text-xs text-[var(--foreground)] opacity-70 font-semibold block">Salas Ativas (Em Aberto)</span>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-1">{activeCount}</p>
        </div>

        <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl">
          <span className="text-xs text-[var(--foreground)] opacity-70 font-semibold block">Salas em Legado (Finalizadas)</span>
          <p className="text-2xl font-black text-amber-500 font-mono mt-1">{legacyCount}</p>
        </div>

        <div className="p-4 bg-[var(--background)] border border-rose-500/20 bg-rose-500/5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-rose-500 font-bold block">Política de Retenção</span>
            <span className="text-[11px] text-[var(--foreground)] opacity-60">Expurgo de dados obsoletos</span>
          </div>
          <button
            onClick={handlePurgeLegacy}
            disabled={purging}
            className="mt-2 w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50"
          >
            {purging ? "Limpando..." : "🧹 Executar Limpeza de Legado"}
          </button>
        </div>
      </div>

      {/* Controles de Tabela */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {["TODAS", "ATIVAS", "LEGADO"].map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                filter === opt
                  ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                  : "bg-[var(--background)] border-[var(--card-border)] text-[var(--foreground)] opacity-70 hover:opacity-100"
              }`}
            >
              {opt === "TODAS" && `Todas (${sessions.length})`}
              {opt === "ATIVAS" && `Ativas (${activeCount})`}
              {opt === "LEGADO" && `Legado (${legacyCount})`}
            </button>
          ))}
        </div>

        <button
          onClick={fetchSessions}
          className="text-xs bg-[var(--background)] border border-[var(--card-border)] px-3 py-1.5 rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
        >
          🔄 Atualizar Lista
        </button>
      </div>

      {/* Tabela de Salas */}
      <div className="overflow-x-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-[var(--foreground)] opacity-70 bg-slate-900/40">
              <th className="p-4 font-bold">PIN</th>
              <th className="p-4 font-bold">Quiz</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Tipo</th>
              <th className="p-4 font-bold">Jogadores</th>
              <th className="p-4 font-bold">Criada em</th>
              <th className="p-4 font-bold text-right">Ações de Gestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 opacity-50">
                  Carregando sessões...
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 opacity-50">
                  Nenhuma sessão localizada neste filtro.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => {
                const playersCount = session.game_players?.[0]?.count || 0;
                const isFinished = session.status === "FINALIZADO";

                return (
                  <tr key={session.id} className="hover:bg-[var(--background)] transition">
                    <td className="p-4 font-mono font-bold text-amber-500">{session.pin}</td>
                    <td className="p-4 font-bold text-[var(--foreground)] max-w-xs truncate">
                      {session.quizzes?.title || "Quiz Padrão"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          session.status === "EM_ANDAMENTO"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse"
                            : session.status === "AGUARDANDO"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {session.is_public ? (
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          ⚔️ Arena
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">🔒 Privada</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">{playersCount}</td>
                    <td className="p-4 opacity-70">
                      {new Date(session.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {!isFinished && (
                        <button
                          onClick={() => handleForceCloseSession(session.id)}
                          disabled={actionLoadingId === session.id}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                          title="Encerra a sala imediatamente"
                        >
                          Encerrar
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(session.id, session.pin)}
                        disabled={actionLoadingId === session.id}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        title="Exclui definitivamente a sessão e registros atrelados"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}