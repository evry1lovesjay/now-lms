import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export default async function AdminOverview() {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);

  const [byRole, blocked, courses] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.count({ where: { status: "BLOCKED" } }),
    db.course.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { lessons: true, enrollments: true, tutors: true } } },
    }),
  ]);
  const counts = Object.fromEntries(byRole.map((r) => [r.role, r._count._all]));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((role) => (
          <div key={role} className="card">
            <p className="text-sm text-slate-500">{ROLE_LABELS[role]}s</p>
            <p className="text-3xl font-semibold">{counts[role] ?? 0}</p>
          </div>
        ))}
        <Link href="/admin/users?status=BLOCKED" className="card hover:border-red-300">
          <p className="text-sm text-slate-500">Blocked accounts</p>
          <p className="text-3xl font-semibold text-red-600 dark:text-red-400">{blocked}</p>
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Courses</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Course</th>
              <th className="py-2">Lessons</th>
              <th className="py-2">Students</th>
              <th className="py-2">Tutors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className="py-2">
                  <Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-brand-700">
                    {c.title}
                  </Link>
                </td>
                <td className="py-2">{c._count.lessons}</td>
                <td className="py-2">{c._count.enrollments}</td>
                <td className="py-2">{c._count.tutors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
