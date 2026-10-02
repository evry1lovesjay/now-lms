import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { coverUrl } from "@/lib/course-cover";

export default async function AdminCoursesPage() {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const courses = await db.course.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lessons: true, enrollments: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/courses/new" className="btn-primary">
          + New course
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
      {courses.map((c) => (
        <Link key={c.id} href={`/admin/courses/${c.id}`} className="card flex gap-4 hover:border-brand-500">
          {/* eslint-disable-next-line @next/next/no-img-element -- covers are pre-sized WebP/SVG */}
          <img src={coverUrl(c)} alt="" width={160} height={90} loading="lazy" className="h-[72px] w-32 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">{c.title}</h2>
            {!c.published && <span className="badge bg-slate-200 text-slate-700">Draft</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">{c.summary}</p>
          <p className="mt-3 text-xs text-slate-500">
            {c._count.lessons} lessons · {c._count.enrollments} students
          </p>
          </div>
        </Link>
      ))}
      </div>
    </div>
  );
}
