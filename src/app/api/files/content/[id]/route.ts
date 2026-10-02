import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { canManageContent } from "@/lib/roles";
import { sectionByKey } from "@/lib/course-content";
import { documentResponse } from "@/lib/file-response";

export const runtime = "nodejs";

/** Course outline files of published courses are public; everything else needs course access. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.courseContent.findUnique({
    where: { id },
    include: { course: { select: { id: true, published: true } } },
  });
  if (!item?.fileKey) return new Response("File not found.", { status: 404 });

  const user = await getCurrentUser();
  const isPublic = !!sectionByKey(item.section)?.public && item.course.published;
  const allowed =
    isPublic || (!!user && (canManageContent(user.role) || (await canAccessCourse(user, item.course.id))));
  if (!allowed) return new Response(user ? "You do not have access to this course." : "Not signed in.", { status: user ? 403 : 401 });

  return documentResponse({ key: item.fileKey, name: item.fileName, type: item.fileType });
}
