/**
 * Unit tests for the amortization calculator (utils/amortization.ts).
 * All functions are pure — no mocking required.
 */
import {
  computeNoteRate,
  buildAmortSchedule,
  type RateBuildUp,
  type BuildScheduleParams,
} from "@/utils/amortization";

// ─── computeNoteRate ──────────────────────────────────────────────────────────

describe("computeNoteRate", () => {
  test("no discounts: rate = index + spread", () => {
    const bu: RateBuildUp = {
      indexName: "SOFR",
      indexRatePct: 5.25,
      spreadPct: 2.0,
      discounts: [],
    };
    expect(computeNoteRate(bu)).toBeCloseTo(7.25, 5);
  });

  test("single discount reduces rate correctly", () => {
    const bu: RateBuildUp = {
      indexName: "Prime",
      indexRatePct: 8.5,
      spreadPct: 1.5,
      discounts: [{ id: "d1", label: "Relationship", ratePct: 0.25 }],
    };
    expect(computeNoteRate(bu)).toBeCloseTo(9.75, 5);
  });

  test("multiple discounts are summed and subtracted", () => {
    const bu: RateBuildUp = {
      indexName: "5-Yr Treasury",
      indexRatePct: 4.5,
      spreadPct: 2.25,
      discounts: [
        { id: "d1", label: "Relationship", ratePct: 0.25 },
        { id: "d2", label: "Origination",  ratePct: 0.10 },
      ],
    };
    // 4.5 + 2.25 - 0.25 - 0.10 = 6.40
    expect(computeNoteRate(bu)).toBeCloseTo(6.40, 5);
  });

  test("zero spread with zero discounts returns index rate", () => {
    const bu: RateBuildUp = {
      indexName: "SOFR",
      indexRatePct: 5.0,
      spreadPct: 0,
      discounts: [],
    };
    expect(computeNoteRate(bu)).toBeCloseTo(5.0, 5);
  });

  test("discounts can theoretically exceed rate (returns negative)", () => {
    const bu: RateBuildUp = {
      indexName: "SOFR",
      indexRatePct: 1.0,
      spreadPct: 0.5,
      discounts: [{ id: "d1", label: "Big", ratePct: 2.0 }],
    };
    // 1.0 + 0.5 - 2.0 = -0.5
    expect(computeNoteRate(bu)).toBeCloseTo(-0.5, 5);
  });
});

// ─── buildAmortSchedule — helpers ─────────────────────────────────────────────

const FIXED_DATE = new Date("2025-01-01");

function baseParams(overrides?: Partial<BuildScheduleParams>): BuildScheduleParams {
  return {
    loanAmountUsd: 1_000_000,
    noteRatePct: 6,
    loanTermYears: 10,
    amortizationYears: 30,
    dayCountConvention: "30/360",
    amortizationType: "Full Amortizing",
    startDate: FIXED_DATE,
    ...overrides,
  };
}

// ─── buildAmortSchedule — row count ───────────────────────────────────────────

describe("buildAmortSchedule — schedule length", () => {
  test("10-year term produces exactly 120 rows", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 10 }));
    expect(rows).toHaveLength(120);
  });

  test("5-year term produces exactly 60 rows", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 5 }));
    expect(rows).toHaveLength(60);
  });

  test("1-year term produces exactly 12 rows", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 1 }));
    expect(rows).toHaveLength(12);
  });

  test("row periods start at 1 and are sequential", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 3 }));
    rows.forEach((row, idx) => {
      expect(row.period).toBe(idx + 1);
    });
  });
});

// ─── buildAmortSchedule — row structure ───────────────────────────────────────

describe("buildAmortSchedule — row invariants", () => {
  test("beginBalance of period N+1 equals endBalance of period N", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 5 }));
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i + 1].beginBalance).toBeCloseTo(rows[i].endBalance, 2);
    }
  });

  test("payment = interest + principal for every row", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 5 }));
    rows.forEach((row) => {
      expect(row.payment).toBeCloseTo(row.interest + row.principal, 6);
    });
  });

  test("endBalance = beginBalance - principal for every row", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 5 }));
    rows.forEach((row) => {
      expect(row.endBalance).toBeCloseTo(row.beginBalance - row.principal, 6);
    });
  });

  test("all balances are non-negative", () => {
    const { rows } = buildAmortSchedule(baseParams({ loanTermYears: 10 }));
    rows.forEach((row) => {
      expect(row.beginBalance).toBeGreaterThanOrEqual(0);
      expect(row.endBalance).toBeGreaterThanOrEqual(0);
    });
  });

  test("first row beginBalance equals loan amount", () => {
    const { rows } = buildAmortSchedule(baseParams());
    expect(rows[0].beginBalance).toBeCloseTo(1_000_000, 2);
  });
});

// ─── buildAmortSchedule — 30/360 specific ─────────────────────────────────────

