/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/completar-perfil/page.js
 * Objetivo: Central Completa de Perfil, Identidade e Preferências do Usuário.
 * Funcionalidades:
 * - Cadastro e atualização da Data de Nascimento (obrigatório para validação
 *   etária e elegibilidade na Arena);
 * - Edição do Nome e Sobrenome exibidos nas salas ao vivo e nos rankings;
 * - Exibição do E-mail institucional e Cargo/Perfil de acesso atual;
 * - Preferências rápidas de Tema Visual (Claro, Escuro, NEON) e Efeitos Sonoros;
 * - Sincronização com ThemeProvider ("theme-classic", "theme-dark", "theme-synthwave").
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/app/components/ThemeProvider";
import { sounds } from "@/lib/soundEffects";
import { useLanguage } from "@/contexts/LanguageContext";

const PROFILE_STYLES = {
  "theme-classic": {
    mainBg: "bg-slate-50 text-slate-900",
    card: "bg-white border-slate-200 shadow-xl shadow-slate-200/60 text-slate-900",
    subBox: "bg-slate-50 border-slate-200 text-slate-900",
    input:
      "bg-slate-50 border-slate-300 text-slate-900 focus:ring-indigo-500",
    neutralBtn:
      "bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800",
    primaryBtn:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25",
  },
  "theme-dark": {
    mainBg: "bg-[#070b19] text-slate-100",
    card: "bg-slate-900/95 border-slate-800 shadow-2xl shadow-slate-950/60 text-slate-100",
    subBox: "bg-slate-950/80 border-slate-800 text-slate-100",
    input:
      "bg-slate-950 border-slate-800 text-slate-100 focus:ring-purple-500",
    neutralBtn:
      "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100",
    primaryBtn:
      "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40",
  },
  "theme-synthwave": {
    mainBg: "bg-[#03040c] text-cyan-50",
    card: "bg-[#090d22]/95 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.2)] text-cyan-50",
    subBox: "bg-[#040612]/90 border-cyan-500/30 text-cyan-50",
    input:
      "bg-[#040612] border-cyan-500/40 text-cyan-100 focus:ring-fuchsia-500",
    neutralBtn:
      "bg-[#0b0f26] border-cyan-500/40 hover:border-fuchsia-400 text-cyan-100",
    primaryBtn:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.45)]",
  },
};

