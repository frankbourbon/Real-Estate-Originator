import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Pre-close phase data — one record per applicationId. */
export type PreCloseRecord = {
  applicationId: string;
  updatedAt: string;
  hmdaComplete: boolean;
  hmdaNotes: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_pre_close_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: PreCloseRecord[] = [
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    hmdaComplete: false, hmdaNotes: "HMDA LAR fields 90% complete — still need census tract code and action taken date." },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    hmdaComplete: true, hmdaNotes: "HMDA complete. All LAR fields verified 3/12." },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    hmdaComplete: true, hmdaNotes: "HMDA LAR complete and validated 2/28." },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    hmdaComplete: true, hmdaNotes: "Complete." },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    hmdaComplete: true, hmdaNotes: "HMDA complete 1/15." },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [PreCloseServiceProvider, usePreCloseService] = createContextHook(() => {
  const [records, setRecords] = useState<PreCloseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: PreCloseRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreatePreClose = useCallback((applicationId: string): PreCloseRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), hmdaComplete: false, hmdaNotes: "" };
  }, [records]);

  const updatePreClose = useCallback(async (applicationId: string, patch: Partial<PreCloseRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, { applicationId, updatedAt: now(), hmdaComplete: false, hmdaNotes: "", ...patch }]);
    }
  }, [records, persist]);

  const loadSeedData = useCallback(async () => { await persist(SEED_RECORDS); }, [persist]);
  const clearData = useCallback(async () => { await persist([]); }, [persist]);
  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return {
    loading,
    getOrCreatePreClose, updatePreClose,
    loadSeedData, clearData, clearForApplication,
  };
});

export { PreCloseServiceProvider, usePreCloseService };
