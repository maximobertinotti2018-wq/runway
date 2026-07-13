export type Cadence = "weekly" | "monthly" | "yearly";

export interface TransactionForDetection {
  merchantId: string;
  merchantName: string;
  occurredOn: string; // ISO yyyy-mm-dd
  amount: number; // signed, as stored
}

export interface DetectedSubscription {
  merchantId: string;
  merchantName: string;
  cadence: Cadence;
  avgAmount: number; // positive magnitude
  lastAmount: number; // positive magnitude
  lastSeen: string;
  occurrences: number;
  /** The most recent charge is notably higher than the prior average — a
   * stealth price hike, not just normal amount noise. */
  priceHike: boolean;
}

const CADENCE_DAYS: Record<Cadence, number> = { weekly: 7, monthly: 30, yearly: 365 };
const INTERVAL_TOLERANCE = 0.25; // interval must land within 25% of a known cadence
const AMOUNT_TOLERANCE = 0.15; // amounts must stay within 15% of their own average to count as "the same charge"
const HIKE_THRESHOLD = 0.1; // last charge >10% above the prior average counts as a hike

/**
 * Groups transactions by merchant and flags the ones that recur on a
 * regular cadence with a roughly stable amount — the two signals that
 * distinguish "this is a subscription" from "I happened to buy coffee
 * twice." Requires at least 2 occurrences; a single transaction has no
 * interval to measure.
 */
export function detectSubscriptions(transactions: TransactionForDetection[]): DetectedSubscription[] {
  const byMerchant = new Map<string, TransactionForDetection[]>();
  for (const t of transactions) {
    const list = byMerchant.get(t.merchantId) ?? [];
    list.push(t);
    byMerchant.set(t.merchantId, list);
  }

  const results: DetectedSubscription[] = [];
  for (const txs of byMerchant.values()) {
    if (txs.length < 2) continue;
    const sorted = [...txs].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

    const amounts = sorted.map((t) => Math.abs(t.amount));
    const avgAmount = mean(amounts);
    if (avgAmount === 0) continue;
    const amountStable = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= AMOUNT_TOLERANCE);
    if (!amountStable) continue;

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(daysBetween(sorted[i - 1].occurredOn, sorted[i].occurredOn));
    }
    const cadence = closestCadence(mean(intervals));
    if (!cadence) continue;

    const lastAmount = amounts[amounts.length - 1];
    const priorAvg = mean(amounts.slice(0, -1));
    const priceHike = priorAvg > 0 && (lastAmount - priorAvg) / priorAvg > HIKE_THRESHOLD;

    results.push({
      merchantId: sorted[0].merchantId,
      merchantName: sorted[0].merchantName,
      cadence,
      avgAmount,
      lastAmount,
      lastSeen: sorted[sorted.length - 1].occurredOn,
      occurrences: sorted.length,
      priceHike,
    });
  }

  return results.sort((a, b) => b.avgAmount - a.avgAmount);
}

function closestCadence(avgIntervalDays: number): Cadence | null {
  for (const cadence of Object.keys(CADENCE_DAYS) as Cadence[]) {
    const days = CADENCE_DAYS[cadence];
    if (Math.abs(avgIntervalDays - days) / days <= INTERVAL_TOLERANCE) return cadence;
  }
  return null;
}

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function mean(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}
