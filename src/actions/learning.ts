"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";

export async function enroll(formData: FormData) {
  const user = await requireUser(["STUDENT"]);
  const courseId = String(formData.get("courseId") ?? "");
  const course = await db.course.findFirst({ where: { id: courseId, published: true }, select: { slug: true } });
  if (!course) throw new Error("Course not found.");

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId },
    update: {},
  });
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/student");
}

export async function toggleLessonComplete(formData: FormData) {
  const user = await requireUser(["STUDENT"]);
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { course: { select: { slug: true } } } });
  if (!lesson || !(await canAccessCourse(user, lesson.courseId))) throw new Error("Lesson not found.");

  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  if (existing) await db.lessonProgress.delete({ where: { id: existing.id } });
  else await db.lessonProgress.create({ data: { userId: user.id, lessonId } });

  revalidatePath(`/courses/${lesson.course.slug}`, "layout");
  revalidatePath("/student");
}
