import type { ApplicationStatus } from "@/services/core";

// ─── Phase Order ──────────────────────────────────────────────────────────────

export const PHASE_ORDER: ApplicationStatus[] = [
  "Inquiry",
  "Initial Credit Review",
  "Application Start",
  "Application Processing",
  "Final Credit Review",
  "Pre-close",
  "Ready for Docs",
  "Docs Drawn",
  "Docs Back",
  "Closing",
];

export function phaseIndex(status: ApplicationStatus): number {
  return PHASE_ORDER.indexOf(status);
}

export function isPhaseAtLeast(current: ApplicationStatus, minimum: ApplicationStatus): boolean {
  return phaseIndex(current) >= phaseIndex(minimum);
}

// ─── Persona Types ────────────────────────────────────────────────────────────

export type Persona = "Sales" | "Credit Risk" | "Processing" | "Closing";

// ─── Phase Metadata ───────────────────────────────────────────────────────────

export type PhaseInfo = {
  status: ApplicationStatus;
  phase: number;         // 1-indexed
  persona: Persona;
  personaIcon: string;   // Feather icon name
  color: string;         // text / dot color
  bg: string;            // background color
  description: string;
  checklist: string[];
  notes?: string;        // regulatory / process notes
};

export const DISPOSITION_STATUSES = new Set<ApplicationStatus>([
  "Inquiry Canceled", "Inquiry Withdrawn", "Inquiry Denied",
  "Application Withdrawn", "Application Canceled", "Application Denied",
]);

