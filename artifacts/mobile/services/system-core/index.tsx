import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  userSid: string;
  profileId: string;
  createdAt: string;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEY_PROFILES      = "svc_syscore_profiles_v1";
const KEY_USER_PROFILES = "svc_syscore_user_profiles_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }
function uuid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const D = "2024-01-01T00:00:00.000Z";

export const SEED_PROFILES: Profile[] = [
  { id: "profile_admin", name: "System Administrator", description: "Full access to all screens and actions",    colorHex: "#1B7F9E", createdAt: D, updatedAt: D },
  { id: "profile_lo",    name: "Loan Officer",          description: "Originates loans through application phase", colorHex: "#0B6E4F", createdAt: D, updatedAt: D },
  { id: "profile_ca",    name: "Credit Analyst",        description: "Underwrites and analyzes credit risk",       colorHex: "#7B3F9E", createdAt: D, updatedAt: D },
  { id: "profile_co",    name: "Closing Officer",       description: "Handles pre-close through funding",          colorHex: "#9E5B1B", createdAt: D, updatedAt: D },
  { id: "profile_ro",    name: "Read Only",             description: "View-only access to all screens",            colorHex: "#6B7280", createdAt: D, updatedAt: D },
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

/**
 * System Core MS — centralized profile management and user→profile assignments.
 *
 * Profiles are created once here and referenced by all other MS entitlement
 * mappings via profileId. This service is the single source of truth for
 * "who is assigned to which profile".
 */
const [SystemCoreServiceProvider, useSystemCoreService] = createContextHook(() => {
  const [profiles, setProfiles]         = useState<Profile[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_PROFILES),
      AsyncStorage.getItem(KEY_USER_PROFILES),
    ]).then(([rawP, rawUP]) => {
      if (rawP)  setProfiles(JSON.parse(rawP));
      if (rawUP) setUserProfiles(JSON.parse(rawUP));
      setLoading(false);
    });
  }, []);

  const persistProfiles = useCallback(async (data: Profile[]) => {
    setProfiles(data);
    await AsyncStorage.setItem(KEY_PROFILES, JSON.stringify(data));
  }, []);

  const persistUP = useCallback(async (data: UserProfile[]) => {
    setUserProfiles(data);
    await AsyncStorage.setItem(KEY_USER_PROFILES, JSON.stringify(data));
  }, []);

  // ── Profile CRUD ──────────────────────────────────────────────────────────

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
      await persistUP(userProfiles.filter((up) => up.profileId !== id));
    },
    [profiles, userProfiles, persistProfiles, persistUP]
  );

  const getProfile = useCallback(
    (id: string): Profile | undefined => profiles.find((p) => p.id === id),
    [profiles]
  );

  // ── User→Profile Assignments ──────────────────────────────────────────────

  const getProfilesForUser = useCallback(
    (userSid: string): string[] =>
      userProfiles.filter((up) => up.userSid === userSid).map((up) => up.profileId),
    [userProfiles]
  );

  const assignUserProfile = useCallback(
    async (userSid: string, profileId: string) => {
      if (userProfiles.some((up) => up.userSid === userSid && up.profileId === profileId)) return;
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

  // ── Seed / Clear ──────────────────────────────────────────────────────────

  const loadSeedData = useCallback(async () => {
    await persistProfiles(SEED_PROFILES);
    await persistUP(SEED_USER_PROFILES);
  }, [persistProfiles, persistUP]);

  const clearData = useCallback(async () => {
    await persistProfiles([]);
    await persistUP([]);
  }, [persistProfiles, persistUP]);

  return {
    loading,
    profiles,
    userProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    getProfilesForUser,
    assignUserProfile,
    removeUserProfile,
    loadSeedData,
    clearData,
  };
});

export { SystemCoreServiceProvider, useSystemCoreService };
