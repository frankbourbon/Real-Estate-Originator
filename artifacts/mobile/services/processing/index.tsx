import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnvironmentalStatus = "" | "Ordered" | "In Progress" | "Clear" | "Issues Found";
export type BorrowerFormsStatus = "" | "Not Started" | "Packaged" | "Sent for Signature" | "Received";

/** Application Processing phase data — one record per applicationId. */
export type ProcessingRecord = {
  applicationId: string;
  updatedAt: string;
  appraisalOrderedDate: string;
  appraisalCompletedDate: string;
  appraisalValueUsd: string;
  environmentalStatus: EnvironmentalStatus;
  borrowerFormsStatus: BorrowerFormsStatus;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_processing_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ProcessingRecord[] = [
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    appraisalOrderedDate: ds(2026,3,1), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    appraisalOrderedDate: ds(2026,2,8), appraisalCompletedDate: ds(2026,3,5),
    appraisalValueUsd: "25,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    appraisalOrderedDate: ds(2026,1,22), appraisalCompletedDate: ds(2026,2,18),
    appraisalValueUsd: "15,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    appraisalOrderedDate: ds(2026,1,5), appraisalCompletedDate: ds(2026,2,10),
    appraisalValueUsd: "52,000,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    appraisalOrderedDate: ds(2025,12,1), appraisalCompletedDate: ds(2026,1,12),
    appraisalValueUsd: "53,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    appraisalOrderedDate: ds(2025,11,12), appraisalCompletedDate: ds(2025,12,20),
    appraisalValueUsd: "30,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    appraisalOrderedDate: ds(2025,10,22), appraisalCompletedDate: ds(2025,12,5),
    appraisalValueUsd: "76,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    appraisalOrderedDate: ds(2026,3,5), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "Ordered", borrowerFormsStatus: "Packaged" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ProcessingServiceProvider, useProcessingService] = createContextHook(() => {
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ProcessingRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateProcessing = useCallback((applicationId: string): ProcessingRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), appraisalOrderedDate: "",
        appraisalCompletedDate: "", appraisalValueUsd: "",
        environmentalStatus: "", borrowerFormsStatus: "" };
  }, [records]);

  const updateProcessing = useCallback(async (applicationId: string, patch: Partial<ProcessingRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), appraisalOrderedDate: "",
        appraisalCompletedDate: "", appraisalValueUsd: "",
        environmentalStatus: "" as EnvironmentalStatus,
        borrowerFormsStatus: "" as BorrowerFormsStatus, ...patch,
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
    getOrCreateProcessing, updateProcessing,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ProcessingServiceProvider, useProcessingService };
