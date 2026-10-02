import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { enrollInSqa, login, resetDb } from "./helpers";

test.beforeEach(() => resetDb());

const SQA = "/courses/software-quality-assurance";

async function postAssignment(page: Page, title: string, maxScore = 100) {
  await page.goto(`${SQA}/assignments`);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Instructions").fill("Write 5 test cases for the login page.");
  await page.getByLabel("Due (optional)").fill("2030-01-15T17:00");
  await page.getByLabel("Max score").fill(String(maxScore));
  await page.getByRole("button", { name: "Post assignment" }).click();
  await expect(page.getByText(`"${title}" was posted.`)).toBeVisible();
}

test("tutor posts, student submits, tutor grades, student sees the grade", async ({ page, browser }) => {
  await login(page, "tutor");
  await postAssignment(page, "Login test cases");

  const student = await (await browser.newContext()).newPage();
  await login(student, "student");
  await enrollInSqa(student);
  await student.goto("/student/assignments");
  const row = student.locator("tr", { hasText: "Login test cases" });
  await expect(row).toContainText("To do");

  await row.getByRole("link", { name: "Login test cases" }).click();
  await student.getByLabel("Your answer").fill("TC1: valid login…");
  await student.getByLabel("Link (optional)").fill("https://github.com/student/qa-homework");
  await student.getByLabel(/^File/).setInputFiles(path.resolve("tests/fixtures/sample.pdf"));
  await student.getByRole("button", { name: "Submit assignment" }).click();
  await expect(student.getByText("Submitted · awaiting grade")).toBeVisible();
  await expect(student.getByRole("link", { name: "sample.pdf" })).toBeVisible();

  // Tutor sees the submission, opens the file and grades it.
  await page.goto(`${SQA}/assignments`);
  await expect(page.getByText("1 to grade")).toBeVisible();
  await page.getByRole("link", { name: "Login test cases" }).click();
  const submission = page.locator('[data-student="student@nowlms.local"]');
  await expect(submission).toContainText("TC1: valid login");
  const fileHref = await submission.getByRole("link", { name: "sample.pdf" }).getAttribute("href");
  expect((await page.request.get(fileHref!)).status()).toBe(200);

  // Scores above the maximum are rejected (by the browser here, and again on the server).
  await submission.getByLabel("Score").fill("150");
  expect(await submission.getByLabel("Score").evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  await submission.getByLabel("Score").fill("85");
  await submission.getByLabel("Feedback").fill("Great coverage.");
  await submission.getByRole("button", { name: "Save grade" }).click();
  await expect(submission.getByText("Grade saved.")).toBeVisible();

  // Student sees grade + feedback, and can no longer resubmit.
  await student.reload();
  await expect(student.getByText("Grade: 85/100")).toBeVisible();
  await expect(student.getByText("Great coverage.")).toBeVisible();
  await expect(student.getByRole("button", { name: /Submit assignment|Update submission/ })).toHaveCount(0);
  await student.goto("/student/assignments");
  await expect(student.locator("tr", { hasText: "Login test cases" })).toContainText("Graded · 85/100");
  await expect(student.getByTestId("overall-score")).toHaveText("85%");
});

test("students can update a submission before it is graded", async ({ page }) => {
  await login(page, "tutor");
  await postAssignment(page, "Bug report");

  await page.context().clearCookies();
  await login(page, "student");
  await enrollInSqa(page);
  await page.goto(`${SQA}/assignments`);
  await page.getByRole("link", { name: "Bug report" }).click();
  await page.getByLabel("Your answer").fill("First draft");
  await page.getByRole("button", { name: "Submit assignment" }).click();
  await expect(page.getByText("Submitted · awaiting grade")).toBeVisible();

  await page.getByLabel("Your answer").fill("Final version");
  await page.getByRole("button", { name: "Update submission" }).click();
  await expect(page.locator("p", { hasText: "Final version" }).first()).toBeVisible();
});

test("submission files are private to the student and the course's teachers", async ({ page, browser }) => {
  await login(page, "tutor");
  await postAssignment(page, "Private work");

  const student = await (await browser.newContext()).newPage();
  await login(student, "student");
  await enrollInSqa(student);
  await student.goto(`${SQA}/assignments`);
  await student.getByRole("link", { name: "Private work" }).click();
  await student.getByLabel(/^File/).setInputFiles(path.resolve("tests/fixtures/sample.pdf"));
  await student.getByRole("button", { name: "Submit assignment" }).click();
  const href = await student.getByRole("link", { name: "sample.pdf" }).getAttribute("href");

  const other = await (await browser.newContext()).newPage();
  await other.goto("/register");
  await other.getByLabel("Full name").fill("Other Student");
  await other.getByLabel("Email").fill("other@example.com");
  await other.getByLabel("Password").fill("Secret123!");
  await other.getByRole("button", { name: "Create student account" }).click();
  await expect(other).toHaveURL(/\/student$/);
  await enrollInSqa(other);
  expect((await other.request.get(href!)).status()).toBe(403);
});

test("students who are not enrolled cannot see a course's assignments", async ({ page }) => {
  await login(page, "student");
  await page.goto(`${SQA}/assignments`);
  await expect(page).toHaveURL(new RegExp(`${SQA}$`));
});

test("tutors cannot post assignments in courses they don't teach", async ({ page }) => {
  await login(page, "tutor");
  await page.goto("/courses/data-analytics/assignments");
  await expect(page).toHaveURL(/\/courses\/data-analytics$/);
});
