import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntitlementAction = "VIEW" | "EDIT";

export type Entitlement = {
  id: string;
  microservice: string;
  screenKey: string;
  screenLabel: string;
  action: EntitlementAction;
};

export type ProfileEntitlement = {
  id: string;
  profileId: string;
  entitlementId: string;
};

/**
 * MsGroup — each microservice owns its own entitlement definitions.
 * The RBAC service aggregates them for runtime permission checks, but the
 * entitlement registry is organized by MS so each service's access policy
 * can be configured independently in the Admin Entitlements Hub.
 */
export type MsGroup = {
  ms: string;
  msKey: string;
  colorHex: string;
  entitlements: Entitlement[];
};

// ─── Per-MS Entitlement Registry ─────────────────────────────────────────────

function ent(
  screenKey: string,
  microservice: string,
  screenLabel: string,
  action: EntitlementAction
): Entitlement {
  return { id: `${screenKey}.${action}`, microservice, screenKey, screenLabel, action };
}

export const MS_GROUPS: MsGroup[] = [
  {
    ms: "Core", msKey: "core", colorHex: "#1B7F9E",
    entitlements: [
      ent("core.dashboard",    "Core", "Dashboard",    "VIEW"),
      ent("core.applications", "Core", "Applications", "VIEW"),
    ],
  },
  {
    ms: "Borrower", msKey: "borrower", colorHex: "#2980B9",
    entitlements: [
      ent("borrower.profile", "Borrower", "Borrower Profile", "VIEW"),
      ent("borrower.profile", "Borrower", "Borrower Profile", "EDIT"),
    ],
  },
  {
    ms: "Property", msKey: "property", colorHex: "#1A5276",
    entitlements: [
      ent("property.profile", "Property", "Property Profile", "VIEW"),
      ent("property.profile", "Property", "Property Profile", "EDIT"),
    ],
  },
  {
    ms: "Loan", msKey: "loan", colorHex: "#0B6E4F",
    entitlements: [
      ent("loan.terms",        "Loan", "Loan Terms",   "VIEW"),
      ent("loan.terms",        "Loan", "Loan Terms",   "EDIT"),
      ent("amortization.calc", "Loan", "Amortization", "VIEW"),
      ent("amortization.calc", "Loan", "Amortization", "EDIT"),
    ],
  },
  {
    ms: "Inquiry", msKey: "inquiry", colorHex: "#7B3F9E",
    entitlements: [
      ent("inquiry.notes",       "Inquiry", "Inquiry Notes",       "VIEW"),
      ent("inquiry.notes",       "Inquiry", "Inquiry Notes",       "EDIT"),
      ent("inquiry.rent-roll",   "Inquiry", "Rent Roll",           "VIEW"),
      ent("inquiry.rent-roll",   "Inquiry", "Rent Roll",           "EDIT"),
      ent("inquiry.op-history",  "Inquiry", "Operating History",   "VIEW"),
      ent("inquiry.op-history",  "Inquiry", "Operating History",   "EDIT"),
      ent("inquiry.disposition", "Inquiry", "Inquiry Disposition", "VIEW"),
      ent("inquiry.disposition", "Inquiry", "Inquiry Disposition", "EDIT"),
    ],
  },
  {
    ms: "Letter of Interest", msKey: "loi", colorHex: "#C75300",
    entitlements: [
      ent("loi.main", "Letter of Interest", "Initial Credit Review", "VIEW"),
      ent("loi.main", "Letter of Interest", "Initial Credit Review", "EDIT"),
    ],
  },
  {
    ms: "Application Start", msKey: "app-start", colorHex: "#9E5B1B",
    entitlements: [
      ent("app-start.main",        "Application Start", "Application Form", "VIEW"),
      ent("app-start.main",        "Application Start", "Application Form", "EDIT"),
      ent("app-start.disposition", "Application Start", "App Disposition",  "VIEW"),
      ent("app-start.disposition", "Application Start", "App Disposition",  "EDIT"),
    ],
  },
  {
    ms: "Credit", msKey: "credit", colorHex: "#C0392B",
    entitlements: [
      ent("credit.evaluation", "Credit", "Credit Evaluation", "VIEW"),
      ent("credit.evaluation", "Credit", "Credit Evaluation", "EDIT"),
    ],
  },
  {
    ms: "Processing", msKey: "processing", colorHex: "#1B7F9E",
    entitlements: [
      ent("processing.main", "Processing", "Processing", "VIEW"),
      ent("processing.main", "Processing", "Processing", "EDIT"),
    ],
  },
  {
    ms: "Final Credit Review", msKey: "fcr", colorHex: "#7B3F9E",
    entitlements: [
      ent("fcr.main",        "Final Credit Review", "Final Credit Review", "VIEW"),
      ent("fcr.main",        "Final Credit Review", "Final Credit Review", "EDIT"),
      ent("conditions.main", "Final Credit Review", "Conditions",          "VIEW"),
      ent("conditions.main", "Final Credit Review", "Conditions",          "EDIT"),
      ent("exceptions.main", "Final Credit Review", "Exceptions",          "VIEW"),
      ent("exceptions.main", "Final Credit Review", "Exceptions",          "EDIT"),
    ],
  },
  {
    ms: "Commitment", msKey: "commitment", colorHex: "#0B6E4F",
    entitlements: [
      ent("commitment.letter", "Commitment", "Commitment Letter", "VIEW"),
      ent("commitment.letter", "Commitment", "Commitment Letter", "EDIT"),
    ],
  },
  {
    ms: "Pre-Close", msKey: "pre-close", colorHex: "#2980B9",
    entitlements: [
      ent("pre-close.main", "Pre-Close", "Pre-Close", "VIEW"),
      ent("pre-close.main", "Pre-Close", "Pre-Close", "EDIT"),
    ],
  },
  {
    ms: "Ready for Docs", msKey: "rfd", colorHex: "#9E5B1B",
    entitlements: [
      ent("rfd.main", "Ready for Docs", "Ready for Docs", "VIEW"),
      ent("rfd.main", "Ready for Docs", "Ready for Docs", "EDIT"),
    ],
  },
  {
    ms: "Closing", msKey: "closing", colorHex: "#005C3C",
    entitlements: [
      ent("closing.main", "Closing", "Closing Details", "VIEW"),
      ent("closing.main", "Closing", "Closing Details", "EDIT"),
    ],
  },
  {
    ms: "Collaboration", msKey: "collaboration", colorHex: "#6B7280",
    entitlements: [
      ent("collaboration.comments", "Collaboration", "Comments", "VIEW"),
      ent("collaboration.comments", "Collaboration", "Comments", "EDIT"),
      ent("collaboration.tasks",    "Collaboration", "Tasks",    "VIEW"),
      ent("collaboration.tasks",    "Collaboration", "Tasks",    "EDIT"),
    ],
  },
  {
    ms: "Documents", msKey: "documents", colorHex: "#1A5276",
    entitlements: [
      ent("documents.main", "Documents", "Documents", "VIEW"),
      ent("documents.main", "Documents", "Documents", "EDIT"),
    ],
  },
  {
    ms: "Loan Team", msKey: "loan-team", colorHex: "#C75300",
    entitlements: [
      ent("loan-team.main", "Loan Team", "Loan Team", "VIEW"),
      ent("loan-team.main", "Loan Team", "Loan Team", "EDIT"),
    ],
  },
];

