import { describe, it, expect } from "vitest";
import { prepareMerchants, prepareTransactions } from "./prepare";
import type { RawTransaction } from "@/lib/csv/parse";

const USER = "11111111-1111-1111-1111-111111111111";

const rows: RawTransaction[] = [
  { occurredOn: "2024-01-02", description: "SQ *COFFEE ROASTERS", amount: -4.5 },
  { occurredOn: "2024-01-09", description: "SQ *COFFEE ROASTERS #2", amount: -5.0 }, // same normalized merchant
  { occurredOn: "2024-01-03", description: "NETFLIX.COM", amount: -15.99 },
];

describe("prepareMerchants", () => {
  it("dedupes rows into one upsert per normalized merchant", () => {
    const merchants = prepareMerchants(rows, USER);
    expect(merchants).toHaveLength(2); // coffee roasters (x2 rows -> 1) + netflix
    const names = merchants.map((m) => m.normalized_name).sort();
    expect(names).toEqual(["coffee roasters", "netflix"]);
  });

  it("keeps the first raw_name seen for a normalized merchant", () => {
    const merchants = prepareMerchants(rows, USER);
    const coffee = merchants.find((m) => m.normalized_name === "coffee roasters");
    expect(coffee?.raw_name).toBe("SQ *COFFEE ROASTERS");
  });

  it("tags every row with the given user_id", () => {
    for (const m of prepareMerchants(rows, USER)) expect(m.user_id).toBe(USER);
  });

  it("skips rows that normalize to an empty string", () => {
    const merchants = prepareMerchants([{ occurredOn: "2024-01-01", description: "***", amount: -1 }], USER);
    expect(merchants).toHaveLength(0);
  });
});

describe("prepareTransactions", () => {
  const merchantIdByNormalized = {
    "coffee roasters": "merchant-coffee",
    netflix: "merchant-netflix",
  };
  const importId = "import-1";

  it("resolves merchant_id via the normalized-name map", () => {
    const txs = prepareTransactions(rows, USER, importId, merchantIdByNormalized);
    expect(txs).toHaveLength(3);
    expect(txs[0].merchant_id).toBe("merchant-coffee");
    expect(txs[1].merchant_id).toBe("merchant-coffee"); // second coffee row, same merchant
    expect(txs[2].merchant_id).toBe("merchant-netflix");
  });

  it("stamps user_id, import_id, and defaults currency to USD", () => {
    const txs = prepareTransactions(rows, USER, importId, merchantIdByNormalized);
    for (const tx of txs) {
      expect(tx.user_id).toBe(USER);
      expect(tx.import_id).toBe(importId);
      expect(tx.currency).toBe("USD");
    }
  });

  it("preserves the raw description, date, and signed amount", () => {
    const txs = prepareTransactions(rows, USER, importId, merchantIdByNormalized);
    expect(txs[0]).toMatchObject({
      raw_description: "SQ *COFFEE ROASTERS",
      occurred_on: "2024-01-02",
      amount: -4.5,
    });
  });

  it("falls back to merchant_id: null when the merchant wasn't resolved", () => {
    const txs = prepareTransactions(rows, USER, importId, {});
    expect(txs.every((t) => t.merchant_id === null)).toBe(true);
  });

  it("assigns merchant_id: null for rows that normalize to empty", () => {
    const weird: RawTransaction[] = [{ occurredOn: "2024-01-01", description: "***", amount: -1 }];
    const txs = prepareTransactions(weird, USER, importId, merchantIdByNormalized);
    expect(txs[0].merchant_id).toBeNull();
  });
});
