/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/lib/planLimits.js
 * Objetivo: Fonte única de verdade (Single Source of Truth) para regras de
 * conformidade, cotas e limitações de cada perfil comercial:
 *   - `free` (Explorador Grátis / participant)
 *   - `student_pro` (Aluno Pro)
 *   - `creator_pro` (Professor / Criador Pro)
 *   - `institutional` (Institucional / Manager)
 *   - `owner` (Proprietário / Admin)
 * ============================================================================
 */

export const PLAN_LIMITS = {
  free: {
    key: "free",
    label: "Explorador (Grátis)",
    badgeColor: "slate",
    maxQuizzes: 3,
    maxQuestionsPerQuiz: 10,
    canUseAiGenerator: false,
    maxAiQuestionsPerRequest: 0,
    canImportBulk: false,
    maxPlayersPerRoom: 15,
    canCreateCourses: false,
    maxCourses: 0,
    hasProCoursesAccess: false,
    canAccessManagerPanel: false,
    canAccessOwnerPanel: false,
  },
  student_pro: {
    key: "student_pro",
    label: "Aluno Pro",
    badgeColor: "indigo",
    maxQuizzes: 15,
    maxQuestionsPerQuiz: 25,
    canUseAiGenerator: true,
    maxAiQuestionsPerRequest: 10,
    canImportBulk: true,
    maxPlayersPerRoom: 40,
    canCreateCourses: false,
    maxCourses: 0,
    hasProCoursesAccess: true,
    canAccessManagerPanel: false,
    canAccessOwnerPanel: false,
  },
  creator_pro: {
    key: "creator_pro",
    label: "Professor / Criador Pro",
    badgeColor: "purple",
    maxQuizzes: Infinity,
    maxQuestionsPerQuiz: 100,
    canUseAiGenerator: true,
    maxAiQuestionsPerRequest: 30,
    canImportBulk: true,
    maxPlayersPerRoom: 200,
    canCreateCourses: true,
    maxCourses: 20,
    hasProCoursesAccess: true,
    canAccessManagerPanel: false,
    canAccessOwnerPanel: false,
  },
  institutional: {
    key: "institutional",
    label: "Institucional (Gestor)",
    badgeColor: "emerald",
    maxQuizzes: Infinity,
    maxQuestionsPerQuiz: 200,
    canUseAiGenerator: true,
    maxAiQuestionsPerRequest: 40,
    canImportBulk: true,
    maxPlayersPerRoom: 500,
    canCreateCourses: true,
    maxCourses: Infinity,
    hasProCoursesAccess: true,
    canAccessManagerPanel: true,
    canAccessOwnerPanel: false,
  },
  owner: {
    key: "owner",
    label: "Proprietário (Master)",
    badgeColor: "amber",
    maxQuizzes: Infinity,
    maxQuestionsPerQuiz: Infinity,
    canUseAiGenerator: true,
    maxAiQuestionsPerRequest: 50,
    canImportBulk: true,
    maxPlayersPerRoom: Infinity,
    canCreateCourses: true,
    maxCourses: Infinity,
    hasProCoursesAccess: true,
    canAccessManagerPanel: true,
    canAccessOwnerPanel: true,
  },
};

/**
 * Resolve o plano efetivo combinando `role` e `planTier` do Clerk/Supabase.
 * Garante compatibilidade retroativa com perfis antigos (`participant`, `creator`, `admin`).
 */
export function resolveUserPlan(role, planTier) {
  const normalizedRole = String(role || "").toLowerCase().trim();
  const normalizedTier = String(planTier || "").toLowerCase().trim();

  if (
    normalizedRole === "owner" ||
    normalizedRole === "admin" ||
    normalizedTier === "owner"
  ) {
    return PLAN_LIMITS.owner;
  }
  if (normalizedRole === "manager" || normalizedTier === "institutional") {
    return PLAN_LIMITS.institutional;
  }
  if (
    normalizedRole === "creator_pro" ||
    normalizedRole === "creator" ||
    normalizedTier === "creator_pro"
  ) {
    return PLAN_LIMITS.creator_pro;
  }
  if (normalizedRole === "student_pro" || normalizedTier === "student_pro") {
    return PLAN_LIMITS.student_pro;
  }

  return PLAN_LIMITS.free;
}

/**
 * Formata limites numéricos para exibição amigável na UI ("Ilimitado" quando Infinity)
 */
export function formatLimitValue(value) {
  return value === Infinity ? "Ilimitado" : String(value);
}
