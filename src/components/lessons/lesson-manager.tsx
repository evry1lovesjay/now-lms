import { deleteLesson, moveLesson } from "@/actions/content";
import { formatBytes } from "@/lib/file-types";
import { SubmitButton } from "@/components/submit-button";
import { LessonItem } from "./lesson-item";
import { NewLessonForm } from "./new-lesson-form";
import { ReplaceVideoButton } from "./replace-video-button";

type Lesson = { id: string; title: string; description: string; videoKey: string | null; videoSize: number | null };

/**
 * Add, edit, reorder and delete lessons, and upload or replace their videos.
 * Used by admins (admin course page) and by the course's tutors (/courses/[slug]/manage).
 */
export function LessonManager({ course, lessons }: { course: { id: string; slug: string }; lessons: Lesson[] }) {
  return (
    <section className="card space-y-4" aria-labelledby="lesson-manager-heading">
      <h2 id="lesson-manager-heading" className="font-semibold">
        Lessons
      </h2>
      {lessons.length === 0 && <p className="text-sm text-slate-500">No lessons yet. Add the first one below.</p>}
      <ol className="divide-y divide-slate-100">
        {lessons.map((lesson, i) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            index={i + 1}
            href={`/courses/${course.slug}/lessons/${lesson.id}`}
            meta={lesson.videoKey ? `Video · ${formatBytes(lesson.videoSize)}` : "No video uploaded"}
            actions={
              <>
                <form action={moveLesson}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button className="btn-secondary px-2 py-1" disabled={i === 0} aria-label="Move up">
                    ↑
                  </button>
                </form>
                <form action={moveLesson}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button className="btn-secondary px-2 py-1" disabled={i === lessons.length - 1} aria-label="Move down">
                    ↓
                  </button>
                </form>
                <ReplaceVideoButton lessonId={lesson.id} hasVideo={!!lesson.videoKey} />
                <form action={deleteLesson}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <SubmitButton className="btn-danger px-3 py-1" pendingText="…" confirm={`Delete "${lesson.title}" and its video?`}>
                    Delete
                  </SubmitButton>
                </form>
              </>
            }
          />
        ))}
      </ol>
      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 font-medium">Add a lesson</h3>
        <NewLessonForm courseId={course.id} />
      </div>
    </section>
  );
}
