"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import LanguageSelector from "@/app/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { salvarDataNascimento } from "./actions";

export default function CompletarPerfil() {
  const { isLoaded } = useAuth();
  const { t } = useLanguage();

  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const dias = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

  const meses = [
    { valor: "01", nome: t("month_01") }, { valor: "02", nome: t("month_02") },
    { valor: "03", nome: t("month_03") }, { valor: "04", nome: t("month_04") },
    { valor: "05", nome: t("month_05") }, { valor: "06", nome: t("month_06") },
    { valor: "07", nome: t("month_07") }, { valor: "08", nome: t("month_08") },
    { valor: "09", nome: t("month_09") }, { valor: "10", nome: t("month_10") },
    { valor: "11", nome: t("month_11") }, { valor: "12", nome: t("month_12") }
  ];

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 100 }, (_, i) => String(anoAtual - 1 - i));

  let idade = null;
  if (dia && mes && ano) {
    const dataNascimento = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    const hoje = new Date();
    let calcIdade = hoje.getFullYear() - dataNascimento.getFullYear();
    const m = hoje.getMonth() - dataNascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
      calcIdade--;
    }
    idade = calcIdade;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dia || !mes || !ano) return;
    setLoading(true);
    setErrorMessage("");

    const dataFormatada = `${ano}-${mes}-${dia}`;

    try {
      const res = await salvarDataNascimento(dataFormatada);

      if (res.success) {
        // Redireciona com recarregamento completo para renovar os metadados de sessão
        window.location.href = "/dashboard/participant";
      } else {
        setErrorMessage(res.error || "Erro ao salvar perfil.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro na Server Action:", err);
      setErrorMessage("Erro de conexão ao salvar.");
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-[var(--foreground)] font-bold">
        {t("loading_auth")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300 relative">
      <div className="absolute top-6 right-6 z-50">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full bg-[var(--card-bg)] rounded-3xl p-8 shadow-2xl border border-[var(--card-border)] text-center transition-colors duration-300">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center overflow-hidden border border-purple-500/20">
          <img src="/logo-dark.jpeg" alt="Logo MenteAfiada" className="w-12 h-12 rounded-xl object-cover" />
        </div>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-8">
          {t("insert_birthdate_title")}
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="flex gap-4">
            {/* DIA */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--foreground)] opacity-80 mb-2">
                {t("day")}
              </label>
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                required
              >
                <option value="" disabled>{t("day")}</option>
                {dias.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* MÊS */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--foreground)] opacity-80 mb-2">
                {t("month")}
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                required
              >
                <option value="" disabled>{t("month")}</option>
                {meses.map((m) => <option key={m.valor} value={m.valor}>{m.nome}</option>)}
              </select>
            </div>

            {/* ANO */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--foreground)] opacity-80 mb-2">
                {t("year")}
              </label>
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                required
              >
                <option value="" disabled>{t("year")}</option>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {idade !== null && (
            <p className="text-[var(--foreground)] opacity-80 font-medium text-center bg-[var(--background)] py-3 rounded-xl border border-[var(--card-border)] shadow-inner">
              {t("your_age")}{" "}
              <span className="font-bold text-emerald-500">
                {idade} {t("years_old")}
              </span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !dia || !mes || !ano}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? t("saving_profile") : t("continue_btn")}
          </button>
        </form>
      </div>
    </div>
  );
}