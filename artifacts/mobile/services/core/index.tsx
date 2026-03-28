import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PropertyType =
  | "Office" | "Retail" | "Industrial" | "Multifamily" | "Mixed Use"
  | "Hotel" | "Self Storage" | "Healthcare" | "Land";

export type LoanType = "Acquisition" | "Refinance" | "Construction" | "Bridge" | "Permanent";
export type InterestType = "Fixed" | "Floating" | "Hybrid";
export type AmortizationType = "Full Amortizing" | "Interest Only" | "Partial IO";

export type ApplicationStatus =
  | "Inquiry" | "Letter of Interest" | "Application Start" | "Application Processing"
  | "Final Credit Review" | "Pre-close" | "Ready for Docs" | "Docs Drawn"
  | "Docs Back" | "Closing";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Inquiry", "Letter of Interest", "Application Start", "Application Processing",
  "Final Credit Review", "Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing",
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

export type Property = {
  id: string; createdAt: string; updatedAt: string;
  streetAddress: string; city: string; state: string; zipCode: string;
  /** Latitude from Google Places geocode — stored as string for display convenience. */
  latitude: string;
  /** Longitude from Google Places geocode — stored as string for display convenience. */
  longitude: string;
  /** Google Places place_id for deep linking / map rendering. */
  googlePlaceId: string;
  propertyType: PropertyType;
  grossSqFt: string; numberOfUnits: string; yearBuilt: string;
  physicalOccupancyPct: string; economicOccupancyPct: string;
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
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  apps: "svc_core_apps_v1",
  borrowers: "svc_core_borrowers_v1",
  properties: "svc_core_properties_v1",
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
  };
}

// ─── Migration helpers ─────────────────────────────────────────────────────────

const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  Draft: "Inquiry", Submitted: "Letter of Interest",
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

