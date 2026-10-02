"use client";

import { useActionState } from "react";
import { updateCourse } from "@/actions/content";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { CoverInput } from "@/components/cover-input";
import { coverUrl } from "@/lib/course-cover";

type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  published: boolean;
  coverImage: string | null;
};

export function CourseForm({ course }: { course: Course }) {
  const [state, action] = useActionState(updateCourse, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={course.id} />
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input className="input" id="title" name="title" defaultValue={course.title} required />
      </div>
      <div>
        <label className="label" htmlFor="summary">Summary</label>
        <input className="input" id="summary" name="summary" defaultValue={course.summary} required />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea className="input" id="description" name="description" rows={5} defaultValue={course.description} required />
      </div>
      <CoverInput current={coverUrl(course)} allowRemove={!!course.coverImage} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={course.published} /> Published (visible to students)
      </label>
      <FormMessage state={state} />
      <SubmitButton>Save course</SubmitButton>
    </form>
  );
}
