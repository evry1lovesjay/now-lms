"use client";

import { THEMES, THEME_COOKIE, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };
const NAMES: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

/**
 * Saves the theme choice in a cookie (the server reads it on the next request,
 * so reloads render in the right theme) and applies it to the page right away.
 */
export function applyThemeChoice(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  const root = document.documentElement.classList;
  root.remove("light", "dark");
  if (theme !== "system") root.add(theme);
}

/** Compact button that cycles System → Light → Dark (used when signed out). */
export function ThemeToggle({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(THEMES[(THEMES.indexOf(value) + 1) % THEMES.length])}
      className="btn-secondary px-3 py-1.5"
      aria-label={`Theme: ${value}. Click to change.`}
      title="Change theme"
      data-theme-choice={value}
    >
      {ICONS[value]} {NAMES[value]}
    </button>
  );
}

/** System / Light / Dark as a segmented radio group (used in the user menu and the mobile menu). */
export function ThemeOptions({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-slate-500">Theme</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Theme">
        {THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={value === theme}
            onClick={() => onChange(theme)}
            className={`whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition ${
              value === theme ? "bg-surface text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span aria-hidden>{ICONS[theme]}</span> {NAMES[theme]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
