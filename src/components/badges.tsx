import { ROLE_LABELS, type Role } from "@/lib/roles";

const ROLE_STYLES: Record<Role, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200",
  CONTENT_ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  TUTOR: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  STUDENT: "bg-slate-100 text-slate-700",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${ROLE_STYLES[role]}`}>{ROLE_LABELS[role]}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return status === "ACTIVE" ? (
    <span className="badge bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200">Active</span>
  ) : (
    <span className="badge bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">Blocked</span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-slate-600">{pct}%</span>
    </div>
  );
}
