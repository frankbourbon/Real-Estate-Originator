/**
 * Unit tests for the RBAC service (services/rbac/index.tsx).
 *
 * Covers:
 *  - MS_GROUPS registry shape and completeness
 *  - ENTITLEMENTS flat list integrity
 *  - buildEntitlementSet pure function
 *  - hasPermission pure logic (replicated to avoid React context)
 *  - SEED_PROFILE_ENTITLEMENTS correctness against current role definitions
 *
 * Current architecture (9 MS groups):
 *   core | inquiry | icr | application | fcr | closing | documents | tasks | admin-access
 *
 * Phase screen-key pattern: {phase}.borrower / .property / .loan-terms / .amortization
 *   Phases: inquiry · initial-review · application · final-review · closing
 *
 * conditions.main lives in Loan Core (not FCR).
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
  test("defines exactly 9 microservices", () => {
    expect(MS_GROUPS).toHaveLength(9);
  });

  test("every group has required fields", () => {
    MS_GROUPS.forEach((g) => {
      expect(typeof g.ms).toBe("string");
      expect(g.ms.length).toBeGreaterThan(0);
      expect(typeof g.msKey).toBe("string");
      expect(g.msKey.length).toBeGreaterThan(0);
      expect(g.colorHex).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
      expect(Array.isArray(g.entitlements)).toBe(true);
    });
  });

  test("all msKeys are unique", () => {
    const keys = MS_GROUPS.map((g) => g.msKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every group has at least 2 entitlements", () => {
    MS_GROUPS.forEach((g) => expect(g.entitlements.length).toBeGreaterThanOrEqual(2));
  });

  test("all 9 expected msKeys are present in order", () => {
    const keys = MS_GROUPS.map((g) => g.msKey);
    const expected = ["core", "inquiry", "icr", "application", "fcr", "closing", "documents", "tasks", "admin-access"];
    expected.forEach((key) => expect(keys).toContain(key));
  });

  test("Loan Core (core) contains conditions.main", () => {
    const core = MS_GROUPS.find((g) => g.msKey === "core")!;
    const keys = core.entitlements.map((e) => e.screenKey);
    expect(keys).toContain("conditions.main");
  });

  test("Final Credit Review (fcr) does NOT contain conditions.main", () => {
    const fcr = MS_GROUPS.find((g) => g.msKey === "fcr")!;
    const keys = fcr.entitlements.map((e) => e.screenKey);
    expect(keys).not.toContain("conditions.main");
  });

  test("each phase MS owns its borrower/property/loan-terms/amortization screens", () => {
    const phaseMsKeys = ["inquiry", "icr", "application", "fcr", "closing"];
    const phaseKeyPrefixes: Record<string, string> = {
      inquiry: "inquiry",
      icr: "initial-review",
      application: "application",
      fcr: "final-review",
      closing: "closing",
    };
    phaseMsKeys.forEach((msKey) => {
      const group = MS_GROUPS.find((g) => g.msKey === msKey)!;
      const screenKeys = new Set(group.entitlements.map((e) => e.screenKey));
      const prefix = phaseKeyPrefixes[msKey];
      expect(screenKeys.has(`${prefix}.borrower`)).toBe(true);
      expect(screenKeys.has(`${prefix}.property`)).toBe(true);
      expect(screenKeys.has(`${prefix}.loan-terms`)).toBe(true);
      expect(screenKeys.has(`${prefix}.amortization`)).toBe(true);
    });
  });
});

// ─── ENTITLEMENTS flat list ────────────────────────────────────────────────────

describe("ENTITLEMENTS flat list", () => {
  test("is a flat array equal in length to the sum of all MS_GROUP entitlements", () => {
    const expected = MS_GROUPS.flatMap((g) => g.entitlements);
    expect(ENTITLEMENTS).toHaveLength(expected.length);
  });

  test("every entitlement id equals `screenKey.action`", () => {
    ENTITLEMENTS.forEach((e) => expect(e.id).toBe(`${e.screenKey}.${e.action}`));
  });

  test("all actions are VIEW or EDIT", () => {
    ENTITLEMENTS.forEach((e) => expect(["VIEW", "EDIT"]).toContain(e.action));
  });

  test("all entitlements have non-empty screenKey, screenLabel, and microservice", () => {
    ENTITLEMENTS.forEach((e) => {
      expect(e.screenKey.length).toBeGreaterThan(0);
      expect(e.screenLabel.length).toBeGreaterThan(0);
      expect(e.microservice.length).toBeGreaterThan(0);
    });
  });

  test("VIEW count is greater than or equal to EDIT count", () => {
    const viewCount = ENTITLEMENTS.filter((e) => e.action === "VIEW").length;
    const editCount = ENTITLEMENTS.filter((e) => e.action === "EDIT").length;
    expect(viewCount).toBeGreaterThanOrEqual(editCount);
  });

  test("no two entitlements share the same id", () => {
    const ids = ENTITLEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Spot-check key entitlements that must exist
  const mustExist = [
    "core.dashboard.VIEW",
    "conditions.main.VIEW",
    "conditions.main.EDIT",
    "inquiry.borrower.VIEW",
    "inquiry.loan-terms.EDIT",
    "initial-review.borrower.VIEW",
    "application.main.VIEW",
    "processing.main.EDIT",
    "final-review.loan-terms.VIEW",
    "fcr.main.EDIT",
    "exceptions.main.VIEW",
    "commitment.letter.VIEW",
    "closing.main.VIEW",
    "closing.main.EDIT",
    "closing.amortization.EDIT",
    "documents.main.VIEW",
    "tasks.main.EDIT",
    "admin.profiles.VIEW",
    "admin.assignments.EDIT",
  ];

  mustExist.forEach((id) => {
    test(`entitlement ${id} exists`, () => {
      expect(ENTITLEMENTS.find((e) => e.id === id)).toBeDefined();
    });
  });

  test("stale key loan.terms.VIEW does NOT exist (replaced by phase-prefixed keys)", () => {
    expect(ENTITLEMENTS.find((e) => e.id === "loan.terms.VIEW")).toBeUndefined();
  });
});

// ─── buildEntitlementSet ──────────────────────────────────────────────────────

describe("buildEntitlementSet", () => {
  const pes: ProfileEntitlement[] = [
    { id: "pe1", profileId: "p1", entitlementId: "core.dashboard.VIEW" },
    { id: "pe2", profileId: "p1", entitlementId: "inquiry.loan-terms.EDIT" },
    { id: "pe3", profileId: "p2", entitlementId: "core.dashboard.VIEW" },
    { id: "pe4", profileId: "p2", entitlementId: "closing.main.VIEW" },
  ];

  test("returns only entitlements for the requested profile", () => {
    const set = buildEntitlementSet(pes, "p1");
    expect(set.has("core.dashboard.VIEW")).toBe(true);
    expect(set.has("inquiry.loan-terms.EDIT")).toBe(true);
    expect(set.has("closing.main.VIEW")).toBe(false);
  });

  test("does not include entitlements from other profiles", () => {
    expect(buildEntitlementSet(pes, "p1").has("closing.main.VIEW")).toBe(false);
  });

  test("returns empty Set for unknown profile", () => {
    expect(buildEntitlementSet(pes, "unknown").size).toBe(0);
  });

  test("returns empty Set when input array is empty", () => {
    expect(buildEntitlementSet([], "p1").size).toBe(0);
  });

  test("correct count for p2", () => {
    expect(buildEntitlementSet(pes, "p2").size).toBe(2);
  });
});

// ─── hasPermission pure logic ─────────────────────────────────────────────────

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
    { id: "pe1", profileId: "admin",    entitlementId: "inquiry.loan-terms.VIEW" },
    { id: "pe2", profileId: "admin",    entitlementId: "inquiry.loan-terms.EDIT" },
    { id: "pe3", profileId: "readonly", entitlementId: "inquiry.loan-terms.VIEW" },
    { id: "pe4", profileId: "analyst",  entitlementId: "processing.main.VIEW" },
    { id: "pe5", profileId: "analyst",  entitlementId: "processing.main.EDIT" },
  ];

  test("null profileIds → bypass mode → always returns true", () => {
    expect(hasPermission(pes, null, "inquiry.loan-terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, null, "any.screen", "EDIT")).toBe(true);
  });

  test("empty profileIds → no session → always returns false", () => {
    expect(hasPermission(pes, [], "inquiry.loan-terms", "VIEW")).toBe(false);
    expect(hasPermission(pes, [], "processing.main", "EDIT")).toBe(false);
  });

  test("profile with VIEW only → canView true, canEdit false", () => {
    expect(hasPermission(pes, ["readonly"], "inquiry.loan-terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, ["readonly"], "inquiry.loan-terms", "EDIT")).toBe(false);
  });

  test("profile with VIEW + EDIT → both true", () => {
    expect(hasPermission(pes, ["admin"], "inquiry.loan-terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, ["admin"], "inquiry.loan-terms", "EDIT")).toBe(true);
  });

  test("multiple profiles: any grant satisfies the check", () => {
    expect(hasPermission(pes, ["analyst", "readonly"], "inquiry.loan-terms", "VIEW")).toBe(true);
    expect(hasPermission(pes, ["analyst", "readonly"], "processing.main", "EDIT")).toBe(true);
    expect(hasPermission(pes, ["analyst", "readonly"], "closing.main", "VIEW")).toBe(false);
  });

  test("wrong screenKey → false", () => {
    expect(hasPermission(pes, ["admin"], "nonexistent.screen", "VIEW")).toBe(false);
  });

  test("correct screenKey but wrong action → false", () => {
    expect(hasPermission(pes, ["readonly"], "inquiry.loan-terms", "EDIT")).toBe(false);
  });

  test("empty profileEnts → always false (except bypass)", () => {
    expect(hasPermission([], ["admin"], "inquiry.loan-terms", "VIEW")).toBe(false);
    expect(hasPermission([], null, "inquiry.loan-terms", "VIEW")).toBe(true);
  });
});

// ─── SEED_PROFILE_ENTITLEMENTS ────────────────────────────────────────────────

describe("SEED_PROFILE_ENTITLEMENTS", () => {
  const allIds = new Set(ENTITLEMENTS.map((e) => e.id));
  const knownProfiles = ["profile_admin", "profile_lo", "profile_ca", "profile_co", "profile_ro"];

  test("all entries reference known profiles", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => expect(knownProfiles).toContain(pe.profileId));
  });

  test("all entries reference valid entitlement IDs", () => {
    SEED_PROFILE_ENTITLEMENTS.forEach((pe) => expect(allIds.has(pe.entitlementId)).toBe(true));
  });

  test("System Administrator has every entitlement", () => {
    const adminIds = new Set(
      SEED_PROFILE_ENTITLEMENTS.filter((pe) => pe.profileId === "profile_admin").map((pe) => pe.entitlementId)
    );
    ENTITLEMENTS.forEach((e) => expect(adminIds.has(e.id)).toBe(true));
  });

  test("Read Only has VIEW entitlements only", () => {
    SEED_PROFILE_ENTITLEMENTS
      .filter((pe) => pe.profileId === "profile_ro")
      .forEach((pe) => {
        const ent = ENTITLEMENTS.find((e) => e.id === pe.entitlementId);
        expect(ent?.action).toBe("VIEW");
      });
  });

  test("Read Only has exactly as many grants as there are VIEW entitlements", () => {
    const roCount = SEED_PROFILE_ENTITLEMENTS.filter((pe) => pe.profileId === "profile_ro").length;
    const viewCount = ENTITLEMENTS.filter((e) => e.action === "VIEW").length;
    expect(roCount).toBe(viewCount);
  });

  // Loan Officer role assertions
  test("Loan Officer has inquiry.notes.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "inquiry.notes.EDIT"
    )).toBeDefined();
  });

  test("Loan Officer has inquiry.loan-terms.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "inquiry.loan-terms.EDIT"
    )).toBeDefined();
  });

  test("Loan Officer has loan-team.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "loan-team.main.EDIT"
    )).toBeDefined();
  });

  test("Loan Officer has application.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "application.main.EDIT"
    )).toBeDefined();
  });

  // Credit Analyst role assertions
  test("Credit Analyst has processing.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "processing.main.EDIT"
    )).toBeDefined();
  });

  test("Credit Analyst has fcr.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "fcr.main.EDIT"
    )).toBeDefined();
  });

  test("Credit Analyst has exceptions.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "exceptions.main.EDIT"
    )).toBeDefined();
  });

  test("Credit Analyst has initial-review.loan-terms.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "initial-review.loan-terms.EDIT"
    )).toBeDefined();
  });

  // Closing Officer role assertions
  test("Closing Officer has closing.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "closing.main.EDIT"
    )).toBeDefined();
  });

  test("Closing Officer has documents.main.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "documents.main.EDIT"
    )).toBeDefined();
  });

  test("Closing Officer has commitment.letter.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "commitment.letter.EDIT"
    )).toBeDefined();
  });

  test("Closing Officer has closing.loan-terms.EDIT", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "closing.loan-terms.EDIT"
    )).toBeDefined();
  });

  // Cross-role boundary checks
  test("Loan Officer does NOT have processing.main.EDIT (CA turf)", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "processing.main.EDIT"
    )).toBeUndefined();
  });

  test("Loan Officer does NOT have closing.main.EDIT (CO turf)", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_lo" && pe.entitlementId === "closing.main.EDIT"
    )).toBeUndefined();
  });

  test("Closing Officer does NOT have inquiry.notes.EDIT (LO turf)", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_co" && pe.entitlementId === "inquiry.notes.EDIT"
    )).toBeUndefined();
  });

  test("Credit Analyst does NOT have closing.main.EDIT (CO turf)", () => {
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_ca" && pe.entitlementId === "closing.main.EDIT"
    )).toBeUndefined();
  });

  test("Read Only does NOT have any EDIT grant", () => {
    const roEdits = SEED_PROFILE_ENTITLEMENTS.filter(
      (pe) => pe.profileId === "profile_ro" && pe.entitlementId.endsWith(".EDIT")
    );
    expect(roEdits).toHaveLength(0);
  });

  // conditions.main is in Loan Core — all profiles get VIEW; only admin gets EDIT by default
  test("conditions.main.VIEW is granted to all profiles", () => {
    knownProfiles.forEach((pid) => {
      expect(SEED_PROFILE_ENTITLEMENTS.find(
        (pe) => pe.profileId === pid && pe.entitlementId === "conditions.main.VIEW"
      )).toBeDefined();
    });
  });

  test("conditions.main.EDIT is granted only to profile_admin (not in any role edit set)", () => {
    const nonAdmin = ["profile_lo", "profile_ca", "profile_co", "profile_ro"];
    nonAdmin.forEach((pid) => {
      expect(SEED_PROFILE_ENTITLEMENTS.find(
        (pe) => pe.profileId === pid && pe.entitlementId === "conditions.main.EDIT"
      )).toBeUndefined();
    });
    expect(SEED_PROFILE_ENTITLEMENTS.find(
      (pe) => pe.profileId === "profile_admin" && pe.entitlementId === "conditions.main.EDIT"
    )).toBeDefined();
  });

  // Data-integrity
  test("no duplicate pe entries (same profileId + entitlementId)", () => {
    const keys = SEED_PROFILE_ENTITLEMENTS.map((pe) => `${pe.profileId}|${pe.entitlementId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("all pe IDs are unique", () => {
    const ids = SEED_PROFILE_ENTITLEMENTS.map((pe) => pe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
