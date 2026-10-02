"use client";

import { useEffect, useState } from "react";

/**
 * The current year, never hard-coded. The server renders its own year so the
 * HTML is right without JavaScript; after mount the browser's clock takes over,
 * so a cached page or a server in another time zone still shows the visitor's
 * year once the new year starts.
 */
export function CurrentYear({ serverYear }: { serverYear: number }) {
  const [year, setYear] = useState(serverYear);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <span data-testid="current-year" suppressHydrationWarning>
      {year}
    </span>
  );
}
