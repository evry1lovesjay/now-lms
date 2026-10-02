import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageContent } from "@/lib/roles";
import { audit } from "@/lib/audit";
import { ALLOWED_VIDEO_TYPES, UploadTooLargeError, deleteVideo, maxVideoBytes, saveVideo } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload (or replace) a lesson's video. The raw file is sent as the request
 * body and streamed straight to storage, so large files are never held in memory.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_VIDEO_TYPES[contentType]) {
    return NextResponse.json({ error: "Upload an MP4, WebM, OGG or MOV video." }, { status: 415 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxVideoBytes()) {
    return NextResponse.json({ error: "Video is too large." }, { status: 413 });
  }
  if (!request.body) {
    return NextResponse.json({ error: "Empty upload." }, { status: 400 });
  }

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true, videoKey: true } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

  let saved;
  try {
    saved = await saveVideo(request.body, contentType, lesson.courseId);
  } catch (err) {
    const tooLarge = err instanceof UploadTooLargeError;
    return NextResponse.json({ error: tooLarge ? err.message : "Upload failed." }, { status: tooLarge ? 413 : 500 });
  }

  await db.lesson.update({
    where: { id: lesson.id },
    data: { videoKey: saved.key, videoType: contentType, videoSize: saved.size },
  });
  await deleteVideo(lesson.videoKey);
  await audit(user.id, "lesson.video.upload", lesson.id, `${saved.size} bytes`);

  revalidatePath("/admin/courses", "layout");
  return NextResponse.json({ ok: true });
}
