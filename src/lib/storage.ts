import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { DOC_TYPES, MAX_DOCUMENT_MB, extensionOf, type DocExt } from "@/lib/file-types";

/**
 * File storage. Files live outside /public, so the only way to reach them is
 * through authenticated routes (/api/videos/…, /api/files/…).
 *
 * Two buckets: lesson videos and documents (course outlines, materials and
 * assignment submissions). This is a local-disk implementation. To scale
 * horizontally, replace these functions with an object store (S3/R2/GCS)
 * using the same signatures — callers only deal with opaque storage keys.
 */

type Bucket = "videos" | "documents";

const BUCKET_DIRS: Record<Bucket, () => string> = {
  videos: () => process.env.VIDEO_STORAGE_DIR ?? "./storage/videos",
  documents: () => process.env.DOCUMENT_STORAGE_DIR ?? "./storage/documents",
};

function resolveKey(bucket: Bucket, key: string) {
  const root = path.resolve(/*turbopackIgnore: true*/ BUCKET_DIRS[bucket]());
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export class UploadTooLargeError extends Error {}
export class UnsupportedFileError extends Error {}

/** Streams a body to disk without buffering it in memory, enforcing a size limit. */
async function writeStream(bucket: Bucket, key: string, body: ReadableStream<Uint8Array>, limitBytes: number, limitLabel: string) {
  const target = resolveKey(bucket, key);
  await mkdir(path.dirname(target), { recursive: true });

  let size = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > limitBytes) cb(new UploadTooLargeError(`File exceeds ${limitLabel}`));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), guard, createWriteStream(target));
  } catch (err) {
    await rm(target, { force: true });
    throw err;
  }
  return size;
}

async function remove(bucket: Bucket, key: string | null | undefined) {
  if (!key) return;
  await rm(resolveKey(bucket, key), { force: true });
}

function open(bucket: Bucket, key: string, range?: { start: number; end: number }) {
  return Readable.toWeb(createReadStream(resolveKey(bucket, key), range)) as ReadableStream<Uint8Array>;
}

// ---------------------------------------------------------------- videos

export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

export function maxVideoBytes() {
  return Number(process.env.MAX_VIDEO_MB ?? 1024) * 1024 * 1024;
}

export async function saveVideo(body: ReadableStream<Uint8Array>, contentType: string, prefix: string) {
  const ext = ALLOWED_VIDEO_TYPES[contentType];
  if (!ext) throw new UnsupportedFileError("Unsupported video type");
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const size = await writeStream("videos", key, body, maxVideoBytes(), `${process.env.MAX_VIDEO_MB ?? 1024} MB`);
  return { key, size };
}

export const deleteVideo = (key: string | null | undefined) => remove("videos", key);

export async function videoSize(key: string) {
  return (await stat(resolveKey("videos", key))).size;
}

export const openVideo = (key: string, range?: { start: number; end: number }) => open("videos", key, range);

// ------------------------------------------------------------- documents

/**
 * Saves an uploaded document. The type is decided by the file extension and
 * checked against `allowed`; the stored MIME type comes from our own table,
 * never from the browser.
 */
export async function saveDocument(file: File, allowed: readonly DocExt[], prefix: string) {
  const ext = extensionOf(file.name) as DocExt;
  if (!allowed.includes(ext)) {
    throw new UnsupportedFileError(`Allowed file types: ${allowed.map((e) => `.${e}`).join(", ")}`);
  }
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const size = await writeStream("documents", key, file.stream(), MAX_DOCUMENT_MB * 1024 * 1024, `${MAX_DOCUMENT_MB} MB`);
  return { key, size, type: DOC_TYPES[ext].mime, name: file.name.slice(0, 200) };
}

export const deleteDocument = (key: string | null | undefined) => remove("documents", key);

export async function documentSize(key: string) {
  return (await stat(resolveKey("documents", key))).size;
}

export const openDocument = (key: string) => open("documents", key);
