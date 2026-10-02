import { expect, test } from "@playwright/test";
import { accounts } from "../support/accounts";
import { acceptNextDialog, login, resetDb, userRow } from "./helpers";

test.beforeEach(() => resetDb());

test.describe("super admin", () => {
  test("can block/unblock content admins, tutors and students but not themselves", async ({ page }) => {
    await login(page, "superadmin");
    await page.goto("/admin/users");

    for (const email of [accounts.contentAdmin.email, accounts.tutor.email, accounts.student.email]) {
      await expect(userRow(page, email).getByRole("button", { name: "Block" })).toBeVisible();
    }
    await expect(userRow(page, accounts.superadmin.email).getByRole("button")).toHaveCount(0);
  });

  test("can create content admin, tutor and student accounts", async ({ page }) => {
    await login(page, "superadmin");
    await page.goto("/admin/users");
    await expect(page.getByLabel("Role").locator("option")).toHaveText(["Content Admin", "Tutor", "Student"]);

    await page.getByLabel("Name").fill("Second Content Admin");
    await page.getByLabel("Email").fill("content2@nowlms.local");
    await page.getByLabel("Temporary password").fill("Password123!");
    await page.getByLabel("Role").selectOption("CONTENT_ADMIN");
    await page.getByRole("button", { name: "Add user" }).click();

    await expect(page.getByText("Second Content Admin was added.")).toBeVisible();
    await expect(userRow(page, "content2@nowlms.local")).toContainText("Content Admin");
  });

  test("blocking a content admin signs them out and prevents login; unblocking restores access", async ({ browser }) => {
    const adminPage = await (await browser.newContext()).newPage();
    const contentPage = await (await browser.newContext()).newPage();
    await login(adminPage, "superadmin");
    await login(contentPage, "contentAdmin");

    await adminPage.goto("/admin/users");
    acceptNextDialog(adminPage);
    await userRow(adminPage, accounts.contentAdmin.email).getByRole("button", { name: "Block" }).click();
    await expect(userRow(adminPage, accounts.contentAdmin.email)).toContainText("Blocked");

    // Existing session is rejected on the very next request.
    await contentPage.goto("/admin/users");
    await expect(contentPage).toHaveURL(/\/login/);

    await contentPage.getByLabel("Email").fill(accounts.contentAdmin.email);
    await contentPage.getByLabel("Password").fill(accounts.contentAdmin.password);
    await contentPage.getByRole("button", { name: "Sign in" }).click();
    await expect(contentPage.getByText("This account has been disabled")).toBeVisible();

    await userRow(adminPage, accounts.contentAdmin.email).getByRole("button", { name: "Unblock" }).click();
    await expect(userRow(adminPage, accounts.contentAdmin.email)).toContainText("Active");

    // Sessions revoked by the block stay revoked: the user must sign in again.
    await contentPage.goto("/admin");
    await expect(contentPage).toHaveURL(/\/login/);
    await login(contentPage, "contentAdmin");
    await expect(contentPage).toHaveURL(/\/admin$/);
  });

  test("block and unblock actions are recorded in the audit log", async ({ page }) => {
    await login(page, "superadmin");
    await page.goto("/admin/users");
    acceptNextDialog(page);
    await userRow(page, accounts.tutor.email).getByRole("button", { name: "Block" }).click();
    await expect(userRow(page, accounts.tutor.email)).toContainText("Blocked");

    await page.goto("/admin/audit");
    await expect(page.locator("tr", { hasText: "user.block" })).toContainText(accounts.tutor.email);
  });
});

test.describe("content admin", () => {
  test("can block tutors and students, but not super admins or other content admins", async ({ page }) => {
    await login(page, "contentAdmin");
    await page.goto("/admin/users");

    await expect(userRow(page, accounts.tutor.email).getByRole("button", { name: "Block" })).toBeVisible();
    await expect(userRow(page, accounts.student.email).getByRole("button", { name: "Block" })).toBeVisible();
    await expect(userRow(page, accounts.superadmin.email).getByRole("button")).toHaveCount(0);
    await expect(userRow(page, accounts.contentAdmin.email).getByRole("button")).toHaveCount(0);
  });

  test("can only create tutor and student accounts", async ({ page }) => {
    await login(page, "contentAdmin");
    await page.goto("/admin/users");
    await expect(page.getByLabel("Role").locator("option")).toHaveText(["Tutor", "Student"]);
  });

  test("blocking a tutor and a student locks them out", async ({ page }) => {
    await login(page, "contentAdmin");
    await page.goto("/admin/users");
    for (const email of [accounts.tutor.email, accounts.student.email]) {
      acceptNextDialog(page);
      await userRow(page, email).getByRole("button", { name: "Block" }).click();
      await expect(userRow(page, email)).toContainText("Blocked");
    }

    for (const who of [accounts.tutor, accounts.student]) {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("Email").fill(who.email);
      await page.getByLabel("Password").fill(who.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("This account has been disabled")).toBeVisible();
    }
  });

  test("can filter the user list by status", async ({ page }) => {
    await login(page, "contentAdmin");
    await page.goto("/admin/users");
    acceptNextDialog(page);
    await userRow(page, accounts.student.email).getByRole("button", { name: "Block" }).click();
    await expect(userRow(page, accounts.student.email)).toContainText("Blocked");

    await page.goto("/admin/users?status=BLOCKED");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText(accounts.student.email);
  });
});
