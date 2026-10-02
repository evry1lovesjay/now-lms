"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canTeachCourse } from "@/lib/access";
import { UnsupportedFileError, UploadTooLargeError, deleteCover, deleteDocument, deleteVideo, saveCover } from "@/lib/storage";
import type { ActionState } from "./types";

/** Course settings, tutors and the outline/materials/resources sections. */
const CONTENT_ROLES = ["SUPERADMIN", "CONTENT_ADMIN"] as const;
/** Lessons: admins for every course, tutors for the courses they're assigned to. */
const LESSON_ROLES = ["SUPERADMIN", "CONTENT_ADMIN", "TUTOR"] as const;

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses", "layout");
  revalidatePath("/");
}

async function requireLessonEditor(courseId: string): Promise<SessionUser> {
  const actor = await requireUser(LESSON_ROLES);
  if (!(await canTeachCourse(actor, courseId))) throw new Error("You cannot manage lessons in this course.");
  return actor;
}

/**
 * Applies the cover fields of a course form: a new upload replaces the cover,
 * "removeCover" goes back to the built-in illustration. Returns the new
 * coverImage value, or undefined when nothing changed.
 */
async function applyCover(courseId: string, formData: FormData): Promise<string | null | undefined> {
  const file = formData.get("cover");
  if (file instanceof File && file.size > 0) {
    await saveCover(file, courseId);
    return `/api/course-covers/${courseId}?v=${Date.now()}`;
  }
  if (formData.get("removeCover") === "on") {
    await deleteCover(courseId);
    return null;
  }
  return undefined;
}

function coverError(err: unknown): ActionState {
  if (err instanceof UnsupportedFileError || err instanceof UploadTooLargeError) return { error: err.message };
  throw err;
}

const courseSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(2).max(300),
  description: z.string().trim().min(2).max(5000),
  published: z.literal("on").optional(),
});

export async function updateCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(CONTENT_ROLES);
  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fill in every field." };

  const { courseId, title, summary, description, published } = parsed.data;
  let coverImage: string | null | undefined;
  try {
    coverImage = await applyCover(courseId, formData);
  } catch (err) {
    return coverError(err);
  }
  await db.course.update({
    where: { id: courseId },
    data: { title, summary, description, published: !!published, ...(coverImage !== undefined && { coverImage }) },
  });
  await audit(actor.id, "course.update", courseId);
  refresh(courseId);
  return { success: "Course saved." };
}

const lessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2, "Enter a lesson title.").max(200),
  description: z.string().trim().max(5000).default(""),
});

/** Creates the lesson record; the client then uploads the video to /api/lessons/[id]/video. */
export async function createLesson(formData: FormData): Promise<{ lessonId?: string; error?: string }> {
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { courseId, title, description } = parsed.data;
  const actor = await requireLessonEditor(courseId);
  const last = await db.lesson.findFirst({ where: { courseId }, orderBy: { position: "desc" }, select: { position: true } });
  const lesson = await db.lesson.create({
    data: { courseId, title, description, position: (last?.position ?? 0) + 1 },
  });
  await audit(actor.id, "lesson.create", lesson.id);
  refresh(courseId);
  return { lessonId: lesson.id };
}

const lessonUpdateSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().trim().min(2, "Enter a lesson title.").max(200),
  description: z.string().trim().max(5000).default(""),
});

/** Edit a lesson's title and description (the video is replaced separately). */
export async function updateLesson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = lessonUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { lessonId, title, description } = parsed.data;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) return { error: "Lesson not found." };
  const actor = await requireLessonEditor(lesson.courseId);

  await db.lesson.update({ where: { id: lessonId }, data: { title, description } });
  await audit(actor.id, "lesson.update", lessonId, title);
  refresh(lesson.courseId);
  return { success: "Lesson saved." };
}

export async function deleteLesson(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return;
  const actor = await requireLessonEditor(lesson.courseId);

  await db.lesson.delete({ where: { id: lessonId } });
  await deleteVideo(lesson.videoKey);
  await audit(actor.id, "lesson.delete", lessonId, lesson.title);
  refresh(lesson.courseId);
}

export async function moveLesson(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return;
  await requireLessonEditor(lesson.courseId);
  const neighbour = await db.lesson.findFirst({
    where: { courseId: lesson.courseId, position: direction === "up" ? { lt: lesson.position } : { gt: lesson.position } },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.lesson.update({ where: { id: lesson.id }, data: { position: neighbour.position } }),
    db.lesson.update({ where: { id: neighbour.id }, data: { position: lesson.position } }),
  ]);
  refresh(lesson.courseId);
}

export async function assignTutor(formData: FormData) {
  const actor = await requireUser(CONTENT_ROLES);
  const courseId = String(formData.get("courseId") ?? "");
  const tutorId = String(formData.get("tutorId") ?? "");

  const tutor = await db.user.findUnique({ where: { id: tutorId }, select: { role: true } });
  if (tutor?.role !== "TUTOR") throw new Error("Only tutors can be assigned to courses.");

  await db.courseTutor.upsert({
    where: { tutorId_courseId: { tutorId, courseId } },
    create: { tutorId, courseId },
    update: {},
  });
  await audit(actor.id, "course.tutor.assign", courseId, tutorId);
  refresh(courseId);
}

export async function unassignTutor(formData: FormData) {
  const actor = await requireUser(CONTENT_ROLES);
  const courseId = String(formData.get("courseId") ?? "");
  const tutorId = String(formData.get("tutorId") ?? "");
  await db.courseTutor.deleteMany({ where: { tutorId, courseId } });
  await audit(actor.id, "course.tutor.unassign", courseId, tutorId);
  refresh(courseId);
}

const newCourseSchema = z.object({
  title: z.string().trim().min(2, "Enter a course title.").max(120),
  summary: z.string().trim().min(2, "Enter a short summary.").max(300),
  description: z.string().trim().min(2, "Enter a description.").max(5000),
  published: z.literal("on").optional(),
});

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "course"
  );
}

/** Super admins and content admins can create courses. New courses get the same fixed sections as every other course. */
export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(CONTENT_ROLES);
  const parsed = newCourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, summary, description, published } = parsed.data;
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await db.course.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;

  const course = await db.course.create({ data: { slug, title, summary, description, published: !!published } });
  try {
    const coverImage = await applyCover(course.id, formData);
    if (coverImage) await db.course.update({ where: { id: course.id }, data: { coverImage } });
  } catch (err) {
    // Don't leave a half-created course behind when the cover is rejected.
    await db.course.delete({ where: { id: course.id } });
    return coverError(err);
  }
  await audit(actor.id, "course.create", course.id, title);
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${course.id}`);
}

/** Remove an item from a course section (outline, materials, resources). Admins only. */
export async function deleteCourseContent(formData: FormData) {
  const actor = await requireUser(CONTENT_ROLES);
  const id = String(formData.get("contentId") ?? "");
  const item = await db.courseContent.findUnique({ where: { id }, include: { course: { select: { slug: true } } } });
  if (!item) return;

  await db.courseContent.delete({ where: { id } });
  await deleteDocument(item.fileKey);
  await audit(actor.id, "course.content.delete", item.courseId, `${item.section}: ${item.title}`);
  revalidatePath(`/courses/${item.course.slug}`);
}
