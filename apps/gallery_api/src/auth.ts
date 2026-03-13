import { jwtVerify } from "jose";
import type { Context, Next } from "hono";

const jwtSecret = process.env.NHOST_JWT_SECRET;

if (!jwtSecret) {
  console.error("NHOST_JWT_SECRET is not set");
}

// Parse the JWT secret - Nhost stores it as JSON: {"type":"HS256","key":"..."}
function getSecretKey(): Uint8Array {
  if (!jwtSecret) throw new Error("NHOST_JWT_SECRET not configured");

  try {
    const parsed = JSON.parse(jwtSecret);
    return new TextEncoder().encode(parsed.key);
  } catch {
    // If it's not JSON, treat it as a raw key
    return new TextEncoder().encode(jwtSecret);
  }
}

const secretKey = jwtSecret ? getSecretKey() : null;

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization" }, 401);
  }

  if (!secretKey) {
    return c.json({ error: "Auth not configured" }, 500);
  }

  try {
    await jwtVerify(header.slice(7), secretKey);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
}
