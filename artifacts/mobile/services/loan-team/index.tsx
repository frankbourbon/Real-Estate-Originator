import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_loan_team_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string {
  return new Date(y, m - 1, day).toISOString();
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setMembers(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: TeamMember[]) => {
    setMembers(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getTeamMembers = useCallback(
    (applicationId: string) =>
      members.filter((m) => m.applicationId === applicationId),
    [members]
  );

  const addTeamMember = useCallback(
    async (
      applicationId: string,
      data: Omit<TeamMember, "id" | "applicationId" | "createdAt" | "updatedAt">
    ): Promise<TeamMember> => {
      const member: TeamMember = {
        id: uid(),
        applicationId,
        createdAt: now(),
        updatedAt: now(),
        ...data,
      };
      await persist([...members, member]);
      return member;
    },
    [members, persist]
  );

  const updateTeamMember = useCallback(
    async (id: string, patch: Partial<Omit<TeamMember, "id" | "applicationId" | "createdAt">>) => {
      await persist(
        members.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m))
      );
    },
    [members, persist]
  );

  const removeTeamMember = useCallback(
    async (id: string) => {
      await persist(members.filter((m) => m.id !== id));
    },
    [members, persist]
  );

  const loadSeedData = useCallback(async () => {
    await persist(SEED_TEAM);
  }, [persist]);

  const clearData = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const clearForApplication = useCallback(
    async (applicationId: string) => {
      await persist(members.filter((m) => m.applicationId !== applicationId));
    },
    [members, persist]
  );

  return {
    loading,
    getTeamMembers,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    loadSeedData,
    clearData,
    clearForApplication,
  };
});

export { LoanTeamServiceProvider, useLoanTeamService };
