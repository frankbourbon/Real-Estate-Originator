import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types: Comments ─────────────────────────────────────────────────────────

/** serviceTag identifies which phase/screen this comment belongs to (optional). */
export type Comment = {
  id: string;
  applicationId: string;
  serviceTag: string;         // e.g. "inquiry", "final-credit-review", "" for general
  parentCommentId: string | null;
  text: string;
  author: string;
  createdAt: string;
};

// ─── Types: Team Members ──────────────────────────────────────────────────────

export type TeamRole =
  | "Client manager"
  | "Client associate"
  | "Client specialist"
  | "Loan coordinator"
  | "Closer"
  | "KYC"
  | "Insurance"
  | "Credit analyst at LOI"
  | "Credit analyst at final"
  | "Credit risk director at LOI"
  | "Credit risk director at final";

export type FunctionalGroup = "Sales" | "Operations" | "Credit";

export const ROLE_GROUPS: Record<FunctionalGroup, TeamRole[]> = {
  Sales:      ["Client manager", "Client associate", "Client specialist"],
  Operations: ["Loan coordinator", "Closer", "KYC", "Insurance"],
  Credit:     ["Credit analyst at LOI", "Credit analyst at final",
               "Credit risk director at LOI", "Credit risk director at final"],
};

export const ALL_ROLES: TeamRole[] = [
  ...ROLE_GROUPS.Sales,
  ...ROLE_GROUPS.Operations,
  ...ROLE_GROUPS.Credit,
];

export function getRoleGroup(role: TeamRole): FunctionalGroup {
  for (const [group, roles] of Object.entries(ROLE_GROUPS) as [FunctionalGroup, TeamRole[]][]) {
    if (roles.includes(role)) return group;
  }
  return "Sales";
}

/**
 * Loan-level team member record.
 *
 * adminSid is a SOFT reference to the admin user registry — it is NOT a foreign key.
 * Deleting or modifying an admin user does not affect this record.
 * firstName, lastName, and sid are copied (denormalized) at import time so that
 * closed-loan attribution is preserved regardless of admin table changes.
 */
export type TeamMember = {
  id: string;
  applicationId: string;
  adminSid: string;
  sid: string;
  firstName: string;
  lastName: string;
  role: TeamRole;
  createdAt: string;
  updatedAt: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEY_TEAM     = "svc_loan_team_v2";
const KEY_COMMENTS = "svc_comments_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string {
  return new Date(y, m - 1, day).toISOString();
}

// ─── Seed Data: Comments ──────────────────────────────────────────────────────

const SEED_COMMENTS: Comment[] = [
  { id: "seed_c01a", applicationId: "seed_a01", serviceTag: "", parentCommentId: null,
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,14),
    text: "Initial call with borrower went well. Strong equity position and long track record in Philly office market." },
  { id: "seed_c02a", applicationId: "seed_a02", serviceTag: "", parentCommentId: null,
    author: "Alan Morse (Credit Risk)", createdAt: d(2026,3,5),
    text: "LOI issued 3/5. Waiting on borrower to review terms and execute." },
  { id: "seed_c02b", applicationId: "seed_a02", serviceTag: "", parentCommentId: "seed_c02a",
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,6),
    text: "Borrower confirmed receipt. Expects to sign by 3/12." },
  { id: "seed_c03a", applicationId: "seed_a03", serviceTag: "", parentCommentId: null,
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,10),
    text: "Deposit received 3/8. Debit auth also signed. Kicking off application package." },
  { id: "seed_c04a", applicationId: "seed_a04", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,1),
    text: "Appraisal ordered 3/1 with Pacific Valuation Group. Est. completion 3/28." },
  { id: "seed_c04b", applicationId: "seed_a04", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,8),
    text: "Phase I Environmental ordered. Awaiting site access confirmation." },
  { id: "seed_c05a", applicationId: "seed_a05", serviceTag: "final-credit-review", parentCommentId: null,
    author: "Alan Morse (Credit Risk)", createdAt: d(2026,3,18),
    text: "Credit memo drafted and under review with CRO. Appraisal came in at $25.1M — slightly above purchase price. Good news." },
  { id: "seed_c05b", applicationId: "seed_a05", serviceTag: "final-credit-review", parentCommentId: "seed_c05a",
    author: "Priya Nair (CRO)", createdAt: d(2026,3,19),
    text: "Reviewed. Floating rate exception approved. Proceeding to CL recommendation." },
  { id: "seed_c06a", applicationId: "seed_a06", serviceTag: "closing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,20),
    text: "HMDA nearly complete — missing census tract. Requesting from GIS team." },
  { id: "seed_c07a", applicationId: "seed_a07", serviceTag: "closing", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,15),
    text: "All third-party items confirmed. Title report clean. Ready to request docs." },
  { id: "seed_c08a", applicationId: "seed_a08", serviceTag: "docs-drawn", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,18),
    text: "Loan documents generated and sent to borrower's counsel. Expecting execution by 3/22." },
  { id: "seed_c09a", applicationId: "seed_a09", serviceTag: "docs-back", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,20),
    text: "Signed docs received from borrower's counsel 3/20. Title confirmed. Ready to wire." },
  { id: "seed_c10a", applicationId: "seed_a10", serviceTag: "closing", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,21),
    text: "Wire instructions verified with borrower via phone. Funding scheduled for 3/24 at 10am ET." },
  { id: "seed_c10b", applicationId: "seed_a10", serviceTag: "closing", parentCommentId: "seed_c10a",
    author: "Priya Nair (CRO)", createdAt: d(2026,3,21),
    text: "Confirmed. Notify servicing team to book to portfolio once wire confirms." },
  { id: "seed_c12a", applicationId: "seed_a12", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,5),
    text: "Appraisal ordered 3/5. Will take ~3 weeks. Borrower packaging financial statements." },
];

