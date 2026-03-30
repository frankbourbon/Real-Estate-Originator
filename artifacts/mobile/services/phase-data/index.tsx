import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

import type {
  ApplicationStatus,
  AmortizationType,
  ContactMethod,
  InterestType,
  LoanType,
  MailingAddress,
  PropertyLocation,
  PropertyType,
} from "@/services/core";

// ─── Phase key — one per phase microservice ───────────────────────────────────

export type PhaseKey =
  | "inquiry"
  | "initial-review"
  | "application"
  | "final-review"
  | "closing";

/** Maps any application status to the phase MS that owns its Core4 data. */
export function statusToPhase(status: ApplicationStatus): PhaseKey {
  switch (status) {
    case "Inquiry":
    case "Inquiry Canceled":
    case "Inquiry Withdrawn":
      return "inquiry";

    case "Initial Credit Review":
    case "Inquiry Denied":
      return "initial-review";

    case "Application Start":
    case "Application Processing":
    case "Application Withdrawn":
    case "Application Canceled":
      return "application";

    case "Final Credit Review":
    case "Application Denied":
      return "final-review";

    default:
      return "closing";
  }
}

// ─── Snapshot types — one record per (applicationId × phase) ─────────────────

export type BorrowerSnapshot = {
  applicationId: string;
  phase: PhaseKey;
  firstName: string;
  lastName: string;
  entityName: string;
  emails: ContactMethod[];
  phones: ContactMethod[];
  mailingAddresses: MailingAddress[];
  creExperienceYears: string;
  netWorthUsd: string;
  liquidityUsd: string;
  creditScore: string;
};

export type PropertySnapshot = {
  applicationId: string;
  phase: PhaseKey;
  legalAddress: string;
  locations: PropertyLocation[];
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  googlePlaceId: string;
  propertyType: PropertyType;
  grossSqFt: string;
  numberOfUnits: string;
  yearBuilt: string;
  physicalOccupancyPct: string;
  economicOccupancyPct: string;
};

export type LoanTermsSnapshot = {
  applicationId: string;
  phase: PhaseKey;
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

// ─── Fallback shapes (passed in from calling code so service stays isolated) ──

export type BorrowerFallback  = Omit<BorrowerSnapshot,  "applicationId" | "phase">;
export type PropertyFallback  = Omit<PropertySnapshot,  "applicationId" | "phase">;
export type LoanTermsFallback = Omit<LoanTermsSnapshot, "applicationId" | "phase">;

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  borrowers:  "svc_phase_borrowers_v1",
  properties: "svc_phase_properties_v1",
  loanTerms:  "svc_phase_loan_terms_v1",
};

