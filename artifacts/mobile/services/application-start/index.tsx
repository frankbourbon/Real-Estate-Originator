import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Application Start phase data — one record per applicationId. */
export type AppStartRecord = {
  applicationId: string;
  updatedAt: string;
  applicationDepositAmountUsd: string;
  applicationDepositDate: string;
  signedLoiDate: string;
  debitAuthorizationDate: string;
  rateLockEnabled: boolean;
  rateLockRatePct: string;
  rateLockExpirationDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_app_start_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: AppStartRecord[] = [
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,3,8),
    signedLoiDate: ds(2026,3,2), debitAuthorizationDate: ds(2026,3,8),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "" },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,2,20),
    signedLoiDate: ds(2026,2,15), debitAuthorizationDate: ds(2026,2,20),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "" },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,5),
    signedLoiDate: ds(2026,2,3), debitAuthorizationDate: ds(2026,2,5),
    rateLockEnabled: true, rateLockRatePct: "7.10", rateLockExpirationDate: ds(2026,5,15) },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,20),
    signedLoiDate: ds(2026,1,15), debitAuthorizationDate: ds(2026,1,20),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,4,30) },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,12,18),
    signedLoiDate: ds(2025,12,15), debitAuthorizationDate: ds(2025,12,18),
    rateLockEnabled: true, rateLockRatePct: "7.45", rateLockExpirationDate: ds(2026,4,30) },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,11,25),
    signedLoiDate: ds(2025,11,20), debitAuthorizationDate: ds(2025,11,25),
    rateLockEnabled: true, rateLockRatePct: "5.95", rateLockExpirationDate: ds(2026,4,15) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,11,10),
    signedLoiDate: ds(2025,11,5), debitAuthorizationDate: ds(2025,11,10),
    rateLockEnabled: true, rateLockRatePct: "6.15", rateLockExpirationDate: ds(2026,4,1) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    applicationDepositAmountUsd: "75,000", applicationDepositDate: ds(2025,10,20),
    signedLoiDate: ds(2025,10,15), debitAuthorizationDate: ds(2025,10,20),
    rateLockEnabled: true, rateLockRatePct: "5.85", rateLockExpirationDate: ds(2026,4,1) },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,3,1),
    signedLoiDate: ds(2026,2,28), debitAuthorizationDate: ds(2026,3,1),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ApplicationStartServiceProvider, useApplicationStartService] = createContextHook(() => {
  const [records, setRecords] = useState<AppStartRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: AppStartRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateAppStart = useCallback((applicationId: string): AppStartRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), applicationDepositAmountUsd: "",
        applicationDepositDate: "", signedLoiDate: "", debitAuthorizationDate: "",
        rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "" };
  }, [records]);

  const updateAppStart = useCallback(async (applicationId: string, patch: Partial<AppStartRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), applicationDepositAmountUsd: "",
        applicationDepositDate: "", signedLoiDate: "", debitAuthorizationDate: "",
        rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "", ...patch,
      }]);
    }
  }, [records, persist]);

  const loadSeedData = useCallback(async () => { await persist(SEED_RECORDS); }, [persist]);
  const clearData = useCallback(async () => { await persist([]); }, [persist]);
  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return {
    loading,
    getOrCreateAppStart, updateAppStart,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ApplicationStartServiceProvider, useApplicationStartService };
