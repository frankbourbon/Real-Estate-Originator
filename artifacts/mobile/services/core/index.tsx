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

export type Borrower = {
  id: string; createdAt: string; updatedAt: string;
  firstName: string; lastName: string; entityName: string;
  email: string; phone: string;
  creExperienceYears: string; netWorthUsd: string; liquidityUsd: string;
  creditScore: string;
};

export type Property = {
  id: string; createdAt: string; updatedAt: string;
  streetAddress: string; city: string; state: string; zipCode: string;
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
  return { firstName: "", lastName: "", entityName: "", email: "", phone: "",
    creExperienceYears: "", netWorthUsd: "", liquidityUsd: "", creditScore: "" };
}

function emptyProperty(): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  return { streetAddress: "", city: "", state: "", zipCode: "",
    propertyType: "Office", grossSqFt: "", numberOfUnits: "", yearBuilt: "",
    physicalOccupancyPct: "", economicOccupancyPct: "" };
}

function emptyApp(borrowerId: string, propertyId: string): Omit<LoanApplication, "id" | "createdAt" | "updatedAt"> {
  return { status: "Inquiry", borrowerId, propertyId,
    loanType: "Acquisition", loanAmountUsd: "", loanTermYears: "",
    interestType: "Fixed", interestRatePct: "", amortizationType: "Full Amortizing",
    ltvPct: "", dscrRatio: "", targetClosingDate: "" };
}

const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  Draft: "Inquiry", Submitted: "Letter of Interest",
  "Under Review": "Application Processing", Approved: "Final Credit Review", Declined: "Closing",
};

