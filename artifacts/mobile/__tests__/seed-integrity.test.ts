/**
 * Cross-service seed data integrity tests.
 * Validates that all foreign-key references across seed datasets are valid.
 */
import { SEED_PROFILES, SEED_USER_PROFILES }      from "@/services/system-core";
import { ENTITLEMENTS, SEED_PROFILE_ENTITLEMENTS } from "@/services/rbac";
import { SEED_ADMIN_USERS }                        from "@/services/admin";
import { APPLICATION_STATUSES }                    from "@/services/core";

// ─── Cross-service FK checks ──────────────────────────────────────────────────

describe("Seed data cross-service integrity", () => {
  const adminSids  = new Set(SEED_ADMIN_USERS.map((u) => u.sid));
  const profileIds = new Set(SEED_PROFILES.map((p) => p.id));
  const entitleIds = new Set(ENTITLEMENTS.map((e) => e.id));

  test("SEED_USER_PROFILES.userSid all reference valid SEED_ADMIN_USERS SIDs", () => {
    SEED_USER_PROFILES.forEach((up) => expect(adminSids.has(up.userSid)).toBe(true));
  });

  test("SEED_USER_PROFILES.profileId all reference valid SEED_PROFILES", () => {
    SEED_USER_PROFILES.forEach((up) => expect(profileIds.has(up.profileId)).toBe(true));
  });

  test("SEED_PROFILE_ENTITLEMENTS.profileId all reference valid SEED_PROFILES", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => expect(profileIds.has(pe.profileId)).toBe(true));
  });

  test("SEED_PROFILE_ENTITLEMENTS.entitlementId all reference valid ENTITLEMENTS", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => expect(entitleIds.has(pe.entitlementId)).toBe(true));
  });

  test("every SEED_PROFILE has at least one user assigned", () => {
    profileIds.forEach((pid) => {
      expect(SEED_USER_PROFILES.some((up) => up.profileId === pid)).toBe(true);
    });
  });

  test("the first 8 seed users (A100001–A100008) each have at least one profile", () => {
    ["A100001","A100002","A100003","A100004","A100005","A100006","A100007","A100008"].forEach((sid) => {
      expect(SEED_USER_PROFILES.some((up) => up.userSid === sid)).toBe(true);
    });
  });
});

// ─── APPLICATION_STATUSES ─────────────────────────────────────────────────────

describe("APPLICATION_STATUSES registry (services/core)", () => {
  test("defines 16 statuses", () => {
    expect(APPLICATION_STATUSES).toHaveLength(16);
  });

  test("contains all expected active workflow statuses", () => {
    const active = [
      "Inquiry", "Initial Credit Review", "Application Start",
      "Application Processing", "Final Credit Review", "Pre-close",
      "Ready for Docs", "Docs Drawn", "Docs Back", "Closing",
    ];
    active.forEach((s) => expect(APPLICATION_STATUSES).toContain(s));
  });

  test("contains all terminal statuses", () => {
    const terminal = [
      "Inquiry Canceled", "Inquiry Withdrawn", "Inquiry Denied",
      "Application Withdrawn", "Application Canceled", "Application Denied",
    ];
    terminal.forEach((s) => expect(APPLICATION_STATUSES).toContain(s));
  });

  test("all statuses are unique strings", () => {
    expect(new Set(APPLICATION_STATUSES).size).toBe(APPLICATION_STATUSES.length);
  });
});

// ─── Seed dataset deduplication ───────────────────────────────────────────────

describe("Seed datasets — no duplicate IDs", () => {
  test("SEED_ADMIN_USERS: no duplicate SIDs", () => {
    const sids = SEED_ADMIN_USERS.map((u) => u.sid);
    expect(new Set(sids).size).toBe(sids.length);
  });

  test("SEED_PROFILES: no duplicate IDs", () => {
    const ids = SEED_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("SEED_USER_PROFILES: no duplicate IDs", () => {
    const ids = SEED_USER_PROFILES.map((up) => up.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("SEED_PROFILE_ENTITLEMENTS: no duplicate IDs", () => {
    const ids = SEED_PROFILE_ENTITLEMENTS.map((pe) => pe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("ENTITLEMENTS: no duplicate IDs", () => {
    const ids = ENTITLEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
