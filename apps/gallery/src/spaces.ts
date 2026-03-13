import nhost from "./nhost";

const apiUrl = import.meta.env.VITE_GALLERY_API_URL;

function getAuthHeader(): Record<string, string> {
  const session = nhost.auth.getSession();
  if (!session?.accessToken) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";

  const res = await fetch(`${apiUrl}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ contentType: file.type, extension: ext }),
  });

  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, cdnUrl } = await res.json();

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!upload.ok) throw new Error("Failed to upload image");

  return cdnUrl;
}

export async function deleteImage(cdnUrl: string): Promise<void> {
  await fetch(`${apiUrl}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ cdnUrl }),
  });
}
