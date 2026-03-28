import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

import {
  SEED_APPLICATIONS, SEED_BORROWERS, SEED_CONDITIONS, SEED_EXCEPTIONS,
  SEED_OPERATING_HISTORY, SEED_PROPERTIES, SEED_RENT_ROLL,
} from "@/utils/seedData";

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

// ─── Condition entity (3NF) ───────────────────────────────────────────────────

/**
 * A condition that must be satisfied before the loan can advance.
 * Conditions are cross-phase and can be added by any persona.
 * appliesTo drives which entity the condition references.
 */
export type ConditionStatus = "Pending" | "Satisfied" | "Waived";
export type ConditionAppliesTo = "Borrower" | "Property" | "Application";

export type Condition = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;

  conditionType: string;       // free text: e.g. "Financial", "Legal", "Appraisal"
  description: string;
  status: ConditionStatus;
  appliesTo: ConditionAppliesTo;

  phaseAddedAt: ApplicationStatus; // which phase it was raised in
  createdByPersona: string;        // e.g. "Credit Risk", "Processing"
};

// ─── Exception entity (3NF) ──────────────────────────────────────────────────

/**
 * A policy exception requiring approval at a defined authority level.
 * W1 = lowest authority (Loan Officer); W30 = highest (Board).
 */
export type ExceptionStatus = "Pending Approval" | "Approved" | "Denied";

/** W1 (lowest, weakest) through W30 (highest, strongest approval required). */
export type ApprovalAuthorityLevel =
  | "W1" | "W2" | "W3" | "W4" | "W5"
  | "W6" | "W7" | "W8" | "W9" | "W10"
  | "W11" | "W12" | "W13" | "W14" | "W15"
  | "W16" | "W17" | "W18" | "W19" | "W20"
  | "W21" | "W22" | "W23" | "W24" | "W25"
  | "W26" | "W27" | "W28" | "W29" | "W30";

export const APPROVAL_LEVELS: ApprovalAuthorityLevel[] = Array.from(
  { length: 30 },
  (_, i) => `W${i + 1}` as ApprovalAuthorityLevel
);

export type Exception = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;

  exceptionType: string;                  // free text: e.g. "LTV", "DSCR", "IO Structure"
  description: string;
  status: ExceptionStatus;
  approvalAuthorityLevel: ApprovalAuthorityLevel;

  phaseAddedAt: ApplicationStatus;
  createdByPersona: string;               // e.g. "Credit Risk"
  approvedBy: string;                     // populated when status = Approved
  approvedAt: string;                     // ISO date string
};

// ─── Rent Roll entity (MISMO-inspired, 3NF) ──────────────────────────────────

export type UnitType =
  | "Studio" | "1BR/1BA" | "1BR/1BA+Den"
  | "2BR/1BA" | "2BR/2BA" | "2BR/2BA+Den"
  | "3BR/2BA" | "3BR/3BA" | "Penthouse"
  | "Commercial" | "Other";

export type LeaseStatusType = "Occupied" | "Vacant" | "Notice" | "Model" | "Down";
export type LeaseType = "NNN" | "NN" | "Gross" | "Modified Gross" | "Absolute Net" | "Full Service";

/** Per-unit rent roll record. Multifamily and commercial share this entity.
 *  MISMO reference: RentRollItemType */
