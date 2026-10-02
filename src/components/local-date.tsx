"use client";

import { useId } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

/**
 * Shows a timestamp in the viewer's own locale and time zone.
 * On full page loads an inline script rewrites the server-rendered (UTC) text
 * before first paint; on client navigations the component formats it directly.
 */
export function LocalDate({ iso }: { iso: string }) {
  const id = useId();
  const isServer = typeof window === "undefined";
  const text = isServer
    ? new Date(iso).toLocaleString("en-GB", { ...OPTIONS, timeZone: "UTC" }) + " UTC"
    : new Date(iso).toLocaleString(undefined, OPTIONS);

  return (
    <>
      <time id={id} dateTime={iso} suppressHydrationWarning>
        {text}
      </time>
      <script
        type={isServer ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `document.getElementById(${JSON.stringify(id)}).textContent=new Date(${JSON.stringify(iso)}).toLocaleString(undefined,${JSON.stringify(OPTIONS)})`,
        }}
      />
    </>
  );
}
