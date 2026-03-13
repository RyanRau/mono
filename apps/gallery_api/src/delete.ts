import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Context } from "hono";
import { s3, bucket, cdnUrl } from "./s3.js";

export async function deleteRoute(c: Context) {
  const body = await c.req.json<{ cdnUrl: string }>();

  if (!body.cdnUrl?.startsWith(cdnUrl)) {
    return c.json({ error: "Invalid CDN URL" }, 400);
  }

  const key = body.cdnUrl.replace(`${cdnUrl}/`, "");

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  return c.json({ ok: true });
}
