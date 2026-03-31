/**
 * Unit tests for the usePermission hook (hooks/usePermission.ts).
 *
 * Strategy: mock all service dependencies so the hook runs as a pure function
 * of its inputs without React context providers or AsyncStorage.
 *
 * Screen-key conventions tested here align with the current RBAC architecture:
 *  - Phase-prefixed keys: inquiry.loan-terms, initial-review.borrower, etc.
 *  - conditions.main lives in Loan Core (not FCR).
 *  - processing.main lives in Application MS.
 */

// ── mock before imports ───────────────────────────────────────────────────────
const mockUseSessionService    = jest.fn();
const mockUseSystemCoreService = jest.fn();
const mockUseRbacService       = jest.fn();

jest.mock("@/services/session", () => ({
  useSessionService: () => mockUseSessionService(),
}));

jest.mock("@/services/system-core", () => ({
  useSystemCoreService: () => mockUseSystemCoreService(),
}));

jest.mock("@/services/rbac", () => ({
  useRbacService: () => mockUseRbacService(),
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────
import { renderHook } from "@testing-library/react-native";
import { usePermission } from "@/hooks/usePermission";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHasPermission(grants: Array<{ profileId: string; entitlementId: string }>) {
  return (profileIds: string[] | null, screenKey: string, action: "VIEW" | "EDIT"): boolean => {
    if (profileIds === null) return true;
    if (profileIds.length === 0) return false;
    const id = `${screenKey}.${action}`;
    return grants.some((g) => profileIds.includes(g.profileId) && g.entitlementId === id);
  };
}

function setupServices({
  currentSid,
  profileIds,
  grants = [],
  sessionLoading = false,
  coreLoading    = false,
  rbacLoading    = false,
}: {
  currentSid: string | null;
  profileIds: string[];
  grants?: Array<{ profileId: string; entitlementId: string }>;
  sessionLoading?: boolean;
  coreLoading?: boolean;
  rbacLoading?: boolean;
}) {
  mockUseSessionService.mockReturnValue({
    currentSid,
    loading: sessionLoading,
    setCurrentSid: jest.fn(),
  });

  mockUseSystemCoreService.mockReturnValue({
    getProfilesForUser: () => profileIds,
    loading: coreLoading,
    profiles: [],
    userProfiles: [],
    createProfile:      jest.fn(),
    updateProfile:      jest.fn(),
    deleteProfile:      jest.fn(),
    getProfile:         jest.fn(),
    assignUserProfile:  jest.fn(),
    removeUserProfile:  jest.fn(),
    loadSeedData:       jest.fn(),
    clearData:          jest.fn(),
  });

  mockUseRbacService.mockReturnValue({
    hasPermission: makeHasPermission(grants),
    loading: rbacLoading,
    profileEnts: grants,
    getProfileEntitlementIds: jest.fn(),
    setProfileEntitlements:   jest.fn(),
    toggleEntitlement:        jest.fn(),
    loadSeedData:             jest.fn(),
    clearData:                jest.fn(),
  });
}

// ─── bypass mode (null SID) ───────────────────────────────────────────────────

describe("usePermission — bypass mode (null SID)", () => {
  beforeEach(() => setupServices({ currentSid: null, profileIds: [] }));

  test("canView is true when no session is set", () => {
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.canView).toBe(true);
  });

  test("canEdit is true when no session is set", () => {
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.canEdit).toBe(true);
  });

  test("loading is false in bypass mode", () => {
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.loading).toBe(false);
  });

  test("bypass applies for any screenKey (phase-prefixed and non-phase)", () => {
    const screens = [
      "core.dashboard", "conditions.main", "inquiry.borrower",
      "initial-review.loan-terms", "application.main", "processing.main",
      "final-review.amortization", "fcr.main", "closing.main", "documents.main",
    ];
    screens.forEach((key) => {
      const { result } = renderHook(() => usePermission(key));
      expect(result.current.canView).toBe(true);
      expect(result.current.canEdit).toBe(true);
    });
  });
});

// ─── loading state ────────────────────────────────────────────────────────────

