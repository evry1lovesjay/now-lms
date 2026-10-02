import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/courses", label: "Courses" },
    ...(user.role === "SUPERADMIN" ? [{ href: "/admin/audit", label: "Audit log" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{ROLE_LABELS[user.role]}</p>
          <h1 className="text-2xl font-semibold">Administration</h1>
        </div>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
