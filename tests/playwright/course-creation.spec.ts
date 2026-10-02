import { expect, test } from "@playwright/test";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const SECTION_KEYS = ["OUTLINE", "MATERIALS", "RESOURCES"];

test("content admin creates a course that gets the same fixed sections as every course", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses");
  await page.getByRole("link", { name: "+ New course" }).click();

  await page.getByLabel("Title").fill("Cloud Engineering");
  await page.getByLabel("Summary").fill("Deploy and run apps on the cloud.");
  await page.getByLabel("Description").fill("AWS, containers and infrastructure as code.");
  await page.getByRole("button", { name: "Create course" }).click();

  await expect(page).toHaveURL(/\/admin\/courses\/(?!new$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Cloud Engineering" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Cloud Engineering" })).toBeVisible();

  // New and existing courses show the same three sections, in the same order.
  for (const slug of ["cloud-engineering", "data-analytics"]) {
    await page.goto(`/courses/${slug}`);
    await expect(page.locator("[data-section]")).toHaveCount(3);
    expect(await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")))).toEqual(
      SECTION_KEYS,
    );
  }
});

test("super admin can create a course; duplicate titles get a unique address", async ({ page }) => {
  await login(page, "superadmin");
  for (let i = 0; i < 2; i++) {
    await page.goto("/admin/courses/new");
    await page.getByLabel("Title").fill("Cyber Security");
    await page.getByLabel("Summary").fill("Protect systems and data.");
    await page.getByLabel("Description").fill("Threats, defence and incident response.");
    await page.getByRole("button", { name: "Create course" }).click();
    await expect(page).toHaveURL(/\/admin\/courses\/(?!new$)[^/]+$/);
  }
  await page.goto("/courses/cyber-security");
  await expect(page.getByRole("heading", { name: "Cyber Security" })).toBeVisible();
  await page.goto("/courses/cyber-security-2");
  await expect(page.getByRole("heading", { name: "Cyber Security" })).toBeVisible();
});

test("tutors and students cannot create courses", async ({ page }) => {
  await login(page, "tutor");
  await page.goto("/admin/courses/new");
  await expect(page).toHaveURL(/\/tutor$/);

  await page.context().clearCookies();
  await login(page, "student");
  await page.goto("/admin/courses/new");
  await expect(page).toHaveURL(/\/student$/);
});
