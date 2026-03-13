import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context, Next } from "hono";

const subdomain = process.env.NHOST_SUBDOMAIN ?? "";
const region = process.env.NHOST_REGION ?? "";
const jwksUrl = `https://${subdomain}.auth.${region}.nhost.run/v1/jwks`;

console.log(`Auth JWKS URL: ${jwksUrl}`);

const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization" }, 401);
  }

  try {
    await jwtVerify(header.slice(7), JWKS);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
}
