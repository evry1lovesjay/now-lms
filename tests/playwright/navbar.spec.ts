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

test("the role is set in a very small font", async ({ page }) => {
  await login(page, "student");
  const role = page.getByTestId("nav-user").locator("span").nth(1);
  expect(await role.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(10);
});

test.describe("user menu (desktop)", () => {
  test("holds the theme choice and Log out, and closes on Escape or outside click", async ({ page }) => {
    await login(page, "student");
    const trigger = page.getByRole("button", { name: /^Account menu for Demo/ });
    const menu = page.getByTestId("user-menu");

    // Theme and Log out live in the menu, not on the bar.
    await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("radio")).toHaveText([/System/, /Light/, /Dark/]);
    await expect(menu.getByRole("button", { name: "Log out" })).toBeVisible();

    await menu.getByRole("radio", { name: /Dark/ }).click();
    await expect(menu.getByRole("radio", { name: /Dark/ })).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    expect((await page.context().cookies()).find((c) => c.name === "theme")?.value).toBe("dark");

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);

    await trigger.click();
    await expect(menu).toBeVisible();
    await page.getByRole("heading").first().click();
    await expect(menu).toHaveCount(0);

    // The saved theme is pre-selected after a reload.
    await page.reload();
    await trigger.click();
    await expect(menu.getByRole("radio", { name: /Dark/ })).toHaveAttribute("aria-checked", "true");
  });

  test("logs out from the menu", async ({ page }) => {
    await login(page, "tutor");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByTestId("user-menu").getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/tutor");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("mobile menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a hamburger opens the links, theme and Log out", async ({ page }) => {
    await login(page, "student");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    await expect(hamburger).toBeVisible();
    // Desktop links and the account button are hidden on small screens.
    await expect(page.getByRole("button", { name: /^Account menu/ })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Courses", exact: true })).toHaveCount(0);

    await hamburger.click();
    const menu = page.getByTestId("mobile-menu");
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("listitem")).toHaveText(["Dashboard", "Courses", "Assignments"]);
    await expect(menu.locator('[aria-current="page"]')).toHaveText("Dashboard");
    await expect(menu).toContainText("Demo");
    await expect(menu.getByRole("radio")).toHaveCount(3);
    await expect(menu.getByRole("button", { name: "Log out" })).toBeVisible();

    // Following a link navigates and closes the menu.
    await menu.getByRole("link", { name: "Courses" }).click();
    await expect(page).toHaveURL(/\/courses$/);
    await expect(menu).toHaveCount(0);

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(menu.locator('[aria-current="page"]')).toHaveText("Courses");
    await menu.getByRole("radio", { name: /Dark/ }).click();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await menu.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signed-out visitors get Courses, Log in and Sign up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu.getByRole("listitem")).toHaveText(["Courses", "Log in"]);
    await expect(menu.getByRole("link", { name: "Sign up" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
});