describe("buildAmortSchedule — 30/360 day count", () => {
  test("all rows have exactly 30 days in period", () => {
    const { rows } = buildAmortSchedule(baseParams({ dayCountConvention: "30/360" }));
    rows.forEach((row) => {
      expect(row.daysInPeriod).toBe(30);
    });
  });

  test("monthly payment is consistent throughout the schedule (full amortizing)", () => {
    const { rows } = buildAmortSchedule(baseParams({
      loanTermYears: 30,
      amortizationYears: 30,
      dayCountConvention: "30/360",
    }));
    // All rows except the last should have nearly the same payment (within $0.01)
    const firstPayment = rows[0].payment;
    rows.slice(0, -1).forEach((row) => {
      expect(row.payment).toBeCloseTo(firstPayment, 2);
    });
  });
});

// ─── buildAmortSchedule — Actual/360 ─────────────────────────────────────────

describe("buildAmortSchedule — Actual/360 day count", () => {
  test("daysInPeriod is actual calendar days (not always 30)", () => {
    const start = new Date("2025-01-01");
    const { rows } = buildAmortSchedule(baseParams({
      dayCountConvention: "Actual/360",
      startDate: start,
    }));
    // Jan→Feb: 31 days; Feb→Mar: 28 days (2025 is not a leap year)
    expect(rows[0].daysInPeriod).toBe(31); // Jan 1 → Feb 1
    expect(rows[1].daysInPeriod).toBe(28); // Feb 1 → Mar 1
  });

  test("interest is higher in months with more days", () => {
    const start = new Date("2025-01-01");
    const { rows } = buildAmortSchedule(baseParams({
      dayCountConvention: "Actual/360",
      startDate: start,
      loanTermYears: 1,
    }));
    // Jan (31 days) should have more interest than Feb (28 days)
    expect(rows[0].interest).toBeGreaterThan(rows[1].interest);
  });
});

// ─── buildAmortSchedule — Interest Only ───────────────────────────────────────

describe("buildAmortSchedule — Interest Only", () => {
  test("principal is 0 for all non-terminal rows", () => {
    const { rows } = buildAmortSchedule(baseParams({
      amortizationType: "Interest Only",
      loanTermYears: 5,
    }));
    rows.slice(0, -1).forEach((row) => {
      expect(row.principal).toBe(0);
    });
  });

  test("last row repays the full loan balance (balloon)", () => {
    const loan = 2_000_000;
    const { rows } = buildAmortSchedule(baseParams({
      loanAmountUsd: loan,
      amortizationType: "Interest Only",
      loanTermYears: 5,
    }));
    const lastRow = rows[rows.length - 1];
    expect(lastRow.principal).toBeCloseTo(loan, 0);
  });

  test("end balance is 0 after the final payment", () => {
    const { rows } = buildAmortSchedule(baseParams({
      amortizationType: "Interest Only",
      loanTermYears: 5,
    }));
    expect(rows[rows.length - 1].endBalance).toBeCloseTo(0, 2);
  });

  test("balance remains constant through IO period (all non-terminal rows)", () => {
    const loan = 1_000_000;
    const { rows } = buildAmortSchedule(baseParams({
      loanAmountUsd: loan,
      amortizationType: "Interest Only",
      loanTermYears: 3,
    }));
    rows.slice(0, -1).forEach((row) => {
      expect(row.beginBalance).toBeCloseTo(loan, 2);
    });
  });
});

// ─── buildAmortSchedule — Partial IO ─────────────────────────────────────────

describe("buildAmortSchedule — Partial IO", () => {
  test("principal is 0 during IO period then positive during amortizing period", () => {
    const { rows } = buildAmortSchedule(baseParams({
      amortizationType: "Partial IO",
      ioMonths: 12,
      loanTermYears: 5,
      amortizationYears: 30,
    }));
    // First 12 rows: IO (principal = 0, except possibly last row if term is short)
    rows.slice(0, 12).forEach((row) => {
      if (row.period < 12) {
        expect(row.principal).toBe(0);
      }
    });
    // Rows after IO period (13+): principal should be positive
    rows.slice(12, -1).forEach((row) => {
      expect(row.principal).toBeGreaterThan(0);
    });
  });

  test("balance at end of IO period equals original loan amount", () => {
    const loan = 1_500_000;
    const { rows } = buildAmortSchedule(baseParams({
      loanAmountUsd: loan,
      amortizationType: "Partial IO",
      ioMonths: 24,
      loanTermYears: 7,
      amortizationYears: 30,
    }));
    // After 24 IO months, balance should still be the original amount
    const afterIO = rows[23];
    expect(afterIO.endBalance).toBeCloseTo(loan, 0);
  });
});

// ─── buildAmortSchedule — Full Amortizing ─────────────────────────────────────