/** Fills in new geolocation fields if missing from older stored records. */
function migrateProperty(raw: any): Property {
  return {
    ...emptyProperty(),
    ...raw,
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
];

const SEED_PROPERTIES: Property[] = [
  { id: "seed_p01", createdAt: d(2026,1,5), updatedAt: d(2026,2,10),
    streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107",
    latitude: "39.9526", longitude: "-75.1652", googlePlaceId: "ChIJVVVVVVVVVVMR0af4yL9QDCA",
    propertyType: "Office", grossSqFt: "124,000", numberOfUnits: "", yearBuilt: "2004",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p02", createdAt: d(2026,1,12), updatedAt: d(2026,2,15),
    streetAddress: "850 Fifth Avenue", city: "New York", state: "NY", zipCode: "10065",
    latitude: "40.7651", longitude: "-73.9713", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "36,500", numberOfUnits: "12", yearBuilt: "1998",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p03", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    streetAddress: "4400 Industrial Boulevard", city: "Atlanta", state: "GA", zipCode: "30336",
    latitude: "33.7490", longitude: "-84.3880", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "312,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "95", economicOccupancyPct: "94" },
  { id: "seed_p04", createdAt: d(2026,2,3), updatedAt: d(2026,3,8),
    streetAddress: "2800 Wilshire Boulevard", city: "Los Angeles", state: "CA", zipCode: "90057",
    latitude: "34.0584", longitude: "-118.2782", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "98,400", numberOfUnits: "120", yearBuilt: "2016",
    physicalOccupancyPct: "96", economicOccupancyPct: "93" },
  { id: "seed_p05", createdAt: d(2026,2,10), updatedAt: d(2026,3,5),
    streetAddress: "330 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60601",
    latitude: "41.8858", longitude: "-87.6245", googlePlaceId: "",
    propertyType: "Mixed Use", grossSqFt: "78,200", numberOfUnits: "48", yearBuilt: "2008",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p06", createdAt: d(2026,2,18), updatedAt: d(2026,3,12),
    streetAddress: "600 Congress Avenue", city: "Austin", state: "TX", zipCode: "78701",
    latitude: "30.2672", longitude: "-97.7431", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "55,000", numberOfUnits: "", yearBuilt: "2019",
    physicalOccupancyPct: "82", economicOccupancyPct: "80" },
  { id: "seed_p07", createdAt: d(2026,1,28), updatedAt: d(2026,3,15),
    streetAddress: "1500 Brickell Avenue", city: "Miami", state: "FL", zipCode: "33131",
    latitude: "25.7617", longitude: "-80.1918", googlePlaceId: "",
    propertyType: "Hotel", grossSqFt: "145,000", numberOfUnits: "218", yearBuilt: "2014",
    physicalOccupancyPct: "79", economicOccupancyPct: "74" },
  { id: "seed_p08", createdAt: d(2026,2,5), updatedAt: d(2026,3,10),
    streetAddress: "3200 Peachtree Road NE", city: "Atlanta", state: "GA", zipCode: "30305",
    latitude: "33.8490", longitude: "-84.3773", googlePlaceId: "",
    propertyType: "Multifamily", grossSqFt: "182,000", numberOfUnits: "224", yearBuilt: "2018",
    physicalOccupancyPct: "97", economicOccupancyPct: "95" },
  { id: "seed_p09", createdAt: d(2026,2,22), updatedAt: d(2026,3,18),
    streetAddress: "900 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60611",
    latitude: "41.8977", longitude: "-87.6243", googlePlaceId: "",
    propertyType: "Retail", grossSqFt: "44,600", numberOfUnits: "8", yearBuilt: "2001",
    physicalOccupancyPct: "100", economicOccupancyPct: "97" },
  { id: "seed_p10", createdAt: d(2026,1,15), updatedAt: d(2026,3,20),
    streetAddress: "555 California Street", city: "San Francisco", state: "CA", zipCode: "94104",
    latitude: "37.7925", longitude: "-122.4052", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "208,000", numberOfUnits: "", yearBuilt: "2007",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p11", createdAt: d(2026,3,1), updatedAt: d(2026,3,18),
    streetAddress: "7800 Airport Boulevard", city: "Houston", state: "TX", zipCode: "77061",
    latitude: "29.6454", longitude: "-95.2789", googlePlaceId: "",
    propertyType: "Industrial", grossSqFt: "425,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p12", createdAt: d(2026,3,8), updatedAt: d(2026,3,20),
    streetAddress: "2100 East Camelback Road", city: "Phoenix", state: "AZ", zipCode: "85016",
    latitude: "33.5104", longitude: "-112.0198", googlePlaceId: "",
    propertyType: "Self Storage", grossSqFt: "62,000", numberOfUnits: "480", yearBuilt: "2020",
    physicalOccupancyPct: "88", economicOccupancyPct: "86" },
];

const SEED_APPS: LoanApplication[] = [
  { id: "seed_a01", createdAt: d(2026,3,14), updatedAt: d(2026,3,14), status: "Inquiry",
    borrowerId: "seed_b08", propertyId: "seed_p01", loanType: "Acquisition",
    loanAmountUsd: "8,500,000", loanTermYears: "10", interestType: "Fixed",
    interestRatePct: "6.75", amortizationType: "Full Amortizing", ltvPct: "65",
    dscrRatio: "1.28", targetClosingDate: ds(2026,7,15) },
  { id: "seed_a02", createdAt: d(2026,2,20), updatedAt: d(2026,3,5), status: "Letter of Interest",
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
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [CoreServiceProvider, useCoreService] = createContextHook(() => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.apps),
      AsyncStorage.getItem(KEYS.borrowers),
      AsyncStorage.getItem(KEYS.properties),
    ]).then(([apps, bors, props]) => {
      if (apps) {
        const parsed: LoanApplication[] = JSON.parse(apps);
        setApplications(parsed.map((a) => ({
          ...emptyApp(a.borrowerId, a.propertyId),
          ...a,
          status: migrateStatus(a.status),
        })));
      }
      if (bors) setBorrowers((JSON.parse(bors) as any[]).map(migrateBorrower));
      if (props) setProperties((JSON.parse(props) as any[]).map(migrateProperty));
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
    loadSeedData, clearData,
  };
});

export { CoreServiceProvider, useCoreService };
