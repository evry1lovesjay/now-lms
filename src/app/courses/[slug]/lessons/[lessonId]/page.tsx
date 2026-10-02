import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { createVideoToken } from "@/lib/video-token";
import { toggleLessonComplete } from "@/actions/learning";
import { SubmitButton } from "@/components/submit-button";
import { VideoPlayer } from "@/components/video-player";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true } } } },
    },
  });
  if (!lesson || lesson.course.slug !== slug) notFound();
  if (!(await canAccessCourse(user, lesson.courseId))) redirect(`/courses/${slug}`);

  const done =
    user.role === "STUDENT"
      ? new Set(
          (
            await db.lessonProgress.findMany({
              where: { userId: user.id, lesson: { courseId: lesson.courseId } },
              select: { lessonId: true },
            })
          ).map((p) => p.lessonId),
        )
      : new Set<string>();

  const lessons = lesson.course.lessons;
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const src = lesson.videoKey ? `/api/videos/${lesson.id}?t=${await createVideoToken(user.id, lesson.id)}` : null;

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <div className="space-y-4 lg:col-span-3">
        <Link href={`/courses/${slug}`} className="text-sm text-brand-700 hover:underline">
          ← {lesson.course.title}
        </Link>
        {src ? (
          <VideoPlayer src={src} watermark={user.email} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-200 text-slate-500">
            No video has been uploaded for this lesson yet.
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            {lesson.description && <p className="mt-2 whitespace-pre-line text-slate-700">{lesson.description}</p>}
          </div>
          {user.role === "STUDENT" && (
            <form action={toggleLessonComplete}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <SubmitButton className={done.has(lesson.id) ? "btn-secondary" : "btn-primary"}>
                {done.has(lesson.id) ? "✓ Completed" : "Mark as complete"}
              </SubmitButton>
            </form>
          )}
        </div>
        <div className="flex justify-between">
          {prev ? (
            <Link href={`/courses/${slug}/lessons/${prev.id}`} className="btn-secondary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/courses/${slug}/lessons/${next.id}`} className="btn-secondary">
              Next →
            </Link>
          )}
        </div>
      </div>

      <aside className="card h-fit">
        <h2 className="mb-3 font-semibold">Course content</h2>
        <ol className="space-y-1 text-sm">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <Link
                href={`/courses/${slug}/lessons/${l.id}`}
                className={`flex gap-2 rounded px-2 py-1 ${l.id === lesson.id ? "bg-brand-50 font-medium text-brand-700" : "hover:bg-slate-100"}`}
              >
                <span className="w-4 text-slate-400">{done.has(l.id) ? "✓" : i + 1}</span>
                {l.title}
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
