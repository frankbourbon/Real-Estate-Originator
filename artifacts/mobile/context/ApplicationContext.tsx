import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

import { SEED_APPLICATIONS, SEED_BORROWERS, SEED_PROPERTIES } from "@/utils/seedData";

// ─── Domain Enums ────────────────────────────────────────────────────────────

export type PropertyType =
  | "Office"
  | "Retail"
  | "Industrial"
  | "Multifamily"
  | "Mixed Use"
  | "Hotel"
  | "Self Storage"
  | "Healthcare"
  | "Land";

export type LoanType =
  | "Acquisition"
  | "Refinance"
  | "Construction"
  | "Bridge"
  | "Permanent";

export type InterestType = "Fixed" | "Floating" | "Hybrid";

export type AmortizationType =
  | "Full Amortizing"
  | "Interest Only"
  | "Partial IO";

/**
 * 10-stage workflow timeline. Each stage is owned by a specific persona.
 * Order matters — status progresses forward through these stages.
 */
export type ApplicationStatus =
  | "Inquiry"
  | "Letter of Interest"
  | "Application Start"
  | "Application Processing"
  | "Final Credit Review"
  | "Pre-close"
  | "Ready for Docs"
  | "Docs Drawn"
  | "Docs Back"
  | "Closing";

/** Legacy status values from v2 — migrated on load. */
const LEGACY_STATUS_MAP: Record<string, ApplicationStatus> = {
  Draft: "Inquiry",
  Submitted: "Letter of Interest",
  "Under Review": "Application Processing",
  Approved: "Final Credit Review",
  Declined: "Closing",
};

// ─── 3NF Entities ────────────────────────────────────────────────────────────

/**
 * Borrower entity — identity, contact, financial profile.
 * NOTE: creditScore may only be populated at or after "Application Start"
 * per ECOA / HMDA regulations (pulling it earlier triggers HMDA reporting).
 */
export type Borrower = {
  id: string;
  createdAt: string;
  updatedAt: string;

  firstName: string;
  lastName: string;
  entityName: string;

  email: string;
  phone: string;

  creExperienceYears: string;
  netWorthUsd: string;
  liquidityUsd: string;
  creditScore: string; // ECOA: do NOT pull before "Application Start"
};

/**
 * Property entity — location, physical attributes, occupancy.
 * physicalOccupancyPct = % of units occupied (unit-based).
 * economicOccupancyPct = % of potential gross income collected (rent-based).
 */
export type Property = {
  id: string;
  createdAt: string;
  updatedAt: string;

  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;

  propertyType: PropertyType;
  grossSqFt: string;
  numberOfUnits: string;
  yearBuilt: string;

  physicalOccupancyPct: string;
  economicOccupancyPct: string;
};

export type Attachment = {
  id: string;
  applicationId: string;
  name: string;
  uri: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
};

export type Comment = {
  id: string;
  applicationId: string;
  parentCommentId: string | null;
  text: string;
  author: string;
  createdAt: string;
};

/**
 * LOAApplication — the origination record.
 * Contains loan terms + phase-specific workflow data collected at each stage.
 * All borrower / property data lives in their own normalized entities.
 */