function migrateStatus(s: string): ApplicationStatus {
  return (LEGACY_STATUS[s] ?? s) as ApplicationStatus;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_BORROWERS: Borrower[] = [
  { id: "seed_b01", createdAt: d(2026,1,5), updatedAt: d(2026,2,10),
    firstName: "James", lastName: "Hartley", entityName: "Hartley Capital Partners LLC",
    email: "j.hartley@hartleycap.com", phone: "(212) 555-0181",
    creExperienceYears: "18", netWorthUsd: "24,500,000", liquidityUsd: "4,200,000", creditScore: "748" },
  { id: "seed_b02", createdAt: d(2026,1,12), updatedAt: d(2026,2,15),
    firstName: "Maria", lastName: "Santos", entityName: "Santos Real Estate Group Inc",
    email: "msantos@sreg.com", phone: "(213) 555-0247",
    creExperienceYears: "14", netWorthUsd: "18,000,000", liquidityUsd: "2,800,000", creditScore: "761" },
  { id: "seed_b03", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    firstName: "David", lastName: "Chen", entityName: "Chen Properties LLC",
    email: "dchen@chenproperties.com", phone: "(415) 555-0312",
    creExperienceYears: "22", netWorthUsd: "41,000,000", liquidityUsd: "7,500,000", creditScore: "782" },
  { id: "seed_b04", createdAt: d(2026,2,3), updatedAt: d(2026,3,8),
    firstName: "Rachel", lastName: "Kim", entityName: "Meridian Investments Group",
    email: "rkim@meridian-inv.com", phone: "(312) 555-0499",
    creExperienceYears: "11", netWorthUsd: "12,750,000", liquidityUsd: "1,900,000", creditScore: "733" },
  { id: "seed_b05", createdAt: d(2026,2,10), updatedAt: d(2026,3,5),
    firstName: "Thomas", lastName: "Brooks", entityName: "Brooks & Associates CRE",
    email: "tbrooks@brooksassoc.com", phone: "(713) 555-0560",
    creExperienceYears: "9", netWorthUsd: "8,200,000", liquidityUsd: "1,100,000", creditScore: "719" },
  { id: "seed_b06", createdAt: d(2026,2,18), updatedAt: d(2026,3,12),
    firstName: "Sarah", lastName: "Mitchell", entityName: "Mitchell Commercial Real Estate LLC",
    email: "smitchell@mitchellcre.com", phone: "(305) 555-0623",
    creExperienceYears: "16", netWorthUsd: "31,000,000", liquidityUsd: "5,400,000", creditScore: "769" },
  { id: "seed_b07", createdAt: d(2026,1,28), updatedAt: d(2026,3,15),
    firstName: "Robert", lastName: "Nguyen", entityName: "Pacific Coast Holdings Corp",
    email: "rnguyen@paccoasthold.com", phone: "(949) 555-0778",
    creExperienceYears: "20", netWorthUsd: "55,000,000", liquidityUsd: "9,100,000", creditScore: "795" },
  { id: "seed_b08", createdAt: d(2026,3,2), updatedAt: d(2026,3,20),
    firstName: "Evelyn", lastName: "Carter", entityName: "Carter Development Corporation",
    email: "ecarter@carterdevelopment.com", phone: "(512) 555-0834",
    creExperienceYears: "7", netWorthUsd: "6,500,000", liquidityUsd: "900,000", creditScore: "" },
];

const SEED_PROPERTIES: Property[] = [
  { id: "seed_p01", createdAt: d(2026,1,5), updatedAt: d(2026,2,10),
    streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107",
    propertyType: "Office", grossSqFt: "124,000", numberOfUnits: "", yearBuilt: "2004",
    physicalOccupancyPct: "88", economicOccupancyPct: "85" },
  { id: "seed_p02", createdAt: d(2026,1,12), updatedAt: d(2026,2,15),
    streetAddress: "850 Fifth Avenue", city: "New York", state: "NY", zipCode: "10065",
    propertyType: "Retail", grossSqFt: "36,500", numberOfUnits: "12", yearBuilt: "1998",
    physicalOccupancyPct: "92", economicOccupancyPct: "89" },
  { id: "seed_p03", createdAt: d(2026,1,20), updatedAt: d(2026,3,1),
    streetAddress: "4400 Industrial Boulevard", city: "Atlanta", state: "GA", zipCode: "30336",
    propertyType: "Industrial", grossSqFt: "312,000", numberOfUnits: "", yearBuilt: "2011",
    physicalOccupancyPct: "95", economicOccupancyPct: "94" },
  { id: "seed_p04", createdAt: d(2026,2,3), updatedAt: d(2026,3,8),
    streetAddress: "2800 Wilshire Boulevard", city: "Los Angeles", state: "CA", zipCode: "90057",
    propertyType: "Multifamily", grossSqFt: "98,400", numberOfUnits: "120", yearBuilt: "2016",
    physicalOccupancyPct: "96", economicOccupancyPct: "93" },
  { id: "seed_p05", createdAt: d(2026,2,10), updatedAt: d(2026,3,5),
    streetAddress: "330 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60601",
    propertyType: "Mixed Use", grossSqFt: "78,200", numberOfUnits: "48", yearBuilt: "2008",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
  { id: "seed_p06", createdAt: d(2026,2,18), updatedAt: d(2026,3,12),
    streetAddress: "600 Congress Avenue", city: "Austin", state: "TX", zipCode: "78701",
    propertyType: "Office", grossSqFt: "55,000", numberOfUnits: "", yearBuilt: "2019",
    physicalOccupancyPct: "82", economicOccupancyPct: "80" },
  { id: "seed_p07", createdAt: d(2026,1,28), updatedAt: d(2026,3,15),
    streetAddress: "1500 Brickell Avenue", city: "Miami", state: "FL", zipCode: "33131",
    propertyType: "Hotel", grossSqFt: "145,000", numberOfUnits: "218", yearBuilt: "2014",
    physicalOccupancyPct: "79", economicOccupancyPct: "74" },
  { id: "seed_p08", createdAt: d(2026,2,5), updatedAt: d(2026,3,10),
    streetAddress: "3200 Peachtree Road NE", city: "Atlanta", state: "GA", zipCode: "30305",
    propertyType: "Multifamily", grossSqFt: "182,000", numberOfUnits: "224", yearBuilt: "2018",
    physicalOccupancyPct: "97", economicOccupancyPct: "95" },
  { id: "seed_p09", createdAt: d(2026,2,22), updatedAt: d(2026,3,18),
    streetAddress: "900 North Michigan Avenue", city: "Chicago", state: "IL", zipCode: "60611",
    propertyType: "Retail", grossSqFt: "44,600", numberOfUnits: "8", yearBuilt: "2001",
    physicalOccupancyPct: "100", economicOccupancyPct: "97" },
  { id: "seed_p10", createdAt: d(2026,1,15), updatedAt: d(2026,3,20),
    streetAddress: "555 California Street", city: "San Francisco", state: "CA", zipCode: "94104",
    propertyType: "Office", grossSqFt: "208,000", numberOfUnits: "", yearBuilt: "2007",
    physicalOccupancyPct: "86", economicOccupancyPct: "83" },
  { id: "seed_p11", createdAt: d(2026,3,1), updatedAt: d(2026,3,18),
    streetAddress: "7800 Airport Boulevard", city: "Houston", state: "TX", zipCode: "77061",
    propertyType: "Industrial", grossSqFt: "425,000", numberOfUnits: "", yearBuilt: "2015",
    physicalOccupancyPct: "100", economicOccupancyPct: "100" },
  { id: "seed_p12", createdAt: d(2026,3,8), updatedAt: d(2026,3,20),
    streetAddress: "2100 East Camelback Road", city: "Phoenix", state: "AZ", zipCode: "85016",
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
      if (bors) setBorrowers(JSON.parse(bors));
      if (props) setProperties(JSON.parse(props));
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
