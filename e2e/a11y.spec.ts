import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility scan (WCAG 2.0/2.1 A+AA via axe-core) on every page
 * reachable without a live Supabase session — same constraint as the rest of
 * the E2E suite. /dashboard needs a real signed-in user so it isn't covered
 * here; it was checked by hand instead (see README's Testing section).
 */
const pages: Array<{ path: string; name: string; before?: (page: import("@playwright/test").Page) => Promise<void> }> = [
  { path: "/", name: "landing" },
  { path: "/login", name: "login" },
  { path: "/forgot-password", name: "forgot-password" },
  { path: "/import", name: "import (idle)" },
  {
    path: "/import",
    name: "import (with preview table)",
    before: async (page) => {
      await page.getByRole("button", { name: /probá con datos de muestra/i }).click();
      await page.waitForSelector("table tbody tr");
    },
  },
];

async function assertNoViolations(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n  ${v.helpUrl}`)
      .join("\n");
    console.log(`\na11y violations on ${label}:\n${summary}`);
  }
  expect(results.violations, `a11y violations on ${label}`).toEqual([]);
}

for (const { path, name, before } of pages) {
  test(`${name} has no automatically detectable a11y violations`, async ({ page }) => {
    await page.goto(path);
    if (before) await before(page);
    await assertNoViolations(page, name);
  });
}

// Same pages, dark theme — colors that clear contrast in light mode aren't
// guaranteed to clear it in dark mode too (they're independent Tailwind
// classes, e.g. `dark:text-zinc-400`), so this isn't redundant with the pass
// above.
for (const { path, name, before } of pages) {
  test(`${name} (dark) has no automatically detectable a11y violations`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("button", { name: /cambiar a tema oscuro/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    if (before) await before(page);
    await assertNoViolations(page, `${name} (dark)`);
  });
}
