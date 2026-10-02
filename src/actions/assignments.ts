"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canTeachCourse } from "@/lib/access";
import { audit } from "@/lib/audit";
import { deleteDocument } from "@/lib/storage";
import type { ActionState } from "./types";

const TEACHING_ROLES = ["SUPERADMIN", "CONTENT_ADMIN", "TUTOR"] as const;

function refresh(slug: string) {
  revalidatePath(`/courses/${slug}`, "layout");
  revalidatePath("/student/assignments");
  revalidatePath("/tutor");
}

const assignmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2, "Enter a title.").max(200),
  instructions: z.string().trim().min(2, "Enter the instructions.").max(20000),
  dueAt: z.string().optional(),
  maxScore: z.coerce.number().int("Max score must be a whole number.").min(1, "Max score must be at least 1.").max(1000),
});

/** Tutors (for their courses), content admins and super admins post assignments. */
export async function createAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(TEACHING_ROLES);
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { courseId, title, instructions, dueAt, maxScore } = parsed.data;
  const course = await db.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course || !(await canTeachCourse(actor, courseId))) return { error: "You cannot post assignments in this course." };

  // The form converts the picked local date/time to an ISO timestamp in the browser.
  let due: Date | null = null;
  if (dueAt) {
    due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return { error: "Enter a valid due date." };
  }

  const assignment = await db.assignment.create({
    data: { courseId, title, instructions, maxScore, dueAt: due, createdById: actor.id },
  });
  await audit(actor.id, "assignment.create", assignment.id, title);
  refresh(course.slug);
  return { success: `"${title}" was posted.` };
}

export async function deleteAssignment(formData: FormData) {
  const actor = await requireUser(TEACHING_ROLES);
  const id = String(formData.get("assignmentId") ?? "");
  const assignment = await db.assignment.findUnique({
    where: { id },
    include: { course: { select: { slug: true } }, submissions: { select: { fileKey: true } } },
  });
  if (!assignment) return;
  if (!(await canTeachCourse(actor, assignment.courseId))) throw new Error("Not allowed.");

  await db.assignment.delete({ where: { id } });
  await Promise.all(assignment.submissions.map((s) => deleteDocument(s.fileKey)));
  await audit(actor.id, "assignment.delete", id, assignment.title);
  refresh(assignment.course.slug);
}

const gradeSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().int("Score must be a whole number.").min(0, "Score cannot be negative."),
  feedback: z.string().trim().max(5000).default(""),
});

/** Grade (or re-grade) a submission. Students see the score and feedback straight away. */
export async function gradeSubmission(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(TEACHING_ROLES);
  const parsed = gradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { submissionId, score, feedback } = parsed.data;
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { course: { select: { slug: true } } } } },
  });
  if (!submission || !(await canTeachCourse(actor, submission.assignment.courseId))) return { error: "Not allowed." };
  if (score > submission.assignment.maxScore) return { error: `Score cannot exceed ${submission.assignment.maxScore}.` };

  await db.submission.update({
    where: { id: submissionId },
    data: { score, feedback: feedback || null, gradedAt: new Date(), gradedById: actor.id },
  });
  await audit(actor.id, "submission.grade", submissionId, `${score}/${submission.assignment.maxScore}`);
  refresh(submission.assignment.course.slug);
  return { success: "Grade saved." };
}
