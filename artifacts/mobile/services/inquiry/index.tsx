import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitType =
  | "Studio" | "1BR/1BA" | "1BR/1BA+Den"
  | "2BR/1BA" | "2BR/2BA" | "2BR/2BA+Den"
  | "3BR/2BA" | "3BR/3BA" | "Penthouse"
  | "Office" | "Retail" | "Industrial" | "Other";

export type LeaseStatusType = "Occupied" | "Vacant" | "Notice" | "Model" | "Down";
export type LeaseType = "NNN" | "NN" | "Gross" | "Modified Gross" | "Absolute Net" | "Full Service";

export type OperatingPeriodType =
  | "Actual Year 1" | "Actual Year 2" | "T12 (Trailing 12)"
  | "YTD" | "Proforma";

/** Inquiry notes record — one per applicationId. Created lazily on first open. */
export type InquiryRecord = {
  applicationId: string;
  inquiryNotes: string;
  updatedAt: string;
};

/** Per-unit rent roll record. Keyed by applicationId (not propertyId). MISMO: RentRollItemType */
export type RentRollUnit = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  unitIdentifier: string;
  unitType: UnitType;
  bedroomCount: string;
  bathroomCount: string;
  squareFeet: string;
  tenantName: string;
  leaseBeginDate: string;
  leaseEndDate: string;
  leaseStatus: LeaseStatusType;
  monthlyRentAmount: string;
  marketRentAmount: string;
  annualBaseRentAmount: string;
  baseRentPsf: string;
  leaseType: LeaseType | "";
  renewalOptions: string;
  tenantIndustry: string;
};

/** Annual operating statement per application. MISMO: IncomeExpenseStatementType */
export type OperatingYear = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  periodType: OperatingPeriodType;
  periodYear: string;
  ytdMonths: string;
  grossPotentialRent: string;
  vacancyAndCreditLoss: string;
  otherIncome: string;
  effectiveGrossIncome: string;
  realEstateTaxes: string;
  insurance: string;
  utilities: string;
  repairsAndMaintenance: string;
  managementFee: string;
  administrative: string;
  replacementReserves: string;
  otherExpenses: string;
  totalOperatingExpenses: string;
  netOperatingIncome: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  notes: "svc_inquiry_notes_v2",
  rentRoll: "svc_inquiry_rent_roll_v2",
  opHistory: "svc_inquiry_op_history_v2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }

/**
 * Parse a locale-formatted numeric string (e.g. "1,234,567") → number.
 * Only digits, dots, and minus signs are used; all other characters are stripped.
 * This is intentionally strict so that no user-supplied string can influence
 * the result beyond its numeric value.
 */
function parseNum(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^0-9.\-]/g, "")) || 0;
}

function fmtNum(n: number): string {
  return n ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "";
}

/**
 * Server-side computation of all derived Operating Year fields.
 *
 * EGI  = Gross Potential Rent − Vacancy & Credit Loss + Other Income
 * TOE  = Σ all expense line items
 * NOI  = EGI − TOE
 *
 * The caller's supplied values for effectiveGrossIncome, totalOperatingExpenses,
 * and netOperatingIncome are ignored — only the raw input fields are used.
 * This prevents any client-side manipulation of calculated totals from
 * reaching persistent storage.
 */
