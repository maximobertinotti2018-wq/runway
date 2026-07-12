import type { RawTransaction } from "@/lib/csv/parse";
import { normalizeMerchant } from "@/lib/merchants/normalize";

export interface MerchantUpsert {
  user_id: string;
  raw_name: string;
  normalized_name: string;
}

export interface TransactionInsert {
  user_id: string;
  import_id: string;
  merchant_id: string | null;
  occurred_on: string;
  raw_description: string;
  amount: number;
  currency: string;
}

/**
 * Dedupe rows down to one upsert per distinct normalized merchant. The first
 * raw description seen for a given normalized name is kept as the display
 * name; empty normalizations (nothing left after stripping noise) are
 * skipped rather than merged into one giant "" merchant.
 */
export function prepareMerchants(rows: RawTransaction[], userId: string): MerchantUpsert[] {
  const seen = new Map<string, MerchantUpsert>();
  for (const row of rows) {
    const normalized = normalizeMerchant(row.description);
    if (!normalized || seen.has(normalized)) continue;
    seen.set(normalized, {
      user_id: userId,
      raw_name: row.description,
      normalized_name: normalized,
    });
  }
  return [...seen.values()];
}

/**
 * Build transaction insert payloads, resolving each row's merchant id from
 * the id map produced after upserting `prepareMerchants`'s output. Rows whose
 * merchant couldn't be resolved (empty normalization) get merchant_id: null
 * rather than being dropped — the transaction still counts toward spend.
 */
export function prepareTransactions(
  rows: RawTransaction[],
  userId: string,
  importId: string,
  merchantIdByNormalized: Record<string, string>,
  currency = "USD",
): TransactionInsert[] {
  return rows.map((row) => {
    const normalized = normalizeMerchant(row.description);
    return {
      user_id: userId,
      import_id: importId,
      merchant_id: normalized ? (merchantIdByNormalized[normalized] ?? null) : null,
      occurred_on: row.occurredOn,
      raw_description: row.description,
      amount: row.amount,
      currency,
    };
  });
}
