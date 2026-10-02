"use client";

import { useEffect, useState } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

/**
 * Shows a timestamp in the viewer's own locale and time zone. The server (and
 * the first client render) show UTC so hydration always matches; the local
 * time replaces it right after mount.
 */
export function LocalDate({ iso }: { iso: string }) {
  const [text, setText] = useState(() => new Date(iso).toLocaleString("en-GB", { ...OPTIONS, timeZone: "UTC" }) + " UTC");

  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, OPTIONS));
  }, [iso]);

  return <time dateTime={iso}>{text}</time>;
}