// Flatten all entitlements for backward-compatible lookup
export const ENTITLEMENTS: Entitlement[] = MS_GROUPS.flatMap((g) => g.entitlements);

export function buildEntitlementSet(pes: ProfileEntitlement[], profileId: string): Set<string> {
  return new Set(pes.filter((pe) => pe.profileId === profileId).map((pe) => pe.entitlementId));
}

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY_PROF_ENTS = "svc_rbac_profile_entitlements_v1";

function uuid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const LO_EDIT_KEYS = new Set([
  "inquiry.notes", "inquiry.rent-roll", "inquiry.op-history", "inquiry.disposition",
  "loi.main", "app-start.main", "app-start.disposition",
  "borrower.profile", "property.profile", "loan.terms", "loan-team.main",
]);

const CA_EDIT_KEYS = new Set([
  "processing.main", "fcr.main", "conditions.main",
  "credit.evaluation", "amortization.calc", "exceptions.main",
]);

const CO_EDIT_KEYS = new Set([
  "pre-close.main", "rfd.main", "closing.main", "documents.main", "commitment.letter",
]);

function seedPe(profileId: string, entitlementId: string): ProfileEntitlement {
  return { id: `pe_${profileId}_${entitlementId}`, profileId, entitlementId };
}

export const SEED_PROFILE_ENTITLEMENTS: ProfileEntitlement[] = [
  ...ENTITLEMENTS.map((e) => seedPe("profile_admin", e.id)),
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && LO_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_lo", e.id)),
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && CA_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_ca", e.id)),
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && CO_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_co", e.id)),
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW")
    .map((e) => seedPe("profile_ro", e.id)),
];

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * RBAC Service — stores and manages profile→entitlement mappings.
 *
 * Profiles themselves are owned by system-core. This service only knows
 * about profileIds and which entitlements each profile has been granted.
 * Permission checks take a pre-resolved profileIds array from system-core,
 * keeping the two services fully decoupled.
 */
