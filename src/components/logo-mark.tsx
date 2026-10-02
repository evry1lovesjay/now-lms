/** The NowLMS mark (same artwork as src/app/icon.svg). Decorative: pair it with visible text. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0`} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2554e8" />
      <path d="M9 24V8h3.4l7.2 10.2V8H23v16h-3.4l-7.2-10.2V24z" fill="#fff" />
      <circle cx="25.5" cy="6.5" r="3" fill="#fbbf24" />
    </svg>
  );
}
