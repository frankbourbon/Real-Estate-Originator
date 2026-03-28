import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Docs Back phase data — one record per applicationId. */
export type DocsBackRecord = {
  applicationId: string;
  updatedAt: string;
  docsBackDate: string;
  titleConfirmationDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_docs_back_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: DocsBackRecord[] = [
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    docsBackDate: ds(2026,3,20), titleConfirmationDate: ds(2026,3,20) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    docsBackDate: ds(2026,3,17), titleConfirmationDate: ds(2026,3,17) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [DocsBackServiceProvider, useDocsBackService] = createContextHook(() => {
  const [records, setRecords] = useState<DocsBackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: DocsBackRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateDocsBack = useCallback((applicationId: string): DocsBackRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), docsBackDate: "", titleConfirmationDate: "" };
  }, [records]);

  const updateDocsBack = useCallback(async (applicationId: string, patch: Partial<DocsBackRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), docsBackDate: "", titleConfirmationDate: "", ...patch,
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
    getOrCreateDocsBack, updateDocsBack,
    loadSeedData, clearData, clearForApplication,
  };
});

export { DocsBackServiceProvider, useDocsBackService };
