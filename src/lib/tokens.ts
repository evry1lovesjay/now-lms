import "server-only";
import { SignJWT, jwtVerify } from "jose";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function signToken(payload: Record<string, unknown>, expiresIn: string, audience: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken<T>(token: string | undefined, audience: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience });
    return payload as T;
  } catch {
    return null;
  }
}
