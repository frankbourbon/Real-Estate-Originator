import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnvironmentalStatus = "" | "Ordered" | "In Progress" | "Clear" | "Issues Found";
export type BorrowerFormsStatus = "" | "Not Started" | "Packaged" | "Sent for Signature" | "Received";

/**
 * Application MS — covers Application Start and Application Processing stages.
 * Both stages are owned by the same team and progress sequentially.
 * One record per applicationId.
 */
export type ApplicationRecord = {
  applicationId: string;
  updatedAt: string;
  // ── Application Start ──
  applicationDepositAmountUsd: string;
  applicationDepositDate: string;
  signedLoiDate: string;
  debitAuthorizationDate: string;
  rateLockEnabled: boolean;
  rateLockRatePct: string;
  rateLockExpirationDate: string;
  // ── Application Processing ──
  appraisalOrderedDate: string;
  appraisalCompletedDate: string;
  appraisalValueUsd: string;
  environmentalStatus: EnvironmentalStatus;
  borrowerFormsStatus: BorrowerFormsStatus;
};

// ─── Storage Key ──────────────────────────────────────────────────────────────

const KEY = "svc_application_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }
function d(y: number, m: number, day: number): string { return new Date(y, m - 1, day).toISOString(); }
function ds(y: number, m: number, day: number): string {
  return `${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}/${y}`;
}

// ─── Empty record factory ─────────────────────────────────────────────────────

