import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { signToken, verifyToken } from "@/lib/tokens";
import { homePathFor, isRole, type Role } from "@/lib/roles";

export const SESSION_COOKIE = "lms_session";
const SESSION_AUDIENCE = "session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function createSession(userId: string, sessionVersion: number) {
  const token = await signToken({ sub: userId, v: sessionVersion }, `${SESSION_DAYS}d`, SESSION_AUDIENCE);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user, re-reading them from the database on every
 * request so that blocking an account takes effect immediately.
 * Returns null for missing/invalid sessions, blocked accounts, and sessions
 * issued before the account was last blocked.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifyToken<{ sub?: string; v?: number }>(token, SESSION_AUDIENCE);
  if (!payload?.sub) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, status: true, sessionVersion: true },
  });
  if (!user || user.status !== "ACTIVE" || !isRole(user.role)) return null;
  if ((payload.v ?? 0) !== user.sessionVersion) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Use in pages/actions: redirects to /login if not signed in, or home if the role is not allowed. */
export async function requireUser(allowed?: readonly Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}