describe("buildAmortSchedule — Full Amortizing", () => {
  test("total principal equals original loan amount (self-amortizing)", () => {
    const loan = 1_000_000;
    const { rows, summary } = buildAmortSchedule({
      loanAmountUsd: loan,
      noteRatePct: 5,
      loanTermYears: 30,
      amortizationYears: 30,
      dayCountConvention: "30/360",
      amortizationType: "Full Amortizing",
      startDate: FIXED_DATE,
    });
    expect(summary.totalPrincipal).toBeCloseTo(loan, 0);
  });

  test("end balance of last row is ~0 for self-amortizing loan", () => {
    const { rows } = buildAmortSchedule({
      loanAmountUsd: 500_000,
      noteRatePct: 7,
      loanTermYears: 20,
      amortizationYears: 20,
      dayCountConvention: "30/360",
      amortizationType: "Full Amortizing",
      startDate: FIXED_DATE,
    });
    expect(rows[rows.length - 1].endBalance).toBeLessThan(0.01);
  });

  test("balloon exists when term < amortization period", () => {
    const { summary } = buildAmortSchedule(baseParams({
      loanTermYears: 10,
      amortizationYears: 30,
      amortizationType: "Full Amortizing",
    }));
    expect(summary.balloon).toBeGreaterThan(0);
  });

  test("no balloon when term equals amortization period", () => {
    const { summary } = buildAmortSchedule(baseParams({
      loanTermYears: 30,
      amortizationYears: 30,
      amortizationType: "Full Amortizing",
    }));
    expect(summary.balloon).toBeCloseTo(0, 0);
  });
});

// ─── buildAmortSchedule — Summary ─────────────────────────────────────────────

describe("buildAmortSchedule — summary", () => {
  test("summary.noteRatePct reflects the input rate", () => {
    const { summary } = buildAmortSchedule(baseParams({ noteRatePct: 5.75 }));
    expect(summary.noteRatePct).toBe(5.75);
  });

  test("summary.monthlyPayment equals first row payment", () => {
    const { rows, summary } = buildAmortSchedule(baseParams({ loanTermYears: 5 }));
    expect(summary.monthlyPayment).toBeCloseTo(rows[0].payment, 6);
  });

  test("summary.totalPayments = totalInterest + totalPrincipal", () => {
    const { summary } = buildAmortSchedule(baseParams({ loanTermYears: 10 }));
    expect(summary.totalPayments).toBeCloseTo(
      summary.totalInterest + summary.totalPrincipal, 2
    );
  });

  test("totalInterest > 0 when rate > 0", () => {
    const { summary } = buildAmortSchedule(baseParams({ noteRatePct: 5 }));
    expect(summary.totalInterest).toBeGreaterThan(0);
  });

  test("totalInterest = 0 when rate = 0", () => {
    const { summary } = buildAmortSchedule(baseParams({
      noteRatePct: 0,
      loanTermYears: 10,
      amortizationYears: 10,
    }));
    expect(summary.totalInterest).toBeCloseTo(0, 2);
  });

  test("higher rate produces more total interest", () => {
    const low  = buildAmortSchedule(baseParams({ noteRatePct: 4 }));
    const high = buildAmortSchedule(baseParams({ noteRatePct: 8 }));
    expect(high.summary.totalInterest).toBeGreaterThan(low.summary.totalInterest);
  });

  test("longer amortization produces more total interest", () => {
    const short = buildAmortSchedule(baseParams({ loanTermYears: 15, amortizationYears: 15 }));
    const long  = buildAmortSchedule(baseParams({ loanTermYears: 30, amortizationYears: 30 }));
    expect(long.summary.totalInterest).toBeGreaterThan(short.summary.totalInterest);
  });
});

// ─── buildAmortSchedule — edge cases ─────────────────────────────────────────

describe("buildAmortSchedule — edge cases", () => {
  test("zero rate loan: payment = principal only, no interest", () => {
    const loan = 120_000;
    const { rows } = buildAmortSchedule(baseParams({
      loanAmountUsd: loan,
      noteRatePct: 0,
      loanTermYears: 10,
      amortizationYears: 10,
    }));
    rows.slice(0, -1).forEach((row) => {
      expect(row.interest).toBeCloseTo(0, 6);
    });
  });

  test("very small loan ($1) completes without NaN or Infinity", () => {
    const { rows, summary } = buildAmortSchedule(baseParams({
      loanAmountUsd: 1,
      loanTermYears: 1,
      amortizationYears: 1,
    }));
    rows.forEach((row) => {
      expect(isNaN(row.payment)).toBe(false);
      expect(isFinite(row.payment)).toBe(true);
    });
    expect(isNaN(summary.totalInterest)).toBe(false);
  });

  test("very large loan ($500M) completes without NaN", () => {
    const { summary } = buildAmortSchedule(baseParams({
      loanAmountUsd: 500_000_000,
      loanTermYears: 10,
      amortizationYears: 30,
    }));
    expect(isNaN(summary.totalInterest)).toBe(false);
    expect(summary.totalInterest).toBeGreaterThan(0);
  });

  test("1-month IO period with 12-month term: final row is balloon", () => {
    const loan = 100_000;
    const { rows } = buildAmortSchedule(baseParams({
      loanAmountUsd: loan,
      amortizationType: "Partial IO",
      ioMonths: 1,
      loanTermYears: 1,
      amortizationYears: 30,
    }));
    // Only 12 rows
    expect(rows).toHaveLength(12);
    // Last row should have large principal (balloon)
    expect(rows[rows.length - 1].principal).toBeGreaterThan(0);
  });
});
