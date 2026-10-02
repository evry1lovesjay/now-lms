import { expect, test, type Page } from "@playwright/test";

/** True when the page body is painted with a dark background. */
async function paintedDark(page: Page) {
  const color = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Browsers may report lab(), lch(), oklab(), oklch() or rgb(); use lightness where given.
  const lab = /^(?:lab|lch)\(([\d.]+)/.exec(color);
  if (lab) return Number(lab[1]) < 50;
  const ok = /^(?:oklab|oklch)\(([\d.]+)(%?)/.exec(color);
  if (ok) return Number(ok[1]) / (ok[2] ? 100 : 1) < 0.5;
  const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

test("theme toggle cycles System → Light → Dark and the server renders the saved choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await expect(toggle).toHaveText(/System/);
  expect(await paintedDark(page)).toBe(false);

  await toggle.click();
  await expect(toggle).toHaveText(/Light/);
  expect(await paintedDark(page)).toBe(false);

  await toggle.click();
  await expect(toggle).toHaveText(/Dark/);
  await expect.poll(() => paintedDark(page)).toBe(true);

  // The saved choice comes back from the server already applied — no script, no flash.
  const html = await (await page.request.get("/")).text();
  expect(html).toMatch(/<html[^>]*class="dark"/);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveText(/Dark/);
  expect(await paintedDark(page)).toBe(true);
});

test("System follows the operating system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await paintedDark(page)).toBe(true);
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => paintedDark(page)).toBe(false);
});

test("an explicit Light choice wins over a dark OS preference", async ({ page, context }) => {
  await context.addCookies([{ name: "theme", value: "light", url: "http://localhost:3100" }]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveText(/Light/);
  expect(await paintedDark(page)).toBe(false);
});

test("pages hydrate without errors in every theme", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const theme of ["system", "light", "dark"]) {
    await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3100" }]);
    for (const path of ["/", "/login", "/register", "/courses/software-quality-assurance"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
  }
  expect(errors).toEqual([]);
});
