import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canTeachCourse } from "@/lib/access";
import { documentResponse } from "@/lib/file-response";

export const runtime = "nodejs";

/** A submission file is visible to the student who submitted it and to the course's tutors/admins. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const submission = await db.submission.findUnique({
    where: { id },
    include: { assignment: { select: { courseId: true } } },
  });
  if (!submission?.fileKey) return new Response("File not found.", { status: 404 });

  const allowed = submission.studentId === user.id || (await canTeachCourse(user, submission.assignment.courseId));
  if (!allowed) return new Response("Not allowed.", { status: 403 });

  return documentResponse({ key: submission.fileKey, name: submission.fileName, type: submission.fileType });
}
