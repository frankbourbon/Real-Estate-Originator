/**
 * Pure rate-pricing utilities shared by loan.tsx and tested by loan-terms.test.ts.
 *
 * Storage precision:  6 decimal places
 * Display precision:  3 decimal places
 */

/**
 * Sum one or more string rate parts and return the result at 6dp.
 * Returns "" when every input is empty (no data entered yet).
 * Non-numeric parts are treated as 0 (graceful degradation).
 */
export function calcRate(...parts: string[]): string {
  if (parts.every((p) => p.trim() === "")) return "";
  const result = parts.reduce((acc, p) => acc + (parseFloat(p) || 0), 0);
  return result.toFixed(6);
}

/**
 * Format a stored rate string for display at 3dp.
 * Returns "" for empty / missing values; returns the raw string for non-numeric input.
 */
export function fmt3(val: string): string {
  if (!val || val.trim() === "") return "";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toFixed(3);
}

/**
 * Compute the All In Fixed Rate component.
 * Formula: baseRate + fixedRateVariance + indexRate + spreadOnFixed
 */
export function calcAllInFixed(
  baseRate: string,
  fixedRateVariance: string,
  indexRate: string,
  spreadOnFixed: string,
): string {
  return calcRate(baseRate, fixedRateVariance, indexRate, spreadOnFixed);
}

/**
 * Compute the Proforma Adjustable All In Rate component.
 * Formula: baseRate + adjustableRateVariance + adjustableIndexRate + spreadOnAdjustable
 *
 * Note: uses the dedicated adjustableIndexRate, not the Fixed Rate section's indexRate.
 */
export function calcProformaAdjustable(
  baseRate: string,
  adjustableRateVariance: string,
  adjustableIndexRate: string,
  spreadOnAdjustable: string,
): string {
  return calcRate(baseRate, adjustableRateVariance, adjustableIndexRate, spreadOnAdjustable);
}
