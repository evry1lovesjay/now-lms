import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageContent } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { sectionByKey } from "@/lib/course-content";
import { normalizeUrl } from "@/lib/file-types";
import { UnsupportedFileError, UploadTooLargeError, saveDocument } from "@/lib/storage";

export const runtime = "nodejs";

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Adds an item to one of a course's fixed sections (outline, materials,
 * resources). Allowed for super admins and content admins.
 * Body: multipart form with section, kind (LINK | FILE), title, and url or file.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Not signed in.", 401);

  if (!canManageContent(user.role)) return fail("Only admins can post course content.", 403);
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, slug: true } });
  if (!course) return fail("Course not found.", 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Upload failed. Files can be at most 25 MB.");
  }

  const section = sectionByKey(String(form.get("section") ?? ""));
  if (!section) return fail("Choose a section.");
  const kind = form.get("kind") === "FILE" ? "FILE" : "LINK";
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (title.length < 2) return fail("Enter a title.");

  let data: { url?: string; fileKey?: string; fileName?: string; fileType?: string; fileSize?: number };
  if (kind === "LINK") {
    const url = normalizeUrl(String(form.get("url") ?? ""));
    if (!url) return fail("Enter a valid link starting with http:// or https://.");
    data = { url };
  } else {
    if (section.fileTypes.length === 0) return fail(`${section.label} only accepts links.`);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
    try {
      const saved = await saveDocument(file, section.fileTypes, `courses/${course.id}`);
      data = { fileKey: saved.key, fileName: saved.name, fileType: saved.type, fileSize: saved.size };
    } catch (err) {
      if (err instanceof UnsupportedFileError || err instanceof UploadTooLargeError) return fail(err.message);
      throw err;
    }
  }

  const item = await db.courseContent.create({
    data: { courseId: course.id, section: section.key, kind, title, createdById: user.id, ...data },
  });
  await audit(user.id, "course.content.create", course.id, `${section.key}: ${title}`);

  revalidatePath(`/courses/${course.slug}`);
  return NextResponse.json({ ok: true, id: item.id });
}
