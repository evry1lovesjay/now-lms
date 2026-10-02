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
        <Link href="/" className="text-lg font-bold text-brand-700">
          Now<span className="text-slate-900">LMS</span>
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
