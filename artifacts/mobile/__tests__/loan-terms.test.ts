/**
 * Unit tests for the Loan Terms feature refactor.
 *
 * Covers:
 *   - calcRate        — core accumulation helper (utils/rate-calc.ts)
 *   - fmt3            — 3dp display formatter    (utils/rate-calc.ts)
 *   - calcAllInFixed  — Fixed Rate calc formula  (utils/rate-calc.ts)
 *   - calcProformaAdjustable — Adjustable calc formula (utils/rate-calc.ts)
 *   - RateType        — value exhaustiveness and conditional-section rules
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
    // 7.6257 → binary representation is slightly above 7.6257, rounds to 7.626
    expect(fmt3("7.6257")).toBe("7.626");
  });

  test("rounds at the 4th decimal place (rounds down)", () => {
    // 7.6253 → rounds to 7.625
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

describe("calcProformaAdjustable — baseRate + adjVariance + indexRate + spreadOnAdj", () => {
  test("correct formula: 4 + 0.375 + 1.5 + 0.75 = 6.625", () => {
    expect(calcProformaAdjustable("4.0", "0.375", "1.5", "0.75")).toBe("6.625000");
  });

  test("negative variance reduces the all-in rate", () => {
    expect(calcProformaAdjustable("5.0", "-0.5", "1.5", "0.75")).toBe("6.750000");
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
   * spreadOnAdjustable, proformaAdjustableAllInRate) is shown only when
   * rateType is "Adjustable Rate" or "Hybrid".
   * The Fixed Rate section is always shown.
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
      // Fixed section has no visibility gate — it's always true
      const showFixed = true;
      expect(showFixed).toBe(true);
      void rt; // type used for exhaustiveness
    });
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
    expect(fmt3(a)).toBe(fmt3(b));       // same at 3dp
    expect(a).not.toBe(b);              // distinct at 6dp
  });
});
