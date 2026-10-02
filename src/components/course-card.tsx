import Link from "next/link";

const ACCENTS: Record<string, string> = {
  "software-quality-assurance": "from-emerald-500 to-teal-600",
  "data-analytics": "from-sky-500 to-blue-600",
  "product-management": "from-orange-500 to-rose-500",
  "product-design": "from-fuchsia-500 to-purple-600",
};

export function CourseCard({
  course,
  footer,
}: {
  course: { slug: string; title: string; summary: string; _count?: { lessons: number } };
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-24 bg-gradient-to-br ${ACCENTS[course.slug] ?? "from-slate-500 to-slate-700"}`} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link href={`/courses/${course.slug}`} className="text-lg font-semibold hover:text-brand-700">
          {course.title}
        </Link>
        <p className="flex-1 text-sm text-slate-600">{course.summary}</p>
        {course._count && <p className="text-xs text-slate-500">{course._count.lessons} lesson{course._count.lessons === 1 ? "" : "s"}</p>}
        {footer}
      </div>
    </div>
  );
}
