import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { canManageContent } from "@/lib/roles";
import { enroll } from "@/actions/learning";
import { SubmitButton } from "@/components/submit-button";
import { ProgressBar } from "@/components/badges";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, videoKey: true } },
      tutors: { include: { tutor: { select: { name: true } } } },
    },
  });
  const isAdmin = !!user && canManageContent(user.role);
  if (!course || (!course.published && !isAdmin)) notFound();

  const hasAccess = !!user && (await canAccessCourse(user, course.id));
  const completed = new Set(
    user?.role === "STUDENT"
      ? (
          await db.lessonProgress.findMany({
            where: { userId: user.id, lesson: { courseId: course.id } },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId)
      : [],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-lg text-slate-600">{course.summary}</p>
        <p className="whitespace-pre-line text-slate-700">{course.description}</p>
        {course.tutors.length > 0 && (
          <p className="text-sm text-slate-500">Tutors: {course.tutors.map((t) => t.tutor.name).join(", ")}</p>
        )}
      </div>

      <aside className="card h-fit space-y-4">
        {!user && (
          <Link href="/register" className="btn-primary w-full">
            Sign up to enroll
          </Link>
        )}
        {user?.role === "STUDENT" && !hasAccess && (
          <form action={enroll}>
            <input type="hidden" name="courseId" value={course.id} />
            <SubmitButton className="btn-primary w-full" pendingText="Enrolling…">
              Enroll in this course
            </SubmitButton>
          </form>
        )}
        {user?.role === "STUDENT" && hasAccess && course.lessons.length > 0 && (
          <ProgressBar value={completed.size / course.lessons.length} />
        )}

        <div>
          <h2 className="mb-2 font-semibold">Lessons ({course.lessons.length})</h2>
          {course.lessons.length === 0 && <p className="text-sm text-slate-500">Lessons are coming soon.</p>}
          <ol className="space-y-1">
            {course.lessons.map((lesson, i) => (
              <li key={lesson.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-slate-400">{completed.has(lesson.id) ? "✓" : i + 1}</span>
                {hasAccess ? (
                  <Link href={`/courses/${course.slug}/lessons/${lesson.id}`} className="hover:text-brand-700 hover:underline">
                    {lesson.title}
                  </Link>
                ) : (
                  <span className="text-slate-600">{lesson.title}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
