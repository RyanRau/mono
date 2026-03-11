import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b-6 — Two rows separated by a thin divider line with category
 * labels that float along it. Top row is landscapes, bottom is
 * portraits. The divider has subtle dot markers between photos.
 * Rows scroll at different speeds with generous spacing.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const topRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 360, h: 200 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 300, h: 190 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 380, h: 210 },
  { label: "Golden Hour", category: "NWA", w: 320, h: 195 },
  { label: "Workshop Wide", category: "Detail/macro", w: 350, h: 200 },
];

const bottomRow: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 220, h: 300 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 200, h: 280 },
  { label: "Workshop Detail", category: "Detail/macro", w: 230, h: 310 },
  { label: "Macro Flower", category: "Detail/macro", w: 210, h: 290 },
  { label: "Stained Glass", category: "Detail/macro", w: 220, h: 300 },
];

const categories = ["Ozark trails", "NWA", "Motorcycle journeys", "Detail/macro"];

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

export function GalleryV1b6() {
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
      const bottomScroll = bottom.scrollWidth - window.innerWidth;
      const midScroll = mid.scrollWidth - window.innerWidth;
      const maxScroll = Math.max(topScroll, bottomScroll, midScroll);
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

      // Middle divider scrolls at its own pace
      gsap.to(mid, {
        x: -midScroll * 0.6,
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
    <section ref={sectionRef} id="gallery-v1b6" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1b-6 — Rows with category divider
        </motion.p>
      </div>

      <div className="flex flex-col justify-center h-full" style={{ paddingTop: "6rem" }}>
        {/* Top row — landscapes */}
        <div ref={topRef} className="flex items-end gap-10 w-max pl-[5vw] mb-4">
          {topRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} />
          ))}
        </div>

        {/* Middle divider with category labels */}
        <div ref={midRef} className="flex items-center w-max px-[8vw] my-2">
          <div className="h-px bg-stone/30 w-16 flex-shrink-0" />
          {categories.map((cat, i) => (
            <div key={cat} className="flex items-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-rust/50 mx-4 flex-shrink-0" />
              <span className="font-mono text-xs text-ink/30 whitespace-nowrap">{cat}</span>
              {i < categories.length - 1 && <div className="h-px bg-stone/30 w-24 ml-4 flex-shrink-0" />}
            </div>
          ))}
          <div className="h-px bg-stone/30 w-16 ml-4 flex-shrink-0" />
        </div>

        {/* Bottom row — portraits */}
        <div ref={bottomRef} className="flex items-start gap-10 w-max pl-[14vw] mt-4">
          {bottomRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 3) % gradients.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