export type RentRollUnit = {
  id: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;

  unitIdentifier: string;       // MISMO: UnitIdentifier (e.g. "101", "Suite 200")
  unitType: UnitType;           // MISMO: UnitTypeDescription
  bedroomCount: string;         // MISMO: UnitBedroomCount (0 for studio/commercial)
  bathroomCount: string;        // MISMO: UnitBathroomCount
  squareFeet: string;           // MISMO: GrossLivingAreaSquareFeetCount / GrossLeasableAreaSquareFeetCount

  tenantName: string;           // MISMO: TenantName
  leaseBeginDate: string;       // MISMO: LeaseBeginDate
  leaseEndDate: string;         // MISMO: LeaseEndDate
  leaseStatus: LeaseStatusType; // MISMO: VacancyIndicator

  // Multifamily-specific
  monthlyRentAmount: string;    // MISMO: MonthlyRentAmount (contract rent)
  marketRentAmount: string;     // MISMO: MarketRentAmount

  // Commercial-specific
  annualBaseRentAmount: string; // MISMO: AnnualBaseRentAmount
  baseRentPsf: string;          // MISMO: BaseRentPerSquareFeetAmount
  leaseType: LeaseType | "";    // MISMO: LeaseTypeDescription
  renewalOptions: string;       // MISMO: OptionTypeDescription
  tenantIndustry: string;       // MISMO: TenantIndustryDescription
};

// ─── Operating History entity (MISMO-inspired, 3NF) ─────────────────────────

export type OperatingPeriodType =
  | "Actual Year 1"
  | "Actual Year 2"
  | "T12 (Trailing 12)"
  | "Current Year Budget"
  | "Lender Underwriting";

/** Annual operating statement per property.
 *  Line items follow MISMO IncomeExpenseStatementType. */
export type OperatingYear = {
  id: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;

  periodType: OperatingPeriodType; // MISMO: FinancialStatementPeriodDescription
  periodYear: string;              // Calendar year this represents (e.g. "2024")

  // ── Income ───────────────────────────────────────────────────────────────
  grossPotentialRent: string;       // MISMO: GrossPotentialRentAmount
  vacancyAndCreditLoss: string;     // MISMO: VacancyAndCreditLossAmount (deduction)
  otherIncome: string;              // MISMO: OtherIncomeAmount
  effectiveGrossIncome: string;     // MISMO: EffectiveGrossIncomeAmount

  // ── Expenses ─────────────────────────────────────────────────────────────
  realEstateTaxes: string;          // MISMO: RealEstateTaxAndAssessmentAmount
  insurance: string;                // MISMO: PropertyAndLiabilityInsuranceAmount
  utilities: string;                // MISMO: UtilitiesAmount
  repairsAndMaintenance: string;    // MISMO: RepairsAndMaintenanceAmount
  managementFee: string;            // MISMO: ManagementFeeAmount
  administrative: string;           // MISMO: AdministrativeAmount
  replacementReserves: string;      // MISMO: ReplacementReservesAmount
  otherExpenses: string;            // MISMO: OtherOperatingExpenseAmount
  totalOperatingExpenses: string;   // MISMO: TotalOperatingExpensesAmount

  // ── Net ──────────────────────────────────────────────────────────────────
  netOperatingIncome: string;       // MISMO: NetOperatingIncomeAmount
};

// ─── Task entity (phase-keyed, per-loan) ────────────────────────────────────

/** A task tied to a specific loan and phase.
 *  Phase checklist items are auto-seeded on first open; users may add custom tasks. */
