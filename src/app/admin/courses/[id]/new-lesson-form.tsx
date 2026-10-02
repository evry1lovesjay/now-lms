"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLesson } from "@/actions/content";
import { uploadLessonVideo } from "@/components/upload";

export function NewLessonForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const file = data.get("video") as File | null;
    data.delete("video");

    try {
      const res = await createLesson(data);
      if (res.error || !res.lessonId) throw new Error(res.error ?? "Could not create lesson.");
      if (file && file.size > 0) {
        setProgress(0);
        await uploadLessonVideo(res.lessonId, file, setProgress);
      }
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      router.refresh();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <div>
        <label className="label" htmlFor="lesson-title">Lesson title</label>
        <input className="input" id="lesson-title" name="title" required />
      </div>
      <div>
        <label className="label" htmlFor="lesson-description">Description</label>
        <textarea className="input" id="lesson-description" name="description" rows={3} />
      </div>
      <div>
        <label className="label" htmlFor="lesson-video">Video (MP4, WebM, OGG or MOV)</label>
        <input className="input" id="lesson-video" name="video" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" />
      </div>
      {error && <p className="alert-error">{error}</p>}
      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button className="btn-primary" disabled={busy}>
        {busy ? (progress !== null ? `Uploading ${progress}%` : "Saving…") : "Add lesson"}
      </button>
    </form>
  );
}
