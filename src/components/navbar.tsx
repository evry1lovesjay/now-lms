import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { ROLE_LABELS, canManageUsers, homePathFor } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks, type NavLink } from "@/components/nav-links";
import type { Theme } from "@/lib/theme";

export async function Navbar({ theme }: { theme: Theme }) {
  const user = await getCurrentUser();

  const links: NavLink[] = user
    ? [
        { href: homePathFor(user.role), label: "Dashboard" },
        { href: "/courses", label: "Courses" },
        ...(user.role === "STUDENT" ? [{ href: "/student/assignments", label: "Assignments" }] : []),
        ...(canManageUsers(user.role) ? [{ href: "/admin/users", label: "Users" }] : []),
      ]
    : [
        { href: "/courses", label: "Courses" },
        { href: "/login", label: "Log in" },
      ];

  return (
    <header className="border-b border-slate-200 bg-surface">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3" aria-label="Main">
        <Link href="/" className="text-lg font-bold text-brand-700">
          Now<span className="text-slate-900">LMS</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <NavLinks links={links} />
          <ThemeToggle initial={theme} />
          {user ? (
            <>
              <div className="flex flex-col leading-tight" data-testid="nav-user">
                <span className="text-sm font-semibold text-slate-900">{user.name.trim().split(/\s+/)[0]}</span>
                <span className="text-[11px] uppercase tracking-wide text-slate-500">{ROLE_LABELS[user.role]}</span>
              </div>
              <form action={logout}>
                <button className="btn-secondary px-3 py-1.5">Log out</button>
              </form>
            </>
          ) : (
            <Link href="/register" className="btn-primary px-3 py-1.5">
              Sign up
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
