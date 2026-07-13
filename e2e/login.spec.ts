import { test, expect } from "@playwright/test";

test("login page has email/password fields and a forgot-password link", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();

  await page.getByRole("link", { name: /olvidaste tu contraseña/i }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: /restablecer tu contraseña/i })).toBeVisible();
});

test("reset-password redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/login$/);
});
