import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { SUBMISSION_EXTS, normalizeUrl } from "@/lib/file-types";
import { UnsupportedFileError, UploadTooLargeError, deleteDocument, saveDocument } from "@/lib/storage";

export const runtime = "nodejs";

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Submit (or resubmit) an assignment. Students enrolled in the course can
 * submit text, a link and/or a file. Resubmitting replaces the previous
 * submission until it has been graded.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Not signed in.", 401);
  if (user.role !== "STUDENT") return fail("Only students can submit assignments.", 403);

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { slug: true } } },
  });
  if (!assignment) return fail("Assignment not found.", 404);
  if (!(await canAccessCourse(user, assignment.courseId))) return fail("Enroll in the course to submit.", 403);

  const existing = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
  });
  if (existing?.gradedAt) return fail("This assignment has already been graded.", 409);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Upload failed. Files can be at most 25 MB.");
  }

  const text = String(form.get("text") ?? "").trim().slice(0, 20000);
  const rawLink = String(form.get("linkUrl") ?? "").trim();
  const linkUrl = rawLink ? normalizeUrl(rawLink) : null;
  if (rawLink && !linkUrl) return fail("Enter a valid link starting with http:// or https://.");

  const file = form.get("file");
  let saved: Awaited<ReturnType<typeof saveDocument>> | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      saved = await saveDocument(file, SUBMISSION_EXTS, `submissions/${assignmentId}`);
    } catch (err) {
      if (err instanceof UnsupportedFileError || err instanceof UploadTooLargeError) return fail(err.message);
      throw err;
    }
  }

  // Keep the previous file if the student resubmits without choosing a new one.
  const keepOldFile = !saved && existing?.fileKey && form.get("removeFile") !== "on";
  if (!text && !linkUrl && !saved && !keepOldFile) return fail("Add your answer, a link or a file.");

  const fileData = saved
    ? { fileKey: saved.key, fileName: saved.name, fileType: saved.type, fileSize: saved.size }
    : keepOldFile
      ? {}
      : { fileKey: null, fileName: null, fileType: null, fileSize: null };

  await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    create: { assignmentId, studentId: user.id, text, linkUrl, ...fileData },
    update: { text, linkUrl, submittedAt: new Date(), ...fileData },
  });
  if (existing?.fileKey && (saved || !keepOldFile)) await deleteDocument(existing.fileKey);

  revalidatePath(`/courses/${assignment.course.slug}/assignments`, "layout");
  revalidatePath("/student/assignments");
  return NextResponse.json({ ok: true });
}
