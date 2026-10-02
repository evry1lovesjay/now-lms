import "server-only";
import { signToken, verifyToken } from "@/lib/tokens";

const AUDIENCE = "video";

/**
 * Short-lived token bound to one user and one lesson. The streaming route also
 * checks the session cookie, so a copied URL is useless to anyone else and
 * expires quickly.
 */
export function createVideoToken(userId: string, lessonId: string) {
  return signToken({ sub: userId, lid: lessonId }, "2h", AUDIENCE);
}

export async function readVideoToken(token: string | null) {
  return verifyToken<{ sub: string; lid: string }>(token ?? undefined, AUDIENCE);
}
