import { test, expect } from "@playwright/test";

test.describe("theme toggle", () => {
  test("switches to dark and persists across reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: /cambiar a tema oscuro/i }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe("language toggle", () => {
  test("switches to English and persists across reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Runway" })).toBeVisible();
    await expect(page.getByRole("link", { name: /iniciar sesión/i })).toBeVisible();

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });
});