// ─── Seed Data: Team Members ──────────────────────────────────────────────────

const SEED_TEAM: TeamMember[] = [
  // seed_a01 — Inquiry, 1200 Market Street, Philadelphia
  { id: "lt_01_01", applicationId: "seed_a01", adminSid: "A100001", sid: "A100001",
    firstName: "James", lastName: "Miller", role: "Client manager",
    createdAt: d(2026,2,1), updatedAt: d(2026,2,1) },
  { id: "lt_01_02", applicationId: "seed_a01", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2026,2,1), updatedAt: d(2026,2,1) },

  // seed_a02 — Inquiry, 7800 Airport Boulevard, Houston
  { id: "lt_02_01", applicationId: "seed_a02", adminSid: "A100002", sid: "A100002",
    firstName: "Sarah", lastName: "Chen", role: "Client manager",
    createdAt: d(2026,2,15), updatedAt: d(2026,2,15) },
  { id: "lt_02_02", applicationId: "seed_a02", adminSid: "A100012", sid: "A100012",
    firstName: "Jessica", lastName: "Martinez", role: "Client associate",
    createdAt: d(2026,2,15), updatedAt: d(2026,2,15) },

  // seed_a03 — LOI, 850 Fifth Avenue, New York
  { id: "lt_03_01", applicationId: "seed_a03", adminSid: "A100001", sid: "A100001",
    firstName: "James", lastName: "Miller", role: "Client manager",
    createdAt: d(2026,1,10), updatedAt: d(2026,1,10) },
  { id: "lt_03_02", applicationId: "seed_a03", adminSid: "A100002", sid: "A100002",
    firstName: "Sarah", lastName: "Chen", role: "Client associate",
    createdAt: d(2026,1,10), updatedAt: d(2026,1,10) },
  { id: "lt_03_03", applicationId: "seed_a03", adminSid: "A100007", sid: "A100007",
    firstName: "Kevin", lastName: "Smith", role: "Credit analyst at LOI",
    createdAt: d(2026,1,10), updatedAt: d(2026,1,10) },
  { id: "lt_03_04", applicationId: "seed_a03", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2026,1,10), updatedAt: d(2026,1,10) },

  // seed_a04 — Application Start, 233 S. Wacker Drive, Chicago
  { id: "lt_04_01", applicationId: "seed_a04", adminSid: "A100001", sid: "A100001",
    firstName: "James", lastName: "Miller", role: "Client manager",
    createdAt: d(2025,12,5), updatedAt: d(2025,12,5) },
  { id: "lt_04_02", applicationId: "seed_a04", adminSid: "A100012", sid: "A100012",
    firstName: "Jessica", lastName: "Martinez", role: "Client associate",
    createdAt: d(2025,12,5), updatedAt: d(2025,12,5) },
  { id: "lt_04_03", applicationId: "seed_a04", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,12,5), updatedAt: d(2025,12,5) },
  { id: "lt_04_04", applicationId: "seed_a04", adminSid: "A100007", sid: "A100007",
    firstName: "Kevin", lastName: "Smith", role: "Credit analyst at LOI",
    createdAt: d(2025,12,5), updatedAt: d(2025,12,5) },
  { id: "lt_04_05", applicationId: "seed_a04", adminSid: "A100010", sid: "A100010",
    firstName: "Patricia", lastName: "Wilson", role: "Credit risk director at LOI",
    createdAt: d(2025,12,5), updatedAt: d(2025,12,5) },

  // seed_a05 — Application Processing, 2100 Convention Center Dr, Las Vegas
  { id: "lt_05_01", applicationId: "seed_a05", adminSid: "A100002", sid: "A100002",
    firstName: "Sarah", lastName: "Chen", role: "Client manager",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },
  { id: "lt_05_02", applicationId: "seed_a05", adminSid: "A100012", sid: "A100012",
    firstName: "Jessica", lastName: "Martinez", role: "Client associate",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },
  { id: "lt_05_03", applicationId: "seed_a05", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },
  { id: "lt_05_04", applicationId: "seed_a05", adminSid: "A100004", sid: "A100004",
    firstName: "Linda", lastName: "Park", role: "KYC",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },
  { id: "lt_05_05", applicationId: "seed_a05", adminSid: "A100007", sid: "A100007",
    firstName: "Kevin", lastName: "Smith", role: "Credit analyst at LOI",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },
  { id: "lt_05_06", applicationId: "seed_a05", adminSid: "A100008", sid: "A100008",
    firstName: "Rachel", lastName: "Brown", role: "Credit risk director at LOI",
    createdAt: d(2025,11,1), updatedAt: d(2025,11,1) },

  // seed_a06 — Application Processing, 800 Fifth Ave, Seattle
  { id: "lt_06_01", applicationId: "seed_a06", adminSid: "A100001", sid: "A100001",
    firstName: "James", lastName: "Miller", role: "Client manager",
    createdAt: d(2025,10,15), updatedAt: d(2025,10,15) },
  { id: "lt_06_02", applicationId: "seed_a06", adminSid: "A100011", sid: "A100011",
    firstName: "Michael", lastName: "Lee", role: "Client specialist",
    createdAt: d(2025,10,15), updatedAt: d(2025,10,15) },
  { id: "lt_06_03", applicationId: "seed_a06", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,10,15), updatedAt: d(2025,10,15) },
  { id: "lt_06_04", applicationId: "seed_a06", adminSid: "A100004", sid: "A100004",
    firstName: "Linda", lastName: "Park", role: "KYC",
    createdAt: d(2025,10,15), updatedAt: d(2025,10,15) },
  { id: "lt_06_05", applicationId: "seed_a06", adminSid: "A100007", sid: "A100007",
    firstName: "Kevin", lastName: "Smith", role: "Credit analyst at LOI",
    createdAt: d(2025,10,15), updatedAt: d(2025,10,15) },

  // seed_a07 — Final Credit Review, 1500 Brickell Ave, Miami
  { id: "lt_07_01", applicationId: "seed_a07", adminSid: "A100001", sid: "A100001",
    firstName: "James", lastName: "Miller", role: "Client manager",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_02", applicationId: "seed_a07", adminSid: "A100002", sid: "A100002",
    firstName: "Sarah", lastName: "Chen", role: "Client associate",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_03", applicationId: "seed_a07", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_04", applicationId: "seed_a07", adminSid: "A100004", sid: "A100004",
    firstName: "Linda", lastName: "Park", role: "KYC",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_05", applicationId: "seed_a07", adminSid: "A100005", sid: "A100005",
    firstName: "Derek", lastName: "Williams", role: "Insurance",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_06", applicationId: "seed_a07", adminSid: "A100007", sid: "A100007",
    firstName: "Kevin", lastName: "Smith", role: "Credit analyst at LOI",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_07", applicationId: "seed_a07", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_08", applicationId: "seed_a07", adminSid: "A100010", sid: "A100010",
    firstName: "Patricia", lastName: "Wilson", role: "Credit risk director at LOI",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },
  { id: "lt_07_09", applicationId: "seed_a07", adminSid: "A100008", sid: "A100008",
    firstName: "Rachel", lastName: "Brown", role: "Credit risk director at final",
    createdAt: d(2025,9,1), updatedAt: d(2025,9,1) },

  // seed_a08 — Pre-close, 3200 Peachtree Road, Atlanta
  { id: "lt_08_01", applicationId: "seed_a08", adminSid: "A100013", sid: "A100013",
    firstName: "Thomas", lastName: "Anderson", role: "Client manager",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_02", applicationId: "seed_a08", adminSid: "A100014", sid: "A100014",
    firstName: "Claire", lastName: "Robinson", role: "Client associate",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_03", applicationId: "seed_a08", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_04", applicationId: "seed_a08", adminSid: "A100004", sid: "A100004",
    firstName: "Linda", lastName: "Park", role: "KYC",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_05", applicationId: "seed_a08", adminSid: "A100005", sid: "A100005",
    firstName: "Derek", lastName: "Williams", role: "Insurance",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_06", applicationId: "seed_a08", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },
  { id: "lt_08_07", applicationId: "seed_a08", adminSid: "A100010", sid: "A100010",
    firstName: "Patricia", lastName: "Wilson", role: "Credit risk director at final",
    createdAt: d(2025,8,10), updatedAt: d(2025,8,10) },

  // seed_a09 — Ready for Docs, 500 Boylston Street, Boston
  { id: "lt_09_01", applicationId: "seed_a09", adminSid: "A100013", sid: "A100013",
    firstName: "Thomas", lastName: "Anderson", role: "Client manager",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_02", applicationId: "seed_a09", adminSid: "A100014", sid: "A100014",
    firstName: "Claire", lastName: "Robinson", role: "Client associate",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_03", applicationId: "seed_a09", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_04", applicationId: "seed_a09", adminSid: "A100004", sid: "A100004",
    firstName: "Linda", lastName: "Park", role: "KYC",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_05", applicationId: "seed_a09", adminSid: "A100005", sid: "A100005",
    firstName: "Derek", lastName: "Williams", role: "Insurance",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_06", applicationId: "seed_a09", adminSid: "A100006", sid: "A100006",
    firstName: "Amanda", lastName: "Torres", role: "Closer",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_07", applicationId: "seed_a09", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },
  { id: "lt_09_08", applicationId: "seed_a09", adminSid: "A100008", sid: "A100008",
    firstName: "Rachel", lastName: "Brown", role: "Credit risk director at final",
    createdAt: d(2025,7,1), updatedAt: d(2025,7,1) },

  // seed_a10 — Docs Drawn, 400 Market Street, San Francisco
  { id: "lt_10_01", applicationId: "seed_a10", adminSid: "A100013", sid: "A100013",
    firstName: "Thomas", lastName: "Anderson", role: "Client manager",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_02", applicationId: "seed_a10", adminSid: "A100014", sid: "A100014",
    firstName: "Claire", lastName: "Robinson", role: "Client associate",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_03", applicationId: "seed_a10", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_04", applicationId: "seed_a10", adminSid: "A100005", sid: "A100005",
    firstName: "Derek", lastName: "Williams", role: "Insurance",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_05", applicationId: "seed_a10", adminSid: "A100006", sid: "A100006",
    firstName: "Amanda", lastName: "Torres", role: "Closer",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_06", applicationId: "seed_a10", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },
  { id: "lt_10_07", applicationId: "seed_a10", adminSid: "A100010", sid: "A100010",
    firstName: "Patricia", lastName: "Wilson", role: "Credit risk director at final",
    createdAt: d(2025,6,1), updatedAt: d(2025,6,1) },

  // seed_a11 — Docs Back, 201 E. Jefferson Street, Phoenix
  { id: "lt_11_01", applicationId: "seed_a11", adminSid: "A100015", sid: "A100015",
    firstName: "David", lastName: "Kim", role: "Client manager",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },
  { id: "lt_11_02", applicationId: "seed_a11", adminSid: "A100016", sid: "A100016",
    firstName: "Nicole", lastName: "Patel", role: "Client associate",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },
  { id: "lt_11_03", applicationId: "seed_a11", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },
  { id: "lt_11_04", applicationId: "seed_a11", adminSid: "A100006", sid: "A100006",
    firstName: "Amanda", lastName: "Torres", role: "Closer",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },
  { id: "lt_11_05", applicationId: "seed_a11", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },
  { id: "lt_11_06", applicationId: "seed_a11", adminSid: "A100008", sid: "A100008",
    firstName: "Rachel", lastName: "Brown", role: "Credit risk director at final",
    createdAt: d(2025,5,1), updatedAt: d(2025,5,1) },

  // seed_a12 — Closing, 1000 Louisiana Street, Houston
  { id: "lt_12_01", applicationId: "seed_a12", adminSid: "A100015", sid: "A100015",
    firstName: "David", lastName: "Kim", role: "Client manager",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_02", applicationId: "seed_a12", adminSid: "A100016", sid: "A100016",
    firstName: "Nicole", lastName: "Patel", role: "Client associate",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_03", applicationId: "seed_a12", adminSid: "A100011", sid: "A100011",
    firstName: "Michael", lastName: "Lee", role: "Client specialist",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_04", applicationId: "seed_a12", adminSid: "A100003", sid: "A100003",
    firstName: "Marcus", lastName: "Johnson", role: "Loan coordinator",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_05", applicationId: "seed_a12", adminSid: "A100006", sid: "A100006",
    firstName: "Amanda", lastName: "Torres", role: "Closer",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_06", applicationId: "seed_a12", adminSid: "A100009", sid: "A100009",
    firstName: "Brian", lastName: "Davis", role: "Credit analyst at final",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
  { id: "lt_12_07", applicationId: "seed_a12", adminSid: "A100008", sid: "A100008",
    firstName: "Rachel", lastName: "Brown", role: "Credit risk director at final",
    createdAt: d(2025,3,1), updatedAt: d(2025,3,1) },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [LoanTeamServiceProvider, useLoanTeamService] = createContextHook(() => {
  const [members,  setMembers]  = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_TEAM),
      AsyncStorage.getItem(KEY_COMMENTS),
    ]).then(([rawTeam, rawComments]) => {
      if (rawTeam)     setMembers(JSON.parse(rawTeam));
      if (rawComments) setComments(JSON.parse(rawComments));
      setLoading(false);
    });
  }, []);

  const persistTeam = useCallback(async (data: TeamMember[]) => {
    setMembers(data);
    await AsyncStorage.setItem(KEY_TEAM, JSON.stringify(data));
  }, []);

  const persistComments = useCallback(async (data: Comment[]) => {
    setComments(data);
    await AsyncStorage.setItem(KEY_COMMENTS, JSON.stringify(data));
  }, []);

  // ── Team Member operations ────────────────────────────────────────────────

  const getTeamMembers = useCallback(
    (applicationId: string) => members.filter((m) => m.applicationId === applicationId),
    [members]
  );

  const addTeamMember = useCallback(
    async (
      applicationId: string,
      data: Omit<TeamMember, "id" | "applicationId" | "createdAt" | "updatedAt">
    ): Promise<TeamMember> => {
      const member: TeamMember = { id: uid(), applicationId, createdAt: now(), updatedAt: now(), ...data };
      await persistTeam([...members, member]);
      return member;
    },
    [members, persistTeam]
  );

  const updateTeamMember = useCallback(
    async (id: string, patch: Partial<Omit<TeamMember, "id" | "applicationId" | "createdAt">>) => {
      await persistTeam(members.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m)));
    },
    [members, persistTeam]
  );

  const removeTeamMember = useCallback(
    async (id: string) => { await persistTeam(members.filter((m) => m.id !== id)); },
    [members, persistTeam]
  );

  // ── Comment operations ────────────────────────────────────────────────────

  const getComments = useCallback(
    (applicationId: string, serviceTag?: string) => {
      const appComments = comments.filter((c) => c.applicationId === applicationId);
      if (serviceTag !== undefined) return appComments.filter((c) => c.serviceTag === serviceTag);
      return appComments;
    },
    [comments]
  );

  const addComment = useCallback(
    async (
      applicationId: string,
      text: string,
      author: string,
      parentCommentId: string | null = null,
      serviceTag: string = ""
    ): Promise<Comment> => {
      const comment: Comment = { id: uid(), applicationId, serviceTag, parentCommentId, text, author, createdAt: now() };
      await persistComments([...comments, comment]);
      return comment;
    },
    [comments, persistComments]
  );

  const updateComment = useCallback(
    async (id: string, text: string) => {
      await persistComments(comments.map((c) => (c.id === id ? { ...c, text } : c)));
    },
    [comments, persistComments]
  );

  const deleteComment = useCallback(
    async (id: string) => {
      const toDelete = new Set<string>();
      const queue = [id];
      while (queue.length) {
        const cur = queue.shift()!;
        toDelete.add(cur);
        comments.filter((c) => c.parentCommentId === cur).forEach((c) => queue.push(c.id));
      }
      await persistComments(comments.filter((c) => !toDelete.has(c.id)));
    },
    [comments, persistComments]
  );

  // ── Seed / Clear ──────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await Promise.all([
      persistTeam(SEED_TEAM),
      persistComments(SEED_COMMENTS),
    ]);
  }, [persistTeam, persistComments]);

  const clearData = useCallback(async () => {
    await Promise.all([persistTeam([]), persistComments([])]);
  }, [persistTeam, persistComments]);

  const clearForApplication = useCallback(
    async (applicationId: string) => {
      await Promise.all([
        persistTeam(members.filter((m) => m.applicationId !== applicationId)),
        persistComments(comments.filter((c) => c.applicationId !== applicationId)),
      ]);
    },
    [members, comments, persistTeam, persistComments]
  );

  return {
    loading,
    // team
    getTeamMembers, addTeamMember, updateTeamMember, removeTeamMember,
    // comments
    getComments, addComment, updateComment, deleteComment,
    // lifecycle
    loadSeedData, clearData, clearForApplication,
  };
});

export { LoanTeamServiceProvider, useLoanTeamService };
