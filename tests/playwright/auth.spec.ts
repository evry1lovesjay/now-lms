import { expect, test } from "@playwright/test";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

test("visitor can register as a student and lands on the student dashboard", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("New Learner");
  await page.getByLabel("Email").fill("new.learner@example.com");
  await page.getByLabel("Password").fill("Secret123!");
  await page.getByRole("button", { name: "Create student account" }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { name: /Hi New/ })).toBeVisible();
  await expect(page.getByTestId("nav-user")).toHaveText(/^New\s*Student$/);
});

test("registering with an existing email is rejected", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Copycat");
  await page.getByLabel("Email").fill("student@nowlms.local");
  await page.getByLabel("Password").fill("Secret123!");
  await page.getByRole("button", { name: "Create student account" }).click();
  await expect(page.getByText("An account with this email already exists.")).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@nowlms.local");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("each role lands on its own dashboard", async ({ page }) => {
  const homes = { superadmin: "/admin", contentAdmin: "/admin", tutor: "/tutor", student: "/student" } as const;
  for (const [who, path] of Object.entries(homes) as [keyof typeof homes, string][]) {
    await page.context().clearCookies();
    await login(page, who);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("anonymous visitors are sent to login from protected pages", async ({ page }) => {
  for (const path of ["/admin", "/admin/users", "/tutor", "/student"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("students and tutors cannot open the admin area", async ({ page }) => {
  await login(page, "student");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/student$/);

  await page.context().clearCookies();
  await login(page, "tutor");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/tutor$/);
});

test("content admins cannot open the audit log", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/audit");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
});
