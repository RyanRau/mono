import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b-4 — Two rows with varied gaps, slight rotations, and uneven
 * vertical alignment. Cards within each row have random-looking spacing
 * and subtle tilts. Rows scroll at different speeds. More playful and
 * organic than V1b's clean rows.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
  rotate: number;
  gap: number; // extra right margin
  yNudge: number; // px shift up/down within row
}

const topRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 320, h: 210, rotate: -1.5, gap: 40, yNudge: -15 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 250, h: 190, rotate: 2, gap: 60, yNudge: 20 },
  { label: "Workshop Detail", category: "Detail/macro", w: 340, h: 230, rotate: -0.5, gap: 30, yNudge: -8 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 280, h: 200, rotate: 1, gap: 50, yNudge: 12 },
  { label: "Trail Run", category: "Ozark trails", w: 310, h: 180, rotate: -2, gap: 0, yNudge: -20 },
];

const bottomRow: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 290, h: 220, rotate: 1.5, gap: 55, yNudge: 10 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 330, h: 200, rotate: -1, gap: 35, yNudge: -18 },
  { label: "Golden Hour", category: "NWA", w: 260, h: 240, rotate: 2.5, gap: 45, yNudge: 15 },
  { label: "Macro Flower", category: "Detail/macro", w: 300, h: 210, rotate: -1.5, gap: 50, yNudge: -10 },
  { label: "Stained Glass", category: "Detail/macro", w: 270, h: 190, rotate: 0.5, gap: 0, yNudge: 22 },
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
      className="flex-shrink-0"
      style={{
        marginRight: photo.gap,
        transform: `translateY(${photo.yNudge}px) rotate(${photo.rotate}deg)`,
      }}
    >
      <div
        className={`relative bg-gradient-to-br ${gradient} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10`}
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
    </div>
  );
}

export function GalleryV1b4() {
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
      const scrollDistance = maxScroll + window.innerWidth * 0.4;

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

      gsap.to(bottom, {
        x: -bottomScroll * 0.8,
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
    <section ref={sectionRef} id="gallery-v1b4" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1b-4 — Loose rows with rotation &amp; varied gaps
        </motion.p>
      </div>

      <div className="flex flex-col justify-center h-full gap-10" style={{ paddingTop: "6rem" }}>
        <div ref={topRef} className="flex items-center gap-6 w-max pl-[8vw]">
          {topRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} />
          ))}
        </div>

        <div ref={bottomRef} className="flex items-center gap-6 w-max pl-[20vw]">
          {bottomRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 3) % gradients.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
