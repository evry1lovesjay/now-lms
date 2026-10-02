"use client";

import { useActionState } from "react";
import { createCourse } from "@/actions/content";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function NewCourseForm() {
  const [state, action] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="course-title">Title</label>
        <input className="input" id="course-title" name="title" required placeholder="e.g. Cloud Engineering" />
      </div>
      <div>
        <label className="label" htmlFor="course-summary">Summary</label>
        <input className="input" id="course-summary" name="summary" required placeholder="One line shown on the course card" />
      </div>
      <div>
        <label className="label" htmlFor="course-description">Description</label>
        <textarea className="input" id="course-description" name="description" rows={6} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked /> Publish now (visible to students)
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…">Create course</SubmitButton>
    </form>
  );
}
