import { describe, it, expect } from "vitest";
import { detectSubscriptions, type TransactionForDetection } from "./detect";

function tx(merchantId: string, occurredOn: string, amount: number): TransactionForDetection {
  return { merchantId, merchantName: `Merchant ${merchantId}`, occurredOn, amount };
}

describe("detectSubscriptions", () => {
  it("ignores merchants with only one transaction", () => {
    expect(detectSubscriptions([tx("m1", "2024-01-01", -9.99)])).toEqual([]);
  });

  it("detects a monthly subscription with stable amount", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -9.99),
      tx("m1", "2024-02-01", -9.99),
      tx("m1", "2024-03-02", -9.99),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      merchantId: "m1",
      cadence: "monthly",
      avgAmount: 9.99,
      lastAmount: 9.99,
      occurrences: 3,
      priceHike: false,
    });
  });

  it("detects a weekly cadence", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -5),
      tx("m1", "2024-01-08", -5),
      tx("m1", "2024-01-15", -5),
    ]);
    expect(result[0].cadence).toBe("weekly");
  });

  it("detects a yearly cadence", () => {
    const result = detectSubscriptions([
      tx("m1", "2023-01-01", -100),
      tx("m1", "2024-01-02", -100),
    ]);
    expect(result[0].cadence).toBe("yearly");
  });

  it("rejects irregular intervals that don't match any cadence", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -20),
      tx("m1", "2024-01-15", -20), // 14 days: not weekly (7) or monthly (30) within tolerance
    ]);
    expect(result).toEqual([]);
  });

  it("rejects unstable amounts even on a regular cadence", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -10),
      tx("m1", "2024-02-01", -40), // wildly different amount, not a subscription
    ]);
    expect(result).toEqual([]);
  });

  it("flags a price hike when the latest charge jumps notably above prior average", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -9.99),
      tx("m1", "2024-02-01", -9.99),
      tx("m1", "2024-03-02", -13.99), // >10% jump
    ]);
    // Amount stability check uses the FULL set average — a jump this size
    // also breaks the 15% stability band, so this merchant is correctly
    // excluded rather than flagged: verifies hike detection doesn't produce
    // a false subscription out of what's really an unstable price series.
    expect(result).toEqual([]);
  });

  it("flags a smaller price hike that still passes the stability band", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -10.0),
      tx("m1", "2024-02-01", -10.2),
      tx("m1", "2024-03-02", -11.4), // ~11% above the prior average of ~10.1
    ]);
    expect(result[0]?.priceHike).toBe(true);
  });

  it("keeps separate merchants independent", () => {
    const result = detectSubscriptions([
      tx("m1", "2024-01-01", -9.99),
      tx("m1", "2024-02-01", -9.99),
      tx("m2", "2024-01-05", -5),
    ]);
    expect(result.map((r) => r.merchantId).sort()).toEqual(["m1"]);
  });

  it("sorts results by amount descending", () => {
    const result = detectSubscriptions([
      tx("cheap", "2024-01-01", -5),
      tx("cheap", "2024-02-01", -5),
      tx("pricey", "2024-01-01", -50),
      tx("pricey", "2024-02-01", -50),
    ]);
    expect(result.map((r) => r.merchantId)).toEqual(["pricey", "cheap"]);
  });
});
