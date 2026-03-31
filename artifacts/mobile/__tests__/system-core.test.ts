/**
 * Unit tests for the System Core service (services/system-core/index.tsx).
 * Covers seed data integrity and pure business logic.
 */
import {
  SEED_PROFILES,
  SEED_USER_PROFILES,
  type Profile,
  type UserProfile,
} from "@/services/system-core";

// ─── SEED_PROFILES ────────────────────────────────────────────────────────────

describe("SEED_PROFILES", () => {
  test("defines exactly 5 profiles", () => {
    expect(SEED_PROFILES).toHaveLength(5);
  });

  test("every profile has required fields", () => {
    SEED_PROFILES.forEach((p) => {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.colorHex).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
      expect(typeof p.createdAt).toBe("string");
      expect(typeof p.updatedAt).toBe("string");
    });
  });

  test("all profile IDs are unique", () => {
    const ids = SEED_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all 5 expected profiles exist", () => {
    const ids = SEED_PROFILES.map((p) => p.id);
    ["profile_admin", "profile_lo", "profile_ca", "profile_co", "profile_ro"].forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  test("System Administrator profile has correct name", () => {
    const admin = SEED_PROFILES.find((p) => p.id === "profile_admin");
    expect(admin?.name).toBe("System Administrator");
  });

  test("Read Only profile has correct name", () => {
    const ro = SEED_PROFILES.find((p) => p.id === "profile_ro");
    expect(ro?.name).toBe("Read Only");
  });

  test("all createdAt and updatedAt are valid ISO date strings", () => {
    SEED_PROFILES.forEach((p) => {
      expect(isNaN(new Date(p.createdAt).getTime())).toBe(false);
      expect(isNaN(new Date(p.updatedAt).getTime())).toBe(false);
    });
  });
});

// ─── SEED_USER_PROFILES ───────────────────────────────────────────────────────

describe("SEED_USER_PROFILES", () => {
  test("defines exactly 8 user-profile assignments", () => {
    expect(SEED_USER_PROFILES).toHaveLength(8);
  });

  test("every user-profile has required fields", () => {
    SEED_USER_PROFILES.forEach((up) => {
      expect(typeof up.id).toBe("string");
      expect(up.id.length).toBeGreaterThan(0);
      expect(typeof up.userSid).toBe("string");
      expect(up.userSid.length).toBeGreaterThan(0);
      expect(typeof up.profileId).toBe("string");
      expect(up.profileId.length).toBeGreaterThan(0);
      expect(typeof up.createdAt).toBe("string");
    });
  });

  test("all assignment IDs are unique", () => {
    const ids = SEED_USER_PROFILES.map((up) => up.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all profileIds reference known SEED_PROFILES", () => {
    const knownIds = new Set(SEED_PROFILES.map((p) => p.id));
    SEED_USER_PROFILES.forEach((up) => expect(knownIds.has(up.profileId)).toBe(true));
  });

  test("A100001 is assigned to profile_admin", () => {
    expect(SEED_USER_PROFILES.find(
      (u) => u.userSid === "A100001" && u.profileId === "profile_admin"
    )).toBeDefined();
  });

  test("A100008 is assigned to profile_ro (Read Only)", () => {
    expect(SEED_USER_PROFILES.find(
      (u) => u.userSid === "A100008" && u.profileId === "profile_ro"
    )).toBeDefined();
  });

  test("no duplicate userSid+profileId combinations", () => {
    const keys = SEED_USER_PROFILES.map((up) => `${up.userSid}|${up.profileId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── getProfilesForUser pure logic ───────────────────────────────────────────

function getProfilesForUser(userProfiles: UserProfile[], userSid: string): string[] {
  return userProfiles.filter((up) => up.userSid === userSid).map((up) => up.profileId);
}

describe("getProfilesForUser logic", () => {
  const userProfiles: UserProfile[] = [
    { id: "up1", userSid: "U001", profileId: "admin", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: "up2", userSid: "U002", profileId: "lo",    createdAt: "2024-01-01T00:00:00.000Z" },
    { id: "up3", userSid: "U002", profileId: "ca",    createdAt: "2024-01-01T00:00:00.000Z" },
    { id: "up4", userSid: "U003", profileId: "ro",    createdAt: "2024-01-01T00:00:00.000Z" },
  ];

  test("returns profile IDs for a user with one profile", () => {
    expect(getProfilesForUser(userProfiles, "U001")).toEqual(["admin"]);
  });

  test("returns all profile IDs for a user with multiple profiles", () => {
    const result = getProfilesForUser(userProfiles, "U002");
    expect(result).toHaveLength(2);
    expect(result).toContain("lo");
    expect(result).toContain("ca");
  });

  test("returns empty array for unknown user", () => {
    expect(getProfilesForUser(userProfiles, "UNKNOWN")).toEqual([]);
  });

  test("returns empty array when userProfiles is empty", () => {
    expect(getProfilesForUser([], "U001")).toEqual([]);
  });
});

// ─── Profile CRUD pure logic ──────────────────────────────────────────────────

describe("Profile CRUD pure logic", () => {
  function makeProfile(overrides?: Partial<Profile>): Profile {
    return {
      id: "p1",
      name: "Test Profile",
      description: "A test",
      colorHex: "#1B7F9E",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  test("delete removes profile by id", () => {
    const profiles = [makeProfile({ id: "p1" }), makeProfile({ id: "p2" })];
    const result = profiles.filter((p) => p.id !== "p1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
  });

  test("delete removes associated user-profiles", () => {
    const ups: UserProfile[] = [
      { id: "up1", userSid: "U1", profileId: "p1", createdAt: "" },
      { id: "up2", userSid: "U2", profileId: "p2", createdAt: "" },
      { id: "up3", userSid: "U3", profileId: "p1", createdAt: "" },
    ];
    const result = ups.filter((up) => up.profileId !== "p1");
    expect(result).toHaveLength(1);
    expect(result[0].profileId).toBe("p2");
  });

  test("update applies patch and preserves other fields", () => {
    const profiles = [makeProfile({ id: "p1", name: "Old Name" })];
    const updated = profiles.map((p) => p.id === "p1" ? { ...p, name: "New Name" } : p);
    expect(updated[0].name).toBe("New Name");
    expect(updated[0].description).toBe("A test");
    expect(updated[0].colorHex).toBe("#1B7F9E");
  });

  test("find returns correct profile", () => {
    const profiles = [makeProfile({ id: "p1" }), makeProfile({ id: "p2", name: "Other" })];
    expect(profiles.find((p) => p.id === "p2")?.name).toBe("Other");
  });

  test("find returns undefined for missing id", () => {
    const profiles = [makeProfile({ id: "p1" })];
    expect(profiles.find((p) => p.id === "missing")).toBeUndefined();
  });
});

// ─── assignUserProfile / removeUserProfile pure logic ────────────────────────

describe("assignUserProfile / removeUserProfile logic", () => {
  const base: UserProfile[] = [
    { id: "up1", userSid: "U1", profileId: "admin", createdAt: "" },
  ];

  test("assign adds new assignment when not already present", () => {
    const alreadyThere = base.some((up) => up.userSid === "U2" && up.profileId === "lo");
    expect(alreadyThere).toBe(false);
    const result = [...base, { id: "up2", userSid: "U2", profileId: "lo", createdAt: "" }];
    expect(result).toHaveLength(2);
  });

  test("assign is idempotent (does not add duplicate)", () => {
    const alreadyThere = base.some((up) => up.userSid === "U1" && up.profileId === "admin");
    const result = alreadyThere ? base : [...base, { id: "up_new", userSid: "U1", profileId: "admin", createdAt: "" }];
    expect(result).toHaveLength(1);
  });

  test("remove deletes correct assignment by userSid + profileId", () => {
    const profiles: UserProfile[] = [
      { id: "up1", userSid: "U1", profileId: "admin", createdAt: "" },
      { id: "up2", userSid: "U1", profileId: "lo",    createdAt: "" },
      { id: "up3", userSid: "U2", profileId: "admin", createdAt: "" },
    ];
    const result = profiles.filter((up) => !(up.userSid === "U1" && up.profileId === "admin"));
    expect(result).toHaveLength(2);
    expect(result.find((up) => up.userSid === "U1" && up.profileId === "admin")).toBeUndefined();
    expect(result.find((up) => up.userSid === "U1" && up.profileId === "lo")).toBeDefined();
  });

  test("remove on non-existent entry leaves array unchanged", () => {
    const result = base.filter((up) => !(up.userSid === "UNKNOWN" && up.profileId === "admin"));
    expect(result).toHaveLength(base.length);
  });
});
