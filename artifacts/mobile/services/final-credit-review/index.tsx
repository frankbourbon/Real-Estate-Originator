import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FCRRecord = {
  applicationId: string;
  commitmentLetterRecommended: boolean;
  commitmentLetterIssuedDate: string;
  updatedAt: string;
};

export type ExceptionStatus = "Pending Approval" | "Approved" | "Denied";

export type ApprovalAuthorityLevel =
  | "W1" | "W2" | "W3" | "W4" | "W5" | "W6" | "W7" | "W8" | "W9" | "W10"
  | "W11" | "W12" | "W13" | "W14" | "W15" | "W16" | "W17" | "W18" | "W19" | "W20"
  | "W21" | "W22" | "W23" | "W24" | "W25" | "W26" | "W27" | "W28" | "W29" | "W30";

export const APPROVAL_LEVELS: ApprovalAuthorityLevel[] = Array.from(
  { length: 30 }, (_, i) => `W${i + 1}` as ApprovalAuthorityLevel
);

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
  records:    "svc_fcr_v2",
  exceptions: "svc_exceptions_v2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: FCRRecord[] = [
  { applicationId: "seed_a05", updatedAt: d(2026,3,19), commitmentLetterRecommended: false, commitmentLetterIssuedDate: "" },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,10) },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,28) },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,5) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,15) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,8) },
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

const [FinalCreditReviewServiceProvider, useFinalCreditReviewService] = createContextHook(() => {
  const [records, setRecords] = useState<FCRRecord[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.records),
      AsyncStorage.getItem(KEYS.exceptions),
    ]).then(([r, e]) => {
      if (r) setRecords(JSON.parse(r));
      if (e) setExceptions(JSON.parse(e));
      setLoading(false);
    });
  }, []);

  const persistRecords = useCallback(async (data: FCRRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEYS.records, JSON.stringify(data));
  }, []);

  const persistExceptions = useCallback(async (data: Exception[]) => {
    setExceptions(data);
    await AsyncStorage.setItem(KEYS.exceptions, JSON.stringify(data));
  }, []);

  // ── FCR Record ─────────────────────────────────────────────────────────────

  const getOrCreateFCR = useCallback((applicationId: string): FCRRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, commitmentLetterRecommended: false, commitmentLetterIssuedDate: "", updatedAt: now() };
  }, [records]);

  const updateFCR = useCallback(async (applicationId: string, patch: Partial<FCRRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persistRecords(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persistRecords([...records, {
        applicationId,
        commitmentLetterRecommended: false,
        commitmentLetterIssuedDate: "",
        updatedAt: now(),
        ...patch,
      }]);
    }
  }, [records, persistRecords]);

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
      persistRecords(SEED_RECORDS),
      persistExceptions(SEED_EXCEPTIONS),
    ]);
  }, [persistRecords, persistExceptions]);

  const clearData = useCallback(async () => {
    await Promise.all([persistRecords([]), persistExceptions([])]);
  }, [persistRecords, persistExceptions]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistRecords(records.filter((r) => r.applicationId !== applicationId)),
      persistExceptions(exceptions.filter((e) => e.applicationId !== applicationId)),
    ]);
  }, [records, exceptions, persistRecords, persistExceptions]);

  return {
    loading,
    getOrCreateFCR, updateFCR,
    getExceptions, addException, updateException, deleteException,
    loadSeedData, clearData, clearForApplication,
  };
});

export { FinalCreditReviewServiceProvider, useFinalCreditReviewService };
