import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** phase is a plain string matching ApplicationStatus values — no cross-service import. */
export type LoanTask = {
  id: string;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  phase: string;
  title: string;
  description: string;
  isComplete: boolean;
  isCustom: boolean;
  completedAt: string;
  sortOrder: number;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_tasks_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }

// No seed tasks — tasks are seeded lazily when each application's task screen is opened.

// ─── Context ──────────────────────────────────────────────────────────────────

const [TasksServiceProvider, useTasksService] = createContextHook(() => {
  const [tasks, setTasks] = useState<LoanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setTasks(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: LoanTask[]) => {
    setTasks(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getTasksForApplication = useCallback((applicationId: string) =>
    tasks.filter((t) => t.applicationId === applicationId), [tasks]);

  const getTasksForPhase = useCallback((applicationId: string, phase: string) =>
    tasks.filter((t) => t.applicationId === applicationId && t.phase === phase), [tasks]);

  const addTask = useCallback(async (
    applicationId: string,
    phase: string,
    data: Pick<LoanTask, "title" | "description" | "isCustom" | "sortOrder">
  ): Promise<LoanTask> => {
    const task: LoanTask = {
      id: uid(), applicationId, phase, createdAt: now(), updatedAt: now(),
      isComplete: false, completedAt: "", ...data,
    };
    await persist([...tasks, task]);
    return task;
  }, [tasks, persist]);

  /** Batch-seed tasks (from phase checklist) — only if none exist for that app+phase. */
  const seedTasksForPhase = useCallback(async (
    applicationId: string,
    phase: string,
    items: Array<{ title: string; description: string; sortOrder: number }>
  ) => {
    const existing = tasks.filter((t) => t.applicationId === applicationId && t.phase === phase);
    if (existing.length > 0) return;
    const newTasks: LoanTask[] = items.map((item) => ({
      id: uid(), applicationId, phase, createdAt: now(), updatedAt: now(),
      isComplete: false, isCustom: false, completedAt: "", ...item,
    }));
    await persist([...tasks, ...newTasks]);
  }, [tasks, persist]);

  const toggleTask = useCallback(async (id: string) => {
    await persist(tasks.map((t) => {
      if (t.id !== id) return t;
      const isComplete = !t.isComplete;
      return { ...t, isComplete, completedAt: isComplete ? now() : "", updatedAt: now() };
    }));
  }, [tasks, persist]);

  const updateTask = useCallback(async (id: string, patch: Partial<LoanTask>) => {
    await persist(tasks.map((t) => t.id === id ? { ...t, ...patch, updatedAt: now() } : t));
  }, [tasks, persist]);

  const deleteTask = useCallback(async (id: string) => {
    await persist(tasks.filter((t) => t.id !== id));
  }, [tasks, persist]);

  const loadSeedData = useCallback(async () => {
    // Tasks are seeded lazily per application — nothing to seed globally
  }, []);

  const clearData = useCallback(async () => { await persist([]); }, [persist]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(tasks.filter((t) => t.applicationId !== applicationId));
  }, [tasks, persist]);

  return {
    loading,
    getTasksForApplication, getTasksForPhase,
    addTask, seedTasksForPhase, toggleTask, updateTask, deleteTask,
    loadSeedData, clearData, clearForApplication,
  };
});

export { TasksServiceProvider, useTasksService };
