import "server-only";
import { db } from "@/lib/db";

export async function audit(actorId: string, action: string, targetId?: string, detail?: string) {
  await db.auditLog.create({ data: { actorId, action, targetId, detail } });
}
