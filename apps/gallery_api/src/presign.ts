import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Context } from "hono";
import { s3, bucket, cdnUrl } from "./s3.js";

export async function presignRoute(c: Context) {
  const body = await c.req.json<{ contentType: string; extension: string }>();
  const { contentType, extension } = body;

  if (!contentType || !extension) {
    return c.json({ error: "contentType and extension are required" }, 400);
  }

  const key = `gallery/${crypto.randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return c.json({ uploadUrl, cdnUrl: `${cdnUrl}/${key}` });
}
