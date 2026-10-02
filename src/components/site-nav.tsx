"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import type { Theme } from "@/lib/theme";
import { NavLinks, activeHref, type NavLink } from "@/components/nav-links";
import { ThemeOptions, ThemeToggle, applyThemeChoice } from "@/components/theme-toggle";

type NavUser = { firstName: string; role: string };

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
    </svg>
  );
}

function LogoutButton({ className }: { className: string }) {
  return (
    <form action={logout}>
      <button className={className}>Log out</button>
    </form>
  );
}

/**
 * Site navigation.
 * - Desktop (md and up): links, then the signed-in user's first name and role;
 *   clicking it opens a menu with the theme choice and Log out.
 * - Mobile: a hamburger button opens a panel with the links, theme and Log out.
 */
export function SiteNav({ links, user, theme: initialTheme }: { links: NavLink[]; user: NavUser | null; theme: Theme }) {
  const pathname = usePathname();
  const active = activeHref(links, pathname);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const userMenuId = useId();
  const mobileMenuId = useId();

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useDismiss(userMenuOpen, closeUserMenu, userMenuRef);
  useDismiss(mobileOpen, closeMobile, mobileRef);

  // Close menus after navigating.
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    applyThemeChoice(next);
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-3 md:flex">
        <NavLinks links={links} active={active} />
        {user ? (
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-controls={userMenuId}
              aria-label={`Account menu for ${user.firstName}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-slate-100"
            >
              <span className="flex flex-col leading-tight" data-testid="nav-user">
                <span className="text-sm font-semibold text-slate-900">{user.firstName}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{user.role}</span>
              </span>
              <Chevron open={userMenuOpen} />
            </button>
            {userMenuOpen && (
              <div
                id={userMenuId}
                data-testid="user-menu"
                className="absolute right-0 z-50 mt-2 w-72 space-y-3 rounded-xl border border-slate-200 bg-surface p-3 shadow-lg"
              >
                <ThemeOptions value={theme} onChange={chooseTheme} />
                <div className="border-t border-slate-200 pt-3">
                  <LogoutButton className="btn-secondary w-full" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <ThemeToggle value={theme} onChange={chooseTheme} />
            <Link href="/register" className="btn-primary px-3 py-1.5">
              Sign up
            </Link>
          </>
        )}
      </div>

      {/* Mobile */}
      <div ref={mobileRef} className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          data-testid="mobile-menu-button"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        {mobileOpen && (
          <div
            id={mobileMenuId}
            data-testid="mobile-menu"
            className="absolute inset-x-0 top-full z-50 space-y-4 border-b border-slate-200 bg-surface px-4 pb-5 pt-3 shadow-lg"
          >
            {user && (
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-900">{user.firstName}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{user.role}</span>
              </div>
            )}
            <NavLinks links={links} active={active} vertical onNavigate={closeMobile} />
            <ThemeOptions value={theme} onChange={chooseTheme} />
            {user ? (
              <LogoutButton className="btn-secondary w-full" />
            ) : (
              <Link href="/register" className="btn-primary w-full" onClick={closeMobile}>
                Sign up
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
