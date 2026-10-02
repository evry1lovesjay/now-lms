"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLES, canManageRole, isRole } from "@/lib/roles";
import type { ActionState } from "./types";

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  role: z.enum(ROLES),
});

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, password, role } = parsed.data;
  if (!canManageRole(actor.role, role)) return { error: "You cannot create accounts with this role." };

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "An account with this email already exists." };

  const user = await db.user.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await audit(actor.id, "user.create", user.id, role);

  revalidatePath("/admin/users");
  return { success: `${name} was added.` };
}

/**
 * Block or unblock an account. Permission rules live in lib/roles.ts:
 * super admins manage content admins, tutors and students; content admins
 * manage tutors and students.
 */
export async function setUserStatus(formData: FormData) {
  const actor = await requireUser(["SUPERADMIN", "CONTENT_ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const block = formData.get("status") === "BLOCKED";

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target || !isRole(target.role)) throw new Error("User not found.");
  if (target.id === actor.id) throw new Error("You cannot change your own status.");
  if (!canManageRole(actor.role, target.role)) throw new Error("You are not allowed to manage this user.");

  await db.user.update({
    where: { id: target.id },
    data: block
      ? { status: "BLOCKED", blockedAt: new Date(), blockedById: actor.id }
      : { status: "ACTIVE", blockedAt: null, blockedById: null },
  });
  await audit(actor.id, block ? "user.block" : "user.unblock", target.id);

  revalidatePath("/admin/users");
}
