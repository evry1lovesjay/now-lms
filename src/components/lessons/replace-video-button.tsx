"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadLessonVideo } from "@/components/upload";

export function ReplaceVideoButton({ lessonId, hasVideo }: { lessonId: string; hasVideo: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProgress(0);
    try {
      await uploadLessonVideo(lessonId, file, setProgress);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <input ref={input} type="file" hidden accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={onChange} />
      <button type="button" className="btn-secondary px-3 py-1" disabled={progress !== null} onClick={() => input.current?.click()}>
        {progress !== null ? `${progress}%` : hasVideo ? "Replace video" : "Upload video"}
      </button>
    </>
  );
}
