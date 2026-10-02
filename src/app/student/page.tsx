import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CourseCard } from "@/components/course-card";
import { ProgressBar } from "@/components/badges";

export default async function StudentDashboard() {
  const user = await requireUser(["STUDENT"]);

  const [enrollments, completedByCourse] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { course: { include: { _count: { select: { lessons: true } } } } },
    }),
    db.lessonProgress.findMany({ where: { userId: user.id }, select: { lesson: { select: { courseId: true } } } }),
  ]);

  const done = new Map<string, number>();
  for (const p of completedByCourse) done.set(p.lesson.courseId, (done.get(p.lesson.courseId) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi {user.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-600">Pick up where you left off.</p>
      </div>
      <Link href="/student/assignments" className="btn-secondary">
        📝 My assignments & grades
      </Link>

      {enrollments.length === 0 ? (
        <div className="card text-center">
          <p className="text-slate-600">You are not enrolled in any course yet.</p>
          <Link href="/courses" className="btn-primary mt-4">
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {enrollments.map(({ course }) => (
            <CourseCard
              key={course.id}
              course={course}
              footer={
                <ProgressBar value={course._count.lessons ? (done.get(course.id) ?? 0) / course._count.lessons : 0} />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
