import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessCourse, canTeachCourse } from "@/lib/access";
import { formatBytes } from "@/lib/file-types";
import { AssignmentStatus } from "@/components/assignment-status";
import { LocalDate } from "@/components/local-date";
import { GradeForm } from "./grade-form";
import { SubmissionForm } from "./submission-form";

type SubmissionView = {
  id: string;
  text: string;
  linkUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileKey: string | null;
  submittedAt: Date;
};

function SubmissionContent({ s, dueAt }: { s: SubmissionView; dueAt: Date | null }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-500">
        Submitted <LocalDate iso={s.submittedAt.toISOString()} />
        {dueAt && s.submittedAt > dueAt && <span className="ml-1 font-medium text-red-600 dark:text-red-400">(late)</span>}
      </p>
      {s.text && <p className="whitespace-pre-line rounded-lg bg-slate-100 p-3">{s.text}</p>}
      {s.linkUrl && (
        <p>
          🔗{" "}
          <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-700 hover:underline">
            {s.linkUrl}
          </a>
        </p>
      )}
      {s.fileKey && (
        <p>
          📎{" "}
          <a href={`/api/files/submissions/${s.id}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
            {s.fileName}
          </a>{" "}
          <span className="text-xs text-slate-500">{formatBytes(s.fileSize)}</span>
        </p>
      )}
    </div>
  );
}

export default async function AssignmentPage({ params }: { params: Promise<{ slug: string; assignmentId: string }> }) {
  const { slug, assignmentId } = await params;
  const user = await requireUser();

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { id: true, slug: true, title: true } }, createdBy: { select: { name: true } } },
  });
  if (!assignment || assignment.course.slug !== slug) notFound();
  if (!(await canAccessCourse(user, assignment.courseId))) redirect(`/courses/${slug}`);
  const canTeach = await canTeachCourse(user, assignment.courseId);

  const header = (
    <div className="card space-y-3">
      <Link href={`/courses/${slug}/assignments`} className="text-sm text-brand-700 hover:underline">
        ← Assignments · {assignment.course.title}
      </Link>
      <h1 className="text-2xl font-semibold">{assignment.title}</h1>
      <p className="text-sm text-slate-500">
        {assignment.dueAt ? (
          <>
            Due <LocalDate iso={assignment.dueAt.toISOString()} />
          </>
        ) : (
          "No due date"
        )}{" "}
        · {assignment.maxScore} points · posted by {assignment.createdBy.name}
      </p>
      <p className="whitespace-pre-line">{assignment.instructions}</p>
    </div>
  );

  if (canTeach) {
    const enrollments = await db.enrollment.findMany({
      where: { courseId: assignment.courseId },
      orderBy: { user: { name: "asc" } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            submissions: { where: { assignmentId }, include: { gradedBy: { select: { name: true } } } },
          },
        },
      },
    });
    const submitted = enrollments.filter((e) => e.user.submissions.length > 0).length;

    return (
      <div className="space-y-6">
        {header}
        <section className="card space-y-4">
          <h2 className="font-semibold">
            Submissions ({submitted}/{enrollments.length})
          </h2>
          {enrollments.length === 0 && <p className="text-sm text-slate-500">No students are enrolled yet.</p>}
          <ul className="divide-y divide-slate-100">
            {enrollments.map(({ user: student }) => {
              const s = student.submissions[0];
              return (
                <li key={student.id} className="grid gap-4 py-4 md:grid-cols-3" data-student={student.email}>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-slate-500">{student.email}</span>
                      <AssignmentStatus dueAt={assignment.dueAt} maxScore={assignment.maxScore} submission={s} />
                    </div>
                    {s ? <SubmissionContent s={s} dueAt={assignment.dueAt} /> : <p className="text-sm text-slate-500">Not submitted yet.</p>}
                  </div>
                  {s && (
                    <div>
                      <GradeForm submissionId={s.id} maxScore={assignment.maxScore} score={s.score} feedback={s.feedback} />
                      {s.gradedBy && <p className="mt-1 text-xs text-slate-500">Graded by {s.gradedBy.name}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  // Student view.
  const mine = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
  });

  return (
    <div className="space-y-6">
      {header}
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Your submission</h2>
          <AssignmentStatus dueAt={assignment.dueAt} maxScore={assignment.maxScore} submission={mine} />
        </div>
        {mine?.gradedAt && mine.score !== null && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-500/40 dark:bg-green-500/10">
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">
              Grade: {mine.score}/{assignment.maxScore}
            </p>
            {mine.feedback && <p className="mt-1 whitespace-pre-line text-sm">{mine.feedback}</p>}
          </div>
        )}
        {mine && <SubmissionContent s={mine} dueAt={assignment.dueAt} />}
        {user.role === "STUDENT" && !mine?.gradedAt && (
          <SubmissionForm
            assignmentId={assignment.id}
            existing={mine ? { text: mine.text, linkUrl: mine.linkUrl, fileName: mine.fileName } : null}
          />
        )}
        {mine?.gradedAt && <p className="text-xs text-slate-500">This assignment has been graded and can no longer be changed.</p>}
      </section>
    </div>
  );
}
