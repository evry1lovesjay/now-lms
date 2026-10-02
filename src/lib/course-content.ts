import type { DocExt } from "@/lib/file-types";

/**
 * The three fixed sections every course has, shown to learners above the
 * lessons. They are defined here in code, not per course, so every course —
 * existing or new — always shows the same sections in the same order. Each
 * one is optional: an empty section shows a short placeholder.
 */
export const SECTIONS = [
  {
    key: "OUTLINE",
    label: "Course outline",
    icon: "📋",
    hint: "Syllabus or course plan — PDF, Word, slides or a link.",
    fileTypes: ["pdf", "doc", "docx", "ppt", "pptx"] as DocExt[],
    // Shown on the course page even before enrolling, so learners never miss it.
    public: true,
    styles: {
      card: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
      title: "text-amber-900 dark:text-amber-200",
      chip: "bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100",
    },
  },
  {
    key: "MATERIALS",
    label: "Course materials",
    icon: "📚",
    hint: "Reading material — PDFs or links.",
    fileTypes: ["pdf"] as DocExt[],
    public: false,
    styles: {
      card: "border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10",
      title: "text-sky-900 dark:text-sky-200",
      chip: "bg-sky-200 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100",
    },
  },
  {
    key: "RESOURCES",
    label: "Resources",
    icon: "🔗",
    hint: "Links — live classes (Google Meet, Zoom), recorded videos (YouTube), tools and more.",
    fileTypes: [] as DocExt[],
    public: false,
    styles: {
      card: "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
      title: "text-emerald-900 dark:text-emerald-200",
      chip: "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100",
    },
  },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export function sectionByKey(key: string) {
  return SECTIONS.find((s) => s.key === key);
}

/** A short label describing where a link goes, e.g. "Live class" for Google Meet. */
export function linkKind(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
  if (/(^|\.)(meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com)$/.test(host)) return "Live class";
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/.test(host)) return "Video";
  if (/(^|\.)(drive\.google\.com|docs\.google\.com)$/.test(host)) return "Google Drive";
  return host;
}
