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

export type Profile = {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileEntitlement = {
  id: string;
  profileId: string;
  entitlementId: string;
};

export type UserProfile = {
  id: string;
  userSid: string;
  profileId: string;
  createdAt: string;
};

// ─── Static Entitlement Registry ─────────────────────────────────────────────
// Entitlements are defined in code. Admins cannot create new ones; they only
// map existing entitlements to profiles.

function ent(
  screenKey: string,
  microservice: string,
  screenLabel: string,
  action: EntitlementAction
): Entitlement {
  return { id: `${screenKey}.${action}`, microservice, screenKey, screenLabel, action };
}

export const ENTITLEMENTS: Entitlement[] = [
  // Core
  ent("core.dashboard",         "Core",                "Dashboard",             "VIEW"),
  ent("core.applications",      "Core",                "Applications",          "VIEW"),
  // Inquiry
  ent("inquiry.notes",          "Inquiry",             "Inquiry Notes",         "VIEW"),
  ent("inquiry.notes",          "Inquiry",             "Inquiry Notes",         "EDIT"),
  ent("inquiry.rent-roll",      "Inquiry",             "Rent Roll",             "VIEW"),
  ent("inquiry.rent-roll",      "Inquiry",             "Rent Roll",             "EDIT"),
  ent("inquiry.op-history",     "Inquiry",             "Operating History",     "VIEW"),
  ent("inquiry.op-history",     "Inquiry",             "Operating History",     "EDIT"),
  ent("inquiry.disposition",    "Inquiry",             "Inquiry Disposition",   "VIEW"),
  ent("inquiry.disposition",    "Inquiry",             "Inquiry Disposition",   "EDIT"),
  // Letter of Interest
  ent("loi.main",               "Letter of Interest",  "Initial Credit Review", "VIEW"),
  ent("loi.main",               "Letter of Interest",  "Initial Credit Review", "EDIT"),
  // Application Start
  ent("app-start.main",         "Application Start",   "Application Form",      "VIEW"),
  ent("app-start.main",         "Application Start",   "Application Form",      "EDIT"),
  ent("app-start.disposition",  "Application Start",   "App Disposition",       "VIEW"),
  ent("app-start.disposition",  "Application Start",   "App Disposition",       "EDIT"),
  // Processing
  ent("processing.main",        "Processing",          "Processing",            "VIEW"),
  ent("processing.main",        "Processing",          "Processing",            "EDIT"),
  // Final Credit Review
  ent("fcr.main",               "Final Credit Review", "Final Credit Review",   "VIEW"),
  ent("fcr.main",               "Final Credit Review", "Final Credit Review",   "EDIT"),
  // Conditions
  ent("conditions.main",        "Conditions",          "Conditions",            "VIEW"),
  ent("conditions.main",        "Conditions",          "Conditions",            "EDIT"),
  // Pre-Close
  ent("pre-close.main",         "Pre-Close",           "Pre-Close",             "VIEW"),
  ent("pre-close.main",         "Pre-Close",           "Pre-Close",             "EDIT"),
  // Ready for Docs
  ent("rfd.main",               "Ready for Docs",      "Ready for Docs",        "VIEW"),
  ent("rfd.main",               "Ready for Docs",      "Ready for Docs",        "EDIT"),
  // Closing
  ent("closing.main",           "Closing",             "Closing Details",       "VIEW"),
  ent("closing.main",           "Closing",             "Closing Details",       "EDIT"),
  // Borrower
  ent("borrower.profile",       "Borrower",            "Borrower Profile",      "VIEW"),
  ent("borrower.profile",       "Borrower",            "Borrower Profile",      "EDIT"),
  // Property
  ent("property.profile",       "Property",            "Property Profile",      "VIEW"),
  ent("property.profile",       "Property",            "Property Profile",      "EDIT"),
  // Loan
  ent("loan.terms",             "Loan",                "Loan Terms",            "VIEW"),
  ent("loan.terms",             "Loan",                "Loan Terms",            "EDIT"),
  // Amortization
  ent("amortization.calc",      "Loan",                "Amortization",          "VIEW"),
  ent("amortization.calc",      "Loan",                "Amortization",          "EDIT"),
  // Credit Evaluation
  ent("credit.evaluation",      "Credit",              "Credit Evaluation",     "VIEW"),
  ent("credit.evaluation",      "Credit",              "Credit Evaluation",     "EDIT"),
  // Commitment Letter
  ent("commitment.letter",      "Commitment",          "Commitment Letter",     "VIEW"),
  ent("commitment.letter",      "Commitment",          "Commitment Letter",     "EDIT"),
  // Collaboration
  ent("collaboration.comments", "Collaboration",       "Comments",              "VIEW"),
  ent("collaboration.comments", "Collaboration",       "Comments",              "EDIT"),
  ent("collaboration.tasks",    "Collaboration",       "Tasks",                 "VIEW"),
  ent("collaboration.tasks",    "Collaboration",       "Tasks",                 "EDIT"),
  // Documents
  ent("documents.main",         "Documents",           "Documents",             "VIEW"),
  ent("documents.main",         "Documents",           "Documents",             "EDIT"),
  // Loan Team
  ent("loan-team.main",         "Loan Team",           "Loan Team",             "VIEW"),
  ent("loan-team.main",         "Loan Team",           "Loan Team",             "EDIT"),
  // Exceptions
  ent("exceptions.main",        "Exceptions",          "Exceptions",            "VIEW"),
  ent("exceptions.main",        "Exceptions",          "Exceptions",            "EDIT"),
];

// Build a quick lookup: Set<entitlementId> per profile for O(1) checks
export function buildEntitlementSet(pes: ProfileEntitlement[], profileId: string): Set<string> {
  return new Set(pes.filter((pe) => pe.profileId === profileId).map((pe) => pe.entitlementId));
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEY_PROFILES      = "svc_rbac_profiles_v1";
const KEY_PROF_ENTS     = "svc_rbac_profile_entitlements_v1";
const KEY_USER_PROFILES = "svc_rbac_user_profiles_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }
function uuid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const D = "2024-01-01T00:00:00.000Z";

export const SEED_PROFILES: Profile[] = [
  { id: "profile_admin", name: "System Administrator", description: "Full access to all screens and actions", colorHex: "#1B7F9E", createdAt: D, updatedAt: D },
  { id: "profile_lo",    name: "Loan Officer",          description: "Originates loans through application phase", colorHex: "#0B6E4F", createdAt: D, updatedAt: D },
  { id: "profile_ca",    name: "Credit Analyst",        description: "Underwrites and analyzes credit risk", colorHex: "#7B3F9E", createdAt: D, updatedAt: D },
  { id: "profile_co",    name: "Closing Officer",       description: "Handles pre-close through funding", colorHex: "#9E5B1B", createdAt: D, updatedAt: D },
  { id: "profile_ro",    name: "Read Only",             description: "View-only access to all screens", colorHex: "#6B7280", createdAt: D, updatedAt: D },
];

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
  // System Admin — all entitlements
  ...ENTITLEMENTS.map((e) => seedPe("profile_admin", e.id)),

  // Loan Officer — VIEW all + EDIT specific screens
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && LO_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_lo", e.id)),

  // Credit Analyst — VIEW all + EDIT specific screens
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && CA_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_ca", e.id)),

  // Closing Officer — VIEW all + EDIT specific screens
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW" || (e.action === "EDIT" && CO_EDIT_KEYS.has(e.screenKey)))
    .map((e) => seedPe("profile_co", e.id)),

  // Read Only — VIEW all only
  ...ENTITLEMENTS
    .filter((e) => e.action === "VIEW")
    .map((e) => seedPe("profile_ro", e.id)),
];

export const SEED_USER_PROFILES: UserProfile[] = [
  { id: "up_001", userSid: "A100001", profileId: "profile_admin", createdAt: D },
  { id: "up_002", userSid: "A100002", profileId: "profile_lo",    createdAt: D },
  { id: "up_003", userSid: "A100003", profileId: "profile_lo",    createdAt: D },
  { id: "up_004", userSid: "A100004", profileId: "profile_ca",    createdAt: D },
  { id: "up_005", userSid: "A100005", profileId: "profile_ca",    createdAt: D },
  { id: "up_006", userSid: "A100006", profileId: "profile_co",    createdAt: D },
  { id: "up_007", userSid: "A100007", profileId: "profile_co",    createdAt: D },
  { id: "up_008", userSid: "A100008", profileId: "profile_ro",    createdAt: D },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [RbacServiceProvider, useRbacService] = createContextHook(() => {
  const [profiles, setProfiles]           = useState<Profile[]>([]);
  const [profileEnts, setProfileEnts]     = useState<ProfileEntitlement[]>([]);
  const [userProfiles, setUserProfiles]   = useState<UserProfile[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_PROFILES),
      AsyncStorage.getItem(KEY_PROF_ENTS),
      AsyncStorage.getItem(KEY_USER_PROFILES),
    ]).then(([rawP, rawPE, rawUP]) => {
      if (rawP)  setProfiles(JSON.parse(rawP));
      if (rawPE) setProfileEnts(JSON.parse(rawPE));
      if (rawUP) setUserProfiles(JSON.parse(rawUP));
      setLoading(false);
    });
  }, []);

  // ── Persistence helpers ───────────────────────────────────────────────────

  const persistProfiles = useCallback(async (data: Profile[]) => {
    setProfiles(data);
    await AsyncStorage.setItem(KEY_PROFILES, JSON.stringify(data));
  }, []);

  const persistPE = useCallback(async (data: ProfileEntitlement[]) => {
    setProfileEnts(data);
    await AsyncStorage.setItem(KEY_PROF_ENTS, JSON.stringify(data));
  }, []);

  const persistUP = useCallback(async (data: UserProfile[]) => {
    setUserProfiles(data);
    await AsyncStorage.setItem(KEY_USER_PROFILES, JSON.stringify(data));
  }, []);

  // ── Profiles ─────────────────────────────────────────────────────────────

  const createProfile = useCallback(
    async (data: Omit<Profile, "id" | "createdAt" | "updatedAt">): Promise<Profile> => {
      const p: Profile = { ...data, id: `profile_${uuid()}`, createdAt: now(), updatedAt: now() };
      await persistProfiles([...profiles, p]);
      return p;
    },
    [profiles, persistProfiles]
  );

  const updateProfile = useCallback(
    async (id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) => {
      await persistProfiles(
        profiles.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p))
      );
    },
    [profiles, persistProfiles]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await persistProfiles(profiles.filter((p) => p.id !== id));
      await persistPE(profileEnts.filter((pe) => pe.profileId !== id));
      await persistUP(userProfiles.filter((up) => up.profileId !== id));
    },
    [profiles, profileEnts, userProfiles, persistProfiles, persistPE, persistUP]
  );

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
          profileEnts.filter((pe) => !(pe.profileId === profileId && pe.entitlementId === entitlementId))
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

  // ── User Profiles ─────────────────────────────────────────────────────────

  const getProfilesForUser = useCallback(
    (userSid: string): string[] =>
      userProfiles.filter((up) => up.userSid === userSid).map((up) => up.profileId),
    [userProfiles]
  );

  const assignUserProfile = useCallback(
    async (userSid: string, profileId: string) => {
      const alreadyAssigned = userProfiles.some(
        (up) => up.userSid === userSid && up.profileId === profileId
      );
      if (alreadyAssigned) return;
      await persistUP([
        ...userProfiles,
        { id: `up_${uuid()}`, userSid, profileId, createdAt: now() },
      ]);
    },
    [userProfiles, persistUP]
  );

  const removeUserProfile = useCallback(
    async (userSid: string, profileId: string) => {
      await persistUP(
        userProfiles.filter((up) => !(up.userSid === userSid && up.profileId === profileId))
      );
    },
    [userProfiles, persistUP]
  );

  // ── Permission Check ──────────────────────────────────────────────────────

  /**
   * Returns true if the user (by SID) has the given entitlement.
   * If sid is null → returns true (bypass mode — no session configured yet).
   */
  const hasPermission = useCallback(
    (sid: string | null, screenKey: string, action: EntitlementAction): boolean => {
      if (sid === null) return true;
      const entitlementId = `${screenKey}.${action}`;
      const profileIds = userProfiles.filter((up) => up.userSid === sid).map((up) => up.profileId);
      if (profileIds.length === 0) return false;
      return profileEnts.some(
        (pe) => profileIds.includes(pe.profileId) && pe.entitlementId === entitlementId
      );
    },
    [userProfiles, profileEnts]
  );

  // ── Seed / Clear ─────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await persistProfiles(SEED_PROFILES);
    await persistPE(SEED_PROFILE_ENTITLEMENTS);
    await persistUP(SEED_USER_PROFILES);
  }, [persistProfiles, persistPE, persistUP]);

  const clearData = useCallback(async () => {
    await persistProfiles([]);
    await persistPE([]);
    await persistUP([]);
  }, [persistProfiles, persistPE, persistUP]);

  return {
    loading,
    profiles,
    profileEnts,
    userProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfileEntitlementIds,
    setProfileEntitlements,
    toggleEntitlement,
    getProfilesForUser,
    assignUserProfile,
    removeUserProfile,
    hasPermission,
    loadSeedData,
    clearData,
  };
});

export { RbacServiceProvider, useRbacService };
