// ─── Types ────────────────────────────────────────────────────────────────────

export type DayCountConvention = "30/360" | "Actual/360";

export type RateDiscount = {
  id: string;
  label: string;   // e.g. "Relationship Discount", "Origination Discount"
  ratePct: number; // deducted from note rate, e.g. 0.25
};

export type RateBuildUp = {
  indexName: string;   // e.g. "SOFR", "Prime", "5-Yr Treasury"
  indexRatePct: number; // base index rate
  spreadPct: number;    // credit spread added to index
  discounts: RateDiscount[]; // zero or more rate reductions
};

export type AmortRow = {
  period: number;
  date: Date;
  beginBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endBalance: number;
  daysInPeriod: number;
};

export type AmortSummary = {
  noteRatePct: number;
  totalPayments: number;
  totalInterest: number;
  totalPrincipal: number;
  monthlyPayment: number; // representative first payment
  balloon: number;        // remaining balance at end of term (if any)
};

// ─── Rate build-up ────────────────────────────────────────────────────────────

/**
 * Note rate = Index Rate + Spread − Σ(Discounts)
 */
export function computeNoteRate(buildUp: RateBuildUp): number {
  const totalDiscounts = buildUp.discounts.reduce((sum, d) => sum + d.ratePct, 0);
  return buildUp.indexRatePct + buildUp.spreadPct - totalDiscounts;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/** Actual calendar days between two dates */
function actualDaysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// ─── Amortization schedule ────────────────────────────────────────────────────

export type BuildScheduleParams = {
  loanAmountUsd: number;
  noteRatePct: number;           // annual note rate (%)
  loanTermYears: number;         // how many years before maturity / balloon
  amortizationYears?: number;    // amortization period (defaults to loanTermYears)
  dayCountConvention: DayCountConvention;
  amortizationType: "Full Amortizing" | "Interest Only" | "Partial IO";
  ioMonths?: number;             // only used for "Partial IO"
  startDate?: Date;
};

export function buildAmortSchedule(params: BuildScheduleParams): {
  rows: AmortRow[];
  summary: AmortSummary;
} {
  const {
    loanAmountUsd,
    noteRatePct,
    loanTermYears,
    dayCountConvention,
    amortizationType,
    ioMonths = 0,
    startDate = new Date(),
  } = params;

  const annualRate = noteRatePct / 100;
  const termMonths = Math.round(loanTermYears * 12);
  const amortYears = params.amortizationYears ?? loanTermYears;
  const amortMonths = Math.round(amortYears * 12);

  const rows: AmortRow[] = [];

  // ── Compute the base amortizing payment (30/360 PMT formula) ───────────────
  // For Actual/360 we still use this as the target principal reduction payment;
  // interest is then computed on actual days.
  const monthlyRate30360 = annualRate / 12;
  const amortPayment30360 =
    monthlyRate30360 === 0
      ? loanAmountUsd / amortMonths
      : (loanAmountUsd * monthlyRate30360) /
        (1 - Math.pow(1 + monthlyRate30360, -amortMonths));

  let balance = loanAmountUsd;
  let date = new Date(startDate);

  for (let i = 1; i <= termMonths; i++) {
    const nextDate = addMonths(date, 1);
    const isLastPeriod = i === termMonths;

    // ── Interest calculation (varies by day-count convention) ───────────────
    let daysInPeriod: number;
    let periodicRate: number;

    if (dayCountConvention === "Actual/360") {
      daysInPeriod = actualDaysBetween(date, nextDate);
      periodicRate = (annualRate * daysInPeriod) / 360;
    } else {
      // 30/360: each month is exactly 30 days, year is 360 days
      daysInPeriod = 30;
      periodicRate = annualRate / 12; // = annualRate * 30 / 360
    }

    const interest = balance * periodicRate;

    // ── Principal calculation ────────────────────────────────────────────────
    let principal: number;
    let payment: number;

    const isIOPeriod =
      amortizationType === "Interest Only" ||
      (amortizationType === "Partial IO" && i <= ioMonths);

    if (isLastPeriod) {
      // Balloon: repay whatever is left
      principal = balance;
      payment = interest + principal;
    } else if (isIOPeriod) {
      principal = 0;
      payment = interest;
    } else {
      // Amortizing period: principal = PMT − interest (floored at 0)
      principal = Math.max(0, Math.min(amortPayment30360 - interest, balance));
      payment = interest + principal;
    }

    const endBalance = Math.max(0, balance - principal);

    rows.push({
      period: i,
      date: new Date(date),
      beginBalance: balance,
      payment,
      interest,
      principal,
      endBalance,
      daysInPeriod,
    });

    balance = endBalance;
    date = nextDate;

    if (balance < 0.005) break; // fully paid off (floating point safety)
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalPayments = rows.reduce((s, r) => s + r.payment, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
  const lastRow = rows[rows.length - 1];
  // Balloon = the outstanding principal just before maturity (beginBalance of
  // the last period). For self-amortizing loans (term == amortization) this is
  // effectively 0 (the tiny rounding residual). For balloon loans (term <
  // amortization) it is the lump-sum owed at maturity.
  const balloon = amortMonths > termMonths ? (lastRow?.beginBalance ?? 0) : 0;

  const summary: AmortSummary = {
    noteRatePct,
    totalPayments,
    totalInterest,
    totalPrincipal,
    monthlyPayment: rows[0]?.payment ?? 0,
    balloon,
  };

  return { rows, summary };
}
