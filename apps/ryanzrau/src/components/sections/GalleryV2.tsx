import { motion } from "framer-motion";

/**
 * V2 — Vertical scroll, masonry-style staggered two-column layout.
 * Left column starts higher, right column is offset down. Cards have
 * varied aspect ratios creating an organic, flowing feel.
 */

interface Photo {
  label: string;
  category: string;
  aspect: string; // Tailwind aspect ratio class
}

const leftCol: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", aspect: "aspect-[4/3]" },
  { label: "Hawksbill Crag", category: "Ozark trails", aspect: "aspect-[3/4]" },
  { label: "Workshop Detail", category: "Detail/macro", aspect: "aspect-[16/10]" },
  { label: "Hill Country", category: "Motorcycle journeys", aspect: "aspect-[4/5]" },
];

const rightCol: Photo[] = [
  { label: "Devils Den", category: "NWA", aspect: "aspect-[3/4]" },
  { label: "Gravel Road", category: "Motorcycle journeys", aspect: "aspect-[4/3]" },
  { label: "Golden Hour", category: "NWA", aspect: "aspect-[3/5]" },
  { label: "Macro Flower", category: "Detail/macro", aspect: "aspect-[16/10]" },
];

const gradients = [
  "from-forest/20 to-stone/15",
  "from-stone/25 to-forest/15",
  "from-rust/15 to-stone/10",
  "from-forest/15 to-stone/20",
];

function PhotoCard({ photo, gradient, index }: { photo: Photo; gradient: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div
        className={`relative ${photo.aspect} bg-gradient-to-br ${gradient} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2 text-ink/10"
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
            <span className="font-mono text-xs text-ink/15">{photo.label}</span>
          </div>
        </div>

        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
          <div>
            <p className="font-mono text-sm text-parchment">{photo.label}</p>
            <p className="font-mono text-xs text-parchment/50">{photo.category}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryV2() {
  return (
    <section id="gallery-v2" className="bg-forest/10 py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-ink mb-4 text-center"
        >
          Through the Lens
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-mono text-xs text-ink/30 text-center mb-16"
        >
          V2 — Vertical masonry, staggered two-column
        </motion.p>

        {/* Two-column staggered layout */}
        <div className="flex gap-6 md:gap-10">
          {/* Left column — starts flush */}
          <div className="flex-1 flex flex-col gap-6 md:gap-10">
            {leftCol.map((photo, i) => (
              <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} index={i} />
            ))}
          </div>

          {/* Right column — offset down for stagger */}
          <div className="flex-1 flex flex-col gap-6 md:gap-10 mt-20 md:mt-32">
            {rightCol.map((photo, i) => (
              <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 2) % gradients.length]} index={i} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 text-center"
        >
          <a
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 border border-ink/15 rounded-sm font-mono text-xs text-ink/50 hover:text-rust hover:border-rust/40 transition-colors"
          >
            View Full Gallery
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
