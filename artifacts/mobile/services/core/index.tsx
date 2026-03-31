import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PropertyType =
  | "Office" | "Retail" | "Industrial" | "Multifamily" | "Mixed Use"
  | "Hotel" | "Self Storage" | "Healthcare" | "Land";

export type LoanType = "Acquisition" | "Refinance" | "Construction" | "Bridge" | "Permanent";
export type InterestType = "Fixed" | "Floating" | "Hybrid";
export type RateType = "Fixed Rate" | "Adjustable Rate" | "Hybrid";
export type AmortizationType = "Full Amortizing" | "Interest Only" | "Partial IO";

export type ApplicationStatus =
  | "Inquiry" | "Initial Credit Review" | "Application Start" | "Application Processing"
  | "Final Credit Review" | "Pre-close" | "Ready for Docs" | "Docs Drawn"
  | "Docs Back" | "Closing"
  | "Inquiry Canceled" | "Inquiry Withdrawn" | "Inquiry Denied"
  | "Application Withdrawn" | "Application Canceled" | "Application Denied";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Inquiry", "Initial Credit Review", "Application Start", "Application Processing",
  "Final Credit Review", "Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing",
  "Inquiry Canceled", "Inquiry Withdrawn", "Inquiry Denied",
  "Application Withdrawn", "Application Canceled", "Application Denied",
];

/** A labeled contact entry — e.g. { label: "Work", value: "james@hartleycap.com" } */
export type ContactMethod = {
  label: string;
  value: string;
};

/** A labeled mailing address */
export type MailingAddress = {
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

export type Borrower = {
  id: string; createdAt: string; updatedAt: string;
  firstName: string; lastName: string; entityName: string;
  emails: ContactMethod[];
  phones: ContactMethod[];
  mailingAddresses: MailingAddress[];
  creExperienceYears: string; netWorthUsd: string; liquidityUsd: string;
  creditScore: string;
};

/** A single Google Maps–verified physical address for a property. */
export type PropertyLocation = {
  id: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  googlePlaceId: string;
};

export type Property = {
  id: string; createdAt: string; updatedAt: string;
  /** Free-form legal address as recorded on deed/title (not tied to Google Maps). */
  legalAddress: string;
  /** One or more Google Maps–verified physical locations for this property. */
  locations: PropertyLocation[];
  // ── Legacy single-address fields — kept for backward compat, synced from locations[0] ──
  streetAddress: string; city: string; state: string; zipCode: string;
  latitude: string; longitude: string; googlePlaceId: string;
  propertyType: PropertyType;
  grossSqFt: string; numberOfUnits: string; yearBuilt: string;
  physicalOccupancyPct: string; economicOccupancyPct: string;
};

/** A collaborator granted read access to a specific loan. */
export type CollaborationMember = {
  id: string;
  createdAt: string;
  applicationId: string;
  sid: string;
  firstName: string;
  lastName: string;
};

/** Slim application record — only core loan terms. Phase-specific data lives in each phase service. */
export type LoanApplication = {
  id: string; createdAt: string; updatedAt: string;
  status: ApplicationStatus;
  borrowerId: string;
  propertyId: string;
  loanType: LoanType;
  loanAmountUsd: string;
  loanTermYears: string;
  interestType: InterestType;
  interestRatePct: string;
  amortizationType: AmortizationType;
  ltvPct: string;
  dscrRatio: string;
  targetClosingDate: string;
  // ── Rate pricing fields (stored at 6dp, displayed at 3dp) ──
  rateType: RateType;
  baseRate: string;
  fixedRateVariance: string;
  indexName: string;
  indexRate: string;
  spreadOnFixed: string;
  allInFixedRate: string;          // calc: baseRate + fixedRateVariance + indexRate + spreadOnFixed
  adjustableRateVariance: string;
  adjustableIndexName: string;
  adjustableIndexRate: string;
  spreadOnAdjustable: string;
  proformaAdjustableAllInRate: string; // calc: baseRate + adjustableRateVariance + adjustableIndexRate + spreadOnAdjustable
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  apps: "svc_core_apps_v4",
  borrowers: "svc_core_borrowers_v2",
  properties: "svc_core_properties_v3",
  collaborators: "svc_core_collab_v1",
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

function emptyBorrower(): Omit<Borrower, "id" | "createdAt" | "updatedAt"> {
  return {
    firstName: "", lastName: "", entityName: "",
    emails: [], phones: [], mailingAddresses: [],
    creExperienceYears: "", netWorthUsd: "", liquidityUsd: "", creditScore: "",
  };
}

function emptyProperty(): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  return {
    legalAddress: "",
    locations: [],
    streetAddress: "", city: "", state: "", zipCode: "",
    latitude: "", longitude: "", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "", numberOfUnits: "", yearBuilt: "",
    physicalOccupancyPct: "", economicOccupancyPct: "",
  };
}

function emptyApp(borrowerId: string, propertyId: string): Omit<LoanApplication, "id" | "createdAt" | "updatedAt"> {
  return {
    status: "Inquiry", borrowerId, propertyId,
    loanType: "Acquisition", loanAmountUsd: "", loanTermYears: "",
    interestType: "Fixed", interestRatePct: "", amortizationType: "Full Amortizing",
    ltvPct: "", dscrRatio: "", targetClosingDate: "",
    rateType: "Fixed Rate",
    baseRate: "", fixedRateVariance: "", indexName: "", indexRate: "",
    spreadOnFixed: "", allInFixedRate: "",
    adjustableRateVariance: "", adjustableIndexName: "", adjustableIndexRate: "",
    spreadOnAdjustable: "", proformaAdjustableAllInRate: "",
  };
}

// ─── Migration helpers ─────────────────────────────────────────────────────────

const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  Draft: "Inquiry", Submitted: "Initial Credit Review",
  "Under Review": "Application Processing", Approved: "Final Credit Review", Declined: "Closing",
};

function migrateStatus(s: string): ApplicationStatus {
  return (LEGACY_STATUS[s] ?? s) as ApplicationStatus;
}

/** Migrates old single email/phone fields to the new arrays format. */
function migrateBorrower(raw: any): Borrower {
  const emails: ContactMethod[] = raw.emails
    ?? (raw.email ? [{ label: "Primary", value: raw.email }] : []);
  const phones: ContactMethod[] = raw.phones
    ?? (raw.phone ? [{ label: "Primary", value: raw.phone }] : []);
  const mailingAddresses: MailingAddress[] = raw.mailingAddresses ?? [];
  return {
    id: raw.id, createdAt: raw.createdAt, updatedAt: raw.updatedAt,
    firstName: raw.firstName ?? "", lastName: raw.lastName ?? "",
    entityName: raw.entityName ?? "",
    emails, phones, mailingAddresses,
    creExperienceYears: raw.creExperienceYears ?? "",
    netWorthUsd: raw.netWorthUsd ?? "",
    liquidityUsd: raw.liquidityUsd ?? "",
    creditScore: raw.creditScore ?? "",
  };
}

