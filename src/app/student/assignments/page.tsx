import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AssignmentStatus } from "@/components/assignment-status";
import { LocalDate } from "@/components/local-date";

/** Every assignment across the student's enrolled courses, with status and grades. */
export default async function StudentAssignmentsPage() {
  const user = await requireUser(["STUDENT"]);

  const assignments = await db.assignment.findMany({
    where: { course: { enrollments: { some: { userId: user.id } } } },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      course: { select: { slug: true, title: true } },
      submissions: { where: { studentId: user.id } },
    },
  });

  const graded = assignments.filter((a) => a.submissions[0]?.gradedAt && a.submissions[0].score !== null);
  const earned = graded.reduce((sum, a) => sum + (a.submissions[0].score ?? 0), 0);
  const possible = graded.reduce((sum, a) => sum + a.maxScore, 0);
  const todo = assignments.filter((a) => !a.submissions[0]).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My assignments & grades</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">To do</p>
          <p className="text-3xl font-semibold">{todo}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Graded</p>
          <p className="text-3xl font-semibold">{graded.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Overall score</p>
          <p className="text-3xl font-semibold" data-testid="overall-score">
            {possible ? `${Math.round((earned / possible) * 100)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments yet. They will appear here when your tutors post them.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Assignment</th>
                <th className="py-2">Course</th>
                <th className="py-2">Due</th>
                <th className="py-2">Status</th>
                <th className="py-2">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => {
                const s = a.submissions[0];
                return (
                  <tr key={a.id}>
                    <td className="py-2">
                      <Link href={`/courses/${a.course.slug}/assignments/${a.id}`} className="font-medium hover:text-brand-700 hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-600">{a.course.title}</td>
                    <td className="py-2 whitespace-nowrap text-slate-600">{a.dueAt ? <LocalDate iso={a.dueAt.toISOString()} /> : "—"}</td>
                    <td className="py-2">
                      <AssignmentStatus dueAt={a.dueAt} maxScore={a.maxScore} submission={s} />
                    </td>
                    <td className="max-w-xs py-2 text-slate-600">{s?.feedback ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