export function computeOpYearCalcs(
  data: Partial<OperatingYear>
): Pick<OperatingYear, "effectiveGrossIncome" | "totalOperatingExpenses" | "netOperatingIncome"> {
  // Income
  const gpr = parseNum(data.grossPotentialRent);
  const vac = parseNum(data.vacancyAndCreditLoss);
  const oth = parseNum(data.otherIncome);
  const egi = gpr - vac + oth;

  // Expenses
  const toe = [
    parseNum(data.realEstateTaxes),
    parseNum(data.insurance),
    parseNum(data.utilities),
    parseNum(data.repairsAndMaintenance),
    parseNum(data.managementFee),
    parseNum(data.administrative),
    parseNum(data.replacementReserves),
    parseNum(data.otherExpenses),
  ].reduce((a, b) => a + b, 0);

  // NOI
  const noi = egi - toe;

  return {
    effectiveGrossIncome:    fmtNum(egi),
    totalOperatingExpenses:  fmtNum(toe),
    netOperatingIncome:      fmtNum(noi),
  };
}
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_NOTES: InquiryRecord[] = [
  { applicationId: "seed_a01", updatedAt: d(2026,3,14),
    inquiryNotes: "Borrower is exploring acquisition of stabilized office building in Center City. Has toured the property twice. Asking price $13M. Looking for 65% LTV conventional financing. Market is recovering post-COVID — occupancy trending up from 82% to 88%." },
  { applicationId: "seed_a02", updatedAt: d(2026,3,5),
    inquiryNotes: "Borrower seeking cash-out refinance on flagship retail property in Midtown. Current loan maturity in August. Strong anchor tenant (national pharmacy chain) with 9 years remaining on NNN lease." },
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    inquiryNotes: "Class A industrial acquisition near Hartsfield-Jackson. Two NNN tenants — logistics company and e-commerce fulfillment. Excellent location fundamentals." },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    inquiryNotes: "Multifamily refinance of 120-unit complex in Koreatown. Current loan at 5.5% maturing in June. Borrower wants to lock in current rate before further market movement." },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    inquiryNotes: "Mixed-use asset in Streeterville. Ground floor retail (2 units) + 48 residential apartments above. Strong River North submarket fundamentals." },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    inquiryNotes: "Tech-leased office building in downtown Austin. Single tenant NNN — 5 years remaining. Borrower has existing relationship with bank." },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    inquiryNotes: "Boutique hotel refinance on Brickell Avenue. Post-renovation stabilization complete. Strong ADR and RevPAR metrics for the submarket." },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    inquiryNotes: "224-unit garden-style multifamily in Buckhead. Class A property, 2018 vintage. Seller has accepted offer at $53.5M." },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    inquiryNotes: "Iconic Michigan Avenue retail — 100% occupied with mix of luxury and fashion tenants. National credit tenants on long-term leases." },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    inquiryNotes: "Class A office tower in Financial District. Single institutional tenant (financial services firm) with 12 years remaining on lease. Trophy asset." },
  { applicationId: "seed_a11", updatedAt: d(2026,3,20),
    inquiryNotes: "Single-tenant NNN industrial near Bush Intercontinental Airport. 100% leased to publicly-traded logistics company, 8 years remaining on lease. Asking $40M. Excellent credit tenant." },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    inquiryNotes: "Class A self-storage facility in growing Arcadia submarket. 480 climate-controlled units, 88% physical occupancy. Digital-native operation with strong NOI." },
];

