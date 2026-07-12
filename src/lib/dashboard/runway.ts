export type RunwayStatus = "good" | "warning" | "critical";

export interface RunwayResult {
  /** Months of cash left at the current burn rate. `null` = no burn, indefinite runway. */
  months: number | null;
  status: RunwayStatus;
}

/**
 * months = cash / monthlyBurn. No burn (<=0, i.e. break-even or net positive)
 * is indefinite runway, not a divide-by-zero — reported as good/null rather
 * than Infinity, which formats ugly and reads as a bug.
 */
export function computeRunway(cashAvailable: number, monthlyBurn: number): RunwayResult {
  if (monthlyBurn <= 0) return { months: null, status: "good" };
  if (cashAvailable <= 0) return { months: 0, status: "critical" };

  const months = cashAvailable / monthlyBurn;
  const status: RunwayStatus = months >= 6 ? "good" : months >= 3 ? "warning" : "critical";
  return { months, status };
}
