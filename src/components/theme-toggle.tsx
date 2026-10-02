"use client";

import { useState } from "react";
import { THEMES, THEME_COOKIE, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = { system: "🖥️ System", light: "☀️ Light", dark: "🌙 Dark" };

/** Cycles System → Light → Dark. The server reads the cookie on the next request, so reloads render correctly. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const root = document.documentElement.classList;
    root.remove("light", "dark");
    if (next !== "system") root.add(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="btn-secondary px-3 py-1.5"
      aria-label={`Theme: ${theme}. Click to change.`}
      title="Change theme"
      data-theme-choice={theme}
    >
      {LABELS[theme]}
    </button>
  );
}
