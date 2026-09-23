import { pb } from "./pb";

// The shared file store every app uses (home-server/cdn-gateway, served at
// cdn.ryanzrau.dev) -- store files here, not in PocketBase file fields.
// Upload with uploadFile(), keep the returned id in this app's own
// collection as a relation to `cdn_files`, and show a file with fileUrl().
// Who can see each file is per file: see setAccess() below and
// apps/pocketbase/pb_migrations/1789200000_cdn_files.js.
//
// VITE_CDN_URL is only set to point at a local gateway during development.
export const CDN_URL = import.meta.env.VITE_CDN_URL ?? "https://cdn.ryanzrau.dev";

// This app's registry_apps slug. Uploads land under apps/<slug>/ on the
// NAS, and only users granted this app may upload. Must match the slug of
// the app's registry_apps row exactly.
export const CDN_APP = "__APP_NAME__";

/**
 * - private: only the uploader (and admins)
 * - shared:  the uploader plus the users in shared_with
 * - app:     everyone granted this app
 * - public:  anyone, signed in or not
 */
export type Visibility = "private" | "shared" | "app" | "public";

/** A cdn_files row -- the fields an app typically reads. */
export type CdnFileRecord = {
  id: string;
  path: string;
  name: string;
  mime: string;
  kind: "image" | "video" | "audio" | "document" | "other";
  size: number;
  owner: string;
  visibility: Visibility;
  shared_with: string[];
  width: number;
  height: number;
  taken_at: string;
  description: string;
};

/** Encodes each segment, keeping the slashes. */
function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * A file's URL. `width` asks for a resized WebP (images only). Works in a
 * plain <img>/<video> tag: the browser sends the shared .ryanzrau.dev
 * login cookie, and the gateway checks this viewer against the file's
 * visibility.
 */
export function fileUrl(path: string, width?: 256 | 512 | 1024 | 2048) {
  return `${CDN_URL}/files/${encodePath(path)}${width ? `?w=${width}` : ""}`;
}

async function cdnFetch<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  // The gateway's write routes take the session as a header only, never
  // the cookie, so no other site can trigger them.
  headers.set("Authorization", `Bearer ${pb.authStore.token}`);
  const res = await fetch(`${CDN_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `File store request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // not JSON -- keep the generic message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/**
 * Uploads a file into this app's storage, owned by the signed-in user.
 * Returns the new cdn_files record's id (store it as a relation) and path
 * (pass it to fileUrl).
 */
export function uploadFile(file: File, visibility: Visibility = "private") {
  const query = new URLSearchParams({ name: file.name, visibility });
  return cdnFetch<{ id: string; path: string; size: number }>(
    `/api/apps/${CDN_APP}/files?${query}`,
    { method: "POST", body: file }
  );
}

/** Deletes one of the signed-in user's own files (moves it to the NAS trash). */
export function deleteFile(path: string) {
  return cdnFetch<{ trashed: string }>(`/api/files/${encodePath(path)}`, { method: "DELETE" });
}

/** Changes who can see a file. Only its owner (or an admin) may. */
export function setAccess(id: string, visibility: Visibility, sharedWith: string[] = []) {
  return pb
    .collection("cdn_files")
    .update<CdnFileRecord>(id, { visibility, shared_with: sharedWith });
}
