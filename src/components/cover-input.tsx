"use client";

import { useEffect, useState } from "react";
import { MAX_COVER_UPLOAD_MB } from "@/lib/course-cover";

/**
 * Cover image picker with a live preview. The server resizes and compresses
 * whatever is uploaded (960×540 WebP), so large photos are fine.
 */
export function CoverInput({ current, allowRemove = false }: { current: string; allowRemove?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="space-y-2">
      <label className="label" htmlFor="course-cover">
        Cover image (optional — JPEG, PNG, WebP or GIF, max {MAX_COVER_UPLOAD_MB} MB)
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
      <img
        src={preview ?? current}
        alt="Cover preview"
        className="aspect-video w-full max-w-sm rounded-lg border border-slate-200 object-cover"
        data-testid="cover-preview"
      />
      <input
        className="input"
        id="course-cover"
        name="cover"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setTooLarge(!!file && file.size > MAX_COVER_UPLOAD_MB * 1024 * 1024);
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      {tooLarge && <p className="alert-error">That image is larger than {MAX_COVER_UPLOAD_MB} MB.</p>}
      <p className="text-xs text-slate-500">It is resized and compressed automatically so pages stay fast.</p>
      {allowRemove && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeCover" /> Use the built-in illustration instead
        </label>
      )}
    </div>
  );
}
