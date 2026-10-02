import path from "node:path";
import { expect, test } from "@playwright/test";
import { SEEDED_LESSON_TITLE } from "../support/accounts";
import { login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const SQA = "/courses/software-quality-assurance";

test("a tutor uploads, edits and reorders lessons in their course", async ({ page }) => {
  await login(page, "tutor");
  await page.goto("/tutor");
  await page.getByRole("link", { name: "Manage lessons" }).click();
  await expect(page).toHaveURL(new RegExp(`${SQA}/manage$`));

  await page.getByLabel("Lesson title").fill("Writing good bug reports");
  await page.locator("#lesson-description").fill("Steps, expected vs actual, evidence.");
  await page.getByLabel(/^Video/).setInputFiles(path.resolve("tests/fixtures/sample.webm"));
  await page.getByRole("button", { name: "Add lesson" }).click();
  const row = page.locator("li[data-lesson='Writing good bug reports']");
  await expect(row).toContainText("Video ·");

  // Edit the title and description.
  await row.getByRole("button", { name: "Edit" }).click();
  await row.getByLabel("Title").fill("Bug reports that get fixed");
  await row.getByLabel("Description").fill("Updated description.");
  await row.getByRole("button", { name: "Save lesson" }).click();
  const edited = page.locator("li[data-lesson='Bug reports that get fixed']");
  await expect(edited).toBeVisible();
  await expect(edited.getByRole("button", { name: "Save lesson" })).toHaveCount(0);

  // Reorder: move the new lesson above the seeded one.
  await edited.getByRole("button", { name: "Move up" }).click();
  await expect(page.locator("ol > li").first()).toContainText("Bug reports that get fixed");

  // Learners see the edited lesson.
  await page.goto(SQA);
  await expect(page.getByText("Bug reports that get fixed")).toBeVisible();
  await page.getByRole("link", { name: "Bug reports that get fixed" }).click();
  await expect(page.getByText("Updated description.")).toBeVisible();
});

test("tutors cannot manage lessons in courses they don't teach", async ({ page, browser }) => {
  await login(page, "tutor");
  await page.goto("/courses/data-analytics/manage");
  await expect(page).toHaveURL(/\/courses\/data-analytics$/);

  // Nor upload a video to another course's lesson through the API.
  const admin = await (await browser.newContext()).newPage();
  await login(admin, "contentAdmin");
  await admin.goto("/courses/data-analytics/manage");
  await admin.getByLabel("Lesson title").fill("Pivot tables");
  await admin.getByRole("button", { name: "Add lesson" }).click();
  const lessonHref = await admin.getByRole("link", { name: "Pivot tables" }).getAttribute("href");
  const lessonId = lessonHref!.split("/").pop();

  const res = await page.request.put(`/api/lessons/${lessonId}/video`, {
    headers: { "content-type": "video/webm" },
    data: Buffer.from("not really a video"),
  });
  expect(res.status()).toBe(403);
});

test("students cannot open lesson management", async ({ page }) => {
  await login(page, "student");
  await page.goto(`${SQA}/manage`);
  await expect(page).toHaveURL(/\/student$/);
});

test("admins can edit lessons from the admin course page", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses");
  await page.getByRole("link", { name: /Software Quality Assurance/ }).click();
  const row = page.locator(`li[data-lesson='${SEEDED_LESSON_TITLE}']`);
  await row.getByRole("button", { name: "Edit" }).click();
  await row.getByLabel("Title").fill("Welcome to QA");
  await row.getByRole("button", { name: "Save lesson" }).click();
  await expect(page.locator("li[data-lesson='Welcome to QA']")).toBeVisible();
});
