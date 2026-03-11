import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b-3 — Three rows with staggered parallax.
 * Top row fastest, middle row medium, bottom row slowest.
 * Different card heights per row. The middle row has taller portrait
 * cards, top and bottom are landscape. Creates a dense, immersive wall.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const topRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 300, h: 160 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 260, h: 150 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 340, h: 170 },
  { label: "Trail Run", category: "Ozark trails", w: 280, h: 155 },
];

const midRow: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 240, h: 300 },
  { label: "Workshop Detail", category: "Detail/macro", w: 220, h: 280 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 260, h: 320 },
  { label: "Stained Glass", category: "Detail/macro", w: 230, h: 290 },
];

const bottomRow: Photo[] = [
  { label: "Golden Hour", category: "NWA", w: 320, h: 170 },
  { label: "Macro Flower", category: "Detail/macro", w: 280, h: 160 },
  { label: "Workshop Wide", category: "Detail/macro", w: 350, h: 175 },
  { label: "Mountain View", category: "NWA", w: 300, h: 165 },
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

export function GalleryV1b3() {
  const sectionRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const top = topRef.current;
    const mid = midRef.current;
    const bottom = bottomRef.current;
    if (!section || !top || !mid || !bottom) return;

    const ctx = gsap.context(() => {
      const topScroll = top.scrollWidth - window.innerWidth;
      const midScroll = mid.scrollWidth - window.innerWidth;
      const bottomScroll = bottom.scrollWidth - window.innerWidth;
      const maxScroll = Math.max(topScroll, midScroll, bottomScroll);
      const scrollDistance = maxScroll + window.innerWidth * 0.4;

      // Top — fastest
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

      // Middle — medium speed
      gsap.to(mid, {
        x: -midScroll * 0.75,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });

      // Bottom — slowest
      gsap.to(bottom, {
        x: -bottomScroll * 0.55,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });

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
    <section ref={sectionRef} id="gallery-v1b3" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1b-3 — Three-row parallax wall
        </motion.p>
      </div>

      <div className="flex flex-col justify-center h-full gap-4" style={{ paddingTop: "6rem" }}>
        {/* Top — landscape, fast */}
        <div ref={topRef} className="flex items-end gap-6 w-max pl-[3vw]">
          {topRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} />
          ))}
        </div>

        {/* Middle — portrait, medium */}
        <div ref={midRef} className="flex items-center gap-8 w-max pl-[10vw]">
          {midRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 4) % gradients.length]} />
          ))}
        </div>

        {/* Bottom — landscape, slow */}
        <div ref={bottomRef} className="flex items-start gap-6 w-max pl-[18vw]">
          {bottomRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 2) % gradients.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
