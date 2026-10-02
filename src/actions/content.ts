"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canTeachCourse } from "@/lib/access";
import { deleteDocument, deleteVideo } from "@/lib/storage";
import type { ActionState } from "./types";

const CONTENT_ROLES = ["SUPERADMIN", "CONTENT_ADMIN"] as const;

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses", "layout");
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
  await db.course.update({ where: { id: courseId }, data: { title, summary, description, published: !!published } });
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
  const actor = await requireUser(CONTENT_ROLES);
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { courseId, title, description } = parsed.data;
  const last = await db.lesson.findFirst({ where: { courseId }, orderBy: { position: "desc" }, select: { position: true } });
  const lesson = await db.lesson.create({
    data: { courseId, title, description, position: (last?.position ?? 0) + 1 },
  });
  await audit(actor.id, "lesson.create", lesson.id);
  refresh(courseId);
  return { lessonId: lesson.id };
}

export async function deleteLesson(formData: FormData) {
  const actor = await requireUser(CONTENT_ROLES);
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await db.lesson.delete({ where: { id: lessonId } });
  await deleteVideo(lesson.videoKey);
  await audit(actor.id, "lesson.delete", lessonId, lesson.title);
  refresh(lesson.courseId);
}

export async function moveLesson(formData: FormData) {
  await requireUser(CONTENT_ROLES);
  const lessonId = String(formData.get("lessonId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return;
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
  await audit(actor.id, "course.create", course.id, title);
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${course.id}`);
}

/** Remove an item from a course section. Allowed for anyone who can teach the course. */
export async function deleteCourseContent(formData: FormData) {
  const actor = await requireUser(["SUPERADMIN", "CONTENT_ADMIN", "TUTOR"]);
  const id = String(formData.get("contentId") ?? "");
  const item = await db.courseContent.findUnique({ where: { id }, include: { course: { select: { slug: true } } } });
  if (!item) return;
  if (!(await canTeachCourse(actor, item.courseId))) throw new Error("Not allowed.");

  await db.courseContent.delete({ where: { id } });
  await deleteDocument(item.fileKey);
  await audit(actor.id, "course.content.delete", item.courseId, `${item.section}: ${item.title}`);
  revalidatePath(`/courses/${item.course.slug}`);
}
