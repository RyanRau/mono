import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b — Horizontal scroll with two staggered rows.
 * Top row and bottom row scroll at slightly different speeds (parallax).
 * Cards are different sizes and the rows don't align, creating an
 * organic, layered collage feel.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const topRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 340, h: 220 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 260, h: 180 },
  { label: "Workshop Detail", category: "Detail/macro", w: 300, h: 240 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 380, h: 200 },
  { label: "Lake Wedington", category: "NWA", w: 310, h: 210 },
  { label: "Stained Glass", category: "Detail/macro", w: 270, h: 230 },
  { label: "Tanyard Creek", category: "Ozark trails", w: 350, h: 190 },
  { label: "KLR on Gravel", category: "Motorcycle journeys", w: 290, h: 220 },
];

const bottomRow: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 280, h: 200 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 320, h: 240 },
  { label: "Golden Hour", category: "NWA", w: 240, h: 180 },
  { label: "Macro Flower", category: "Detail/macro", w: 360, h: 220 },
  { label: "War Eagle Mill", category: "NWA", w: 300, h: 210 },
  { label: "Lathe Turning", category: "Detail/macro", w: 280, h: 240 },
  { label: "Boxley Valley", category: "Ozark trails", w: 340, h: 190 },
  { label: "River Crossing", category: "Motorcycle journeys", w: 310, h: 230 },
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

function PhotoCard({ photo, gradient }: { photo: Photo; gradient: string }) {
  return (
    <div
      className={`relative flex-shrink-0 bg-gradient-to-br ${gradient} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10`}
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
  );
}

export function GalleryV1b() {
  const sectionRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!section || !top || !bottom) return;

    const ctx = gsap.context(() => {
      const topScroll = top.scrollWidth - window.innerWidth;
      const bottomScroll = bottom.scrollWidth - window.innerWidth;
      const maxScroll = Math.max(topScroll, bottomScroll);
      const scrollDistance = maxScroll + window.innerWidth * 0.5;

      // Top row moves at full speed
      gsap.to(top, {
        x: -topScroll,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });

      // Bottom row moves slightly slower (parallax)
      gsap.to(bottom, {
        x: -bottomScroll * 0.85,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });

      // Pin the section
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${scrollDistance}`,
        pin: true,
        anticipatePin: 1,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="gallery-v1b" className="bg-forest/10 h-screen overflow-hidden relative">
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
          Shot on Sony a6400 — always chasing the next frame
        </motion.p>
      </div>

      {/* Two rows container */}
      <div className="flex flex-col justify-center h-full gap-6" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        {/* Top row — starts offset to the right */}
        <div ref={topRef} className="flex items-end gap-8 w-max pl-[5vw]">
          {topRow.map((photo, i) => (
            <div key={photo.label} style={{ marginLeft: i === 0 ? 60 : 0 }}>
              <PhotoCard photo={photo} gradient={gradients[i % gradients.length]} />
            </div>
          ))}
          {/* Spacer so last photo sits fully visible */}
          <div className="flex-shrink-0 w-[40vw]" aria-hidden="true" />
        </div>

        {/* Bottom row — starts further left, offset from top */}
        <div ref={bottomRef} className="flex items-start gap-10 w-max pl-[15vw]">
          {bottomRow.map((photo, i) => (
            <div key={photo.label} style={{ marginLeft: i === 0 ? 120 : 0 }}>
              <PhotoCard photo={photo} gradient={gradients[(i + 4) % gradients.length]} />
            </div>
          ))}
          {/* Spacer so last photo sits fully visible */}
          <div className="flex-shrink-0 w-[40vw]" aria-hidden="true" />
        </div>
      </div>

      {/* See more button */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
        <a
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 border border-ink/15 rounded-sm font-mono text-xs text-ink/50 hover:text-rust hover:border-rust/40 transition-colors bg-parchment/60 backdrop-blur-sm"
        >
          See More
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
