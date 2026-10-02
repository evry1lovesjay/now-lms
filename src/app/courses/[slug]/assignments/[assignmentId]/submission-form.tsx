"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_DOCUMENT_MB, SUBMISSION_EXTS, acceptAttr } from "@/lib/file-types";

type Existing = { text: string; linkUrl: string | null; fileName: string | null } | null;

export function SubmissionForm({ assignmentId, existing }: { assignmentId: string; existing: Existing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submission`, {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not submit.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="submission-text">Your answer</label>
        <textarea className="input" id="submission-text" name="text" rows={6} defaultValue={existing?.text ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="submission-link">Link (optional)</label>
        <input
          className="input"
          id="submission-link"
          name="linkUrl"
          type="url"
          placeholder="https://github.com/… or a Google Drive link"
          defaultValue={existing?.linkUrl ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="submission-file">
          File (optional — {SUBMISSION_EXTS.map((e) => `.${e}`).join(", ")}; max {MAX_DOCUMENT_MB} MB)
        </label>
        <input className="input" id="submission-file" name="file" type="file" accept={acceptAttr(SUBMISSION_EXTS)} />
        {existing?.fileName && (
          <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="removeFile" /> Remove the current file ({existing.fileName})
          </label>
        )}
      </div>
      {error && <p className="alert-error">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Submitting…" : existing ? "Update submission" : "Submit assignment"}
      </button>
    </form>
  );
}
