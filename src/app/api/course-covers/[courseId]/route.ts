import { NextRequest } from "next/server";
import { coverSize, openCover } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serves an uploaded course cover. Covers are public (they appear on the
 * catalogue). The URL carries a version (?v=…) that changes on every upload,
 * so browsers can cache each version forever.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!/^[a-z0-9]+$/i.test(courseId)) return new Response("Not found.", { status: 404 });

  let size: number;
  try {
    size = await coverSize(courseId);
  } catch {
    return new Response("Not found.", { status: 404 });
  }
  return new Response(openCover(courseId), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
