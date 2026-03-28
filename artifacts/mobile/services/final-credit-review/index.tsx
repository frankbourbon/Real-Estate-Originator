import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Final Credit Review record — one per applicationId. Created lazily. */
export type FCRRecord = {
  applicationId: string;
  commitmentLetterRecommended: boolean;
  commitmentLetterIssuedDate: string;
  updatedAt: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  records: "svc_fcr_v1",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Context ──────────────────────────────────────────────────────────────────

const [FinalCreditReviewServiceProvider, useFinalCreditReviewService] = createContextHook(() => {
  const [records, setRecords] = useState<FCRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEYS.records).then((r) => {
      if (r) setRecords(JSON.parse(r));
      setLoading(false);
    });
  }, []);

  const persistRecords = useCallback(async (data: FCRRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEYS.records, JSON.stringify(data));
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

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await persistRecords(SEED_RECORDS);
  }, [persistRecords]);

  const clearData = useCallback(async () => {
    await persistRecords([]);
  }, [persistRecords]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persistRecords(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persistRecords]);

  return {
    loading,
    getOrCreateFCR, updateFCR,
    loadSeedData, clearData, clearForApplication,
  };
});

export { FinalCreditReviewServiceProvider, useFinalCreditReviewService };
