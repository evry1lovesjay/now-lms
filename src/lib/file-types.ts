// Document types accepted for uploads. Pure data — safe to import in client components
// (e.g. to build an <input accept="…">).

export const DOC_TYPES = {
  pdf: { mime: "application/pdf", label: "PDF" },
  doc: { mime: "application/msword", label: "Word" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word" },
  ppt: { mime: "application/vnd.ms-powerpoint", label: "Slides" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "Slides" },
  xls: { mime: "application/vnd.ms-excel", label: "Excel" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel" },
  zip: { mime: "application/zip", label: "ZIP" },
  png: { mime: "image/png", label: "Image" },
  jpg: { mime: "image/jpeg", label: "Image" },
  jpeg: { mime: "image/jpeg", label: "Image" },
} as const;

export type DocExt = keyof typeof DOC_TYPES;

/** Assignment submissions accept documents, spreadsheets, archives and images. */
export const SUBMISSION_EXTS: readonly DocExt[] = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "png", "jpg", "jpeg"];

export const MAX_DOCUMENT_MB = 25;

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function acceptAttr(exts: readonly DocExt[]) {
  return exts.map((e) => `.${e}`).join(",");
}

export function fileLabel(fileName: string | null | undefined) {
  const ext = extensionOf(fileName ?? "") as DocExt;
  return DOC_TYPES[ext]?.label ?? "File";
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Only http(s) links are allowed, so `javascript:` and similar can never be stored. */
export function normalizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
