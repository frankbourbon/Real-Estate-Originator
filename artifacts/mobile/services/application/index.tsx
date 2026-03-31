import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnvironmentalStatus = "" | "Ordered" | "In Progress" | "Clear" | "Issues Found";
export type BorrowerFormsStatus = "" | "Not Started" | "Packaged" | "Sent for Signature" | "Received";

/**
 * Application MS — covers Application Start and Application Processing stages.
 * Both stages are owned by the same team and progress sequentially.
 * One record per applicationId.
 */
export type ApplicationRecord = {
  applicationId: string;
  updatedAt: string;
  // ── Application Start ──
  applicationDepositAmountUsd: string;
  applicationDepositDate: string;
  signedLoiDate: string;
  debitAuthorizationDate: string;
  rateLockEnabled: boolean;
  rateLockRatePct: string;
  rateLockExpirationDate: string;
  // ── Application Processing ──
  appraisalOrderedDate: string;
  appraisalCompletedDate: string;
  appraisalValueUsd: string;
  environmentalStatus: EnvironmentalStatus;
  borrowerFormsStatus: BorrowerFormsStatus;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_application_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Empty record factory ─────────────────────────────────────────────────────

function emptyRecord(applicationId: string): ApplicationRecord {
  return {
    applicationId, updatedAt: now(),
    applicationDepositAmountUsd: "", applicationDepositDate: "",
    signedLoiDate: "", debitAuthorizationDate: "",
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "",
  };
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ApplicationRecord[] = [
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,3,8),
    signedLoiDate: ds(2026,3,2), debitAuthorizationDate: ds(2026,3,8),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,2,20),
    signedLoiDate: ds(2026,2,15), debitAuthorizationDate: ds(2026,2,20),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,3,1), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,5),
    signedLoiDate: ds(2026,2,3), debitAuthorizationDate: ds(2026,2,5),
    rateLockEnabled: true, rateLockRatePct: "7.10", rateLockExpirationDate: ds(2026,5,15),
    appraisalOrderedDate: ds(2026,2,8), appraisalCompletedDate: ds(2026,3,5),
    appraisalValueUsd: "25,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,20),
    signedLoiDate: ds(2026,1,15), debitAuthorizationDate: ds(2026,1,20),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,4,30),
    appraisalOrderedDate: ds(2026,1,22), appraisalCompletedDate: ds(2026,2,18),
    appraisalValueUsd: "15,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,12,18),
    signedLoiDate: ds(2025,12,15), debitAuthorizationDate: ds(2025,12,18),
    rateLockEnabled: true, rateLockRatePct: "7.45", rateLockExpirationDate: ds(2026,4,30),
    appraisalOrderedDate: ds(2026,1,5), appraisalCompletedDate: ds(2026,2,10),
    appraisalValueUsd: "52,000,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,11,25),
    signedLoiDate: ds(2025,11,20), debitAuthorizationDate: ds(2025,11,25),
    rateLockEnabled: true, rateLockRatePct: "5.95", rateLockExpirationDate: ds(2026,4,15),
    appraisalOrderedDate: ds(2025,12,1), appraisalCompletedDate: ds(2026,1,12),
    appraisalValueUsd: "53,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,11,10),
    signedLoiDate: ds(2025,11,5), debitAuthorizationDate: ds(2025,11,10),
    rateLockEnabled: true, rateLockRatePct: "6.15", rateLockExpirationDate: ds(2026,4,1),
    appraisalOrderedDate: ds(2025,11,12), appraisalCompletedDate: ds(2025,12,20),
    appraisalValueUsd: "30,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    applicationDepositAmountUsd: "75,000", applicationDepositDate: ds(2025,10,20),
    signedLoiDate: ds(2025,10,15), debitAuthorizationDate: ds(2025,10,20),
    rateLockEnabled: true, rateLockRatePct: "5.85", rateLockExpirationDate: ds(2026,4,1),
    appraisalOrderedDate: ds(2025,10,22), appraisalCompletedDate: ds(2025,12,5),
    appraisalValueUsd: "76,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,3,1),
    signedLoiDate: ds(2026,2,28), debitAuthorizationDate: ds(2026,3,1),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,3,5), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "Ordered", borrowerFormsStatus: "Packaged" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ApplicationServiceProvider, useApplicationService] = createContextHook(() => {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ApplicationRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateApplication = useCallback((applicationId: string): ApplicationRecord => {
    return records.find((r) => r.applicationId === applicationId) ?? emptyRecord(applicationId);
  }, [records]);

  const updateApplication = useCallback(async (applicationId: string, patch: Partial<ApplicationRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, { ...emptyRecord(applicationId), ...patch }]);
    }
  }, [records, persist]);

  const loadSeedData = useCallback(async () => { await persist(SEED_RECORDS); }, [persist]);
  const clearData = useCallback(async () => { await persist([]); }, [persist]);
  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return {
    loading,
    getOrCreateApplication, updateApplication,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ApplicationServiceProvider, useApplicationService };
