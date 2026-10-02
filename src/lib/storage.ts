import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

/**
 * Video storage. Files live outside /public, so the only way to reach them is
 * the authenticated streaming route (/api/videos/[lessonId]).
 *
 * This is a local-disk implementation. To scale horizontally, replace these
 * functions with an object-store implementation (S3/R2/GCS) using the same
 * signatures — callers only deal with opaque storage keys.
 */

export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

export function maxVideoBytes() {
  return Number(process.env.MAX_VIDEO_MB ?? 1024) * 1024 * 1024;
}

function rootDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.VIDEO_STORAGE_DIR ?? "./storage/videos");
}

function resolveKey(key: string) {
  const root = rootDir();
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export class UploadTooLargeError extends Error {}

/** Streams the body to disk without buffering it in memory. Returns the new key and size. */
export async function saveVideo(body: ReadableStream<Uint8Array>, contentType: string, prefix: string) {
  const ext = ALLOWED_VIDEO_TYPES[contentType];
  if (!ext) throw new Error("Unsupported video type");

  const key = `${prefix}/${randomUUID()}.${ext}`;
  const target = resolveKey(key);
  await mkdir(path.dirname(target), { recursive: true });

  const limit = maxVideoBytes();
  let size = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > limit) cb(new UploadTooLargeError(`Video exceeds ${process.env.MAX_VIDEO_MB ?? 1024} MB`));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), guard, createWriteStream(target));
  } catch (err) {
    await rm(target, { force: true });
    throw err;
  }
  return { key, size };
}

export async function deleteVideo(key: string | null | undefined) {
  if (!key) return;
  await rm(resolveKey(key), { force: true });
}

export async function videoSize(key: string) {
  return (await stat(resolveKey(key))).size;
}

export function openVideo(key: string, range?: { start: number; end: number }) {
  const stream = createReadStream(resolveKey(key), range);
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
