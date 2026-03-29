import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** FK reference to either a Borrower or a Property record. */
export type AppliesToRef = {
  kind: "borrower" | "property";
  id: string;
};

export const FILE_TYPES = [
  "Appraisal Report",
  "Environmental Report",
  "Financial Statement",
  "Tax Return",
  "Rent Roll",
  "Operating Statement",
  "Lease Agreement",
  "Title Report",
  "Insurance Certificate",
  "Legal Document",
  "Survey",
  "Inspection Report",
  "Loan Agreement",
  "Guaranty",
  "Other",
] as const;

export type FileType = (typeof FILE_TYPES)[number] | string;

/** serviceTag identifies which phase/screen this attachment belongs to (optional). */
export type Attachment = {
  id: string;
  applicationId: string;
  serviceTag: string;           // e.g. "final-credit-review", "closing", "" for general
  name: string;
  uri: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  // ── Additional metadata ──
  fileType: string;             // document category / classification
  formNumber: string;           // e.g. "IRS 4506-C", "Fannie 1003"
  appliesTo: AppliesToRef[];    // FK refs to borrower(s) and/or property(ies)
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_documents_v3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }

function migrate(raw: unknown[]): Attachment[] {
  return raw.map((d: any) => ({
    fileType: "",
    formNumber: "",
    appliesTo: [],
    ...d,
  }));
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
// No attachments in seed data — users add these manually.
const SEED_DOCUMENTS: Attachment[] = [];

// ─── Context ──────────────────────────────────────────────────────────────────

const [DocumentsServiceProvider, useDocumentsService] = createContextHook(() => {
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setDocuments(migrate(JSON.parse(raw)));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: Attachment[]) => {
    setDocuments(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getDocuments = useCallback((applicationId: string, serviceTag?: string) => {
    const appDocs = documents.filter((d) => d.applicationId === applicationId);
    if (serviceTag !== undefined) return appDocs.filter((d) => d.serviceTag === serviceTag);
    return appDocs;
  }, [documents]);

  const addDocument = useCallback(async (
    applicationId: string,
    data: Omit<Attachment, "id" | "applicationId" | "uploadedAt">
  ): Promise<Attachment> => {
    const doc: Attachment = {
      id: uid(), applicationId, uploadedAt: now(), ...data,
    };
    await persist([...documents, doc]);
    return doc;
  }, [documents, persist]);

  const deleteDocument = useCallback(async (id: string) => {
    await persist(documents.filter((d) => d.id !== id));
  }, [documents, persist]);

  const loadSeedData = useCallback(async () => {
    await persist(SEED_DOCUMENTS);
  }, [persist]);

  const clearData = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(documents.filter((d) => d.applicationId !== applicationId));
  }, [documents, persist]);

  return {
    loading,
    getDocuments,
    addDocument, deleteDocument,
    loadSeedData, clearData, clearForApplication,
  };
});

export { DocumentsServiceProvider, useDocumentsService };