export const PHASE_INFO: Record<ApplicationStatus, PhaseInfo> = {
  "Inquiry": {
    status: "Inquiry",
    phase: 1,
    persona: "Sales",
    personaIcon: "briefcase",
    color: "#72777D",
    bg: "#E6E9EB",
    description: "Sales collects property financials, inspection report, and photos. Credit score cannot be obtained at this stage.",
    checklist: [
      "Rent Roll collected",
      "Operating Statement collected",
      "Property Inspection completed",
      "Property Photos obtained",
    ],
    notes: "⚠ Do not pull borrower credit — triggers HMDA reportable transaction under ECOA.",
  },
  "Initial Credit Review": {
    status: "Initial Credit Review",
    phase: 2,
    persona: "Credit Risk",
    personaIcon: "shield",
    color: "#0078CF",
    bg: "#EAF6FF",
    description: "Credit Risk evaluates submitted data against the credit box to decide whether to recommend issuing a Initial Credit Review (LOI) to the borrower. The LOI is non-binding and does not consider borrower financials.",
    checklist: [
      "Credit box assessment completed",
      "LOI recommendation issued",
      "LOI delivered to borrower",
    ],
    notes: "The LOI is like a pre-approval but is NOT legally binding and excludes borrower financials.",
  },
  "Application Start": {
    status: "Application Start",
    phase: 3,
    persona: "Sales",
    personaIcon: "briefcase",
    color: "#1B7F9E",
    bg: "#DBF5F7",
    description: "Sales pulls credit score, collects application deposit, obtains signed LOI, debit account authorization, and optional rate lock.",
    checklist: [
      "Credit score pulled",
      "Application deposit collected",
      "Signed LOI received",
      "Debit account authorization obtained",
      "Rate lock executed (if applicable)",
    ],
    notes: "Credit score can now be pulled — this stage triggers HMDA reportability under ECOA.",
  },
  "Application Processing": {
    status: "Application Processing",
    phase: 4,
    persona: "Processing",
    personaIcon: "clipboard",
    color: "#C75300",
    bg: "#FFECDC",
    description: "Sales orders appraisal and environmental review. Processing packages borrower forms for signature and reviews submitted forms in parallel.",
    checklist: [
      "Appraisal ordered",
      "Environmental review ordered",
      "Borrower forms packaged",
      "Borrower forms sent for signature",
      "Processing review underway",
    ],
  },
  "Final Credit Review": {
    status: "Final Credit Review",
    phase: 5,
    persona: "Credit Risk",
    personaIcon: "shield",
    color: "#6B46C1",
    bg: "#F3F0FF",
    description: "Credit Risk evaluates all submitted data to recommend whether to issue a Final Credit Review. This is a legally binding commitment to fund. Conditional approvals and credit risk exceptions are tracked here.",
    checklist: [
      "Appraisal reviewed",
      "Environmental review cleared",
      "Borrower forms reviewed",
      "Conditional approvals documented",
      "Credit risk exceptions documented (if any)",
      "Final Credit Review recommendation issued",
    ],
    notes: "The Final Credit Review is legally binding.",
  },
  "Pre-close": {
    status: "Pre-close",
    phase: 6,
    persona: "Processing",
    personaIcon: "clipboard",
    color: "#1B7F9E",
    bg: "#DBF5F7",
    description: "Processing ensures the loan application is complete for HMDA reporting and all required paperwork is in order before moving to document preparation.",
    checklist: [
      "HMDA data complete",
      "All borrower forms signed and returned",
      "Final Credit Review conditions satisfied",
      "Loan file complete for doc prep",
    ],
  },
  "Ready for Docs": {
    status: "Ready for Docs",
    phase: 7,
    persona: "Closing",
    personaIcon: "check-circle",
    color: "#D4780A",
    bg: "#FFF4E5",
    description: "Closing team confirms quality check and ensures all third-party items are in place: insurance policy, title company, escrow company, flood zone report, and title report.",
    checklist: [
      "QC check passed",
      "Insurance policy in place",
      "Title company confirmed",
      "Escrow company confirmed",
      "Flood zone determination obtained",
      "Title report received",
    ],
  },
  "Docs Drawn": {
    status: "Docs Drawn",
    phase: 8,
    persona: "Closing",
    personaIcon: "check-circle",
    color: "#0078CF",
    bg: "#EAF6FF",
    description: "Legal documents are generated: promissory note, security instrument, guarantee, loan disclosure, settlement statement with fees, and loan summary information.",
    checklist: [
      "Promissory Note drawn",
      "Security Instrument drawn",
      "Guarantee drawn",
      "Loan Disclosure prepared",
      "Settlement Statement (HUD-1) prepared",
      "Borrower notified for signing",
    ],
  },
  "Docs Back": {
    status: "Docs Back",
    phase: 9,
    persona: "Closing",
    personaIcon: "check-circle",
    color: "#00875D",
    bg: "#EAF5F2",
    description: "Title company returns signed copies of all legal documents. Closing team reviews for completeness and accuracy.",
    checklist: [
      "Signed docs received from title company",
      "Document completeness verified",
      "Closing team sign-off obtained",
    ],
  },
  "Closing": {
    status: "Closing",
    phase: 10,
    persona: "Closing",
    personaIcon: "check-circle",
    color: "#005C3C",
    bg: "#D0F0E5",
    description: "Funds are wired per wire account instructions and the loan is summarized into a completed JSON payload for booking to servicing systems.",
    checklist: [
      "Wire instructions verified",
      "Funds wired",
      "Wire confirmation received",
      "Loan payload generated",
      "Booked to servicing system",
      "Servicing loan number assigned",
    ],
  },
  "Inquiry Canceled": {
    status: "Inquiry Canceled", phase: 0, persona: "Sales", personaIcon: "briefcase",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "The borrower's inquiry was canceled before a Initial Credit Review was issued.",
    checklist: ["Cancellation reason documented", "Borrower notified"],
  },
  "Inquiry Withdrawn": {
    status: "Inquiry Withdrawn", phase: 0, persona: "Sales", personaIcon: "briefcase",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "The borrower withdrew their inquiry before a Initial Credit Review was issued.",
    checklist: ["Withdrawal reason documented", "Borrower notified"],
  },
  "Inquiry Denied": {
    status: "Inquiry Denied", phase: 0, persona: "Credit Risk", personaIcon: "shield",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "Credit Risk declined to issue a Initial Credit Review based on the initial credit box assessment.",
    checklist: ["Denial reason documented", "Adverse action notice issued"],
  },
  "Application Withdrawn": {
    status: "Application Withdrawn", phase: 0, persona: "Sales", personaIcon: "briefcase",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "The borrower withdrew their application after a Initial Credit Review was issued.",
    checklist: ["Withdrawal reason documented", "HMDA reportable event recorded", "Borrower notified"],
  },
  "Application Canceled": {
    status: "Application Canceled", phase: 0, persona: "Sales", personaIcon: "briefcase",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "The application was canceled after a Initial Credit Review was issued.",
    checklist: ["Cancellation reason documented", "HMDA reportable event recorded", "Borrower notified"],
  },
  "Application Denied": {
    status: "Application Denied", phase: 0, persona: "Credit Risk", personaIcon: "shield",
    color: "#B91C1C", bg: "#FEE2E2",
    description: "Credit Risk declined to issue a Final Credit Review based on the final credit review.",
    checklist: ["Denial reason documented", "Adverse action notice issued", "HMDA reportable event recorded"],
  },
};

// ─── Persona colors ───────────────────────────────────────────────────────────

export const PERSONA_COLORS: Record<Persona, { color: string; bg: string; icon: string }> = {
  Sales:        { color: "#1B7F9E", bg: "#DBF5F7", icon: "briefcase" },
  "Credit Risk":{ color: "#0078CF", bg: "#EAF6FF", icon: "shield" },
  Processing:   { color: "#C75300", bg: "#FFECDC", icon: "clipboard" },
  Closing:      { color: "#005C3C", bg: "#D0F0E5", icon: "check-circle" },
};
