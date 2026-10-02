import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./tests/support/test-env";

export default defineConfig({
  testDir: "tests/playwright",
  // Tests share one database that is reset before each test, so run serially.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optional: point at a pre-installed Chromium instead of `npx playwright install`.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: {
    command: "npm run test:server",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
