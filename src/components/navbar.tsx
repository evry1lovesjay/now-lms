import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, canManageUsers, homePathFor } from "@/lib/roles";
import { SiteNav } from "@/components/site-nav";
import type { NavLink } from "@/components/nav-links";
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
    <header className="relative border-b border-slate-200 bg-surface">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#2554e8" />
            <path d="M9 24V8h3.4l7.2 10.2V8H23v16h-3.4l-7.2-10.2V24z" fill="#fff" />
            <circle cx="25.5" cy="6.5" r="3" fill="#fbbf24" />
          </svg>
          <span>
            Now<span className="text-slate-900">LMS</span>
          </span>
        </Link>
        <SiteNav
          links={links}
          theme={theme}
          user={user ? { firstName: user.name.trim().split(/\s+/)[0], role: ROLE_LABELS[user.role] } : null}
        />
      </nav>
    </header>
  );
}