export type LOAApplication = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;

  borrowerId: string;
  propertyId: string;

  // ── Core Loan Terms ────────────────────────────────────────────────────────
  loanType: LoanType;
  loanAmountUsd: string;
  loanTermYears: string;
  interestType: InterestType;
  interestRatePct: string;
  amortizationType: AmortizationType;
  ltvPct: string;
  dscrRatio: string;
  targetClosingDate: string;

  // ── Inquiry Phase (Sales) ─────────────────────────────────────────────────
  inquiryNotes: string;

  // ── Letter of Interest Phase (Credit Risk) ────────────────────────────────
  creditBoxNotes: string;
  loiRecommended: boolean;
  loiIssuedDate: string;
  loiExpirationDate: string;

  // ── Application Start Phase (Sales) ───────────────────────────────────────
  applicationDepositAmountUsd: string;
  applicationDepositDate: string;
  signedLoiDate: string;
  debitAuthorizationDate: string;
  rateLockEnabled: boolean;
  rateLockRatePct: string;
  rateLockExpirationDate: string;

  // ── Application Processing Phase (Processing / Sales) ────────────────────
  appraisalOrderedDate: string;
  appraisalCompletedDate: string;
  appraisalValueUsd: string;
  environmentalStatus: string; // "Ordered" | "In Progress" | "Clear" | "Issues Found"
  borrowerFormsStatus: string; // "Not Started" | "Packaged" | "Sent" | "Received"

  // ── Final Credit Review Phase (Credit Risk) ───────────────────────────────
  commitmentLetterRecommended: boolean;
  commitmentLetterIssuedDate: string;
  conditionalApprovals: string;  // newline-separated list
  creditRiskExceptions: string;  // newline-separated list

  // ── Pre-close Phase (Processing) ─────────────────────────────────────────
  hmdaComplete: boolean;
  hmdaNotes: string;

  // ── Ready for Docs Phase (Closing) ────────────────────────────────────────
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceEffectiveDate: string;
  titleCompany: string;
  escrowCompany: string;
  floodZoneDesignation: string;
  titleReportDate: string;

  // ── Docs Drawn Phase (Closing) ────────────────────────────────────────────
  docsDrawnDate: string;
  settlementFeesUsd: string;
  settlementStatementDate: string;

  // ── Docs Back Phase (Closing) ─────────────────────────────────────────────
  docsBackDate: string;
  titleConfirmationDate: string;

  // ── Closing Phase (Closing) ───────────────────────────────────────────────
  wireAmountUsd: string;
  wireBankName: string;
  wireAbaNumber: string;
  wireAccountNumber: string;
  servicingLoanNumber: string;
  bookingDate: string;

  // ── Related collections ───────────────────────────────────────────────────
  comments: Comment[];
  attachments: Attachment[];
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  applications: "loan_applications_v3",
  borrowers: "loan_borrowers_v3",
  properties: "loan_properties_v3",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function now(): string {
  return new Date().toISOString();
}

function emptyBorrower(): Omit<Borrower, "id" | "createdAt" | "updatedAt"> {
  return {
    firstName: "", lastName: "", entityName: "",
    email: "", phone: "",
    creExperienceYears: "", netWorthUsd: "", liquidityUsd: "", creditScore: "",
  };
}

function emptyProperty(): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  return {
    streetAddress: "", city: "", state: "", zipCode: "",
    propertyType: "Office",
    grossSqFt: "", numberOfUnits: "", yearBuilt: "",
    physicalOccupancyPct: "", economicOccupancyPct: "",
  };
}

function emptyApplication(
  borrowerId: string,
  propertyId: string
): Omit<LOAApplication, "id" | "createdAt" | "updatedAt"> {
  return {
    status: "Inquiry",
    borrowerId,
    propertyId,

    loanType: "Acquisition",
    loanAmountUsd: "", loanTermYears: "",
    interestType: "Fixed", interestRatePct: "",
    amortizationType: "Full Amortizing",
    ltvPct: "", dscrRatio: "", targetClosingDate: "",

    inquiryNotes: "",

    creditBoxNotes: "", loiRecommended: false,
    loiIssuedDate: "", loiExpirationDate: "",

    applicationDepositAmountUsd: "", applicationDepositDate: "",
    signedLoiDate: "", debitAuthorizationDate: "",
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",

    appraisalOrderedDate: "", appraisalCompletedDate: "",
    appraisalValueUsd: "", environmentalStatus: "", borrowerFormsStatus: "",

    commitmentLetterRecommended: false, commitmentLetterIssuedDate: "",
    conditionalApprovals: "", creditRiskExceptions: "",

    hmdaComplete: false, hmdaNotes: "",

    insuranceCarrier: "", insurancePolicyNumber: "", insuranceEffectiveDate: "",
    titleCompany: "", escrowCompany: "",
    floodZoneDesignation: "", titleReportDate: "",

    docsDrawnDate: "", settlementFeesUsd: "", settlementStatementDate: "",

    docsBackDate: "", titleConfirmationDate: "",

    wireAmountUsd: "", wireBankName: "", wireAbaNumber: "", wireAccountNumber: "",
    servicingLoanNumber: "", bookingDate: "",

    comments: [],
    attachments: [],
  };
}

