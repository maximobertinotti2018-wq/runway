import { describe, it, expect } from "vitest";
import { aggregateSpend } from "./aggregate";

describe("aggregateSpend", () => {
  it("returns zeroed-out values for no data", () => {
    const s = aggregateSpend([], "Uncategorized");
    expect(s).toEqual({ byCategory: [], monthCount: 0, totalSpend: 0, burnRate: 0, topCategory: null });
  });

  it("sums magnitudes per category and sorts descending", () => {
    const s = aggregateSpend(
      [
        { month: "2024-01-01", categoryName: "Food & Dining", total: -20 },
        { month: "2024-01-01", categoryName: "Entertainment", total: -50 },
        { month: "2024-01-01", categoryName: "Food & Dining", total: -10 },
      ],
      "Uncategorized",
    );
    expect(s.byCategory).toEqual([
      { name: "Entertainment", total: 50 },
      { name: "Food & Dining", total: 30 },
    ]);
    expect(s.topCategory).toEqual({ name: "Entertainment", total: 50 });
    expect(s.totalSpend).toBe(80);
  });

  it("groups a null category under the uncategorized label", () => {
    const s = aggregateSpend([{ month: "2024-01-01", categoryName: null, total: -15 }], "Uncategorized");
    expect(s.byCategory).toEqual([{ name: "Uncategorized", total: 15 }]);
  });

  it("computes burn rate as total spend divided by distinct months", () => {
    const s = aggregateSpend(
      [
        { month: "2024-01-01", categoryName: "A", total: -100 },
        { month: "2024-02-01", categoryName: "A", total: -50 },
      ],
      "Uncategorized",
    );
    expect(s.monthCount).toBe(2);
    expect(s.totalSpend).toBe(150);
    expect(s.burnRate).toBe(75);
  });

  it("burn rate equals total spend for a single month of data", () => {
    const s = aggregateSpend([{ month: "2024-01-01", categoryName: "A", total: -42 }], "Uncategorized");
    expect(s.burnRate).toBe(42);
  });
});