function emptyRecord(applicationId: string): ApplicationRecord {
  return {
    applicationId, updatedAt: now(),
    applicationDepositAmountUsd: "", applicationDepositDate: "",
    signedLoiDate: "", debitAuthorizationDate: "",
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "",
  };
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS: ApplicationRecord[] = [
  { applicationId: "seed_a03", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,3,8),
    signedLoiDate: ds(2026,3,2), debitAuthorizationDate: ds(2026,3,8),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a04", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,2,20),
    signedLoiDate: ds(2026,2,15), debitAuthorizationDate: ds(2026,2,20),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,3,1), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a05", updatedAt: d(2026,3,19),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,5),
    signedLoiDate: ds(2026,2,3), debitAuthorizationDate: ds(2026,2,5),
    rateLockEnabled: true, rateLockRatePct: "7.10", rateLockExpirationDate: ds(2026,5,15),
    appraisalOrderedDate: ds(2026,2,8), appraisalCompletedDate: ds(2026,3,5),
    appraisalValueUsd: "25,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a06", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,20),
    signedLoiDate: ds(2026,1,15), debitAuthorizationDate: ds(2026,1,20),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,4,30),
    appraisalOrderedDate: ds(2026,1,22), appraisalCompletedDate: ds(2026,2,18),
    appraisalValueUsd: "15,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a07", updatedAt: d(2026,3,15),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,12,18),
    signedLoiDate: ds(2025,12,15), debitAuthorizationDate: ds(2025,12,18),
    rateLockEnabled: true, rateLockRatePct: "7.45", rateLockExpirationDate: ds(2026,4,30),
    appraisalOrderedDate: ds(2026,1,5), appraisalCompletedDate: ds(2026,2,10),
    appraisalValueUsd: "52,000,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a08", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "50,000", applicationDepositDate: ds(2025,11,25),
    signedLoiDate: ds(2025,11,20), debitAuthorizationDate: ds(2025,11,25),
    rateLockEnabled: true, rateLockRatePct: "5.95", rateLockExpirationDate: ds(2026,4,15),
    appraisalOrderedDate: ds(2025,12,1), appraisalCompletedDate: ds(2026,1,12),
    appraisalValueUsd: "53,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a09", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,11,10),
    signedLoiDate: ds(2025,11,5), debitAuthorizationDate: ds(2025,11,10),
    rateLockEnabled: true, rateLockRatePct: "6.15", rateLockExpirationDate: ds(2026,4,1),
    appraisalOrderedDate: ds(2025,11,12), appraisalCompletedDate: ds(2025,12,20),
    appraisalValueUsd: "30,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a10", updatedAt: d(2026,3,21),
    applicationDepositAmountUsd: "75,000", applicationDepositDate: ds(2025,10,20),
    signedLoiDate: ds(2025,10,15), debitAuthorizationDate: ds(2025,10,20),
    rateLockEnabled: true, rateLockRatePct: "5.85", rateLockExpirationDate: ds(2026,4,1),
    appraisalOrderedDate: ds(2025,10,22), appraisalCompletedDate: ds(2025,12,5),
    appraisalValueUsd: "76,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a12", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,3,1),
    signedLoiDate: ds(2026,2,28), debitAuthorizationDate: ds(2026,3,1),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,3,5), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "Ordered", borrowerFormsStatus: "Packaged" },
  // ── a35–a43: Application Start ────────────────────────────────────────────
  { applicationId: "seed_a35", updatedAt: d(2026,3,14),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,3,4),
    signedLoiDate: ds(2026,3,1), debitAuthorizationDate: ds(2026,3,4),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a36", updatedAt: d(2026,3,12),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,3,2),
    signedLoiDate: ds(2026,2,28), debitAuthorizationDate: ds(2026,3,2),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a37", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,28),
    signedLoiDate: ds(2026,2,25), debitAuthorizationDate: ds(2026,2,28),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Not Started" },
  { applicationId: "seed_a38", updatedAt: d(2026,3,8),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,2,26),
    signedLoiDate: ds(2026,2,22), debitAuthorizationDate: ds(2026,2,26),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: "", appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a39", updatedAt: d(2026,3,6),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,2,24),
    signedLoiDate: ds(2026,2,20), debitAuthorizationDate: ds(2026,2,24),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,3,1), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "Ordered", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a40", updatedAt: d(2026,3,4),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,2,22),
    signedLoiDate: ds(2026,2,18), debitAuthorizationDate: ds(2026,2,22),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,25), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "Ordered", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a41", updatedAt: d(2026,3,2),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,20),
    signedLoiDate: ds(2026,2,16), debitAuthorizationDate: ds(2026,2,20),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,24), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Packaged" },
  { applicationId: "seed_a42", updatedAt: d(2026,2,28),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,2,18),
    signedLoiDate: ds(2026,2,14), debitAuthorizationDate: ds(2026,2,18),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,22), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Sent for Signature" },
  { applicationId: "seed_a43", updatedAt: d(2026,2,25),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,2,16),
    signedLoiDate: ds(2026,2,12), debitAuthorizationDate: ds(2026,2,16),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,20), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Sent for Signature" },
  // ── a44–a50: Application Processing ──────────────────────────────────────
  { applicationId: "seed_a44", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,2,12),
    signedLoiDate: ds(2026,2,8), debitAuthorizationDate: ds(2026,2,12),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,15), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a45", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2026,2,10),
    signedLoiDate: ds(2026,2,6), debitAuthorizationDate: ds(2026,2,10),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,14), appraisalCompletedDate: "", appraisalValueUsd: "",
    environmentalStatus: "In Progress", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a46", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,2,8),
    signedLoiDate: ds(2026,2,4), debitAuthorizationDate: ds(2026,2,8),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,12), appraisalCompletedDate: ds(2026,3,12),
    appraisalValueUsd: "10,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a47", updatedAt: d(2026,3,14),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,2,6),
    signedLoiDate: ds(2026,2,2), debitAuthorizationDate: ds(2026,2,6),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,10), appraisalCompletedDate: ds(2026,3,10),
    appraisalValueUsd: "11,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a48", updatedAt: d(2026,3,12),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,2,4),
    signedLoiDate: ds(2026,1,31), debitAuthorizationDate: ds(2026,2,4),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,8), appraisalCompletedDate: ds(2026,3,8),
    appraisalValueUsd: "7,300,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a49", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,2,2),
    signedLoiDate: ds(2026,1,29), debitAuthorizationDate: ds(2026,2,2),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,6), appraisalCompletedDate: ds(2026,3,6),
    appraisalValueUsd: "18,600,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a50", updatedAt: d(2026,3,8),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,30),
    signedLoiDate: ds(2026,1,26), debitAuthorizationDate: ds(2026,1,30),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,2,3), appraisalCompletedDate: ds(2026,3,4),
    appraisalValueUsd: "17,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a51–a58: Final Credit Review ──────────────────────────────────────────
  { applicationId: "seed_a51", updatedAt: d(2026,3,22),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,1,22),
    signedLoiDate: ds(2026,1,18), debitAuthorizationDate: ds(2026,1,22),
    rateLockEnabled: true, rateLockRatePct: "6.90", rateLockExpirationDate: ds(2026,5,22),
    appraisalOrderedDate: ds(2026,1,25), appraisalCompletedDate: ds(2026,2,26),
    appraisalValueUsd: "22,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a52", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,20),
    signedLoiDate: ds(2026,1,16), debitAuthorizationDate: ds(2026,1,20),
    rateLockEnabled: true, rateLockRatePct: "6.75", rateLockExpirationDate: ds(2026,5,20),
    appraisalOrderedDate: ds(2026,1,23), appraisalCompletedDate: ds(2026,2,24),
    appraisalValueUsd: "10,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a53", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,18),
    signedLoiDate: ds(2026,1,14), debitAuthorizationDate: ds(2026,1,18),
    rateLockEnabled: true, rateLockRatePct: "6.80", rateLockExpirationDate: ds(2026,5,18),
    appraisalOrderedDate: ds(2026,1,21), appraisalCompletedDate: ds(2026,2,22),
    appraisalValueUsd: "12,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a54", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2026,1,16),
    signedLoiDate: ds(2026,1,12), debitAuthorizationDate: ds(2026,1,16),
    rateLockEnabled: true, rateLockRatePct: "6.65", rateLockExpirationDate: ds(2026,5,16),
    appraisalOrderedDate: ds(2026,1,19), appraisalCompletedDate: ds(2026,2,20),
    appraisalValueUsd: "24,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a55", updatedAt: d(2026,3,14),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2026,1,14),
    signedLoiDate: ds(2026,1,10), debitAuthorizationDate: ds(2026,1,14),
    rateLockEnabled: true, rateLockRatePct: "6.95", rateLockExpirationDate: ds(2026,5,14),
    appraisalOrderedDate: ds(2026,1,16), appraisalCompletedDate: ds(2026,2,18),
    appraisalValueUsd: "13,400,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a56", updatedAt: d(2026,3,12),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,1,10),
    signedLoiDate: ds(2026,1,6), debitAuthorizationDate: ds(2026,1,10),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,5,10),
    appraisalOrderedDate: ds(2026,1,13), appraisalCompletedDate: ds(2026,2,16),
    appraisalValueUsd: "25,600,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a57", updatedAt: d(2026,3,10),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2026,1,8),
    signedLoiDate: ds(2026,1,4), debitAuthorizationDate: ds(2026,1,8),
    rateLockEnabled: true, rateLockRatePct: "6.70", rateLockExpirationDate: ds(2026,5,8),
    appraisalOrderedDate: ds(2026,1,11), appraisalCompletedDate: ds(2026,2,14),
    appraisalValueUsd: "18,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a58", updatedAt: d(2026,3,8),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2026,1,4),
    signedLoiDate: ds(2025,12,31), debitAuthorizationDate: ds(2026,1,4),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2026,1,7), appraisalCompletedDate: ds(2026,2,12),
    appraisalValueUsd: "8,700,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a59–a65: Pre-close ────────────────────────────────────────────────────
  { applicationId: "seed_a59", updatedAt: d(2026,3,25),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,12,24),
    signedLoiDate: ds(2025,12,20), debitAuthorizationDate: ds(2025,12,24),
    rateLockEnabled: true, rateLockRatePct: "6.80", rateLockExpirationDate: ds(2026,4,24),
    appraisalOrderedDate: ds(2025,12,26), appraisalCompletedDate: ds(2026,2,4),
    appraisalValueUsd: "6,900,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a60", updatedAt: d(2026,3,22),
    applicationDepositAmountUsd: "30,000", applicationDepositDate: ds(2025,12,20),
    signedLoiDate: ds(2025,12,16), debitAuthorizationDate: ds(2025,12,20),
    rateLockEnabled: true, rateLockRatePct: "6.40", rateLockExpirationDate: ds(2026,4,20),
    appraisalOrderedDate: ds(2025,12,22), appraisalCompletedDate: ds(2026,2,1),
    appraisalValueUsd: "34,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a61", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,12,16),
    signedLoiDate: ds(2025,12,12), debitAuthorizationDate: ds(2025,12,16),
    rateLockEnabled: true, rateLockRatePct: "6.95", rateLockExpirationDate: ds(2026,4,16),
    appraisalOrderedDate: ds(2025,12,18), appraisalCompletedDate: ds(2026,1,28),
    appraisalValueUsd: "16,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a62", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,12,12),
    signedLoiDate: ds(2025,12,8), debitAuthorizationDate: ds(2025,12,12),
    rateLockEnabled: true, rateLockRatePct: "7.10", rateLockExpirationDate: ds(2026,4,12),
    appraisalOrderedDate: ds(2025,12,14), appraisalCompletedDate: ds(2026,1,24),
    appraisalValueUsd: "8,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a63", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,12,8),
    signedLoiDate: ds(2025,12,4), debitAuthorizationDate: ds(2025,12,8),
    rateLockEnabled: true, rateLockRatePct: "6.75", rateLockExpirationDate: ds(2026,4,8),
    appraisalOrderedDate: ds(2025,12,10), appraisalCompletedDate: ds(2026,1,20),
    appraisalValueUsd: "28,600,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a64", updatedAt: d(2026,3,14),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,12,4),
    signedLoiDate: ds(2025,11,30), debitAuthorizationDate: ds(2025,12,4),
    rateLockEnabled: true, rateLockRatePct: "6.85", rateLockExpirationDate: ds(2026,4,4),
    appraisalOrderedDate: ds(2025,12,6), appraisalCompletedDate: ds(2026,1,16),
    appraisalValueUsd: "16,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a65", updatedAt: d(2026,3,12),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,11,30),
    signedLoiDate: ds(2025,11,26), debitAuthorizationDate: ds(2025,11,30),
    rateLockEnabled: true, rateLockRatePct: "6.90", rateLockExpirationDate: ds(2026,3,30),
    appraisalOrderedDate: ds(2025,12,2), appraisalCompletedDate: ds(2026,1,12),
    appraisalValueUsd: "8,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a66–a72: Ready for Docs ───────────────────────────────────────────────
  { applicationId: "seed_a66", updatedAt: d(2026,3,28),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,11,22),
    signedLoiDate: ds(2025,11,18), debitAuthorizationDate: ds(2025,11,22),
    rateLockEnabled: true, rateLockRatePct: "6.95", rateLockExpirationDate: ds(2026,3,22),
    appraisalOrderedDate: ds(2025,11,24), appraisalCompletedDate: ds(2026,1,8),
    appraisalValueUsd: "5,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a67", updatedAt: d(2026,3,26),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2025,11,18),
    signedLoiDate: ds(2025,11,14), debitAuthorizationDate: ds(2025,11,18),
    rateLockEnabled: true, rateLockRatePct: "6.65", rateLockExpirationDate: ds(2026,3,18),
    appraisalOrderedDate: ds(2025,11,20), appraisalCompletedDate: ds(2026,1,4),
    appraisalValueUsd: "12,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a68", updatedAt: d(2026,3,24),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,11,14),
    signedLoiDate: ds(2025,11,10), debitAuthorizationDate: ds(2025,11,14),
    rateLockEnabled: true, rateLockRatePct: "7.00", rateLockExpirationDate: ds(2026,3,14),
    appraisalOrderedDate: ds(2025,11,16), appraisalCompletedDate: ds(2025,12,30),
    appraisalValueUsd: "6,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a69", updatedAt: d(2026,3,22),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,11,10),
    signedLoiDate: ds(2025,11,6), debitAuthorizationDate: ds(2025,11,10),
    rateLockEnabled: true, rateLockRatePct: "6.80", rateLockExpirationDate: ds(2026,3,10),
    appraisalOrderedDate: ds(2025,11,12), appraisalCompletedDate: ds(2025,12,26),
    appraisalValueUsd: "22,400,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a70", updatedAt: d(2026,3,20),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,11,6),
    signedLoiDate: ds(2025,11,2), debitAuthorizationDate: ds(2025,11,6),
    rateLockEnabled: true, rateLockRatePct: "6.95", rateLockExpirationDate: ds(2026,3,6),
    appraisalOrderedDate: ds(2025,11,8), appraisalCompletedDate: ds(2025,12,22),
    appraisalValueUsd: "17,500,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a71", updatedAt: d(2026,3,18),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,11,2),
    signedLoiDate: ds(2025,10,29), debitAuthorizationDate: ds(2025,11,2),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,3,2),
    appraisalOrderedDate: ds(2025,11,4), appraisalCompletedDate: ds(2025,12,18),
    appraisalValueUsd: "23,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a72", updatedAt: d(2026,3,16),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,10,28),
    signedLoiDate: ds(2025,10,24), debitAuthorizationDate: ds(2025,10,28),
    rateLockEnabled: true, rateLockRatePct: "7.05", rateLockExpirationDate: ds(2026,2,28),
    appraisalOrderedDate: ds(2025,10,30), appraisalCompletedDate: ds(2025,12,14),
    appraisalValueUsd: "7,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a73–a76: Docs Drawn ───────────────────────────────────────────────────
  { applicationId: "seed_a73", updatedAt: d(2026,3,30),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,10,18),
    signedLoiDate: ds(2025,10,14), debitAuthorizationDate: ds(2025,10,18),
    rateLockEnabled: true, rateLockRatePct: "6.80", rateLockExpirationDate: ds(2026,2,18),
    appraisalOrderedDate: ds(2025,10,20), appraisalCompletedDate: ds(2025,12,6),
    appraisalValueUsd: "19,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a74", updatedAt: d(2026,3,28),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,10,14),
    signedLoiDate: ds(2025,10,10), debitAuthorizationDate: ds(2025,10,14),
    rateLockEnabled: true, rateLockRatePct: "6.40", rateLockExpirationDate: ds(2026,2,14),
    appraisalOrderedDate: ds(2025,10,16), appraisalCompletedDate: ds(2025,12,2),
    appraisalValueUsd: "19,400,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a75", updatedAt: d(2026,3,26),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,10,10),
    signedLoiDate: ds(2025,10,6), debitAuthorizationDate: ds(2025,10,10),
    rateLockEnabled: true, rateLockRatePct: "6.70", rateLockExpirationDate: ds(2026,2,10),
    appraisalOrderedDate: ds(2025,10,12), appraisalCompletedDate: ds(2025,11,28),
    appraisalValueUsd: "19,700,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a76", updatedAt: d(2026,3,24),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2025,10,6),
    signedLoiDate: ds(2025,10,2), debitAuthorizationDate: ds(2025,10,6),
    rateLockEnabled: true, rateLockRatePct: "6.85", rateLockExpirationDate: ds(2026,2,6),
    appraisalOrderedDate: ds(2025,10,8), appraisalCompletedDate: ds(2025,11,24),
    appraisalValueUsd: "9,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a77–a80: Docs Back ────────────────────────────────────────────────────
  { applicationId: "seed_a77", updatedAt: d(2026,3,31),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,9,28),
    signedLoiDate: ds(2025,9,24), debitAuthorizationDate: ds(2025,9,28),
    rateLockEnabled: true, rateLockRatePct: "6.90", rateLockExpirationDate: ds(2026,1,28),
    appraisalOrderedDate: ds(2025,9,30), appraisalCompletedDate: ds(2025,11,16),
    appraisalValueUsd: "8,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a78", updatedAt: d(2026,3,29),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,9,24),
    signedLoiDate: ds(2025,9,20), debitAuthorizationDate: ds(2025,9,24),
    rateLockEnabled: true, rateLockRatePct: "6.45", rateLockExpirationDate: ds(2026,1,24),
    appraisalOrderedDate: ds(2025,9,26), appraisalCompletedDate: ds(2025,11,12),
    appraisalValueUsd: "25,800,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a79", updatedAt: d(2026,3,27),
    applicationDepositAmountUsd: "25,000", applicationDepositDate: ds(2025,9,20),
    signedLoiDate: ds(2025,9,16), debitAuthorizationDate: ds(2025,9,20),
    rateLockEnabled: true, rateLockRatePct: "6.65", rateLockExpirationDate: ds(2026,1,20),
    appraisalOrderedDate: ds(2025,9,22), appraisalCompletedDate: ds(2025,11,8),
    appraisalValueUsd: "26,700,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a80", updatedAt: d(2026,3,25),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,9,16),
    signedLoiDate: ds(2025,9,12), debitAuthorizationDate: ds(2025,9,16),
    rateLockEnabled: true, rateLockRatePct: "6.75", rateLockExpirationDate: ds(2026,1,16),
    appraisalOrderedDate: ds(2025,9,18), appraisalCompletedDate: ds(2025,11,4),
    appraisalValueUsd: "7,200,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  // ── a81–a84: Closing ──────────────────────────────────────────────────────
  { applicationId: "seed_a81", updatedAt: d(2026,3,31),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,9,6),
    signedLoiDate: ds(2025,9,2), debitAuthorizationDate: ds(2025,9,6),
    rateLockEnabled: true, rateLockRatePct: "6.85", rateLockExpirationDate: ds(2026,1,6),
    appraisalOrderedDate: ds(2025,9,8), appraisalCompletedDate: ds(2025,10,24),
    appraisalValueUsd: "2,700,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a82", updatedAt: d(2026,3,30),
    applicationDepositAmountUsd: "20,000", applicationDepositDate: ds(2025,9,2),
    signedLoiDate: ds(2025,8,29), debitAuthorizationDate: ds(2025,9,2),
    rateLockEnabled: true, rateLockRatePct: "6.55", rateLockExpirationDate: ds(2026,1,2),
    appraisalOrderedDate: ds(2025,9,4), appraisalCompletedDate: ds(2025,10,20),
    appraisalValueUsd: "17,900,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a83", updatedAt: d(2026,3,29),
    applicationDepositAmountUsd: "15,000", applicationDepositDate: ds(2025,8,28),
    signedLoiDate: ds(2025,8,24), debitAuthorizationDate: ds(2025,8,28),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2025,8,30), appraisalCompletedDate: ds(2025,10,16),
    appraisalValueUsd: "11,400,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
  { applicationId: "seed_a84", updatedAt: d(2026,3,28),
    applicationDepositAmountUsd: "10,000", applicationDepositDate: ds(2025,8,24),
    signedLoiDate: ds(2025,8,20), debitAuthorizationDate: ds(2025,8,24),
    rateLockEnabled: false, rateLockRatePct: "", rateLockExpirationDate: "",
    appraisalOrderedDate: ds(2025,8,26), appraisalCompletedDate: ds(2025,10,12),
    appraisalValueUsd: "4,100,000", environmentalStatus: "Clear", borrowerFormsStatus: "Received" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const [ApplicationServiceProvider, useApplicationService] = createContextHook(() => {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setRecords(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (data: ApplicationRecord[]) => {
    setRecords(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  }, []);

  const getOrCreateApplication = useCallback((applicationId: string): ApplicationRecord => {
    return records.find((r) => r.applicationId === applicationId) ?? emptyRecord(applicationId);
  }, [records]);

  const updateApplication = useCallback(async (applicationId: string, patch: Partial<ApplicationRecord>) => {
    const existing = records.find((r) => r.applicationId === applicationId);
    if (existing) {
      await persist(records.map((r) => r.applicationId === applicationId
        ? { ...r, ...patch, updatedAt: now() } : r));
    } else {
      await persist([...records, { ...emptyRecord(applicationId), ...patch }]);
    }
  }, [records, persist]);

  const loadSeedData = useCallback(async () => { await persist(SEED_RECORDS); }, [persist]);
  const clearData = useCallback(async () => { await persist([]); }, [persist]);
  const clearForApplication = useCallback(async (applicationId: string) => {
    await persist(records.filter((r) => r.applicationId !== applicationId));
  }, [records, persist]);

  return {
    loading,
    getOrCreateApplication, updateApplication,
    loadSeedData, clearData, clearForApplication,
  };
});

export { ApplicationServiceProvider, useApplicationService };
