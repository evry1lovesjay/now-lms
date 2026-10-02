import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProgressBar, StatusBadge } from "@/components/badges";

export default async function TutorDashboard() {
  const user = await requireUser(["TUTOR"]);

  const assignments = await db.courseTutor.findMany({
    where: { tutorId: user.id },
    include: {
      course: {
        include: {
          _count: { select: { lessons: true } },
          enrollments: {
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true,
                  progress: { select: { lesson: { select: { courseId: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tutor dashboard</h1>
        <p className="text-slate-600">Your courses and how your students are progressing.</p>
      </div>

      {assignments.length === 0 && (
        <div className="card text-slate-600">You have not been assigned to a course yet. A content admin will assign you.</div>
      )}

      {assignments.map(({ course }) => (
        <section key={course.id} className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <p className="text-sm text-slate-500">
                {course._count.lessons} lessons · {course.enrollments.length} students
              </p>
            </div>
            <Link href={`/courses/${course.slug}`} className="btn-secondary">
              View lessons
            </Link>
          </div>
          {course.enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">No students enrolled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2">Student</th>
                    <th className="py-2">Status</th>
                    <th className="w-48 py-2">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {course.enrollments.map(({ user: s }) => {
                    const done = s.progress.filter((p) => p.lesson.courseId === course.id).length;
                    return (
                      <tr key={s.id}>
                        <td className="py-2">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.email}</div>
                        </td>
                        <td className="py-2">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="py-2">
                          <ProgressBar value={course._count.lessons ? done / course._count.lessons : 0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
