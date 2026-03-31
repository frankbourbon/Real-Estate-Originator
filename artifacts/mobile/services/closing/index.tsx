import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Closing MS — covers all closing stages: Pre-Close, Ready for Docs,
 * Docs Drawn, Docs Back, and Closing (wire & servicing).
 * One record per applicationId.
 */
export type ClosingRecord = {
  applicationId: string;
  updatedAt: string;
  // ── Pre-Close ──
  hmdaComplete: boolean;
  hmdaNotes: string;
  // ── Ready for Docs ──
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceEffectiveDate: string;
  titleCompany: string;
  escrowCompany: string;
  floodZoneDesignation: string;
  titleReportDate: string;
  // ── Docs Drawn ──
  docsDrawnDate: string;
  settlementFeesUsd: string;
  settlementStatementDate: string;
  // ── Docs Back ──
  docsBackDate: string;
  titleConfirmationDate: string;
  // ── Closing / Wire & Servicing ──
  wireAmountUsd: string;
  wireBankName: string;
  wireAbaNumber: string;
  wireAccountNumber: string;
  servicingLoanNumber: string;
  bookingDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_closing_v3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Empty record factory ─────────────────────────────────────────────────────

function emptyRecord(applicationId: string): ClosingRecord {
  return {
    applicationId, updatedAt: now(),
    hmdaComplete: false, hmdaNotes: "",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "",
    wireAccountNumber: "", servicingLoanNumber: "", bookingDate: "",
  };
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ClosingRecord[] = [
  {
    applicationId: "seed_a06", updatedAt: d(2026,3,20),
    hmdaComplete: false, hmdaNotes: "HMDA LAR fields 90% complete — still need census tract code and action taken date.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "",
  },
  {
    applicationId: "seed_a07", updatedAt: d(2026,3,15),
    hmdaComplete: true, hmdaNotes: "HMDA complete. All LAR fields verified 3/12.",
    insuranceCarrier: "Chubb Insurance Company", insurancePolicyNumber: "CHB-2026-0078341",
    insuranceEffectiveDate: ds(2026,4,10), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "First American Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,10),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "",
  },
  {
    applicationId: "seed_a08", updatedAt: d(2026,3,18),
    hmdaComplete: true, hmdaNotes: "HMDA LAR complete and validated 2/28.",
    insuranceCarrier: "Travelers Property Casualty", insurancePolicyNumber: "TRV-2026-0041829",
    insuranceEffectiveDate: ds(2026,3,28), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,20),
    docsDrawnDate: ds(2026,3,18), settlementFeesUsd: "48,500", settlementStatementDate: ds(2026,3,18),
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "",
  },
  {
    applicationId: "seed_a09", updatedAt: d(2026,3,20),
    hmdaComplete: true, hmdaNotes: "Complete.",
    insuranceCarrier: "Liberty Mutual Insurance", insurancePolicyNumber: "LM-2026-0095214",
    insuranceEffectiveDate: ds(2026,3,26), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "Chicago Title Insurance Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,1),
    docsDrawnDate: ds(2026,3,14), settlementFeesUsd: "32,500", settlementStatementDate: ds(2026,3,14),
    docsBackDate: ds(2026,3,20), titleConfirmationDate: ds(2026,3,20),
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "",
  },
  {
    applicationId: "seed_a10", updatedAt: d(2026,3,21),
    hmdaComplete: true, hmdaNotes: "HMDA complete 1/15.",
    insuranceCarrier: "AIG Property Casualty", insurancePolicyNumber: "AIG-2026-0013488",
    insuranceEffectiveDate: ds(2026,3,24), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,12),
    docsDrawnDate: ds(2026,3,10), settlementFeesUsd: "82,000", settlementStatementDate: ds(2026,3,10),
    docsBackDate: ds(2026,3,17), titleConfirmationDate: ds(2026,3,17),
    wireAmountUsd: "41,682,000", wireBankName: "JPMorgan Chase Bank, N.A.",
    wireAbaNumber: "021000021", wireAccountNumber: "****4471",
    servicingLoanNumber: "JPM-CRE-2026-041600", bookingDate: ds(2026,3,24),
  },
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
    return records.find((r) => r.applicationId === applicationId) ?? emptyRecord(applicationId);
  }, [records]);

  const updateClosing = useCallback(async (applicationId: string, patch: Partial<ClosingRecord>) => {
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
    getOrCreateClosing, updateClosing,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ClosingServiceProvider, useClosingService };
