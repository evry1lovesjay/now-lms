import { execSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { accounts, type AccountName } from "../support/accounts";
import { withTestEnv } from "../support/test-env";

export function resetDb() {
  execSync("npx tsx tests/support/reset-db.ts", { env: withTestEnv(), stdio: "inherit" });
}

export async function login(page: Page, who: AccountName | { email: string; password: string }) {
  const { email, password } = typeof who === "string" ? accounts[who] : who;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

export function userRow(page: Page, email: string) {
  return page.locator("tr", { hasText: email });
}

/** Accepts the browser confirm() shown by "Block" / "Delete" buttons. */
export function acceptNextDialog(page: Page) {
  page.once("dialog", (d) => d.accept());
}

export async function enrollInSqa(page: Page) {
  await page.goto("/courses/software-quality-assurance");
  await page.getByRole("button", { name: "Enroll in this course" }).click();
  await expect(page.getByRole("button", { name: "Enroll in this course" })).toHaveCount(0);
}
