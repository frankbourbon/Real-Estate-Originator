import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

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

export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Declined";

// ─── 3NF Entities ────────────────────────────────────────────────────────────

/**
 * Borrower entity — owns identity, contact, and financial profile.
 * Linked to LOAApplication by borrowerId (foreign key).
 */
export type Borrower = {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity
  firstName: string;
  lastName: string;
  entityName: string;       // e.g. "ABC Holdings LLC"

  // Contact
  email: string;
  phone: string;

  // Financial profile (all monetary values in USD)
  creExperienceYears: string;   // years of CRE experience
  netWorthUsd: string;          // net worth in USD
  liquidityUsd: string;         // liquid assets in USD
  creditScore: string;          // FICO credit score
};

/**
 * Property entity — owns location, physical, and occupancy attributes.
 * Linked to LOAApplication by propertyId (foreign key).
 *
 * Occupancy notes:
 *   physicalOccupancyPct = % of rentable units currently occupied (unit-based).
 *   economicOccupancyPct = % of potential gross income actually collected (rent-based).
 */
export type Property = {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Location (atomic — no partial-key dependencies)
  streetAddress: string;
  city: string;
  state: string;           // 2-letter abbreviation
  zipCode: string;

  // Physical attributes
  propertyType: PropertyType;
  grossSqFt: string;            // rentable square footage
  numberOfUnits: string;        // rentable units (0 for non-multifamily)
  yearBuilt: string;            // 4-digit year

  // Occupancy (two distinct measures)
  physicalOccupancyPct: string; // unit-based occupancy, e.g. "94.5"
  economicOccupancyPct: string; // economic/rent-based occupancy, e.g. "91.0"
};

/**
 * Attachment — a document file linked to an application.
 * Stores metadata only; the actual file remains at its local URI.
 */
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

/**
 * Comment — a threaded comment on an application.
 * parentCommentId = null → top-level thread root.
 * parentCommentId = some id → reply within that thread.
 */
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
 * Holds ONLY loan-term data and references to the Borrower and Property
 * by their IDs. All other data lives in the respective entity.
 *
 * This satisfies 3NF:
 *   - Every non-key attribute depends on the primary key (id) only.
 *   - No transitive dependencies (borrower/property data is NOT duplicated here).
 */
export type LOAApplication = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;

  // Foreign keys
  borrowerId: string;
  propertyId: string;

  // Loan Terms (functionally dependent only on this application's id)
  loanType: LoanType;
  loanAmountUsd: string;         // principal in USD
  loanTermYears: string;         // loan term in whole years
  interestType: InterestType;
  interestRatePct: string;       // annual interest rate, e.g. "6.50"
  amortizationType: AmortizationType;
  ltvPct: string;                // loan-to-value ratio, e.g. "65.0"
  dscrRatio: string;             // debt service coverage ratio, e.g. "1.25"
  targetClosingDate: string;     // MM/DD/YYYY

  // Related collections (owned by application, no independent existence)
  comments: Comment[];
  attachments: Attachment[];
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  applications: "loa_applications_v2",
  borrowers: "loa_borrowers_v2",
  properties: "loa_properties_v2",
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
    firstName: "",
    lastName: "",
    entityName: "",
    email: "",
    phone: "",
    creExperienceYears: "",
    netWorthUsd: "",
    liquidityUsd: "",
    creditScore: "",
  };
}

function emptyProperty(): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  return {
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "Office",
    grossSqFt: "",
    numberOfUnits: "",
    yearBuilt: "",
    physicalOccupancyPct: "",
    economicOccupancyPct: "",
  };
}

function emptyApplication(
  borrowerId: string,
  propertyId: string
): Omit<LOAApplication, "id" | "createdAt" | "updatedAt"> {
  return {
    status: "Draft",
    borrowerId,
    propertyId,
    loanType: "Acquisition",
    loanAmountUsd: "",
    loanTermYears: "",
    interestType: "Fixed",
    interestRatePct: "",
    amortizationType: "Full Amortizing",
    ltvPct: "",
    dscrRatio: "",
    targetClosingDate: "",
    comments: [],
    attachments: [],
  };
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
      if (apps) setApplications(JSON.parse(apps));
      if (bors) setBorrowers(JSON.parse(bors));
      if (props) setProperties(JSON.parse(props));
      setLoading(false);
    });
  }, []);

  // ── Persistence helpers ──────────────────────────────────────────────────

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

  // ── Application CRUD ────────────────────────────────────────────────────

  const createApplication = useCallback(async (): Promise<{
    application: LOAApplication;
    borrower: Borrower;
    property: Property;
  }> => {
    const t = now();
    const borrower: Borrower = { id: uid(), createdAt: t, updatedAt: t, ...emptyBorrower() };
    const property: Property = { id: uid(), createdAt: t, updatedAt: t, ...emptyProperty() };
    const application: LOAApplication = {
      id: uid(),
      createdAt: t,
      updatedAt: t,
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
        id: uid(),
        applicationId,
        parentCommentId,
        text,
        author: "You",
        createdAt: now(),
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
        id: uid(),
        applicationId,
        uploadedAt: now(),
        uploadedBy: "You",
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

  const deleteAttachment = useCallback(
    async (applicationId: string, attachmentId: string) => {
      const updated = applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              attachments: a.attachments.filter((at) => at.id !== attachmentId),
              updatedAt: now(),
            }
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

  // ── Pipeline Stats ───────────────────────────────────────────────────────

  const stats = {
    total: applications.length,
    draft: applications.filter((a) => a.status === "Draft").length,
    submitted: applications.filter((a) => a.status === "Submitted").length,
    underReview: applications.filter((a) => a.status === "Under Review").length,
    approved: applications.filter((a) => a.status === "Approved").length,
    declined: applications.filter((a) => a.status === "Declined").length,
    totalVolumeUsd: applications
      .filter((a) => a.loanAmountUsd)
      .reduce((sum, a) => sum + parseFloat(a.loanAmountUsd.replace(/[^0-9.]/g, "") || "0"), 0),
  };

  return {
    applications,
    borrowers,
    properties,
    loading,
    stats,
    createApplication,
    updateApplication,
    updateBorrower,
    updateProperty,
    deleteApplication,
    addComment,
    addAttachment,
    deleteAttachment,
    getApplication,
    getBorrower,
    getProperty,
  };
});

export { ApplicationProvider, useApplications };
