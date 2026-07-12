/**
 * Normalize a raw bank/card merchant descriptor into a stable key used for
 * embedding-cache lookups and category matching.
 *
 * Bank descriptors are noisy: payment-processor prefixes (SQ *, TST*, PAYPAL *),
 * trailing store/reference numbers, phone numbers, URLs and dates. We strip the
 * predictable noise and collapse to a lowercase core — conservatively. When in
 * doubt we keep a token rather than over-strip, because the embedding step is
 * tolerant of a little leftover noise but not of a missing brand name.
 */

// Channel / processor prefixes that carry no merchant meaning.
// Ordered most-specific first so the longest match wins.
const PREFIXES = [
  "purchase authorized on",
  "recurring payment",
  "debit card purchase",
  "pos debit",
  "ach debit",
  "check card ",
  "checkcard ",
  "paypal *",
  "recurring ",
  "purchase ",
  "pending ",
  "pos ",
  "ach ",
  "pp *",
  "pp*",
  "sq *",
  "sq*",
  "tst *",
  "tst*",
  "sp *",
  "sp*",
  "sp ",
  "in *",
  "in*",
  "wu *",
  "cke*",
  "www.",
];

export function normalizeMerchant(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();

  // URL scheme.
  s = s.replace(/https?:\/\//g, "");

  // Dates: 2024-01-02, 01/02, 01/02/24.
  s = s.replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  s = s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ");

  // Phone numbers: 800-592-8996, 8005928996.
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, " ");

  // Strip leading processor prefixes (some stack, e.g. "pos debit sq *foo").
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIXES) {
      if (s.startsWith(p)) {
        s = s.slice(p.length).trimStart();
        changed = true;
      }
    }
  }

  // Reference ids: "#123", "gsuite_ab12cd", long standalone number runs.
  s = s.replace(/#\s*\d+/g, " ");
  s = s.replace(/_[a-z0-9]{4,}\b/g, " ");
  s = s.replace(/\b\d{3,}\b/g, " ");

  // Common TLDs: "netflix.com" -> "netflix".
  s = s.replace(/\.(com|net|org|io|co|us)\b/g, " ");

  // Remaining punctuation (including any leftover '*') becomes whitespace.
  s = s.replace(/[^a-z0-9&\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
