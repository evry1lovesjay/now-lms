/**
 * Resets the e2e database to a known state:
 * - wipes every table and the test video directory;
 * - re-runs the normal seed (4 courses, super admin, demo accounts);
 * - adds one SQA lesson with a real video ("Seeded video lesson") so video
 *   tests don't depend on the upload flow.
 *
 * Run with `npm run test:db:reset`, or from Playwright/Cypress before each test.
 */
import { execSync } from "node:child_process";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../src/generated/prisma/client";
import { SEEDED_LESSON_TITLE } from "./accounts";
import { testEnv, withTestEnv } from "./test-env";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: testEnv.DATABASE_URL }) });
  try {
    await db.$transaction([
      db.auditLog.deleteMany(),
      db.lessonProgress.deleteMany(),
      db.enrollment.deleteMany(),
      db.courseTutor.deleteMany(),
      db.lesson.deleteMany(),
      db.course.deleteMany(),
      db.user.deleteMany(),
    ]);
    await rm(path.resolve(testEnv.VIDEO_STORAGE_DIR), { recursive: true, force: true });

    execSync("npx tsx prisma/seed.ts", { env: withTestEnv({ NODE_ENV: "test" }), stdio: "ignore" });

    const sqa = await db.course.findUniqueOrThrow({ where: { slug: "software-quality-assurance" } });
    const key = `${sqa.id}/seeded.webm`;
    const target = path.resolve(testEnv.VIDEO_STORAGE_DIR, key);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.resolve("tests/fixtures/sample.webm"), target);
    await db.lesson.create({
      data: {
        courseId: sqa.id,
        title: SEEDED_LESSON_TITLE,
        description: "Fixture lesson created by the e2e reset script.",
        position: 1,
        videoKey: key,
        videoType: "video/webm",
        videoSize: (await stat(target)).size,
      },
    });
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
