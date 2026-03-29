import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Global employee registry. SID is the natural primary key.
 * Deleting or updating a user here does NOT cascade to any loan-level data —
 * loan team members store a denormalized copy (adminSid is a soft reference only).
 */
export type AdminUser = {
  sid: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_admin_users_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const d = "2024-01-01T00:00:00.000Z";

export const SEED_ADMIN_USERS: AdminUser[] = [
  { sid: "A100001", firstName: "James",    lastName: "Miller",    createdAt: d, updatedAt: d },
  { sid: "A100002", firstName: "Sarah",    lastName: "Chen",      createdAt: d, updatedAt: d },
  { sid: "A100003", firstName: "Marcus",   lastName: "Johnson",   createdAt: d, updatedAt: d },
  { sid: "A100004", firstName: "Linda",    lastName: "Park",      createdAt: d, updatedAt: d },
  { sid: "A100005", firstName: "Derek",    lastName: "Williams",  createdAt: d, updatedAt: d },
  { sid: "A100006", firstName: "Amanda",   lastName: "Torres",    createdAt: d, updatedAt: d },
  { sid: "A100007", firstName: "Kevin",    lastName: "Smith",     createdAt: d, updatedAt: d },
  { sid: "A100008", firstName: "Rachel",   lastName: "Brown",     createdAt: d, updatedAt: d },
  { sid: "A100009", firstName: "Brian",    lastName: "Davis",     createdAt: d, updatedAt: d },
  { sid: "A100010", firstName: "Patricia", lastName: "Wilson",    createdAt: d, updatedAt: d },
  { sid: "A100011", firstName: "Michael",  lastName: "Lee",       createdAt: d, updatedAt: d },
  { sid: "A100012", firstName: "Jessica",  lastName: "Martinez",  createdAt: d, updatedAt: d },
  { sid: "A100013", firstName: "Thomas",   lastName: "Anderson",  createdAt: d, updatedAt: d },
  { sid: "A100014", firstName: "Claire",   lastName: "Robinson",  createdAt: d, updatedAt: d },
  { sid: "A100015", firstName: "David",    lastName: "Kim",       createdAt: d, updatedAt: d },
  { sid: "A100016", firstName: "Nicole",   lastName: "Patel",     createdAt: d, updatedAt: d },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [AdminServiceProvider, useAdminService] = createContextHook(() => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setUsers(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: AdminUser[]) => {
    setUsers(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getUser = useCallback(
    (sid: string) => users.find((u) => u.sid === sid),
    [users]
  );

  const searchUsers = useCallback(
    (q: string): AdminUser[] => {
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
    },
    [users]
  );

  const addUser = useCallback(
    async (data: Omit<AdminUser, "createdAt" | "updatedAt">): Promise<AdminUser> => {
      const user: AdminUser = { ...data, createdAt: now(), updatedAt: now() };
      await persist([...users, user]);
      return user;
    },
    [users, persist]
  );

  const updateUser = useCallback(
    async (sid: string, patch: Partial<Omit<AdminUser, "sid" | "createdAt">>) => {
      await persist(
        users.map((u) => (u.sid === sid ? { ...u, ...patch, updatedAt: now() } : u))
      );
    },
    [users, persist]
  );

  const deleteUser = useCallback(
    async (sid: string) => {
      await persist(users.filter((u) => u.sid !== sid));
    },
    [users, persist]
  );

  const loadSeedData = useCallback(async () => {
    await persist(SEED_ADMIN_USERS);
  }, [persist]);

  const clearData = useCallback(async () => {
    await persist([]);
  }, [persist]);

  return {
    users,
    loading,
    getUser,
    searchUsers,
    addUser,
    updateUser,
    deleteUser,
    loadSeedData,
    clearData,
  };
});

export { AdminServiceProvider, useAdminService };
