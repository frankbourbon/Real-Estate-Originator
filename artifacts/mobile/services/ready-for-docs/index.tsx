import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Ready for Docs phase data — one record per applicationId. */
export type ReadyForDocsRecord = {
  applicationId: string;
  updatedAt: string;
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceEffectiveDate: string;
  titleCompany: string;
  escrowCompany: string;
  floodZoneDesignation: string;
  titleReportDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_ready_for_docs_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ReadyForDocsRecord[] = [
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    insuranceCarrier: "Chubb Insurance Company", insurancePolicyNumber: "CHB-2026-0078341",
    insuranceEffectiveDate: ds(2026,4,10), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "First American Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,10) },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    insuranceCarrier: "Travelers Property Casualty", insurancePolicyNumber: "TRV-2026-0041829",
    insuranceEffectiveDate: ds(2026,3,28), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,20) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    insuranceCarrier: "Liberty Mutual Insurance", insurancePolicyNumber: "LM-2026-0095214",
    insuranceEffectiveDate: ds(2026,3,26), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "Chicago Title Insurance Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,1) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    insuranceCarrier: "AIG Property Casualty", insurancePolicyNumber: "AIG-2026-0013488",
    insuranceEffectiveDate: ds(2026,3,24), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,12) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ReadyForDocsServiceProvider, useReadyForDocsService] = createContextHook(() => {
  const [records, setRecords] = useState<ReadyForDocsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ReadyForDocsRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateRFD = useCallback((applicationId: string): ReadyForDocsRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), insuranceCarrier: "", insurancePolicyNumber: "",
        insuranceEffectiveDate: "", titleCompany: "", escrowCompany: "",
        floodZoneDesignation: "", titleReportDate: "" };
  }, [records]);

  const updateRFD = useCallback(async (applicationId: string, patch: Partial<ReadyForDocsRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), insuranceCarrier: "", insurancePolicyNumber: "",
        insuranceEffectiveDate: "", titleCompany: "", escrowCompany: "",
        floodZoneDesignation: "", titleReportDate: "", ...patch,
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
    getOrCreateRFD, updateRFD,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ReadyForDocsServiceProvider, useReadyForDocsService };
