import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  endpoint: import.meta.env.VITE_DO_SPACES_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_DO_SPACES_KEY,
    secretAccessKey: import.meta.env.VITE_DO_SPACES_SECRET,
  },
  forcePathStyle: false,
});

const bucket = import.meta.env.VITE_DO_SPACES_BUCKET;
const cdnUrl = import.meta.env.VITE_DO_SPACES_CDN_URL;

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `gallery/${crypto.randomUUID()}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: file.type,
      ACL: "public-read",
    })
  );

  return `${cdnUrl}/${key}`;
}

export async function deleteImage(url: string): Promise<void> {
  const key = url.replace(`${cdnUrl}/`, "");
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
