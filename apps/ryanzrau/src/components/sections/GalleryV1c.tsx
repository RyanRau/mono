import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1c — Horizontal scroll with scattered/overlapping cards.
 * Photos are positioned at seemingly random y-positions with slight
 * overlaps, like photos scattered on a table or a film contact sheet.
 * Some cards overlap their neighbors creating depth via z-index.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
  y: number; // px offset from center
  rotate: number;
  z: number; // z-index for overlap
  marginLeft: number; // negative for overlap
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 300, h: 220, y: -80, rotate: -3, z: 1, marginLeft: 0 },
  { label: "Devils Den", category: "NWA", w: 200, h: 270, y: 60, rotate: 2, z: 2, marginLeft: -30 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 340, h: 230, y: -40, rotate: -1, z: 1, marginLeft: 20 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 220, h: 300, y: 90, rotate: 3, z: 3, marginLeft: -50 },
  { label: "Workshop Detail", category: "Detail/macro", w: 280, h: 190, y: -100, rotate: -2, z: 2, marginLeft: 10 },
  { label: "Golden Hour", category: "NWA", w: 260, h: 320, y: 30, rotate: 1.5, z: 1, marginLeft: -20 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 320, h: 210, y: -60, rotate: -1.5, z: 2, marginLeft: 30 },
  { label: "Macro Flower", category: "Detail/macro", w: 240, h: 280, y: 70, rotate: 2.5, z: 3, marginLeft: -40 },
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

export function GalleryV1c() {
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
    <section ref={sectionRef} id="gallery-v1c" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1c — Scattered overlap
        </motion.p>
      </div>

      {/* Scrolling scattered strip */}
      <div ref={stripRef} className="relative h-full w-max flex items-center pl-[12vw] pr-[10vw]">
        {photos.map((photo, i) => (
          <div
            key={photo.label}
            className="flex-shrink-0 relative"
            style={{
              zIndex: photo.z,
              marginLeft: i === 0 ? 0 : photo.marginLeft,
              transform: `translateY(${photo.y}px) rotate(${photo.rotate}deg)`,
            }}
          >
            <div
              className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-ink/10 overflow-hidden group shadow-xl shadow-black/15 hover:z-50 hover:scale-105 transition-transform duration-300`}
              style={{ width: photo.w, height: photo.h }}
            >
              {/* Subtle paper/polaroid border effect */}
              <div className="absolute inset-0 border-[6px] border-parchment/30 pointer-events-none" />

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
          </div>
        ))}
      </div>
    </section>
  );
}
