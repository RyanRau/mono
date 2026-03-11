import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1a — Horizontal scroll timeline.
 * A thin horizontal line runs through the middle. Photos alternate above
 * and below the line with dot markers and category labels on the line,
 * similar to the Work section's vertical timeline but rotated horizontal.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 300, h: 200 },
  { label: "Devils Den", category: "NWA", w: 220, h: 280 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 320, h: 210 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 240, h: 300 },
  { label: "Workshop Detail", category: "Detail/macro", w: 280, h: 190 },
  { label: "Golden Hour", category: "NWA", w: 260, h: 320 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 310, h: 220 },
  { label: "Macro Flower", category: "Detail/macro", w: 230, h: 280 },
];

const gradients = [
  "from-forest/20 to-stone/15",
  "from-stone/25 to-forest/15",
  "from-rust/15 to-stone/10",
  "from-forest/15 to-stone/20",
  "from-stone/15 to-forest/20",
  "from-stone/20 to-rust/10",
  "from-forest/20 to-stone/15",
  "from-rust/10 to-forest/15",
];

export function GalleryV1a() {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    if (!section || !strip) return;

    const ctx = gsap.context(() => {
      const totalScroll = strip.scrollWidth - window.innerWidth;

      gsap.to(strip, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll + window.innerWidth * 0.4}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="gallery-v1a" className="bg-forest/10 h-screen overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-16 px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-ink mb-2 text-center"
        >
          Through the Lens
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-mono text-xs text-ink/30 text-center"
        >
          V1a — Horizontal timeline
        </motion.p>
      </div>

      {/* Scrolling strip */}
      <div ref={stripRef} className="relative h-full w-max" style={{ paddingTop: "7rem" }}>
        {/* Horizontal timeline line — centered vertically in the remaining space */}
        <div
          className="absolute left-0 right-0 h-px bg-stone/40"
          style={{ top: "calc(50% + 3.5rem)" }}
        />

        <div className="flex items-center h-full pl-[15vw] pr-[10vw]">
          {photos.map((photo, i) => {
            const isAbove = i % 2 === 0;
            return (
              <div
                key={photo.label}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ marginRight: 80 + (i % 3) * 20 }}
              >
                {/* Photo above or below timeline */}
                {isAbove ? (
                  <>
                    {/* Photo card */}
                    <div
                      className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10 mb-3`}
                      style={{ width: photo.w, height: photo.h }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-xs text-ink/15">{photo.label}</span>
                      </div>
                      <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
                        <div>
                          <p className="font-mono text-sm text-parchment">{photo.label}</p>
                          <p className="font-mono text-xs text-parchment/50">{photo.category}</p>
                        </div>
                      </div>
                    </div>
                    {/* Connector stem */}
                    <div className="w-px h-8 bg-stone/40" />
                    {/* Dot on timeline */}
                    <div className="w-3 h-3 rounded-full bg-rust border-2 border-parchment ring-2 ring-stone/40" />
                    {/* Category label below */}
                    <span className="font-mono text-xs text-ink/30 mt-3 whitespace-nowrap">
                      {photo.category}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Category label above */}
                    <span className="font-mono text-xs text-ink/30 mb-3 whitespace-nowrap">
                      {photo.category}
                    </span>
                    {/* Dot on timeline */}
                    <div className="w-3 h-3 rounded-full bg-rust border-2 border-parchment ring-2 ring-stone/40" />
                    {/* Connector stem */}
                    <div className="w-px h-8 bg-stone/40" />
                    {/* Photo card */}
                    <div
                      className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10 mt-3`}
                      style={{ width: photo.w, height: photo.h }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-xs text-ink/15">{photo.label}</span>
                      </div>
                      <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
                        <div>
                          <p className="font-mono text-sm text-parchment">{photo.label}</p>
                          <p className="font-mono text-xs text-parchment/50">{photo.category}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
