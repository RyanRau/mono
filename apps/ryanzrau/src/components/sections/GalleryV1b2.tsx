import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b-2 — Two rows scrolling in opposite directions.
 * Top row moves left, bottom row moves right, creating a conveyor-belt
 * / cinematic crossover effect. Rows start pre-offset so content
 * reveals from both sides simultaneously.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const topRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 340, h: 200 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 280, h: 220 },
  { label: "Workshop Detail", category: "Detail/macro", w: 320, h: 190 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 360, h: 210 },
  { label: "Macro Flower", category: "Detail/macro", w: 260, h: 200 },
];

const bottomRow: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 300, h: 210 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 350, h: 230 },
  { label: "Golden Hour", category: "NWA", w: 270, h: 200 },
  { label: "Stained Glass", category: "Detail/macro", w: 330, h: 220 },
  { label: "Trail Run", category: "Ozark trails", w: 290, h: 190 },
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

export function GalleryV1b2() {
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
      const scrollDistance = Math.max(topScroll, bottomScroll) + window.innerWidth * 0.3;

      // Top row moves left (normal)
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

      // Bottom row moves right (starts off-screen left, slides in)
      gsap.fromTo(
        bottom,
        { x: -bottomScroll },
        {
          x: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${scrollDistance}`,
            scrub: 1,
          },
        },
      );

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
    <section ref={sectionRef} id="gallery-v1b2" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1b-2 — Opposite direction rows
        </motion.p>
      </div>

      <div className="flex flex-col justify-center h-full gap-8" style={{ paddingTop: "6rem" }}>
        <div ref={topRef} className="flex items-end gap-8 w-max">
          {topRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} />
          ))}
        </div>

        <div ref={bottomRef} className="flex items-start gap-8 w-max">
          {bottomRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 3) % gradients.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
