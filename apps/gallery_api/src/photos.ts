import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Hono } from "hono";
import { authMiddleware, optionalAuthMiddleware } from "./auth.js";
import { s3, bucket, cdnUrl } from "./s3.js";
import {
  fetchPublicPhotos,
  fetchAllPhotos,
  insertPhoto,
  updatePhoto,
  getPhotoById,
  deletePhotoById,
} from "./nhost.js";

type Env = { Variables: { userId: string } };

const photos = new Hono<Env>();

// GET /photos — public list (unauthenticated) or full list (authenticated)
photos.get("/", optionalAuthMiddleware, async (c) => {
  const userId = c.get("userId");
  const data = userId ? await fetchAllPhotos() : await fetchPublicPhotos();
  return c.json({ photos: data });
});

// POST /photos — upload image + create DB record (multipart form)
photos.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const form = await c.req.formData();

  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  const altText = (form.get("alt_text") as string) || "";
  const isPublic = form.get("is_public") === "true";

  if (!altText.trim()) {
    return c.json({ error: "alt_text is required" }, 400);
  }

  // Upload to DO Spaces
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `gallery/${crypto.randomUUID()}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      ACL: "public-read",
    })
  );

  const photoCdnUrl = `${cdnUrl}/${key}`;

  // Insert into Nhost DB
  const photo = await insertPhoto({
    cdn_url: photoCdnUrl,
    alt_text: altText.trim(),
    is_public: isPublic,
    user_id: userId,
  });

  return c.json({ photo }, 201);
});

// PUT /photos/:id — update metadata
photos.put("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;

  const existing = await getPhotoById(id);
  if (!existing) {
    return c.json({ error: "Photo not found" }, 404);
  }
  if (existing.user_id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{ alt_text?: string; is_public?: boolean }>();

  const photo = await updatePhoto({
    id,
    alt_text: body.alt_text !== undefined ? body.alt_text : existing.alt_text,
    is_public: body.is_public !== undefined ? body.is_public : existing.is_public,
  });

  return c.json({ photo });
});

// DELETE /photos/:id — remove from DB + S3
photos.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;

  const existing = await getPhotoById(id);
  if (!existing) {
    return c.json({ error: "Photo not found" }, 404);
  }
  if (existing.user_id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Delete from DB first
  await deletePhotoById(id);

  // Delete from S3 (best-effort)
  if (existing.cdn_url.startsWith(cdnUrl)) {
    const key = existing.cdn_url.replace(`${cdnUrl}/`, "");
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // S3 cleanup is best-effort
    }
  }

  return c.json({ ok: true });
});

export default photos;
