"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { updateLesson } from "@/actions/content";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

type Lesson = { id: string; title: string; description: string };

/** One row of the lesson manager, with an inline editor for the title and description. */
export function LessonItem({
  lesson,
  index,
  href,
  meta,
  actions,
}: {
  lesson: Lesson;
  index: number;
  href: string;
  meta: string;
  actions: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(updateLesson, undefined);

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  return (
    <li className="py-3" data-lesson={lesson.title}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-6 text-sm text-slate-400">{index}</span>
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-medium hover:text-brand-700">
            {lesson.title}
          </Link>
          <p className="text-xs text-slate-500">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
            {editing ? "Close" : "Edit"}
          </button>
          {actions}
        </div>
      </div>

      {editing && (
        <form action={action} className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <div>
            <label className="label" htmlFor={`edit-title-${lesson.id}`}>Title</label>
            <input className="input" id={`edit-title-${lesson.id}`} name="title" defaultValue={lesson.title} required />
          </div>
          <div>
            <label className="label" htmlFor={`edit-description-${lesson.id}`}>Description</label>
            <textarea
              className="input"
              id={`edit-description-${lesson.id}`}
              name="description"
              rows={3}
              defaultValue={lesson.description}
            />
          </div>
          <FormMessage state={state?.error ? state : undefined} />
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…">Save lesson</SubmitButton>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
