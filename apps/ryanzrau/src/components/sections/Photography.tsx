import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const photos = [
  { label: "Ozark Trail", category: "Ozark trails" },
  { label: "Devils Den", category: "NWA" },
  { label: "Hawksbill Crag", category: "Ozark trails" },
  { label: "Gravel Road", category: "Motorcycle journeys" },
  { label: "Workshop Detail", category: "Detail/macro" },
  { label: "Golden Hour", category: "NWA" },
  { label: "Hill Country", category: "Motorcycle journeys" },
  { label: "Macro Flower", category: "Detail/macro" },
];

export function Photography() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const strip = stripRef.current;
    if (!container || !strip) return;

    const ctx = gsap.context(() => {
      const totalScroll = strip.scrollWidth - container.offsetWidth;

      gsap.to(strip, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: () => `+=${totalScroll}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section id="photography" className="bg-ink">
      <div className="py-16 px-6 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-parchment mb-4 text-center"
        >
          What I <span className="text-rust">See</span>
        </motion.h2>
        <p className="font-mono text-xs text-parchment/30 text-center mb-2">
          Shot on Sony a6400
        </p>
      </div>

      <div ref={containerRef} className="h-screen overflow-hidden">
        <div ref={stripRef} className="flex gap-6 items-center h-full px-12 w-max">
          {photos.map((photo) => (
            <div key={photo.label} className="flex-shrink-0 flex flex-col gap-2">
              <div className="w-[60vw] md:w-[35vw] aspect-[16/9] bg-gradient-to-br from-ink-light to-forest/20 rounded-sm border border-parchment/10 flex items-center justify-center">
                <span className="font-mono text-sm text-parchment/20">{photo.label}</span>
              </div>
              <span className="font-mono text-xs text-parchment/25">{photo.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