export default function CompletarPerfilPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, themeInfo, cyclePlatformTheme } = useTheme();
  const { t, locale } = useLanguage();

  const styles = PROFILE_STYLES[theme] || PROFILE_STYLES["theme-classic"];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [institution, setInstitution] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: "", text: "" });

  // Carrega dados existentes do Clerk e preferências locais
  useEffect(() => {
    if (!isLoaded || !user) return;

    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");

    const existingBirth =
      user.unsafeMetadata?.birthDate ||
      user.unsafeMetadata?.birth_date ||
      user.publicMetadata?.birthDate ||
      "";
    setBirthDate(existingBirth);

    const existingInstitution =
      user.unsafeMetadata?.institution ||
      user.publicMetadata?.institution ||
      "";
    setInstitution(existingInstitution);

    const savedSfx = localStorage.getItem("sfx_enabled");
    if (savedSfx !== null) {
      setSoundEnabled(savedSfx !== "false");
    }
  }, [isLoaded, user]);

  // Calcula idade atual a partir da data de nascimento
  const calculateAge = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    const dob = new Date(dateStr + "T00:00:00");
    if (isNaN(dob.getTime())) return null;

    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const userRole =
    user?.publicMetadata?.role ||
    user?.unsafeMetadata?.role ||
    "participant";

  const getRoleBadge = (role) => {
    switch (role) {
      case "owner":
        return { label: t("profile_owner"), color: "text-amber-500 bg-amber-500/15 border-amber-500/30" };
      case "admin":
        return { label: t("profile_admin"), color: "text-purple-500 bg-purple-500/15 border-purple-500/30" };
      case "manager":
        return { label: t("profile_manager"), color: "text-indigo-500 bg-indigo-500/15 border-indigo-500/30" };
      case "creator":
      case "educator":
      case "teacher":
        return { label: t("profile_creator"), color: "text-cyan-500 bg-cyan-500/15 border-cyan-500/30" };
      default:
        return { label: t("profile_participant"), color: "text-emerald-500 bg-emerald-500/15 border-emerald-500/30" };
    }
  };

  const roleBadge = getRoleBadge(userRole);
  const computedAge = calculateAge(birthDate);

  const handleToggleSoundPreference = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
    if (next) sounds.playClick();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFeedbackMsg({ type: "", text: "" });

    if (!birthDate) {
      setFeedbackMsg({
        type: "error",
        text: "profile_birth_required",
      });
      return;
    }

    const age = calculateAge(birthDate);
    if (age === null || age < 5 || age > 120) {
      setFeedbackMsg({
        type: "error",
        text: "profile_birth_invalid",
      });
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      await user.update({
        firstName: firstName.trim() || user.firstName,
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...user.unsafeMetadata,
          birthDate,
          birth_date: birthDate,
          institution: institution.trim(),
        },
      });

      sounds.playCorrect();
      setFeedbackMsg({
        type: "success",
        text: "profile_saved",
      });
    } catch (err) {
      console.error("[Completar Perfil Error]:", err);
      setFeedbackMsg({
        type: "error",
        text: "profile_save_error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center ${styles.mainBg}`}
      >
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`min-h-[calc(100vh-70px)] flex items-center justify-center p-6 ${styles.mainBg}`}
      >
        <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 ${styles.card}`}>
          <h2 className="text-xl font-bold">{t("profile_restricted")}</h2>
          <p className="text-xs opacity-70">
            {t("profile_login")}
          </p>
          <Link
            href="/"
            className={`inline-block px-6 py-3 rounded-xl text-xs font-bold ${styles.primaryBtn}`}
          >
            {t("profile_home_short")}
          </Link>
        </div>
      </div>
    );
  }

  const primaryEmail =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    t("profile_email_missing");

  return (
    <div
      className={`min-h-[calc(100vh-70px)] font-sans py-10 px-6 transition-colors duration-300 ${styles.mainBg}`}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs font-bold opacity-70 hover:opacity-100 inline-flex items-center gap-1.5 mb-2"
            >
              <span>←</span>
              <span>{t("profile_home")}</span>
            </Link>
            <h1 className="text-3xl font-extrabold flex items-center gap-2.5">
              <span>⚙️</span> {t("profile_title")}
            </h1>
            <p className="text-xs opacity-75 mt-1">
              {t("profile_intro")}
            </p>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-full border text-xs font-extrabold self-start sm:self-auto ${roleBadge.color}`}
          >
            {roleBadge.label}
          </span>
        </div>

        {/* Cartão Principal */}
        <div className={`border rounded-3xl p-6 md:p-8 space-y-6 ${styles.card}`}>
          {/* Resumo da Conta */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${styles.subBox}`}
          >
            <img
              src={user.imageUrl}
              alt={firstName || "Avatar"}
              className="w-16 h-16 rounded-full border-2 border-purple-500/50 object-cover shadow"
            />
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-lg font-extrabold truncate">
                {firstName} {lastName}
              </h2>
              <p className="text-xs opacity-70 truncate">{primaryEmail}</p>
              <p className="text-[10px] font-mono opacity-50 mt-1 truncate">
                ID: {user.id}
              </p>
            </div>
          </div>

          {feedbackMsg.text && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                  : "bg-rose-500/10 border-rose-500/40 text-rose-500"
              }`}
            >
              {t(feedbackMsg.text)}
            </div>
          )}

          {/* Formulário de Dados Cadastrais */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  {t("profile_first_name")}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("profile_first_hint")}
                  className={`w-full border rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 ${styles.input}`}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  {t("profile_last_name")}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("profile_last_hint")}
                  className={`w-full border rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 ${styles.input}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  {t("profile_birth_date")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 ${styles.input}`}
                  required
                />
                {computedAge !== null && (
                  <span className="text-[11px] text-emerald-500 font-bold mt-1 block">
                    {t("profile_age", { age: computedAge.toLocaleString(locale) })}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold opacity-80 block mb-1.5">
                  {t("profile_institution")}
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder={t("profile_institution_hint")}
                  className={`w-full border rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 ${styles.input}`}
                />
              </div>
            </div>

            {/* Preferências de Interface e Áudio */}
            <div className="pt-4 border-t border-inherit space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider opacity-75">
                {t("profile_preferences")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${styles.subBox}`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">
                      {t("profile_theme")}
                    </span>
                    <span className="text-[11px] opacity-70">
                      {themeInfo.icon} {t(theme.replace("-", "_"))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cyclePlatformTheme}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${styles.neutralBtn}`}
                  >
                    {t("profile_toggle")}
                  </button>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${styles.subBox}`}
                >
                  <div>
                    <span className="text-xs font-extrabold block">
                      {t("profile_sound")}
                    </span>
                    <span className="text-[11px] opacity-70">
                      {soundEnabled ? t("profile_sound_on") : t("profile_sound_off")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSoundPreference}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${styles.neutralBtn}`}
                  >
                    {soundEnabled ? t("profile_disable") : t("profile_enable")}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl border text-xs font-bold cursor-pointer transition ${styles.neutralBtn}`}
              >
                {t("profile_cancel")}
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition disabled:opacity-50 ${styles.primaryBtn}`}
              >
                {saving ? t("profile_saving") : t("profile_save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