/** Migrate legacy status values to the new workflow stages. */
function migrateStatus(status: string): ApplicationStatus {
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status];
  return status as ApplicationStatus;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const [ApplicationProvider, useApplications] = createContextHook(() => {
  const [applications, setApplications] = useState<LOAApplication[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.applications),
      AsyncStorage.getItem(KEYS.borrowers),
      AsyncStorage.getItem(KEYS.properties),
    ]).then(([apps, bors, props]) => {
      if (apps) {
        const parsed: LOAApplication[] = JSON.parse(apps);
        setApplications(parsed.map((a) => ({
          ...emptyApplication(a.borrowerId, a.propertyId),
          ...a,
          status: migrateStatus(a.status),
        })));
      }
      if (bors) setBorrowers(JSON.parse(bors));
      if (props) setProperties(JSON.parse(props));
      setLoading(false);
    });
  }, []);

  const persistApps = useCallback(async (apps: LOAApplication[]) => {
    setApplications(apps);
    await AsyncStorage.setItem(KEYS.applications, JSON.stringify(apps));
  }, []);

  const persistBorrowers = useCallback(async (bors: Borrower[]) => {
    setBorrowers(bors);
    await AsyncStorage.setItem(KEYS.borrowers, JSON.stringify(bors));
  }, []);

  const persistProperties = useCallback(async (props: Property[]) => {
    setProperties(props);
    await AsyncStorage.setItem(KEYS.properties, JSON.stringify(props));
  }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const createApplication = useCallback(async (): Promise<{
    application: LOAApplication;
    borrower: Borrower;
    property: Property;
  }> => {
    const t = now();
    const borrower: Borrower = { id: uid(), createdAt: t, updatedAt: t, ...emptyBorrower() };
    const property: Property = { id: uid(), createdAt: t, updatedAt: t, ...emptyProperty() };
    const application: LOAApplication = {
      id: uid(), createdAt: t, updatedAt: t,
      ...emptyApplication(borrower.id, property.id),
    };
    await Promise.all([
      persistBorrowers([borrower, ...borrowers]),
      persistProperties([property, ...properties]),
      persistApps([application, ...applications]),
    ]);
    return { application, borrower, property };
  }, [applications, borrowers, properties, persistApps, persistBorrowers, persistProperties]);

  const updateApplication = useCallback(
    async (id: string, updates: Partial<LOAApplication>) => {
      const updated = applications.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: now() } : a
      );
      await persistApps(updated);
    },
    [applications, persistApps]
  );

  const updateBorrower = useCallback(
    async (id: string, updates: Partial<Borrower>) => {
      const updated = borrowers.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: now() } : b
      );
      await persistBorrowers(updated);
    },
    [borrowers, persistBorrowers]
  );

  const updateProperty = useCallback(
    async (id: string, updates: Partial<Property>) => {
      const updated = properties.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: now() } : p
      );
      await persistProperties(updated);
    },
    [properties, persistProperties]
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      const app = applications.find((a) => a.id === id);
      if (!app) return;
      await Promise.all([
        persistApps(applications.filter((a) => a.id !== id)),
        persistBorrowers(borrowers.filter((b) => b.id !== app.borrowerId)),
        persistProperties(properties.filter((p) => p.id !== app.propertyId)),
      ]);
    },
    [applications, borrowers, properties, persistApps, persistBorrowers, persistProperties]
  );

  // ── Comments ─────────────────────────────────────────────────────────────

  const addComment = useCallback(
    async (applicationId: string, text: string, parentCommentId: string | null = null) => {
      const comment: Comment = {
        id: uid(), applicationId, parentCommentId,
        text, author: "You", createdAt: now(),
      };
      const updated = applications.map((a) =>
        a.id === applicationId
          ? { ...a, comments: [...a.comments, comment], updatedAt: now() }
          : a
      );
      await persistApps(updated);
    },
    [applications, persistApps]
  );

  // ── Attachments ──────────────────────────────────────────────────────────

  const addAttachment = useCallback(
    async (applicationId: string, attachment: Omit<Attachment, "id" | "applicationId" | "uploadedAt" | "uploadedBy">) => {
      const full: Attachment = {
        id: uid(), applicationId,
        uploadedAt: now(), uploadedBy: "You",
        ...attachment,
      };
      const updated = applications.map((a) =>
        a.id === applicationId
          ? { ...a, attachments: [...a.attachments, full], updatedAt: now() }
          : a
      );
      await persistApps(updated);
    },
    [applications, persistApps]
  );

  // ── Seed / Reset ─────────────────────────────────────────────────────────

  const loadSampleData = useCallback(async () => {
    await Promise.all([
      persistBorrowers([...SEED_BORROWERS, ...borrowers.filter(b => !b.id.startsWith("seed_"))]),
      persistProperties([...SEED_PROPERTIES, ...properties.filter(p => !p.id.startsWith("seed_"))]),
      persistApps([...SEED_APPLICATIONS, ...applications.filter(a => !a.id.startsWith("seed_"))]),
    ]);
  }, [applications, borrowers, properties, persistApps, persistBorrowers, persistProperties]);

  const clearAllData = useCallback(async () => {
    const filteredApps = applications.filter((a) => !a.id.startsWith("seed_"));
    const seedApps = applications.filter((a) => a.id.startsWith("seed_"));
    const seedBorrowerIds = new Set(seedApps.map((a) => a.borrowerId));
    const seedPropertyIds = new Set(seedApps.map((a) => a.propertyId));
    const filteredBorrowers = borrowers.filter((b) => !seedBorrowerIds.has(b.id));
    const filteredProperties = properties.filter((p) => !seedPropertyIds.has(p.id));
    await Promise.all([
      persistApps(filteredApps),
      persistBorrowers(filteredBorrowers),
      persistProperties(filteredProperties),
    ]);
  }, [applications, borrowers, properties, persistApps, persistBorrowers, persistProperties]);

  const deleteAttachment = useCallback(
    async (applicationId: string, attachmentId: string) => {
      const updated = applications.map((a) =>
        a.id === applicationId
          ? { ...a, attachments: a.attachments.filter((at) => at.id !== attachmentId), updatedAt: now() }
          : a
      );
      await persistApps(updated);
    },
    [applications, persistApps]
  );

  // ── Lookups ──────────────────────────────────────────────────────────────

  const getApplication = useCallback(
    (id: string) => applications.find((a) => a.id === id),
    [applications]
  );
  const getBorrower = useCallback(
    (id: string) => borrowers.find((b) => b.id === id),
    [borrowers]
  );
  const getProperty = useCallback(
    (id: string) => properties.find((p) => p.id === id),
    [properties]
  );

  // ── Pipeline Stats ────────────────────────────────────────────────────────

  const stats = {
    total: applications.length,
    totalVolumeUsd: applications
      .filter((a) => a.loanAmountUsd)
      .reduce((sum, a) => sum + parseFloat(a.loanAmountUsd.replace(/[^0-9.]/g, "") || "0"), 0),
    byPhase: Object.fromEntries(
      [
        "Inquiry", "Letter of Interest", "Application Start", "Application Processing",
        "Final Credit Review", "Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing",
      ].map((s) => [s, applications.filter((a) => a.status === s).length])
    ) as Record<ApplicationStatus, number>,
  };

  return {
    applications, borrowers, properties, loading, stats,
    createApplication, updateApplication, updateBorrower, updateProperty, deleteApplication,
    addComment, addAttachment, deleteAttachment,
    getApplication, getBorrower, getProperty,
    loadSampleData, clearAllData,
  };
});

export { ApplicationProvider, useApplications };
