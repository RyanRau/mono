import { pb } from "./pb";

// home-server/cdn-gateway, served at cdn.ryanzrau.dev. Same convention as
// pb.ts's VITE_PB_URL: only set to point at a gateway during local dev.
export const CDN_URL = import.meta.env.VITE_CDN_URL ?? "https://cdn.ryanzrau.dev";

export type CdnFolder = { name: string; path: string };
export type CdnFile = {
  name: string;
  path: string;
  size: number;
  mtime: number;
  mime: string;
  kind: "image" | "video" | "audio" | "document" | "other";
};
export type CdnListing = { path: string; folders: CdnFolder[]; files: CdnFile[] };

/** One of cdn_public's rows -- see apps/pocketbase/pb_migrations/1789200000_cdn_files.js. */
export type PublicRule = { id: string; path: string; folder: boolean; collection: string };

/** Encodes each segment, keeping the slashes -- paths can contain spaces, #, ? etc. */
export function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * A file's URL on the CDN; `width` asks for a WebP thumbnail (one of the
 * gateway's `thumbnails.widths`). Works in an <img> tag with no extra
 * auth: the browser sends the shared .ryanzrau.dev pb_auth cookie.
 */
export function fileUrl(path: string, width?: 256 | 512 | 1024 | 2048) {
  return `${CDN_URL}/files/${encodePath(path)}${width ? `?w=${width}` : ""}`;
}

export function joinPath(folder: string, name: string) {
  return folder ? `${folder}/${name}` : name;
}

export function parentOf(path: string) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

export function isPublic(path: string, rules: PublicRule[]) {
  return rules.some((r) => (r.folder ? path.startsWith(`${r.path}/`) : r.path === path));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/**
 * Calls the gateway's admin /api/ routes. They take the session token as a
 * Bearer header only -- never the cookie -- so no other site can drive them
 * through a signed-in browser (see require_admin in gateway.py).
 */
export async function cdnApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${pb.authStore.token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${CDN_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Couldn't reach the CDN gateway. Is it running?");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
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
