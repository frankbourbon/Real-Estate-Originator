import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** serviceTag identifies which phase/screen this comment belongs to (optional). */
export type Comment = {
  id: string;
  applicationId: string;
  serviceTag: string;         // e.g. "inquiry", "final-credit-review", "" for general
  parentCommentId: string | null;
  text: string;
  author: string;
  createdAt: string;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_comments_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_COMMENTS: Comment[] = [
  { id: "seed_c01a", applicationId: "seed_a01", serviceTag: "", parentCommentId: null,
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,14),
    text: "Initial call with borrower went well. Strong equity position and long track record in Philly office market." },
  { id: "seed_c02a", applicationId: "seed_a02", serviceTag: "", parentCommentId: null,
    author: "Alan Morse (Credit Risk)", createdAt: d(2026,3,5),
    text: "LOI issued 3/5. Waiting on borrower to review terms and execute." },
  { id: "seed_c02b", applicationId: "seed_a02", serviceTag: "", parentCommentId: "seed_c02a",
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,6),
    text: "Borrower confirmed receipt. Expects to sign by 3/12." },
  { id: "seed_c03a", applicationId: "seed_a03", serviceTag: "", parentCommentId: null,
    author: "Jennifer Walsh (Sales)", createdAt: d(2026,3,10),
    text: "Deposit received 3/8. Debit auth also signed. Kicking off application package." },
  { id: "seed_c04a", applicationId: "seed_a04", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,1),
    text: "Appraisal ordered 3/1 with Pacific Valuation Group. Est. completion 3/28." },
  { id: "seed_c04b", applicationId: "seed_a04", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,8),
    text: "Phase I Environmental ordered. Awaiting site access confirmation." },
  { id: "seed_c05a", applicationId: "seed_a05", serviceTag: "final-credit-review", parentCommentId: null,
    author: "Alan Morse (Credit Risk)", createdAt: d(2026,3,18),
    text: "Credit memo drafted and under review with CRO. Appraisal came in at $25.1M — slightly above purchase price. Good news." },
  { id: "seed_c05b", applicationId: "seed_a05", serviceTag: "final-credit-review", parentCommentId: "seed_c05a",
    author: "Priya Nair (CRO)", createdAt: d(2026,3,19),
    text: "Reviewed. Floating rate exception approved. Proceeding to CL recommendation." },
  { id: "seed_c06a", applicationId: "seed_a06", serviceTag: "pre-close", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,20),
    text: "HMDA nearly complete — missing census tract. Requesting from GIS team." },
  { id: "seed_c07a", applicationId: "seed_a07", serviceTag: "ready-for-docs", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,15),
    text: "All third-party items confirmed. Title report clean. Ready to request docs." },
  { id: "seed_c08a", applicationId: "seed_a08", serviceTag: "docs-drawn", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,18),
    text: "Loan documents generated and sent to borrower's counsel. Expecting execution by 3/22." },
  { id: "seed_c09a", applicationId: "seed_a09", serviceTag: "docs-back", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,20),
    text: "Signed docs received from borrower's counsel 3/20. Title confirmed. Ready to wire." },
  { id: "seed_c10a", applicationId: "seed_a10", serviceTag: "closing", parentCommentId: null,
    author: "Marcus Hill (Closing)", createdAt: d(2026,3,21),
    text: "Wire instructions verified with borrower via phone. Funding scheduled for 3/24 at 10am ET." },
  { id: "seed_c10b", applicationId: "seed_a10", serviceTag: "closing", parentCommentId: "seed_c10a",
    author: "Priya Nair (CRO)", createdAt: d(2026,3,21),
    text: "Confirmed. Notify servicing team to book to portfolio once wire confirms." },
  { id: "seed_c12a", applicationId: "seed_a12", serviceTag: "processing", parentCommentId: null,
    author: "Lisa Park (Processing)", createdAt: d(2026,3,5),
    text: "Appraisal ordered 3/5. Will take ~3 weeks. Borrower packaging financial statements." },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [CommentsServiceProvider, useCommentsService] = createContextHook(() => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setComments(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: Comment[]) => {
    setComments(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getComments = useCallback((applicationId: string, serviceTag?: string) => {
    const appComments = comments.filter((c) => c.applicationId === applicationId);
    if (serviceTag !== undefined) return appComments.filter((c) => c.serviceTag === serviceTag);
    return appComments;
  }, [comments]);

  const addComment = useCallback(async (
    applicationId: string,
    text: string,
    author: string,
    parentCommentId: string | null = null,
    serviceTag: string = ""
  ): Promise<Comment> => {
    const comment: Comment = {
      id: uid(), applicationId, serviceTag, parentCommentId, text, author, createdAt: now(),
    };
    await persist([...comments, comment]);
    return comment;
  }, [comments, persist]);

  const updateComment = useCallback(async (id: string, text: string) => {
    await persist(comments.map((c) => c.id === id ? { ...c, text } : c));
  }, [comments, persist]);

  const deleteComment = useCallback(async (id: string) => {
    // Delete comment and all replies
    const toDelete = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      toDelete.add(cur);
      comments.filter((c) => c.parentCommentId === cur).forEach((c) => queue.push(c.id));
    }
    await persist(comments.filter((c) => !toDelete.has(c.id)));
  }, [comments, persist]);

  const loadSeedData = useCallback(async () => {
    await persist(SEED_COMMENTS);
  }, [persist]);

  const clearData = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(comments.filter((c) => c.applicationId !== applicationId));
  }, [comments, persist]);

  return {
    loading,
    getComments,
    addComment, updateComment, deleteComment,
    loadSeedData, clearData, clearForApplication,
  };
});

export { CommentsServiceProvider, useCommentsService };
