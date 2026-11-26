"use client";

import { useEffect, useState } from "react";
import { resolveUserPlan } from "@/lib/planLimits";

export function usePixPlan(userId, role, tier) {
  const plan = resolveUserPlan(role, tier);
  const [access, setAccess] = useState(null);
  const eligible = plan.key === "free" || plan.key === "student_pro";

  useEffect(() => {
    if (!userId || !eligible) return;
    const controller = new AbortController();
    fetch("/api/payments/pix", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setAccess({ userId, until: data?.accessUntil }))
      .catch(() => {});
    return () => controller.abort();
  }, [eligible, userId]);

  return eligible && access?.userId === userId && access?.until
    ? resolveUserPlan(role, "creator_pro") : plan;
}
