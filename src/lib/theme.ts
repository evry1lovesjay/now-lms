// Theme preference, stored in a cookie so the server can render the right
// class on <html> — no inline script and no flash of the wrong theme.
// "system" sets no class and lets the prefers-color-scheme media query decide.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
