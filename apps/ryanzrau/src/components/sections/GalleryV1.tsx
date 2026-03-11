import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1 — Horizontal scroll with staggered vertical offsets.
 * Cards float at alternating heights with slight rotation, no trail or path.
 * Clean, airy feel with generous spacing.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
  yOffset: number; // percentage shift from center (-30 to 30)
  rotate: number;
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 320, h: 220, yOffset: -18, rotate: -1.5 },
  { label: "Devils Den", category: "NWA", w: 220, h: 300, yOffset: 14, rotate: 2 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 360, h: 240, yOffset: -8, rotate: 0.5 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 200, h: 280, yOffset: 20, rotate: -2 },
  { label: "Workshop Detail", category: "Detail/macro", w: 300, h: 200, yOffset: -22, rotate: 1 },
  { label: "Golden Hour", category: "NWA", w: 240, h: 320, yOffset: 10, rotate: -1 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 340, h: 230, yOffset: -12, rotate: 1.5 },
  { label: "Macro Flower", category: "Detail/macro", w: 210, h: 290, yOffset: 16, rotate: -0.5 },
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

export function GalleryV1() {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    if (!section || !strip) return;

    const ctx = gsap.context(() => {
      const totalScroll = strip.scrollWidth - window.innerWidth;
      const scrollDistance = totalScroll + window.innerWidth * 0.5;

      gsap.to(strip, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="gallery-v1" className="bg-forest/10 h-screen overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-24 pb-8 px-6">
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
          className="font-mono text-xs text-ink/30 text-center"
        >
          V1 — Horizontal scroll, staggered float
        </motion.p>
      </div>

      {/* Horizontal strip */}
      <div ref={stripRef} className="flex items-center h-full pl-[10vw] gap-12 w-max">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.label}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 100px 0px 0px" }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            className="flex-shrink-0"
            style={{
              transform: `translateY(${photo.yOffset}%) rotate(${photo.rotate}deg)`,
            }}
          >
            <div
              className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10`}
              style={{ width: photo.w, height: photo.h }}
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
        ))}

        {/* End CTA */}
        <div className="flex-shrink-0 pr-[10vw]">
          <a
            href="/gallery"
            className="w-36 h-36 rounded-sm border border-ink/15 bg-gradient-to-br from-rust/10 to-forest/10 flex flex-col items-center justify-center gap-3 group hover:border-rust/40 transition-colors"
          >
            <svg
              className="w-8 h-8 text-ink/30 group-hover:text-rust transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
            <span className="font-mono text-xs text-ink/30 group-hover:text-rust transition-colors">
              Full Gallery
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
