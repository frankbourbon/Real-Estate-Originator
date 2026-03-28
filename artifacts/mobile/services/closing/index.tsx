import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Closing phase data — one record per applicationId. */
export type ClosingRecord = {
  applicationId: string;
  updatedAt: string;
  wireAmountUsd: string;
  wireBankName: string;
  wireAbaNumber: string;
  wireAccountNumber: string;
  servicingLoanNumber: string;
  bookingDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_closing_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ClosingRecord[] = [
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    wireAmountUsd: "41,682,000", wireBankName: "JPMorgan Chase Bank, N.A.",
    wireAbaNumber: "021000021", wireAccountNumber: "****4471",
    servicingLoanNumber: "JPM-CRE-2026-041600", bookingDate: ds(2026,3,24) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ClosingServiceProvider, useClosingService] = createContextHook(() => {
  const [records, setRecords] = useState<ClosingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ClosingRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateClosing = useCallback((applicationId: string): ClosingRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), wireAmountUsd: "", wireBankName: "",
        wireAbaNumber: "", wireAccountNumber: "", servicingLoanNumber: "", bookingDate: "" };
  }, [records]);

  const updateClosing = useCallback(async (applicationId: string, patch: Partial<ClosingRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), wireAmountUsd: "", wireBankName: "",
        wireAbaNumber: "", wireAccountNumber: "", servicingLoanNumber: "", bookingDate: "", ...patch,
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
    getOrCreateClosing, updateClosing,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ClosingServiceProvider, useClosingService };
