export type AspectRatio = "3:2" | "16:9";
export type Orientation = "landscape" | "portrait";

export interface Photo {
  label: string;
  category: string;
  aspect: AspectRatio;
  orientation: Orientation;
}

/** Seed for deterministic pseudo-random orientation assignment. */
function seededShuffle(items: Photo[]): Photo[] {
  // Simple hash-based seed from label to keep it stable across renders
  return items.map((item) => {
    const hash = item.label
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const orientation: Orientation = hash % 2 === 0 ? "landscape" : "portrait";
    return { ...item, orientation };
  });
}

const rawTopRow: Omit<Photo, "orientation">[] = [
  { label: "Ozark Trail", category: "Ozark trails", aspect: "3:2" },
  { label: "Hawksbill Crag", category: "Ozark trails", aspect: "16:9" },
  { label: "Workshop Detail", category: "Detail/macro", aspect: "3:2" },
  { label: "Hill Country", category: "Motorcycle journeys", aspect: "16:9" },
  { label: "Lake Wedington", category: "NWA", aspect: "3:2" },
  { label: "Stained Glass", category: "Detail/macro", aspect: "16:9" },
  { label: "Tanyard Creek", category: "Ozark trails", aspect: "3:2" },
  { label: "KLR on Gravel", category: "Motorcycle journeys", aspect: "16:9" },
];

const rawBottomRow: Omit<Photo, "orientation">[] = [
  { label: "Devils Den", category: "NWA", aspect: "16:9" },
  { label: "Gravel Road", category: "Motorcycle journeys", aspect: "3:2" },
  { label: "Golden Hour", category: "NWA", aspect: "16:9" },
  { label: "Macro Flower", category: "Detail/macro", aspect: "3:2" },
  { label: "War Eagle Mill", category: "NWA", aspect: "16:9" },
  { label: "Lathe Turning", category: "Detail/macro", aspect: "3:2" },
  { label: "Boxley Valley", category: "Ozark trails", aspect: "16:9" },
  { label: "River Crossing", category: "Motorcycle journeys", aspect: "3:2" },
];

export const topRow: Photo[] = seededShuffle(
  rawTopRow as (Omit<Photo, "orientation"> & { orientation: Orientation })[],
);

export const bottomRow: Photo[] = seededShuffle(
  rawBottomRow as (Omit<Photo, "orientation"> & { orientation: Orientation })[],
);

export const gradients = [
  "from-forest/20 to-stone/15",
  "from-stone/25 to-forest/15",
  "from-rust/15 to-stone/10",
  "from-forest/15 to-stone/20",
  "from-stone/15 to-forest/20",
  "from-stone/20 to-rust/10",
  "from-forest/20 to-stone/15",
  "from-rust/10 to-forest/15",
];
