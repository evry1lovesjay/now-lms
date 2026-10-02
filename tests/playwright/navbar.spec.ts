import { expect, test } from "@playwright/test";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const navLinks = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Main" }).getByRole("listitem");

test("Dashboard comes before Courses, and the current page is highlighted", async ({ page }) => {
  await login(page, "student");
  await expect(navLinks(page)).toHaveText(["Dashboard", "Courses", "Assignments"]);

  const current = page.locator('nav[aria-label="Main"] [aria-current="page"]');
  await expect(current).toHaveText("Dashboard");

  await page.goto("/courses/software-quality-assurance");
  await expect(current).toHaveText("Courses");

  // The most specific link wins: /student/assignments highlights Assignments, not Dashboard.
  await page.goto("/student/assignments");
  await expect(current).toHaveText("Assignments");

  // The active link is visibly different from the others.
  const activeBg = await current.evaluate((el) => getComputedStyle(el).backgroundColor);
  const otherBg = await page
    .locator('nav[aria-label="Main"] a:not([aria-current])', { hasText: "Courses" })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(activeBg).not.toBe(otherBg);
});

test("admins see Dashboard, Courses and Users; Users is current on the users page", async ({ page }) => {
  await login(page, "superadmin");
  await expect(navLinks(page)).toHaveText(["Dashboard", "Courses", "Users"]);
  await page.goto("/admin/users");
  await expect(page.locator('nav[aria-label="Main"] [aria-current="page"]')).toHaveText("Users");
});

test("the signed-in user shows first name above a smaller role", async ({ page }) => {
  await login(page, "tutor"); // "Demo Tutor"
  const user = page.getByTestId("nav-user");
  const [name, role] = [user.locator("span").nth(0), user.locator("span").nth(1)];
  await expect(name).toHaveText("Demo");
  await expect(role).toHaveText(/tutor/i);

  const nameBox = (await name.boundingBox())!;
  const roleBox = (await role.boundingBox())!;
  expect(roleBox.y).toBeGreaterThan(nameBox.y + nameBox.height - 2); // stacked, role below
  const size = (l: typeof name) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size(role)).toBeLessThan(await size(name));
});
