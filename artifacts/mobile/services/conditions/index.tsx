import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConditionStatus = "Pending" | "Satisfied" | "Waived";
export type ConditionAppliesTo = "Borrower" | "Property" | "Application";

export type Condition = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  conditionType: string;
  description: string;
  status: ConditionStatus;
  appliesTo: ConditionAppliesTo;
  phaseAddedAt: string;
  createdByPersona: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  conditions: "svc_conditions_v2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CONDITIONS: Condition[] = [
  { id: "seed_cond_01", applicationId: "seed_a05", createdAt: d(2026,1,20), updatedAt: d(2026,3,18),
    conditionType: "Financial Covenant", status: "Pending", appliesTo: "Application",
    phaseAddedAt: "Letter of Interest", createdByPersona: "Credit Risk",
    description: "Borrower to maintain minimum DSCR of 1.25x on a trailing 12-month basis." },
  { id: "seed_cond_02", applicationId: "seed_a05", createdAt: d(2026,1,20), updatedAt: d(2026,3,18),
    conditionType: "Financial Covenant", status: "Pending", appliesTo: "Borrower",
    phaseAddedAt: "Letter of Interest", createdByPersona: "Credit Risk",
    description: "Borrower must maintain a minimum liquidity reserve of $500,000 at all times." },
  { id: "seed_cond_03", applicationId: "seed_a05", createdAt: d(2026,2,5), updatedAt: d(2026,3,18),
    conditionType: "Financial Covenant", status: "Pending", appliesTo: "Borrower",
    phaseAddedAt: "Application Start", createdByPersona: "Credit Risk",
    description: "No additional debt to be incurred without prior written lender consent." },
  { id: "seed_cond_04", applicationId: "seed_a06", createdAt: d(2026,1,20), updatedAt: d(2026,3,10),
    conditionType: "Legal Documentation", status: "Pending", appliesTo: "Property",
    phaseAddedAt: "Application Start", createdByPersona: "Credit Risk",
    description: "Borrower to provide final executed lease abstract from tenant prior to closing." },
  { id: "seed_cond_05", applicationId: "seed_a06", createdAt: d(2026,3,10), updatedAt: d(2026,3,10),
    conditionType: "Insurance", status: "Pending", appliesTo: "Application",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Processing",
    description: "Borrower insurance policy must be bound and in full effect at or before closing date." },
  { id: "seed_cond_06", applicationId: "seed_a07", createdAt: d(2025,12,1), updatedAt: d(2026,3,15),
    conditionType: "Financial Covenant", status: "Pending", appliesTo: "Application",
    phaseAddedAt: "Letter of Interest", createdByPersona: "Credit Risk",
    description: "Borrower to maintain DSCR ≥ 1.25x on a trailing 12-month basis throughout loan term." },
  { id: "seed_cond_07", applicationId: "seed_a07", createdAt: d(2026,2,28), updatedAt: d(2026,3,15),
    conditionType: "Account Control", status: "Pending", appliesTo: "Borrower",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower's primary operating account for the property must be maintained at JPMorgan Chase." },
  { id: "seed_cond_08", applicationId: "seed_a07", createdAt: d(2026,2,28), updatedAt: d(2026,3,15),
    conditionType: "Collateral", status: "Pending", appliesTo: "Application",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower to pledge 100% of equity interests in the property-owning entity as additional collateral." },
  { id: "seed_cond_09", applicationId: "seed_a08", createdAt: d(2025,11,20), updatedAt: d(2026,2,5),
    conditionType: "Legal Documentation", status: "Satisfied", appliesTo: "Application",
    phaseAddedAt: "Application Start", createdByPersona: "Credit Risk",
    description: "Borrower to provide a fully executed purchase and sale agreement prior to commitment." },
  { id: "seed_cond_10", applicationId: "seed_a08", createdAt: d(2025,11,20), updatedAt: d(2026,3,18),
    conditionType: "Title", status: "Satisfied", appliesTo: "Property",
    phaseAddedAt: "Application Start", createdByPersona: "Closing Team",
    description: "Title search must confirm no recorded liens, encumbrances, or adverse matters on the property." },
  { id: "seed_cond_11", applicationId: "seed_a08", createdAt: d(2026,2,5), updatedAt: d(2026,3,18),
    conditionType: "Financial Reserve", status: "Pending", appliesTo: "Borrower",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower reserves of 3 months PITIA to be funded and escrowed at closing." },
  { id: "seed_cond_12", applicationId: "seed_a09", createdAt: d(2026,1,15), updatedAt: d(2026,3,14),
    conditionType: "Lease Documentation", status: "Satisfied", appliesTo: "Property",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower to provide current rent roll executed by all tenants prior to docs being drawn." },
  { id: "seed_cond_13", applicationId: "seed_a09", createdAt: d(2026,1,15), updatedAt: d(2026,3,14),
    conditionType: "Legal Documentation", status: "Satisfied", appliesTo: "Application",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower to provide SNDA agreements from all tenants prior to loan closing." },
  { id: "seed_cond_14", applicationId: "seed_a10", createdAt: d(2026,1,8), updatedAt: d(2026,3,17),
    conditionType: "Legal Documentation", status: "Satisfied", appliesTo: "Application",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    description: "Borrower to provide fully executed and recorded deed of trust prior to disbursement." },
  { id: "seed_cond_15", applicationId: "seed_a10", createdAt: d(2026,1,8), updatedAt: d(2026,3,17),
    conditionType: "Title", status: "Satisfied", appliesTo: "Property",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Closing Team",
    description: "Lender's counsel to confirm no adverse title matters and issue title insurance commitment." },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ConditionsServiceProvider, useConditionsService] = createContextHook(() => {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEYS.conditions).then((c) => {
      if (c) setConditions(JSON.parse(c));
      setLoading(false);
    });
  }, []);

  const persistConditions = useCallback(async (data: Condition[]) => {
    setConditions(data);
    await AsyncStorage.setItem(KEYS.conditions, JSON.stringify(data));
  }, []);

  // ── Conditions ─────────────────────────────────────────────────────────────

  const getConditions = useCallback((applicationId: string) =>
    conditions.filter((c) => c.applicationId === applicationId), [conditions]);

  const addCondition = useCallback(async (
    applicationId: string,
    data: Omit<Condition, "id" | "applicationId" | "createdAt" | "updatedAt">
  ): Promise<Condition> => {
    const cond: Condition = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
    await persistConditions([...conditions, cond]);
    return cond;
  }, [conditions, persistConditions]);

  const updateCondition = useCallback(async (id: string, patch: Partial<Condition>) => {
    await persistConditions(conditions.map((c) => c.id === id ? { ...c, ...patch, updatedAt: now() } : c));
  }, [conditions, persistConditions]);

  const deleteCondition = useCallback(async (id: string) => {
    await persistConditions(conditions.filter((c) => c.id !== id));
  }, [conditions, persistConditions]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await persistConditions(SEED_CONDITIONS);
  }, [persistConditions]);

  const clearData = useCallback(async () => {
    await persistConditions([]);
  }, [persistConditions]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persistConditions(conditions.filter((c) => c.applicationId !== applicationId));
  }, [conditions, persistConditions]);

  return {
    loading,
    getConditions, addCondition, updateCondition, deleteCondition,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ConditionsServiceProvider, useConditionsService };
