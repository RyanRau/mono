import { UNALLOCATED } from "./budget";
import type { Bucket } from "./budget";

export function bucketName(id: string, buckets: Bucket[]): string {
  if (id === UNALLOCATED) return "Unallocated";
  return buckets.find((b) => b.id === id)?.name ?? "Deleted bucket";
}