const SEED_RENT_ROLL: RentRollUnit[] = [
  // a04 — Multifamily LA (120 units, p04→a04)
  { id: "seed_rr_a04_01", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "101", unitType: "Studio", bedroomCount: "0", bathroomCount: "1",
    squareFeet: "550", tenantName: "Rodriguez, M.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,6,1), leaseEndDate: ds(2026,5,31),
    monthlyRentAmount: "2,150", marketRentAmount: "2,200",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_02", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "102", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "720", tenantName: "Park, J.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,3,1), leaseEndDate: ds(2026,2,28),
    monthlyRentAmount: "2,850", marketRentAmount: "2,950",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_03", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "201", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "720", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "2,950",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_04", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "205", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,050", tenantName: "Williams, T. & S.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,9,1), leaseEndDate: ds(2026,8,31),
    monthlyRentAmount: "3,850", marketRentAmount: "4,000",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_05", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "310", unitType: "2BR/2BA+Den", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,220", tenantName: "Kim, A.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,1,1), leaseEndDate: ds(2026,12,31),
    monthlyRentAmount: "4,400", marketRentAmount: "4,500",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a04_06", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "401", unitType: "3BR/2BA", bedroomCount: "3", bathroomCount: "2",
    squareFeet: "1,480", tenantName: "Johnson, R.", leaseStatus: "Notice",
    leaseBeginDate: ds(2024,4,1), leaseEndDate: ds(2026,3,31),
    monthlyRentAmount: "5,200", marketRentAmount: "5,500",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  // a08 — Multifamily Atlanta (224 units, p08→a08)
  { id: "seed_rr_a08_01", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "1A", unitType: "Studio", bedroomCount: "0", bathroomCount: "1",
    squareFeet: "490", tenantName: "Patel, S.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,8,1), leaseEndDate: ds(2026,7,31),
    monthlyRentAmount: "1,750", marketRentAmount: "1,800",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_02", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "2B", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "680", tenantName: "Thompson, C.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,2,1), leaseEndDate: ds(2026,1,31),
    monthlyRentAmount: "2,200", marketRentAmount: "2,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_03", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "4C", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "980", tenantName: "Garcia, M. & L.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,11,1), leaseEndDate: ds(2026,10,31),
    monthlyRentAmount: "3,100", marketRentAmount: "3,250",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_04", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "5D", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "980", tenantName: "Lee, H.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,5,1), leaseEndDate: ds(2026,4,30),
    monthlyRentAmount: "3,200", marketRentAmount: "3,250",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_05", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "7A", unitType: "3BR/2BA", bedroomCount: "3", bathroomCount: "2",
    squareFeet: "1,380", tenantName: "Brown, K.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,7,1), leaseEndDate: ds(2027,6,30),
    monthlyRentAmount: "4,100", marketRentAmount: "4,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a08_06", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "8B", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "680", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "2,300",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  // a05 — Mixed Use Chicago (48 units, p05→a05)
  { id: "seed_rr_a05_01", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "2A", unitType: "1BR/1BA", bedroomCount: "1", bathroomCount: "1",
    squareFeet: "750", tenantName: "Walsh, D.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2025,4,1), leaseEndDate: ds(2026,3,31),
    monthlyRentAmount: "2,600", marketRentAmount: "2,700",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a05_02", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "3B", unitType: "2BR/2BA", bedroomCount: "2", bathroomCount: "2",
    squareFeet: "1,100", tenantName: "Chen, W. & Y.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2024,10,1), leaseEndDate: ds(2026,9,30),
    monthlyRentAmount: "3,700", marketRentAmount: "3,850",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "" },
  { id: "seed_rr_a05_03", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "Suite 101", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "4,200", tenantName: "Lakeside Coffee Co.", leaseStatus: "Occupied",
    leaseBeginDate: ds(2023,1,1), leaseEndDate: ds(2028,12,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "210,000", baseRentPsf: "50.00",
    leaseType: "NNN", renewalOptions: "Two 5-year options at 3% annual escalation", tenantIndustry: "Food & Beverage" },
  { id: "seed_rr_a05_04", applicationId: "seed_a05", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "Suite 102", unitType: "Office", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "2,800", tenantName: "Midwest Financial Group", leaseStatus: "Occupied",
    leaseBeginDate: ds(2022,6,1), leaseEndDate: ds(2027,5,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "168,000", baseRentPsf: "60.00",
    leaseType: "Modified Gross", renewalOptions: "One 3-year option", tenantIndustry: "Financial Services" },
  // a02 — Retail NY (12 units, p02→a02)
  { id: "seed_rr_a02_01", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-01", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "8,500", tenantName: "National Pharmacy Partners", leaseStatus: "Occupied",
    leaseBeginDate: ds(2017,3,1), leaseEndDate: ds(2035,2,28),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "1,275,000", baseRentPsf: "150.00",
    leaseType: "NNN", renewalOptions: "Four 5-year options at fixed rent", tenantIndustry: "Pharmacy / Healthcare Retail" },
  { id: "seed_rr_a02_02", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-02", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "4,200", tenantName: "Luxe Apparel NYC", leaseStatus: "Occupied",
    leaseBeginDate: ds(2021,9,1), leaseEndDate: ds(2028,8,31),
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "756,000", baseRentPsf: "180.00",
    leaseType: "NNN", renewalOptions: "One 5-year option", tenantIndustry: "Luxury Retail" },
  { id: "seed_rr_a02_03", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    unitIdentifier: "G-03", unitType: "Retail", bedroomCount: "0", bathroomCount: "0",
    squareFeet: "3,100", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "", baseRentPsf: "175.00",
    leaseType: "NNN", renewalOptions: "", tenantIndustry: "" },
];

const SEED_OP_HISTORY: OperatingYear[] = [
  // a04 — Multifamily LA (p04→a04)
  { id: "seed_oh_a04_1", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 1", periodYear: "2023", ytdMonths: "",
    grossPotentialRent: "3,888,000", vacancyAndCreditLoss: "311,040", otherIncome: "72,000",
    effectiveGrossIncome: "3,648,960", realEstateTaxes: "268,000", insurance: "88,000",
    utilities: "172,000", repairsAndMaintenance: "228,000", managementFee: "182,448",
    administrative: "80,000", replacementReserves: "36,000", otherExpenses: "38,000",
    totalOperatingExpenses: "1,092,448", netOperatingIncome: "2,556,512" },
  { id: "seed_oh_a04_2", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 2", periodYear: "2024", ytdMonths: "",
    grossPotentialRent: "4,032,000", vacancyAndCreditLoss: "282,240", otherIncome: "80,000",
    effectiveGrossIncome: "3,829,760", realEstateTaxes: "278,000", insurance: "92,000",
    utilities: "176,000", repairsAndMaintenance: "236,000", managementFee: "191,488",
    administrative: "83,000", replacementReserves: "36,000", otherExpenses: "40,000",
    totalOperatingExpenses: "1,132,488", netOperatingIncome: "2,697,272" },
  { id: "seed_oh_a04_3", applicationId: "seed_a04", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "4,176,000", vacancyAndCreditLoss: "292,320", otherIncome: "85,000",
    effectiveGrossIncome: "3,968,680", realEstateTaxes: "285,000", insurance: "95,000",
    utilities: "180,000", repairsAndMaintenance: "242,000", managementFee: "198,434",
    administrative: "86,000", replacementReserves: "36,000", otherExpenses: "42,000",
    totalOperatingExpenses: "1,164,434", netOperatingIncome: "2,804,246" },
  // a08 — Multifamily Atlanta (p08→a08)
  { id: "seed_oh_a08_1", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "Actual Year 1", periodYear: "2024", ytdMonths: "",
    grossPotentialRent: "7,526,400", vacancyAndCreditLoss: "376,320", otherIncome: "145,000",
    effectiveGrossIncome: "7,295,080", realEstateTaxes: "510,000", insurance: "196,000",
    utilities: "324,000", repairsAndMaintenance: "448,000", managementFee: "364,754",
    administrative: "158,000", replacementReserves: "67,200", otherExpenses: "72,000",
    totalOperatingExpenses: "2,139,954", netOperatingIncome: "5,155,126" },
  { id: "seed_oh_a08_2", applicationId: "seed_a08", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "7,795,200", vacancyAndCreditLoss: "233,856", otherIncome: "158,000",
    effectiveGrossIncome: "7,719,344", realEstateTaxes: "525,000", insurance: "204,000",
    utilities: "332,000", repairsAndMaintenance: "462,000", managementFee: "385,967",
    administrative: "164,000", replacementReserves: "67,200", otherExpenses: "76,000",
    totalOperatingExpenses: "2,216,167", netOperatingIncome: "5,503,177" },
  // a03 — Industrial Atlanta (p03→a03)
  { id: "seed_oh_a03_1", applicationId: "seed_a03", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "4,368,000", vacancyAndCreditLoss: "218,400", otherIncome: "24,000",
    effectiveGrossIncome: "4,173,600", realEstateTaxes: "312,000", insurance: "145,000",
    utilities: "48,000", repairsAndMaintenance: "186,000", managementFee: "208,680",
    administrative: "72,000", replacementReserves: "62,400", otherExpenses: "28,000",
    totalOperatingExpenses: "1,062,080", netOperatingIncome: "3,111,520" },
  // a02 — Retail NY (p02→a02)
  { id: "seed_oh_a02_1", applicationId: "seed_a02", createdAt: d(2026,1,1), updatedAt: d(2026,1,1),
    periodType: "T12 (Trailing 12)", periodYear: "2025", ytdMonths: "",
    grossPotentialRent: "2,356,200", vacancyAndCreditLoss: "235,620", otherIncome: "18,000",
    effectiveGrossIncome: "2,138,580", realEstateTaxes: "188,000", insurance: "72,000",
    utilities: "0", repairsAndMaintenance: "62,000", managementFee: "106,929",
    administrative: "38,000", replacementReserves: "18,250", otherExpenses: "22,000",
    totalOperatingExpenses: "507,179", netOperatingIncome: "1,631,401" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [InquiryServiceProvider, useInquiryService] = createContextHook(() => {
  const [notes, setNotes] = useState<InquiryRecord[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollUnit[]>([]);
  const [opHistory, setOpHistory] = useState<OperatingYear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.notes),
      AsyncStorage.getItem(KEYS.rentRoll),
      AsyncStorage.getItem(KEYS.opHistory),
    ]).then(([n, rr, oh]) => {
      if (n) setNotes(JSON.parse(n));
      if (rr) setRentRoll(JSON.parse(rr));
      if (oh) setOpHistory(JSON.parse(oh));
      setLoading(false);
    });
  }, []);

  const persistNotes = useCallback(async (data: InquiryRecord[]) => {
    setNotes(data);
    await AsyncStorage.setItem(KEYS.notes, JSON.stringify(data));
  }, []);

  const persistRentRoll = useCallback(async (data: RentRollUnit[]) => {
    setRentRoll(data);
    await AsyncStorage.setItem(KEYS.rentRoll, JSON.stringify(data));
  }, []);

  const persistOpHistory = useCallback(async (data: OperatingYear[]) => {
    setOpHistory(data);
    await AsyncStorage.setItem(KEYS.opHistory, JSON.stringify(data));
  }, []);

  // ── Notes ──────────────────────────────────────────────────────────────────

  const getOrCreateNotes = useCallback((applicationId: string): InquiryRecord => {
    return notes.find((n) => n.applicationId === applicationId) ??
      { applicationId, inquiryNotes: "", updatedAt: now() };
  }, [notes]);

  const updateNotes = useCallback(async (applicationId: string, inquiryNotes: string) => {
    const existing = notes.find((n) => n.applicationId === applicationId);
    if (existing) {
      await persistNotes(notes.map((n) => n.applicationId === applicationId
        ? { ...n, inquiryNotes, updatedAt: now() } : n));
    } else {
      await persistNotes([...notes, { applicationId, inquiryNotes, updatedAt: now() }]);
    }
  }, [notes, persistNotes]);

  // ── Rent Roll ──────────────────────────────────────────────────────────────

  const getRentRoll = useCallback((applicationId: string) =>
    rentRoll.filter((u) => u.applicationId === applicationId), [rentRoll]);

  const addUnit = useCallback(async (applicationId: string, data: Omit<RentRollUnit, "id" | "applicationId" | "createdAt" | "updatedAt">): Promise<RentRollUnit> => {
    const unit: RentRollUnit = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
    await persistRentRoll([...rentRoll, unit]);
    return unit;
  }, [rentRoll, persistRentRoll]);

  const updateUnit = useCallback(async (id: string, patch: Partial<RentRollUnit>) => {
    await persistRentRoll(rentRoll.map((u) => u.id === id ? { ...u, ...patch, updatedAt: now() } : u));
  }, [rentRoll, persistRentRoll]);

  const deleteUnit = useCallback(async (id: string) => {
    await persistRentRoll(rentRoll.filter((u) => u.id !== id));
  }, [rentRoll, persistRentRoll]);

  // ── Operating History ──────────────────────────────────────────────────────

  const getOpHistory = useCallback((applicationId: string) =>
    opHistory.filter((y) => y.applicationId === applicationId), [opHistory]);

  const addYear = useCallback(async (applicationId: string, data: Omit<OperatingYear, "id" | "applicationId" | "createdAt" | "updatedAt">): Promise<OperatingYear> => {
    // Always recompute derived fields server-side; ignore any client-supplied values.
    const calcs = computeOpYearCalcs(data);
    const year: OperatingYear = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data, ...calcs };
    await persistOpHistory([...opHistory, year]);
    return year;
  }, [opHistory, persistOpHistory]);

  const updateYear = useCallback(async (id: string, patch: Partial<OperatingYear>) => {
    await persistOpHistory(opHistory.map((y) => {
      if (y.id !== id) return y;
      // Merge patch with existing record, then recompute derived fields.
      const merged = { ...y, ...patch };
      const calcs = computeOpYearCalcs(merged);
      return { ...merged, ...calcs, updatedAt: now() };
    }));
  }, [opHistory, persistOpHistory]);

  const deleteYear = useCallback(async (id: string) => {
    await persistOpHistory(opHistory.filter((y) => y.id !== id));
  }, [opHistory, persistOpHistory]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistNotes(SEED_NOTES),
      persistRentRoll(SEED_RENT_ROLL),
      persistOpHistory(SEED_OP_HISTORY),
    ]);
  }, [persistNotes, persistRentRoll, persistOpHistory]);

  const clearData = useCallback(async () => {
    await Promise.all([persistNotes([]), persistRentRoll([]), persistOpHistory([])]);
  }, [persistNotes, persistRentRoll, persistOpHistory]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistNotes(notes.filter((n) => n.applicationId !== applicationId)),
      persistRentRoll(rentRoll.filter((u) => u.applicationId !== applicationId)),
      persistOpHistory(opHistory.filter((y) => y.applicationId !== applicationId)),
    ]);
  }, [notes, rentRoll, opHistory, persistNotes, persistRentRoll, persistOpHistory]);

  return {
    loading,
    getOrCreateNotes, updateNotes,
    getRentRoll, addUnit, updateUnit, deleteUnit,
    getOpHistory, addYear, updateYear, deleteYear,
    loadSeedData, clearData, clearForApplication,
  };
});

export { InquiryServiceProvider, useInquiryService };