export type LoanTask = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;

  phase: ApplicationStatus;
  title: string;
  description: string;
  isComplete: boolean;
  isCustom: boolean;    // false = from phase checklist, true = user-added
  completedAt: string;  // ISO date when checked off, empty if incomplete
  sortOrder: number;    // display order within the phase group
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
 * Conditions and exceptions are separate 3NF entities (Condition, Exception).
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
  // NOTE: conditionalApprovals & creditRiskExceptions removed — now 3NF entities
  // See: Condition[], Exception[] stored in separate collections

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
  conditions: "loan_conditions_v1",
  exceptions: "loan_exceptions_v1",
  rentRoll: "loan_rent_roll_v1",
  operatingHistory: "loan_operating_history_v1",
  tasks: "loan_tasks_v1",
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
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollUnit[]>([]);
  const [operatingHistory, setOperatingHistory] = useState<OperatingYear[]>([]);
  const [tasks, setTasks] = useState<LoanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.applications),
      AsyncStorage.getItem(KEYS.borrowers),
      AsyncStorage.getItem(KEYS.properties),
      AsyncStorage.getItem(KEYS.conditions),
      AsyncStorage.getItem(KEYS.exceptions),
      AsyncStorage.getItem(KEYS.rentRoll),
      AsyncStorage.getItem(KEYS.operatingHistory),
      AsyncStorage.getItem(KEYS.tasks),
    ]).then(([apps, bors, props, conds, excs, rr, oh, tks]) => {
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
      if (conds) setConditions(JSON.parse(conds));
      if (excs) setExceptions(JSON.parse(excs));
      if (rr) setRentRoll(JSON.parse(rr));
      if (oh) setOperatingHistory(JSON.parse(oh));
      if (tks) setTasks(JSON.parse(tks));
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

  const persistConditions = useCallback(async (conds: Condition[]) => {
    setConditions(conds);
    await AsyncStorage.setItem(KEYS.conditions, JSON.stringify(conds));
  }, []);

  const persistExceptions = useCallback(async (excs: Exception[]) => {
    setExceptions(excs);
    await AsyncStorage.setItem(KEYS.exceptions, JSON.stringify(excs));
  }, []);

  const persistRentRoll = useCallback(async (rr: RentRollUnit[]) => {
    setRentRoll(rr);
    await AsyncStorage.setItem(KEYS.rentRoll, JSON.stringify(rr));
  }, []);

  const persistOperatingHistory = useCallback(async (oh: OperatingYear[]) => {
    setOperatingHistory(oh);
    await AsyncStorage.setItem(KEYS.operatingHistory, JSON.stringify(oh));
  }, []);

  const persistTasks = useCallback(async (tks: LoanTask[]) => {
    setTasks(tks);
    await AsyncStorage.setItem(KEYS.tasks, JSON.stringify(tks));
  }, []);

  // ── Application CRUD ─────────────────────────────────────────────────────

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
        persistConditions(conditions.filter((c) => c.applicationId !== id)),
        persistExceptions(exceptions.filter((e) => e.applicationId !== id)),
        persistRentRoll(rentRoll.filter((u) => u.propertyId !== app.propertyId)),
        persistOperatingHistory(operatingHistory.filter((y) => y.propertyId !== app.propertyId)),
        persistTasks(tasks.filter((t) => t.applicationId !== id)),
      ]);
    },
    [applications, borrowers, properties, conditions, exceptions, rentRoll, operatingHistory, tasks,
     persistApps, persistBorrowers, persistProperties, persistConditions, persistExceptions,
     persistRentRoll, persistOperatingHistory, persistTasks]
  );

  // ── Condition CRUD ───────────────────────────────────────────────────────

  const addCondition = useCallback(
    async (cond: Omit<Condition, "id" | "createdAt" | "updatedAt">) => {
      const full: Condition = { id: uid(), createdAt: now(), updatedAt: now(), ...cond };
      await persistConditions([...conditions, full]);
      return full;
    },
    [conditions, persistConditions]
  );

  const updateCondition = useCallback(
    async (id: string, updates: Partial<Condition>) => {
      await persistConditions(
        conditions.map((c) => c.id === id ? { ...c, ...updates, updatedAt: now() } : c)
      );
    },
    [conditions, persistConditions]
  );

  const deleteCondition = useCallback(
    async (id: string) => {
      await persistConditions(conditions.filter((c) => c.id !== id));
    },
    [conditions, persistConditions]
  );

  // ── Exception CRUD ───────────────────────────────────────────────────────

  const addException = useCallback(
    async (exc: Omit<Exception, "id" | "createdAt" | "updatedAt">) => {
      const full: Exception = { id: uid(), createdAt: now(), updatedAt: now(), ...exc };
      await persistExceptions([...exceptions, full]);
      return full;
    },
    [exceptions, persistExceptions]
  );

  const updateException = useCallback(
    async (id: string, updates: Partial<Exception>) => {
      await persistExceptions(
        exceptions.map((e) => e.id === id ? { ...e, ...updates, updatedAt: now() } : e)
      );
    },
    [exceptions, persistExceptions]
  );

  const deleteException = useCallback(
    async (id: string) => {
      await persistExceptions(exceptions.filter((e) => e.id !== id));
    },
    [exceptions, persistExceptions]
  );

  // ── Rent Roll CRUD ───────────────────────────────────────────────────────

  const addRentRollUnit = useCallback(
    async (unit: Omit<RentRollUnit, "id" | "createdAt" | "updatedAt">) => {
      const full: RentRollUnit = { id: uid(), createdAt: now(), updatedAt: now(), ...unit };
      await persistRentRoll([...rentRoll, full]);
      return full;
    },
    [rentRoll, persistRentRoll]
  );

  const updateRentRollUnit = useCallback(
    async (id: string, updates: Partial<RentRollUnit>) => {
      await persistRentRoll(
        rentRoll.map((u) => u.id === id ? { ...u, ...updates, updatedAt: now() } : u)
      );
    },
    [rentRoll, persistRentRoll]
  );

  const deleteRentRollUnit = useCallback(
    async (id: string) => {
      await persistRentRoll(rentRoll.filter((u) => u.id !== id));
    },
    [rentRoll, persistRentRoll]
  );

  // ── Operating History CRUD ───────────────────────────────────────────────

  const addOperatingYear = useCallback(
    async (year: Omit<OperatingYear, "id" | "createdAt" | "updatedAt">) => {
      const full: OperatingYear = { id: uid(), createdAt: now(), updatedAt: now(), ...year };
      await persistOperatingHistory([...operatingHistory, full]);
      return full;
    },
    [operatingHistory, persistOperatingHistory]
  );

  const updateOperatingYear = useCallback(
    async (id: string, updates: Partial<OperatingYear>) => {
      await persistOperatingHistory(
        operatingHistory.map((y) => y.id === id ? { ...y, ...updates, updatedAt: now() } : y)
      );
    },
    [operatingHistory, persistOperatingHistory]
  );

  const deleteOperatingYear = useCallback(
    async (id: string) => {
      await persistOperatingHistory(operatingHistory.filter((y) => y.id !== id));
    },
    [operatingHistory, persistOperatingHistory]
  );

  // ── Task CRUD ────────────────────────────────────────────────────────────

  const addTask = useCallback(
    async (task: Omit<LoanTask, "id" | "createdAt" | "updatedAt">) => {
      const full: LoanTask = { id: uid(), createdAt: now(), updatedAt: now(), ...task };
      await persistTasks([...tasks, full]);
      return full;
    },
    [tasks, persistTasks]
  );

  const addTasksBatch = useCallback(
    async (batch: Array<Omit<LoanTask, "id" | "createdAt" | "updatedAt">>) => {
      const t = now();
      const fulls: LoanTask[] = batch.map((task) => ({
        id: uid(), createdAt: t, updatedAt: t, ...task,
      }));
      await persistTasks([...tasks, ...fulls]);
    },
    [tasks, persistTasks]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      await persistTasks(
        tasks.map((t) =>
          t.id === id
            ? { ...t, isComplete: !t.isComplete, completedAt: !t.isComplete ? now() : "", updatedAt: now() }
            : t
        )
      );
    },
    [tasks, persistTasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<LoanTask>) => {
      await persistTasks(
        tasks.map((t) => t.id === id ? { ...t, ...updates, updatedAt: now() } : t)
      );
    },
    [tasks, persistTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await persistTasks(tasks.filter((t) => t.id !== id));
    },
    [tasks, persistTasks]
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

  // ── Seed / Reset ─────────────────────────────────────────────────────────

  const loadSampleData = useCallback(async () => {
    await Promise.all([
      persistBorrowers([...SEED_BORROWERS, ...borrowers.filter(b => !b.id.startsWith("seed_"))]),
      persistProperties([...SEED_PROPERTIES, ...properties.filter(p => !p.id.startsWith("seed_"))]),
      persistApps([...SEED_APPLICATIONS, ...applications.filter(a => !a.id.startsWith("seed_"))]),
      persistConditions([...SEED_CONDITIONS, ...conditions.filter(c => !c.id.startsWith("seed_"))]),
      persistExceptions([...SEED_EXCEPTIONS, ...exceptions.filter(e => !e.id.startsWith("seed_"))]),
      persistRentRoll([...SEED_RENT_ROLL, ...rentRoll.filter(u => !u.id.startsWith("seed_"))]),
      persistOperatingHistory([...SEED_OPERATING_HISTORY, ...operatingHistory.filter(y => !y.id.startsWith("seed_"))]),
    ]);
  }, [applications, borrowers, properties, conditions, exceptions, rentRoll, operatingHistory,
      persistApps, persistBorrowers, persistProperties, persistConditions, persistExceptions,
      persistRentRoll, persistOperatingHistory]);

  const clearAllData = useCallback(async () => {
    const seedApps = applications.filter((a) => a.id.startsWith("seed_"));
    const seedBorrowerIds = new Set(seedApps.map((a) => a.borrowerId));
    const seedPropertyIds = new Set(seedApps.map((a) => a.propertyId));
    const seedAppIds = new Set(seedApps.map((a) => a.id));
    await Promise.all([
      persistApps(applications.filter((a) => !a.id.startsWith("seed_"))),
      persistBorrowers(borrowers.filter((b) => !seedBorrowerIds.has(b.id))),
      persistProperties(properties.filter((p) => !seedPropertyIds.has(p.id))),
      persistConditions(conditions.filter((c) => !c.id.startsWith("seed_"))),
      persistExceptions(exceptions.filter((e) => !e.id.startsWith("seed_"))),
      persistRentRoll(rentRoll.filter((u) => !u.id.startsWith("seed_"))),
      persistOperatingHistory(operatingHistory.filter((y) => !y.id.startsWith("seed_"))),
      persistTasks(tasks.filter((t) => !seedAppIds.has(t.applicationId))),
    ]);
  }, [applications, borrowers, properties, conditions, exceptions, rentRoll, operatingHistory, tasks,
      persistApps, persistBorrowers, persistProperties, persistConditions, persistExceptions,
      persistRentRoll, persistOperatingHistory, persistTasks]);

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
  const getConditionsForApplication = useCallback(
    (applicationId: string) => conditions.filter((c) => c.applicationId === applicationId),
    [conditions]
  );
  const getExceptionsForApplication = useCallback(
    (applicationId: string) => exceptions.filter((e) => e.applicationId === applicationId),
    [exceptions]
  );
  const getRentRollForProperty = useCallback(
    (propertyId: string) => rentRoll.filter((u) => u.propertyId === propertyId),
    [rentRoll]
  );
  const getOperatingHistoryForProperty = useCallback(
    (propertyId: string) => operatingHistory.filter((y) => y.propertyId === propertyId),
    [operatingHistory]
  );
  const getTasksForApplication = useCallback(
    (applicationId: string) => tasks.filter((t) => t.applicationId === applicationId),
    [tasks]
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
    applications, borrowers, properties, conditions, exceptions,
    rentRoll, operatingHistory, tasks,
    loading, stats,
    createApplication, updateApplication, updateBorrower, updateProperty, deleteApplication,
    addCondition, updateCondition, deleteCondition,
    addException, updateException, deleteException,
    addRentRollUnit, updateRentRollUnit, deleteRentRollUnit,
    addOperatingYear, updateOperatingYear, deleteOperatingYear,
    addTask, addTasksBatch, toggleTask, updateTask, deleteTask,
    addComment, addAttachment, deleteAttachment,
    getApplication, getBorrower, getProperty,
    getConditionsForApplication, getExceptionsForApplication,
    getRentRollForProperty, getOperatingHistoryForProperty, getTasksForApplication,
    loadSampleData, clearAllData,
  };
});

export { ApplicationProvider, useApplications };
