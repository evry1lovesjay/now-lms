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
          _count: { select: { lessons: true, assignments: true } },
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

  const ungraded = await db.submission.findMany({
    where: { gradedAt: null, assignment: { courseId: { in: assignments.map((a) => a.course.id) } } },
    select: { assignment: { select: { courseId: true } } },
  });
  const toGrade = new Map<string, number>();
  for (const { assignment } of ungraded) toGrade.set(assignment.courseId, (toGrade.get(assignment.courseId) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tutor dashboard</h1>
        <p className="text-slate-600">Your courses, assignments to grade, and how your students are progressing.</p>
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
            <div className="flex flex-wrap gap-2">
              <Link href={`/courses/${course.slug}`} className="btn-secondary">
                Course page
              </Link>
              <Link href={`/courses/${course.slug}/manage`} className="btn-secondary">
                Manage lessons
              </Link>
              <Link href={`/courses/${course.slug}/assignments`} className="btn-secondary">
                Assignments ({course._count.assignments})
                {(toGrade.get(course.id) ?? 0) > 0 && (
                  <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                    {toGrade.get(course.id)} to grade
                  </span>
                )}
              </Link>
            </div>
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
