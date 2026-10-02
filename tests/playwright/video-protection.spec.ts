import { expect, test, type Page } from "@playwright/test";
import { SEEDED_LESSON_TITLE } from "../support/accounts";
import { acceptNextDialog, enrollInSqa, login, resetDb, userRow } from "./helpers";

test.beforeEach(() => resetDb());

const AS_MEDIA = { "sec-fetch-dest": "video" };

async function openSeededLesson(page: Page) {
  await page.getByRole("link", { name: SEEDED_LESSON_TITLE }).click();
  const src = await page.locator("video").getAttribute("src");
  expect(src).toMatch(/^\/api\/videos\/.+\?t=/);
  return src!;
}

test("video is streamed in ranges with no-store, inline headers", async ({ page }) => {
  await login(page, "student");
  await enrollInSqa(page);
  const src = await openSeededLesson(page);

  const res = await page.request.get(src, { headers: { ...AS_MEDIA, range: "bytes=0-" } });
  expect(res.status()).toBe(206);
  expect(res.headers()["content-range"]).toMatch(/^bytes 0-\d+\/\d+$/);
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["content-disposition"]).toBe("inline");
});

test("opening the video URL directly in a tab is refused", async ({ page }) => {
  await login(page, "student");
  await enrollInSqa(page);
  const src = await openSeededLesson(page);

  const res = await page.goto(src);
  expect(res?.status()).toBe(403);
});

test("signed-out requests are refused", async ({ page, playwright }) => {
  await login(page, "student");
  await enrollInSqa(page);
  const src = await openSeededLesson(page);

  const anon = await playwright.request.newContext({ baseURL: page.url() });
  expect((await anon.get(src, { headers: AS_MEDIA })).status()).toBe(401);
  await anon.dispose();
});

test("a video link copied from another student does not work", async ({ page, browser }) => {
  await login(page, "student");
  await enrollInSqa(page);
  const src = await openSeededLesson(page);

  const other = await (await browser.newContext()).newPage();
  await other.goto("/register");
  await other.getByLabel("Full name").fill("Other Student");
  await other.getByLabel("Email").fill("other@example.com");
  await other.getByLabel("Password").fill("Secret123!");
  await other.getByRole("button", { name: "Create student account" }).click();
  await expect(other).toHaveURL(/\/student$/);
  await enrollInSqa(other);

  expect((await other.request.get(src, { headers: AS_MEDIA })).status()).toBe(403);
});

test("students who are not enrolled cannot open lessons", async ({ page }) => {
  await login(page, "contentAdmin");
  await page.goto("/courses/software-quality-assurance");
  const lessonUrl = await page.getByRole("link", { name: SEEDED_LESSON_TITLE }).getAttribute("href");

  await page.context().clearCookies();
  await login(page, "student");
  await page.goto(lessonUrl!);
  await expect(page).toHaveURL(/\/courses\/software-quality-assurance$/);
});

test("blocking a student stops their video stream immediately", async ({ page, browser }) => {
  await login(page, "student");
  await enrollInSqa(page);
  const src = await openSeededLesson(page);
  expect((await page.request.get(src, { headers: AS_MEDIA })).ok()).toBe(true);

  const admin = await (await browser.newContext()).newPage();
  await login(admin, "contentAdmin");
  await admin.goto("/admin/users");
  acceptNextDialog(admin);
  await userRow(admin, "student@nowlms.local").getByRole("button", { name: "Block" }).click();
  await expect(userRow(admin, "student@nowlms.local")).toContainText("Blocked");

  expect((await page.request.get(src, { headers: AS_MEDIA })).status()).toBe(401);
});
