import { motion } from "framer-motion";

interface Photo {
  label: string;
  category: string;
  orientation: "landscape" | "portrait";
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", orientation: "landscape" },
  { label: "Devils Den", category: "NWA", orientation: "portrait" },
  { label: "Hawksbill Crag", category: "Ozark trails", orientation: "landscape" },
  { label: "Gravel Road", category: "Motorcycle journeys", orientation: "portrait" },
  { label: "Workshop Detail", category: "Detail/macro", orientation: "landscape" },
  { label: "Golden Hour", category: "NWA", orientation: "portrait" },
  { label: "Hill Country", category: "Motorcycle journeys", orientation: "landscape" },
  { label: "Macro Flower", category: "Detail/macro", orientation: "portrait" },
  { label: "Buffalo River", category: "Ozark trails", orientation: "landscape" },
  { label: "Trail Fern", category: "Detail/macro", orientation: "portrait" },
];

const gradients = [
  "from-forest/30 to-ink-light",
  "from-stone/30 to-forest/20",
  "from-rust/20 to-ink-light",
  "from-forest/20 to-stone/20",
  "from-ink-light to-forest/30",
  "from-stone/20 to-rust/15",
  "from-forest/25 to-ink-light",
  "from-rust/15 to-forest/20",
  "from-stone/25 to-ink-light",
  "from-forest/20 to-stone/15",
];

export function Gallery() {
  return (
    <section id="gallery" className="bg-ink py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-parchment mb-4 text-center"
        >
          Through the Lens
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-mono text-xs text-parchment/30 text-center mb-16"
        >
          Shot on Sony a6400
        </motion.p>

        {/* Staggered masonry grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              className="break-inside-avoid"
            >
              <div
                className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-parchment/8 overflow-hidden group ${
                  photo.orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-parchment/15"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                    <span className="font-mono text-xs text-parchment/15">{photo.label}</span>
                  </div>
                </div>

                {/* Hover overlay with label */}
                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
                  <div>
                    <p className="font-mono text-sm text-parchment">{photo.label}</p>
                    <p className="font-mono text-xs text-parchment/50">{photo.category}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
