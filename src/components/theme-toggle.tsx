"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABELS: Record<Theme, string> = { system: "🖥️ System", light: "☀️ Light", dark: "🌙 Dark" };

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Keep in sync with applyTheme() below.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  // Starts as "system" on the server and first client render, then syncs.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => readTheme() === "system" && applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    applyTheme(next);
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
