/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/VisitsAnalyticsPanel.js
 * Objetivo: Painel modular de Controle e Auditoria de Visitações do portal
 * (menteafiada.vercel.app), exibindo:
 * - Total Geral de Acessos, Acessos Autenticados (Logins), Acessos Anônimos
 *   e Usuários Únicos Logados;
 * - Ranking detalhado de quantidade de visitas por cada login autenticado;
 * - Pesquisa instantânea por nome/e-mail e exportação em CSV.
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";

const PANEL_STYLES = {
  "theme-classic": {
    card: "bg-white border-slate-200 shadow-lg shadow-slate-200/50 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-900",
    input: "bg-slate-50 border-slate-300 text-slate-900 focus:ring-indigo-500",
    tableHeader: "bg-slate-100 text-slate-600 border-slate-200",
    tableRow: "border-slate-100 hover:bg-slate-50",
    refreshBtn:
      "bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800",
  },
  "theme-dark": {
    card: "bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-100",
    input: "bg-slate-950 border-slate-800 text-slate-100 focus:ring-purple-500",
    tableHeader: "bg-slate-950/70 text-slate-400 border-slate-800",
    tableRow: "border-slate-800/80 hover:bg-slate-800/40",
    refreshBtn:
      "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100",
  },
  "theme-synthwave": {
    card: "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_35px_rgba(217,70,239,0.18)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-50",
    input: "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500",
    tableHeader: "bg-[#040612] text-cyan-300/80 border-fuchsia-500/25",
    tableRow: "border-indigo-500/20 hover:bg-fuchsia-500/10",
    refreshBtn:
      "bg-[#0b0f26] border-cyan-500/40 hover:border-fuchsia-400 text-cyan-100",
  },
};

