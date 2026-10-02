// Course cover images. Pure helpers — safe in server and client components.

/** Courses that ship with a built-in illustration in /public/course-covers. */
const BUILT_IN = new Set(["software-quality-assurance", "data-analytics", "product-management", "product-design"]);

/** Uploaded covers are resized to this size (16:9) and stored as WebP. */
export const COVER_WIDTH = 960;
export const COVER_HEIGHT = 540;
export const MAX_COVER_UPLOAD_MB = 5;

/** The image to show for a course: its uploaded cover, its built-in illustration, or the generic default. */
export function coverUrl(course: { slug: string; coverImage: string | null }) {
  if (course.coverImage) return course.coverImage;
  return BUILT_IN.has(course.slug) ? `/course-covers/${course.slug}.svg` : "/course-covers/default.svg";
}
