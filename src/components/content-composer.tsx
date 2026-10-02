"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SECTIONS, type SectionKey } from "@/lib/course-content";
import { MAX_DOCUMENT_MB, acceptAttr } from "@/lib/file-types";

/** Lets admins and the course's tutors post to the course outline, materials or resources. */
export function ContentComposer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sectionKey, setSectionKey] = useState<SectionKey | "">("");
  const [kind, setKind] = useState<"LINK" | "FILE">("LINK");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);

  const section = SECTIONS.find((s) => s.key === sectionKey);
  const allowsFiles = !!section && section.fileTypes.length > 0;
  const effectiveKind = allowsFiles ? kind : "LINK";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = new FormData(e.currentTarget);
    data.set("kind", effectiveKind);
    try {
      const res = await fetch(`/api/courses/${courseId}/content`, { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not post.");
      formRef.current?.reset();
      setSectionKey("");
      setKind("LINK");
      setMessage({ success: "Posted." });
      router.refresh();
    } catch (err) {
      setMessage({ error: err instanceof Error ? err.message : "Could not post." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3" data-testid="content-composer">
      <h2 className="font-semibold">Post to this course</h2>
      <div>
        <label className="label" htmlFor="content-section">
          What do you want to add?
        </label>
        <select
          id="content-section"
          name="section"
          className="input"
          required
          value={sectionKey}
          onChange={(e) => setSectionKey(e.target.value as SectionKey)}
        >
          <option value="" disabled>
            Choose…
          </option>
          {SECTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.icon} {s.label}
            </option>
          ))}
        </select>
        {section && <p className="mt-1 text-xs text-slate-500">{section.hint}</p>}
      </div>

      {section && (
        <>
          {allowsFiles && (
            <fieldset className="flex gap-4 text-sm">
              <legend className="label">Type</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="kindChoice" checked={kind === "LINK"} onChange={() => setKind("LINK")} /> Add a link
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="kindChoice" checked={kind === "FILE"} onChange={() => setKind("FILE")} /> Upload a file
              </label>
            </fieldset>
          )}
          <div>
            <label className="label" htmlFor="content-title">
              Title
            </label>
            <input
              id="content-title"
              name="title"
              className="input"
              required
              placeholder={section.key === "RESOURCES" ? "e.g. Live class — Mondays 6pm" : "e.g. Week 1–4 syllabus"}
            />
          </div>
          {effectiveKind === "LINK" ? (
            <div>
              <label className="label" htmlFor="content-url">
                Link
              </label>
              <input id="content-url" name="url" type="url" className="input" required placeholder="https://" />
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="content-file">
                File ({section.fileTypes.map((e) => `.${e}`).join(", ")}, max {MAX_DOCUMENT_MB} MB)
              </label>
              <input id="content-file" name="file" type="file" className="input" required accept={acceptAttr(section.fileTypes)} />
            </div>
          )}
          {message?.error && <p className="alert-error">{message.error}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? "Posting…" : `Add to ${section.label.toLowerCase()}`}
          </button>
        </>
      )}
      {!section && message?.success && <p className="alert-success">{message.success}</p>}
    </form>
  );
}
