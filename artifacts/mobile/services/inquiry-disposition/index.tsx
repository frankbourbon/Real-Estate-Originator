import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Disposition record for Inquiry Canceled / Inquiry Withdrawn. One per applicationId. */
export type InquiryDispositionRecord = {
  applicationId: string;
  updatedAt: string;
  dispositionNote: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_inquiry_disposition_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }

// ─── Context ──────────────────────────────────────────────────────────────────

const [InquiryDispositionServiceProvider, useInquiryDispositionService] = createContextHook(() => {
  const [records, setRecords] = useState<InquiryDispositionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: InquiryDispositionRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreate = useCallback((applicationId: string): InquiryDispositionRecord => {
    return records.find((r) => r.applicationId === applicationId) ??
      { applicationId, updatedAt: now(), dispositionNote: "" };
  }, [records]);

  const update = useCallback(async (
    applicationId: string,
    patch: Partial<Omit<InquiryDispositionRecord, "applicationId">>,
  ) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) =>
        r.applicationId === applicationId ? { ...r, ...patch, updatedAt: now() } : r
      ));
    } else {
      await persist([...records, { applicationId, dispositionNote: "", ...patch, updatedAt: now() }]);
    }
  }, [records, persist]);

  const clearData = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const loadSeedData = useCallback(async () => {
    // No seed data for dispositions
  }, []);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return { records, loading, getOrCreate, update, clearData, loadSeedData, clearForApplication };
});

export { InquiryDispositionServiceProvider, useInquiryDispositionService };
