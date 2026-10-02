import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { ROLE_LABELS, canManageContent, homePathFor } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-surface">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          Now<span className="text-slate-900">LMS</span>
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <ThemeToggle />
          <Link href="/courses" className="text-slate-600 hover:text-slate-900">
            Courses
          </Link>
          {user ? (
            <>
              <Link href={homePathFor(user.role)} className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              {user.role === "STUDENT" && (
                <Link href="/student/assignments" className="text-slate-600 hover:text-slate-900">
                  Assignments
                </Link>
              )}
              {canManageContent(user.role) && (
                <Link href="/admin/users" className="text-slate-600 hover:text-slate-900">
                  Users
                </Link>
              )}
              <span className="hidden text-slate-500 sm:inline">
                {user.name} · {ROLE_LABELS[user.role]}
              </span>
              <form action={logout}>
                <button className="btn-secondary px-3 py-1.5">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/register" className="btn-primary px-3 py-1.5">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
