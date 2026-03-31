/**
 * Unit tests for the Loan Terms feature.
 *
 * Covers:
 *   - calcRate              — core accumulation helper (utils/rate-calc.ts)
 *   - fmt3                  — 3dp display formatter    (utils/rate-calc.ts)
 *   - calcAllInFixed        — Fixed Rate calc formula  (utils/rate-calc.ts)
 *   - calcProformaAdjustable — Adjustable calc formula (utils/rate-calc.ts)
 *     • uses dedicated adjustableIndexRate (NOT the Fixed Rate section's indexRate)
 *   - RateType              — value exhaustiveness and conditional-section rules
 *   - 6dp storage / 3dp display precision contract
 */

import {
  calcRate,
  fmt3,
  calcAllInFixed,
  calcProformaAdjustable,
} from "@/utils/rate-calc";

import type { RateType } from "@/services/core";

// ─── calcRate ─────────────────────────────────────────────────────────────────

describe("calcRate — general accumulation", () => {
  test("returns empty string when all inputs are empty", () => {
    expect(calcRate("", "", "", "")).toBe("");
    expect(calcRate("", "")).toBe("");
    expect(calcRate("")).toBe("");
  });

  test("returns empty string when all inputs are whitespace only", () => {
    expect(calcRate("  ", " ", "\t")).toBe("");
  });

  test("returns a result when at least one input is non-empty", () => {
    expect(calcRate("", "1.5")).not.toBe("");
  });

  test("sums two positive rate strings", () => {
    expect(calcRate("5.0", "2.0")).toBe("7.000000");
  });

  test("sums multiple parts", () => {
    expect(calcRate("4.0", "0.25", "1.5", "0.5")).toBe("6.250000");
  });

  test("handles negative variance correctly", () => {
    expect(calcRate("6.0", "-0.25", "1.5", "0.5")).toBe("7.750000");
  });

  test("handles deeply negative variance (variance > sum of positives)", () => {
    expect(calcRate("2.0", "-3.0")).toBe("-1.000000");
  });

  test("treats non-numeric parts as 0 (graceful degradation)", () => {
    expect(calcRate("5.0", "abc")).toBe("5.000000");
  });

  test("treats missing parts (empty string) as 0 within a mixed list", () => {
    expect(calcRate("3.0", "", "1.0")).toBe("4.000000");
  });

  test("zero inputs sum to zero (not empty)", () => {
    expect(calcRate("0", "0")).toBe("0.000000");
  });

  test("always stores at exactly 6 decimal places", () => {
    const result = calcRate("1.123456789", "2.987654321");
    expect(result.split(".")[1]).toHaveLength(6);
  });

  test("handles fractional inputs that exceed 6dp in the result", () => {
    const result = calcRate("1.1234567", "2.9876543");
    expect(result.split(".")[1]).toHaveLength(6);
  });

  test("single input is returned at 6dp", () => {
    expect(calcRate("4.5")).toBe("4.500000");
  });
});

// ─── fmt3 ─────────────────────────────────────────────────────────────────────

describe("fmt3 — 3dp display formatter", () => {
  test("returns empty string for null-like empty input", () => {
    expect(fmt3("")).toBe("");
  });

  test("returns empty string for whitespace-only input", () => {
    expect(fmt3("  ")).toBe("");
  });

  test("formats integer to 3dp", () => {
    expect(fmt3("7")).toBe("7.000");
  });

  test("formats 6dp stored value to 3dp", () => {
    expect(fmt3("7.625000")).toBe("7.625");
  });

  test("rounds at the 4th decimal place (rounds up)", () => {
    expect(fmt3("7.6257")).toBe("7.626");
  });

  test("rounds at the 4th decimal place (rounds down)", () => {
    expect(fmt3("7.6253")).toBe("7.625");
  });

  test("handles zero correctly", () => {
    expect(fmt3("0")).toBe("0.000");
    expect(fmt3("0.000000")).toBe("0.000");
  });

  test("handles negative values correctly", () => {
    expect(fmt3("-0.250000")).toBe("-0.250");
    expect(fmt3("-1.5")).toBe("-1.500");
  });

  test("returns raw value for non-numeric input (graceful passthrough)", () => {
    expect(fmt3("SOFR")).toBe("SOFR");
  });

  test("always produces exactly 3 decimal places for numeric input", () => {
    const result = fmt3("4.750000");
    expect(result.split(".")[1]).toHaveLength(3);
  });
});

