"use client";

import { useEffect, useState } from "react";

const POSITIONS = ["top-4 left-4", "top-4 right-4", "bottom-14 right-4", "bottom-14 left-4", "top-1/2 left-1/3"];

/**
 * Protected video player:
 * - the source is an authenticated, short-lived, user-bound stream URL;
 * - the browser's download / picture-in-picture / cast controls are hidden;
 * - right-click and drag are disabled;
 * - a moving watermark with the viewer's email discourages screen recording.
 *
 * Note: no web player can make capture impossible — these measures remove the
 * easy download paths and make leaks traceable to an account.
 */
export function VideoPlayer({ src, watermark }: { src: string; watermark: string }) {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPos((p) => (p + 1) % POSITIONS.length), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-black select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <video
        key={src}
        src={src}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        className="aspect-video w-full"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute ${POSITIONS[pos]} rounded bg-black/30 px-2 py-1 text-xs text-white/70 transition-all duration-1000`}
      >
        {watermark}
      </span>
    </div>
  );
}
