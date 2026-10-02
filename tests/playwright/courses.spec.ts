import path from "node:path";
import { expect, test } from "@playwright/test";
import { accounts, COURSE_TITLES, SEEDED_LESSON_TITLE } from "../support/accounts";
import { enrollInSqa, login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

test("home page lists the four courses", async ({ page }) => {
  await page.goto("/");
  for (const title of COURSE_TITLES) {
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  }
});

test("content admin adds a lesson with a video, reorders it and deletes it", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses");
  await page.getByRole("link", { name: /Data Analytics/ }).click();

  await page.getByLabel("Lesson title").fill("SQL basics");
  await page.locator("#lesson-description").fill("SELECT * FROM learning");
  await page.getByLabel(/^Video/).setInputFiles(path.resolve("tests/fixtures/sample.webm"));
  await page.getByRole("button", { name: "Add lesson" }).click();

  const lesson = page.locator("li", { hasText: "SQL basics" });
  await expect(lesson).toContainText("Video ·");

  await page.getByLabel("Lesson title").fill("Intro");
  await page.getByRole("button", { name: "Add lesson" }).click();
  await expect(page.locator("li", { hasText: "Intro" })).toContainText("No video uploaded");

  await page.locator("li", { hasText: "Intro" }).getByRole("button", { name: "Move up" }).click();
  await expect(page.locator("ol > li").first()).toContainText("Intro");

  page.once("dialog", (d) => d.accept());
  await lesson.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("li", { hasText: "SQL basics" })).toHaveCount(0);
});

test("content admin assigns a tutor to a course", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/admin/courses");
  await page.getByRole("link", { name: /Product Design/ }).click();

  await page.locator("select[name=tutorId]").selectOption({ label: `Demo Tutor (${accounts.tutor.email})` });
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.locator("li", { hasText: accounts.tutor.email })).toBeVisible();

  await page.context().clearCookies();
  await login(page, "tutor");
  await expect(page.getByRole("heading", { name: "Product Design" })).toBeVisible();
});

test("student enrolls, watches a lesson and completes it; tutor sees the progress", async ({ page }) => {
  await login(page, "student");
  await page.goto("/courses/software-quality-assurance");
  // Lessons are listed but not playable before enrolling.
  await expect(page.getByRole("link", { name: SEEDED_LESSON_TITLE })).toHaveCount(0);

  await enrollInSqa(page);
  await page.getByRole("link", { name: SEEDED_LESSON_TITLE }).click();

  const video = page.locator("video");
  await expect(video).toHaveAttribute("controlslist", /nodownload/);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(1);
  await expect(page.getByText(accounts.student.email)).toBeVisible(); // watermark

  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByRole("button", { name: "✓ Completed" })).toBeVisible();

  await page.goto("/student");
  await expect(page.getByText("100%")).toBeVisible();

  await page.context().clearCookies();
  await login(page, "tutor");
  const row = page.locator("tr", { hasText: accounts.student.email });
  await expect(row).toContainText("100%");
});
