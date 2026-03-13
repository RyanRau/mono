import nhost from "./nhost";

const apiUrl = import.meta.env.VITE_GALLERY_API_URL;

export type Photo = {
  id: string;
  cdn_url: string;
  alt_text: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
};

function getAuthHeaders(): Record<string, string> {
  const session = nhost.auth.getSession();
  if (!session?.accessToken) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

export async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch(`${apiUrl}/photos`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch photos");
  const data = await res.json();
  return data.photos;
}

export async function createPhoto(
  file: File,
  altText: string,
  isPublic: boolean
): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);
  form.append("alt_text", altText);
  form.append("is_public", String(isPublic));

  const res = await fetch(`${apiUrl}/photos`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload photo");
  const data = await res.json();
  return data.photo;
}

export async function updatePhoto(
  id: string,
  updates: { alt_text?: string; is_public?: boolean }
): Promise<Photo> {
  const res = await fetch(`${apiUrl}/photos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update photo");
  const data = await res.json();
  return data.photo;
}

export async function deletePhoto(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/photos/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete photo");
}
