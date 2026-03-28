import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Docs Drawn phase data — one record per applicationId. */
export type DocsDrawnRecord = {
  applicationId: string;
  updatedAt: string;
  docsDrawnDate: string;
  settlementFeesUsd: string;
  settlementStatementDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_docs_drawn_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: DocsDrawnRecord[] = [
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    docsDrawnDate: ds(2026,3,18), settlementFeesUsd: "48,500", settlementStatementDate: ds(2026,3,18) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    docsDrawnDate: ds(2026,3,14), settlementFeesUsd: "32,500", settlementStatementDate: ds(2026,3,14) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    docsDrawnDate: ds(2026,3,10), settlementFeesUsd: "82,000", settlementStatementDate: ds(2026,3,10) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [DocsDrawnServiceProvider, useDocsDrawnService] = createContextHook(() => {
  const [records, setRecords] = useState<DocsDrawnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: DocsDrawnRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateDocsDrawn = useCallback((applicationId: string): DocsDrawnRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "" };
  }, [records]);

  const updateDocsDrawn = useCallback(async (applicationId: string, patch: Partial<DocsDrawnRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), docsDrawnDate: "", settlementFeesUsd: "",
        settlementStatementDate: "", ...patch,
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
    getOrCreateDocsDrawn, updateDocsDrawn,
    loadSeedData, clearData, clearForApplication,
  };
});

export { DocsDrawnServiceProvider, useDocsDrawnService };
