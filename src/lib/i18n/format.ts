import { dictionary, type Locale } from "./dictionary";

/** Resolve a dot-path (e.g. "dashboard.title") against a locale's dictionary tree. */
export function lookup(locale: Locale, path: string): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dictionary[locale];
  for (const part of parts) node = node?.[part];
  return typeof node === "string" ? node : path;
}

/** Replace {varName} placeholders in a template with the given values. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}
