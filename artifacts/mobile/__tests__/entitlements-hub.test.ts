/**
 * Unit tests for pure helper logic in the Entitlements Hub screen
 * (app/admin/entitlements.tsx) and the RBAC service helpers.
 *
 * Functions tested:
 *  - profileAbbr(): derives a short abbreviation from a profile name
 *  - buildScreenRows(): groups entitlements by screenKey into VIEW/EDIT pairs
 *  - grantedSet key format: ensures the `entitlementId|profileId` pattern is correct
 */
import { MS_GROUPS, type MsGroup } from "@/services/rbac";

// ─── profileAbbr (replicated from entitlements.tsx) ──────────────────────────

function profileAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map((w) => w[0] ?? "").join("").toUpperCase().substring(0, 3);
}

describe("profileAbbr", () => {
  test("System Administrator → SA", () => expect(profileAbbr("System Administrator")).toBe("SA"));
  test("Loan Officer → LO",          () => expect(profileAbbr("Loan Officer")).toBe("LO"));
  test("Credit Analyst → CA",         () => expect(profileAbbr("Credit Analyst")).toBe("CA"));
  test("Closing Officer → CO",        () => expect(profileAbbr("Closing Officer")).toBe("CO"));
  test("Read Only → RO",              () => expect(profileAbbr("Read Only")).toBe("RO"));

  test("single word uses first two letters", () => expect(profileAbbr("Admin")).toBe("AD"));
  test("single character returns that character", () => expect(profileAbbr("X")).toBe("X"));

  test("extra whitespace is trimmed and ignored", () => {
    expect(profileAbbr("  Loan   Officer  ")).toBe("LO");
  });

  test("result is always uppercase", () => {
    expect(profileAbbr("loan officer")).toBe("LO");
    expect(profileAbbr("credit analyst")).toBe("CA");
  });

  test("three-word name takes first letter of each word (max 3 chars)", () => {
    expect(profileAbbr("Vice President Originations")).toBe("VPO");
  });

  test("four-word name is capped at 3 chars", () => {
    expect(profileAbbr("Senior Loan Credit Officer").length).toBeLessThanOrEqual(3);
  });
});

// ─── buildScreenRows (replicated from entitlements.tsx) ───────────────────────

type ScreenRow = {
  screenKey: string;
  screenLabel: string;
  viewId: string | null;
  editId: string | null;
};

function buildScreenRows(group: MsGroup): ScreenRow[] {
  const map = new Map<string, ScreenRow>();
  for (const e of group.entitlements) {
    if (!map.has(e.screenKey)) {
      map.set(e.screenKey, { screenKey: e.screenKey, screenLabel: e.screenLabel, viewId: null, editId: null });
    }
    const row = map.get(e.screenKey)!;
    if (e.action === "VIEW") row.viewId = e.id;
    else row.editId = e.id;
  }
  return Array.from(map.values());
}

describe("buildScreenRows — unit", () => {
  const mockGroup: MsGroup = {
    ms: "Test MS", msKey: "test", colorHex: "#123456",
    entitlements: [
      { id: "screen.a.VIEW", microservice: "Test", screenKey: "screen.a", screenLabel: "Screen A", action: "VIEW" },
      { id: "screen.a.EDIT", microservice: "Test", screenKey: "screen.a", screenLabel: "Screen A", action: "EDIT" },
      { id: "screen.b.VIEW", microservice: "Test", screenKey: "screen.b", screenLabel: "Screen B", action: "VIEW" },
    ],
  };

  test("groups VIEW + EDIT into one row per screenKey", () => {
    expect(buildScreenRows(mockGroup)).toHaveLength(2);
  });

  test("viewId and editId are set correctly for a screen with both", () => {
    const rowA = buildScreenRows(mockGroup).find((r) => r.screenKey === "screen.a");
    expect(rowA?.viewId).toBe("screen.a.VIEW");
    expect(rowA?.editId).toBe("screen.a.EDIT");
  });

  test("editId is null for screen with VIEW only", () => {
    const rowB = buildScreenRows(mockGroup).find((r) => r.screenKey === "screen.b");
    expect(rowB?.viewId).toBe("screen.b.VIEW");
    expect(rowB?.editId).toBeNull();
  });

  test("preserves screenLabel", () => {
    const rowA = buildScreenRows(mockGroup).find((r) => r.screenKey === "screen.a");
    expect(rowA?.screenLabel).toBe("Screen A");
  });

  test("empty group produces no rows", () => {
    const empty: MsGroup = { ms: "Empty", msKey: "empty", colorHex: "#000", entitlements: [] };
    expect(buildScreenRows(empty)).toHaveLength(0);
  });

  test("VIEW-only group produces rows with editId === null", () => {
    const viewOnly: MsGroup = {
      ms: "Core", msKey: "core", colorHex: "#1B7F9E",
      entitlements: [
        { id: "core.dashboard.VIEW",    microservice: "Core", screenKey: "core.dashboard",    screenLabel: "Dashboard",     action: "VIEW" },
        { id: "core.applications.VIEW", microservice: "Core", screenKey: "core.applications", screenLabel: "Applications",  action: "VIEW" },
      ],
    };
    const rows = buildScreenRows(viewOnly);
    expect(rows).toHaveLength(2);
    rows.forEach((r) => expect(r.editId).toBeNull());
  });
});

