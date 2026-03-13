import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Context, Next } from "hono";

const subdomain = process.env.NHOST_SUBDOMAIN!;
const region = process.env.NHOST_REGION!;
const jwksUrl = `https://${subdomain}.auth.${region}.nhost.run/v1/jwks`;
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export type AuthPayload = JWTPayload & {
  "https://hasura.io/jwt/claims"?: {
    "x-hasura-user-id"?: string;
  };
};

/**
 * Require a valid Nhost JWT. Sets `userId` on the context variable.
 */
export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization" }, 401);
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS);
    const claims = (payload as AuthPayload)["https://hasura.io/jwt/claims"];
    const userId = claims?.["x-hasura-user-id"] ?? payload.sub;
    if (!userId) {
      return c.json({ error: "No user ID in token" }, 401);
    }
    c.set("userId", userId);
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
}

/**
 * Optional auth — sets userId if a valid token is present, otherwise continues.
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const { payload } = await jwtVerify(header.slice(7), JWKS);
      const claims = (payload as AuthPayload)["https://hasura.io/jwt/claims"];
      const userId = claims?.["x-hasura-user-id"] ?? payload.sub;
      if (userId) c.set("userId", userId);
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }
  await next();
}
