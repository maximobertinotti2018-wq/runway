import Papa from "papaparse";
import { parseAmount } from "./amount";
import { parseDate } from "./date";

/** A transaction as read from a CSV, before merchant/category enrichment. */
export interface RawTransaction {
  occurredOn: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // signed as provided by the bank
}

/** Which CSV columns hold the date / description / amount. */
export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
}

export interface ParseResult {
  rows: RawTransaction[];
  errors: string[];
}

const DATE_HEADERS = ["date", "posted date", "post date", "posted", "trans date", "transaction date"];
const DESC_HEADERS = ["description", "merchant", "name", "memo", "details", "payee", "narrative"];
const AMOUNT_HEADERS = ["amount", "debit", "value", "withdrawal", "charge"];

/** Read just the header row of a CSV (used to drive manual column mapping). */
export function parseHeaders(text: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    preview: 1,
  });
  return parsed.meta.fields ?? [];
}

/** Best-effort detection of the three columns we need from the header row. */
export function detectColumns(headers: string[]): ColumnMapping | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const find = (cands: string[]): string | null => {
    for (const c of cands) {
      const exact = lower.indexOf(c);
      if (exact >= 0) return headers[exact];
    }
    for (let i = 0; i < lower.length; i++) {
      if (cands.some((c) => lower[i].includes(c))) return headers[i];
    }
    return null;
  };
  const date = find(DATE_HEADERS);
  const description = find(DESC_HEADERS);
  const amount = find(AMOUNT_HEADERS);
  return date && description && amount ? { date, description, amount } : null;
}

/** Parse CSV text into typed rows. Bad rows are skipped and reported in `errors`. */
export function parseCsv(text: string, mapping?: ColumnMapping): ParseResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  for (const e of parsed.errors ?? []) errors.push(`parse: ${e.message}`);

  const headers = parsed.meta.fields ?? [];
  const map = mapping ?? detectColumns(headers);
  if (!map) {
    errors.push("Could not detect date/description/amount columns");
    return { rows: [], errors };
  }

  const rows: RawTransaction[] = [];
  parsed.data.forEach((r, i) => {
    const line = i + 1;
    const occurredOn = parseDate(r[map.date]);
    const amount = parseAmount(r[map.amount]);
    const description = (r[map.description] ?? "").trim();
    if (!occurredOn) return void errors.push(`row ${line}: bad date "${r[map.date] ?? ""}"`);
    if (amount == null) return void errors.push(`row ${line}: bad amount "${r[map.amount] ?? ""}"`);
    if (!description) return void errors.push(`row ${line}: empty description`);
    rows.push({ occurredOn, description, amount });
  });

  return { rows, errors };
}