/** Fills in new fields from older stored records and migrates single address → locations array. */
function migrateProperty(raw: any): Property {
  let locations: PropertyLocation[] = raw.locations ?? [];
  if (locations.length === 0 && (raw.streetAddress || raw.city)) {
    locations = [{
      id: `loc_${raw.id}_0`,
      label: "Main",
      streetAddress: raw.streetAddress ?? "",
      city: raw.city ?? "",
      state: raw.state ?? "",
      zipCode: raw.zipCode ?? "",
      latitude: raw.latitude ?? "",
      longitude: raw.longitude ?? "",
      googlePlaceId: raw.googlePlaceId ?? "",
    }];
  }
  return {
    ...emptyProperty(),
    ...raw,
    legalAddress: raw.legalAddress ?? "",
    locations,
    latitude: raw.latitude ?? "",
    longitude: raw.longitude ?? "",
    googlePlaceId: raw.googlePlaceId ?? "",
  };
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_BORROWERS: Borrower[] = [
  { id: "seed_b01", createdAt: d(2026,1,5), updatedAt: d(2026,2,10),
    firstName: "James", lastName: "Hartley", entityName: "Hartley Capital Partners LLC",
    emails: [{ label: "Work", value: "j.hartley@hartleycap.com" }],
    phones: [{ label: "Office", value: "(212) 555-0181" }],
    mailingAddresses: [{ label: "Office", street: "745 Fifth Avenue", city: "New York", state: "NY", zipCode: "10151" }],
    creExperienceYears: "18", netWorthUsd: "24,500,000", liquidityUsd: "4,200,000", creditScore: "748" },
  { id: "seed_b02", createdAt: d(2026,1,12), updatedAt: d(2026,2,15),
    firstName: "Maria", lastName: "Santos", entityName: "Santos Real Estate Group Inc",
    emails: [{ label: "Work", value: "msantos@sreg.com" }, { label: "Personal", value: "maria.santos@gmail.com" }],
    phones: [{ label: "Mobile", value: "(213) 555-0247" }],
    mailingAddresses: [{ label: "Office", street: "3780 Wilshire Blvd Suite 800", city: "Los Angeles", state: "CA", zipCode: "90010" }],
    creExperienceYears: "14", netWorthUsd: "18,000,000", liquidityUsd: "2,800,000", creditScore: "761" },
  { id: "seed_b03", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    firstName: "David", lastName: "Chen", entityName: "Chen Properties LLC",
    emails: [{ label: "Work", value: "dchen@chenproperties.com" }],
    phones: [{ label: "Direct", value: "(415) 555-0312" }, { label: "Mobile", value: "(415) 555-0313" }],
    mailingAddresses: [
      { label: "HQ", street: "101 California St Suite 2450", city: "San Francisco", state: "CA", zipCode: "94111" },
      { label: "Home", street: "42 Pacific Heights Blvd", city: "San Francisco", state: "CA", zipCode: "94109" },
    ],
    creExperienceYears: "22", netWorthUsd: "41,000,000", liquidityUsd: "7,500,000", creditScore: "782" },
  { id: "seed_b04", createdAt: d(2026,2,3), updatedAt: d(2026,3,8),
    firstName: "Rachel", lastName: "Kim", entityName: "Meridian Investments Group",
    emails: [{ label: "Work", value: "rkim@meridian-inv.com" }],
    phones: [{ label: "Office", value: "(312) 555-0499" }],
    mailingAddresses: [{ label: "Office", street: "200 S Michigan Ave Ste 1200", city: "Chicago", state: "IL", zipCode: "60604" }],
    creExperienceYears: "11", netWorthUsd: "12,750,000", liquidityUsd: "1,900,000", creditScore: "733" },
  { id: "seed_b05", createdAt: d(2026,2,10), updatedAt: d(2026,3,5),
    firstName: "Thomas", lastName: "Brooks", entityName: "Brooks & Associates CRE",
    emails: [{ label: "Work", value: "tbrooks@brooksassoc.com" }],
    phones: [{ label: "Office", value: "(713) 555-0560" }],
    mailingAddresses: [{ label: "Office", street: "1000 Main St Suite 2500", city: "Houston", state: "TX", zipCode: "77002" }],
    creExperienceYears: "9", netWorthUsd: "8,200,000", liquidityUsd: "1,100,000", creditScore: "719" },
  { id: "seed_b06", createdAt: d(2026,2,18), updatedAt: d(2026,3,12),
    firstName: "Sarah", lastName: "Mitchell", entityName: "Mitchell Commercial Real Estate LLC",
    emails: [{ label: "Work", value: "smitchell@mitchellcre.com" }, { label: "Investor", value: "sarah@mitchellcre.com" }],
    phones: [{ label: "Office", value: "(305) 555-0623" }, { label: "Mobile", value: "(305) 555-0624" }],
    mailingAddresses: [{ label: "Office", street: "200 SE 1st Street Suite 700", city: "Miami", state: "FL", zipCode: "33131" }],
    creExperienceYears: "16", netWorthUsd: "31,000,000", liquidityUsd: "5,400,000", creditScore: "769" },
  { id: "seed_b07", createdAt: d(2026,1,28), updatedAt: d(2026,3,15),
    firstName: "Robert", lastName: "Nguyen", entityName: "Pacific Coast Holdings Corp",
    emails: [{ label: "Work", value: "rnguyen@paccoasthold.com" }],
    phones: [{ label: "Direct", value: "(949) 555-0778" }],
    mailingAddresses: [{ label: "Corporate", street: "18300 Von Karman Ave Suite 900", city: "Irvine", state: "CA", zipCode: "92612" }],
    creExperienceYears: "20", netWorthUsd: "55,000,000", liquidityUsd: "9,100,000", creditScore: "795" },
  { id: "seed_b08", createdAt: d(2026,3,2), updatedAt: d(2026,3,20),
    firstName: "Evelyn", lastName: "Carter", entityName: "Carter Development Corporation",
    emails: [{ label: "Work", value: "ecarter@carterdevelopment.com" }],
    phones: [{ label: "Mobile", value: "(512) 555-0834" }],
    mailingAddresses: [],
    creExperienceYears: "7", netWorthUsd: "6,500,000", liquidityUsd: "900,000", creditScore: "" },
  { id: "seed_b09", createdAt: d(2026,2,8), updatedAt: d(2026,2,22),
    firstName: "Kevin", lastName: "Walsh", entityName: "Walsh Property Ventures LLC",
    emails: [{ label: "Work", value: "kwalsh@walshpv.com" }],
    phones: [{ label: "Office", value: "(617) 555-0911" }],
    mailingAddresses: [{ label: "Office", street: "One Financial Center Suite 1400", city: "Boston", state: "MA", zipCode: "02111" }],
    creExperienceYears: "5", netWorthUsd: "4,100,000", liquidityUsd: "620,000", creditScore: "701" },
  { id: "seed_b10", createdAt: d(2026,1,20), updatedAt: d(2026,3,3),
    firstName: "Angela", lastName: "Reeves", entityName: "Reeves Capital Group Inc",
    emails: [{ label: "Work", value: "areeves@reevescap.com" }],
    phones: [{ label: "Direct", value: "(303) 555-1044" }],
    mailingAddresses: [{ label: "Office", street: "1700 Lincoln Street Suite 2000", city: "Denver", state: "CO", zipCode: "80203" }],
    creExperienceYears: "12", netWorthUsd: "14,000,000", liquidityUsd: "2,100,000", creditScore: "744" },
  { id: "seed_b11", createdAt: d(2025,11,12), updatedAt: d(2026,2,14),
    firstName: "Marcus", lastName: "Liu", entityName: "Liu Commercial Holdings LLC",
    emails: [{ label: "Work", value: "mliu@liucommercial.com" }],
    phones: [{ label: "Mobile", value: "(310) 555-1177" }],
    mailingAddresses: [{ label: "Office", street: "10000 Santa Monica Blvd Suite 300", city: "Los Angeles", state: "CA", zipCode: "90067" }],
    creExperienceYears: "8", netWorthUsd: "9,300,000", liquidityUsd: "1,250,000", creditScore: "728" },
  { id: "seed_b12", createdAt: d(2026,1,8), updatedAt: d(2026,3,10),
    firstName: "Alex", lastName: "Thompson", entityName: "Thompson Capital Partners LLC",
    emails: [{ label: "Work", value: "athompson@thompsoncap.com" }],
    phones: [{ label: "Office", value: "(214) 555-0112" }],
    mailingAddresses: [{ label: "Office", street: "2200 Ross Avenue Suite 3800", city: "Dallas", state: "TX", zipCode: "75201" }],
    creExperienceYears: "13", netWorthUsd: "16,800,000", liquidityUsd: "2,400,000", creditScore: "752" },
  { id: "seed_b13", createdAt: d(2026,1,15), updatedAt: d(2026,3,12),
    firstName: "Jennifer", lastName: "Yamamoto", entityName: "Yamamoto Pacific Properties LLC",
    emails: [{ label: "Work", value: "jyamamoto@yamprop.com" }],
    phones: [{ label: "Direct", value: "(206) 555-0231" }],
    mailingAddresses: [{ label: "Office", street: "1420 Fifth Avenue Suite 3300", city: "Seattle", state: "WA", zipCode: "98101" }],
    creExperienceYears: "17", netWorthUsd: "22,500,000", liquidityUsd: "3,800,000", creditScore: "763" },
  { id: "seed_b14", createdAt: d(2026,2,1), updatedAt: d(2026,3,8),
    firstName: "Michael", lastName: "O'Brien", entityName: "O'Brien Commercial Realty LLC",
    emails: [{ label: "Work", value: "mobrien@obrienre.com" }],
    phones: [{ label: "Office", value: "(615) 555-0345" }],
    mailingAddresses: [{ label: "Office", street: "150 4th Avenue North Suite 2000", city: "Nashville", state: "TN", zipCode: "37219" }],
    creExperienceYears: "10", netWorthUsd: "11,200,000", liquidityUsd: "1,600,000", creditScore: "738" },
  { id: "seed_b15", createdAt: d(2026,1,25), updatedAt: d(2026,3,5),
    firstName: "Patricia", lastName: "Nguyen", entityName: "Golden State Real Estate Inc",
    emails: [{ label: "Work", value: "pnguyen@goldenstatere.com" }],
    phones: [{ label: "Mobile", value: "(916) 555-0467" }],
    mailingAddresses: [{ label: "Office", street: "400 Capitol Mall Suite 1200", city: "Sacramento", state: "CA", zipCode: "95814" }],
    creExperienceYears: "15", netWorthUsd: "19,400,000", liquidityUsd: "2,900,000", creditScore: "757" },
  { id: "seed_b16", createdAt: d(2026,2,5), updatedAt: d(2026,3,14),
    firstName: "William", lastName: "Foster", entityName: "Foster Pacific Investments LLC",
    emails: [{ label: "Work", value: "wfoster@fosterpacific.com" }],
    phones: [{ label: "Office", value: "(503) 555-0589" }],
    mailingAddresses: [{ label: "Office", street: "1 SW Columbia Street Suite 1100", city: "Portland", state: "OR", zipCode: "97204" }],
    creExperienceYears: "12", netWorthUsd: "13,600,000", liquidityUsd: "2,100,000", creditScore: "745" },
  { id: "seed_b17", createdAt: d(2026,1,18), updatedAt: d(2026,3,9),
    firstName: "Linda", lastName: "Watkins", entityName: "Watkins Properties Group LLC",
    emails: [{ label: "Work", value: "lwatkins@watkinsprop.com" }],
    phones: [{ label: "Direct", value: "(704) 555-0634" }],
    mailingAddresses: [{ label: "Office", street: "214 North Tryon Street Suite 800", city: "Charlotte", state: "NC", zipCode: "28202" }],
    creExperienceYears: "14", netWorthUsd: "17,800,000", liquidityUsd: "2,600,000", creditScore: "754" },
  { id: "seed_b18", createdAt: d(2026,2,10), updatedAt: d(2026,3,18),
    firstName: "Christopher", lastName: "Hansen", entityName: "Hansen Commercial Advisors Inc",
    emails: [{ label: "Work", value: "chansen@hansencomm.com" }],
    phones: [{ label: "Office", value: "(612) 555-0756" }],
    mailingAddresses: [{ label: "Office", street: "90 South 7th Street Suite 4200", city: "Minneapolis", state: "MN", zipCode: "55402" }],
    creExperienceYears: "19", netWorthUsd: "28,400,000", liquidityUsd: "4,500,000", creditScore: "771" },
  { id: "seed_b19", createdAt: d(2026,2,15), updatedAt: d(2026,3,20),
    firstName: "Stephanie", lastName: "Rivera", entityName: "Rivera Hospitality Holdings LLC",
    emails: [{ label: "Work", value: "srivera@riverahospitality.com" }],
    phones: [{ label: "Mobile", value: "(702) 555-0872" }],
    mailingAddresses: [{ label: "Office", street: "3960 Howard Hughes Pkwy Suite 500", city: "Las Vegas", state: "NV", zipCode: "89169" }],
    creExperienceYears: "21", netWorthUsd: "42,000,000", liquidityUsd: "7,200,000", creditScore: "779" },
  { id: "seed_b20", createdAt: d(2026,1,22), updatedAt: d(2026,3,6),
    firstName: "Andrew", lastName: "Cooper", entityName: "Cooper Storage Ventures LLC",
    emails: [{ label: "Work", value: "acooper@cooperstorage.com" }],
    phones: [{ label: "Office", value: "(619) 555-0994" }],
    mailingAddresses: [{ label: "Office", street: "600 B Street Suite 300", city: "San Diego", state: "CA", zipCode: "92101" }],
    creExperienceYears: "9", netWorthUsd: "9,800,000", liquidityUsd: "1,400,000", creditScore: "729" },
  { id: "seed_b21", createdAt: d(2026,1,28), updatedAt: d(2026,3,11),
    firstName: "Olivia", lastName: "Washington", entityName: "Washington Realty Partners LLC",
    emails: [{ label: "Work", value: "owashington@washingtonrealty.com" }],
    phones: [{ label: "Direct", value: "(813) 555-0123" }],
    mailingAddresses: [{ label: "Office", street: "100 N Tampa Street Suite 3200", city: "Tampa", state: "FL", zipCode: "33602" }],
    creExperienceYears: "16", netWorthUsd: "23,500,000", liquidityUsd: "3,600,000", creditScore: "762" },
  { id: "seed_b22", createdAt: d(2026,2,3), updatedAt: d(2026,3,13),
    firstName: "Nathan", lastName: "Bell", entityName: "Bell Triangle Capital LLC",
    emails: [{ label: "Work", value: "nbell@belltrianglecap.com" }],
    phones: [{ label: "Office", value: "(919) 555-0245" }],
    mailingAddresses: [{ label: "Office", street: "4700 Six Forks Road Suite 300", city: "Raleigh", state: "NC", zipCode: "27609" }],
    creExperienceYears: "11", netWorthUsd: "13,200,000", liquidityUsd: "2,000,000", creditScore: "741" },
  { id: "seed_b23", createdAt: d(2026,2,8), updatedAt: d(2026,3,15),
    firstName: "Diana", lastName: "Morrison", entityName: "Morrison Retail Properties Inc",
    emails: [{ label: "Work", value: "dmorrison@morrisonretail.com" }],
    phones: [{ label: "Office", value: "(816) 555-0367" }],
    mailingAddresses: [{ label: "Office", street: "1201 Walnut Street Suite 2600", city: "Kansas City", state: "MO", zipCode: "64106" }],
    creExperienceYears: "13", netWorthUsd: "15,400,000", liquidityUsd: "2,200,000", creditScore: "748" },
  { id: "seed_b24", createdAt: d(2026,1,30), updatedAt: d(2026,3,10),
    firstName: "Gregory", lastName: "Powell", entityName: "Powell Industrial Group LLC",
    emails: [{ label: "Work", value: "gpowell@powellindustrial.com" }],
    phones: [{ label: "Direct", value: "(614) 555-0489" }],
    mailingAddresses: [{ label: "Office", street: "250 South High Street Suite 400", city: "Columbus", state: "OH", zipCode: "43215" }],
    creExperienceYears: "18", netWorthUsd: "26,800,000", liquidityUsd: "4,100,000", creditScore: "768" },
  { id: "seed_b25", createdAt: d(2026,2,12), updatedAt: d(2026,3,17),
    firstName: "Amanda", lastName: "Turner", entityName: "Turner Bay Properties LLC",
    emails: [{ label: "Work", value: "aturner@turnerbay.com" }],
    phones: [{ label: "Mobile", value: "(804) 555-0512" }],
    mailingAddresses: [{ label: "Office", street: "919 East Main Street Suite 1000", city: "Richmond", state: "VA", zipCode: "23219" }],
    creExperienceYears: "8", netWorthUsd: "8,600,000", liquidityUsd: "1,200,000", creditScore: "724" },
  { id: "seed_b26", createdAt: d(2026,1,20), updatedAt: d(2026,3,8),
    firstName: "Kenneth", lastName: "Clark", entityName: "Clark Equity Investments LLC",
    emails: [{ label: "Work", value: "kclark@clarkequity.com" }],
    phones: [{ label: "Office", value: "(317) 555-0638" }],
    mailingAddresses: [{ label: "Office", street: "111 Monument Circle Suite 3600", city: "Indianapolis", state: "IN", zipCode: "46204" }],
    creExperienceYears: "20", netWorthUsd: "34,200,000", liquidityUsd: "5,800,000", creditScore: "775" },
  { id: "seed_b27", createdAt: d(2026,2,6), updatedAt: d(2026,3,14),
    firstName: "Denise", lastName: "Harrison", entityName: "Harrison Gateway Properties LLC",
    emails: [{ label: "Work", value: "dharrison@harrisongw.com" }],
    phones: [{ label: "Direct", value: "(502) 555-0751" }],
    mailingAddresses: [{ label: "Office", street: "400 W Market Street Suite 1800", city: "Louisville", state: "KY", zipCode: "40202" }],
    creExperienceYears: "11", netWorthUsd: "12,800,000", liquidityUsd: "1,900,000", creditScore: "739" },
  { id: "seed_b28", createdAt: d(2026,1,14), updatedAt: d(2026,3,6),
    firstName: "Richard", lastName: "Lewis", entityName: "Lewis Memphis Holdings LLC",
    emails: [{ label: "Work", value: "rlewis@lewismemphis.com" }],
    phones: [{ label: "Office", value: "(901) 555-0874" }],
    mailingAddresses: [{ label: "Office", street: "6000 Poplar Avenue Suite 250", city: "Memphis", state: "TN", zipCode: "38119" }],
    creExperienceYears: "16", netWorthUsd: "21,600,000", liquidityUsd: "3,400,000", creditScore: "760" },
  { id: "seed_b29", createdAt: d(2026,2,18), updatedAt: d(2026,3,19),
    firstName: "Carol", lastName: "White", entityName: "White Riverfront Capital LLC",
    emails: [{ label: "Work", value: "cwhite@whiterivfront.com" }],
    phones: [{ label: "Mobile", value: "(314) 555-0996" }],
    mailingAddresses: [{ label: "Office", street: "One Metropolitan Square Suite 3000", city: "St. Louis", state: "MO", zipCode: "63102" }],
    creExperienceYears: "12", netWorthUsd: "14,200,000", liquidityUsd: "2,100,000", creditScore: "745" },
  { id: "seed_b30", createdAt: d(2026,1,10), updatedAt: d(2026,3,4),
    firstName: "Steven", lastName: "Green", entityName: "Green River Equities LLC",
    emails: [{ label: "Work", value: "sgreen@greenriverequities.com" }],
    phones: [{ label: "Direct", value: "(412) 555-0118" }],
    mailingAddresses: [{ label: "Office", street: "One PPG Place Suite 3000", city: "Pittsburgh", state: "PA", zipCode: "15222" }],
    creExperienceYears: "9", netWorthUsd: "10,400,000", liquidityUsd: "1,500,000", creditScore: "731" },
  { id: "seed_b31", createdAt: d(2026,2,14), updatedAt: d(2026,3,16),
    firstName: "Michelle", lastName: "Baker", entityName: "Baker Harbor Properties LLC",
    emails: [{ label: "Work", value: "mbaker@bakerharborprop.com" }],
    phones: [{ label: "Office", value: "(410) 555-0234" }],
    mailingAddresses: [{ label: "Office", street: "100 East Pratt Street Suite 2600", city: "Baltimore", state: "MD", zipCode: "21202" }],
    creExperienceYears: "14", netWorthUsd: "18,800,000", liquidityUsd: "2,800,000", creditScore: "756" },
  { id: "seed_b32", createdAt: d(2026,1,26), updatedAt: d(2026,3,7),
    firstName: "Paul", lastName: "Robinson", entityName: "Robinson Motor City Realty LLC",
    emails: [{ label: "Work", value: "probinson@rcmotorcityrealty.com" }],
    phones: [{ label: "Direct", value: "(248) 555-0356" }],
    mailingAddresses: [{ label: "Office", street: "30600 Telegraph Road Suite 1200", city: "Bingham Farms", state: "MI", zipCode: "48025" }],
    creExperienceYears: "10", netWorthUsd: "11,600,000", liquidityUsd: "1,700,000", creditScore: "737" },
  { id: "seed_b33", createdAt: d(2026,2,20), updatedAt: d(2026,3,18),
    firstName: "Brenda", lastName: "Cox", entityName: "Cox Alamo Commercial LLC",
    emails: [{ label: "Work", value: "bcox@coxalamocomm.com" }],
    phones: [{ label: "Office", value: "(210) 555-0478" }],
    mailingAddresses: [{ label: "Office", street: "112 E Pecan Street Suite 1700", city: "San Antonio", state: "TX", zipCode: "78205" }],
    creExperienceYears: "15", netWorthUsd: "20,200,000", liquidityUsd: "3,200,000", creditScore: "759" },
  { id: "seed_b34", createdAt: d(2026,1,16), updatedAt: d(2026,3,5),
    firstName: "Gary", lastName: "Hall", entityName: "Hall Valley Properties LLC",
    emails: [{ label: "Work", value: "ghall@hallvalleyprop.com" }],
    phones: [{ label: "Mobile", value: "(916) 555-0595" }],
    mailingAddresses: [{ label: "Office", street: "980 9th Street Suite 2200", city: "Sacramento", state: "CA", zipCode: "95814" }],
    creExperienceYears: "11", netWorthUsd: "13,400,000", liquidityUsd: "2,000,000", creditScore: "742" },
  { id: "seed_b35", createdAt: d(2026,2,22), updatedAt: d(2026,3,20),
    firstName: "Susan", lastName: "Young", entityName: "Young Bay Area Investments LLC",
    emails: [{ label: "Work", value: "syoung@youngbayarea.com" }],
    phones: [{ label: "Direct", value: "(510) 555-0712" }],
    mailingAddresses: [{ label: "Office", street: "1901 Harrison Street Suite 1100", city: "Oakland", state: "CA", zipCode: "94612" }],
    creExperienceYears: "13", netWorthUsd: "16,200,000", liquidityUsd: "2,500,000", creditScore: "750" },
  { id: "seed_b36", createdAt: d(2026,1,12), updatedAt: d(2026,3,3),
    firstName: "Charles", lastName: "Allen", entityName: "Allen Silicon Ventures LLC",
    emails: [{ label: "Work", value: "callen@allensilicon.com" }],
    phones: [{ label: "Office", value: "(408) 555-0834" }],
    mailingAddresses: [{ label: "Office", street: "60 South Market Street Suite 1400", city: "San Jose", state: "CA", zipCode: "95113" }],
    creExperienceYears: "22", netWorthUsd: "48,000,000", liquidityUsd: "8,200,000", creditScore: "783" },
  { id: "seed_b37", createdAt: d(2026,2,16), updatedAt: d(2026,3,15),
    firstName: "Barbara", lastName: "Wright", entityName: "Wright Lakefront Holdings LLC",
    emails: [{ label: "Work", value: "bwright@wrightlakefront.com" }],
    phones: [{ label: "Office", value: "(216) 555-0951" }],
    mailingAddresses: [{ label: "Office", street: "200 Public Square Suite 2300", city: "Cleveland", state: "OH", zipCode: "44114" }],
    creExperienceYears: "16", netWorthUsd: "22,000,000", liquidityUsd: "3,500,000", creditScore: "762" },
  { id: "seed_b38", createdAt: d(2026,1,24), updatedAt: d(2026,3,11),
    firstName: "Donald", lastName: "King", entityName: "King Sunshine Properties LLC",
    emails: [{ label: "Work", value: "dking@kingsunshine.com" }],
    phones: [{ label: "Mobile", value: "(407) 555-0073" }],
    mailingAddresses: [{ label: "Office", street: "390 North Orange Avenue Suite 2300", city: "Orlando", state: "FL", zipCode: "32801" }],
    creExperienceYears: "12", netWorthUsd: "14,800,000", liquidityUsd: "2,200,000", creditScore: "746" },
  { id: "seed_b39", createdAt: d(2026,2,4), updatedAt: d(2026,3,12),
    firstName: "Dorothy", lastName: "Martin", entityName: "Martin Inland Empire LLC",
    emails: [{ label: "Work", value: "dmartin@martinie.com" }],
    phones: [{ label: "Direct", value: "(951) 555-0195" }],
    mailingAddresses: [{ label: "Office", street: "3600 Lime Street Suite 500", city: "Riverside", state: "CA", zipCode: "92501" }],
    creExperienceYears: "10", netWorthUsd: "12,200,000", liquidityUsd: "1,800,000", creditScore: "736" },
  { id: "seed_b40", createdAt: d(2026,1,28), updatedAt: d(2026,3,9),
    firstName: "George", lastName: "Thompson", entityName: "Thompson River Capital LLC",
    emails: [{ label: "Work", value: "gthompson@thompsonrivercap.com" }],
    phones: [{ label: "Office", value: "(513) 555-0317" }],
    mailingAddresses: [{ label: "Office", street: "312 Elm Street Suite 1800", city: "Cincinnati", state: "OH", zipCode: "45202" }],
    creExperienceYears: "8", netWorthUsd: "9,400,000", liquidityUsd: "1,300,000", creditScore: "726" },
  { id: "seed_b41", createdAt: d(2026,2,20), updatedAt: d(2026,3,17),
    firstName: "Helen", lastName: "Anderson", entityName: "Anderson First Coast Realty LLC",
    emails: [{ label: "Work", value: "handerson@firstcoastrealty.com" }],
    phones: [{ label: "Office", value: "(904) 555-0439" }],
    mailingAddresses: [{ label: "Office", street: "1301 Riverplace Blvd Suite 800", city: "Jacksonville", state: "FL", zipCode: "32207" }],
    creExperienceYears: "17", netWorthUsd: "24,600,000", liquidityUsd: "3,800,000", creditScore: "764" },
  { id: "seed_b42", createdAt: d(2026,1,16), updatedAt: d(2026,3,6),
    firstName: "John", lastName: "Davis", entityName: "Davis Coastal Properties LLC",
    emails: [{ label: "Work", value: "jdavis@daviscoastal.com" }],
    phones: [{ label: "Direct", value: "(757) 555-0561" }],
    mailingAddresses: [{ label: "Office", street: "440 Monticello Avenue Suite 1800", city: "Norfolk", state: "VA", zipCode: "23510" }],
    creExperienceYears: "9", netWorthUsd: "10,200,000", liquidityUsd: "1,500,000", creditScore: "730" },
  { id: "seed_b43", createdAt: d(2026,2,9), updatedAt: d(2026,3,13),
    firstName: "Mary", lastName: "Jackson", entityName: "Jackson Desert Investments LLC",
    emails: [{ label: "Work", value: "mjackson@jacksondesert.com" }],
    phones: [{ label: "Office", value: "(520) 555-0683" }],
    mailingAddresses: [{ label: "Office", street: "5151 E Broadway Blvd Suite 1600", city: "Tucson", state: "AZ", zipCode: "85711" }],
    creExperienceYears: "12", netWorthUsd: "13,800,000", liquidityUsd: "2,000,000", creditScore: "743" },
  { id: "seed_b44", createdAt: d(2026,1,22), updatedAt: d(2026,3,7),
    firstName: "James", lastName: "Moore", entityName: "Moore Providence Holdings LLC",
    emails: [{ label: "Work", value: "jmoore@mooreprovidence.com" }],
    phones: [{ label: "Mobile", value: "(401) 555-0805" }],
    mailingAddresses: [{ label: "Office", street: "10 Memorial Blvd Suite 400", city: "Providence", state: "RI", zipCode: "02903" }],
    creExperienceYears: "7", netWorthUsd: "7,800,000", liquidityUsd: "1,100,000", creditScore: "720" },
  { id: "seed_b45", createdAt: d(2026,2,11), updatedAt: d(2026,3,16),
    firstName: "Patricia", lastName: "Jackson", entityName: "Jackson Bayou Properties LLC",
    emails: [{ label: "Work", value: "pjackson@jacksonbayou.com" }],
    phones: [{ label: "Office", value: "(225) 555-0927" }],
    mailingAddresses: [{ label: "Office", street: "One American Place Suite 1200", city: "Baton Rouge", state: "LA", zipCode: "70825" }],
    creExperienceYears: "14", netWorthUsd: "18,200,000", liquidityUsd: "2,700,000", creditScore: "753" },
  { id: "seed_b46", createdAt: d(2026,1,18), updatedAt: d(2026,3,4),
    firstName: "Robert", lastName: "Harris", entityName: "Harris Nutmeg Capital LLC",
    emails: [{ label: "Work", value: "rharris@harrisnutmeg.com" }],
    phones: [{ label: "Direct", value: "(860) 555-0049" }],
    mailingAddresses: [{ label: "Office", street: "100 Pearl Street Suite 1400", city: "Hartford", state: "CT", zipCode: "06103" }],
    creExperienceYears: "11", netWorthUsd: "13,600,000", liquidityUsd: "2,100,000", creditScore: "742" },
  { id: "seed_b47", createdAt: d(2026,2,17), updatedAt: d(2026,3,18),
    firstName: "Linda", lastName: "Williams", entityName: "Williams Piedmont Realty LLC",
    emails: [{ label: "Work", value: "lwilliams@williamspiedmont.com" }],
    phones: [{ label: "Office", value: "(336) 555-0171" }],
    mailingAddresses: [{ label: "Office", street: "301 North Elm Street Suite 800", city: "Greensboro", state: "NC", zipCode: "27401" }],
    creExperienceYears: "16", netWorthUsd: "21,400,000", liquidityUsd: "3,300,000", creditScore: "761" },
  { id: "seed_b48", createdAt: d(2026,1,28), updatedAt: d(2026,3,11),
    firstName: "Michael", lastName: "Jones", entityName: "Jones Prairie Real Estate LLC",
    emails: [{ label: "Work", value: "mjones@jonesprairie.com" }],
    phones: [{ label: "Office", value: "(405) 555-0293" }],
    mailingAddresses: [{ label: "Office", street: "100 North Broadway Suite 2400", city: "Oklahoma City", state: "OK", zipCode: "73102" }],
    creExperienceYears: "10", netWorthUsd: "11,800,000", liquidityUsd: "1,700,000", creditScore: "737" },
  { id: "seed_b49", createdAt: d(2026,2,6), updatedAt: d(2026,3,14),
    firstName: "Sarah", lastName: "Miller", entityName: "Miller Mountain Capital LLC",
    emails: [{ label: "Work", value: "smiller@millermtncap.com" }],
    phones: [{ label: "Direct", value: "(801) 555-0415" }],
    mailingAddresses: [{ label: "Office", street: "36 South State Street Suite 1400", city: "Salt Lake City", state: "UT", zipCode: "84111" }],
    creExperienceYears: "13", netWorthUsd: "15,600,000", liquidityUsd: "2,300,000", creditScore: "749" },
  { id: "seed_b50", createdAt: d(2026,1,24), updatedAt: d(2026,3,8),
    firstName: "William", lastName: "Wilson", entityName: "Wilson Rio Grande Properties LLC",
    emails: [{ label: "Work", value: "wwilson@wilsonriogrand.com" }],
    phones: [{ label: "Office", value: "(505) 555-0537" }],
    mailingAddresses: [{ label: "Office", street: "400 Gold Avenue SW Suite 800", city: "Albuquerque", state: "NM", zipCode: "87102" }],
    creExperienceYears: "12", netWorthUsd: "14,400,000", liquidityUsd: "2,200,000", creditScore: "745" },
  { id: "seed_b51", createdAt: d(2026,2,13), updatedAt: d(2026,3,17),
    firstName: "Elizabeth", lastName: "Taylor", entityName: "Taylor Heartland Capital LLC",
    emails: [{ label: "Work", value: "etaylor@taylorheartland.com" }],
    phones: [{ label: "Mobile", value: "(402) 555-0659" }],
    mailingAddresses: [{ label: "Office", street: "1299 Farnam Street Suite 1400", city: "Omaha", state: "NE", zipCode: "68102" }],
    creExperienceYears: "9", netWorthUsd: "9,800,000", liquidityUsd: "1,400,000", creditScore: "730" },
  { id: "seed_b52", createdAt: d(2026,1,20), updatedAt: d(2026,3,5),
    firstName: "David", lastName: "Brown", entityName: "Brown Border Properties LLC",
    emails: [{ label: "Work", value: "dbrown@brownborderprop.com" }],
    phones: [{ label: "Office", value: "(915) 555-0781" }],
    mailingAddresses: [{ label: "Office", street: "221 N Kansas Street Suite 1200", city: "El Paso", state: "TX", zipCode: "79901" }],
    creExperienceYears: "15", netWorthUsd: "19,800,000", liquidityUsd: "3,000,000", creditScore: "756" },
  { id: "seed_b53", createdAt: d(2026,2,2), updatedAt: d(2026,3,10),
    firstName: "Barbara", lastName: "Davis", entityName: "Davis Finger Lakes Holdings LLC",
    emails: [{ label: "Work", value: "bdavis@davisfingerlakes.com" }],
    phones: [{ label: "Direct", value: "(585) 555-0903" }],
    mailingAddresses: [{ label: "Office", street: "220 Alexander Street Suite 300", city: "Rochester", state: "NY", zipCode: "14607" }],
    creExperienceYears: "11", netWorthUsd: "12,400,000", liquidityUsd: "1,800,000", creditScore: "739" },
  { id: "seed_b54", createdAt: d(2026,1,10), updatedAt: d(2026,3,2),
    firstName: "Richard", lastName: "Johnson", entityName: "Johnson Niagara Capital LLC",
    emails: [{ label: "Work", value: "rjohnson@johnsonniagaracap.com" }],
    phones: [{ label: "Office", value: "(716) 555-0025" }],
    mailingAddresses: [{ label: "Office", street: "50 Fountain Plaza Suite 1200", city: "Buffalo", state: "NY", zipCode: "14202" }],
    creExperienceYears: "8", netWorthUsd: "9,200,000", liquidityUsd: "1,300,000", creditScore: "723" },
  { id: "seed_b55", createdAt: d(2026,2,19), updatedAt: d(2026,3,19),
    firstName: "Susan", lastName: "Martinez", entityName: "Martinez Rubber City Realty LLC",
    emails: [{ label: "Work", value: "smartinez@mrcrubber.com" }],
    phones: [{ label: "Office", value: "(330) 555-0147" }],
    mailingAddresses: [{ label: "Office", street: "388 S Main Street Suite 400", city: "Akron", state: "OH", zipCode: "44311" }],
    creExperienceYears: "10", netWorthUsd: "11,200,000", liquidityUsd: "1,600,000", creditScore: "734" },
  { id: "seed_b56", createdAt: d(2026,1,14), updatedAt: d(2026,3,4),
    firstName: "Joseph", lastName: "Garcia", entityName: "Garcia Central Valley Properties LLC",
    emails: [{ label: "Work", value: "jgarcia@gcvprop.com" }],
    phones: [{ label: "Mobile", value: "(559) 555-0269" }],
    mailingAddresses: [{ label: "Office", street: "1001 Van Ness Avenue Suite 300", city: "Fresno", state: "CA", zipCode: "93721" }],
    creExperienceYears: "14", netWorthUsd: "17,600,000", liquidityUsd: "2,600,000", creditScore: "753" },
  { id: "seed_b57", createdAt: d(2026,2,21), updatedAt: d(2026,3,20),
    firstName: "Margaret", lastName: "Rodriguez", entityName: "Rodriguez Pacific Port LLC",
    emails: [{ label: "Work", value: "mrodriguez@rpacificport.com" }],
    phones: [{ label: "Direct", value: "(562) 555-0391" }],
    mailingAddresses: [{ label: "Office", street: "444 W Ocean Blvd Suite 1000", city: "Long Beach", state: "CA", zipCode: "90802" }],
    creExperienceYears: "17", netWorthUsd: "23,200,000", liquidityUsd: "3,600,000", creditScore: "763" },
  { id: "seed_b58", createdAt: d(2026,1,8), updatedAt: d(2026,3,1),
    firstName: "Thomas", lastName: "Martinez", entityName: "Martinez Northwest Holdings LLC",
    emails: [{ label: "Work", value: "tmartinez@mtnorthwest.com" }],
    phones: [{ label: "Office", value: "(509) 555-0513" }],
    mailingAddresses: [{ label: "Office", street: "601 W First Avenue Suite 1400", city: "Spokane", state: "WA", zipCode: "99201" }],
    creExperienceYears: "11", netWorthUsd: "12,800,000", liquidityUsd: "1,900,000", creditScore: "740" },
  { id: "seed_b59", createdAt: d(2026,2,24), updatedAt: d(2026,3,20),
    firstName: "Jessica", lastName: "Robinson", entityName: "Robinson Rocky Mountain Corp",
    emails: [{ label: "Work", value: "jrobinson@robinsonrm.com" }],
    phones: [{ label: "Direct", value: "(719) 555-0635" }],
    mailingAddresses: [{ label: "Office", street: "102 S Tejon Street Suite 1100", city: "Colorado Springs", state: "CO", zipCode: "80903" }],
    creExperienceYears: "13", netWorthUsd: "16,400,000", liquidityUsd: "2,500,000", creditScore: "751" },
  { id: "seed_b60", createdAt: d(2026,1,22), updatedAt: d(2026,3,9),
    firstName: "Daniel", lastName: "Lewis", entityName: "Lewis Bluegrass Properties LLC",
    emails: [{ label: "Work", value: "dlewis@lewisbluegrass.com" }],
    phones: [{ label: "Office", value: "(859) 555-0757" }],
    mailingAddresses: [{ label: "Office", street: "120 W Main Street Suite 2200", city: "Lexington", state: "KY", zipCode: "40507" }],
    creExperienceYears: "15", netWorthUsd: "19,200,000", liquidityUsd: "2,900,000", creditScore: "757" },
  { id: "seed_b61", createdAt: d(2026,2,8), updatedAt: d(2026,3,13),
    firstName: "Nancy", lastName: "Lee", entityName: "Lee Prairie Capital Group LLC",
    emails: [{ label: "Work", value: "nlee@leeprairiecap.com" }],
    phones: [{ label: "Mobile", value: "(515) 555-0879" }],
    mailingAddresses: [{ label: "Office", street: "801 Grand Avenue Suite 3200", city: "Des Moines", state: "IA", zipCode: "50309" }],
    creExperienceYears: "8", netWorthUsd: "9,600,000", liquidityUsd: "1,400,000", creditScore: "727" },
  { id: "seed_b62", createdAt: d(2026,1,18), updatedAt: d(2026,3,7),
    firstName: "Paul", lastName: "Walker", entityName: "Walker Delta Properties LLC",
    emails: [{ label: "Work", value: "pwalker@walkerdeltaprop.com" }],
    phones: [{ label: "Direct", value: "(501) 555-0991" }],
    mailingAddresses: [{ label: "Office", street: "425 W Capitol Avenue Suite 1600", city: "Little Rock", state: "AR", zipCode: "72201" }],
    creExperienceYears: "10", netWorthUsd: "10,800,000", liquidityUsd: "1,600,000", creditScore: "734" },
  { id: "seed_b63", createdAt: d(2026,2,15), updatedAt: d(2026,3,16),
    firstName: "Karen", lastName: "Hall", entityName: "Hall Red River Holdings LLC",
    emails: [{ label: "Work", value: "khall@hallredriver.com" }],
    phones: [{ label: "Office", value: "(318) 555-0113" }],
    mailingAddresses: [{ label: "Office", street: "401 Market Street Suite 1200", city: "Shreveport", state: "LA", zipCode: "71101" }],
    creExperienceYears: "13", netWorthUsd: "15,800,000", liquidityUsd: "2,300,000", creditScore: "748" },
  { id: "seed_b64", createdAt: d(2026,1,26), updatedAt: d(2026,3,10),
    firstName: "Mark", lastName: "Young", entityName: "Young Steel City Birmingham LLC",
    emails: [{ label: "Work", value: "myoung@youngsteelcity.com" }],
    phones: [{ label: "Direct", value: "(205) 555-0235" }],
    mailingAddresses: [{ label: "Office", street: "420 N 20th Street Suite 2400", city: "Birmingham", state: "AL", zipCode: "35203" }],
    creExperienceYears: "11", netWorthUsd: "12,600,000", liquidityUsd: "1,900,000", creditScore: "740" },
  { id: "seed_b65", createdAt: d(2026,2,4), updatedAt: d(2026,3,12),
    firstName: "Lisa", lastName: "Hernandez", entityName: "Hernandez Front Range LLC",
    emails: [{ label: "Work", value: "lhernandez@hernandezfr.com" }],
    phones: [{ label: "Office", value: "(720) 555-0357" }],
    mailingAddresses: [{ label: "Office", street: "14200 E Exposition Ave Suite 200", city: "Aurora", state: "CO", zipCode: "80012" }],
    creExperienceYears: "12", netWorthUsd: "14,600,000", liquidityUsd: "2,200,000", creditScore: "746" },
  { id: "seed_b66", createdAt: d(2026,1,30), updatedAt: d(2026,3,15),
    firstName: "Anthony", lastName: "King", entityName: "King Desert Campus Properties LLC",
    emails: [{ label: "Work", value: "aking@kingdesertcampus.com" }],
    phones: [{ label: "Mobile", value: "(480) 555-0479" }],
    mailingAddresses: [{ label: "Office", street: "2355 E Camelback Road Suite 900", city: "Phoenix", state: "AZ", zipCode: "85016" }],
    creExperienceYears: "14", netWorthUsd: "17,400,000", liquidityUsd: "2,600,000", creditScore: "754" },
  { id: "seed_b67", createdAt: d(2026,2,12), updatedAt: d(2026,3,17),
    firstName: "Sandra", lastName: "Wright", entityName: "Wright Sonoran Properties LLC",
    emails: [{ label: "Work", value: "swright@wrightsonoran.com" }],
    phones: [{ label: "Direct", value: "(480) 555-0595" }],
    mailingAddresses: [{ label: "Office", street: "7272 E Indian School Road Suite 540", city: "Scottsdale", state: "AZ", zipCode: "85251" }],
    creExperienceYears: "16", netWorthUsd: "22,400,000", liquidityUsd: "3,500,000", creditScore: "762" },
  { id: "seed_b68", createdAt: d(2026,1,20), updatedAt: d(2026,3,8),
    firstName: "Matthew", lastName: "Lopez", entityName: "Lopez North Texas Commercial LLC",
    emails: [{ label: "Work", value: "mlopez@lopeznorthtx.com" }],
    phones: [{ label: "Office", value: "(972) 555-0717" }],
    mailingAddresses: [{ label: "Office", street: "5430 LBJ Freeway Suite 1000", city: "Dallas", state: "TX", zipCode: "75240" }],
    creExperienceYears: "12", netWorthUsd: "14,800,000", liquidityUsd: "2,200,000", creditScore: "747" },
  { id: "seed_b69", createdAt: d(2026,2,18), updatedAt: d(2026,3,19),
    firstName: "Betty", lastName: "Hill", entityName: "Hill Cowtown Properties LLC",
    emails: [{ label: "Work", value: "bhill@hillcowtown.com" }],
    phones: [{ label: "Office", value: "(817) 555-0839" }],
    mailingAddresses: [{ label: "Office", street: "301 Commerce Street Suite 3400", city: "Fort Worth", state: "TX", zipCode: "76102" }],
    creExperienceYears: "19", netWorthUsd: "27,600,000", liquidityUsd: "4,400,000", creditScore: "771" },
  { id: "seed_b70", createdAt: d(2026,1,14), updatedAt: d(2026,3,6),
    firstName: "Donald", lastName: "Scott", entityName: "Scott Arlington Capital LLC",
    emails: [{ label: "Work", value: "dscott@scottarlington.com" }],
    phones: [{ label: "Direct", value: "(817) 555-0961" }],
    mailingAddresses: [{ label: "Office", street: "2200 West Pioneer Pkwy Suite 400", city: "Arlington", state: "TX", zipCode: "76013" }],
    creExperienceYears: "11", netWorthUsd: "13,200,000", liquidityUsd: "2,000,000", creditScore: "741" },
];

const SEED_PROPERTIES: Property[] = [
  { id: "seed_p01", createdAt: d(2026,1,5), updatedAt: d(2026,2,10),
    legalAddress: "1200 Market Street, Philadelphia, PA 19107",
    locations: [{ id: "seed_p01_loc1", label: "Main", streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107", latitude: "39.9526", longitude: "-75.1652", googlePlaceId: "ChIJVVVVVVVVVVMR0af4yL9QDCA" }],
    streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107",
    latitude: "39.9526", longitude: "-75.1652", googlePlaceId: "ChIJVVVVVVVVVVMR0af4yL9QDCA",
    propertyType: "Office", grossSqFt: "124,000", numberOfUnits: "", yearBuilt: "2004",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p02", createdAt: d(2026,1,12), updatedAt: d(2026,2,15),
    legalAddress: "850 Fifth Avenue, New York, NY 10065",
    locations: [{ id: "seed_p02_loc1", label: "Main", streetAddress: "850 Fifth Avenue", city: "New York", state: "NY", zipCode: "10065", latitude: "40.7651", longitude: "-73.9713", googlePlaceId: "" }],
    streetAddress: "850 Fifth Avenue", city: "New York", state: "NY", zipCode: "10065",
    latitude: "40.7651", longitude: "-73.9713", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "36,500", numberOfUnits: "12", yearBuilt: "1998",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p03", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    legalAddress: "4400 Industrial Boulevard, Atlanta, GA 30336",
    locations: [{ id: "seed_p03_loc1", label: "Main", streetAddress: "4400 Industrial Boulevard", city: "Atlanta", state: "GA", zipCode: "30336", latitude: "33.7490", longitude: "-84.3880", googlePlaceId: "" }],
    streetAddress: "4400 Industrial Boulevard", city: "Atlanta", state: "GA", zipCode: "30336",
    latitude: "33.7490", longitude: "-84.3880", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "312,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "95", economicOccupancyPct: "94" },
  { id: "seed_p04", createdAt: d(2026,2,3), updatedAt: d(2026,3,8),
    legalAddress: "2800 Wilshire Boulevard, Los Angeles, CA 90057",
    locations: [{ id: "seed_p04_loc1", label: "Main", streetAddress: "2800 Wilshire Boulevard", city: "Los Angeles", state: "CA", zipCode: "90057", latitude: "34.0584", longitude: "-118.2782", googlePlaceId: "" }],
    streetAddress: "2800 Wilshire Boulevard", city: "Los Angeles", state: "CA", zipCode: "90057",
    latitude: "34.0584", longitude: "-118.2782", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "98,400", numberOfUnits: "120", yearBuilt: "2016",
    physicalOccupancyPct: "96", economicOccupancyPct: "93" },
  { id: "seed_p05", createdAt: d(2026,2,10), updatedAt: d(2026,3,5),
    legalAddress: "330 North Michigan Avenue, Chicago, IL 60601",
    locations: [{ id: "seed_p05_loc1", label: "Main", streetAddress: "330 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60601", latitude: "41.8858", longitude: "-87.6245", googlePlaceId: "" }],
    streetAddress: "330 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60601",
    latitude: "41.8858", longitude: "-87.6245", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "78,200", numberOfUnits: "48", yearBuilt: "2008",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p06", createdAt: d(2026,2,18), updatedAt: d(2026,3,12),
    legalAddress: "600 Congress Avenue, Austin, TX 78701",
    locations: [{ id: "seed_p06_loc1", label: "Main", streetAddress: "600 Congress Avenue", city: "Austin", state: "TX", zipCode: "78701", latitude: "30.2672", longitude: "-97.7431", googlePlaceId: "" }],
    streetAddress: "600 Congress Avenue", city: "Austin", state: "TX", zipCode: "78701",
    latitude: "30.2672", longitude: "-97.7431", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "55,000", numberOfUnits: "", yearBuilt: "2019",
    physicalOccupancyPct: "82", economicOccupancyPct: "80" },
  { id: "seed_p07", createdAt: d(2026,1,28), updatedAt: d(2026,3,15),
    legalAddress: "1500 Brickell Avenue, Miami, FL 33131",
    locations: [{ id: "seed_p07_loc1", label: "Main", streetAddress: "1500 Brickell Avenue", city: "Miami", state: "FL", zipCode: "33131", latitude: "25.7617", longitude: "-80.1918", googlePlaceId: "" }],
    streetAddress: "1500 Brickell Avenue", city: "Miami", state: "FL", zipCode: "33131",
    latitude: "25.7617", longitude: "-80.1918", googlePlaceId: "",
    propertyType: "Hotel", grossSqFt: "145,000", numberOfUnits: "218", yearBuilt: "2014",
    physicalOccupancyPct: "79", economicOccupancyPct: "74" },
  { id: "seed_p08", createdAt: d(2026,2,5), updatedAt: d(2026,3,10),
    legalAddress: "3200 Peachtree Road NE, Atlanta, GA 30305",
    locations: [{ id: "seed_p08_loc1", label: "Main", streetAddress: "3200 Peachtree Road NE", city: "Atlanta", state: "GA", zipCode: "30305", latitude: "33.8490", longitude: "-84.3773", googlePlaceId: "" }],
    streetAddress: "3200 Peachtree Road NE", city: "Atlanta", state: "GA", zipCode: "30305",
    latitude: "33.8490", longitude: "-84.3773", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "182,000", numberOfUnits: "224", yearBuilt: "2018",
    physicalOccupancyPct: "97", economicOccupancyPct: "95" },
  { id: "seed_p09", createdAt: d(2026,2,22), updatedAt: d(2026,3,18),
    legalAddress: "900 North Michigan Avenue, Chicago, IL 60611",
    locations: [{ id: "seed_p09_loc1", label: "Main", streetAddress: "900 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60611", latitude: "41.8977", longitude: "-87.6243", googlePlaceId: "" }],
    streetAddress: "900 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60611",
    latitude: "41.8977", longitude: "-87.6243", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "44,600", numberOfUnits: "8", yearBuilt: "2001",
    physicalOccupancyPct: "100", economicOccupancyPct: "97" },
  { id: "seed_p10", createdAt: d(2026,1,15), updatedAt: d(2026,3,20),
    legalAddress: "555 California Street, San Francisco, CA 94104",
    locations: [{ id: "seed_p10_loc1", label: "Main", streetAddress: "555 California Street", city: "San Francisco", state: "CA", zipCode: "94104", latitude: "37.7925", longitude: "-122.4052", googlePlaceId: "" }],
    streetAddress: "555 California Street", city: "San Francisco", state: "CA", zipCode: "94104",
    latitude: "37.7925", longitude: "-122.4052", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "208,000", numberOfUnits: "", yearBuilt: "2007",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p11", createdAt: d(2026,3,1), updatedAt: d(2026,3,18),
    legalAddress: "7800 Airport Boulevard, Houston, TX 77061",
    locations: [{ id: "seed_p11_loc1", label: "Main", streetAddress: "7800 Airport Boulevard", city: "Houston", state: "TX", zipCode: "77061", latitude: "29.6454", longitude: "-95.2789", googlePlaceId: "" }],
    streetAddress: "7800 Airport Boulevard", city: "Houston", state: "TX", zipCode: "77061",
    latitude: "29.6454", longitude: "-95.2789", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "425,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p12", createdAt: d(2026,3,8), updatedAt: d(2026,3,20),
    legalAddress: "2100 East Camelback Road, Phoenix, AZ 85016",
    locations: [{ id: "seed_p12_loc1", label: "Main", streetAddress: "2100 East Camelback Road", city: "Phoenix", state: "AZ", zipCode: "85016", latitude: "33.5104", longitude: "-112.0198", googlePlaceId: "" }],
    streetAddress: "2100 East Camelback Road", city: "Phoenix", state: "AZ", zipCode: "85016",
    latitude: "33.5104", longitude: "-112.0198", googlePlaceId: "",
    propertyType: "Self Storage", grossSqFt: "62,000", numberOfUnits: "480", yearBuilt: "2020",
    physicalOccupancyPct: "88", economicOccupancyPct: "86" },
  { id: "seed_p13", createdAt: d(2026,2,8), updatedAt: d(2026,2,22),
    legalAddress: "475 Park Avenue South, New York, NY 10016",
    locations: [{ id: "seed_p13_loc1", label: "Main", streetAddress: "475 Park Avenue South", city: "New York", state: "NY", zipCode: "10016", latitude: "40.7462", longitude: "-73.9822", googlePlaceId: "" }],
    streetAddress: "475 Park Avenue South", city: "New York", state: "NY", zipCode: "10016",
    latitude: "40.7462", longitude: "-73.9822", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "31,200", numberOfUnits: "", yearBuilt: "1996",
    physicalOccupancyPct: "74", economicOccupancyPct: "70" },
  { id: "seed_p14", createdAt: d(2026,1,20), updatedAt: d(2026,3,3),
    legalAddress: "1801 California Street, Denver, CO 80202",
    locations: [{ id: "seed_p14_loc1", label: "Main", streetAddress: "1801 California Street", city: "Denver", state: "CO", zipCode: "80202", latitude: "39.7486", longitude: "-104.9877", googlePlaceId: "" }],
    streetAddress: "1801 California Street", city: "Denver", state: "CO", zipCode: "80202",
    latitude: "39.7486", longitude: "-104.9877", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "67,000", numberOfUnits: "32", yearBuilt: "2012",
    physicalOccupancyPct: "85", economicOccupancyPct: "81" },
  { id: "seed_p15", createdAt: d(2025,11,12), updatedAt: d(2026,2,14),
    legalAddress: "10000 Santa Monica Boulevard, Los Angeles, CA 90067",
    locations: [{ id: "seed_p15_loc1", label: "Main", streetAddress: "10000 Santa Monica Boulevard", city: "Los Angeles", state: "CA", zipCode: "90067", latitude: "34.0573", longitude: "-118.4147", googlePlaceId: "" }],
    streetAddress: "10000 Santa Monica Boulevard", city: "Los Angeles", state: "CA", zipCode: "90067",
    latitude: "34.0573", longitude: "-118.4147", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "112,000", numberOfUnits: "", yearBuilt: "2003",
    physicalOccupancyPct: "71", economicOccupancyPct: "68" },
  { id: "seed_p16", createdAt: d(2026,1,8), updatedAt: d(2026,3,10),
    legalAddress: "3100 McKinney Avenue, Dallas, TX 75204",
    locations: [{ id: "seed_p16_loc1", label: "Main", streetAddress: "3100 McKinney Avenue", city: "Dallas", state: "TX", zipCode: "75204", latitude: "32.7967", longitude: "-96.8002", googlePlaceId: "" }],
    streetAddress: "3100 McKinney Avenue", city: "Dallas", state: "TX", zipCode: "75204",
    latitude: "32.7967", longitude: "-96.8002", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "142,800", numberOfUnits: "168", yearBuilt: "2019",
    physicalOccupancyPct: "94", economicOccupancyPct: "91" },
  { id: "seed_p17", createdAt: d(2026,1,15), updatedAt: d(2026,3,12),
    legalAddress: "2200 Westlake Avenue, Seattle, WA 98121",
    locations: [{ id: "seed_p17_loc1", label: "Main", streetAddress: "2200 Westlake Avenue", city: "Seattle", state: "WA", zipCode: "98121", latitude: "47.6162", longitude: "-122.3421", googlePlaceId: "" }],
    streetAddress: "2200 Westlake Avenue", city: "Seattle", state: "WA", zipCode: "98121",
    latitude: "47.6162", longitude: "-122.3421", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "85,000", numberOfUnits: "", yearBuilt: "2016",
    physicalOccupancyPct: "87", economicOccupancyPct: "84" },
  { id: "seed_p18", createdAt: d(2026,2,1), updatedAt: d(2026,3,8),
    legalAddress: "2100 West End Avenue, Nashville, TN 37203",
    locations: [{ id: "seed_p18_loc1", label: "Main", streetAddress: "2100 West End Avenue", city: "Nashville", state: "TN", zipCode: "37203", latitude: "36.1482", longitude: "-86.8019", googlePlaceId: "" }],
    streetAddress: "2100 West End Avenue", city: "Nashville", state: "TN", zipCode: "37203",
    latitude: "36.1482", longitude: "-86.8019", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "42,000", numberOfUnits: "8", yearBuilt: "2008",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p19", createdAt: d(2026,1,25), updatedAt: d(2026,3,5),
    legalAddress: "5200 Douglas Boulevard, Granite Bay, CA 95746",
    locations: [{ id: "seed_p19_loc1", label: "Main", streetAddress: "5200 Douglas Boulevard", city: "Granite Bay", state: "CA", zipCode: "95746", latitude: "38.7548", longitude: "-121.2869", googlePlaceId: "" }],
    streetAddress: "5200 Douglas Boulevard", city: "Granite Bay", state: "CA", zipCode: "95746",
    latitude: "38.7548", longitude: "-121.2869", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "280,000", numberOfUnits: "", yearBuilt: "2014",
    physicalOccupancyPct: "93", economicOccupancyPct: "91" },
  { id: "seed_p20", createdAt: d(2026,2,5), updatedAt: d(2026,3,14),
    legalAddress: "1400 NW Everett Street, Portland, OR 97209",
    locations: [{ id: "seed_p20_loc1", label: "Main", streetAddress: "1400 NW Everett Street", city: "Portland", state: "OR", zipCode: "97209", latitude: "45.5280", longitude: "-122.6847", googlePlaceId: "" }],
    streetAddress: "1400 NW Everett Street", city: "Portland", state: "OR", zipCode: "97209",
    latitude: "45.5280", longitude: "-122.6847", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "62,400", numberOfUnits: "52", yearBuilt: "2017",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p21", createdAt: d(2026,1,18), updatedAt: d(2026,3,9),
    legalAddress: "1800 South Boulevard, Charlotte, NC 28203",
    locations: [{ id: "seed_p21_loc1", label: "Main", streetAddress: "1800 South Boulevard", city: "Charlotte", state: "NC", zipCode: "28203", latitude: "35.2107", longitude: "-80.8491", googlePlaceId: "" }],
    streetAddress: "1800 South Boulevard", city: "Charlotte", state: "NC", zipCode: "28203",
    latitude: "35.2107", longitude: "-80.8491", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "122,400", numberOfUnits: "144", yearBuilt: "2018",
    physicalOccupancyPct: "95", economicOccupancyPct: "92" },
  { id: "seed_p22", createdAt: d(2026,2,10), updatedAt: d(2026,3,18),
    legalAddress: "50 South 10th Street, Minneapolis, MN 55403",
    locations: [{ id: "seed_p22_loc1", label: "Main", streetAddress: "50 South 10th Street", city: "Minneapolis", state: "MN", zipCode: "55403", latitude: "44.9745", longitude: "-93.2730", googlePlaceId: "" }],
    streetAddress: "50 South 10th Street", city: "Minneapolis", state: "MN", zipCode: "55403",
    latitude: "44.9745", longitude: "-93.2730", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "112,000", numberOfUnits: "", yearBuilt: "2012",
    physicalOccupancyPct: "82", economicOccupancyPct: "79" },
  { id: "seed_p23", createdAt: d(2026,2,15), updatedAt: d(2026,3,20),
    legalAddress: "3960 Las Vegas Boulevard South, Las Vegas, NV 89119",
    locations: [{ id: "seed_p23_loc1", label: "Main", streetAddress: "3960 Las Vegas Boulevard South", city: "Las Vegas", state: "NV", zipCode: "89119", latitude: "36.1089", longitude: "-115.1717", googlePlaceId: "" }],
    streetAddress: "3960 Las Vegas Boulevard South", city: "Las Vegas", state: "NV", zipCode: "89119",
    latitude: "36.1089", longitude: "-115.1717", googlePlaceId: "",
    propertyType: "Hotel", grossSqFt: "121,000", numberOfUnits: "156", yearBuilt: "2011",
    physicalOccupancyPct: "76", economicOccupancyPct: "72" },
  { id: "seed_p24", createdAt: d(2026,1,22), updatedAt: d(2026,3,6),
    legalAddress: "4888 Convoy Street, San Diego, CA 92111",
    locations: [{ id: "seed_p24_loc1", label: "Main", streetAddress: "4888 Convoy Street", city: "San Diego", state: "CA", zipCode: "92111", latitude: "32.8095", longitude: "-117.1611", googlePlaceId: "" }],
    streetAddress: "4888 Convoy Street", city: "San Diego", state: "CA", zipCode: "92111",
    latitude: "32.8095", longitude: "-117.1611", googlePlaceId: "",
    propertyType: "Self Storage", grossSqFt: "55,000", numberOfUnits: "380", yearBuilt: "2021",
    physicalOccupancyPct: "90", economicOccupancyPct: "88" },
  { id: "seed_p25", createdAt: d(2026,1,28), updatedAt: d(2026,3,11),
    legalAddress: "4000 West Platt Street, Tampa, FL 33609",
    locations: [{ id: "seed_p25_loc1", label: "Main", streetAddress: "4000 West Platt Street", city: "Tampa", state: "FL", zipCode: "33609", latitude: "27.9441", longitude: "-82.4742", googlePlaceId: "" }],
    streetAddress: "4000 West Platt Street", city: "Tampa", state: "FL", zipCode: "33609",
    latitude: "27.9441", longitude: "-82.4742", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "163,200", numberOfUnits: "192", yearBuilt: "2017",
    physicalOccupancyPct: "96", economicOccupancyPct: "93" },
  { id: "seed_p26", createdAt: d(2026,2,3), updatedAt: d(2026,3,13),
    legalAddress: "4700 Falls of Neuse Road, Raleigh, NC 27609",
    locations: [{ id: "seed_p26_loc1", label: "Main", streetAddress: "4700 Falls of Neuse Road", city: "Raleigh", state: "NC", zipCode: "27609", latitude: "35.8321", longitude: "-78.6201", googlePlaceId: "" }],
    streetAddress: "4700 Falls of Neuse Road", city: "Raleigh", state: "NC", zipCode: "27609",
    latitude: "35.8321", longitude: "-78.6201", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "68,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "89", economicOccupancyPct: "86" },
  { id: "seed_p27", createdAt: d(2026,2,8), updatedAt: d(2026,3,15),
    legalAddress: "4740 Jefferson Street, Kansas City, MO 64112",
    locations: [{ id: "seed_p27_loc1", label: "Main", streetAddress: "4740 Jefferson Street", city: "Kansas City", state: "MO", zipCode: "64112", latitude: "39.0406", longitude: "-94.5887", googlePlaceId: "" }],
    streetAddress: "4740 Jefferson Street", city: "Kansas City", state: "MO", zipCode: "64112",
    latitude: "39.0406", longitude: "-94.5887", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "55,000", numberOfUnits: "10", yearBuilt: "2005",
    physicalOccupancyPct: "90", economicOccupancyPct: "87" },
  { id: "seed_p28", createdAt: d(2026,1,30), updatedAt: d(2026,3,10),
    legalAddress: "3600 Refugee Road, Columbus, OH 43207",
    locations: [{ id: "seed_p28_loc1", label: "Main", streetAddress: "3600 Refugee Road", city: "Columbus", state: "OH", zipCode: "43207", latitude: "39.9209", longitude: "-82.9434", googlePlaceId: "" }],
    streetAddress: "3600 Refugee Road", city: "Columbus", state: "OH", zipCode: "43207",
    latitude: "39.9209", longitude: "-82.9434", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "320,000", numberOfUnits: "", yearBuilt: "2013",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p29", createdAt: d(2026,2,12), updatedAt: d(2026,3,17),
    legalAddress: "1900 W Broad Street, Richmond, VA 23220",
    locations: [{ id: "seed_p29_loc1", label: "Main", streetAddress: "1900 W Broad Street", city: "Richmond", state: "VA", zipCode: "23220", latitude: "37.5498", longitude: "-77.4694", googlePlaceId: "" }],
    streetAddress: "1900 W Broad Street", city: "Richmond", state: "VA", zipCode: "23220",
    latitude: "37.5498", longitude: "-77.4694", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "38,400", numberOfUnits: "38", yearBuilt: "2014",
    physicalOccupancyPct: "89", economicOccupancyPct: "86" },
  { id: "seed_p30", createdAt: d(2026,1,20), updatedAt: d(2026,3,8),
    legalAddress: "1200 N Delaware Street, Indianapolis, IN 46202",
    locations: [{ id: "seed_p30_loc1", label: "Main", streetAddress: "1200 N Delaware Street", city: "Indianapolis", state: "IN", zipCode: "46202", latitude: "39.7864", longitude: "-86.1428", googlePlaceId: "" }],
    streetAddress: "1200 N Delaware Street", city: "Indianapolis", state: "IN", zipCode: "46202",
    latitude: "39.7864", longitude: "-86.1428", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "204,000", numberOfUnits: "240", yearBuilt: "2016",
    physicalOccupancyPct: "93", economicOccupancyPct: "90" },
  { id: "seed_p31", createdAt: d(2026,2,6), updatedAt: d(2026,3,14),
    legalAddress: "600 W Main Street, Louisville, KY 40202",
    locations: [{ id: "seed_p31_loc1", label: "Main", streetAddress: "600 W Main Street", city: "Louisville", state: "KY", zipCode: "40202", latitude: "38.2548", longitude: "-85.7644", googlePlaceId: "" }],
    streetAddress: "600 W Main Street", city: "Louisville", state: "KY", zipCode: "40202",
    latitude: "38.2548", longitude: "-85.7644", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "75,000", numberOfUnits: "", yearBuilt: "2010",
    physicalOccupancyPct: "84", economicOccupancyPct: "81" },
  { id: "seed_p32", createdAt: d(2026,1,14), updatedAt: d(2026,3,6),
    legalAddress: "4200 Elvis Presley Boulevard, Memphis, TN 38116",
    locations: [{ id: "seed_p32_loc1", label: "Main", streetAddress: "4200 Elvis Presley Boulevard", city: "Memphis", state: "TN", zipCode: "38116", latitude: "35.0849", longitude: "-90.0249", googlePlaceId: "" }],
    streetAddress: "4200 Elvis Presley Boulevard", city: "Memphis", state: "TN", zipCode: "38116",
    latitude: "35.0849", longitude: "-90.0249", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "420,000", numberOfUnits: "", yearBuilt: "2012",
    physicalOccupancyPct: "97", economicOccupancyPct: "96" },
  { id: "seed_p33", createdAt: d(2026,2,18), updatedAt: d(2026,3,19),
    legalAddress: "7601 Forsyth Boulevard, Clayton, MO 63105",
    locations: [{ id: "seed_p33_loc1", label: "Main", streetAddress: "7601 Forsyth Boulevard", city: "Clayton", state: "MO", zipCode: "63105", latitude: "38.6433", longitude: "-90.3345", googlePlaceId: "" }],
    streetAddress: "7601 Forsyth Boulevard", city: "Clayton", state: "MO", zipCode: "63105",
    latitude: "38.6433", longitude: "-90.3345", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "48,000", numberOfUnits: "9", yearBuilt: "2003",
    physicalOccupancyPct: "89", economicOccupancyPct: "86" },
  { id: "seed_p34", createdAt: d(2026,1,10), updatedAt: d(2026,3,4),
    legalAddress: "100 South Highland Avenue, Pittsburgh, PA 15206",
    locations: [{ id: "seed_p34_loc1", label: "Main", streetAddress: "100 South Highland Avenue", city: "Pittsburgh", state: "PA", zipCode: "15206", latitude: "40.4559", longitude: "-79.9218", googlePlaceId: "" }],
    streetAddress: "100 South Highland Avenue", city: "Pittsburgh", state: "PA", zipCode: "15206",
    latitude: "40.4559", longitude: "-79.9218", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "81,600", numberOfUnits: "96", yearBuilt: "2015",
    physicalOccupancyPct: "94", economicOccupancyPct: "91" },
  { id: "seed_p35", createdAt: d(2026,2,14), updatedAt: d(2026,3,16),
    legalAddress: "100 East Pratt Street, Baltimore, MD 21202",
    locations: [{ id: "seed_p35_loc1", label: "Main", streetAddress: "100 East Pratt Street", city: "Baltimore", state: "MD", zipCode: "21202", latitude: "39.2857", longitude: "-76.6104", googlePlaceId: "" }],
    streetAddress: "100 East Pratt Street", city: "Baltimore", state: "MD", zipCode: "21202",
    latitude: "39.2857", longitude: "-76.6104", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "130,000", numberOfUnits: "", yearBuilt: "2008",
    physicalOccupancyPct: "81", economicOccupancyPct: "78" },
  { id: "seed_p36", createdAt: d(2026,1,26), updatedAt: d(2026,3,7),
    legalAddress: "2800 W Grand Boulevard, Detroit, MI 48202",
    locations: [{ id: "seed_p36_loc1", label: "Main", streetAddress: "2800 W Grand Boulevard", city: "Detroit", state: "MI", zipCode: "48202", latitude: "42.3784", longitude: "-83.0786", googlePlaceId: "" }],
    streetAddress: "2800 W Grand Boulevard", city: "Detroit", state: "MI", zipCode: "48202",
    latitude: "42.3784", longitude: "-83.0786", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "38,000", numberOfUnits: "7", yearBuilt: "2006",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p37", createdAt: d(2026,2,20), updatedAt: d(2026,3,18),
    legalAddress: "6500 North Loop 1604 West, San Antonio, TX 78249",
    locations: [{ id: "seed_p37_loc1", label: "Main", streetAddress: "6500 North Loop 1604 West", city: "San Antonio", state: "TX", zipCode: "78249", latitude: "29.5753", longitude: "-98.5943", googlePlaceId: "" }],
    streetAddress: "6500 North Loop 1604 West", city: "San Antonio", state: "TX", zipCode: "78249",
    latitude: "29.5753", longitude: "-98.5943", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "250,000", numberOfUnits: "", yearBuilt: "2017",
    physicalOccupancyPct: "96", economicOccupancyPct: "94" },
  { id: "seed_p38", createdAt: d(2026,1,16), updatedAt: d(2026,3,5),
    legalAddress: "1801 L Street, Sacramento, CA 95811",
    locations: [{ id: "seed_p38_loc1", label: "Main", streetAddress: "1801 L Street", city: "Sacramento", state: "CA", zipCode: "95811", latitude: "38.5769", longitude: "-121.4887", googlePlaceId: "" }],
    streetAddress: "1801 L Street", city: "Sacramento", state: "CA", zipCode: "95811",
    latitude: "38.5769", longitude: "-121.4887", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "47,600", numberOfUnits: "44", yearBuilt: "2013",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p39", createdAt: d(2026,2,22), updatedAt: d(2026,3,20),
    legalAddress: "1700 Broadway, Oakland, CA 94612",
    locations: [{ id: "seed_p39_loc1", label: "Main", streetAddress: "1700 Broadway", city: "Oakland", state: "CA", zipCode: "94612", latitude: "37.8094", longitude: "-122.2753", googlePlaceId: "" }],
    streetAddress: "1700 Broadway", city: "Oakland", state: "CA", zipCode: "94612",
    latitude: "37.8094", longitude: "-122.2753", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "74,800", numberOfUnits: "88", yearBuilt: "2020",
    physicalOccupancyPct: "93", economicOccupancyPct: "90" },
  { id: "seed_p40", createdAt: d(2026,1,12), updatedAt: d(2026,3,3),
    legalAddress: "488 Almaden Boulevard, San Jose, CA 95110",
    locations: [{ id: "seed_p40_loc1", label: "Main", streetAddress: "488 Almaden Boulevard", city: "San Jose", state: "CA", zipCode: "95110", latitude: "37.3347", longitude: "-121.8927", googlePlaceId: "" }],
    streetAddress: "488 Almaden Boulevard", city: "San Jose", state: "CA", zipCode: "95110",
    latitude: "37.3347", longitude: "-121.8927", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "92,000", numberOfUnits: "", yearBuilt: "2014",
    physicalOccupancyPct: "83", economicOccupancyPct: "80" },
  { id: "seed_p41", createdAt: d(2026,2,16), updatedAt: d(2026,3,15),
    legalAddress: "5555 Canal Road, Valley View, OH 44125",
    locations: [{ id: "seed_p41_loc1", label: "Main", streetAddress: "5555 Canal Road", city: "Valley View", state: "OH", zipCode: "44125", latitude: "41.3926", longitude: "-81.6301", googlePlaceId: "" }],
    streetAddress: "5555 Canal Road", city: "Valley View", state: "OH", zipCode: "44125",
    latitude: "41.3926", longitude: "-81.6301", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "185,000", numberOfUnits: "", yearBuilt: "2009",
    physicalOccupancyPct: "95", economicOccupancyPct: "93" },
  { id: "seed_p42", createdAt: d(2026,1,24), updatedAt: d(2026,3,11),
    legalAddress: "4200 Millenia Boulevard, Orlando, FL 32839",
    locations: [{ id: "seed_p42_loc1", label: "Main", streetAddress: "4200 Millenia Boulevard", city: "Orlando", state: "FL", zipCode: "32839", latitude: "28.5017", longitude: "-81.4238", googlePlaceId: "" }],
    streetAddress: "4200 Millenia Boulevard", city: "Orlando", state: "FL", zipCode: "32839",
    latitude: "28.5017", longitude: "-81.4238", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "65,000", numberOfUnits: "14", yearBuilt: "2004",
    physicalOccupancyPct: "93", economicOccupancyPct: "90" },
  { id: "seed_p43", createdAt: d(2026,2,4), updatedAt: d(2026,3,12),
    legalAddress: "3456 Lemon Street, Riverside, CA 92501",
    locations: [{ id: "seed_p43_loc1", label: "Main", streetAddress: "3456 Lemon Street", city: "Riverside", state: "CA", zipCode: "92501", latitude: "33.9815", longitude: "-117.3752", googlePlaceId: "" }],
    streetAddress: "3456 Lemon Street", city: "Riverside", state: "CA", zipCode: "92501",
    latitude: "33.9815", longitude: "-117.3752", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "112,200", numberOfUnits: "132", yearBuilt: "2016",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p44", createdAt: d(2026,1,28), updatedAt: d(2026,3,9),
    legalAddress: "525 Vine Street, Cincinnati, OH 45202",
    locations: [{ id: "seed_p44_loc1", label: "Main", streetAddress: "525 Vine Street", city: "Cincinnati", state: "OH", zipCode: "45202", latitude: "39.1039", longitude: "-84.5127", googlePlaceId: "" }],
    streetAddress: "525 Vine Street", city: "Cincinnati", state: "OH", zipCode: "45202",
    latitude: "39.1039", longitude: "-84.5127", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "56,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p45", createdAt: d(2026,2,20), updatedAt: d(2026,3,17),
    legalAddress: "7000 Blount Island Boulevard, Jacksonville, FL 32226",
    locations: [{ id: "seed_p45_loc1", label: "Main", streetAddress: "7000 Blount Island Boulevard", city: "Jacksonville", state: "FL", zipCode: "32226", latitude: "30.4211", longitude: "-81.5562", googlePlaceId: "" }],
    streetAddress: "7000 Blount Island Boulevard", city: "Jacksonville", state: "FL", zipCode: "32226",
    latitude: "30.4211", longitude: "-81.5562", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "340,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p46", createdAt: d(2026,1,16), updatedAt: d(2026,3,6),
    legalAddress: "4525 Virginia Beach Boulevard, Virginia Beach, VA 23462",
    locations: [{ id: "seed_p46_loc1", label: "Main", streetAddress: "4525 Virginia Beach Boulevard", city: "Virginia Beach", state: "VA", zipCode: "23462", latitude: "36.8313", longitude: "-76.0756", googlePlaceId: "" }],
    streetAddress: "4525 Virginia Beach Boulevard", city: "Virginia Beach", state: "VA", zipCode: "23462",
    latitude: "36.8313", longitude: "-76.0756", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "35,000", numberOfUnits: "7", yearBuilt: "2007",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p47", createdAt: d(2026,2,9), updatedAt: d(2026,3,13),
    legalAddress: "4400 E Broadway Boulevard, Tucson, AZ 85711",
    locations: [{ id: "seed_p47_loc1", label: "Main", streetAddress: "4400 E Broadway Boulevard", city: "Tucson", state: "AZ", zipCode: "85711", latitude: "32.2219", longitude: "-110.9032", googlePlaceId: "" }],
    streetAddress: "4400 E Broadway Boulevard", city: "Tucson", state: "AZ", zipCode: "85711",
    latitude: "32.2219", longitude: "-110.9032", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "64,400", numberOfUnits: "62", yearBuilt: "2018",
    physicalOccupancyPct: "90", economicOccupancyPct: "87" },
  { id: "seed_p48", createdAt: d(2026,1,22), updatedAt: d(2026,3,7),
    legalAddress: "75 Fountain Street, Providence, RI 02902",
    locations: [{ id: "seed_p48_loc1", label: "Main", streetAddress: "75 Fountain Street", city: "Providence", state: "RI", zipCode: "02902", latitude: "41.8217", longitude: "-71.4083", googlePlaceId: "" }],
    streetAddress: "75 Fountain Street", city: "Providence", state: "RI", zipCode: "02902",
    latitude: "41.8217", longitude: "-71.4083", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "48,000", numberOfUnits: "", yearBuilt: "2009",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p49", createdAt: d(2026,2,11), updatedAt: d(2026,3,16),
    legalAddress: "4500 Government Street, Baton Rouge, LA 70806",
    locations: [{ id: "seed_p49_loc1", label: "Main", streetAddress: "4500 Government Street", city: "Baton Rouge", state: "LA", zipCode: "70806", latitude: "30.4415", longitude: "-91.1348", googlePlaceId: "" }],
    streetAddress: "4500 Government Street", city: "Baton Rouge", state: "LA", zipCode: "70806",
    latitude: "30.4415", longitude: "-91.1348", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "149,600", numberOfUnits: "176", yearBuilt: "2016",
    physicalOccupancyPct: "94", economicOccupancyPct: "91" },
  { id: "seed_p50", createdAt: d(2026,1,18), updatedAt: d(2026,3,4),
    legalAddress: "185 Asylum Street, Hartford, CT 06103",
    locations: [{ id: "seed_p50_loc1", label: "Main", streetAddress: "185 Asylum Street", city: "Hartford", state: "CT", zipCode: "06103", latitude: "41.7661", longitude: "-72.6799", googlePlaceId: "" }],
    streetAddress: "185 Asylum Street", city: "Hartford", state: "CT", zipCode: "06103",
    latitude: "41.7661", longitude: "-72.6799", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "82,000", numberOfUnits: "", yearBuilt: "2007",
    physicalOccupancyPct: "85", economicOccupancyPct: "82" },
  { id: "seed_p51", createdAt: d(2026,2,17), updatedAt: d(2026,3,18),
    legalAddress: "3800 High Point Road, Greensboro, NC 27407",
    locations: [{ id: "seed_p51_loc1", label: "Main", streetAddress: "3800 High Point Road", city: "Greensboro", state: "NC", zipCode: "27407", latitude: "36.0608", longitude: "-79.8467", googlePlaceId: "" }],
    streetAddress: "3800 High Point Road", city: "Greensboro", state: "NC", zipCode: "27407",
    latitude: "36.0608", longitude: "-79.8467", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "270,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "98", economicOccupancyPct: "96" },
  { id: "seed_p52", createdAt: d(2026,1,28), updatedAt: d(2026,3,11),
    legalAddress: "6000 NW Expressway, Oklahoma City, OK 73132",
    locations: [{ id: "seed_p52_loc1", label: "Main", streetAddress: "6000 NW Expressway", city: "Oklahoma City", state: "OK", zipCode: "73132", latitude: "35.5329", longitude: "-97.6083", googlePlaceId: "" }],
    streetAddress: "6000 NW Expressway", city: "Oklahoma City", state: "OK", zipCode: "73132",
    latitude: "35.5329", longitude: "-97.6083", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "58,000", numberOfUnits: "12", yearBuilt: "2006",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p53", createdAt: d(2026,2,6), updatedAt: d(2026,3,14),
    legalAddress: "350 S 400 E, Salt Lake City, UT 84111",
    locations: [{ id: "seed_p53_loc1", label: "Main", streetAddress: "350 S 400 E", city: "Salt Lake City", state: "UT", zipCode: "84111", latitude: "40.7597", longitude: "-111.8839", googlePlaceId: "" }],
    streetAddress: "350 S 400 E", city: "Salt Lake City", state: "UT", zipCode: "84111",
    latitude: "40.7597", longitude: "-111.8839", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "58,800", numberOfUnits: "54", yearBuilt: "2019",
    physicalOccupancyPct: "93", economicOccupancyPct: "90" },
  { id: "seed_p54", createdAt: d(2026,1,24), updatedAt: d(2026,3,8),
    legalAddress: "6600 Uptown Boulevard NE, Albuquerque, NM 87110",
    locations: [{ id: "seed_p54_loc1", label: "Main", streetAddress: "6600 Uptown Boulevard NE", city: "Albuquerque", state: "NM", zipCode: "87110", latitude: "35.1255", longitude: "-106.5842", googlePlaceId: "" }],
    streetAddress: "6600 Uptown Boulevard NE", city: "Albuquerque", state: "NM", zipCode: "87110",
    latitude: "35.1255", longitude: "-106.5842", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "129,200", numberOfUnits: "152", yearBuilt: "2017",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p55", createdAt: d(2026,2,13), updatedAt: d(2026,3,17),
    legalAddress: "1700 Farnam Street, Omaha, NE 68102",
    locations: [{ id: "seed_p55_loc1", label: "Main", streetAddress: "1700 Farnam Street", city: "Omaha", state: "NE", zipCode: "68102", latitude: "41.2598", longitude: "-95.9434", googlePlaceId: "" }],
    streetAddress: "1700 Farnam Street", city: "Omaha", state: "NE", zipCode: "68102",
    latitude: "41.2598", longitude: "-95.9434", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "64,000", numberOfUnits: "", yearBuilt: "2013",
    physicalOccupancyPct: "87", economicOccupancyPct: "84" },
  { id: "seed_p56", createdAt: d(2026,1,20), updatedAt: d(2026,3,5),
    legalAddress: "1 Gateway Boulevard, El Paso, TX 79927",
    locations: [{ id: "seed_p56_loc1", label: "Main", streetAddress: "1 Gateway Boulevard", city: "El Paso", state: "TX", zipCode: "79927", latitude: "31.7029", longitude: "-106.3826", googlePlaceId: "" }],
    streetAddress: "1 Gateway Boulevard", city: "El Paso", state: "TX", zipCode: "79927",
    latitude: "31.7029", longitude: "-106.3826", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "310,000", numberOfUnits: "", yearBuilt: "2016",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p57", createdAt: d(2026,2,2), updatedAt: d(2026,3,10),
    legalAddress: "400 East Avenue, Rochester, NY 14607",
    locations: [{ id: "seed_p57_loc1", label: "Main", streetAddress: "400 East Avenue", city: "Rochester", state: "NY", zipCode: "14607", latitude: "43.1517", longitude: "-77.5966", googlePlaceId: "" }],
    streetAddress: "400 East Avenue", city: "Rochester", state: "NY", zipCode: "14607",
    latitude: "43.1517", longitude: "-77.5966", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "95,200", numberOfUnits: "112", yearBuilt: "2014",
    physicalOccupancyPct: "93", economicOccupancyPct: "90" },
  { id: "seed_p58", createdAt: d(2026,1,10), updatedAt: d(2026,3,2),
    legalAddress: "726 Exchange Street, Buffalo, NY 14210",
    locations: [{ id: "seed_p58_loc1", label: "Main", streetAddress: "726 Exchange Street", city: "Buffalo", state: "NY", zipCode: "14210", latitude: "42.8793", longitude: "-78.8659", googlePlaceId: "" }],
    streetAddress: "726 Exchange Street", city: "Buffalo", state: "NY", zipCode: "14210",
    latitude: "42.8793", longitude: "-78.8659", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "72,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p59", createdAt: d(2026,2,19), updatedAt: d(2026,3,19),
    legalAddress: "3265 W Market Street, Akron, OH 44333",
    locations: [{ id: "seed_p59_loc1", label: "Main", streetAddress: "3265 W Market Street", city: "Akron", state: "OH", zipCode: "44333", latitude: "41.1058", longitude: "-81.5618", googlePlaceId: "" }],
    streetAddress: "3265 W Market Street", city: "Akron", state: "OH", zipCode: "44333",
    latitude: "41.1058", longitude: "-81.5618", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "44,000", numberOfUnits: "9", yearBuilt: "2005",
    physicalOccupancyPct: "89", economicOccupancyPct: "86" },
  { id: "seed_p60", createdAt: d(2026,1,14), updatedAt: d(2026,3,4),
    legalAddress: "3100 E Central Avenue, Fresno, CA 93725",
    locations: [{ id: "seed_p60_loc1", label: "Main", streetAddress: "3100 E Central Avenue", city: "Fresno", state: "CA", zipCode: "93725", latitude: "36.7379", longitude: "-119.7128", googlePlaceId: "" }],
    streetAddress: "3100 E Central Avenue", city: "Fresno", state: "CA", zipCode: "93725",
    latitude: "36.7379", longitude: "-119.7128", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "380,000", numberOfUnits: "", yearBuilt: "2013",
    physicalOccupancyPct: "97", economicOccupancyPct: "95" },
  { id: "seed_p61", createdAt: d(2026,2,21), updatedAt: d(2026,3,20),
    legalAddress: "5100 E 2nd Street, Long Beach, CA 90803",
    locations: [{ id: "seed_p61_loc1", label: "Main", streetAddress: "5100 E 2nd Street", city: "Long Beach", state: "CA", zipCode: "90803", latitude: "33.7712", longitude: "-118.1345", googlePlaceId: "" }],
    streetAddress: "5100 E 2nd Street", city: "Long Beach", state: "CA", zipCode: "90803",
    latitude: "33.7712", longitude: "-118.1345", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "74,400", numberOfUnits: "72", yearBuilt: "2018",
    physicalOccupancyPct: "95", economicOccupancyPct: "92" },
  { id: "seed_p62", createdAt: d(2026,1,8), updatedAt: d(2026,3,1),
    legalAddress: "421 W Riverside Avenue, Spokane, WA 99201",
    locations: [{ id: "seed_p62_loc1", label: "Main", streetAddress: "421 W Riverside Avenue", city: "Spokane", state: "WA", zipCode: "99201", latitude: "47.6568", longitude: "-117.4261", googlePlaceId: "" }],
    streetAddress: "421 W Riverside Avenue", city: "Spokane", state: "WA", zipCode: "99201",
    latitude: "47.6568", longitude: "-117.4261", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "58,000", numberOfUnits: "", yearBuilt: "2010",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p63", createdAt: d(2026,2,24), updatedAt: d(2026,3,20),
    legalAddress: "3620 Austin Bluffs Pkwy, Colorado Springs, CO 80918",
    locations: [{ id: "seed_p63_loc1", label: "Main", streetAddress: "3620 Austin Bluffs Pkwy", city: "Colorado Springs", state: "CO", zipCode: "80918", latitude: "38.9017", longitude: "-104.7888", googlePlaceId: "" }],
    streetAddress: "3620 Austin Bluffs Pkwy", city: "Colorado Springs", state: "CO", zipCode: "80918",
    latitude: "38.9017", longitude: "-104.7888", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "170,000", numberOfUnits: "200", yearBuilt: "2015",
    physicalOccupancyPct: "95", economicOccupancyPct: "92" },
  { id: "seed_p64", createdAt: d(2026,1,22), updatedAt: d(2026,3,9),
    legalAddress: "2200 Nicholasville Road, Lexington, KY 40503",
    locations: [{ id: "seed_p64_loc1", label: "Main", streetAddress: "2200 Nicholasville Road", city: "Lexington", state: "KY", zipCode: "40503", latitude: "37.9974", longitude: "-84.5264", googlePlaceId: "" }],
    streetAddress: "2200 Nicholasville Road", city: "Lexington", state: "KY", zipCode: "40503",
    latitude: "37.9974", longitude: "-84.5264", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "108,800", numberOfUnits: "128", yearBuilt: "2017",
    physicalOccupancyPct: "94", economicOccupancyPct: "91" },
  { id: "seed_p65", createdAt: d(2026,2,8), updatedAt: d(2026,3,13),
    legalAddress: "1200 Grand Avenue, Des Moines, IA 50309",
    locations: [{ id: "seed_p65_loc1", label: "Main", streetAddress: "1200 Grand Avenue", city: "Des Moines", state: "IA", zipCode: "50309", latitude: "41.5823", longitude: "-93.6298", googlePlaceId: "" }],
    streetAddress: "1200 Grand Avenue", city: "Des Moines", state: "IA", zipCode: "50309",
    latitude: "41.5823", longitude: "-93.6298", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "52,000", numberOfUnits: "", yearBuilt: "2012",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p66", createdAt: d(2026,1,18), updatedAt: d(2026,3,7),
    legalAddress: "11525 Cantrell Road, Little Rock, AR 72212",
    locations: [{ id: "seed_p66_loc1", label: "Main", streetAddress: "11525 Cantrell Road", city: "Little Rock", state: "AR", zipCode: "72212", latitude: "34.7599", longitude: "-92.4024", googlePlaceId: "" }],
    streetAddress: "11525 Cantrell Road", city: "Little Rock", state: "AR", zipCode: "72212",
    latitude: "34.7599", longitude: "-92.4024", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "32,000", numberOfUnits: "6", yearBuilt: "2009",
    physicalOccupancyPct: "83", economicOccupancyPct: "80" },
  { id: "seed_p67", createdAt: d(2026,2,15), updatedAt: d(2026,3,16),
    legalAddress: "9000 Industrial Drive, Shreveport, LA 71109",
    locations: [{ id: "seed_p67_loc1", label: "Main", streetAddress: "9000 Industrial Drive", city: "Shreveport", state: "LA", zipCode: "71109", latitude: "32.4901", longitude: "-93.7793", googlePlaceId: "" }],
    streetAddress: "9000 Industrial Drive", city: "Shreveport", state: "LA", zipCode: "71109",
    latitude: "32.4901", longitude: "-93.7793", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "220,000", numberOfUnits: "", yearBuilt: "2010",
    physicalOccupancyPct: "96", economicOccupancyPct: "94" },
  { id: "seed_p68", createdAt: d(2026,1,26), updatedAt: d(2026,3,10),
    legalAddress: "2024 3rd Avenue North, Birmingham, AL 35203",
    locations: [{ id: "seed_p68_loc1", label: "Main", streetAddress: "2024 3rd Avenue North", city: "Birmingham", state: "AL", zipCode: "35203", latitude: "33.5186", longitude: "-86.8087", googlePlaceId: "" }],
    streetAddress: "2024 3rd Avenue North", city: "Birmingham", state: "AL", zipCode: "35203",
    latitude: "33.5186", longitude: "-86.8087", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "46,000", numberOfUnits: "40", yearBuilt: "2016",
    physicalOccupancyPct: "90", economicOccupancyPct: "87" },
  { id: "seed_p69", createdAt: d(2026,2,4), updatedAt: d(2026,3,12),
    legalAddress: "15001 E Mississippi Avenue, Aurora, CO 80012",
    locations: [{ id: "seed_p69_loc1", label: "Main", streetAddress: "15001 E Mississippi Avenue", city: "Aurora", state: "CO", zipCode: "80012", latitude: "39.7012", longitude: "-104.7940", googlePlaceId: "" }],
    streetAddress: "15001 E Mississippi Avenue", city: "Aurora", state: "CO", zipCode: "80012",
    latitude: "39.7012", longitude: "-104.7940", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "136,000", numberOfUnits: "160", yearBuilt: "2016",
    physicalOccupancyPct: "94", economicOccupancyPct: "91" },
  { id: "seed_p70", createdAt: d(2026,1,30), updatedAt: d(2026,3,15),
    legalAddress: "1400 E Southern Avenue, Tempe, AZ 85282",
    locations: [{ id: "seed_p70_loc1", label: "Main", streetAddress: "1400 E Southern Avenue", city: "Tempe", state: "AZ", zipCode: "85282", latitude: "33.4056", longitude: "-111.9281", googlePlaceId: "" }],
    streetAddress: "1400 E Southern Avenue", city: "Tempe", state: "AZ", zipCode: "85282",
    latitude: "33.4056", longitude: "-111.9281", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "78,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "89", economicOccupancyPct: "86" },
  { id: "seed_p71", createdAt: d(2026,2,12), updatedAt: d(2026,3,17),
    legalAddress: "8900 E Pinnacle Peak Road, Scottsdale, AZ 85255",
    locations: [{ id: "seed_p71_loc1", label: "Main", streetAddress: "8900 E Pinnacle Peak Road", city: "Scottsdale", state: "AZ", zipCode: "85255", latitude: "33.6936", longitude: "-111.8901", googlePlaceId: "" }],
    streetAddress: "8900 E Pinnacle Peak Road", city: "Scottsdale", state: "AZ", zipCode: "85255",
    latitude: "33.6936", longitude: "-111.8901", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "91,800", numberOfUnits: "108", yearBuilt: "2019",
    physicalOccupancyPct: "96", economicOccupancyPct: "93" },
  { id: "seed_p72", createdAt: d(2026,1,20), updatedAt: d(2026,3,8),
    legalAddress: "2000 W Chandler Boulevard, Chandler, AZ 85224",
    locations: [{ id: "seed_p72_loc1", label: "Main", streetAddress: "2000 W Chandler Boulevard", city: "Chandler", state: "AZ", zipCode: "85224", latitude: "33.3068", longitude: "-111.8643", googlePlaceId: "" }],
    streetAddress: "2000 W Chandler Boulevard", city: "Chandler", state: "AZ", zipCode: "85224",
    latitude: "33.3068", longitude: "-111.8643", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "42,000", numberOfUnits: "8", yearBuilt: "2007",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p73", createdAt: d(2026,2,18), updatedAt: d(2026,3,19),
    legalAddress: "6600 Chase Oaks Boulevard, Plano, TX 75023",
    locations: [{ id: "seed_p73_loc1", label: "Main", streetAddress: "6600 Chase Oaks Boulevard", city: "Plano", state: "TX", zipCode: "75023", latitude: "33.0576", longitude: "-96.7348", googlePlaceId: "" }],
    streetAddress: "6600 Chase Oaks Boulevard", city: "Plano", state: "TX", zipCode: "75023",
    latitude: "33.0576", longitude: "-96.7348", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "86,000", numberOfUnits: "", yearBuilt: "2014",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p74", createdAt: d(2026,1,14), updatedAt: d(2026,3,4),
    legalAddress: "4500 W Kingsley Road, Garland, TX 75041",
    locations: [{ id: "seed_p74_loc1", label: "Main", streetAddress: "4500 W Kingsley Road", city: "Garland", state: "TX", zipCode: "75041", latitude: "32.9083", longitude: "-96.7103", googlePlaceId: "" }],
    streetAddress: "4500 W Kingsley Road", city: "Garland", state: "TX", zipCode: "75041",
    latitude: "32.9083", longitude: "-96.7103", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "195,000", numberOfUnits: "", yearBuilt: "2012",
    physicalOccupancyPct: "97", economicOccupancyPct: "95" },
  { id: "seed_p75", createdAt: d(2026,2,18), updatedAt: d(2026,3,19),
    legalAddress: "5600 McCart Avenue, Fort Worth, TX 76133",
    locations: [{ id: "seed_p75_loc1", label: "Main", streetAddress: "5600 McCart Avenue", city: "Fort Worth", state: "TX", zipCode: "76133", latitude: "32.6691", longitude: "-97.3538", googlePlaceId: "" }],
    streetAddress: "5600 McCart Avenue", city: "Fort Worth", state: "TX", zipCode: "76133",
    latitude: "32.6691", longitude: "-97.3538", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "122,400", numberOfUnits: "144", yearBuilt: "2018",
    physicalOccupancyPct: "95", economicOccupancyPct: "92" },
  { id: "seed_p76", createdAt: d(2026,1,14), updatedAt: d(2026,3,6),
    legalAddress: "1500 Nolan Ryan Expressway, Arlington, TX 76011",
    locations: [{ id: "seed_p76_loc1", label: "Main", streetAddress: "1500 Nolan Ryan Expressway", city: "Arlington", state: "TX", zipCode: "76011", latitude: "32.7412", longitude: "-97.0864", googlePlaceId: "" }],
    streetAddress: "1500 Nolan Ryan Expressway", city: "Arlington", state: "TX", zipCode: "76011",
    latitude: "32.7412", longitude: "-97.0864", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "68,000", numberOfUnits: "", yearBuilt: "2013",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p77", createdAt: d(2026,2,14), updatedAt: d(2026,3,16),
    legalAddress: "2400 W Airport Freeway, Irving, TX 75062",
    locations: [{ id: "seed_p77_loc1", label: "Main", streetAddress: "2400 W Airport Freeway", city: "Irving", state: "TX", zipCode: "75062", latitude: "32.8225", longitude: "-96.9766", googlePlaceId: "" }],
    streetAddress: "2400 W Airport Freeway", city: "Irving", state: "TX", zipCode: "75062",
    latitude: "32.8225", longitude: "-96.9766", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "38,000", numberOfUnits: "7", yearBuilt: "2008",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p78", createdAt: d(2026,1,26), updatedAt: d(2026,3,11),
    legalAddress: "9700 Wade Boulevard, Frisco, TX 75035",
    locations: [{ id: "seed_p78_loc1", label: "Main", streetAddress: "9700 Wade Boulevard", city: "Frisco", state: "TX", zipCode: "75035", latitude: "33.1749", longitude: "-96.7879", googlePlaceId: "" }],
    streetAddress: "9700 Wade Boulevard", city: "Frisco", state: "TX", zipCode: "75035",
    latitude: "33.1749", longitude: "-96.7879", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "240,000", numberOfUnits: "", yearBuilt: "2017",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p79", createdAt: d(2026,1,10), updatedAt: d(2026,3,3),
    legalAddress: "3600 Craig Drive, McKinney, TX 75070",
    locations: [{ id: "seed_p79_loc1", label: "Main", streetAddress: "3600 Craig Drive", city: "McKinney", state: "TX", zipCode: "75070", latitude: "33.1975", longitude: "-96.6621", googlePlaceId: "" }],
    streetAddress: "3600 Craig Drive", city: "McKinney", state: "TX", zipCode: "75070",
    latitude: "33.1975", longitude: "-96.6621", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "153,000", numberOfUnits: "180", yearBuilt: "2020",
    physicalOccupancyPct: "97", economicOccupancyPct: "94" },
  { id: "seed_p80", createdAt: d(2026,2,6), updatedAt: d(2026,3,14),
    legalAddress: "1350 N IH 35, San Marcos, TX 78666",
    locations: [{ id: "seed_p80_loc1", label: "Main", streetAddress: "1350 N IH 35", city: "San Marcos", state: "TX", zipCode: "78666", latitude: "29.8843", longitude: "-97.9384", googlePlaceId: "" }],
    streetAddress: "1350 N IH 35", city: "San Marcos", state: "TX", zipCode: "78666",
    latitude: "29.8843", longitude: "-97.9384", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "44,000", numberOfUnits: "", yearBuilt: "2016",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p81", createdAt: d(2026,2,22), updatedAt: d(2026,3,18),
    legalAddress: "6800 San Dario Avenue, Laredo, TX 78041",
    locations: [{ id: "seed_p81_loc1", label: "Main", streetAddress: "6800 San Dario Avenue", city: "Laredo", state: "TX", zipCode: "78041", latitude: "27.5721", longitude: "-99.5042", googlePlaceId: "" }],
    streetAddress: "6800 San Dario Avenue", city: "Laredo", state: "TX", zipCode: "78041",
    latitude: "27.5721", longitude: "-99.5042", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "28,000", numberOfUnits: "5", yearBuilt: "2010",
    physicalOccupancyPct: "84", economicOccupancyPct: "81" },
  { id: "seed_p82", createdAt: d(2026,1,16), updatedAt: d(2026,3,5),
    legalAddress: "8200 Upland Avenue, Lubbock, TX 79404",
    locations: [{ id: "seed_p82_loc1", label: "Main", streetAddress: "8200 Upland Avenue", city: "Lubbock", state: "TX", zipCode: "79404", latitude: "33.5503", longitude: "-101.8143", googlePlaceId: "" }],
    streetAddress: "8200 Upland Avenue", city: "Lubbock", state: "TX", zipCode: "79404",
    latitude: "33.5503", longitude: "-101.8143", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "295,000", numberOfUnits: "", yearBuilt: "2014",
    physicalOccupancyPct: "96", economicOccupancyPct: "94" },
  { id: "seed_p83", createdAt: d(2026,2,8), updatedAt: d(2026,2,22),
    legalAddress: "350 E Las Olas Boulevard, Fort Lauderdale, FL 33301",
    locations: [{ id: "seed_p83_loc1", label: "Main", streetAddress: "350 E Las Olas Boulevard", city: "Fort Lauderdale", state: "FL", zipCode: "33301", latitude: "26.1188", longitude: "-80.1439", googlePlaceId: "" }],
    streetAddress: "350 E Las Olas Boulevard", city: "Fort Lauderdale", state: "FL", zipCode: "33301",
    latitude: "26.1188", longitude: "-80.1439", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "55,000", numberOfUnits: "", yearBuilt: "2006",
    physicalOccupancyPct: "72", economicOccupancyPct: "68" },
  { id: "seed_p84", createdAt: d(2026,2,1), updatedAt: d(2026,2,15),
    legalAddress: "2500 Pearl Street, Boulder, CO 80302",
    locations: [{ id: "seed_p84_loc1", label: "Main", streetAddress: "2500 Pearl Street", city: "Boulder", state: "CO", zipCode: "80302", latitude: "40.0167", longitude: "-105.2789", googlePlaceId: "" }],
    streetAddress: "2500 Pearl Street", city: "Boulder", state: "CO", zipCode: "80302",
    latitude: "40.0167", longitude: "-105.2789", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "22,000", numberOfUnits: "4", yearBuilt: "2002",
    physicalOccupancyPct: "75", economicOccupancyPct: "72" },
  { id: "seed_p85", createdAt: d(2025,11,12), updatedAt: d(2026,1,10),
    legalAddress: "2800 S College Avenue, Fort Collins, CO 80525",
    locations: [{ id: "seed_p85_loc1", label: "Main", streetAddress: "2800 S College Avenue", city: "Fort Collins", state: "CO", zipCode: "80525", latitude: "40.5502", longitude: "-105.0791", googlePlaceId: "" }],
    streetAddress: "2800 S College Avenue", city: "Fort Collins", state: "CO", zipCode: "80525",
    latitude: "40.5502", longitude: "-105.0791", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "81,600", numberOfUnits: "96", yearBuilt: "2010",
    physicalOccupancyPct: "82", economicOccupancyPct: "78" },
  { id: "seed_p86", createdAt: d(2026,2,12), updatedAt: d(2026,3,5),
    legalAddress: "300 E Cordova Street, Pasadena, CA 91101",
    locations: [{ id: "seed_p86_loc1", label: "Main", streetAddress: "300 E Cordova Street", city: "Pasadena", state: "CA", zipCode: "91101", latitude: "34.1470", longitude: "-118.1445", googlePlaceId: "" }],
    streetAddress: "300 E Cordova Street", city: "Pasadena", state: "CA", zipCode: "91101",
    latitude: "34.1470", longitude: "-118.1445", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "65,000", numberOfUnits: "", yearBuilt: "2004",
    physicalOccupancyPct: "74", economicOccupancyPct: "70" },
  { id: "seed_p87", createdAt: d(2026,1,10), updatedAt: d(2026,2,28),
    legalAddress: "500 James Street, New Haven, CT 06513",
    locations: [{ id: "seed_p87_loc1", label: "Main", streetAddress: "500 James Street", city: "New Haven", state: "CT", zipCode: "06513", latitude: "41.2981", longitude: "-72.9151", googlePlaceId: "" }],
    streetAddress: "500 James Street", city: "New Haven", state: "CT", zipCode: "06513",
    latitude: "41.2981", longitude: "-72.9151", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "140,000", numberOfUnits: "", yearBuilt: "1998",
    physicalOccupancyPct: "68", economicOccupancyPct: "65" },
  { id: "seed_p88", createdAt: d(2026,2,10), updatedAt: d(2026,3,1),
    legalAddress: "200 N King Street, Wilmington, DE 19801",
    locations: [{ id: "seed_p88_loc1", label: "Main", streetAddress: "200 N King Street", city: "Wilmington", state: "DE", zipCode: "19801", latitude: "39.7458", longitude: "-75.5477", googlePlaceId: "" }],
    streetAddress: "200 N King Street", city: "Wilmington", state: "DE", zipCode: "19801",
    latitude: "39.7458", longitude: "-75.5477", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "32,200", numberOfUnits: "28", yearBuilt: "2009",
    physicalOccupancyPct: "79", economicOccupancyPct: "75" },
  { id: "seed_p89", createdAt: d(2026,2,5), updatedAt: d(2026,3,8),
    legalAddress: "1 Canal Street, Savannah, GA 31401",
    locations: [{ id: "seed_p89_loc1", label: "Main", streetAddress: "1 Canal Street", city: "Savannah", state: "GA", zipCode: "31401", latitude: "32.0835", longitude: "-81.0998", googlePlaceId: "" }],
    streetAddress: "1 Canal Street", city: "Savannah", state: "GA", zipCode: "31401",
    latitude: "32.0835", longitude: "-81.0998", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "74,800", numberOfUnits: "88", yearBuilt: "2007",
    physicalOccupancyPct: "77", economicOccupancyPct: "73" },
  { id: "seed_p90", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    legalAddress: "315 S Calhoun Street, Tallahassee, FL 32301",
    locations: [{ id: "seed_p90_loc1", label: "Main", streetAddress: "315 S Calhoun Street", city: "Tallahassee", state: "FL", zipCode: "32301", latitude: "30.4380", longitude: "-84.2820", googlePlaceId: "" }],
    streetAddress: "315 S Calhoun Street", city: "Tallahassee", state: "FL", zipCode: "32301",
    latitude: "30.4380", longitude: "-84.2820", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "48,000", numberOfUnits: "", yearBuilt: "2001",
    physicalOccupancyPct: "70", economicOccupancyPct: "66" },
  { id: "seed_p91", createdAt: d(2026,2,14), updatedAt: d(2026,3,5),
    legalAddress: "5100 N 9th Avenue, Pensacola, FL 32504",
    locations: [{ id: "seed_p91_loc1", label: "Main", streetAddress: "5100 N 9th Avenue", city: "Pensacola", state: "FL", zipCode: "32504", latitude: "30.4546", longitude: "-87.1765", googlePlaceId: "" }],
    streetAddress: "5100 N 9th Avenue", city: "Pensacola", state: "FL", zipCode: "32504",
    latitude: "30.4546", longitude: "-87.1765", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "32,000", numberOfUnits: "6", yearBuilt: "2004",
    physicalOccupancyPct: "75", economicOccupancyPct: "71" },
  { id: "seed_p92", createdAt: d(2025,12,15), updatedAt: d(2026,2,10),
    legalAddress: "1200 N Central Street, Knoxville, TN 37917",
    locations: [{ id: "seed_p92_loc1", label: "Main", streetAddress: "1200 N Central Street", city: "Knoxville", state: "TN", zipCode: "37917", latitude: "35.9823", longitude: "-83.9212", googlePlaceId: "" }],
    streetAddress: "1200 N Central Street", city: "Knoxville", state: "TN", zipCode: "37917",
    latitude: "35.9823", longitude: "-83.9212", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "88,400", numberOfUnits: "104", yearBuilt: "2012",
    physicalOccupancyPct: "80", economicOccupancyPct: "76" },
  { id: "seed_p93", createdAt: d(2025,12,1), updatedAt: d(2026,2,5),
    legalAddress: "1301 Gervais Street, Columbia, SC 29201",
    locations: [{ id: "seed_p93_loc1", label: "Main", streetAddress: "1301 Gervais Street", city: "Columbia", state: "SC", zipCode: "29201", latitude: "34.0012", longitude: "-81.0379", googlePlaceId: "" }],
    streetAddress: "1301 Gervais Street", city: "Columbia", state: "SC", zipCode: "29201",
    latitude: "34.0012", longitude: "-81.0379", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "42,000", numberOfUnits: "", yearBuilt: "2005",
    physicalOccupancyPct: "73", economicOccupancyPct: "69" },
  { id: "seed_p94", createdAt: d(2025,11,20), updatedAt: d(2026,1,15),
    legalAddress: "2600 N West Street, Jackson, MS 39213",
    locations: [{ id: "seed_p94_loc1", label: "Main", streetAddress: "2600 N West Street", city: "Jackson", state: "MS", zipCode: "39213", latitude: "32.3294", longitude: "-90.2165", googlePlaceId: "" }],
    streetAddress: "2600 N West Street", city: "Jackson", state: "MS", zipCode: "39213",
    latitude: "32.3294", longitude: "-90.2165", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "185,000", numberOfUnits: "", yearBuilt: "2000",
    physicalOccupancyPct: "75", economicOccupancyPct: "71" },
  { id: "seed_p95", createdAt: d(2025,12,5), updatedAt: d(2026,2,18),
    legalAddress: "2100 Hamilton Place Boulevard, Chattanooga, TN 37421",
    locations: [{ id: "seed_p95_loc1", label: "Main", streetAddress: "2100 Hamilton Place Boulevard", city: "Chattanooga", state: "TN", zipCode: "37421", latitude: "35.0197", longitude: "-85.1495", googlePlaceId: "" }],
    streetAddress: "2100 Hamilton Place Boulevard", city: "Chattanooga", state: "TN", zipCode: "37421",
    latitude: "35.0197", longitude: "-85.1495", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "35,000", numberOfUnits: "7", yearBuilt: "2003",
    physicalOccupancyPct: "79", economicOccupancyPct: "75" },
  { id: "seed_p96", createdAt: d(2025,11,5), updatedAt: d(2026,1,20),
    legalAddress: "1200 N Memorial Pkwy, Huntsville, AL 35801",
    locations: [{ id: "seed_p96_loc1", label: "Main", streetAddress: "1200 N Memorial Pkwy", city: "Huntsville", state: "AL", zipCode: "35801", latitude: "34.7374", longitude: "-86.5958", googlePlaceId: "" }],
    streetAddress: "1200 N Memorial Pkwy", city: "Huntsville", state: "AL", zipCode: "35801",
    latitude: "34.7374", longitude: "-86.5958", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "98,600", numberOfUnits: "116", yearBuilt: "2011",
    physicalOccupancyPct: "78", economicOccupancyPct: "74" },
  { id: "seed_p97", createdAt: d(2025,10,20), updatedAt: d(2026,1,5),
    legalAddress: "1 10th Street, Augusta, GA 30901",
    locations: [{ id: "seed_p97_loc1", label: "Main", streetAddress: "1 10th Street", city: "Augusta", state: "GA", zipCode: "30901", latitude: "33.4748", longitude: "-81.9748", googlePlaceId: "" }],
    streetAddress: "1 10th Street", city: "Augusta", state: "GA", zipCode: "30901",
    latitude: "33.4748", longitude: "-81.9748", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "38,000", numberOfUnits: "", yearBuilt: "1999",
    physicalOccupancyPct: "69", economicOccupancyPct: "65" },
  { id: "seed_p98", createdAt: d(2025,10,10), updatedAt: d(2025,12,20),
    legalAddress: "3800 Shurling Drive, Macon, GA 31211",
    locations: [{ id: "seed_p98_loc1", label: "Main", streetAddress: "3800 Shurling Drive", city: "Macon", state: "GA", zipCode: "31211", latitude: "32.8576", longitude: "-83.5781", googlePlaceId: "" }],
    streetAddress: "3800 Shurling Drive", city: "Macon", state: "GA", zipCode: "31211",
    latitude: "32.8576", longitude: "-83.5781", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "155,000", numberOfUnits: "", yearBuilt: "2001",
    physicalOccupancyPct: "67", economicOccupancyPct: "63" },
  { id: "seed_p99", createdAt: d(2025,12,10), updatedAt: d(2026,2,15),
    legalAddress: "2200 NW 13th Street, Gainesville, FL 32609",
    locations: [{ id: "seed_p99_loc1", label: "Main", streetAddress: "2200 NW 13th Street", city: "Gainesville", state: "FL", zipCode: "32609", latitude: "29.6716", longitude: "-82.3387", googlePlaceId: "" }],
    streetAddress: "2200 NW 13th Street", city: "Gainesville", state: "FL", zipCode: "32609",
    latitude: "29.6716", longitude: "-82.3387", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "38,600", numberOfUnits: "36", yearBuilt: "2013",
    physicalOccupancyPct: "81", economicOccupancyPct: "77" },
  { id: "seed_p100", createdAt: d(2025,11,15), updatedAt: d(2026,1,10),
    legalAddress: "4600 SW College Road, Ocala, FL 34474",
    locations: [{ id: "seed_p100_loc1", label: "Main", streetAddress: "4600 SW College Road", city: "Ocala", state: "FL", zipCode: "34474", latitude: "29.1756", longitude: "-82.1887", googlePlaceId: "" }],
    streetAddress: "4600 SW College Road", city: "Ocala", state: "FL", zipCode: "34474",
    latitude: "29.1756", longitude: "-82.1887", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "24,000", numberOfUnits: "5", yearBuilt: "2006",
    physicalOccupancyPct: "72", economicOccupancyPct: "68" },
];

// ─── Rate-seed helpers ────────────────────────────────────────────────────────
// These helpers build the 12 rate-pricing fields spread into each seeded app.
// base = "0" for all seeds (pure index + spread construction; no separate base).
// allInFixedRate  = base(0) + fixedRateVariance + indexRate + spreadOnFixed
// proformaAdjRate = base(0) + adjustableRateVariance + adjustableIndexRate + spreadOnAdjustable

type RS = Pick<LoanApplication,
  | "rateType" | "baseRate" | "fixedRateVariance" | "indexName" | "indexRate"
  | "spreadOnFixed" | "allInFixedRate" | "adjustableRateVariance"
  | "adjustableIndexName" | "adjustableIndexRate"
  | "spreadOnAdjustable" | "proformaAdjustableAllInRate">;

type SeedApp = Omit<LoanApplication, keyof RS> & Partial<RS>;

function fr(idx: string, idxR: string, fv: string, sf: string, air: string): RS {
  return { rateType: "Fixed Rate", baseRate: "0",
    fixedRateVariance: fv, indexName: idx, indexRate: idxR, spreadOnFixed: sf, allInFixedRate: air,
    adjustableRateVariance: "", adjustableIndexName: "", adjustableIndexRate: "",
    spreadOnAdjustable: "", proformaAdjustableAllInRate: "" };
}
function ar(fixedIdx: string, fixedIdxR: string, fv: string, sf: string, air: string,
            av: string, adjIdx: string, adjIdxR: string, sa: string, par: string): RS {
  return { rateType: "Adjustable Rate", baseRate: "0",
    fixedRateVariance: fv, indexName: fixedIdx, indexRate: fixedIdxR, spreadOnFixed: sf, allInFixedRate: air,
    adjustableRateVariance: av, adjustableIndexName: adjIdx, adjustableIndexRate: adjIdxR,
    spreadOnAdjustable: sa, proformaAdjustableAllInRate: par };
}
function hy(fixedIdx: string, fixedIdxR: string, fv: string, sf: string, air: string,
            av: string, adjIdx: string, adjIdxR: string, sa: string, par: string): RS {
  return { rateType: "Hybrid", baseRate: "0",
    fixedRateVariance: fv, indexName: fixedIdx, indexRate: fixedIdxR, spreadOnFixed: sf, allInFixedRate: air,
    adjustableRateVariance: av, adjustableIndexName: adjIdx, adjustableIndexRate: adjIdxR,
    spreadOnAdjustable: sa, proformaAdjustableAllInRate: par };
}
function nr(rt: RateType = "Fixed Rate"): RS {
  return { rateType: rt, baseRate: "", fixedRateVariance: "", indexName: "", indexRate: "",
    spreadOnFixed: "", allInFixedRate: "", adjustableRateVariance: "",
    adjustableIndexName: "", adjustableIndexRate: "",
    spreadOnAdjustable: "", proformaAdjustableAllInRate: "" };
}

// Index name + rate shorthands
const SOFR_N = "SOFR 30-Day Avg"; const SOFR_R = "4.300000";
const T5_N   = "US Treasury 5-Yr";  const T5_R   = "4.150000";
const T10_N  = "US Treasury 10-Yr"; const T10_R  = "4.450000";
const PRI_N  = "Prime Rate";         const PRI_R  = "7.500000";

// ── Fixed Rate presets (air = 0 + fv + idxR + sf) ────────────────────────────
const FR_580 = fr(SOFR_N, SOFR_R, "0.000000", "1.500000", "5.800000"); // 0+0+4.30+1.50
const FR_595 = fr(T10_N,  T10_R,  "0.000000", "1.500000", "5.950000"); // 0+0+4.45+1.50
const FR_615 = fr(T5_N,   T5_R,   "0.000000", "2.000000", "6.150000"); // 0+0+4.15+2.00
const FR_640 = fr(T5_N,   T5_R,   "0.250000", "2.000000", "6.400000"); // 0+0.25+4.15+2.00
const FR_655 = fr(SOFR_N, SOFR_R, "0.250000", "2.000000", "6.550000"); // 0+0.25+4.30+2.00
const FR_670 = fr(T10_N,  T10_R,  "0.250000", "2.000000", "6.700000"); // 0+0.25+4.45+2.00
const FR_695 = fr(T10_N,  T10_R,  "0.000000", "2.500000", "6.950000"); // 0+0+4.45+2.50
const FR_705 = fr(SOFR_N, SOFR_R, "0.500000", "2.250000", "7.050000"); // 0+0.50+4.30+2.25

// ── Adjustable Rate presets (Fixed ref section + Adjustable section) ──────────
// Fixed: 0+fv+fixedIdxR+sf  |  Adj: 0+av+adjIdxR+sa  (each section has its own index)
const AR_605 = ar(SOFR_N, SOFR_R, "0.000000", "1.500000", "5.800000",
                  "0.500000", SOFR_N, SOFR_R, "1.250000", "6.050000"); // adj: 0+0.5+4.30+1.25
const AR_655 = ar(SOFR_N, SOFR_R, "0.000000", "1.750000", "6.050000",
                  "0.750000", SOFR_N, SOFR_R, "1.500000", "6.550000"); // adj: 0+0.75+4.30+1.50
const AR_730 = ar(SOFR_N, SOFR_R, "0.000000", "2.250000", "6.550000",
                  "1.000000", SOFR_N, SOFR_R, "2.000000", "7.300000"); // adj: 0+1.00+4.30+2.00
const AR_780 = ar(SOFR_N, SOFR_R, "0.000000", "2.750000", "7.050000",
                  "1.250000", SOFR_N, SOFR_R, "2.250000", "7.800000"); // adj: 0+1.25+4.30+2.25
const AR_800 = ar(PRI_N,  PRI_R,  "-0.125000","0.000000", "7.375000",
                  "0.500000", PRI_N,  PRI_R,  "0.000000", "8.000000"); // adj: 0+0.50+7.50+0.00

// ── Hybrid presets (both Fixed and Adjustable sections populated) ─────────────
// HY_615_640: fixed=T5, adjustable=SOFR  |  HY_655_680: both SOFR
// HY_670_695: fixed=T10, adjustable=SOFR |  HY_705_755: both SOFR
const HY_615_640 = hy(T5_N,   T5_R,   "0.000000", "2.000000", "6.150000",
                       "0.500000", SOFR_N, SOFR_R, "1.600000", "6.400000"); // adj: 0+0.50+4.30+1.60
const HY_655_680 = hy(SOFR_N, SOFR_R, "0.250000", "2.000000", "6.550000",
                       "0.750000", SOFR_N, SOFR_R, "1.750000", "6.800000"); // adj: 0+0.75+4.30+1.75
const HY_670_695 = hy(T10_N,  T10_R,  "0.250000", "2.000000", "6.700000",
                       "0.500000", SOFR_N, SOFR_R, "2.150000", "6.950000"); // adj: 0+0.50+4.30+2.15
const HY_705_755 = hy(SOFR_N, SOFR_R, "0.500000", "2.250000", "7.050000",
                       "0.750000", SOFR_N, SOFR_R, "2.500000", "7.550000"); // adj: 0+0.75+4.30+2.50

const SEED_APPS: SeedApp[] = [
  { id: "seed_a01", createdAt: d(2026,3,14), updatedAt: d(2026,3,14), status: "Inquiry",
    borrowerId: "seed_b08", propertyId: "seed_p01", loanType: "Acquisition",
    loanAmountUsd: "8,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.75", amortizationType: "Full Amortizing", ltvPct: "65",
    dscrRatio: "1.28", targetClosingDate: ds(2026,7,15) },
  { id: "seed_a02", createdAt: d(2026,2,20), updatedAt: d(2026,3,5), status: "Initial Credit Review",
    borrowerId: "seed_b04", propertyId: "seed_p02", loanType: "Refinance",
    loanAmountUsd: "12,200,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.40", amortizationType: "Interest Only", ltvPct: "60",
    dscrRatio: "1.45", targetClosingDate: ds(2026,6,30) },
  { id: "seed_a03", createdAt: d(2026,2,5), updatedAt: d(2026,3,10), status: "Application Start",
    borrowerId: "seed_b01", propertyId: "seed_p03", loanType: "Acquisition",
    loanAmountUsd: "19,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.20", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.52", targetClosingDate: ds(2026,5,30) },
  { id: "seed_a04", createdAt: d(2026,1,15), updatedAt: d(2026,3,18), status: "Application Processing",
    borrowerId: "seed_b02", propertyId: "seed_p04", loanType: "Refinance",
    loanAmountUsd: "22,400,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.00", amortizationType: "Full Amortizing", ltvPct: "58",
    dscrRatio: "1.60", targetClosingDate: ds(2026,5,15) },
  { id: "seed_a05", createdAt: d(2026,1,8), updatedAt: d(2026,3,19), status: "Final Credit Review",
    borrowerId: "seed_b07", propertyId: "seed_p05", loanType: "Acquisition",
    loanAmountUsd: "15,750,000", loanTermYears: "10", interestType: "Floating",
    interestRatePct: "7.10", amortizationType: "Partial IO", ltvPct: "63",
    dscrRatio: "1.38", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a06", createdAt: d(2025,12,10), updatedAt: d(2026,3,20), status: "Pre-close",
    borrowerId: "seed_b06", propertyId: "seed_p06", loanType: "Acquisition",
    loanAmountUsd: "9,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.55", amortizationType: "Full Amortizing", ltvPct: "65",
    dscrRatio: "1.41", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a07", createdAt: d(2025,11,5), updatedAt: d(2026,3,15), status: "Ready for Docs",
    borrowerId: "seed_b07", propertyId: "seed_p07", loanType: "Refinance",
    loanAmountUsd: "28,500,000", loanTermYears: "5", interestType: "Floating",
    interestRatePct: "7.45", amortizationType: "Interest Only", ltvPct: "55",
    dscrRatio: "1.32", targetClosingDate: ds(2026,4,10) },
  { id: "seed_a08", createdAt: d(2025,10,20), updatedAt: d(2026,3,18), status: "Docs Drawn",
    borrowerId: "seed_b03", propertyId: "seed_p08", loanType: "Acquisition",
    loanAmountUsd: "32,100,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.95", amortizationType: "Full Amortizing", ltvPct: "60",
    dscrRatio: "1.58", targetClosingDate: ds(2026,3,28) },
  { id: "seed_a09", createdAt: d(2025,10,1), updatedAt: d(2026,3,20), status: "Docs Back",
    borrowerId: "seed_b04", propertyId: "seed_p09", loanType: "Refinance",
    loanAmountUsd: "17,800,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.15", amortizationType: "Interest Only", ltvPct: "58",
    dscrRatio: "1.55", targetClosingDate: ds(2026,3,26) },
  { id: "seed_a10", createdAt: d(2025,9,15), updatedAt: d(2026,3,21), status: "Closing",
    borrowerId: "seed_b03", propertyId: "seed_p10", loanType: "Refinance",
    loanAmountUsd: "41,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.85", amortizationType: "Full Amortizing", ltvPct: "55",
    dscrRatio: "1.62", targetClosingDate: ds(2026,3,24) },
  { id: "seed_a11", createdAt: d(2026,3,20), updatedAt: d(2026,3,20), status: "Inquiry",
    borrowerId: "seed_b05", propertyId: "seed_p11", loanType: "Acquisition",
    loanAmountUsd: "24,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "60",
    dscrRatio: "", targetClosingDate: ds(2026,8,30) },
  { id: "seed_a12", createdAt: d(2026,2,1), updatedAt: d(2026,3,16), status: "Application Processing",
    borrowerId: "seed_b06", propertyId: "seed_p12", loanType: "Refinance",
    loanAmountUsd: "6,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.60", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.48", targetClosingDate: ds(2026,5,30) },
  { id: "seed_a13", createdAt: d(2026,2,8), updatedAt: d(2026,2,22), status: "Inquiry Canceled",
    borrowerId: "seed_b09", propertyId: "seed_p13", loanType: "Acquisition",
    loanAmountUsd: "5,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a14", createdAt: d(2026,1,20), updatedAt: d(2026,3,3), status: "Application Withdrawn",
    borrowerId: "seed_b10", propertyId: "seed_p14", loanType: "Bridge",
    loanAmountUsd: "11,800,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.80", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.18", targetClosingDate: ds(2026,6,15) },
  { id: "seed_a15", createdAt: d(2025,11,12), updatedAt: d(2026,2,14), status: "Application Denied",
    borrowerId: "seed_b11", propertyId: "seed_p15", loanType: "Refinance",
    loanAmountUsd: "18,900,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.30", amortizationType: "Full Amortizing", ltvPct: "72",
    dscrRatio: "1.09", targetClosingDate: ds(2026,4,30) },
  // ── Inquiry (a16–a25) ─────────────────────────────────────────────────────
  { id: "seed_a16", createdAt: d(2026,3,28), updatedAt: d(2026,3,28), status: "Inquiry",
    borrowerId: "seed_b12", propertyId: "seed_p16", loanType: "Acquisition",
    loanAmountUsd: "6,750,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,9,30) },
  { id: "seed_a17", createdAt: d(2026,3,26), updatedAt: d(2026,3,26), status: "Inquiry",
    borrowerId: "seed_b13", propertyId: "seed_p17", loanType: "Refinance",
    loanAmountUsd: "14,200,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,10,15) },
  { id: "seed_a18", createdAt: d(2026,3,24), updatedAt: d(2026,3,24), status: "Inquiry",
    borrowerId: "seed_b14", propertyId: "seed_p18", loanType: "Bridge",
    loanAmountUsd: "9,500,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,8,1) },
  { id: "seed_a19", createdAt: d(2026,3,22), updatedAt: d(2026,3,22), status: "Inquiry",
    borrowerId: "seed_b15", propertyId: "seed_p19", loanType: "Construction",
    loanAmountUsd: "22,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,9,15) },
  { id: "seed_a20", createdAt: d(2026,3,20), updatedAt: d(2026,3,20), status: "Inquiry",
    borrowerId: "seed_b16", propertyId: "seed_p20", loanType: "Permanent",
    loanAmountUsd: "31,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,10,30) },
  { id: "seed_a21", createdAt: d(2026,3,18), updatedAt: d(2026,3,18), status: "Inquiry",
    borrowerId: "seed_b17", propertyId: "seed_p21", loanType: "Acquisition",
    loanAmountUsd: "7,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,9,1) },
  { id: "seed_a22", createdAt: d(2026,3,15), updatedAt: d(2026,3,15), status: "Inquiry",
    borrowerId: "seed_b18", propertyId: "seed_p22", loanType: "Refinance",
    loanAmountUsd: "18,400,000", loanTermYears: "5", interestType: "Floating",
    interestRatePct: "", amortizationType: "Partial IO", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,8,15) },
  { id: "seed_a23", createdAt: d(2026,3,12), updatedAt: d(2026,3,12), status: "Inquiry",
    borrowerId: "seed_b19", propertyId: "seed_p23", loanType: "Acquisition",
    loanAmountUsd: "11,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,9,30) },
  { id: "seed_a24", createdAt: d(2026,3,10), updatedAt: d(2026,3,10), status: "Inquiry",
    borrowerId: "seed_b20", propertyId: "seed_p24", loanType: "Bridge",
    loanAmountUsd: "5,250,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,7,31) },
  { id: "seed_a25", createdAt: d(2026,3,8), updatedAt: d(2026,3,8), status: "Inquiry",
    borrowerId: "seed_b21", propertyId: "seed_p25", loanType: "Permanent",
    loanAmountUsd: "44,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: ds(2026,11,30) },
  // ── Initial Credit Review (a26–a34) ──────────────────────────────────────
  { id: "seed_a26", createdAt: d(2026,2,25), updatedAt: d(2026,3,18), status: "Initial Credit Review",
    borrowerId: "seed_b22", propertyId: "seed_p26", loanType: "Acquisition",
    loanAmountUsd: "13,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.65", amortizationType: "Full Amortizing", ltvPct: "63",
    dscrRatio: "1.35", targetClosingDate: ds(2026,7,30) },
  { id: "seed_a27", createdAt: d(2026,2,22), updatedAt: d(2026,3,15), status: "Initial Credit Review",
    borrowerId: "seed_b23", propertyId: "seed_p27", loanType: "Refinance",
    loanAmountUsd: "9,100,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.45", amortizationType: "Interest Only", ltvPct: "60",
    dscrRatio: "1.42", targetClosingDate: ds(2026,7,15) },
  { id: "seed_a28", createdAt: d(2026,2,18), updatedAt: d(2026,3,12), status: "Initial Credit Review",
    borrowerId: "seed_b24", propertyId: "seed_p28", loanType: "Bridge",
    loanAmountUsd: "16,800,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.25", amortizationType: "Interest Only", ltvPct: "66",
    dscrRatio: "1.22", targetClosingDate: ds(2026,6,30) },
  { id: "seed_a29", createdAt: d(2026,2,14), updatedAt: d(2026,3,10), status: "Initial Credit Review",
    borrowerId: "seed_b25", propertyId: "seed_p29", loanType: "Acquisition",
    loanAmountUsd: "27,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.20", amortizationType: "Full Amortizing", ltvPct: "58",
    dscrRatio: "1.55", targetClosingDate: ds(2026,8,15) },
  { id: "seed_a30", createdAt: d(2026,2,10), updatedAt: d(2026,3,8), status: "Initial Credit Review",
    borrowerId: "seed_b26", propertyId: "seed_p30", loanType: "Permanent",
    loanAmountUsd: "38,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.90", amortizationType: "Full Amortizing", ltvPct: "55",
    dscrRatio: "1.60", targetClosingDate: ds(2026,7,31) },
  { id: "seed_a31", createdAt: d(2026,2,6), updatedAt: d(2026,3,6), status: "Initial Credit Review",
    borrowerId: "seed_b27", propertyId: "seed_p31", loanType: "Refinance",
    loanAmountUsd: "7,400,000", loanTermYears: "5", interestType: "Hybrid",
    interestRatePct: "6.85", amortizationType: "Partial IO", ltvPct: "65",
    dscrRatio: "1.30", targetClosingDate: ds(2026,7,1) },
  { id: "seed_a32", createdAt: d(2026,2,2), updatedAt: d(2026,3,4), status: "Initial Credit Review",
    borrowerId: "seed_b28", propertyId: "seed_p32", loanType: "Acquisition",
    loanAmountUsd: "20,300,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.30", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.48", targetClosingDate: ds(2026,7,15) },
  { id: "seed_a33", createdAt: d(2026,1,28), updatedAt: d(2026,3,2), status: "Initial Credit Review",
    borrowerId: "seed_b29", propertyId: "seed_p33", loanType: "Construction",
    loanAmountUsd: "35,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "7.60", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.18", targetClosingDate: ds(2026,8,31) },
  { id: "seed_a34", createdAt: d(2026,1,24), updatedAt: d(2026,2,28), status: "Initial Credit Review",
    borrowerId: "seed_b30", propertyId: "seed_p34", loanType: "Bridge",
    loanAmountUsd: "12,500,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.40", amortizationType: "Interest Only", ltvPct: "67",
    dscrRatio: "1.25", targetClosingDate: ds(2026,6,15) },
  // ── Application Start (a35–a43) ──────────────────────────────────────────
  { id: "seed_a35", createdAt: d(2026,1,20), updatedAt: d(2026,3,14), status: "Application Start",
    borrowerId: "seed_b31", propertyId: "seed_p35", loanType: "Refinance",
    loanAmountUsd: "16,700,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.25", amortizationType: "Full Amortizing", ltvPct: "61",
    dscrRatio: "1.50", targetClosingDate: ds(2026,6,30) },
  { id: "seed_a36", createdAt: d(2026,1,16), updatedAt: d(2026,3,12), status: "Application Start",
    borrowerId: "seed_b32", propertyId: "seed_p36", loanType: "Acquisition",
    loanAmountUsd: "8,900,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.70", amortizationType: "Full Amortizing", ltvPct: "64",
    dscrRatio: "1.33", targetClosingDate: ds(2026,6,15) },
  { id: "seed_a37", createdAt: d(2026,1,12), updatedAt: d(2026,3,10), status: "Application Start",
    borrowerId: "seed_b33", propertyId: "seed_p37", loanType: "Permanent",
    loanAmountUsd: "52,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.80", amortizationType: "Full Amortizing", ltvPct: "55",
    dscrRatio: "1.65", targetClosingDate: ds(2026,7,1) },
  { id: "seed_a38", createdAt: d(2026,1,8), updatedAt: d(2026,3,8), status: "Application Start",
    borrowerId: "seed_b34", propertyId: "seed_p38", loanType: "Bridge",
    loanAmountUsd: "14,300,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.55", amortizationType: "Interest Only", ltvPct: "69",
    dscrRatio: "1.20", targetClosingDate: ds(2026,5,31) },
  { id: "seed_a39", createdAt: d(2026,1,4), updatedAt: d(2026,3,6), status: "Application Start",
    borrowerId: "seed_b35", propertyId: "seed_p39", loanType: "Refinance",
    loanAmountUsd: "21,800,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.35", amortizationType: "Partial IO", ltvPct: "60",
    dscrRatio: "1.45", targetClosingDate: ds(2026,6,30) },
  { id: "seed_a40", createdAt: d(2025,12,28), updatedAt: d(2026,3,4), status: "Application Start",
    borrowerId: "seed_b36", propertyId: "seed_p40", loanType: "Acquisition",
    loanAmountUsd: "10,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.55", amortizationType: "Full Amortizing", ltvPct: "63",
    dscrRatio: "1.38", targetClosingDate: ds(2026,6,1) },
  { id: "seed_a41", createdAt: d(2025,12,22), updatedAt: d(2026,3,2), status: "Application Start",
    borrowerId: "seed_b37", propertyId: "seed_p41", loanType: "Construction",
    loanAmountUsd: "28,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "7.70", amortizationType: "Interest Only", ltvPct: "67",
    dscrRatio: "1.15", targetClosingDate: ds(2026,7,31) },
  { id: "seed_a42", createdAt: d(2025,12,16), updatedAt: d(2026,2,28), status: "Application Start",
    borrowerId: "seed_b38", propertyId: "seed_p42", loanType: "Refinance",
    loanAmountUsd: "6,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.60", amortizationType: "Full Amortizing", ltvPct: "65",
    dscrRatio: "1.40", targetClosingDate: ds(2026,5,30) },
  { id: "seed_a43", createdAt: d(2025,12,10), updatedAt: d(2026,2,25), status: "Application Start",
    borrowerId: "seed_b39", propertyId: "seed_p43", loanType: "Acquisition",
    loanAmountUsd: "17,600,000", loanTermYears: "10", interestType: "Hybrid",
    interestRatePct: "6.90", amortizationType: "Partial IO", ltvPct: "62",
    dscrRatio: "1.36", targetClosingDate: ds(2026,6,15) },
  // ── Application Processing (a44–a50) ─────────────────────────────────────
  { id: "seed_a44", createdAt: d(2025,12,4), updatedAt: d(2026,3,20), status: "Application Processing",
    borrowerId: "seed_b40", propertyId: "seed_p44", loanType: "Refinance",
    loanAmountUsd: "25,400,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.10", amortizationType: "Full Amortizing", ltvPct: "59",
    dscrRatio: "1.55", targetClosingDate: ds(2026,5,15) },
  { id: "seed_a45", createdAt: d(2025,11,28), updatedAt: d(2026,3,18), status: "Application Processing",
    borrowerId: "seed_b41", propertyId: "seed_p45", loanType: "Acquisition",
    loanAmountUsd: "19,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.25", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.48", targetClosingDate: ds(2026,5,1) },
  { id: "seed_a46", createdAt: d(2025,11,22), updatedAt: d(2026,3,16), status: "Application Processing",
    borrowerId: "seed_b42", propertyId: "seed_p46", loanType: "Bridge",
    loanAmountUsd: "11,200,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.65", amortizationType: "Interest Only", ltvPct: "70",
    dscrRatio: "1.18", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a47", createdAt: d(2025,11,16), updatedAt: d(2026,3,14), status: "Application Processing",
    borrowerId: "seed_b43", propertyId: "seed_p47", loanType: "Permanent",
    loanAmountUsd: "46,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.75", amortizationType: "Full Amortizing", ltvPct: "54",
    dscrRatio: "1.68", targetClosingDate: ds(2026,5,31) },
  { id: "seed_a48", createdAt: d(2025,11,10), updatedAt: d(2026,3,12), status: "Application Processing",
    borrowerId: "seed_b44", propertyId: "seed_p48", loanType: "Refinance",
    loanAmountUsd: "8,300,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.50", amortizationType: "Interest Only", ltvPct: "63",
    dscrRatio: "1.42", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a49", createdAt: d(2025,11,4), updatedAt: d(2026,3,10), status: "Application Processing",
    borrowerId: "seed_b45", propertyId: "seed_p49", loanType: "Acquisition",
    loanAmountUsd: "14,700,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.40", amortizationType: "Full Amortizing", ltvPct: "61",
    dscrRatio: "1.50", targetClosingDate: ds(2026,5,15) },
  { id: "seed_a50", createdAt: d(2025,10,28), updatedAt: d(2026,3,8), status: "Application Processing",
    borrowerId: "seed_b46", propertyId: "seed_p50", loanType: "Construction",
    loanAmountUsd: "42,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "7.80", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.12", targetClosingDate: ds(2026,6,30) },
  // ── Final Credit Review (a51–a58) ─────────────────────────────────────────
  { id: "seed_a51", createdAt: d(2025,10,20), updatedAt: d(2026,3,22), status: "Final Credit Review",
    borrowerId: "seed_b47", propertyId: "seed_p51", loanType: "Acquisition",
    loanAmountUsd: "23,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.15", amortizationType: "Full Amortizing", ltvPct: "60",
    dscrRatio: "1.52", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a52", createdAt: d(2025,10,12), updatedAt: d(2026,3,20), status: "Final Credit Review",
    borrowerId: "seed_b48", propertyId: "seed_p52", loanType: "Refinance",
    loanAmountUsd: "33,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.95", amortizationType: "Full Amortizing", ltvPct: "57",
    dscrRatio: "1.60", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a53", createdAt: d(2025,10,4), updatedAt: d(2026,3,18), status: "Final Credit Review",
    borrowerId: "seed_b49", propertyId: "seed_p53", loanType: "Bridge",
    loanAmountUsd: "18,500,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.35", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.22", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a54", createdAt: d(2025,9,26), updatedAt: d(2026,3,16), status: "Final Credit Review",
    borrowerId: "seed_b50", propertyId: "seed_p54", loanType: "Permanent",
    loanAmountUsd: "57,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.70", amortizationType: "Full Amortizing", ltvPct: "53",
    dscrRatio: "1.72", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a55", createdAt: d(2025,9,18), updatedAt: d(2026,3,14), status: "Final Credit Review",
    borrowerId: "seed_b51", propertyId: "seed_p55", loanType: "Acquisition",
    loanAmountUsd: "12,400,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.45", amortizationType: "Partial IO", ltvPct: "63",
    dscrRatio: "1.40", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a56", createdAt: d(2025,9,10), updatedAt: d(2026,3,12), status: "Final Credit Review",
    borrowerId: "seed_b52", propertyId: "seed_p56", loanType: "Refinance",
    loanAmountUsd: "7,900,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.55", amortizationType: "Interest Only", ltvPct: "62",
    dscrRatio: "1.44", targetClosingDate: ds(2026,4,30) },
  { id: "seed_a57", createdAt: d(2025,9,2), updatedAt: d(2026,3,10), status: "Final Credit Review",
    borrowerId: "seed_b53", propertyId: "seed_p57", loanType: "Acquisition",
    loanAmountUsd: "29,000,000", loanTermYears: "10", interestType: "Hybrid",
    interestRatePct: "6.80", amortizationType: "Full Amortizing", ltvPct: "60",
    dscrRatio: "1.50", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a58", createdAt: d(2025,8,25), updatedAt: d(2026,3,8), status: "Final Credit Review",
    borrowerId: "seed_b54", propertyId: "seed_p58", loanType: "Bridge",
    loanAmountUsd: "10,600,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "7.50", amortizationType: "Interest Only", ltvPct: "71",
    dscrRatio: "1.19", targetClosingDate: ds(2026,4,10) },
  // ── Pre-close (a59–a65) ───────────────────────────────────────────────────
  { id: "seed_a59", createdAt: d(2025,8,15), updatedAt: d(2026,3,25), status: "Pre-close",
    borrowerId: "seed_b55", propertyId: "seed_p59", loanType: "Refinance",
    loanAmountUsd: "36,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.85", amortizationType: "Full Amortizing", ltvPct: "56",
    dscrRatio: "1.62", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a60", createdAt: d(2025,8,5), updatedAt: d(2026,3,22), status: "Pre-close",
    borrowerId: "seed_b56", propertyId: "seed_p60", loanType: "Acquisition",
    loanAmountUsd: "16,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.30", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.46", targetClosingDate: ds(2026,4,10) },
  { id: "seed_a61", createdAt: d(2025,7,26), updatedAt: d(2026,3,20), status: "Pre-close",
    borrowerId: "seed_b57", propertyId: "seed_p61", loanType: "Permanent",
    loanAmountUsd: "63,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.65", amortizationType: "Full Amortizing", ltvPct: "52",
    dscrRatio: "1.78", targetClosingDate: ds(2026,4,15) },
  { id: "seed_a62", createdAt: d(2025,7,16), updatedAt: d(2026,3,18), status: "Pre-close",
    borrowerId: "seed_b58", propertyId: "seed_p62", loanType: "Bridge",
    loanAmountUsd: "8,700,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.45", amortizationType: "Interest Only", ltvPct: "69",
    dscrRatio: "1.21", targetClosingDate: ds(2026,4,5) },
  { id: "seed_a63", createdAt: d(2025,7,6), updatedAt: d(2026,3,16), status: "Pre-close",
    borrowerId: "seed_b59", propertyId: "seed_p63", loanType: "Refinance",
    loanAmountUsd: "24,100,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.10", amortizationType: "Partial IO", ltvPct: "59",
    dscrRatio: "1.56", targetClosingDate: ds(2026,4,8) },
  { id: "seed_a64", createdAt: d(2025,6,26), updatedAt: d(2026,3,14), status: "Pre-close",
    borrowerId: "seed_b60", propertyId: "seed_p64", loanType: "Acquisition",
    loanAmountUsd: "11,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.60", amortizationType: "Full Amortizing", ltvPct: "64",
    dscrRatio: "1.37", targetClosingDate: ds(2026,4,12) },
  { id: "seed_a65", createdAt: d(2025,6,16), updatedAt: d(2026,3,12), status: "Pre-close",
    borrowerId: "seed_b61", propertyId: "seed_p65", loanType: "Construction",
    loanAmountUsd: "48,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "7.90", amortizationType: "Interest Only", ltvPct: "67",
    dscrRatio: "1.14", targetClosingDate: ds(2026,4,20) },
  // ── Ready for Docs (a66–a72) ──────────────────────────────────────────────
  { id: "seed_a66", createdAt: d(2025,6,6), updatedAt: d(2026,3,28), status: "Ready for Docs",
    borrowerId: "seed_b62", propertyId: "seed_p66", loanType: "Refinance",
    loanAmountUsd: "29,400,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.95", amortizationType: "Full Amortizing", ltvPct: "57",
    dscrRatio: "1.58", targetClosingDate: ds(2026,4,8) },
  { id: "seed_a67", createdAt: d(2025,5,27), updatedAt: d(2026,3,26), status: "Ready for Docs",
    borrowerId: "seed_b63", propertyId: "seed_p67", loanType: "Acquisition",
    loanAmountUsd: "13,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.50", amortizationType: "Full Amortizing", ltvPct: "63",
    dscrRatio: "1.43", targetClosingDate: ds(2026,4,5) },
  { id: "seed_a68", createdAt: d(2025,5,17), updatedAt: d(2026,3,24), status: "Ready for Docs",
    borrowerId: "seed_b64", propertyId: "seed_p68", loanType: "Permanent",
    loanAmountUsd: "71,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.60", amortizationType: "Full Amortizing", ltvPct: "51",
    dscrRatio: "1.82", targetClosingDate: ds(2026,4,3) },
  { id: "seed_a69", createdAt: d(2025,5,7), updatedAt: d(2026,3,22), status: "Ready for Docs",
    borrowerId: "seed_b65", propertyId: "seed_p69", loanType: "Bridge",
    loanAmountUsd: "9,200,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.55", amortizationType: "Interest Only", ltvPct: "70",
    dscrRatio: "1.20", targetClosingDate: ds(2026,4,2) },
  { id: "seed_a70", createdAt: d(2025,4,27), updatedAt: d(2026,3,20), status: "Ready for Docs",
    borrowerId: "seed_b66", propertyId: "seed_p70", loanType: "Refinance",
    loanAmountUsd: "18,700,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "6.20", amortizationType: "Partial IO", ltvPct: "60",
    dscrRatio: "1.50", targetClosingDate: ds(2026,4,4) },
  { id: "seed_a71", createdAt: d(2025,4,17), updatedAt: d(2026,3,18), status: "Ready for Docs",
    borrowerId: "seed_b67", propertyId: "seed_p71", loanType: "Acquisition",
    loanAmountUsd: "7,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.75", amortizationType: "Full Amortizing", ltvPct: "65",
    dscrRatio: "1.35", targetClosingDate: ds(2026,4,6) },
  { id: "seed_a72", createdAt: d(2025,4,7), updatedAt: d(2026,3,16), status: "Ready for Docs",
    borrowerId: "seed_b68", propertyId: "seed_p72", loanType: "Acquisition",
    loanAmountUsd: "21,300,000", loanTermYears: "10", interestType: "Hybrid",
    interestRatePct: "6.95", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.42", targetClosingDate: ds(2026,4,7) },
  // ── Docs Drawn (a73–a76) ──────────────────────────────────────────────────
  { id: "seed_a73", createdAt: d(2025,3,28), updatedAt: d(2026,3,30), status: "Docs Drawn",
    borrowerId: "seed_b69", propertyId: "seed_p73", loanType: "Refinance",
    loanAmountUsd: "43,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.80", amortizationType: "Full Amortizing", ltvPct: "56",
    dscrRatio: "1.64", targetClosingDate: ds(2026,4,4) },
  { id: "seed_a74", createdAt: d(2025,3,18), updatedAt: d(2026,3,28), status: "Docs Drawn",
    borrowerId: "seed_b70", propertyId: "seed_p74", loanType: "Acquisition",
    loanAmountUsd: "15,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.40", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.46", targetClosingDate: ds(2026,4,2) },
  { id: "seed_a75", createdAt: d(2025,3,8), updatedAt: d(2026,3,26), status: "Docs Drawn",
    borrowerId: "seed_b12", propertyId: "seed_p75", loanType: "Bridge",
    loanAmountUsd: "13,100,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.40", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.24", targetClosingDate: ds(2026,4,1) },
  { id: "seed_a76", createdAt: d(2025,2,26), updatedAt: d(2026,3,24), status: "Docs Drawn",
    borrowerId: "seed_b13", propertyId: "seed_p76", loanType: "Permanent",
    loanAmountUsd: "66,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.65", amortizationType: "Full Amortizing", ltvPct: "52",
    dscrRatio: "1.76", targetClosingDate: ds(2026,4,3) },
  // ── Docs Back (a77–a80) ───────────────────────────────────────────────────
  { id: "seed_a77", createdAt: d(2025,2,16), updatedAt: d(2026,3,31), status: "Docs Back",
    borrowerId: "seed_b14", propertyId: "seed_p77", loanType: "Refinance",
    loanAmountUsd: "26,900,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.00", amortizationType: "Full Amortizing", ltvPct: "58",
    dscrRatio: "1.58", targetClosingDate: ds(2026,4,3) },
  { id: "seed_a78", createdAt: d(2025,2,6), updatedAt: d(2026,3,29), status: "Docs Back",
    borrowerId: "seed_b15", propertyId: "seed_p78", loanType: "Acquisition",
    loanAmountUsd: "9,400,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.65", amortizationType: "Full Amortizing", ltvPct: "64",
    dscrRatio: "1.38", targetClosingDate: ds(2026,4,1) },
  { id: "seed_a79", createdAt: d(2025,1,27), updatedAt: d(2026,3,27), status: "Docs Back",
    borrowerId: "seed_b16", propertyId: "seed_p79", loanType: "Bridge",
    loanAmountUsd: "19,800,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.50", amortizationType: "Interest Only", ltvPct: "70",
    dscrRatio: "1.19", targetClosingDate: ds(2026,4,2) },
  { id: "seed_a80", createdAt: d(2025,1,17), updatedAt: d(2026,3,25), status: "Docs Back",
    borrowerId: "seed_b17", propertyId: "seed_p80", loanType: "Permanent",
    loanAmountUsd: "55,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.75", amortizationType: "Full Amortizing", ltvPct: "54",
    dscrRatio: "1.70", targetClosingDate: ds(2026,4,4) },
  // ── Closing (a81–a84) ─────────────────────────────────────────────────────
  { id: "seed_a81", createdAt: d(2025,1,7), updatedAt: d(2026,3,31), status: "Closing",
    borrowerId: "seed_b18", propertyId: "seed_p81", loanType: "Refinance",
    loanAmountUsd: "38,700,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.90", amortizationType: "Full Amortizing", ltvPct: "56",
    dscrRatio: "1.62", targetClosingDate: ds(2026,4,2) },
  { id: "seed_a82", createdAt: d(2024,12,28), updatedAt: d(2026,3,30), status: "Closing",
    borrowerId: "seed_b19", propertyId: "seed_p82", loanType: "Acquisition",
    loanAmountUsd: "14,100,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.35", amortizationType: "Full Amortizing", ltvPct: "62",
    dscrRatio: "1.48", targetClosingDate: ds(2026,4,1) },
  { id: "seed_a83", createdAt: d(2024,12,18), updatedAt: d(2026,3,29), status: "Closing",
    borrowerId: "seed_b20", propertyId: "seed_p83", loanType: "Bridge",
    loanAmountUsd: "22,500,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.35", amortizationType: "Interest Only", ltvPct: "68",
    dscrRatio: "1.23", targetClosingDate: ds(2026,4,3) },
  { id: "seed_a84", createdAt: d(2024,12,8), updatedAt: d(2026,3,28), status: "Closing",
    borrowerId: "seed_b21", propertyId: "seed_p84", loanType: "Permanent",
    loanAmountUsd: "78,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "5.60", amortizationType: "Full Amortizing", ltvPct: "51",
    dscrRatio: "1.85", targetClosingDate: ds(2026,4,4) },
  // ── Terminal — Inquiry Canceled (a85–a89) ─────────────────────────────────
  { id: "seed_a85", createdAt: d(2026,3,1), updatedAt: d(2026,3,20), status: "Inquiry Canceled",
    borrowerId: "seed_b22", propertyId: "seed_p85", loanType: "Acquisition",
    loanAmountUsd: "7,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a86", createdAt: d(2026,2,15), updatedAt: d(2026,3,10), status: "Inquiry Canceled",
    borrowerId: "seed_b23", propertyId: "seed_p86", loanType: "Refinance",
    loanAmountUsd: "13,500,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a87", createdAt: d(2026,1,10), updatedAt: d(2026,2,5), status: "Inquiry Canceled",
    borrowerId: "seed_b24", propertyId: "seed_p87", loanType: "Bridge",
    loanAmountUsd: "8,000,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a88", createdAt: d(2025,12,5), updatedAt: d(2025,12,28), status: "Inquiry Canceled",
    borrowerId: "seed_b25", propertyId: "seed_p88", loanType: "Permanent",
    loanAmountUsd: "29,000,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a89", createdAt: d(2025,11,1), updatedAt: d(2025,11,22), status: "Inquiry Canceled",
    borrowerId: "seed_b26", propertyId: "seed_p89", loanType: "Acquisition",
    loanAmountUsd: "5,600,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  // ── Terminal — Inquiry Withdrawn (a90–a93) ────────────────────────────────
  { id: "seed_a90", createdAt: d(2026,2,20), updatedAt: d(2026,3,15), status: "Inquiry Withdrawn",
    borrowerId: "seed_b27", propertyId: "seed_p90", loanType: "Refinance",
    loanAmountUsd: "11,000,000", loanTermYears: "5", interestType: "Floating",
    interestRatePct: "", amortizationType: "Partial IO", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a91", createdAt: d(2026,1,5), updatedAt: d(2026,1,28), status: "Inquiry Withdrawn",
    borrowerId: "seed_b28", propertyId: "seed_p91", loanType: "Acquisition",
    loanAmountUsd: "17,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a92", createdAt: d(2025,11,15), updatedAt: d(2025,12,10), status: "Inquiry Withdrawn",
    borrowerId: "seed_b29", propertyId: "seed_p92", loanType: "Bridge",
    loanAmountUsd: "6,500,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "", amortizationType: "Interest Only", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  { id: "seed_a93", createdAt: d(2025,10,10), updatedAt: d(2025,11,5), status: "Inquiry Withdrawn",
    borrowerId: "seed_b30", propertyId: "seed_p93", loanType: "Permanent",
    loanAmountUsd: "42,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "", amortizationType: "Full Amortizing", ltvPct: "",
    dscrRatio: "", targetClosingDate: "" },
  // ── Terminal — Inquiry Denied (a94–a95) ───────────────────────────────────
  { id: "seed_a94", createdAt: d(2026,2,1), updatedAt: d(2026,3,1), status: "Inquiry Denied",
    borrowerId: "seed_b31", propertyId: "seed_p94", loanType: "Acquisition",
    loanAmountUsd: "9,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "7.10", amortizationType: "Full Amortizing", ltvPct: "78",
    dscrRatio: "0.95", targetClosingDate: "" },
  { id: "seed_a95", createdAt: d(2025,12,10), updatedAt: d(2026,1,20), status: "Inquiry Denied",
    borrowerId: "seed_b32", propertyId: "seed_p95", loanType: "Refinance",
    loanAmountUsd: "22,000,000", loanTermYears: "7", interestType: "Fixed",
    interestRatePct: "7.30", amortizationType: "Interest Only", ltvPct: "80",
    dscrRatio: "0.88", targetClosingDate: "" },
  // ── Terminal — Application Withdrawn (a96–a97) ────────────────────────────
  { id: "seed_a96", createdAt: d(2025,8,20), updatedAt: d(2025,12,15), status: "Application Withdrawn",
    borrowerId: "seed_b33", propertyId: "seed_p96", loanType: "Acquisition",
    loanAmountUsd: "14,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.80", amortizationType: "Full Amortizing", ltvPct: "69",
    dscrRatio: "1.22", targetClosingDate: ds(2025,12,31) },
  { id: "seed_a97", createdAt: d(2025,7,10), updatedAt: d(2025,11,20), status: "Application Withdrawn",
    borrowerId: "seed_b34", propertyId: "seed_p97", loanType: "Bridge",
    loanAmountUsd: "8,800,000", loanTermYears: "3", interestType: "Floating",
    interestRatePct: "7.90", amortizationType: "Interest Only", ltvPct: "72",
    dscrRatio: "1.15", targetClosingDate: ds(2025,11,30) },
  // ── Terminal — Application Canceled (a98) ─────────────────────────────────
  { id: "seed_a98", createdAt: d(2025,9,5), updatedAt: d(2025,12,20), status: "Application Canceled",
    borrowerId: "seed_b35", propertyId: "seed_p98", loanType: "Construction",
    loanAmountUsd: "31,000,000", loanTermYears: "2", interestType: "Floating",
    interestRatePct: "8.10", amortizationType: "Interest Only", ltvPct: "70",
    dscrRatio: "1.10", targetClosingDate: ds(2025,12,15) },
  // ── Terminal — Application Denied (a99–a100) ──────────────────────────────
  { id: "seed_a99", createdAt: d(2025,6,15), updatedAt: d(2025,10,30), status: "Application Denied",
    borrowerId: "seed_b36", propertyId: "seed_p99", loanType: "Acquisition",
    loanAmountUsd: "18,200,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "7.20", amortizationType: "Full Amortizing", ltvPct: "76",
    dscrRatio: "1.05", targetClosingDate: ds(2025,10,31) },
  { id: "seed_a100", createdAt: d(2025,5,1), updatedAt: d(2025,9,15), status: "Application Denied",
    borrowerId: "seed_b37", propertyId: "seed_p100", loanType: "Refinance",
    loanAmountUsd: "27,800,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "7.40", amortizationType: "Full Amortizing", ltvPct: "77",
    dscrRatio: "1.02", targetClosingDate: ds(2025,9,30) },
];

// ─── Rate data for every seed app ─────────────────────────────────────────────
// Applied at first-install seed time. Distribution: ~42 Fixed Rate, ~27 Adjustable Rate, ~31 Hybrid.
// Active pipeline apps (a01–a84, a94–a100) get full pricing; early-stage inquiries and
// pure-terminal apps (a11, a13, a16–a25, a85–a93) get rateType only with empty rate strings.
const SEED_APP_RATES: Record<string, RS> = {
  // ── Showcase + early workflow (a01–a15) ──────────────────────────────────────
  "seed_a01": FR_670,          // Acquisition / App Processing — Fixed 6.70%
  "seed_a02": HY_655_680,      // Refinance / ICR — Hybrid 6.55% / 6.80%
  "seed_a03": FR_615,          // Acquisition / App Start — Fixed 6.15%
  "seed_a04": AR_655,          // Refinance / App Processing — Adj 6.05% ref / 6.55% proforma
  "seed_a05": AR_780,          // Acquisition / FCR (Floating) — Adj 7.05% ref / 7.80% proforma
  "seed_a06": FR_655,          // Acquisition / Pre-close — Fixed 6.55%
  "seed_a07": AR_730,          // Refinance / Docs (Floating) — Adj 6.55% ref / 7.30% proforma
  "seed_a08": FR_595,          // Acquisition / Docs Drawn — Fixed 5.95%
  "seed_a09": HY_615_640,      // Refinance / Docs Back — Hybrid 6.15% / 6.40%
  "seed_a10": FR_580,          // Refinance / Closing — Fixed 5.80%
  "seed_a11": nr("Fixed Rate"),// Acquisition / Inquiry — no pricing yet
  "seed_a12": HY_670_695,      // Refinance / App Processing — Hybrid 6.70% / 6.95%
  "seed_a13": nr("Adjustable Rate"), // Acquisition / Inquiry Canceled — no pricing
  "seed_a14": AR_800,          // Bridge / App Withdrawn (Floating) — Adj/Prime 7.375% / 8.00%
  "seed_a15": FR_640,          // Refinance / App Denied — Fixed 6.40%
  // ── Inquiry (a16–a25) — no pricing yet ───────────────────────────────────────
  "seed_a16": nr("Fixed Rate"),
  "seed_a17": nr("Fixed Rate"),
  "seed_a18": nr("Adjustable Rate"),
  "seed_a19": nr("Adjustable Rate"),
  "seed_a20": nr("Fixed Rate"),
  "seed_a21": nr("Fixed Rate"),
  "seed_a22": nr("Hybrid"),
  "seed_a23": nr("Fixed Rate"),
  "seed_a24": nr("Adjustable Rate"),
  "seed_a25": nr("Fixed Rate"),
  // ── Initial Credit Review (a26–a34) ──────────────────────────────────────────
  "seed_a26": FR_670,          // Acquisition — Fixed 6.70%
  "seed_a27": HY_655_680,      // Refinance — Hybrid 6.55% / 6.80%
  "seed_a28": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a29": AR_605,          // Acquisition — Adj 5.80% ref / 6.05% proforma
  "seed_a30": FR_580,          // Permanent — Fixed 5.80%
  "seed_a31": HY_670_695,      // Refinance (was Hybrid interestType) — Hybrid 6.70% / 6.95%
  "seed_a32": HY_615_640,      // Acquisition — Hybrid 6.15% / 6.40%
  "seed_a33": AR_780,          // Construction (Floating) — Adj 7.05% / 7.80%
  "seed_a34": AR_780,          // Bridge (Floating) — Adj 7.05% / 7.80%
  // ── Application Start (a35–a43) ───────────────────────────────────────────────
  "seed_a35": FR_640,          // Refinance — Fixed 6.40%
  "seed_a36": FR_670,          // Acquisition — Fixed 6.70%
  "seed_a37": FR_580,          // Permanent — Fixed 5.80%
  "seed_a38": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a39": HY_655_680,      // Refinance — Hybrid 6.55% / 6.80%
  "seed_a40": FR_655,          // Acquisition — Fixed 6.55%
  "seed_a41": AR_780,          // Construction (Floating) — Adj 7.05% / 7.80%
  "seed_a42": HY_615_640,      // Refinance — Hybrid 6.15% / 6.40%
  "seed_a43": HY_670_695,      // Acquisition (was Hybrid interestType) — Hybrid 6.70% / 6.95%
  // ── Application Processing (a44–a50) ─────────────────────────────────────────
  "seed_a44": AR_605,          // Refinance — Adj 5.80% ref / 6.05% proforma
  "seed_a45": FR_640,          // Acquisition — Fixed 6.40%
  "seed_a46": AR_780,          // Bridge (Floating) — Adj 7.05% / 7.80%
  "seed_a47": FR_580,          // Permanent — Fixed 5.80%
  "seed_a48": HY_615_640,      // Refinance — Hybrid 6.15% / 6.40%
  "seed_a49": FR_655,          // Acquisition — Fixed 6.55%
  "seed_a50": AR_780,          // Construction (Floating) — Adj 7.05% / 7.80%
  // ── Final Credit Review (a51–a58) ────────────────────────────────────────────
  "seed_a51": FR_615,          // Acquisition — Fixed 6.15%
  "seed_a52": FR_595,          // Refinance — Fixed 5.95%
  "seed_a53": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a54": FR_580,          // Permanent — Fixed 5.80%
  "seed_a55": HY_615_640,      // Acquisition — Hybrid 6.15% / 6.40%
  "seed_a56": HY_670_695,      // Refinance — Hybrid 6.70% / 6.95%
  "seed_a57": HY_705_755,      // Acquisition (was Hybrid interestType) — Hybrid 7.05% / 7.55%
  "seed_a58": AR_800,          // Bridge (Floating) — Adj/Prime 7.375% / 8.00%
  // ── Pre-close (a59–a65) ──────────────────────────────────────────────────────
  "seed_a59": FR_595,          // Refinance — Fixed 5.95%
  "seed_a60": FR_640,          // Acquisition — Fixed 6.40%
  "seed_a61": FR_580,          // Permanent — Fixed 5.80%
  "seed_a62": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a63": HY_655_680,      // Refinance — Hybrid 6.55% / 6.80%
  "seed_a64": FR_655,          // Acquisition — Fixed 6.55%
  "seed_a65": AR_780,          // Construction (Floating) — Adj 7.05% / 7.80%
  // ── Ready for Docs (a66–a72) ─────────────────────────────────────────────────
  "seed_a66": FR_595,          // Refinance — Fixed 5.95%
  "seed_a67": FR_655,          // Acquisition — Fixed 6.55%
  "seed_a68": FR_580,          // Permanent — Fixed 5.80%
  "seed_a69": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a70": HY_655_680,      // Refinance — Hybrid 6.55% / 6.80%
  "seed_a71": FR_670,          // Acquisition — Fixed 6.70%
  "seed_a72": HY_705_755,      // Acquisition (was Hybrid interestType) — Hybrid 7.05% / 7.55%
  // ── Docs Drawn (a73–a76) ─────────────────────────────────────────────────────
  "seed_a73": FR_580,          // Refinance — Fixed 5.80%
  "seed_a74": FR_640,          // Acquisition — Fixed 6.40%
  "seed_a75": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a76": FR_580,          // Permanent — Fixed 5.80%
  // ── Docs Back (a77–a80) ──────────────────────────────────────────────────────
  "seed_a77": FR_615,          // Refinance — Fixed 6.15%
  "seed_a78": FR_670,          // Acquisition — Fixed 6.70%
  "seed_a79": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a80": FR_580,          // Permanent — Fixed 5.80%
  // ── Closing (a81–a84) ────────────────────────────────────────────────────────
  "seed_a81": FR_595,          // Refinance — Fixed 5.95%
  "seed_a82": HY_615_640,      // Acquisition — Hybrid 6.15% / 6.40%
  "seed_a83": AR_730,          // Bridge (Floating) — Adj 6.55% / 7.30%
  "seed_a84": FR_580,          // Permanent — Fixed 5.80%
  // ── Terminal — Inquiry Canceled (a85–a89) — no pricing ───────────────────────
  "seed_a85": nr("Fixed Rate"),
  "seed_a86": nr("Fixed Rate"),
  "seed_a87": nr("Adjustable Rate"),
  "seed_a88": nr("Fixed Rate"),
  "seed_a89": nr("Fixed Rate"),
  // ── Terminal — Inquiry Withdrawn (a90–a93) — no pricing ──────────────────────
  "seed_a90": nr("Adjustable Rate"),
  "seed_a91": nr("Fixed Rate"),
  "seed_a92": nr("Adjustable Rate"),
  "seed_a93": nr("Fixed Rate"),
  // ── Terminal — Inquiry Denied (a94–a95) — has rate data ──────────────────────
  "seed_a94": FR_695,          // Acquisition denied — Fixed 6.95%
  "seed_a95": FR_695,          // Refinance denied — Fixed 6.95%
  // ── Terminal — App Withdrawn (a96–a97) ───────────────────────────────────────
  "seed_a96": FR_705,          // Acquisition withdrawn — Fixed 7.05%
  "seed_a97": AR_800,          // Bridge withdrawn (Floating) — Adj/Prime 7.375% / 8.00%
  // ── Terminal — App Canceled (a98) ────────────────────────────────────────────
  "seed_a98": AR_800,          // Construction canceled (Floating) — Adj/Prime
  // ── Terminal — App Denied (a99–a100) ─────────────────────────────────────────
  "seed_a99":  FR_695,         // Acquisition denied — Fixed 6.95%
  "seed_a100": FR_695,         // Refinance denied — Fixed 6.95%
};

// ─── Context ──────────────────────────────────────────────────────────────────

const [CoreServiceProvider, useCoreService] = createContextHook(() => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [collaborators, setCollaborators] = useState<CollaborationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.apps),
      AsyncStorage.getItem(KEYS.borrowers),
      AsyncStorage.getItem(KEYS.properties),
      AsyncStorage.getItem(KEYS.collaborators),
    ]).then(async ([apps, bors, props, collabs]) => {
      if (apps) {
        const parsed: LoanApplication[] = JSON.parse(apps);
        setApplications(parsed.map((a) => ({
          ...emptyApp(a.borrowerId, a.propertyId),
          ...a,
          status: migrateStatus(a.status),
        })));
      } else {
        const seeded = SEED_APPS.map(
          (a) => ({ ...a, ...(SEED_APP_RATES[a.id ?? ""] ?? nr()) })
        ) as LoanApplication[];
        await AsyncStorage.setItem(KEYS.apps, JSON.stringify(seeded));
        setApplications(seeded);
      }
      if (bors) {
        setBorrowers((JSON.parse(bors) as any[]).map(migrateBorrower));
      } else {
        await AsyncStorage.setItem(KEYS.borrowers, JSON.stringify(SEED_BORROWERS));
        setBorrowers(SEED_BORROWERS);
      }
      if (props) {
        setProperties((JSON.parse(props) as any[]).map(migrateProperty));
      } else {
        await AsyncStorage.setItem(KEYS.properties, JSON.stringify(SEED_PROPERTIES));
        setProperties(SEED_PROPERTIES);
      }
      if (collabs) {
        setCollaborators(JSON.parse(collabs) as CollaborationMember[]);
      }
      setLoading(false);
    });
  }, []);

  const persistApps = useCallback(async (apps: LoanApplication[]) => {
    setApplications(apps);
    await AsyncStorage.setItem(KEYS.apps, JSON.stringify(apps));
  }, []);

  const persistBorrowers = useCallback(async (bors: Borrower[]) => {
    setBorrowers(bors);
    await AsyncStorage.setItem(KEYS.borrowers, JSON.stringify(bors));
  }, []);

  const persistProperties = useCallback(async (props: Property[]) => {
    setProperties(props);
    await AsyncStorage.setItem(KEYS.properties, JSON.stringify(props));
  }, []);

  const persistCollaborators = useCallback(async (list: CollaborationMember[]) => {
    setCollaborators(list);
    await AsyncStorage.setItem(KEYS.collaborators, JSON.stringify(list));
  }, []);

  // ── Borrower CRUD ──────────────────────────────────────────────────────────

  const createBorrower = useCallback(async () => {
    const b: Borrower = { id: uid(), createdAt: now(), updatedAt: now(), ...emptyBorrower() };
    await persistBorrowers([...borrowers, b]);
    return b;
  }, [borrowers, persistBorrowers]);

  const updateBorrower = useCallback(async (id: string, patch: Partial<Borrower>) => {
    await persistBorrowers(borrowers.map((b) => b.id === id ? { ...b, ...patch, updatedAt: now() } : b));
  }, [borrowers, persistBorrowers]);

  const getBorrower = useCallback((id: string) => borrowers.find((b) => b.id === id), [borrowers]);

  // ── Property CRUD ──────────────────────────────────────────────────────────

  const createProperty = useCallback(async () => {
    const p: Property = { id: uid(), createdAt: now(), updatedAt: now(), ...emptyProperty() };
    await persistProperties([...properties, p]);
    return p;
  }, [properties, persistProperties]);

  const updateProperty = useCallback(async (id: string, patch: Partial<Property>) => {
    await persistProperties(properties.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p));
  }, [properties, persistProperties]);

  const getProperty = useCallback((id: string) => properties.find((p) => p.id === id), [properties]);

  // ── Application CRUD ───────────────────────────────────────────────────────

  const createApplication = useCallback(async (borrowerId: string, propertyId: string): Promise<LoanApplication> => {
    const app: LoanApplication = {
      id: uid(), createdAt: now(), updatedAt: now(),
      ...emptyApp(borrowerId, propertyId),
    };
    await persistApps([...applications, app]);
    return app;
  }, [applications, persistApps]);

  const updateApplication = useCallback(async (id: string, patch: Partial<LoanApplication>) => {
    await persistApps(applications.map((a) => a.id === id ? { ...a, ...patch, updatedAt: now() } : a));
  }, [applications, persistApps]);

  const deleteApplication = useCallback(async (id: string) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    await persistApps(applications.filter((a) => a.id !== id));
  }, [applications, persistApps]);

  const getApplication = useCallback((id: string) => applications.find((a) => a.id === id), [applications]);

  // ── Collaboration CRUD ─────────────────────────────────────────────────────

  const getCollaborators = useCallback(
    (applicationId: string) => collaborators.filter((c) => c.applicationId === applicationId),
    [collaborators],
  );

  const addCollaborator = useCallback(
    async (applicationId: string, data: { sid: string; firstName: string; lastName: string }) => {
      const entry: CollaborationMember = {
        id: uid(), createdAt: now(), applicationId,
        sid: data.sid.trim().toUpperCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      };
      await persistCollaborators([...collaborators, entry]);
      return entry;
    },
    [collaborators, persistCollaborators],
  );

  const removeCollaborator = useCallback(
    async (id: string) => {
      await persistCollaborators(collaborators.filter((c) => c.id !== id));
    },
    [collaborators, persistCollaborators],
  );

  // ── Pipeline stats ─────────────────────────────────────────────────────────

  const getPipelineStats = useCallback(() => {
    const byPhase = APPLICATION_STATUSES.reduce((acc, s) => {
      acc[s] = applications.filter((a) => a.status === s).length;
      return acc;
    }, {} as Record<ApplicationStatus, number>);
    const total = applications.length;
    const totalVolumeUsd = applications.reduce((sum, a) => {
      const v = parseFloat(String(a.loanAmountUsd ?? "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    return { byPhase, total, totalVolumeUsd };
  }, [applications]);

  // ── Seed / Clear ───────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistApps(SEED_APPS),
      persistBorrowers(SEED_BORROWERS),
      persistProperties(SEED_PROPERTIES),
    ]);
  }, [persistApps, persistBorrowers, persistProperties]);

  const clearData = useCallback(async () => {
    await Promise.all([
      persistApps([]),
      persistBorrowers([]),
      persistProperties([]),
    ]);
  }, [persistApps, persistBorrowers, persistProperties]);

  return {
    loading,
    applications, borrowers, properties,
    getApplication, getBorrower, getProperty,
    createApplication, updateApplication, deleteApplication,
    createBorrower, updateBorrower,
    createProperty, updateProperty,
    getPipelineStats,
    getCollaborators, addCollaborator, removeCollaborator,
    loadSeedData, clearData,
  };
});

export { CoreServiceProvider, useCoreService, SEED_APPS, SEED_APP_RATES };