describe("buildScreenRows — against all real MS_GROUPS", () => {
  test("screenKeys are unique within each group", () => {
    MS_GROUPS.forEach((group) => {
      const keys = buildScreenRows(group).map((r) => r.screenKey);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  test("row count matches unique screenKeys per group", () => {
    MS_GROUPS.forEach((group) => {
      const uniqueKeys = new Set(group.entitlements.map((e) => e.screenKey));
      expect(buildScreenRows(group)).toHaveLength(uniqueKeys.size);
    });
  });

  test("if editId is set it equals `screenKey.EDIT`", () => {
    MS_GROUPS.forEach((group) => {
      buildScreenRows(group).forEach((row) => {
        if (row.editId !== null) expect(row.editId).toBe(`${row.screenKey}.EDIT`);
        if (row.viewId !== null) expect(row.viewId).toBe(`${row.screenKey}.VIEW`);
      });
    });
  });

  test("Loan Core has a row for conditions.main", () => {
    const core = MS_GROUPS.find((g) => g.msKey === "core")!;
    const rows = buildScreenRows(core);
    expect(rows.find((r) => r.screenKey === "conditions.main")).toBeDefined();
  });

  test("Final Credit Review does NOT have a conditions.main row", () => {
    const fcr = MS_GROUPS.find((g) => g.msKey === "fcr")!;
    const rows = buildScreenRows(fcr);
    expect(rows.find((r) => r.screenKey === "conditions.main")).toBeUndefined();
  });

  test("Inquiry MS has rows for all inquiry-specific screens", () => {
    const group = MS_GROUPS.find((g) => g.msKey === "inquiry")!;
    const keys = new Set(buildScreenRows(group).map((r) => r.screenKey));
    ["inquiry.notes", "inquiry.rent-roll", "inquiry.op-history", "inquiry.disposition"].forEach((k) => {
      expect(keys.has(k)).toBe(true);
    });
  });
});

// ─── grantedSet key format (used in entitlements.tsx) ────────────────────────

describe("entitlements.tsx grantedSet key format", () => {
  const profileEnts = [
    { profileId: "p1", entitlementId: "inquiry.loan-terms.VIEW" },
    { profileId: "p2", entitlementId: "inquiry.loan-terms.EDIT" },
    { profileId: "p1", entitlementId: "closing.main.VIEW" },
    { profileId: "p1", entitlementId: "conditions.main.VIEW" },
  ];

  const grantedSet = new Set(profileEnts.map((pe) => `${pe.entitlementId}|${pe.profileId}`));

  test("grants are keyed as entitlementId|profileId", () => {
    expect(grantedSet.has("inquiry.loan-terms.VIEW|p1")).toBe(true);
    expect(grantedSet.has("closing.main.VIEW|p1")).toBe(true);
    expect(grantedSet.has("conditions.main.VIEW|p1")).toBe(true);
  });

  test("grant from a different profile is not confused", () => {
    expect(grantedSet.has("inquiry.loan-terms.EDIT|p1")).toBe(false);
    expect(grantedSet.has("inquiry.loan-terms.EDIT|p2")).toBe(true);
  });

  test("non-granted entitlement returns false", () => {
    expect(grantedSet.has("fcr.main.VIEW|p1")).toBe(false);
  });

  test("key format is order-dependent (entitlementId first, then profileId)", () => {
    expect(grantedSet.has("p1|inquiry.loan-terms.VIEW")).toBe(false);
    expect(grantedSet.has("inquiry.loan-terms.VIEW|p1")).toBe(true);
  });
});