function visitClerkIds(visit) {
  return visit.clerk_ids ?? [visit.clerk_id];
}

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^\s*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function VisitsAnalyticsPanel() {
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const formatNumber = (value) => Number(value || 0).toLocaleString(locale);
  const styles = PANEL_STYLES[theme] || PANEL_STYLES["theme-classic"];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [metrics, setMetrics] = useState({
    totalVisits: 0,
    authenticatedVisits: 0,
    anonymousVisits: 0,
    uniqueLoggedUsers: 0,
    updatedAt: null,
  });
  const [usersList, setUsersList] = useState([]);
  const [onlineIds, setOnlineIds] = useState(() => new Set());

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/analytics/visits", { cache: "no-store" });
      if (res.status === 403) {
        setLoadError("owner_visit_denied");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (Array.isArray(data.users)) setUsersList(data.users);
    } catch (err) {
      setLoadError("owner_visit_error");
      console.error("[VisitsAnalyticsPanel] Erro ao consultar visitações:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadVisits();
    });
    return () => {
      cancelled = true;
    };
  }, [loadVisits]);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    async function loadPresence() {
      if (document.visibilityState !== "visible" || pending) return;
      pending = true;
      try {
        const res = await fetch("/api/analytics/visits?presence=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { onlineIds } = await res.json();
        if (!controller.signal.aborted) setOnlineIds(new Set(onlineIds));
      } catch {
        if (!controller.signal.aborted) setOnlineIds(new Set());
      } finally {
        pending = false;
      }
    }

    loadPresence();
    const interval = window.setInterval(loadPresence, 15_000);
    document.addEventListener("visibilitychange", loadPresence);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadPresence);
    };
  }, []);

  const handleExportCSV = () => {
    if (usersList.length === 0) {
      alert(t("owner_visit_export_empty"));
      return;
    }

    const header = [
      t("arena_rank"), t("owner_visit_user_name"), t("owner_email"), "Clerk IDs",
      t("owner_visit_count"), t("owner_visit_last"),
    ];

    const rows = usersList.map((u, idx) => {
      const lastDate = u.last_visited_at
        ? new Date(u.last_visited_at).toLocaleString(locale)
        : "";
      return [
        idx + 1, u.user_name, u.user_email, visitClerkIds(u).join(", "),
        u.visit_count, lastDate,
      ];
    });

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    link.setAttribute(
      "download",
      `MenteAfiada_Visitacoes_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredUsers = usersList.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      String(u.user_name || "")
        .toLowerCase()
        .includes(q) ||
      String(u.user_email || "")
        .toLowerCase()
        .includes(q) ||
      visitClerkIds(u).some((id) => id?.toLowerCase().includes(q))
    );
  });

  return (
    <section className={`border rounded-3xl p-6 md:p-8 space-y-6 ${styles.card}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-inherit pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
            {t("owner_visit_audit")} • MENTEAFIADA.VERCEL.APP
          </span>
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 mt-0.5">
            <span>📈</span> {t("owner_visit_title")}
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            {t("owner_visit_intro")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadVisits}
          disabled={loading}
          className={`px-4 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer self-start md:self-auto ${styles.refreshBtn}`}
        >
          🔄 {t("owner_visit_refresh")}
        </button>
      </div>

      {loadError && (
        <p role="alert" className={`rounded-xl border p-4 text-sm font-semibold ${styles.subBox}`}>
          {t(loadError)}
        </p>
      )}

      <div className={loadError ? "hidden" : "space-y-6"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border space-y-1 ${styles.subBox}`}>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block">
            {t("owner_visit_total")}
          </span>
          <p className="text-3xl font-mono font-black text-indigo-500">
            {loading ? "..." : formatNumber(metrics.totalVisits)}
          </p>
          <span className="text-[11px] opacity-70 block">
            {t("owner_visit_total_desc")}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border space-y-1 ${styles.subBox}`}>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block">
            {t("owner_visit_signed_in")}
          </span>
          <p className="text-3xl font-mono font-black text-emerald-500">
            {loading
              ? "..."
              : formatNumber(metrics.authenticatedVisits)}
          </p>
          <span className="text-[11px] opacity-70 block">
            {t("owner_visit_signed_desc")}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border space-y-1 ${styles.subBox}`}>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block">
            {t("owner_visit_anonymous")}
          </span>
          <p className="text-3xl font-mono font-black text-amber-500">
            {loading ? "..." : formatNumber(metrics.anonymousVisits)}
          </p>
          <span className="text-[11px] opacity-70 block">
            {t("owner_visit_anonymous_desc")}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border space-y-1 ${styles.subBox}`}>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block">
            {t("owner_visit_unique")}
          </span>
          <p className="text-3xl font-mono font-black text-purple-500">
            {loading
              ? "..."
              : formatNumber(metrics.uniqueLoggedUsers)}
          </p>
          <span className="text-[11px] opacity-70 block">
            {t("owner_visit_unique_desc")}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wider">
          👤 {t("owner_visit_by_user")} ({formatNumber(filteredUsers.length)})
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={t("owner_visit_filter")}
            placeholder={t("owner_visit_filter")}
            className={`border rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 ${styles.input}`}
          />

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow cursor-pointer"
          >
            📊 {t("owner_visit_export")}
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="py-10 text-center space-y-2 opacity-70">
          <span className="text-3xl block">📊</span>
          <p className="text-xs font-bold">
            {loading
              ? t("owner_visit_loading")
              : t("owner_visit_empty")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] uppercase font-bold tracking-wider ${styles.tableHeader}`}
              >
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">{t("owner_visit_user_name")}</th>
                <th className="py-3 px-3">{t("owner_email")}</th>
                <th className="py-3 px-3 text-center">{t("owner_visit_count")}</th>
                <th className="py-3 px-3 text-right">{t("owner_visit_last")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item, idx) => (
                <tr
                  key={item.clerk_id}
                  className={`border-b transition ${styles.tableRow}`}
                >
                  <td className="py-3 px-3 font-mono font-bold opacity-60">
                    {formatNumber(idx + 1)}
                  </td>
                  <td className="py-3 px-3 font-extrabold">
                    {visitClerkIds(item).some((id) => onlineIds.has(id)) && (
                      <span
                        role="img"
                        aria-label={t("owner_visit_online")}
                        title={t("owner_visit_online")}
                        className="mr-1.5 inline-block size-2 rounded-full bg-emerald-500"
                      />
                    )}
                    {item.user_name || t("owner_visit_authenticated")}
                    <span className="block text-[10px] font-mono font-normal opacity-50">
                      {visitClerkIds(item).join(", ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 opacity-85">
                    {item.user_email || "—"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 font-mono font-black text-xs">
                      {t("owner_visit_quantity", { count: formatNumber(item.visit_count) })}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono opacity-80 whitespace-nowrap">
                    {formatDateTime(item.last_visited_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </section>
  );
}

export default VisitsAnalyticsPanel;