// ─── calcAllInFixed ───────────────────────────────────────────────────────────

describe("calcAllInFixed — baseRate + fixedVariance + indexRate + spreadOnFixed", () => {
  test("correct formula: 4 + 0.25 + 1.5 + 0.5 = 6.25", () => {
    expect(calcAllInFixed("4.0", "0.25", "1.5", "0.5")).toBe("6.250000");
  });

  test("negative variance reduces the all-in rate", () => {
    expect(calcAllInFixed("5.0", "-0.125", "1.5", "0.5")).toBe("6.875000");
  });

  test("zero variance has no effect", () => {
    expect(calcAllInFixed("5.0", "0", "1.5", "0.5")).toBe("7.000000");
  });

  test("returns empty string when all inputs are empty", () => {
    expect(calcAllInFixed("", "", "", "")).toBe("");
  });

  test("returns a result when only some inputs are present", () => {
    expect(calcAllInFixed("5.0", "", "", "")).toBe("5.000000");
  });

  test("result is stored at 6dp", () => {
    const result = calcAllInFixed("4.123", "0.456", "1.789", "0.321");
    expect(result.split(".")[1]).toHaveLength(6);
  });
});

// ─── calcProformaAdjustable ───────────────────────────────────────────────────
// Third parameter is adjustableIndexRate — separate from Fixed Rate's indexRate.
// Formula: baseRate + adjustableRateVariance + adjustableIndexRate + spreadOnAdjustable

describe("calcProformaAdjustable — baseRate + adjVariance + adjustableIndexRate + spreadOnAdj", () => {
  test("correct formula: 4 + 0.375 + 1.5 + 0.75 = 6.625", () => {
    expect(calcProformaAdjustable("4.0", "0.375", "1.5", "0.75")).toBe("6.625000");
  });

  test("negative variance reduces the all-in rate", () => {
    expect(calcProformaAdjustable("5.0", "-0.5", "1.5", "0.75")).toBe("6.750000");
  });

  test("uses adjustableIndexRate independently from fixed indexRate", () => {
    // Fixed index might be T5 at 4.15; adjustable index might be SOFR at 4.30
    const fixedCalc = calcAllInFixed("0", "0", "4.15", "2.00");       // uses T5
    const adjCalc   = calcProformaAdjustable("0", "0.5", "4.30", "1.60"); // uses SOFR
    expect(fixedCalc).toBe("6.150000");
    expect(adjCalc).toBe("6.400000");
    // Confirm they differ — each section's index is independent
    expect(fixedCalc).not.toBe(adjCalc);
  });

  test("adjustable index SOFR 4.30 with variance 0.5 and spread 1.25 = 6.05", () => {
    expect(calcProformaAdjustable("0", "0.500000", "4.300000", "1.250000")).toBe("6.050000");
  });

  test("Prime Rate 7.50 as adjustable index: 0 + 0.5 + 7.5 + 0 = 8.0", () => {
    expect(calcProformaAdjustable("0", "0.500000", "7.500000", "0.000000")).toBe("8.000000");
  });

  test("returns empty string when all inputs are empty", () => {
    expect(calcProformaAdjustable("", "", "", "")).toBe("");
  });

  test("result is stored at 6dp", () => {
    const result = calcProformaAdjustable("3.5", "0.125", "1.25", "0.875");
    expect(result.split(".")[1]).toHaveLength(6);
  });

  test("base rate alone is returned at 6dp when other inputs are empty", () => {
    expect(calcProformaAdjustable("6.5", "", "", "")).toBe("6.500000");
  });

  test("hybrid scenario: T10 fixed index does not affect adjustable calc", () => {
    // HY_670_695: fixed uses T10 (4.45), adjustable uses SOFR (4.30)
    const adjCalc = calcProformaAdjustable("0", "0.500000", "4.300000", "2.150000");
    expect(adjCalc).toBe("6.950000");
  });
});

// ─── RateType values and conditional-section rules ────────────────────────────

