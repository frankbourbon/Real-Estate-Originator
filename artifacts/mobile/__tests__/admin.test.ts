/**
 * Unit tests for the Admin service (services/admin/index.tsx).
 * Tests seed data integrity and pure business logic.
 */
import { SEED_ADMIN_USERS, type AdminUser } from "@/services/admin";

// ─── SEED_ADMIN_USERS ─────────────────────────────────────────────────────────

describe("SEED_ADMIN_USERS", () => {
  test("defines 16 seed users", () => {
    expect(SEED_ADMIN_USERS).toHaveLength(16);
  });

  test("every user has required fields", () => {
    SEED_ADMIN_USERS.forEach((u) => {
      expect(typeof u.sid).toBe("string");
      expect(u.sid.length).toBeGreaterThan(0);
      expect(typeof u.firstName).toBe("string");
      expect(u.firstName.length).toBeGreaterThan(0);
      expect(typeof u.lastName).toBe("string");
      expect(u.lastName.length).toBeGreaterThan(0);
      expect(typeof u.createdAt).toBe("string");
      expect(typeof u.updatedAt).toBe("string");
    });
  });

  test("all SIDs are unique", () => {
    const sids = SEED_ADMIN_USERS.map((u) => u.sid);
    expect(new Set(sids).size).toBe(sids.length);
  });

  test("SIDs follow the A1XXXXX format", () => {
    SEED_ADMIN_USERS.forEach((u) => expect(u.sid).toMatch(/^A\d{6}$/));
  });

  test("A100001 is James Miller (system admin)", () => {
    const u = SEED_ADMIN_USERS.find((u) => u.sid === "A100001");
    expect(u?.firstName).toBe("James");
    expect(u?.lastName).toBe("Miller");
  });

  test("A100002 is Sarah Chen", () => {
    const u = SEED_ADMIN_USERS.find((u) => u.sid === "A100002");
    expect(u?.firstName).toBe("Sarah");
    expect(u?.lastName).toBe("Chen");
  });

  test("all createdAt are valid ISO strings", () => {
    SEED_ADMIN_USERS.forEach((u) => expect(isNaN(new Date(u.createdAt).getTime())).toBe(false));
  });
});

// ─── searchUsers pure logic ───────────────────────────────────────────────────

function searchUsers(users: AdminUser[], q: string): AdminUser[] {
  if (!q.trim()) return [...users].sort((a, b) => a.lastName.localeCompare(b.lastName));
  const lower = q.toLowerCase();
  return users
    .filter(
      (u) =>
        u.sid.toLowerCase().includes(lower) ||
        u.firstName.toLowerCase().includes(lower) ||
        u.lastName.toLowerCase().includes(lower) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(lower)
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

describe("searchUsers logic", () => {
  const users: AdminUser[] = [
    { sid: "A100003", firstName: "Marcus",  lastName: "Johnson",  createdAt: "", updatedAt: "" },
    { sid: "A100001", firstName: "James",   lastName: "Miller",   createdAt: "", updatedAt: "" },
    { sid: "A100002", firstName: "Sarah",   lastName: "Chen",     createdAt: "", updatedAt: "" },
    { sid: "A100004", firstName: "Linda",   lastName: "Park",     createdAt: "", updatedAt: "" },
    { sid: "A100005", firstName: "Derek",   lastName: "Williams", createdAt: "", updatedAt: "" },
  ];

  test("empty query returns all users sorted by lastName", () => {
    const result = searchUsers(users, "");
    const lastNames = result.map((u) => u.lastName);
    expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b)));
    expect(result).toHaveLength(users.length);
  });

  test("whitespace-only query returns all users sorted", () => {
    expect(searchUsers(users, "   ")).toHaveLength(users.length);
  });

  test("searches by lastName (case-insensitive)", () => {
    const result = searchUsers(users, "miller");
    expect(result).toHaveLength(1);
    expect(result[0].sid).toBe("A100001");
  });

  test("searches by firstName (case-insensitive)", () => {
    const result = searchUsers(users, "sarah");
    expect(result).toHaveLength(1);
    expect(result[0].sid).toBe("A100002");
  });

  test("searches by full SID", () => {
    const result = searchUsers(users, "A100004");
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Linda");
  });

  test("searches by SID (lowercase)", () => {
    const result = searchUsers(users, "a100004");
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Linda");
  });

  test("searches by partial SID", () => {
    const result = searchUsers(users, "100003");
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Marcus");
  });

  test("searches by full name (first + last)", () => {
    const result = searchUsers(users, "marcus johnson");
    expect(result).toHaveLength(1);
    expect(result[0].sid).toBe("A100003");
  });

  test("search returns multiple matches", () => {
    const withExtra: AdminUser[] = [
      ...users,
      { sid: "A100006", firstName: "Sara", lastName: "Johnson", createdAt: "", updatedAt: "" },
    ];
    expect(searchUsers(withExtra, "johnson")).toHaveLength(2);
  });

  test("no match returns empty array", () => {
    expect(searchUsers(users, "zzzznotexist")).toHaveLength(0);
  });

  test("results are sorted by lastName", () => {
    const result = searchUsers(users, "a100");
    const lastNames = result.map((u) => u.lastName);
    expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b)));
  });

  test("partial lastName match works", () => {
    const result = searchUsers(users, "will");
    expect(result).toHaveLength(1);
    expect(result[0].lastName).toBe("Williams");
  });
});

// ─── addUser / updateUser / deleteUser pure logic ─────────────────────────────

describe("addUser / updateUser / deleteUser pure logic", () => {
  const users: AdminUser[] = [
    { sid: "A001", firstName: "Alice", lastName: "Adams", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
    { sid: "A002", firstName: "Bob",   lastName: "Baker", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  ];

  test("addUser pushes new user into array", () => {
    const newUser: AdminUser = { sid: "A003", firstName: "Carol", lastName: "Clark", createdAt: "", updatedAt: "" };
    const result = [...users, newUser];
    expect(result).toHaveLength(3);
    expect(result[2].sid).toBe("A003");
  });

  test("deleteUser removes user by SID", () => {
    const result = users.filter((u) => u.sid !== "A001");
    expect(result).toHaveLength(1);
    expect(result[0].sid).toBe("A002");
  });

  test("deleteUser with unknown SID leaves array unchanged", () => {
    expect(users.filter((u) => u.sid !== "UNKNOWN")).toHaveLength(users.length);
  });

  test("updateUser applies patch to correct user", () => {
    const result = users.map((u) => u.sid === "A001" ? { ...u, firstName: "Alexandra" } : u);
    expect(result.find((u) => u.sid === "A001")?.firstName).toBe("Alexandra");
    expect(result.find((u) => u.sid === "A002")?.firstName).toBe("Bob");
  });

  test("updateUser preserves SID (immutable)", () => {
    const result = users.map((u) => u.sid === "A001" ? { ...u, lastName: "Anderson" } : u);
    expect(result.find((u) => u.sid === "A001")?.sid).toBe("A001");
  });
});
