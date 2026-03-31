/**
 * Cross-service seed data integrity tests.
 * Validates that all foreign-key references across seed datasets are valid.
 */
import { SEED_PROFILES, SEED_USER_PROFILES }        from "@/services/system-core";
import { ENTITLEMENTS, SEED_PROFILE_ENTITLEMENTS }  from "@/services/rbac";
import { SEED_ADMIN_USERS }                         from "@/services/admin";
import { APPLICATION_STATUSES, SEED_APPS }          from "@/services/core";

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

// ─── Seed app integrity ───────────────────────────────────────────────────────

describe("SEED_APPS — single sample loan integrity", () => {
  test("SEED_APPS has exactly 1 entry", () => {
    expect(SEED_APPS).toHaveLength(1);
  });

  test("seed app has required identity fields", () => {
    const app = SEED_APPS[0];
    expect(app.id).toBe("seed_a01");
    expect(app.borrowerId).toBe("seed_b01");
    expect(app.propertyId).toBe("seed_p01");
  });

  test("seed app has a valid status", () => {
    expect(APPLICATION_STATUSES).toContain(SEED_APPS[0].status);
  });

  test("seed app has a valid rateType", () => {
    const VALID = ["Fixed Rate", "Adjustable Rate", "Hybrid"];
    expect(VALID).toContain(SEED_APPS[0].rateType);
  });

  test("seed app allInFixedRate is non-empty", () => {
    expect(SEED_APPS[0].allInFixedRate).not.toBe("");
  });

  test("seed app allInFixedRate math is correct (6dp tolerance)", () => {
    const app = SEED_APPS[0];
    const parse = (s: string) => parseFloat(s || "0");
    const expected = parse(app.baseRate) + parse(app.fixedRateVariance) + parse(app.indexRate) + parse(app.spreadOnFixed);
    expect(Math.abs(parse(app.allInFixedRate) - expected)).toBeLessThan(0.0001);
  });

  test("Fixed Rate seed app has empty adjustable fields", () => {
    const app = SEED_APPS[0];
    expect(app.rateType).toBe("Fixed Rate");
    expect(app.adjustableRateVariance).toBe("");
    expect(app.adjustableIndexName).toBe("");
    expect(app.adjustableIndexRate).toBe("");
    expect(app.proformaAdjustableAllInRate).toBe("");
  });

  test("seed app allInFixedRate is stored at 6dp", () => {
    const parts = SEED_APPS[0].allInFixedRate.split(".");
    expect(parts.length).toBe(2);
    expect(parts[1]).toHaveLength(6);
  });
});
