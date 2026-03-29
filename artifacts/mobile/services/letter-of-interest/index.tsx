import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Letter of Interest phase data — one record per applicationId. */
export type LOIRecord = {
  applicationId: string;
  updatedAt: string;
  creditBoxNotes: string;
  loiRecommended: boolean;
  loiIssuedDate: string;
  loiExpirationDate: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_loi_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: LOIRecord[] = [
  { applicationId: "seed_a02", updatedAt: d(2026,3,5),
    creditBoxNotes: "Deal fits credit box well. Cap rate of 5.2% aligns with market. Anchor tenant NNN lease provides strong debt service coverage. IO period justified given lease term remaining. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,3,5), loiExpirationDate: ds(2026,4,5) },
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    creditBoxNotes: "Strong industrial fundamentals. 95% physical occupancy with long-term tenants. Fits core credit box. DSCR well above 1.35x floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,15), loiExpirationDate: ds(2026,3,15) },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    creditBoxNotes: "96% occupancy well above 90% hurdle. DSCR of 1.60x provides strong cushion. LA multifamily fundamentals remain robust. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,1), loiExpirationDate: ds(2026,3,1) },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    creditBoxNotes: "Mixed-use with residential majority qualifies under multifamily program. Floating rate with 3yr IO is appropriate for value-add business plan. Recommend LOI with conditions.",
    loiRecommended: true, loiIssuedDate: ds(2026,1,20), loiExpirationDate: ds(2026,2,20) },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    creditBoxNotes: "Single tenant risk noted but offset by strong covenant. DSCR above floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2025,12,28), loiExpirationDate: ds(2026,1,28) },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    creditBoxNotes: "Hotel sector exception required. Post-renovation performance data reviewed. Revenue trending above underwriting. IO approved for 5yr term.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,25), loiExpirationDate: ds(2025,12,25) },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    creditBoxNotes: "Best-in-class Buckhead multifamily. 97% occupancy, strong rent growth trajectory. DSCR of 1.58x well above floor.",
    loiRecommended: true, loiIssuedDate: ds(2025,11,5), loiExpirationDate: ds(2025,12,5) },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    creditBoxNotes: "Trophy retail asset on premier US shopping corridor. 100% occupancy, all national credit tenants. Very low risk profile.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,20), loiExpirationDate: ds(2025,11,20) },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    creditBoxNotes: "Top-tier institutional-quality asset. IG-rated tenant covenant. DSCR of 1.62x substantially above floor. Very strong deal.",
    loiRecommended: true, loiIssuedDate: ds(2025,10,1), loiExpirationDate: ds(2025,11,1) },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    creditBoxNotes: "Self-storage sector performing well nationally. NOI growth 8% YoY. DSCR comfortably above 1.35x floor. Recommend LOI.",
    loiRecommended: true, loiIssuedDate: ds(2026,2,14), loiExpirationDate: ds(2026,3,14) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [LetterOfInterestServiceProvider, useLetterOfInterestService] = createContextHook(() => {
  const [records, setRecords] = useState<LOIRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: LOIRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateLOI = useCallback((applicationId: string): LOIRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), creditBoxNotes: "",
        loiRecommended: false, loiIssuedDate: "", loiExpirationDate: "" };
  }, [records]);

  const updateLOI = useCallback(async (applicationId: string, patch: Partial<LOIRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, {
        applicationId, updatedAt: now(), creditBoxNotes: "",
        loiRecommended: false, loiIssuedDate: "", loiExpirationDate: "", ...patch,
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
    getOrCreateLOI, updateLOI,
    loadSeedData, clearData, clearForApplication,
  };
});

export { LetterOfInterestServiceProvider, useLetterOfInterestService };
