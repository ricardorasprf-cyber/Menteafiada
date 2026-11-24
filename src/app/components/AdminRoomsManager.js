"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_KEYS = {
  AGUARDANDO: "owner_room_waiting",
  EM_ANDAMENTO: "owner_room_running",
  FINALIZADO: "owner_room_finished",
};

export default function AdminRoomsManager() {
  const { t, locale } = useLanguage();
  const formatNumber = (value) => Number(value || 0).toLocaleString(locale);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("TODAS"); // TODAS | ATIVAS | LEGADO
  const [purging, setPurging] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Estados da Política de Retenção Automática
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState(true);
  const [autoPurgeDays, setAutoPurgeDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);

  // Carrega as configurações salvas no banco
  const fetchRetentionSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "retention_policy")
        .single();

      if (!error && data?.value) {
        setAutoPurgeEnabled(data.value.enabled ?? true);
        setAutoPurgeDays(data.value.days ?? 7);
      }
    } catch (err) {
      console.error("Erro ao carregar configurações de retenção:", err);
    }
  };

  // Salva alterações na política de retenção
  const handleSaveRetentionPolicy = async (newEnabled, newDays) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "retention_policy",
          value: { enabled: newEnabled, days: Number(newDays) },
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Erro ao salvar configuração:", error);
        alert(t("owner_retention_error"));
      }
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      alert(t("owner_retention_error"));
    } finally {
      setSavingSettings(false);
    }
  };

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
    fetchRetentionSettings();
    fetchSessions();

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
    if (!confirm(t("owner_close_confirm"))) return;

    setActionLoadingId(sessionId);
    const { error } = await supabase
      .from("game_sessions")
      .update({ status: "FINALIZADO" })
      .eq("id", sessionId);

    if (error) {
      console.error("Erro ao encerrar sala:", error);
      alert(t("owner_close_error"));
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: "FINALIZADO" } : s))
      );
    }
    setActionLoadingId(null);
  };

  // Excluir sala individualmente
  const handleDeleteSession = async (sessionId, pin) => {
    if (!confirm(t("owner_delete_room_confirm", { pin }))) return;

    setActionLoadingId(sessionId);
    const { error } = await supabase
      .from("game_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Erro ao excluir sala:", error);
      alert(t("owner_delete_room_error"));
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
    setActionLoadingId(null);
  };

  // Executar a rotina de exclusão manual pontual
  const handlePurgeLegacy = async () => {
    const days = prompt(t("owner_purge_prompt"), autoPurgeDays.toString());
    if (days === null) return;

    setPurging(true);
    const { data: count, error } = await supabase.rpc("purge_legacy_sessions", {
      days_old: parseInt(days, 10) || 1,
    });

    if (error) {
      console.error("Erro ao executar limpeza:", error);
      alert(t("owner_purge_error"));
    } else {
      alert(t("owner_purge_done", { count: formatNumber(count) }));
      fetchSessions();
    }
    setPurging(false);
  };

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
        <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl flex flex-col justify-center">
          <span className="text-xs text-[var(--foreground)] opacity-70 font-semibold block">{t("owner_active_rooms")}</span>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-1">{formatNumber(activeCount)}</p>
        </div>

        <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl flex flex-col justify-center">
          <span className="text-xs text-[var(--foreground)] opacity-70 font-semibold block">{t("owner_archived_rooms")}</span>
          <p className="text-2xl font-black text-amber-500 font-mono mt-1">{formatNumber(legacyCount)}</p>
        </div>

        {/* Card de Configuração de Automação de Retenção */}
        <div className="p-4 bg-[var(--background)] border border-rose-500/30 bg-rose-500/5 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-rose-500 font-bold block flex items-center gap-1.5">
                ⚙️ {t("owner_retention")}
              </span>
              <span className="text-[11px] text-[var(--foreground)] opacity-60">
                {t(savingSettings ? "saving" : "owner_auto_purge")}
              </span>
            </div>

            {/* Toggle Ativar / Desativar */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label={t("owner_auto_purge")}
                checked={autoPurgeEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoPurgeEnabled(val);
                  handleSaveRetentionPolicy(val, autoPurgeDays);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-[var(--foreground)] opacity-80 whitespace-nowrap">
              {t("owner_delete_after")}
            </span>
            <select
              aria-label={t("owner_delete_after")}
              disabled={!autoPurgeEnabled}
              value={autoPurgeDays}
              onChange={(e) => {
                const days = Number(e.target.value);
                setAutoPurgeDays(days);
                handleSaveRetentionPolicy(autoPurgeEnabled, days);
              }}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer disabled:opacity-40"
            >
              <option value={1}>{t("owner_one_day")}</option>
              <option value={2}>{t("owner_days", { count: formatNumber(2) })}</option>
              <option value={3}>{t("owner_days", { count: formatNumber(3) })}</option>
              <option value={7}>{t("owner_one_week")}</option>
              <option value={15}>{t("owner_days", { count: formatNumber(15) })}</option>
              <option value={30}>{t("owner_one_month")}</option>
            </select>

            <button
              onClick={handlePurgeLegacy}
              disabled={purging}
              title={t("owner_purge")}
              className="ml-auto py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-lg shadow transition cursor-pointer disabled:opacity-50"
            >
              {purging ? t("owner_purging") : `🧹 ${t("owner_purge")}`}
            </button>
          </div>
        </div>
      </div>

      {/* Controles de Filtros e Tabela */}
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
              {opt === "TODAS" && `${t("owner_rooms_all")} (${formatNumber(sessions.length)})`}
              {opt === "ATIVAS" && `${t("owner_rooms_active")} (${formatNumber(activeCount)})`}
              {opt === "LEGADO" && `${t("owner_rooms_legacy")} (${formatNumber(legacyCount)})`}
            </button>
          ))}
        </div>

        <button
          onClick={fetchSessions}
          className="text-xs bg-[var(--background)] border border-[var(--card-border)] px-3 py-1.5 rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
        >
          🔄 {t("owner_refresh_rooms")}
        </button>
      </div>

      {/* Tabela de Sessões */}
      <div className="overflow-x-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-[var(--foreground)] opacity-70 bg-slate-900/40">
              <th className="p-4 font-bold">PIN</th>
              <th className="p-4 font-bold">{t("arena_quiz")}</th>
              <th className="p-4 font-bold">{t("owner_status")}</th>
              <th className="p-4 font-bold">{t("owner_type")}</th>
              <th className="p-4 font-bold">{t("owner_players")}</th>
              <th className="p-4 font-bold">{t("owner_created_at")}</th>
              <th className="p-4 font-bold text-right">{t("owner_room_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 opacity-50">
                  {t("owner_rooms_loading")}
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 opacity-50">
                  {t("owner_rooms_empty")}
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
                      {session.quizzes?.title || t("owner_default_quiz")}
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
                        {STATUS_KEYS[session.status] ? t(STATUS_KEYS[session.status]) : session.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {session.is_public ? (
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          ⚔️ {t("arena_nav")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">🔒 {t("owner_private")}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">{formatNumber(playersCount)}</td>
                    <td className="p-4 opacity-70">
                      {new Date(session.created_at).toLocaleString(locale, {
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
                          title={t("owner_close_room_now")}
                        >
                          {t("owner_close_room")}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(session.id, session.pin)}
                        disabled={actionLoadingId === session.id}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                        title={t("owner_delete_room_title")}
                      >
                        {t("owner_delete")}
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
