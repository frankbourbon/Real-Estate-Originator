import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FCRRecord = {
  applicationId: string;
  commitmentLetterRecommended: boolean;
  commitmentLetterIssuedDate: string;
  updatedAt: string;
};

export type ExceptionStatus = "Pending Approval" | "Approved" | "Denied";

export type ApprovalAuthorityLevel =
  | "W1" | "W2" | "W3" | "W4" | "W5" | "W6" | "W7" | "W8" | "W9" | "W10"
  | "W11" | "W12" | "W13" | "W14" | "W15" | "W16" | "W17" | "W18" | "W19" | "W20"
  | "W21" | "W22" | "W23" | "W24" | "W25" | "W26" | "W27" | "W28" | "W29" | "W30";

export const APPROVAL_LEVELS: ApprovalAuthorityLevel[] = Array.from(
  { length: 30 }, (_, i) => `W${i + 1}` as ApprovalAuthorityLevel
);

export type Exception = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  exceptionType: string;
  description: string;
  status: ExceptionStatus;
  approvalAuthorityLevel: ApprovalAuthorityLevel;
  phaseAddedAt: string;
  createdByPersona: string;
  approvedBy: string;
  approvedAt: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  records:    "svc_fcr_v2",
  exceptions: "svc_exceptions_v2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
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
  // ── a51–a58: Final Credit Review (letters issued for a51–a54; pending a55–a58) ──
  { applicationId: "seed_a51", updatedAt: d(2026,3,22), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,20) },
  { applicationId: "seed_a52", updatedAt: d(2026,3,20), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,18) },
  { applicationId: "seed_a53", updatedAt: d(2026,3,18), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,15) },
  { applicationId: "seed_a54", updatedAt: d(2026,3,16), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,12) },
  { applicationId: "seed_a55", updatedAt: d(2026,3,14), commitmentLetterRecommended: false, commitmentLetterIssuedDate: "" },
  { applicationId: "seed_a56", updatedAt: d(2026,3,12), commitmentLetterRecommended: false, commitmentLetterIssuedDate: "" },
  { applicationId: "seed_a57", updatedAt: d(2026,3,10), commitmentLetterRecommended: false, commitmentLetterIssuedDate: "" },
  { applicationId: "seed_a58", updatedAt: d(2026,3,8),  commitmentLetterRecommended: false, commitmentLetterIssuedDate: "" },
  // ── a59–a65: Pre-close ────────────────────────────────────────────────────
  { applicationId: "seed_a59", updatedAt: d(2026,3,25), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,5) },
  { applicationId: "seed_a60", updatedAt: d(2026,3,22), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,3,2) },
  { applicationId: "seed_a61", updatedAt: d(2026,3,20), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,28) },
  { applicationId: "seed_a62", updatedAt: d(2026,3,18), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,25) },
  { applicationId: "seed_a63", updatedAt: d(2026,3,16), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,22) },
  { applicationId: "seed_a64", updatedAt: d(2026,3,14), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,18) },
  { applicationId: "seed_a65", updatedAt: d(2026,3,12), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,14) },
  // ── a66–a72: Ready for Docs ───────────────────────────────────────────────
  { applicationId: "seed_a66", updatedAt: d(2026,3,28), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,8) },
  { applicationId: "seed_a67", updatedAt: d(2026,3,26), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,5) },
  { applicationId: "seed_a68", updatedAt: d(2026,3,24), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,2,2) },
  { applicationId: "seed_a69", updatedAt: d(2026,3,22), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,28) },
  { applicationId: "seed_a70", updatedAt: d(2026,3,20), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,25) },
  { applicationId: "seed_a71", updatedAt: d(2026,3,18), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,22) },
  { applicationId: "seed_a72", updatedAt: d(2026,3,16), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,18) },
  // ── a73–a76: Docs Drawn ───────────────────────────────────────────────────
  { applicationId: "seed_a73", updatedAt: d(2026,3,30), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,12) },
  { applicationId: "seed_a74", updatedAt: d(2026,3,28), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,8) },
  { applicationId: "seed_a75", updatedAt: d(2026,3,26), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2026,1,4) },
  { applicationId: "seed_a76", updatedAt: d(2026,3,24), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,12,30) },
  // ── a77–a80: Docs Back ────────────────────────────────────────────────────
  { applicationId: "seed_a77", updatedAt: d(2026,3,31), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,12,20) },
  { applicationId: "seed_a78", updatedAt: d(2026,3,29), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,12,16) },
  { applicationId: "seed_a79", updatedAt: d(2026,3,27), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,12,12) },
  { applicationId: "seed_a80", updatedAt: d(2026,3,25), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,12,8) },
  // ── a81–a84: Closing ──────────────────────────────────────────────────────
  { applicationId: "seed_a81", updatedAt: d(2026,3,31), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,11,28) },
  { applicationId: "seed_a82", updatedAt: d(2026,3,30), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,11,24) },
  { applicationId: "seed_a83", updatedAt: d(2026,3,29), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,11,20) },
  { applicationId: "seed_a84", updatedAt: d(2026,3,28), commitmentLetterRecommended: true,  commitmentLetterIssuedDate: ds(2025,11,16) },
];

