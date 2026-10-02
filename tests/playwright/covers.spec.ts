import { statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const FIXTURE = path.resolve("tests/fixtures/cover.jpg");

test("every existing course shows its built-in illustration", async ({ page }) => {
  await page.goto("/");
  const covers = page.getByTestId("course-cover");
  await expect(covers).toHaveCount(4);
  const srcs = await covers.evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
  expect(srcs).toEqual([
    "/course-covers/software-quality-assurance.svg",
    "/course-covers/data-analytics.svg",
    "/course-covers/product-management.svg",
    "/course-covers/product-design.svg",
  ]);
  for (const src of srcs) {
    const res = await page.request.get(src!);
    expect(res.ok()).toBe(true);
    expect((await res.body()).length).toBeLessThan(10_000); // lightweight
  }
  // Covers are lazy-loaded and have intrinsic sizes so the layout never jumps.
  await expect(covers.first()).toHaveAttribute("loading", "lazy");
  await expect(covers.first()).toHaveAttribute("width", "640");
});

test("an uploaded cover is resized and compressed to a small WebP", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses/new");
  await page.getByLabel("Title").fill("Cloud Engineering");
  await page.getByLabel("Summary").fill("Deploy and run apps on the cloud.");
  await page.getByLabel("Description").fill("AWS, containers and infrastructure as code.");
  await page.getByLabel(/^Cover image/).setInputFiles(FIXTURE);
  await expect(page.getByTestId("cover-preview")).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/(?!new$)[^/]+$/);

  await page.goto("/");
  const cover = page.getByTestId("course-cover").last();
  const src = await cover.getAttribute("src");
  expect(src).toMatch(/^\/api\/course-covers\/[a-z0-9]+\?v=\d+$/);

  const res = await page.request.get(src!);
  expect(res.headers()["content-type"]).toBe("image/webp");
  expect(res.headers()["cache-control"]).toContain("immutable");
  const bytes = (await res.body()).length;
  expect(bytes).toBeLessThan(150_000);
  expect(bytes).toBeLessThan(statSync(FIXTURE).size);
  const size = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, src!);
  expect(size).toEqual([960, 540]);
});

test("admins can replace a cover and go back to the built-in illustration", async ({ page }) => {
  await login(page, "superadmin");
  await page.goto("/admin/courses");
  await page.getByRole("link", { name: /Data Analytics/ }).click();

  await page.getByLabel(/^Cover image/).setInputFiles(FIXTURE);
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByText("Course saved.")).toBeVisible();
  await page.goto("/courses/data-analytics");
  await expect(page.locator("header img").first()).toHaveAttribute("src", /^\/api\/course-covers\//);

  await page.goto("/admin/courses");
  await page.getByRole("link", { name: /Data Analytics/ }).click();
  await page.getByLabel("Use the built-in illustration instead").check();
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByText("Course saved.")).toBeVisible();
  await page.goto("/courses/data-analytics");
  await expect(page.locator("header img").first()).toHaveAttribute("src", "/course-covers/data-analytics.svg");
});

test("non-image files are rejected as covers", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses/new");
  await page.getByLabel("Title").fill("Broken Cover");
  await page.getByLabel("Summary").fill("Should not be created.");
  await page.getByLabel("Description").fill("The cover is not an image.");
  await page.getByLabel(/^Cover image/).setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("hello") });
  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page.getByText("Upload a JPEG, PNG, WebP or GIF image.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Broken Cover" })).toHaveCount(0);
});
