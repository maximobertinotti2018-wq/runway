import { test, expect } from "@playwright/test";

test("sample data loads straight into a preview table", async ({ page }) => {
  await page.goto("/import");
  await page.getByRole("button", { name: /probá con datos de muestra/i }).click();

  await expect(page.getByText(/8 transacciones/)).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(8);

  // Merchant normalization ran client-side (no Supabase call needed for this) —
  // the raw "NETFLIX.COM" descriptor collapses to the normalized "netflix" key.
  await expect(page.getByRole("cell", { name: "netflix", exact: true })).toBeVisible();
});

test("save requires sign-in", async ({ page }) => {
  await page.goto("/import");
  await page.getByRole("button", { name: /probá con datos de muestra/i }).click();
  await page.getByRole("button", { name: /guardar en runway/i }).click();

  await expect(page.getByText(/iniciá sesión para guardar tu importación/i)).toBeVisible();
});
