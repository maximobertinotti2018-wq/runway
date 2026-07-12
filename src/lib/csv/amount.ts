/**
 * Parse a money value from a bank CSV cell into a signed number.
 * Handles currency symbols, thousands separators, parentheses-negatives and
 * leading/trailing signs. US-style formatting (1,234.56) — European decimal
 * commas are out of scope for the MVP.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw == null) return null;

  let s = String(raw).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.includes("-")) negative = true;

  // Keep digits and decimal point only.
  s = s.replace(/[^0-9.]/g, "");
  if (s === "" || s === ".") return null;

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}
