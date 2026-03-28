import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConditionStatus = "Pending" | "Satisfied" | "Waived";
export type ConditionAppliesTo = "Borrower" | "Property" | "Application";
export type ExceptionStatus = "Pending Approval" | "Approved" | "Denied";

export type ApprovalAuthorityLevel =
  | "W1" | "W2" | "W3" | "W4" | "W5" | "W6" | "W7" | "W8" | "W9" | "W10"
  | "W11" | "W12" | "W13" | "W14" | "W15" | "W16" | "W17" | "W18" | "W19" | "W20"
  | "W21" | "W22" | "W23" | "W24" | "W25" | "W26" | "W27" | "W28" | "W29" | "W30";

export const APPROVAL_LEVELS: ApprovalAuthorityLevel[] = Array.from(
  { length: 30 }, (_, i) => `W${i + 1}` as ApprovalAuthorityLevel
);

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

export type Exception = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  exceptionType: string;
  description: string;
  status: ExceptionStatus;
  approvalAuthorityLevel: ApprovalAuthorityLevel;
  phaseAddedAt: string;
  createdByPersona: string;
  approvedBy: string;
  approvedAt: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  conditions: "svc_conditions_v1",
  exceptions: "svc_exceptions_v1",
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

const SEED_EXCEPTIONS: Exception[] = [
  { id: "seed_exc_01", applicationId: "seed_a05", createdAt: d(2026,3,19), updatedAt: d(2026,3,19),
    exceptionType: "Rate Structure", status: "Approved", approvalAuthorityLevel: "W15",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Priya Nair (CRO)", approvedAt: d(2026,3,19),
    description: "Floating rate (SOFR + 175bps) requested in lieu of fixed rate. Justified by value-add business plan with expected refinance within 36 months at stabilization." },
  { id: "seed_exc_02", applicationId: "seed_a06", createdAt: d(2026,1,10), updatedAt: d(2026,3,10),
    exceptionType: "Concentration Risk", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Application Processing", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,3,10),
    description: "Single-tenant concentration exception for NNN office asset. Mitigated by creditworthy tech tenant covenant and borrower net worth of $31M providing strong recourse support." },
  { id: "seed_exc_03", applicationId: "seed_a07", createdAt: d(2026,2,15), updatedAt: d(2026,2,22),
    exceptionType: "Asset Class", status: "Approved", approvalAuthorityLevel: "W20",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Credit Committee (2/22/2026)", approvedAt: d(2026,2,22),
    description: "Hotel/hospitality asset class exception. Policy restricts hospitality to <10% of portfolio. Exception supported by strong post-renovation ADR ($285), RevPAR ($215), and trailing 12-month NOI." },
  { id: "seed_exc_04", applicationId: "seed_a07", createdAt: d(2026,2,15), updatedAt: d(2026,2,28),
    exceptionType: "IO Structure", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,2,28),
    description: "Interest-only structure for hospitality asset. Policy requires amortization on hotel loans. IO approved for full 5-year term given strong DSCR of 1.32x on IO basis." },
  { id: "seed_exc_05", applicationId: "seed_a09", createdAt: d(2026,1,15), updatedAt: d(2026,1,20),
    exceptionType: "IO Structure", status: "Approved", approvalAuthorityLevel: "W8",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,1,20),
    description: "Interest-only structure for retail asset. IO approved for 7-year term given all-national-credit tenant roster, 100% occupancy, and DSCR of 1.55x on IO basis." },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ConditionsServiceProvider, useConditionsService] = createContextHook(() => {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.conditions),
      AsyncStorage.getItem(KEYS.exceptions),
    ]).then(([c, e]) => {
      if (c) setConditions(JSON.parse(c));
      if (e) setExceptions(JSON.parse(e));
      setLoading(false);
    });
  }, []);

  const persistConditions = useCallback(async (data: Condition[]) => {
    setConditions(data);
    await AsyncStorage.setItem(KEYS.conditions, JSON.stringify(data));
  }, []);

  const persistExceptions = useCallback(async (data: Exception[]) => {
    setExceptions(data);
    await AsyncStorage.setItem(KEYS.exceptions, JSON.stringify(data));
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

  // ── Exceptions ─────────────────────────────────────────────────────────────

  const getExceptions = useCallback((applicationId: string) =>
    exceptions.filter((e) => e.applicationId === applicationId), [exceptions]);

  const addException = useCallback(async (
    applicationId: string,
    data: Omit<Exception, "id" | "applicationId" | "createdAt" | "updatedAt">
  ): Promise<Exception> => {
    const exc: Exception = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
    await persistExceptions([...exceptions, exc]);
    return exc;
  }, [exceptions, persistExceptions]);

  const updateException = useCallback(async (id: string, patch: Partial<Exception>) => {
    await persistExceptions(exceptions.map((e) => e.id === id ? { ...e, ...patch, updatedAt: now() } : e));
  }, [exceptions, persistExceptions]);

  const deleteException = useCallback(async (id: string) => {
    await persistExceptions(exceptions.filter((e) => e.id !== id));
  }, [exceptions, persistExceptions]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistConditions(SEED_CONDITIONS),
      persistExceptions(SEED_EXCEPTIONS),
    ]);
  }, [persistConditions, persistExceptions]);

  const clearData = useCallback(async () => {
    await Promise.all([persistConditions([]), persistExceptions([])]);
  }, [persistConditions, persistExceptions]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistConditions(conditions.filter((c) => c.applicationId !== applicationId)),
      persistExceptions(exceptions.filter((e) => e.applicationId !== applicationId)),
    ]);
  }, [conditions, exceptions, persistConditions, persistExceptions]);

  return {
    loading,
    getConditions, addCondition, updateCondition, deleteCondition,
    getExceptions, addException, updateException, deleteException,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ConditionsServiceProvider, useConditionsService };
