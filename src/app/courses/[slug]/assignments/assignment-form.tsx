"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAssignment } from "@/actions/assignments";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function AssignmentForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(createAssignment, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [dueIso, setDueIso] = useState("");

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setDueIso("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="dueAt" value={dueIso} />
      <div>
        <label className="label" htmlFor="assignment-title">Title</label>
        <input className="input" id="assignment-title" name="title" required />
      </div>
      <div>
        <label className="label" htmlFor="assignment-instructions">Instructions</label>
        <textarea className="input" id="assignment-instructions" name="instructions" rows={5} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="assignment-due">Due (optional)</label>
          <input
            className="input"
            id="assignment-due"
            type="datetime-local"
            onChange={(e) => setDueIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
          />
        </div>
        <div>
          <label className="label" htmlFor="assignment-max">Max score</label>
          <input className="input" id="assignment-max" name="maxScore" type="number" min={1} max={1000} defaultValue={100} required />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Posting…">Post assignment</SubmitButton>
    </form>
  );
}