const [RbacServiceProvider, useRbacService] = createContextHook(() => {
  const [profileEnts, setProfileEnts] = useState<ProfileEntitlement[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY_PROF_ENTS).then((raw) => {
      if (raw) setProfileEnts(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persistPE = useCallback(async (data: ProfileEntitlement[]) => {
    setProfileEnts(data);
    await AsyncStorage.setItem(KEY_PROF_ENTS, JSON.stringify(data));
  }, []);

  // ── Profile Entitlements ──────────────────────────────────────────────────

  const getProfileEntitlementIds = useCallback(
    (profileId: string): Set<string> =>
      new Set(profileEnts.filter((pe) => pe.profileId === profileId).map((pe) => pe.entitlementId)),
    [profileEnts]
  );

  const setProfileEntitlements = useCallback(
    async (profileId: string, entitlementIds: string[]) => {
      const kept = profileEnts.filter((pe) => pe.profileId !== profileId);
      const added: ProfileEntitlement[] = entitlementIds.map((eid) => ({
        id: `pe_${profileId}_${eid}_${uuid()}`,
        profileId,
        entitlementId: eid,
      }));
      await persistPE([...kept, ...added]);
    },
    [profileEnts, persistPE]
  );

  const toggleEntitlement = useCallback(
    async (profileId: string, entitlementId: string) => {
      const exists = profileEnts.some(
        (pe) => pe.profileId === profileId && pe.entitlementId === entitlementId
      );
      if (exists) {
        await persistPE(
          profileEnts.filter(
            (pe) => !(pe.profileId === profileId && pe.entitlementId === entitlementId)
          )
        );
      } else {
        await persistPE([
          ...profileEnts,
          { id: `pe_${profileId}_${entitlementId}_${uuid()}`, profileId, entitlementId },
        ]);
      }
    },
    [profileEnts, persistPE]
  );

  /**
   * Returns true if any of the supplied profileIds has the given entitlement.
   * profileIds === null means bypass mode (no session set) → always returns true.
   */
  const hasPermission = useCallback(
    (profileIds: string[] | null, screenKey: string, action: EntitlementAction): boolean => {
      if (profileIds === null) return true;
      if (profileIds.length === 0) return false;
      const entitlementId = `${screenKey}.${action}`;
      return profileEnts.some(
        (pe) => profileIds.includes(pe.profileId) && pe.entitlementId === entitlementId
      );
    },
    [profileEnts]
  );

  // ── Seed / Clear ──────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await persistPE(SEED_PROFILE_ENTITLEMENTS);
  }, [persistPE]);

  const clearData = useCallback(async () => {
    await persistPE([]);
  }, [persistPE]);

  return {
    loading,
    profileEnts,
    getProfileEntitlementIds,
    setProfileEntitlements,
    toggleEntitlement,
    hasPermission,
    loadSeedData,
    clearData,
  };
});

export { RbacServiceProvider, useRbacService };
