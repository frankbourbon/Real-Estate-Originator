import type { RentRollUnit, OperatingYear, UnitType } from "@/services/inquiry";

// ─── Unit type classification ─────────────────────────────────────────────────

export const MF_UNIT_TYPES: UnitType[] = [
  "Studio", "1BR/1BA", "1BR/1BA+Den",
  "2BR/1BA", "2BR/2BA", "2BR/2BA+Den",
  "3BR/2BA", "3BR/3BA", "Penthouse",
];

export const COMM_UNIT_TYPES: UnitType[] = [
  "Office", "Retail", "Industrial", "Other",
];

const MF_SET = new Set<UnitType>(MF_UNIT_TYPES);
const COMM_SET = new Set<UnitType>(COMM_UNIT_TYPES);

export function isMFUnitType(t: UnitType): boolean {
  return MF_SET.has(t);
}

export function isCommUnitType(t: UnitType): boolean {
  return COMM_SET.has(t);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhysicalOccupancyResult = {
  pct: number | null;           // 0–100 or null if no data
  occupied: number;             // units with status "Occupied"
  notice: number;               // units with status "Notice"
  total: number;                // total units in this segment
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

function calcPhysical(units: RentRollUnit[]): PhysicalOccupancyResult {
  if (units.length === 0) {
    return { pct: null, occupied: 0, notice: 0, total: 0, source: "none" };
  }
  const total = units.length;
  const occupied = units.filter((u) => u.leaseStatus === "Occupied").length;
  const notice = units.filter((u) => u.leaseStatus === "Notice").length;
  const pct = Math.round((occupied / total) * 10000) / 100;
  return { pct, occupied, notice, total, source: "rent-roll" };
}

// ─── Multifamily Physical Occupancy ───────────────────────────────────────────
//
// Applies only to Multifamily unit types (Studio, 1BR/1BA, etc.)
// Physical Occupancy = Occupied MF units ÷ Total MF units × 100

export function computeMFPhysicalOccupancy(
  rentRoll: RentRollUnit[],
): PhysicalOccupancyResult {
  return calcPhysical(rentRoll.filter((u) => isMFUnitType(u.unitType)));
}

// ─── Commercial Physical Occupancy ────────────────────────────────────────────
//
// Applies to all non-MF unit types (Office, Retail, Industrial, Other)
// Physical Occupancy = Occupied commercial units ÷ Total commercial units × 100

export function computeCommPhysicalOccupancy(
  rentRoll: RentRollUnit[],
): PhysicalOccupancyResult {
  return calcPhysical(rentRoll.filter((u) => isCommUnitType(u.unitType)));
}

// ─── Economic Occupancy ───────────────────────────────────────────────────────
//
// Economic Occupancy = EGI ÷ Gross Potential Rent × 100
// Source of truth: Most recent Operating Statement (preferring T12)
// EGI = Effective Gross Income (GPR minus vacancy/credit loss, plus other income)

const PERIOD_PRIORITY: Record<string, number> = {
  "T12 (Trailing 12)": 0,
  "Proforma": 1,
  "YTD": 2,
  "Actual Year 2": 3,
  "Actual Year 1": 4,
};

export function computeEconomicOccupancy(
  opHistory: OperatingYear[],
): EconomicOccupancyResult {
  if (opHistory.length === 0) {
    return { pct: null, egi: null, gpr: null, periodLabel: "", source: "none" };
  }

  const sorted = [...opHistory].sort((a, b) => {
    const pa = PERIOD_PRIORITY[a.periodType] ?? 99;
    const pb = PERIOD_PRIORITY[b.periodType] ?? 99;
    if (pa !== pb) return pa - pb;
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
