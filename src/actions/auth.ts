"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { homePathFor, isRole } from "@/lib/roles";
import type { ActionState } from "./types";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !valid || !isRole(user.role)) return { error: "Invalid email or password." };
  if (user.status !== "ACTIVE") return { error: "This account has been disabled. Contact an administrator." };

  await createSession(user.id, user.sessionVersion);
  redirect(homePathFor(user.role));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

/** Public sign-up always creates a STUDENT account. Staff accounts are created by admins. */
export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { error: "An account with this email already exists." };

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "STUDENT",
    },
  });

  await createSession(user.id, user.sessionVersion);
  redirect("/student");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
