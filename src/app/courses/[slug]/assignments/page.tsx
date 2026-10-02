import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessCourse, canTeachCourse } from "@/lib/access";
import { deleteAssignment } from "@/actions/assignments";
import { AssignmentStatus } from "@/components/assignment-status";
import { LocalDate } from "@/components/local-date";
import { SubmitButton } from "@/components/submit-button";
import { AssignmentForm } from "./assignment-form";

type MySubmission = { submittedAt: Date; score: number | null; gradedAt: Date | null } | undefined;

export default async function CourseAssignmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, _count: { select: { enrollments: true } } },
  });
  if (!course) notFound();
  if (!(await canAccessCourse(user, course.id))) redirect(`/courses/${slug}`);
  const canTeach = await canTeachCourse(user, course.id);

  const assignments = await db.assignment.findMany({
    where: { courseId: course.id },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      submissions: canTeach
        ? { select: { id: true, gradedAt: true } }
        : { where: { studentId: user.id }, select: { id: true, submittedAt: true, score: true, gradedAt: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/courses/${slug}`} className="text-sm text-brand-700 hover:underline">
          ← {course.title}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Assignments</h1>
      </div>

      <div className={canTeach ? "grid gap-6 lg:grid-cols-3" : ""}>
        <section className="card lg:col-span-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignments.map((a) => {
                const ungraded = a.submissions.filter((s) => !s.gradedAt).length;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/courses/${slug}/assignments/${a.id}`} className="font-medium hover:text-brand-700 hover:underline">
                        {a.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {a.dueAt ? (
                          <>
                            Due <LocalDate iso={a.dueAt.toISOString()} />
                          </>
                        ) : (
                          "No due date"
                        )}{" "}
                        · {a.maxScore} points
                      </p>
                    </div>
                    {canTeach ? (
                      <>
                        <span className="text-xs text-slate-600">
                          {a.submissions.length}/{course._count.enrollments} submitted
                        </span>
                        {ungraded > 0 && (
                          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                            {ungraded} to grade
                          </span>
                        )}
                        <form action={deleteAssignment}>
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <SubmitButton
                            className="btn-secondary px-2 py-1 text-xs"
                            pendingText="…"
                            confirm={`Delete "${a.title}" and all its submissions?`}
                          >
                            Delete
                          </SubmitButton>
                        </form>
                      </>
                    ) : (
                      <AssignmentStatus dueAt={a.dueAt} maxScore={a.maxScore} submission={a.submissions[0] as MySubmission} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {canTeach && (
          <section className="card">
            <h2 className="mb-3 font-semibold">Post an assignment</h2>
            <AssignmentForm courseId={course.id} />
          </section>
        )}
      </div>
    </div>
  );
}
