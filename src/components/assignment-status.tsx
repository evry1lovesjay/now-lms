type Sub = { submittedAt: Date; score: number | null; gradedAt: Date | null } | null | undefined;

/** A student's status on one assignment: to do, overdue, submitted (late?) or graded. */
export function AssignmentStatus({ dueAt, maxScore, submission }: { dueAt: Date | null; maxScore: number; submission: Sub }) {
  if (submission?.gradedAt && submission.score !== null) {
    return (
      <span className="badge bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200">
        Graded · {submission.score}/{maxScore}
      </span>
    );
  }
  if (submission) {
    const late = !!dueAt && submission.submittedAt > dueAt;
    return (
      <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
        Submitted{late ? " late" : ""} · awaiting grade
      </span>
    );
  }
  if (dueAt && dueAt < new Date()) {
    return <span className="badge bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">Overdue</span>;
  }
  return <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">To do</span>;
}
