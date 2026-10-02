import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function AdminCoursesPage() {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const courses = await db.course.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { lessons: true, enrollments: true } } },
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {courses.map((c) => (
        <Link key={c.id} href={`/admin/courses/${c.id}`} className="card block hover:border-brand-500">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">{c.title}</h2>
            {!c.published && <span className="badge bg-slate-200 text-slate-700">Draft</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">{c.summary}</p>
          <p className="mt-3 text-xs text-slate-500">
            {c._count.lessons} lessons · {c._count.enrollments} students
          </p>
        </Link>
      ))}
    </div>
  );
}
