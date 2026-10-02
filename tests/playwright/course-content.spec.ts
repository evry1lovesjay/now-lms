import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { enrollInSqa, login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const SQA = "/courses/software-quality-assurance";

function section(page: Page, key: "OUTLINE" | "MATERIALS" | "RESOURCES") {
  return page.locator(`[data-section="${key}"]`);
}

async function post(
  page: Page,
  sectionLabel: string,
  item: { title: string; url?: string; file?: string },
) {
  const composer = page.getByTestId("content-composer");
  await composer.getByLabel("What do you want to add?").selectOption({ label: sectionLabel });
  if (item.file) await composer.getByLabel("Upload a file").check();
  await composer.getByLabel("Title").fill(item.title);
  if (item.url) await composer.getByLabel("Link", { exact: true }).fill(item.url);
  if (item.file) await composer.getByLabel(/^File/).setInputFiles(item.file);
  await composer.getByRole("button", { name: /^Add to/ }).click();
  await expect(page.getByText(item.title)).toBeVisible();
}

async function postSqaBasics(page: Page) {
  await page.goto(SQA);
  await post(page, "📋 Course outline", { title: "SQA syllabus", file: path.resolve("tests/fixtures/sample.pdf") });
  await post(page, "📚 Course materials", { title: "Testing handbook", url: "https://example.com/handbook" });
  await post(page, "🔗 Resources", { title: "Live class — Mondays", url: "https://meet.google.com/abc-defg-hij" });
  await post(page, "🔗 Resources", { title: "Recorded session 1", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
}

test("the composer offers exactly the three sections, and resources only take links", async ({ page }) => {
  await login(page, "tutor");
  await page.goto(SQA);
  const composer = page.getByTestId("content-composer");
  await expect(composer.getByLabel("What do you want to add?").locator("option:not([disabled])")).toHaveText([
    "📋 Course outline",
    "📚 Course materials",
    "🔗 Resources",
  ]);
  await composer.getByLabel("What do you want to add?").selectOption({ label: "🔗 Resources" });
  await expect(composer.getByLabel("Upload a file")).toHaveCount(0);
  await composer.getByLabel("What do you want to add?").selectOption({ label: "📋 Course outline" });
  await expect(composer.getByLabel("Upload a file")).toBeVisible();
});

test("assigned tutor posts outline, materials and resources; learners see them colour-coded above the lessons", async ({
  page,
}) => {
  await login(page, "tutor");
  await postSqaBasics(page);
  await expect(section(page, "RESOURCES")).toContainText("Live class");
  await expect(section(page, "RESOURCES")).toContainText("Video");

  // Sections render before the lessons list.
  const sectionsY = (await page.getByTestId("course-sections").boundingBox())!.y;
  const lessonsY = (await page.getByRole("heading", { name: /^Lessons/ }).boundingBox())!.y;
  expect(sectionsY).toBeLessThan(lessonsY);

  // A student who hasn't enrolled sees the outline, but materials and resources are locked.
  await page.context().clearCookies();
  await login(page, "student");
  await page.goto(SQA);
  await expect(section(page, "OUTLINE")).toContainText("SQA syllabus");
  await expect(section(page, "MATERIALS")).toContainText("Enroll to see");
  await expect(section(page, "RESOURCES")).not.toContainText("Live class — Mondays");

  await enrollInSqa(page);
  await expect(section(page, "MATERIALS")).toContainText("Testing handbook");
  const meet = section(page, "RESOURCES").getByRole("link", { name: "Live class — Mondays" });
  await expect(meet).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await expect(meet).toHaveAttribute("target", "_blank");
  await expect(page.getByTestId("content-composer")).toHaveCount(0);
});

test("outline files are public; materials files need course access", async ({ page, playwright }) => {
  await login(page, "contentAdmin");
  await page.goto(SQA);
  await post(page, "📋 Course outline", { title: "Outline PDF", file: path.resolve("tests/fixtures/sample.pdf") });
  await post(page, "📚 Course materials", { title: "Chapter 1 PDF", file: path.resolve("tests/fixtures/sample.pdf") });

  const outlineHref = await section(page, "OUTLINE").getByRole("link", { name: "Outline PDF" }).getAttribute("href");
  const materialHref = await section(page, "MATERIALS").getByRole("link", { name: "Chapter 1 PDF" }).getAttribute("href");

  const anon = await playwright.request.newContext({ baseURL: page.url() });
  const outline = await anon.get(outlineHref!);
  expect(outline.status()).toBe(200);
  expect(outline.headers()["content-type"]).toBe("application/pdf");
  expect((await anon.get(materialHref!)).status()).toBe(401);
  await anon.dispose();
});

test("tutors can only post to courses they are assigned to; unsafe links are rejected", async ({ page }) => {
  await login(page, "tutor");
  await page.goto("/courses/data-analytics");
  await expect(page.getByTestId("content-composer")).toHaveCount(0);

  // Find the Data Analytics course id from the admin listing as a content admin.
  const admin = await page.context().browser()!.newContext();
  const adminPage = await admin.newPage();
  await login(adminPage, "contentAdmin");
  await adminPage.goto("/admin/courses");
  const href = await adminPage.getByRole("link", { name: /Data Analytics/ }).getAttribute("href");
  const courseId = href!.split("/").pop();

  const res = await page.request.post(`/api/courses/${courseId}/content`, {
    multipart: { section: "RESOURCES", kind: "LINK", title: "Sneaky", url: "https://example.com" },
  });
  expect(res.status()).toBe(403);

  const bad = await adminPage.request.post(`/api/courses/${courseId}/content`, {
    multipart: { section: "RESOURCES", kind: "LINK", title: "Bad link", url: "javascript:alert(1)" },
  });
  expect(bad.status()).toBe(400);
});

test("staff can remove a posted item", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto(SQA);
  await post(page, "🔗 Resources", { title: "Old link", url: "https://example.com/old" });
  page.once("dialog", (d) => d.accept());
  await section(page, "RESOURCES").locator("li", { hasText: "Old link" }).getByRole("button", { name: "Remove" }).click();
  await expect(section(page, "RESOURCES")).toContainText("Nothing posted yet.");
});
