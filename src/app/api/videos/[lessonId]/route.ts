import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { openVideo, videoSize } from "@/lib/storage";
import { readVideoToken } from "@/lib/video-token";

export const runtime = "nodejs";

const PROTECT_HEADERS = {
  "Content-Disposition": "inline",
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function deny(status: number, message: string) {
  return new Response(message, { status, headers: PROTECT_HEADERS });
}

/**
 * Authenticated, range-enabled video streaming. Videos are never exposed as
 * static files; every byte goes through this permission check.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  // Only allow the browser's media element to load the stream. Opening the URL
  // directly in a tab (to "Save as…") is rejected.
  if (request.headers.get("sec-fetch-dest") === "document") {
    return deny(403, "Direct access to videos is not allowed.");
  }

  const user = await getCurrentUser();
  if (!user) return deny(401, "Not signed in.");

  const token = await readVideoToken(request.nextUrl.searchParams.get("t"));
  if (!token || token.sub !== user.id || token.lid !== lessonId) return deny(403, "Invalid video token.");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true, videoKey: true, videoType: true },
  });
  if (!lesson?.videoKey) return deny(404, "Video not found.");
  if (!(await canAccessCourse(user, lesson.courseId))) return deny(403, "You do not have access to this course.");

  let size: number;
  try {
    size = await videoSize(lesson.videoKey);
  } catch {
    return deny(404, "Video not found.");
  }

  const type = lesson.videoType ?? "video/mp4";
  const range = request.headers.get("range");
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);

  if (!match) {
    return new Response(openVideo(lesson.videoKey), {
      status: 200,
      headers: { ...PROTECT_HEADERS, "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" },
    });
  }

  // Serve in bounded chunks so seeking is cheap and no client can pull the
  // whole file in one response.
  const CHUNK = 2 * 1024 * 1024;
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: last N bytes.
    const suffix = Number(match[2]);
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? start + CHUNK - 1 : Number(match[2]);
  }
  end = Math.min(end, start + CHUNK - 1, size - 1);

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { ...PROTECT_HEADERS, "Content-Range": `bytes */${size}` } });
  }

  return new Response(openVideo(lesson.videoKey, { start, end }), {
    status: 206,
    headers: {
      ...PROTECT_HEADERS,
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
