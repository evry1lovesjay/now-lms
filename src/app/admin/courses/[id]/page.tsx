import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assignTutor, deleteLesson, moveLesson, unassignTutor } from "@/actions/content";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/badges";
import { CourseForm } from "./course-form";
import { NewLessonForm } from "./new-lesson-form";
import { ReplaceVideoButton } from "./replace-video-button";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 * 1024 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { position: "asc" } },
      tutors: { include: { tutor: { select: { id: true, name: true, email: true, status: true } } } },
    },
  });
  if (!course) notFound();

  const assigned = new Set(course.tutors.map((t) => t.tutorId));
  const availableTutors = await db.user.findMany({
    where: { role: "TUTOR", status: "ACTIVE", id: { notIn: [...assigned] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{course.title}</h2>
        <Link href={`/courses/${course.slug}`} className="btn-secondary">
          View as learner
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2">
          <h3 className="font-semibold">Lessons</h3>
          {course.lessons.length === 0 && <p className="text-sm text-slate-500">No lessons yet. Add the first one below.</p>}
          <ol className="divide-y divide-slate-100">
            {course.lessons.map((lesson, i) => (
              <li key={lesson.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-6 text-sm text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/courses/${course.slug}/lessons/${lesson.id}`} className="font-medium hover:text-brand-700">
                    {lesson.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {lesson.videoKey ? `Video · ${formatSize(lesson.videoSize)}` : "No video uploaded"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <form action={moveLesson}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button className="btn-secondary px-2 py-1" disabled={i === 0} aria-label="Move up">↑</button>
                  </form>
                  <form action={moveLesson}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button className="btn-secondary px-2 py-1" disabled={i === course.lessons.length - 1} aria-label="Move down">↓</button>
                  </form>
                  <ReplaceVideoButton lessonId={lesson.id} hasVideo={!!lesson.videoKey} />
                  <form action={deleteLesson}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <SubmitButton className="btn-danger px-3 py-1" pendingText="…" confirm={`Delete "${lesson.title}" and its video?`}>
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 font-medium">Add a lesson</h4>
            <NewLessonForm courseId={course.id} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="card space-y-3">
            <h3 className="font-semibold">Tutors</h3>
            {course.tutors.length === 0 && <p className="text-sm text-slate-500">No tutors assigned.</p>}
            <ul className="space-y-2">
              {course.tutors.map(({ tutor }) => (
                <li key={tutor.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium">{tutor.name}</div>
                    <div className="text-xs text-slate-500">{tutor.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={tutor.status} />
                    <form action={unassignTutor}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="tutorId" value={tutor.id} />
                      <SubmitButton className="btn-secondary px-2 py-1" pendingText="…">Remove</SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            {availableTutors.length > 0 && (
              <form action={assignTutor} className="flex gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <select name="tutorId" className="input" required>
                  {availableTutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                <SubmitButton pendingText="…">Assign</SubmitButton>
              </form>
            )}
          </section>

          <section className="card space-y-3">
            <h3 className="font-semibold">Course details</h3>
            <CourseForm course={course} />
          </section>
        </div>
      </div>
    </div>
  );
}
