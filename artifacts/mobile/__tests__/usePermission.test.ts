/**
 * Unit tests for the usePermission hook (hooks/usePermission.ts).
 *
 * Strategy: mock all three service dependencies so the hook can be tested
 * as a pure function of its inputs without requiring React context providers
 * or AsyncStorage. Each test configures the mock return values to represent
 * a specific permission scenario.
 */

// ── mock before imports ───────────────────────────────────────────────────────
const mockUseSessionService = jest.fn();
const mockUseSystemCoreService = jest.fn();
const mockUseRbacService = jest.fn();

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

/**
 * Creates a hasPermission implementation backed by a flat list of grants.
 * Mirrors the exact logic in services/rbac/index.tsx.
 */
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
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    getProfile:    jest.fn(),
    assignUserProfile:  jest.fn(),
    removeUserProfile:  jest.fn(),
    loadSeedData: jest.fn(),
    clearData:    jest.fn(),
  });

  mockUseRbacService.mockReturnValue({
    hasPermission: makeHasPermission(grants),
    loading: rbacLoading,
    profileEnts: grants,
    getProfileEntitlementIds: jest.fn(),
    setProfileEntitlements:   jest.fn(),
    toggleEntitlement:        jest.fn(),
    loadSeedData: jest.fn(),
    clearData:    jest.fn(),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePermission — bypass mode (null SID)", () => {
  beforeEach(() => {
    setupServices({ currentSid: null, profileIds: [] });
  });

  test("canView is true when no session is set", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canView).toBe(true);
  });

  test("canEdit is true when no session is set", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canEdit).toBe(true);
  });

  test("loading is false in bypass mode", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.loading).toBe(false);
  });

  test("bypass applies for any screenKey", () => {
    const screens = ["core.dashboard", "closing.main", "inquiry.notes", "processing.main"];
    screens.forEach((key) => {
      const { result } = renderHook(() => usePermission(key));
      expect(result.current.canView).toBe(true);
      expect(result.current.canEdit).toBe(true);
    });
  });
});

describe("usePermission — loading state", () => {
  test("returns loading:true while sessionLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], sessionLoading: true });
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.loading).toBe(true);
    expect(result.current.canView).toBe(true); // defaults to true during load
    expect(result.current.canEdit).toBe(true);
  });

  test("returns loading:true while coreLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], coreLoading: true });
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.loading).toBe(true);
  });

  test("returns loading:true while rbacLoading", () => {
    setupServices({ currentSid: "A100001", profileIds: [], rbacLoading: true });
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.loading).toBe(true);
  });

  test("defaults both permissions to true during loading (no flash of denied)", () => {
    setupServices({ currentSid: "A100001", profileIds: [], sessionLoading: true });
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });
});

describe("usePermission — user with no profiles", () => {
  beforeEach(() => {
    setupServices({ currentSid: "A100099", profileIds: [], grants: [] });
  });

  test("canView is false with empty profile list", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canView).toBe(false);
  });

  test("canEdit is false with empty profile list", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canEdit).toBe(false);
  });
});

describe("usePermission — READ ONLY profile (VIEW only)", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100008",
      profileIds: ["profile_ro"],
      grants: [
        { profileId: "profile_ro", entitlementId: "loan.terms.VIEW" },
        { profileId: "profile_ro", entitlementId: "closing.main.VIEW" },
        { profileId: "profile_ro", entitlementId: "processing.main.VIEW" },
      ],
    });
  });

  test("canView is true for a screen the profile has VIEW access to", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canView).toBe(true);
  });

  test("canEdit is false for a screen the profile has only VIEW", () => {
    const { result } = renderHook(() => usePermission("loan.terms"));
    expect(result.current.canEdit).toBe(false);
  });

  test("canView is false for a screen the profile has no access at all", () => {
    const { result } = renderHook(() => usePermission("inquiry.notes"));
    expect(result.current.canView).toBe(false);
  });
});

describe("usePermission — SYSTEM ADMIN profile (full access)", () => {
  const allGrants = [
    "loan.terms", "closing.main", "processing.main", "inquiry.notes", "core.dashboard",
    "fcr.main", "conditions.main", "pre-close.main", "rfd.main", "documents.main",
  ].flatMap((key) => [
    { profileId: "profile_admin", entitlementId: `${key}.VIEW` },
    { profileId: "profile_admin", entitlementId: `${key}.EDIT` },
  ]);

  beforeEach(() => {
    setupServices({
      currentSid: "A100001",
      profileIds: ["profile_admin"],
      grants: allGrants,
    });
  });

  test("canView is true for all screens", () => {
    const screens = ["loan.terms", "closing.main", "processing.main", "inquiry.notes"];
    screens.forEach((key) => {
      const { result } = renderHook(() => usePermission(key));
      expect(result.current.canView).toBe(true);
    });
  });

  test("canEdit is true for all screens", () => {
    const screens = ["loan.terms", "closing.main", "processing.main", "inquiry.notes"];
    screens.forEach((key) => {
      const { result } = renderHook(() => usePermission(key));
      expect(result.current.canEdit).toBe(true);
    });
  });
});

describe("usePermission — LOAN OFFICER profile (partial edit)", () => {
  beforeEach(() => {
    setupServices({
      currentSid: "A100002",
      profileIds: ["profile_lo"],
      grants: [
        // LO has VIEW + EDIT on inquiry, but only VIEW on processing/closing
        { profileId: "profile_lo", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_lo", entitlementId: "inquiry.notes.EDIT" },
        { profileId: "profile_lo", entitlementId: "processing.main.VIEW" },
        { profileId: "profile_lo", entitlementId: "closing.main.VIEW" },
      ],
    });
  });

  test("canView + canEdit true for inquiry.notes", () => {
    const { result } = renderHook(() => usePermission("inquiry.notes"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  test("canView true but canEdit false for processing.main", () => {
    const { result } = renderHook(() => usePermission("processing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("canView true but canEdit false for closing.main", () => {
    const { result } = renderHook(() => usePermission("closing.main"));
    expect(result.current.canView).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  test("both false for a screen with no access at all", () => {
    const { result } = renderHook(() => usePermission("admin.nonexistent"));
    expect(result.current.canView).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});

describe("usePermission — multiple profiles (union of grants)", () => {
  test("access is granted if ANY profile has the entitlement", () => {
    setupServices({
      currentSid: "A100010",
      profileIds: ["profile_lo", "profile_ca"],
      grants: [
        // LO has VIEW on inquiry; CA has EDIT on processing — no overlap
        { profileId: "profile_lo", entitlementId: "inquiry.notes.VIEW" },
        { profileId: "profile_ca", entitlementId: "processing.main.EDIT" },
        { profileId: "profile_ca", entitlementId: "processing.main.VIEW" },
      ],
    });

    // LO gives VIEW on inquiry.notes
    const { result: r1 } = renderHook(() => usePermission("inquiry.notes"));
    expect(r1.current.canView).toBe(true);
    expect(r1.current.canEdit).toBe(false); // LO has no EDIT on inquiry.notes here

    // CA gives both VIEW + EDIT on processing.main
    const { result: r2 } = renderHook(() => usePermission("processing.main"));
    expect(r2.current.canView).toBe(true);
    expect(r2.current.canEdit).toBe(true);
  });
});
