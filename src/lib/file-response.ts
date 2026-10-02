import "server-only";
import { documentSize, openDocument } from "@/lib/storage";

/**
 * Streams a stored document. PDFs and images open in the browser; other
 * types download. Never cached by shared caches.
 */
export async function documentResponse(file: { key: string; name: string | null; type: string | null }) {
  let size: number;
  try {
    size = await documentSize(file.key);
  } catch {
    return new Response("File not found.", { status: 404 });
  }
  const type = file.type ?? "application/octet-stream";
  const inline = type === "application/pdf" || type.startsWith("image/");
  const name = (file.name ?? "download").replace(/[\r\n"]/g, "");
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");

  return new Response(openDocument(file.key), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
