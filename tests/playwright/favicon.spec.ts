import { expect, test } from "@playwright/test";

test("every page links a favicon, an SVG icon and an Apple touch icon, and serves them", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator('head link[rel~="icon"], head link[rel="apple-touch-icon"]').evaluateAll((links) =>
    links.map((l) => ({ rel: l.getAttribute("rel"), href: (l as HTMLLinkElement).href })),
  );
  const find = (pattern: RegExp) => hrefs.find((l) => pattern.test(new URL(l.href).pathname));
  expect(find(/^\/favicon\.ico$/)).toBeTruthy();
  expect(find(/^\/icon\.svg$/)).toBeTruthy();
  expect(find(/^\/apple-icon\.png$/)?.rel).toBe("apple-touch-icon");

  for (const { href } of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^image\//);
  }
});

test("the navbar logo shows the same mark", async ({ page }) => {
  await page.goto("/courses");
  const logo = page.getByRole("link", { name: "NowLMS" });
  await expect(logo.locator('svg[aria-hidden="true"]')).toBeVisible();
});
