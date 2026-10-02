/**
 * Starts the production build against the isolated test database.
 * Requires `npm run build` first. Used by Playwright's webServer and by
 * `npm run test:cypress`.
 */
import { execSync, spawn } from "node:child_process";
import { TEST_PORT, withTestEnv } from "./test-env";

const env = withTestEnv();

execSync("npx prisma db push", { env, stdio: "inherit" });
execSync("npx tsx tests/support/reset-db.ts", { env, stdio: "inherit" });

const server = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], { env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
