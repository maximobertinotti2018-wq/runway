import { defineConfig, devices } from "@playwright/test";

// Covers everything reachable without a live Supabase session: landing,
// theme/language persistence, the login/forgot-password shells, and the CSV
// import → preview flow via the built-in sample data. Anything past
// "Save to Runway" needs a real signed-in user and isn't covered here — see
// README's Testing section.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