describe("usePermission — loading state", () => {
  test("returns loading:true while sessionLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], sessionLoading: true });
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.loading).toBe(true);
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("returns loading:true while coreLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], coreLoading: true });
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.loading).toBe(true);
  });

  test("returns loading:true while rbacLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], rbacLoading: true });
    const { result } = renderHook(() => usePermission("conditions.main"));
    expect(result.current.loading).toBe(true);
  });

  test("defaults both permissions to true during loading (no flash of denied)", () => {
    setupServices({ currentSid: "A100001", profileIds: [], sessionLoading: true });
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });
});

// ─── user with no profiles ────────────────────────────────────────────────────

describe("usePermission — user with no profiles", () => {
  beforeEach(() => setupServices({ currentSid: "A100099", profileIds: [], grants: [] }));

  test("canView is false with empty profile list", () => {
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.canView).toBe(false);
  });

  test("canEdit is false with empty profile list", () => {
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── READ ONLY profile (VIEW only) ───────────────────────────────────────────

describe("usePermission — READ ONLY profile (VIEW only)", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100008",
      profileIds: ["profile_ro"],
      grants: [
        { profileId: "profile_ro", entitlementId: "inquiry.loan-terms.VIEW" },
        { profileId: "profile_ro", entitlementId: "closing.main.VIEW" },
        { profileId: "profile_ro", entitlementId: "processing.main.VIEW" },
        { profileId: "profile_ro", entitlementId: "conditions.main.VIEW" },
      ],
    });
  });

  test("canView true for a screen the profile has VIEW access to", () => {
    expect(renderHook(() => usePermission("inquiry.loan-terms")).result.current.canView).toBe(true);
  });

  test("canEdit false for a screen the profile has only VIEW", () => {
    expect(renderHook(() => usePermission("inquiry.loan-terms")).result.current.canEdit).toBe(false);
  });

  test("canView true for conditions.main (in Loan Core, RO gets VIEW)", () => {
    expect(renderHook(() => usePermission("conditions.main")).result.current.canView).toBe(true);
  });

  test("canEdit false for conditions.main (RO never has EDIT)", () => {
    expect(renderHook(() => usePermission("conditions.main")).result.current.canEdit).toBe(false);
  });

  test("canView false for a screen the profile has no access to", () => {
    expect(renderHook(() => usePermission("inquiry.notes")).result.current.canView).toBe(false);
  });
});

// ─── SYSTEM ADMIN profile (full access) ──────────────────────────────────────

describe("usePermission — SYSTEM ADMIN profile (full access)", () => {
  const screens = [
    "inquiry.loan-terms", "inquiry.borrower", "initial-review.property",
    "closing.main", "processing.main", "conditions.main",
    "fcr.main", "application.main", "commitment.letter", "documents.main",
  ];

  const allGrants = screens.flatMap((key) => [
    { profileId: "profile_admin", entitlementId: `${key}.VIEW` },
    { profileId: "profile_admin", entitlementId: `${key}.EDIT` },
  ]);

  beforeEach(() => {
    setupServices({ currentSid: "A100001", profileIds: ["profile_admin"], grants: allGrants });
  });

  test("canView is true for all screens", () => {
    screens.forEach((key) => {
      expect(renderHook(() => usePermission(key)).result.current.canView).toBe(true);
    });
  });

  test("canEdit is true for all screens", () => {
    screens.forEach((key) => {
      expect(renderHook(() => usePermission(key)).result.current.canEdit).toBe(true);
    });
  });
});

// ─── LOAN OFFICER profile (partial edit) ─────────────────────────────────────

