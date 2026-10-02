import { expect, test } from "@playwright/test";

const isDark = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

test("theme toggle cycles System → Light → Dark and is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await expect(toggle).toHaveText(/System/);
  expect(await isDark(page)).toBe(false);

  await toggle.click();
  await expect(toggle).toHaveText(/Light/);
  expect(await isDark(page)).toBe(false);

  await toggle.click();
  await expect(toggle).toHaveText(/Dark/);
  expect(await isDark(page)).toBe(true);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  // Applied before first paint on reload (set by the inline head script, not after hydration).
  await page.reload({ waitUntil: "commit" });
  await page.waitForSelector("body");
  expect(await isDark(page)).toBe(true);
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveText(/Dark/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(bg);
});

test("System follows the operating system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await isDark(page)).toBe(true);
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => isDark(page)).toBe(false);
});
