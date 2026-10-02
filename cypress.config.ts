import { execSync } from "node:child_process";
import { defineConfig } from "cypress";
import { BASE_URL, withTestEnv } from "./tests/support/test-env";

export default defineConfig({
  e2e: {
    baseUrl: BASE_URL,
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "tests/fixtures",
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on) {
      on("task", {
        "db:reset"() {
          execSync("npx tsx tests/support/reset-db.ts", { env: withTestEnv(), stdio: "inherit" });
          return null;
        },
      });
    },
  },
});
