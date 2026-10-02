"use client";

import { useActionState } from "react";
import { gradeSubmission } from "@/actions/assignments";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function GradeForm({
  submissionId,
  maxScore,
  score,
  feedback,
}: {
  submissionId: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
}) {
  const [state, action] = useActionState(gradeSubmission, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <div className="flex items-end gap-2">
        <div>
          <label className="label" htmlFor={`score-${submissionId}`}>Score</label>
          <input
            className="input w-24"
            id={`score-${submissionId}`}
            name="score"
            type="number"
            min={0}
            max={maxScore}
            defaultValue={score ?? ""}
            required
          />
        </div>
        <span className="pb-2 text-sm text-slate-500">/ {maxScore}</span>
      </div>
      <div>
        <label className="label" htmlFor={`feedback-${submissionId}`}>Feedback</label>
        <textarea className="input" id={`feedback-${submissionId}`} name="feedback" rows={2} defaultValue={feedback ?? ""} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{score === null ? "Save grade" : "Update grade"}</SubmitButton>
    </form>
  );
}
