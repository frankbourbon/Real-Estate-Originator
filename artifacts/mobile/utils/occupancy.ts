import type { RentRollUnit, OperatingYear } from "@/services/inquiry";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhysicalOccupancyResult = {
  pct: number | null;           // 0–100 or null if no data
  occupied: number;             // units with status "Occupied"
  notice: number;               // units with status "Notice"
  total: number;                // total units in rent roll
  source: "rent-roll" | "none";
};

export type EconomicOccupancyResult = {
  pct: number | null;           // 0–100 or null if no data
  egi: number | null;           // effective gross income
  gpr: number | null;           // gross potential rent
  periodLabel: string;          // e.g. "T12 (Trailing 12)" or "Actual Year 2025"
  source: "operating-history" | "none";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: string | undefined | null): number {
  if (!v) return 0;
  return Number(String(v).replace(/,/g, "")) || 0;
}

// Priority order for selecting the most representative operating period
const PERIOD_PRIORITY: Record<string, number> = {
  "T12 (Trailing 12)": 0,
  "Lender Underwriting": 1,
  "Current Year Budget": 2,
  "Actual Year 2": 3,
  "Actual Year 1": 4,
};

// ─── Physical Occupancy ───────────────────────────────────────────────────────
//
// Physical Occupancy = Occupied units ÷ Total rentable units × 100
// Source of truth: Rent Roll (leaseStatus per unit)
// "Occupied" = tenant in place, paying rent
// "Notice"   = tenant still physically there but gave notice — shown separately

export function computePhysicalOccupancy(
  rentRoll: RentRollUnit[],
): PhysicalOccupancyResult {
  if (rentRoll.length === 0) {
    return { pct: null, occupied: 0, notice: 0, total: 0, source: "none" };
  }

  const total = rentRoll.length;
  const occupied = rentRoll.filter((u) => u.leaseStatus === "Occupied").length;
  const notice = rentRoll.filter((u) => u.leaseStatus === "Notice").length;

  const pct = total > 0 ? Math.round((occupied / total) * 10000) / 100 : null;

  return { pct, occupied, notice, total, source: "rent-roll" };
}

// ─── Economic Occupancy ───────────────────────────────────────────────────────
//
// Economic Occupancy = EGI ÷ Gross Potential Rent × 100
// Source of truth: Most recent Operating Statement (preferring T12)
// EGI = Effective Gross Income (GPR minus vacancy/credit loss, plus other income)

export function computeEconomicOccupancy(
  opHistory: OperatingYear[],
): EconomicOccupancyResult {
  if (opHistory.length === 0) {
    return { pct: null, egi: null, gpr: null, periodLabel: "", source: "none" };
  }

  // Pick the most representative period using priority order, then recency
  const sorted = [...opHistory].sort((a, b) => {
    const pa = PERIOD_PRIORITY[a.periodType] ?? 99;
    const pb = PERIOD_PRIORITY[b.periodType] ?? 99;
    if (pa !== pb) return pa - pb;
    // Same priority → prefer newer year
    return (b.periodYear ?? "").localeCompare(a.periodYear ?? "");
  });

  const best = sorted[0];
  const egi = parseNum(best.effectiveGrossIncome);
  const gpr = parseNum(best.grossPotentialRent);

  if (gpr === 0) {
    return { pct: null, egi, gpr: null, periodLabel: best.periodType, source: "operating-history" };
  }

  const pct = Math.round((egi / gpr) * 10000) / 100;
  const periodLabel = best.periodYear
    ? `${best.periodType} (${best.periodYear})`
    : best.periodType;

  return { pct, egi, gpr, periodLabel, source: "operating-history" };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

export function fmtCur(n: number | null): string {
  if (n === null || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
