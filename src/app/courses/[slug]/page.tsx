import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCourse, canTeachCourse } from "@/lib/access";
import { canManageContent } from "@/lib/roles";
import { enroll } from "@/actions/learning";
import { SubmitButton } from "@/components/submit-button";
import { ProgressBar } from "@/components/badges";
import { CourseSections } from "@/components/course-sections";
import { ContentComposer } from "@/components/content-composer";
import { coverUrl } from "@/lib/course-cover";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { position: "asc" }, select: { id: true, title: true } },
      tutors: { include: { tutor: { select: { name: true } } } },
      content: {
        orderBy: { createdAt: "asc" },
        select: { id: true, section: true, kind: true, title: true, url: true, fileName: true, fileSize: true },
      },
      _count: { select: { assignments: true } },
    },
  });
  const isAdmin = !!user && canManageContent(user.role);
  if (!course || (!course.published && !isAdmin)) notFound();

  const [hasAccess, canTeach] = user
    ? await Promise.all([canAccessCourse(user, course.id), canTeachCourse(user, course.id)])
    : [false, false];
  const isStudent = user?.role === "STUDENT";

  const completed = new Set(
    isStudent && hasAccess
      ? (
          await db.lessonProgress.findMany({
            where: { userId: user.id, lesson: { courseId: course.id } },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId)
      : [],
  );
  const openAssignments =
    isStudent && hasAccess
      ? await db.assignment.count({ where: { courseId: course.id, submissions: { none: { studentId: user.id } } } })
      : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <header className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- covers are pre-sized WebP/SVG */}
          <img
            src={coverUrl(course)}
            alt=""
            width={960}
            height={540}
            decoding="async"
            className="mb-4 aspect-[16/6] w-full rounded-xl object-cover"
          />
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-lg text-slate-600">{course.summary}</p>
          {course.tutors.length > 0 && (
            <p className="text-sm text-slate-500">Tutors: {course.tutors.map((t) => t.tutor.name).join(", ")}</p>
          )}
        </header>

        <CourseSections items={course.content} canAccess={hasAccess} canEdit={isAdmin} />

        <section className="card" aria-labelledby="lessons-heading">
          <h2 id="lessons-heading" className="mb-3 font-semibold">
            Lessons ({course.lessons.length})
          </h2>
          {course.lessons.length === 0 && <p className="text-sm text-slate-500">Lessons are coming soon.</p>}
          <ol className="divide-y divide-slate-100">
            {course.lessons.map((lesson, i) => (
              <li key={lesson.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-6 text-slate-400">{completed.has(lesson.id) ? "✓" : i + 1}</span>
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
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">About this course</h2>
          <p className="whitespace-pre-line text-slate-700">{course.description}</p>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="card space-y-4">
          {!user && (
            <Link href="/register" className="btn-primary w-full">
              Sign up to enroll
            </Link>
          )}
          {isStudent && !hasAccess && (
            <form action={enroll}>
              <input type="hidden" name="courseId" value={course.id} />
              <SubmitButton className="btn-primary w-full" pendingText="Enrolling…">
                Enroll in this course
              </SubmitButton>
            </form>
          )}
          {isStudent && hasAccess && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Your progress</p>
              <ProgressBar value={course.lessons.length ? completed.size / course.lessons.length : 0} />
            </div>
          )}
          {hasAccess && (
            <Link href={`/courses/${course.slug}/assignments`} className="btn-secondary w-full">
              📝 Assignments ({course._count.assignments})
              {openAssignments > 0 && (
                <span className="badge bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">{openAssignments} to do</span>
              )}
            </Link>
          )}
          {canTeach && (
            <Link href={`/courses/${course.slug}/manage`} className="btn-secondary w-full">
              🎬 Manage lessons
            </Link>
          )}
          {isAdmin && (
            <Link href={`/admin/courses/${course.id}`} className="btn-secondary w-full">
              Course settings & tutors
            </Link>
          )}
        </div>

        {isAdmin && <ContentComposer courseId={course.id} />}
      </aside>
    </div>
  );
}