describe("usePermission — LOAN OFFICER profile (partial edit)", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100002",
      profileIds: ["profile_lo"],
      grants: [
        { profileId: "profile_lo", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_lo", entitlementId: "inquiry.notes.EDIT" },
        { profileId: "profile_lo", entitlementId: "inquiry.loan-terms.VIEW" },
        { profileId: "profile_lo", entitlementId: "inquiry.loan-terms.EDIT" },
        { profileId: "profile_lo", entitlementId: "application.main.VIEW" },
        { profileId: "profile_lo", entitlementId: "application.main.EDIT" },
        { profileId: "profile_lo", entitlementId: "processing.main.VIEW" },
        { profileId: "profile_lo", entitlementId: "closing.main.VIEW" },
      ],
    });
  });

  test("canView + canEdit true for inquiry.notes (LO turf)", () => {
    const { result } = renderHook(() => usePermission("inquiry.notes"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView + canEdit true for inquiry.loan-terms", () => {
    const { result } = renderHook(() => usePermission("inquiry.loan-terms"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView true but canEdit false for processing.main (CA turf)", () => {
    const { result } = renderHook(() => usePermission("processing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("canView true but canEdit false for closing.main (CO turf)", () => {
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("both false for a screen with no access at all", () => {
    const { result } = renderHook(() => usePermission("admin.profiles"));
    expect(result.current.canView).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── CREDIT ANALYST profile ───────────────────────────────────────────────────

describe("usePermission — CREDIT ANALYST profile", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100003",
      profileIds: ["profile_ca"],
      grants: [
        { profileId: "profile_ca", entitlementId: "initial-review.borrower.VIEW" },
        { profileId: "profile_ca", entitlementId: "initial-review.borrower.EDIT" },
        { profileId: "profile_ca", entitlementId: "processing.main.VIEW" },
        { profileId: "profile_ca", entitlementId: "processing.main.EDIT" },
        { profileId: "profile_ca", entitlementId: "fcr.main.VIEW" },
        { profileId: "profile_ca", entitlementId: "fcr.main.EDIT" },
        { profileId: "profile_ca", entitlementId: "inquiry.notes.VIEW" },
      ],
    });
  });

  test("canView + canEdit true for initial-review.borrower", () => {
    const { result } = renderHook(() => usePermission("initial-review.borrower"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView + canEdit true for processing.main", () => {
    const { result } = renderHook(() => usePermission("processing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView + canEdit true for fcr.main", () => {
    const { result } = renderHook(() => usePermission("fcr.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView true but canEdit false for inquiry.notes (LO turf)", () => {
    const { result } = renderHook(() => usePermission("inquiry.notes"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("both false for closing.main (CO turf)", () => {
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── CLOSING OFFICER profile ──────────────────────────────────────────────────

describe("usePermission — CLOSING OFFICER profile", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100006",
      profileIds: ["profile_co"],
      grants: [
        { profileId: "profile_co", entitlementId: "closing.main.VIEW" },
        { profileId: "profile_co", entitlementId: "closing.main.EDIT" },
        { profileId: "profile_co", entitlementId: "closing.loan-terms.VIEW" },
        { profileId: "profile_co", entitlementId: "closing.loan-terms.EDIT" },
        { profileId: "profile_co", entitlementId: "documents.main.VIEW" },
        { profileId: "profile_co", entitlementId: "documents.main.EDIT" },
        { profileId: "profile_co", entitlementId: "commitment.letter.VIEW" },
        { profileId: "profile_co", entitlementId: "commitment.letter.EDIT" },
        { profileId: "profile_co", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_co", entitlementId: "processing.main.VIEW" },
      ],
    });
  });

  test("canView + canEdit true for closing.main", () => {
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView + canEdit true for documents.main", () => {
    const { result } = renderHook(() => usePermission("documents.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView true but canEdit false for inquiry.notes (LO turf)", () => {
    const { result } = renderHook(() => usePermission("inquiry.notes"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("canView true but canEdit false for processing.main (CA turf)", () => {
    const { result } = renderHook(() => usePermission("processing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── multiple profiles (union of grants) ─────────────────────────────────────

describe("usePermission — multiple profiles (union of grants)", () => {
  test("access is granted if ANY profile has the entitlement", () => {
    setupServices({
      currentSid: "A100010",
      profileIds: ["profile_lo", "profile_ca"],
      grants: [
        { profileId: "profile_lo", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_lo", entitlementId: "inquiry.notes.EDIT" },
        { profileId: "profile_ca", entitlementId: "processing.main.VIEW" },
        { profileId: "profile_ca", entitlementId: "processing.main.EDIT" },
      ],
    });

    const { result: r1 } = renderHook(() => usePermission("inquiry.notes"));
    expect(r1.current.canView).toBe(true);
    expect(r1.current.canEdit).toBe(true);

    const { result: r2 } = renderHook(() => usePermission("processing.main"));
    expect(r2.current.canView).toBe(true);
    expect(r2.current.canEdit).toBe(true);
  });

  test("screen with no grants in any profile returns false for both", () => {
    setupServices({
      currentSid: "A100010",
      profileIds: ["profile_lo", "profile_ca"],
      grants: [
        { profileId: "profile_lo", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_ca", entitlementId: "processing.main.VIEW" },
      ],
    });

    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});
