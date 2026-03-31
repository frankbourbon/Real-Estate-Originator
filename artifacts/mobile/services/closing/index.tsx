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
  // ── a59–a65: Pre-close (HMDA in progress; insurance/title not yet ordered) ──
  { applicationId: "seed_a59", updatedAt: d(2026,3,25),
    hmdaComplete: false, hmdaNotes: "HMDA LAR initiated. Action taken date and census tract pending. ECOA notice sent 3/8.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a60", updatedAt: d(2026,3,22),
    hmdaComplete: false, hmdaNotes: "HMDA LAR 85% complete. Awaiting principal city determination for Fresno MSA.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a61", updatedAt: d(2026,3,20),
    hmdaComplete: false, hmdaNotes: "HMDA initiated 3/5. Mixed-use — residential portion triggers LAR. Pending final loan purpose classification.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a62", updatedAt: d(2026,3,18),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/15. Non-covered for HMDA — commercial CRE only, no residential component. Marked N/A.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a63", updatedAt: d(2026,3,16),
    hmdaComplete: false, hmdaNotes: "HMDA LAR initiated. 200-unit MF is reportable. Awaiting appraisal census tract and final LOC amount.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a64", updatedAt: d(2026,3,14),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/10. All LAR fields validated. ECOA notice issued to guarantors 2/28.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a65", updatedAt: d(2026,3,12),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — purely commercial office asset, no HMDA reporting obligation. Documented and filed.",
    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "", floodZoneDesignation: "", titleReportDate: "",
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  // ── a66–a72: Ready for Docs (insurance/title engaged; no docs drawn yet) ──
  { applicationId: "seed_a66", updatedAt: d(2026,3,28),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial retail, no residential component. Documented.",
    insuranceCarrier: "Travelers Property Casualty", insurancePolicyNumber: "TRV-2025-0204411",
    insuranceEffectiveDate: ds(2026,4,18), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,22),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a67", updatedAt: d(2026,3,26),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial industrial. No residential triggers.",
    insuranceCarrier: "Zurich American Insurance Company", insurancePolicyNumber: "ZUR-2025-0186722",
    insuranceEffectiveDate: ds(2026,4,15), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,20),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a68", updatedAt: d(2026,3,24),
    hmdaComplete: true, hmdaNotes: "HMDA LAR complete and validated 3/18. Birmingham mixed-use residential triggers HMDA. ECOA notice confirmed.",
    insuranceCarrier: "Liberty Mutual Insurance", insurancePolicyNumber: "LM-2025-0312908",
    insuranceEffectiveDate: ds(2026,4,12), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "First American Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,18),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a69", updatedAt: d(2026,3,22),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/15. 160-unit MF — fully HMDA reportable. All LAR data verified.",
    insuranceCarrier: "Hartford Fire Insurance Company", insurancePolicyNumber: "HFI-2025-0093145",
    insuranceEffectiveDate: ds(2026,4,10), titleCompany: "Old Republic National Title Insurance",
    escrowCompany: "Old Republic National Title Insurance", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,16),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a70", updatedAt: d(2026,3,20),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — pure commercial office. Documented as non-reportable 3/12.",
    insuranceCarrier: "Chubb Insurance Company", insurancePolicyNumber: "CHB-2025-0158302",
    insuranceEffectiveDate: ds(2026,4,8), titleCompany: "First American Title Insurance",
    escrowCompany: "First American Title Insurance", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,14),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a71", updatedAt: d(2026,3,18),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/10. Scottsdale luxury MF — 108 units, all HMDA fields confirmed.",
    insuranceCarrier: "Allianz Global Corporate & Specialty", insurancePolicyNumber: "AGC-2025-0072814",
    insuranceEffectiveDate: ds(2026,4,5), titleCompany: "Investors Title Insurance Company",
    escrowCompany: "Investors Title Insurance Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,12),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a72", updatedAt: d(2026,3,16),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial retail strip center, no residential component.",
    insuranceCarrier: "Swiss Re Corporate Solutions", insurancePolicyNumber: "SRC-2025-0044217",
    insuranceEffectiveDate: ds(2026,4,2), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,10),
    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  // ── a73–a76: Docs Drawn ───────────────────────────────────────────────────
  { applicationId: "seed_a73", updatedAt: d(2026,3,30),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial office, no HMDA triggers. Documented.",
    insuranceCarrier: "Travelers Property Casualty", insurancePolicyNumber: "TRV-2025-0188641",
    insuranceEffectiveDate: ds(2026,3,28), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,12),
    docsDrawnDate: ds(2026,3,28), settlementFeesUsd: "22,500", settlementStatementDate: ds(2026,3,28),
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a74", updatedAt: d(2026,3,28),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial industrial NNN, no residential component.",
    insuranceCarrier: "Chubb Insurance Company", insurancePolicyNumber: "CHB-2025-0141082",
    insuranceEffectiveDate: ds(2026,3,26), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "Chicago Title Insurance Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,8),
    docsDrawnDate: ds(2026,3,26), settlementFeesUsd: "24,000", settlementStatementDate: ds(2026,3,26),
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a75", updatedAt: d(2026,3,26),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/8. 144-unit garden MF — all LAR fields verified and signed off.",
    insuranceCarrier: "Hartford Fire Insurance Company", insurancePolicyNumber: "HFI-2025-0078332",
    insuranceEffectiveDate: ds(2026,3,24), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,6),
    docsDrawnDate: ds(2026,3,24), settlementFeesUsd: "20,500", settlementStatementDate: ds(2026,3,24),
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a76", updatedAt: d(2026,3,24),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial office. Government-adjacent tenants do not trigger HMDA.",
    insuranceCarrier: "Liberty Mutual Insurance", insurancePolicyNumber: "LM-2025-0285107",
    insuranceEffectiveDate: ds(2026,3,22), titleCompany: "First American Title Insurance",
    escrowCompany: "First American Title Insurance", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,3,4),
    docsDrawnDate: ds(2026,3,22), settlementFeesUsd: "14,500", settlementStatementDate: ds(2026,3,22),
    docsBackDate: "", titleConfirmationDate: "",
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  // ── a77–a80: Docs Back ────────────────────────────────────────────────────
  { applicationId: "seed_a77", updatedAt: d(2026,3,31),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial retail. Documented as non-reportable.",
    insuranceCarrier: "Zurich American Insurance Company", insurancePolicyNumber: "ZUR-2025-0162441",
    insuranceEffectiveDate: ds(2026,3,20), titleCompany: "Old Republic National Title Insurance",
    escrowCompany: "Old Republic National Title Insurance", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,28),
    docsDrawnDate: ds(2026,3,20), settlementFeesUsd: "12,500", settlementStatementDate: ds(2026,3,20),
    docsBackDate: ds(2026,3,28), titleConfirmationDate: ds(2026,3,28),
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a78", updatedAt: d(2026,3,29),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial industrial. No HMDA triggers.",
    insuranceCarrier: "AIG Property Casualty", insurancePolicyNumber: "AIG-2025-0024418",
    insuranceEffectiveDate: ds(2026,3,18), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,26),
    docsDrawnDate: ds(2026,3,18), settlementFeesUsd: "28,500", settlementStatementDate: ds(2026,3,18),
    docsBackDate: ds(2026,3,26), titleConfirmationDate: ds(2026,3,26),
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a79", updatedAt: d(2026,3,27),
    hmdaComplete: true, hmdaNotes: "HMDA complete 3/5. McKinney 180-unit MF — all LAR fields complete and signed.",
    insuranceCarrier: "Travelers Property Casualty", insurancePolicyNumber: "TRV-2025-0171208",
    insuranceEffectiveDate: ds(2026,3,15), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "First American Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,24),
    docsDrawnDate: ds(2026,3,15), settlementFeesUsd: "26,500", settlementStatementDate: ds(2026,3,15),
    docsBackDate: ds(2026,3,24), titleConfirmationDate: ds(2026,3,24),
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  { applicationId: "seed_a80", updatedAt: d(2026,3,25),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial office. Documented as non-reportable 3/1.",
    insuranceCarrier: "Hartford Fire Insurance Company", insurancePolicyNumber: "HFI-2025-0066218",
    insuranceEffectiveDate: ds(2026,3,12), titleCompany: "Fidelity National Title",
    escrowCompany: "Fidelity National Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,22),
    docsDrawnDate: ds(2026,3,12), settlementFeesUsd: "10,500", settlementStatementDate: ds(2026,3,12),
    docsBackDate: ds(2026,3,22), titleConfirmationDate: ds(2026,3,22),
    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "" },
  // ── a81–a84: Closing (fully closed) ──────────────────────────────────────
  { applicationId: "seed_a81", updatedAt: d(2026,3,31),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial retail anchor center.",
    insuranceCarrier: "Liberty Mutual Insurance", insurancePolicyNumber: "LM-2025-0241088",
    insuranceEffectiveDate: ds(2026,2,28), titleCompany: "Chicago Title Insurance Company",
    escrowCompany: "Chicago Title Insurance Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,6),
    docsDrawnDate: ds(2026,2,28), settlementFeesUsd: "8,500", settlementStatementDate: ds(2026,2,28),
    docsBackDate: ds(2026,3,7), titleConfirmationDate: ds(2026,3,7),
    wireAmountUsd: "1,782,000", wireBankName: "Frost Bank",
    wireAbaNumber: "114000093", wireAccountNumber: "****8812",
    servicingLoanNumber: "FRB-CRE-2026-008142", bookingDate: ds(2026,3,17) },
  { applicationId: "seed_a82", updatedAt: d(2026,3,30),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial industrial. No residential triggers.",
    insuranceCarrier: "Zurich American Insurance Company", insurancePolicyNumber: "ZUR-2025-0148822",
    insuranceEffectiveDate: ds(2026,2,22), titleCompany: "Stewart Title Guaranty Company",
    escrowCompany: "Stewart Title Guaranty Company", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,2,2),
    docsDrawnDate: ds(2026,2,22), settlementFeesUsd: "18,500", settlementStatementDate: ds(2026,2,22),
    docsBackDate: ds(2026,3,3), titleConfirmationDate: ds(2026,3,3),
    wireAmountUsd: "11,488,000", wireBankName: "Prosperity Bank",
    wireAbaNumber: "113122655", wireAccountNumber: "****3341",
    servicingLoanNumber: "PRB-CRE-2026-011409", bookingDate: ds(2026,3,13) },
  { applicationId: "seed_a83", updatedAt: d(2026,3,29),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial office bridge. Documented.",
    insuranceCarrier: "Chubb Insurance Company", insurancePolicyNumber: "CHB-2025-0122018",
    insuranceEffectiveDate: ds(2026,2,18), titleCompany: "Fidelity National Title",
    escrowCompany: "First American Title", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,1,28),
    docsDrawnDate: ds(2026,2,18), settlementFeesUsd: "14,500", settlementStatementDate: ds(2026,2,18),
    docsBackDate: ds(2026,2,27), titleConfirmationDate: ds(2026,2,27),
    wireAmountUsd: "7,605,000", wireBankName: "Regions Bank",
    wireAbaNumber: "062000019", wireAccountNumber: "****6614",
    servicingLoanNumber: "RGN-CRE-2026-007210", bookingDate: ds(2026,3,9) },
  { applicationId: "seed_a84", updatedAt: d(2026,3,28),
    hmdaComplete: true, hmdaNotes: "HMDA N/A — commercial retail bridge. Documented as non-reportable.",
    insuranceCarrier: "AIG Property Casualty", insurancePolicyNumber: "AIG-2025-0009914",
    insuranceEffectiveDate: ds(2026,2,14), titleCompany: "Old Republic National Title Insurance",
    escrowCompany: "Old Republic National Title Insurance", floodZoneDesignation: "Zone X",
    titleReportDate: ds(2026,1,24),
    docsDrawnDate: ds(2026,2,14), settlementFeesUsd: "7,500", settlementStatementDate: ds(2026,2,14),
    docsBackDate: ds(2026,2,23), titleConfirmationDate: ds(2026,2,23),
    wireAmountUsd: "2,562,000", wireBankName: "ColoEast Bankshares",
    wireAbaNumber: "102001017", wireAccountNumber: "****5508",
    servicingLoanNumber: "CEB-CRE-2026-005803", bookingDate: ds(2026,3,5) },
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
