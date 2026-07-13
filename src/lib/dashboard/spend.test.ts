import { describe, it, expect } from "vitest";
import { foldTopCategories } from "./spend";

describe("foldTopCategories", () => {
  it("returns everything, sorted descending, when under the limit", () => {
    const items = [
      { name: "B", total: 10 },
      { name: "A", total: 30 },
    ];
    expect(foldTopCategories(items, 7, "Other")).toEqual([
      { name: "A", total: 30 },
      { name: "B", total: 10 },
    ]);
  });

  it("folds the tail into Other when over the limit", () => {
    // totals: c0=9, c1=8, ..., c6=3 (top 7), c7=2, c8=1 (folded)
    const items = Array.from({ length: 9 }, (_, i) => ({ name: `c${i}`, total: 9 - i }));
    const result = foldTopCategories(items, 7, "Other");
    expect(result).toHaveLength(8); // 7 top + 1 Other
    expect(result[7]).toEqual({ name: "Other", total: 2 + 1 });
  });

  it("does not mutate the input array", () => {
    const items = [{ name: "A", total: 1 }, { name: "B", total: 2 }];
    const copy = [...items];
    foldTopCategories(items, 1, "Other");
    expect(items).toEqual(copy);
  });

  it("handles exactly the limit with no Other bucket", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ name: `c${i}`, total: i }));
    expect(foldTopCategories(items, 7, "Other")).toHaveLength(7);
  });
});