function snapId(applicationId: string, phase: PhaseKey): string {
  return `${applicationId}::${phase}`;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const [PhaseDataServiceProvider, usePhaseDataService] = createContextHook(() => {
  const [borrowerSnaps,  setBorrowerSnaps]  = useState<BorrowerSnapshot[]>([]);
  const [propertySnaps,  setPropertySnaps]  = useState<PropertySnapshot[]>([]);
  const [loanTermsSnaps, setLoanTermsSnaps] = useState<LoanTermsSnapshot[]>([]);

  // ── Load from storage ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [bRaw, pRaw, ltRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.borrowers),
        AsyncStorage.getItem(KEYS.properties),
        AsyncStorage.getItem(KEYS.loanTerms),
      ]);
      if (bRaw)  setBorrowerSnaps(JSON.parse(bRaw));
      if (pRaw)  setPropertySnaps(JSON.parse(pRaw));
      if (ltRaw) setLoanTermsSnaps(JSON.parse(ltRaw));
    })();
  }, []);

  // ── Persist helpers ────────────────────────────────────────────────────────
  const persistBorrowers = useCallback(async (snaps: BorrowerSnapshot[]) => {
    setBorrowerSnaps(snaps);
    await AsyncStorage.setItem(KEYS.borrowers, JSON.stringify(snaps));
  }, []);

  const persistProperties = useCallback(async (snaps: PropertySnapshot[]) => {
    setPropertySnaps(snaps);
    await AsyncStorage.setItem(KEYS.properties, JSON.stringify(snaps));
  }, []);

  const persistLoanTerms = useCallback(async (snaps: LoanTermsSnapshot[]) => {
    setLoanTermsSnaps(snaps);
    await AsyncStorage.setItem(KEYS.loanTerms, JSON.stringify(snaps));
  }, []);

  // ── Borrower ──────────────────────────────────────────────────────────────
  const getBorrowerSnapshot = useCallback(
    (applicationId: string, phase: PhaseKey): BorrowerSnapshot | undefined =>
      borrowerSnaps.find(s => snapId(s.applicationId, s.phase) === snapId(applicationId, phase)),
    [borrowerSnaps],
  );

  const saveBorrowerSnapshot = useCallback(
    async (applicationId: string, phase: PhaseKey, data: BorrowerFallback) => {
      const id = snapId(applicationId, phase);
      const next = borrowerSnaps.filter(s => snapId(s.applicationId, s.phase) !== id);
      next.push({ ...data, applicationId, phase });
      await persistBorrowers(next);
    },
    [borrowerSnaps, persistBorrowers],
  );

  // ── Property ──────────────────────────────────────────────────────────────
  const getPropertySnapshot = useCallback(
    (applicationId: string, phase: PhaseKey): PropertySnapshot | undefined =>
      propertySnaps.find(s => snapId(s.applicationId, s.phase) === snapId(applicationId, phase)),
    [propertySnaps],
  );

  const savePropertySnapshot = useCallback(
    async (applicationId: string, phase: PhaseKey, data: PropertyFallback) => {
      const id = snapId(applicationId, phase);
      const next = propertySnaps.filter(s => snapId(s.applicationId, s.phase) !== id);
      next.push({ ...data, applicationId, phase });
      await persistProperties(next);
    },
    [propertySnaps, persistProperties],
  );

  // ── Loan Terms ────────────────────────────────────────────────────────────
  const getLoanTermsSnapshot = useCallback(
    (applicationId: string, phase: PhaseKey): LoanTermsSnapshot | undefined =>
      loanTermsSnaps.find(s => snapId(s.applicationId, s.phase) === snapId(applicationId, phase)),
    [loanTermsSnaps],
  );

  const saveLoanTermsSnapshot = useCallback(
    async (applicationId: string, phase: PhaseKey, data: LoanTermsFallback) => {
      const id = snapId(applicationId, phase);
      const next = loanTermsSnaps.filter(s => snapId(s.applicationId, s.phase) !== id);
      next.push({ ...data, applicationId, phase });
      await persistLoanTerms(next);
    },
    [loanTermsSnaps, persistLoanTerms],
  );

  // ── Promotion — copies Core4 snapshots from one phase to the next ──────────
  /**
   * Called when a loan advances to a new phase MS boundary.
   * Reads the fromPhase snapshot; if none exists, uses the provided fallback
   * (core-service data). Writes a new independent snapshot to toPhase.
   * The fromPhase snapshot is left untouched.
   */
  const promoteSnapshots = useCallback(
    async (
      applicationId: string,
      fromPhase: PhaseKey,
      toPhase: PhaseKey,
      fallback: {
        borrower:  BorrowerFallback;
        property:  PropertyFallback;
        loanTerms: LoanTermsFallback;
      },
    ) => {
      const fromId = snapId(applicationId, fromPhase);
      const toId   = snapId(applicationId, toPhase);

      // Borrower
      const srcB = borrowerSnaps.find(s => snapId(s.applicationId, s.phase) === fromId);
      const bData: BorrowerFallback = srcB
        ? { firstName: srcB.firstName, lastName: srcB.lastName, entityName: srcB.entityName,
            emails: srcB.emails, phones: srcB.phones, mailingAddresses: srcB.mailingAddresses,
            creExperienceYears: srcB.creExperienceYears, netWorthUsd: srcB.netWorthUsd,
            liquidityUsd: srcB.liquidityUsd, creditScore: srcB.creditScore }
        : fallback.borrower;
      const nextB = borrowerSnaps.filter(s => snapId(s.applicationId, s.phase) !== toId);
      nextB.push({ ...bData, applicationId, phase: toPhase });

      // Property
      const srcP = propertySnaps.find(s => snapId(s.applicationId, s.phase) === fromId);
      const pData: PropertyFallback = srcP
        ? { legalAddress: srcP.legalAddress, locations: srcP.locations,
            streetAddress: srcP.streetAddress, city: srcP.city, state: srcP.state,
            zipCode: srcP.zipCode, latitude: srcP.latitude, longitude: srcP.longitude,
            googlePlaceId: srcP.googlePlaceId, propertyType: srcP.propertyType,
            grossSqFt: srcP.grossSqFt, numberOfUnits: srcP.numberOfUnits,
            yearBuilt: srcP.yearBuilt, physicalOccupancyPct: srcP.physicalOccupancyPct,
            economicOccupancyPct: srcP.economicOccupancyPct }
        : fallback.property;
      const nextP = propertySnaps.filter(s => snapId(s.applicationId, s.phase) !== toId);
      nextP.push({ ...pData, applicationId, phase: toPhase });

      // Loan Terms
      const srcLT = loanTermsSnaps.find(s => snapId(s.applicationId, s.phase) === fromId);
      const ltData: LoanTermsFallback = srcLT
        ? { loanType: srcLT.loanType, loanAmountUsd: srcLT.loanAmountUsd,
            loanTermYears: srcLT.loanTermYears, interestType: srcLT.interestType,
            interestRatePct: srcLT.interestRatePct, amortizationType: srcLT.amortizationType,
            ltvPct: srcLT.ltvPct, dscrRatio: srcLT.dscrRatio,
            targetClosingDate: srcLT.targetClosingDate }
        : fallback.loanTerms;
      const nextLT = loanTermsSnaps.filter(s => snapId(s.applicationId, s.phase) !== toId);
      nextLT.push({ ...ltData, applicationId, phase: toPhase });

      await Promise.all([
        persistBorrowers(nextB),
        persistProperties(nextP),
        persistLoanTerms(nextLT),
      ]);
    },
    [borrowerSnaps, propertySnaps, loanTermsSnaps,
     persistBorrowers, persistProperties, persistLoanTerms],
  );

  const clearData = useCallback(async () => {
    await Promise.all([
      persistBorrowers([]),
      persistProperties([]),
      persistLoanTerms([]),
    ]);
  }, [persistBorrowers, persistProperties, persistLoanTerms]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      persistBorrowers(borrowerSnaps.filter(s => s.applicationId !== applicationId)),
      persistProperties(propertySnaps.filter(s => s.applicationId !== applicationId)),
      persistLoanTerms(loanTermsSnaps.filter(s => s.applicationId !== applicationId)),
    ]);
  }, [borrowerSnaps, propertySnaps, loanTermsSnaps,
      persistBorrowers, persistProperties, persistLoanTerms]);

  return {
    getBorrowerSnapshot,
    saveBorrowerSnapshot,
    getPropertySnapshot,
    savePropertySnapshot,
    getLoanTermsSnapshot,
    saveLoanTermsSnapshot,
    promoteSnapshots,
    clearData,
    clearForApplication,
  };
});

export { PhaseDataServiceProvider, usePhaseDataService };
