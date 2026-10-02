import { expect, test } from "@playwright/test";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const footer = (page: import("@playwright/test").Page) => page.getByRole("contentinfo");

test("the footer links to courses, account pages and company pages", async ({ page }) => {
  await page.goto("/");
  const nav = footer(page).getByRole("navigation", { name: "Footer" });
  for (const course of ["Software Quality Assurance", "Data Analytics", "Product Management", "Product Design"]) {
    await expect(nav.getByRole("link", { name: course })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "View all courses" })).toHaveAttribute("href", "/courses");
  await expect(nav.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await expect(nav.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");

  for (const [label, heading] of [
    ["About us", "About NowLMS"],
    ["Contact & support", "Contact & support"],
    ["Privacy policy", "Privacy policy"],
    ["Terms of use", "Terms of use"],
  ]) {
    await footer(page).getByRole("navigation", { name: "Footer" }).getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await expect(footer(page).getByRole("link", { name: "support@nowlms.local" })).toHaveAttribute("href", "mailto:support@nowlms.local");
});

test("signed-in users get dashboard links instead of log in", async ({ page }) => {
  await login(page, "student");
  const nav = footer(page).getByRole("navigation", { name: "Footer" });
  await expect(nav.getByRole("link", { name: "My dashboard" })).toHaveAttribute("href", "/student");
  await expect(nav.getByRole("link", { name: "My assignments" })).toHaveAttribute("href", "/student/assignments");
  await expect(nav.getByRole("link", { name: "Log in" })).toHaveCount(0);
});

test("the copyright year is the current year, never hard-coded", async ({ page }) => {
  const thisYear = new Date().getFullYear();
  const response = await page.goto("/courses");
  // Server-rendered HTML already carries this year (no JavaScript needed).
  expect(await response!.text()).toMatch(new RegExp(`©\\s*(<!-- -->)?\\s*<span[^>]*data-testid="current-year"[^>]*>${thisYear}<`));
  await expect(footer(page).getByTestId("current-year")).toHaveText(String(thisYear));
  await expect(footer(page)).toContainText(`© ${thisYear} NowLMS. All rights reserved.`);
});

test("the year rolls over by itself when a new year starts", async ({ page }) => {
  // Pretend it is New Year's Day a few years from now in the visitor's browser.
  const future = new Date().getFullYear() + 5;
  await page.clock.setFixedTime(new Date(`${future}-01-01T00:00:05`));
  await page.goto("/");
  await expect(footer(page).getByTestId("current-year")).toHaveText(String(future));
});

test("the footer sits at the bottom of short pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto("/login");
  const box = await footer(page).boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(1400 - 1);
});
