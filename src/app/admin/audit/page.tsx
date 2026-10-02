import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function AuditPage() {
  await requireUser(["SUPERADMIN"]);
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });
  const targetIds = [...new Set(logs.map((l) => l.targetId).filter((id): id is string => !!id))];
  const targets = new Map(
    (await db.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]),
  );

  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-3 font-semibold">Recent activity</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2">When</th>
            <th className="py-2">Who</th>
            <th className="py-2">Action</th>
            <th className="py-2">Target</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="py-2 whitespace-nowrap text-slate-500">{log.createdAt.toLocaleString()}</td>
              <td className="py-2">{log.actor.email}</td>
              <td className="py-2 font-mono text-xs">{log.action}</td>
              <td className="py-2 text-slate-600">
                {(log.targetId && targets.get(log.targetId)) ?? log.detail ?? log.targetId}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-500">
                No activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