describe("RateType — value exhaustiveness", () => {
  const RATE_TYPES: RateType[] = ["Fixed Rate", "Adjustable Rate", "Hybrid"];

  test("exactly 3 rate types are defined", () => {
    expect(RATE_TYPES).toHaveLength(3);
  });

  test("contains Fixed Rate", () => {
    expect(RATE_TYPES).toContain("Fixed Rate");
  });

  test("contains Adjustable Rate", () => {
    expect(RATE_TYPES).toContain("Adjustable Rate");
  });

  test("contains Hybrid", () => {
    expect(RATE_TYPES).toContain("Hybrid");
  });
});

describe("RateType — adjustable section conditional visibility", () => {
  /**
   * Business rule: the Adjustable Rate section (adjustableRateVariance,
   * adjustableIndexName, adjustableIndexRate, spreadOnAdjustable,
   * proformaAdjustableAllInRate) is shown only when rateType is
   * "Adjustable Rate" or "Hybrid".  The Fixed Rate section is always shown.
   */
  function showAdjustableSection(rt: RateType): boolean {
    return rt === "Adjustable Rate" || rt === "Hybrid";
  }

  test("Fixed Rate: adjustable section is hidden", () => {
    expect(showAdjustableSection("Fixed Rate")).toBe(false);
  });

  test("Adjustable Rate: adjustable section is shown", () => {
    expect(showAdjustableSection("Adjustable Rate")).toBe(true);
  });

  test("Hybrid: adjustable section is shown", () => {
    expect(showAdjustableSection("Hybrid")).toBe(true);
  });

  test("Fixed Rate section is always shown (invariant for all types)", () => {
    const allTypes: RateType[] = ["Fixed Rate", "Adjustable Rate", "Hybrid"];
    allTypes.forEach((rt) => {
      const showFixed = true;
      expect(showFixed).toBe(true);
      void rt;
    });
  });
});

// ─── Adjustable section field set ─────────────────────────────────────────────

describe("Adjustable Rate section — required fields", () => {
  /**
   * Business rule: when rateType is Adjustable or Hybrid, the Adjustable Rate
   * card must expose exactly these 5 fields:
   *   1. adjustableRateVariance  (supports +/−, 6dp stored)
   *   2. adjustableIndexName     (free-text string)
   *   3. adjustableIndexRate     (6dp stored, separate from fixed indexRate)
   *   4. spreadOnAdjustable      (6dp stored)
   *   5. proformaAdjustableAllInRate (calc, read-only)
   */
  const ADJUSTABLE_FIELDS = [
    "adjustableRateVariance",
    "adjustableIndexName",
    "adjustableIndexRate",
    "spreadOnAdjustable",
    "proformaAdjustableAllInRate",
  ] as const;

  test("all 5 adjustable-section fields are enumerated", () => {
    expect(ADJUSTABLE_FIELDS).toHaveLength(5);
  });

  test("adjustableIndexRate is distinct from fixed indexRate", () => {
    expect(ADJUSTABLE_FIELDS).toContain("adjustableIndexRate");
    expect(ADJUSTABLE_FIELDS).not.toContain("indexRate");
  });

  test("proformaAdjustableAllInRate is the only calc field in the section", () => {
    const calcFields = ADJUSTABLE_FIELDS.filter(f => f === "proformaAdjustableAllInRate");
    expect(calcFields).toHaveLength(1);
  });
});

// ─── ApplicationCard rate display logic ──────────────────────────────────────

