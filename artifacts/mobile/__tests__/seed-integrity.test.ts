/**
 * Cross-service seed data integrity tests.
 * Validates that all foreign-key references across seed datasets are valid.
 */
import { SEED_PROFILES, SEED_USER_PROFILES }                from "@/services/system-core";
import { ENTITLEMENTS, SEED_PROFILE_ENTITLEMENTS }         from "@/services/rbac";
import { SEED_ADMIN_USERS }                                from "@/services/admin";
import { APPLICATION_STATUSES, SEED_APPS, SEED_APP_RATES } from "@/services/core";

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

// ─── Seed app rate data integrity ─────────────────────────────────────────────

describe("SEED_APPS + SEED_APP_RATES — rate data integrity", () => {
  const VALID_RATE_TYPES = ["Fixed Rate", "Adjustable Rate", "Hybrid"] as const;

  test("SEED_APPS has exactly 100 entries", () => {
    expect(SEED_APPS).toHaveLength(100);
  });

  test("SEED_APP_RATES has exactly 100 entries (one per seed app)", () => {
    expect(Object.keys(SEED_APP_RATES)).toHaveLength(100);
  });

  test("every seed app ID is present in SEED_APP_RATES", () => {
    SEED_APPS.forEach((app) => {
      expect(SEED_APP_RATES).toHaveProperty(app.id);
    });
  });

  test("every SEED_APP_RATES entry has a valid rateType", () => {
    Object.entries(SEED_APP_RATES).forEach(([id, rate]) => {
      expect(VALID_RATE_TYPES).toContain(rate.rateType);
    });
  });

  test("distribution includes all three rate types", () => {
    const rates = Object.values(SEED_APP_RATES).map((r) => r.rateType);
    expect(rates).toContain("Fixed Rate");
    expect(rates).toContain("Adjustable Rate");
    expect(rates).toContain("Hybrid");
  });

  test("Fixed Rate count is between 35 and 55 (~40–50% of 100)", () => {
    const count = Object.values(SEED_APP_RATES).filter((r) => r.rateType === "Fixed Rate").length;
    expect(count).toBeGreaterThanOrEqual(35);
    expect(count).toBeLessThanOrEqual(55);
  });

  test("Adjustable Rate count is between 15 and 35 (~25% of 100)", () => {
    const count = Object.values(SEED_APP_RATES).filter((r) => r.rateType === "Adjustable Rate").length;
    expect(count).toBeGreaterThanOrEqual(15);
    expect(count).toBeLessThanOrEqual(35);
  });

  test("Hybrid count is between 10 and 35 (~25% of 100)", () => {
    const count = Object.values(SEED_APP_RATES).filter((r) => r.rateType === "Hybrid").length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(35);
  });

  test("all active pipeline apps have non-empty allInFixedRate", () => {
    const ACTIVE_WITH_PRICING = [
      "seed_a01","seed_a02","seed_a03","seed_a04","seed_a05","seed_a06",
      "seed_a07","seed_a08","seed_a09","seed_a10","seed_a12","seed_a14","seed_a15",
    ];
    ACTIVE_WITH_PRICING.forEach((id) => {
      expect(SEED_APP_RATES[id].allInFixedRate).not.toBe("");
    });
  });

  test("early-stage inquiry apps (a16–a25) have empty allInFixedRate", () => {
    for (let i = 16; i <= 25; i++) {
      const id = `seed_a${i}`;
      expect(SEED_APP_RATES[id].allInFixedRate).toBe("");
    }
  });

  test("Hybrid and Adjustable Rate entries have non-empty proformaAdjustableAllInRate when they have pricing data", () => {
    const HYBRID_WITH_DATA = ["seed_a02","seed_a09","seed_a12","seed_a27","seed_a31","seed_a32","seed_a39","seed_a42","seed_a43"];
    const ADJ_WITH_DATA    = ["seed_a04","seed_a05","seed_a07","seed_a14","seed_a28","seed_a29","seed_a33","seed_a34"];
    [...HYBRID_WITH_DATA, ...ADJ_WITH_DATA].forEach((id) => {
      expect(SEED_APP_RATES[id].proformaAdjustableAllInRate).not.toBe("");
    });
  });

  test("Fixed Rate entries have empty adjustableRateVariance", () => {
    Object.entries(SEED_APP_RATES)
      .filter(([, r]) => r.rateType === "Fixed Rate")
      .forEach(([id, r]) => {
        expect(r.adjustableRateVariance).toBe("");
      });
  });

  test("allInFixedRate math checks out for key presets (6dp tolerance)", () => {
    const parse = (s: string) => parseFloat(s || "0");
    Object.values(SEED_APP_RATES).filter((r) => r.allInFixedRate).forEach((rate) => {
      const expected = parse(rate.fixedRateVariance) + parse(rate.indexRate) + parse(rate.spreadOnFixed);
      expect(Math.abs(parse(rate.allInFixedRate) - expected)).toBeLessThan(0.0001);
    });
  });

  test("proformaAdjustableAllInRate math checks out for all Adjustable/Hybrid entries with data", () => {
    const parse = (s: string) => parseFloat(s || "0");
    Object.values(SEED_APP_RATES)
      .filter((r) => r.rateType !== "Fixed Rate" && r.proformaAdjustableAllInRate)
      .forEach((r) => {
        const expected = parse(r.adjustableRateVariance) + parse(r.indexRate) + parse(r.spreadOnAdjustable);
        expect(Math.abs(parse(r.proformaAdjustableAllInRate) - expected)).toBeLessThan(0.0001);
      });
  });
});
