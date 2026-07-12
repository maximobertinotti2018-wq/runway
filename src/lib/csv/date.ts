/**
 * Parse a date from a bank CSV cell into an ISO `yyyy-mm-dd` string.
 * Accepts ISO (`2024-01-02`) and US slash formats (`01/02/2024`, `1/2/24`).
 * Ambiguous or invalid dates return null.
 */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}
