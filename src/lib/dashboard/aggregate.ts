import type { CategorySpend } from "./spend";

export interface MonthlyRow {
  month: string; // yyyy-mm-dd, first of month
  categoryName: string | null;
  total: number; // signed, as stored (negative for spend)
}

export interface SpendSummary {
  byCategory: CategorySpend[]; // positive magnitudes, sorted descending
  monthCount: number;
  totalSpend: number; // positive magnitude, all-time
  /** totalSpend / monthCount — an honest "average monthly burn" across
   * whatever months actually have data, not strictly "this calendar month"
   * (which would show 0 for historical/demo data outside the current month). */
  burnRate: number;
  topCategory: CategorySpend | null;
}

export function aggregateSpend(rows: MonthlyRow[], uncategorizedLabel: string): SpendSummary {
  const months = new Set(rows.map((r) => r.month));
  const byCategoryMap = new Map<string, number>();
  let totalSpend = 0;

  for (const row of rows) {
    const magnitude = Math.abs(row.total);
    totalSpend += magnitude;
    const name = row.categoryName ?? uncategorizedLabel;
    byCategoryMap.set(name, (byCategoryMap.get(name) ?? 0) + magnitude);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const monthCount = months.size;
  const burnRate = monthCount > 0 ? totalSpend / monthCount : 0;

  return { byCategory, monthCount, totalSpend, burnRate, topCategory: byCategory[0] ?? null };
}
