import { test, expect } from "@playwright/test";

test("landing page shows the pitch and both CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Runway" })).toBeVisible();

  const importCta = page.getByRole("link", { name: /importar transacciones/i });
  await expect(importCta).toBeVisible();
  await expect(importCta).toHaveAttribute("href", "/import");

  const signInCta = page.getByRole("link", { name: /iniciar sesión/i });
  await expect(signInCta).toBeVisible();
  await expect(signInCta).toHaveAttribute("href", "/login");
});

test("import CTA navigates to the import page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /importar transacciones/i }).click();
  await expect(page).toHaveURL(/\/import$/);
  await expect(page.getByRole("heading", { name: /importar transacciones/i })).toBeVisible();
});