const SEED_EXCEPTIONS: Exception[] = [
  { id: "seed_exc_01", applicationId: "seed_a05", createdAt: d(2026,3,19), updatedAt: d(2026,3,19),
    exceptionType: "Rate Structure", status: "Approved", approvalAuthorityLevel: "W15",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Priya Nair (CRO)", approvedAt: d(2026,3,19),
    description: "Floating rate (SOFR + 175bps) requested in lieu of fixed rate. Justified by value-add business plan with expected refinance within 36 months at stabilization." },
  { id: "seed_exc_02", applicationId: "seed_a06", createdAt: d(2026,1,10), updatedAt: d(2026,3,10),
    exceptionType: "Concentration Risk", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Application Processing", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,3,10),
    description: "Single-tenant concentration exception for NNN office asset. Mitigated by creditworthy tech tenant covenant and borrower net worth of $31M providing strong recourse support." },
  { id: "seed_exc_03", applicationId: "seed_a07", createdAt: d(2026,2,15), updatedAt: d(2026,2,22),
    exceptionType: "Asset Class", status: "Approved", approvalAuthorityLevel: "W20",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Credit Committee (2/22/2026)", approvedAt: d(2026,2,22),
    description: "Hotel/hospitality asset class exception. Policy restricts hospitality to <10% of portfolio. Exception supported by strong post-renovation ADR ($285), RevPAR ($215), and trailing 12-month NOI." },
  { id: "seed_exc_04", applicationId: "seed_a07", createdAt: d(2026,2,15), updatedAt: d(2026,2,28),
    exceptionType: "IO Structure", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,2,28),
    description: "Interest-only structure for hospitality asset. Policy requires amortization on hotel loans. IO approved for full 5-year term given strong DSCR of 1.32x on IO basis." },
  { id: "seed_exc_05", applicationId: "seed_a09", createdAt: d(2026,1,15), updatedAt: d(2026,1,20),
    exceptionType: "IO Structure", status: "Approved", approvalAuthorityLevel: "W8",
    phaseAddedAt: "Final Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,1,20),
    description: "Interest-only structure for retail asset. IO approved for 7-year term given all-national-credit tenant roster, 100% occupancy, and DSCR of 1.55x on IO basis." },
  { id: "seed_exc_06", applicationId: "seed_a33", createdAt: d(2026,3,2), updatedAt: d(2026,3,6),
    exceptionType: "Construction Loan", status: "Approved", approvalAuthorityLevel: "W18",
    phaseAddedAt: "Initial Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Credit Committee (3/6/2026)", approvedAt: d(2026,3,6),
    description: "Construction-to-permanent exception for vertical retail development. Policy limits construction exposure to loans with 50%+ pre-leasing. Project is 78% pre-leased on signed NNN leases to healthcare and dining anchor tenants. LTC at 65% with completion guarantee from sponsor." },
  { id: "seed_exc_07", applicationId: "seed_a39", createdAt: d(2026,3,6), updatedAt: d(2026,3,8),
    exceptionType: "Occupancy Below Floor", status: "Approved", approvalAuthorityLevel: "W10",
    phaseAddedAt: "Application Start", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,3,8),
    description: "Multifamily occupancy of 91% is below the 93% policy floor for stabilized MF loans. Exception supported by 4-month post-renovation lease-up trajectory — currently 91% and improving. Stabilized occupancy projected at 96% within 90 days per operator's track record." },
  { id: "seed_exc_08", applicationId: "seed_a56", createdAt: d(2026,1,10), updatedAt: d(2026,1,12),
    exceptionType: "Single Tenant Concentration", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Application Processing", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,1,12),
    description: "100% single-tenant concentration (Amazon 3PL) on industrial asset. Policy limits single-tenant exposure to 80% of income. Exception justified by Amazon's investment-grade equivalent covenant, essential fulfillment infrastructure status, and DSCR of 1.62x on NNN structure." },
  { id: "seed_exc_09", applicationId: "seed_a58", createdAt: d(2026,1,7), updatedAt: d(2026,1,9),
    exceptionType: "Distressed Acquisition", status: "Approved", approvalAuthorityLevel: "W15",
    phaseAddedAt: "Initial Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Credit Committee (1/9/2026)", approvedAt: d(2026,1,9),
    description: "Distressed acquisition exception for below-market-cost office asset. Borrower acquiring from motivated seller at 38% discount to replacement cost. Policy prohibits distressed acquisitions without committee review. Approved given borrower's track record in value-add office turnarounds, anchor tenant Baker Donelson's long-term commitment, and 65% LTV at stressed basis." },
  { id: "seed_exc_10", applicationId: "seed_a83", createdAt: d(2025,8,18), updatedAt: d(2025,8,22),
    exceptionType: "Occupancy Below Floor", status: "Approved", approvalAuthorityLevel: "W12",
    phaseAddedAt: "Initial Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2025,8,22),
    description: "Office occupancy at 72% substantially below 85% policy floor for office bridge loans. Exception approved based on 3 signed LOIs pending execution, Greenberg Traurig anchor NNN lease providing DSCR floor of 1.37x, and borrower's $28M net worth providing strong recourse backstop." },
  { id: "seed_exc_11", applicationId: "seed_a84", createdAt: d(2025,8,14), updatedAt: d(2025,8,16),
    exceptionType: "Occupancy Below Floor", status: "Approved", approvalAuthorityLevel: "W10",
    phaseAddedAt: "Initial Credit Review", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2025,8,16),
    description: "Retail occupancy at 75% below 85% policy floor. Exception approved given Pearl Street location premium — below-market in-place rents provide substantial mark-to-market upside on rollover. Conservative 62% LTV provides 38% equity cushion. Bridge financing 24 months to stabilization." },
  { id: "seed_exc_12", applicationId: "seed_a36", createdAt: d(2026,2,28), updatedAt: d(2026,3,2),
    exceptionType: "Market Risk", status: "Approved", approvalAuthorityLevel: "W10",
    phaseAddedAt: "Application Start", createdByPersona: "Credit Risk",
    approvedBy: "Alan Morse (Credit Risk Officer)", approvedAt: d(2026,3,2),
    description: "Detroit secondary market exception. Policy limits exposure in MSAs with negative population trends. Exception approved given Midtown Detroit's specific revitalization trajectory, anchor Wayne State University and medical center proximity, and borrower's below-replacement-cost basis at $55 PSF." },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [FinalCreditReviewServiceProvider, useFinalCreditReviewService] = createContextHook(() => {
  const [records, setRecords] = useState<FCRRecord[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.records),
      AsyncStorage.getItem(KEYS.exceptions),
    ]).then(([r, e]) => {
      if (r) setRecords(JSON.parse(r));
      if (e) setExceptions(JSON.parse(e));
      setLoading(false);
    });
  }, []);

  const persistRecords = useCallback(async (data: FCRRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEYS.records, JSON.stringify(data));
  }, []);

  const persistExceptions = useCallback(async (data: Exception[]) => {
    setExceptions(data);
    await AsyncStorage.setItem(KEYS.exceptions, JSON.stringify(data));
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

  // ── Exceptions ─────────────────────────────────────────────────────────────

  const getExceptions = useCallback((applicationId: string) =>
    exceptions.filter((e) => e.applicationId === applicationId), [exceptions]);

  const addException = useCallback(async (
    applicationId: string,
    data: Omit<Exception, "id" | "applicationId" | "createdAt" | "updatedAt">
  ): Promise<Exception> => {
    const exc: Exception = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
    await persistExceptions([...exceptions, exc]);
    return exc;
  }, [exceptions, persistExceptions]);

  const updateException = useCallback(async (id: string, patch: Partial<Exception>) => {
    await persistExceptions(exceptions.map((e) => e.id === id ? { ...e, ...patch, updatedAt: now() } : e));
  }, [exceptions, persistExceptions]);

  const deleteException = useCallback(async (id: string) => {
    await persistExceptions(exceptions.filter((e) => e.id !== id));
  }, [exceptions, persistExceptions]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistRecords(SEED_RECORDS),
      persistExceptions(SEED_EXCEPTIONS),
    ]);
  }, [persistRecords, persistExceptions]);

  const clearData = useCallback(async () => {
    await Promise.all([persistRecords([]), persistExceptions([])]);
  }, [persistRecords, persistExceptions]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistRecords(records.filter((r) => r.applicationId !== applicationId)),
      persistExceptions(exceptions.filter((e) => e.applicationId !== applicationId)),
    ]);
  }, [records, exceptions, persistRecords, persistExceptions]);

  return {
    loading,
    getOrCreateFCR, updateFCR,
    getExceptions, addException, updateException, deleteException,
    loadSeedData, clearData, clearForApplication,
  };
});

export { FinalCreditReviewServiceProvider, useFinalCreditReviewService };
