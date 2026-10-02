import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES, ROLE_LABELS, canManageRole, isRole, manageableRoles } from "@/lib/roles";
import { setUserStatus } from "@/actions/users";
import { RoleBadge, StatusBadge } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { CreateUserForm } from "./create-user-form";

const PAGE_SIZE = 25;

type Search = { q?: string; role?: string; status?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();

  const where = {
    ...(isRole(sp.role) ? { role: sp.role } : {}),
    ...(sp.status === "ACTIVE" || sp.status === "BLOCKED" ? { status: sp.status } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }] } : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, blockedAt: true },
    }),
    db.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams({ ...(sp as Record<string, string>), page: String(p) });
    return `/admin/users?${params}`;
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-1 font-semibold">Add a user</h2>
        <p className="mb-4 text-sm text-slate-500">
          You can create: {manageableRoles(actor.role).map((r) => ROLE_LABELS[r]).join(", ")}.
        </p>
        <CreateUserForm roles={manageableRoles(actor.role)} />
      </section>

      <section className="card space-y-4">
        <form className="grid gap-3 sm:grid-cols-4" action="/admin/users">
          <input className="input" name="q" placeholder="Search name or email" defaultValue={q} />
          <select className="input" name="role" defaultValue={sp.role ?? ""}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select className="input" name="status" defaultValue={sp.status ?? ""}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2">Joined</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const role = isRole(u.role) ? u.role : "STUDENT";
                const manageable = u.id !== actor.id && canManageRole(actor.role, role);
                const blocked = u.status === "BLOCKED";
                return (
                  <tr key={u.id}>
                    <td className="py-2">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-2">
                      <RoleBadge role={role} />
                    </td>
                    <td className="py-2">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-2 text-slate-500">{u.createdAt.toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      {manageable ? (
                        <form action={setUserStatus} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="status" value={blocked ? "ACTIVE" : "BLOCKED"} />
                          <SubmitButton
                            className={blocked ? "btn-secondary px-3 py-1" : "btn-danger px-3 py-1"}
                            pendingText="…"
                            confirm={blocked ? undefined : `Block ${u.name}? They will be signed out immediately.`}
                          >
                            {blocked ? "Unblock" : "Block"}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No users match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {total} user{total === 1 ? "" : "s"} · page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn-secondary px-3 py-1" href={pageHref(page - 1)}>
                Previous
              </Link>
            )}
            {page < pages && (
              <Link className="btn-secondary px-3 py-1" href={pageHref(page + 1)}>
                Next
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
