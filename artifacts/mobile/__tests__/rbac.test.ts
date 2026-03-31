/**
 * Unit tests for the RBAC service (services/rbac/index.tsx).
 * Tests static data integrity, pure logic functions, and seed data correctness.
 * No React rendering or AsyncStorage needed.
 */
import {
  MS_GROUPS,
  ENTITLEMENTS,
  SEED_PROFILE_ENTITLEMENTS,
  buildEntitlementSet,
  type Entitlement,
  type EntitlementAction,
  type ProfileEntitlement,
} from "@/services/rbac";

// ─── MS_GROUPS registry ───────────────────────────────────────────────────────

describe("MS_GROUPS registry", () => {
  test("defines exactly 8 microservices", () => {
    expect(MS_GROUPS).toHaveLength(8);
  });

  test("every group has required fields", () => {
    MS_GROUPS.forEach((g) => {
      expect(typeof g.ms).toBe("string");
      expect(g.ms.length).toBeGreaterThan(0);
      expect(typeof g.msKey).toBe("string");
      expect(g.msKey.length).toBeGreaterThan(0);
      expect(g.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(Array.isArray(g.entitlements)).toBe(true);
    });
  });

  test("all msKeys are unique", () => {
    const keys = MS_GROUPS.map((g) => g.msKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every group has at least 2 entitlements", () => {
    MS_GROUPS.forEach((g) => {
      expect(g.entitlements.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("expected microservices are present", () => {
    const keys = MS_GROUPS.map((g) => g.msKey);
    const expected = [
      "core", "inquiry", "icr", "application", "fcr", "closing",
      "documents", "tasks",
    ];
    expected.forEach((key) => {
      expect(keys).toContain(key);
    });
  });
});

// ─── ENTITLEMENTS flat list ────────────────────────────────────────────────────

describe("ENTITLEMENTS flat list", () => {
  test("is a flat array derived from all MS_GROUPS", () => {
    const expected = MS_GROUPS.flatMap((g) => g.entitlements);
    expect(ENTITLEMENTS).toHaveLength(expected.length);
  });

  test("every entitlement has an id of the form `screenKey.action`", () => {
    ENTITLEMENTS.forEach((e) => {
      expect(e.id).toBe(`${e.screenKey}.${e.action}`);
    });
  });

  test("all actions are VIEW or EDIT", () => {
    ENTITLEMENTS.forEach((e) => {
      expect(["VIEW", "EDIT"]).toContain(e.action);
    });
  });

  test("all entitlements have non-empty screenKey and screenLabel", () => {
    ENTITLEMENTS.forEach((e) => {
      expect(e.screenKey.length).toBeGreaterThan(0);
      expect(e.screenLabel.length).toBeGreaterThan(0);
      expect(e.microservice.length).toBeGreaterThan(0);
    });
  });

  test("VIEW count equals or exceeds EDIT count (screens require VIEW)", () => {
    const viewCount = ENTITLEMENTS.filter((e) => e.action === "VIEW").length;
    const editCount = ENTITLEMENTS.filter((e) => e.action === "EDIT").length;
    expect(viewCount).toBeGreaterThanOrEqual(editCount);
  });

  test("no two entitlements have the same id", () => {
    const ids = ENTITLEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("core.dashboard.VIEW exists", () => {
    expect(ENTITLEMENTS.find((e) => e.id === "core.dashboard.VIEW")).toBeDefined();
  });

  test("closing.main.VIEW and closing.main.EDIT both exist", () => {
    expect(ENTITLEMENTS.find((e) => e.id === "closing.main.VIEW")).toBeDefined();
    expect(ENTITLEMENTS.find((e) => e.id === "closing.main.EDIT")).toBeDefined();
  });
});

// ─── buildEntitlementSet ──────────────────────────────────────────────────────

describe("buildEntitlementSet", () => {
  const pes: ProfileEntitlement[] = [
    { id: "pe1", profileId: "p1", entitlementId: "core.dashboard.VIEW" },
    { id: "pe2", profileId: "p1", entitlementId: "loan.terms.EDIT" },
    { id: "pe3", profileId: "p2", entitlementId: "core.dashboard.VIEW" },
    { id: "pe4", profileId: "p2", entitlementId: "closing.main.VIEW" },
  ];

  test("returns only entitlements for the requested profile", () => {
    const set = buildEntitlementSet(pes, "p1");
    expect(set.has("core.dashboard.VIEW")).toBe(true);
    expect(set.has("loan.terms.EDIT")).toBe(true);
    expect(set.has("closing.main.VIEW")).toBe(false);
  });

  test("does not include entitlements from other profiles", () => {
    const set = buildEntitlementSet(pes, "p1");
    expect(set.has("closing.main.VIEW")).toBe(false);
  });

  test("returns empty Set for unknown profile", () => {
    const set = buildEntitlementSet(pes, "unknown");
    expect(set.size).toBe(0);
  });

  test("returns empty Set when input array is empty", () => {
    const set = buildEntitlementSet([], "p1");
    expect(set.size).toBe(0);
  });

  test("correct count for p2", () => {
    const set = buildEntitlementSet(pes, "p2");
    expect(set.size).toBe(2);
  });
});

// ─── hasPermission pure logic ─────────────────────────────────────────────────

/**
 * Tests for the hasPermission logic.
 * The function is embedded in the hook, so we replicate its pure logic here
 * to unit-test all branches without requiring React context.
 */
function hasPermission(
  profileEnts: ProfileEntitlement[],
  profileIds: string[] | null,
  screenKey: string,
  action: EntitlementAction
): boolean {
  if (profileIds === null) return true;
  if (profileIds.length === 0) return false;
  const entitlementId = `${screenKey}.${action}`;
  return profileEnts.some(
    (pe) => profileIds.includes(pe.profileId) && pe.entitlementId === entitlementId
  );
}

describe("hasPermission logic", () => {
  const pes: ProfileEntitlement[] = [
    { id: "pe1", profileId: "admin",    entitlementId: "loan.terms.VIEW" },
    { id: "pe2", profileId: "admin",    entitlementId: "loan.terms.EDIT" },
    { id: "pe3", profileId: "readonly", entitlementId: "loan.terms.VIEW" },
    { id: "pe4", profileId: "analyst",  entitlementId: "processing.main.VIEW" },
    { id: "pe5", profileId: "analyst",  entitlementId: "processing.main.EDIT" },
  ];

  test("null profileIds → bypass mode → returns true", () => {
    expect(hasPermission(pes, null, "loan.terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, null, "any.screen", "EDIT")).toBe(true);
  });

  test("empty profileIds array → no session profiles → returns false", () => {
    expect(hasPermission(pes, [], "loan.terms", "VIEW")).toBe(false);
    expect(hasPermission(pes, [], "loan.terms", "EDIT")).toBe(false);
  });

  test("profile with VIEW only → canView true, canEdit false", () => {
    expect(hasPermission(pes, ["readonly"], "loan.terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, ["readonly"], "loan.terms", "EDIT")).toBe(false);
  });

  test("profile with VIEW + EDIT → both true", () => {
    expect(hasPermission(pes, ["admin"], "loan.terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, ["admin"], "loan.terms", "EDIT")).toBe(true);
  });

  test("multiple profiles: any grant satisfies the check", () => {
    // readonly has VIEW on loan.terms, analyst does NOT have loan.terms grants
    expect(hasPermission(pes, ["analyst", "readonly"], "loan.terms", "VIEW")).toBe(true);
    // Only analyst has processing.main.EDIT; passing analyst should be true
    expect(hasPermission(pes, ["analyst", "readonly"], "processing.main", "EDIT")).toBe(true);
    // Neither has closing.main grants
    expect(hasPermission(pes, ["analyst", "readonly"], "closing.main", "VIEW")).toBe(false);
  });

  test("wrong screenKey → false", () => {
    expect(hasPermission(pes, ["admin"], "nonexistent.screen", "VIEW")).toBe(false);
  });

  test("correct screenKey but wrong action → false", () => {
    // readonly has VIEW but not EDIT
    expect(hasPermission(pes, ["readonly"], "loan.terms", "EDIT")).toBe(false);
  });

  test("empty profileEnts → always false (except bypass)", () => {
    expect(hasPermission([], ["admin"], "loan.terms", "VIEW")).toBe(false);
    expect(hasPermission([], null, "loan.terms", "VIEW")).toBe(true); // bypass
  });
});

// ─── SEED_PROFILE_ENTITLEMENTS ────────────────────────────────────────────────

describe("SEED_PROFILE_ENTITLEMENTS", () => {
  const allIds = new Set(ENTITLEMENTS.map((e) => e.id));
  const knownProfiles = ["profile_admin", "profile_lo", "profile_ca", "profile_co", "profile_ro"];

  test("all entries reference known profiles", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => {
      expect(knownProfiles).toContain(pe.profileId);
    });
  });

  test("all entries reference valid entitlement IDs", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => {
      expect(allIds.has(pe.entitlementId)).toBe(true);
    });
  });

  test("System Administrator (profile_admin) has every entitlement", () => {
    const adminIds = new Set(
      SEED_PROFILE_ENTITLEMENTS
        .filter((pe) => pe.profileId === "profile_admin")
        .map((pe) => pe.entitlementId)
    );
    ENTITLEMENTS.forEach((e) => {
      expect(adminIds.has(e.id)).toBe(true);
    });
  });

  test("Read Only (profile_ro) has VIEW entitlements only", () => {
    const roEnts = SEED_PROFILE_ENTITLEMENTS.filter((pe) => pe.profileId === "profile_ro");
    roEnts.forEach((pe) => {
      const ent = ENTITLEMENTS.find((e) => e.id === pe.entitlementId);
      expect(ent?.action).toBe("VIEW");
    });
  });

  test("Read Only has exactly as many grants as there are VIEW entitlements", () => {
    const roCount = SEED_PROFILE_ENTITLEMENTS.filter((pe) => pe.profileId === "profile_ro").length;
    const viewCount = ENTITLEMENTS.filter((e) => e.action === "VIEW").length;
    expect(roCount).toBe(viewCount);
  });

  test("Loan Officer has inquiry.notes.EDIT", () => {
    const lo = SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "inquiry.notes.EDIT"
    );
    expect(lo).toBeDefined();
  });

  test("Credit Analyst has processing.main.EDIT", () => {
    const ca = SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "processing.main.EDIT"
    );
    expect(ca).toBeDefined();
  });

  test("Closing Officer has closing.main.EDIT", () => {
    const co = SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "closing.main.EDIT"
    );
    expect(co).toBeDefined();
  });

  test("Loan Officer does NOT have processing.main.EDIT (Credit Analyst turf)", () => {
    const lo = SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "processing.main.EDIT"
    );
    expect(lo).toBeUndefined();
  });

  test("Closing Officer does NOT have inquiry.notes.EDIT (Loan Officer turf)", () => {
    const co = SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "inquiry.notes.EDIT"
    );
    expect(co).toBeUndefined();
  });

  test("no duplicate pe entries (same profileId + entitlementId)", () => {
    const keys = SEED_PROFILE_ENTITLEMENTS.map((pe) => `${pe.profileId}|${pe.entitlementId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("all pe IDs are unique", () => {
    const ids = SEED_PROFILE_ENTITLEMENTS.map((pe) => pe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
