export interface CategorySpend {
  name: string;
  total: number;
}

/**
 * Fold a spend-by-category list down to the top N by magnitude, summing the
 * remainder into a single "Other" bucket. More than ~7 bars stops reading as
 * a comparison and starts reading as noise (per the dataviz skill's
 * choosing-a-form guidance) — this keeps the chart legible as the fixed
 * 19-category taxonomy fills in with real usage.
 */
export function foldTopCategories(
  items: CategorySpend[],
  limit: number,
  otherLabel: string,
): CategorySpend[] {
  const sorted = [...items].sort((a, b) => b.total - a.total);
  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const otherTotal = rest.reduce((sum, c) => sum + c.total, 0);
  return [...top, { name: otherLabel, total: otherTotal }];
}