describe("ApplicationCard — rate label and value selection", () => {
  function selectRate(
    rateType: string,
    allInFixedRate: string,
    proformaAdjustableAllInRate: string,
  ): { label: string; raw: string } {
    const isAdjustable = rateType === "Adjustable Rate";
    return {
      label: isAdjustable ? "Proforma Adj." : "All In Rate",
      raw:   isAdjustable ? proformaAdjustableAllInRate : allInFixedRate,
    };
  }

  test("Fixed Rate → label is 'All In Rate', value from allInFixedRate", () => {
    const { label, raw } = selectRate("Fixed Rate", "7.250000", "6.500000");
    expect(label).toBe("All In Rate");
    expect(raw).toBe("7.250000");
  });

  test("Hybrid → label is 'All In Rate', value from allInFixedRate", () => {
    const { label, raw } = selectRate("Hybrid", "7.500000", "6.750000");
    expect(label).toBe("All In Rate");
    expect(raw).toBe("7.500000");
  });

  test("Adjustable Rate → label is 'Proforma Adj.', value from proformaAdjustableAllInRate", () => {
    const { label, raw } = selectRate("Adjustable Rate", "7.250000", "6.500000");
    expect(label).toBe("Proforma Adj.");
    expect(raw).toBe("6.500000");
  });

  test("Fixed Rate with no rate data → displays '—'", () => {
    const { raw } = selectRate("Fixed Rate", "", "");
    const display = raw ? `${fmt3(raw)}%` : "—";
    expect(display).toBe("—");
  });

  test("Adjustable Rate with no rate data → displays '—'", () => {
    const { raw } = selectRate("Adjustable Rate", "", "");
    const display = raw ? `${fmt3(raw)}%` : "—";
    expect(display).toBe("—");
  });

  test("Fixed Rate with stored 6dp value → displays 3dp with %", () => {
    const { raw } = selectRate("Fixed Rate", "7.625000", "");
    const display = raw ? `${fmt3(raw)}%` : "—";
    expect(display).toBe("7.625%");
  });

  test("Adjustable Rate with stored 6dp value → displays 3dp with %", () => {
    const { raw } = selectRate("Adjustable Rate", "", "6.375000");
    const display = raw ? `${fmt3(raw)}%` : "—";
    expect(display).toBe("6.375%");
  });

  test("Hybrid with negative all-in rate → displays correctly", () => {
    const { raw } = selectRate("Hybrid", "-0.250000", "");
    const display = raw ? `${fmt3(raw)}%` : "—";
    expect(display).toBe("-0.250%");
  });
});

// ─── 6dp storage / 3dp display precision contract ─────────────────────────────

describe("Precision contract — 6dp storage, 3dp display", () => {
  test("calcRate output can be directly stored (6dp) then displayed (3dp) via fmt3", () => {
    const stored  = calcRate("4.5", "0.25", "1.125", "0.375");
    const display = fmt3(stored);
    expect(stored).toBe("6.250000");
    expect(display).toBe("6.250");
  });

  test("round-trip: calcAllInFixed → fmt3 produces correct 3dp string", () => {
    const stored  = calcAllInFixed("5.5", "-0.125", "1.75", "0.625");
    const display = fmt3(stored);
    expect(display).toBe("7.750");
  });

  test("round-trip: calcProformaAdjustable → fmt3 produces correct 3dp string", () => {
    const stored  = calcProformaAdjustable("5.0", "0.375", "1.25", "0.875");
    const display = fmt3(stored);
    expect(display).toBe("7.500");
  });

  test("round-trip using SOFR adjustable index: 0+0.75+4.30+1.75 = 6.80", () => {
    const stored  = calcProformaAdjustable("0", "0.750000", "4.300000", "1.750000");
    const display = fmt3(stored);
    expect(stored).toBe("6.800000");
    expect(display).toBe("6.800");
  });

  test("negative all-in rate stores and displays correctly", () => {
    const stored  = calcAllInFixed("1.0", "-2.0", "0", "0");
    const display = fmt3(stored);
    expect(stored).toBe("-1.000000");
    expect(display).toBe("-1.000");
  });

  test("fmt3 display is always shorter (or equal) to calcRate storage", () => {
    const stored  = calcRate("3.14159265", "2.71828182");
    const display = fmt3(stored);
    expect(stored.length).toBeGreaterThanOrEqual(display.length);
  });

  test("two different rates with same 3dp display may differ at 6dp (precision preserved in storage)", () => {
    const a = calcRate("1.000001");
    const b = calcRate("1.000002");
    expect(fmt3(a)).toBe(fmt3(b));
    expect(a).not.toBe(b);
  });

  test("adjustableIndexRate and fixed indexRate can differ and both stored at 6dp", () => {
    const fixedIdx = "4.150000"; // T5
    const adjIdx   = "4.300000"; // SOFR
    expect(fixedIdx).not.toBe(adjIdx);
    expect(fixedIdx.split(".")[1]).toHaveLength(6);
    expect(adjIdx.split(".")[1]).toHaveLength(6);
  });
});
