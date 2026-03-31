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
  apps: "svc_core_apps_v6",
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
  { id: "seed_b01", createdAt: d(2026,3,14), updatedAt: d(2026,3,14),
    firstName: "Evelyn", lastName: "Carter", entityName: "Carter Development Corporation",
    emails: [{ label: "Work", value: "e.carter@carterdevelopment.com" }],
    phones: [{ label: "Office", value: "(215) 555-0142" }],
    mailingAddresses: [{ label: "Office", street: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107" }],
    creExperienceYears: "22", netWorthUsd: "18,500,000", liquidityUsd: "3,200,000", creditScore: "762" },
];

const SEED_PROPERTIES: Property[] = [
  { id: "seed_p01", createdAt: d(2026,3,14), updatedAt: d(2026,3,14),
    legalAddress: "1200 Market Street, Philadelphia, PA 19107",
    locations: [{ id: "seed_p01_loc1", label: "Main", streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107", latitude: "39.9526", longitude: "-75.1652", googlePlaceId: "" }],
    streetAddress: "1200 Market Street", city: "Philadelphia", state: "PA", zipCode: "19107",
    latitude: "39.9526", longitude: "-75.1652", googlePlaceId: "",
    propertyType: "Office", grossSqFt: "42,000", numberOfUnits: "", yearBuilt: "2008",
    physicalOccupancyPct: "91", economicOccupancyPct: "88" },
];

// ─── Seed data — 1 sample loan ────────────────────────────────────────────────

export const SEED_APPS: LoanApplication[] = [
  { id: "seed_a01", createdAt: d(2026,3,14), updatedAt: d(2026,3,14),
    status: "Inquiry",
    borrowerId: "seed_b01", propertyId: "seed_p01",
    loanType: "Acquisition", loanAmountUsd: "8,500,000", loanTermYears: "10",
    interestType: "Fixed", interestRatePct: "6.75", amortizationType: "Full Amortizing",
    ltvPct: "65", dscrRatio: "1.28", targetClosingDate: ds(2026,7,15),
    rateType: "Fixed Rate", baseRate: "0",
    fixedRateVariance: "0.250000", indexName: "10Y Treasury", indexRate: "4.450000",
    spreadOnFixed: "2.000000", allInFixedRate: "6.700000",
    adjustableRateVariance: "", adjustableIndexName: "", adjustableIndexRate: "",
    spreadOnAdjustable: "", proformaAdjustableAllInRate: "" },
];


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
        await AsyncStorage.setItem(KEYS.apps, JSON.stringify(SEED_APPS));
        setApplications(SEED_APPS);
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

export { CoreServiceProvider, useCoreService };
