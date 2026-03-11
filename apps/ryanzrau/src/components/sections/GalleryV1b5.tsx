import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * V1b-5 — Two rows, same direction, with staggered start positions
 * and a strong size contrast. Top row has large hero-sized cards,
 * bottom row has smaller thumbnails at a faster speed, creating a
 * "featured + filmstrip" look.
 */

interface Photo {
  label: string;
  category: string;
  w: number;
  h: number;
}

const heroRow: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", w: 480, h: 320 },
  { label: "Hawksbill Crag", category: "Ozark trails", w: 520, h: 340 },
  { label: "Golden Hour", category: "NWA", w: 460, h: 310 },
  { label: "Hill Country", category: "Motorcycle journeys", w: 500, h: 330 },
];

const filmstrip: Photo[] = [
  { label: "Devils Den", category: "NWA", w: 160, h: 120 },
  { label: "Gravel Road", category: "Motorcycle journeys", w: 180, h: 120 },
  { label: "Workshop Detail", category: "Detail/macro", w: 150, h: 120 },
  { label: "Macro Flower", category: "Detail/macro", w: 170, h: 120 },
  { label: "Stained Glass", category: "Detail/macro", w: 160, h: 120 },
  { label: "Trail Run", category: "Ozark trails", w: 180, h: 120 },
  { label: "Mountain View", category: "NWA", w: 155, h: 120 },
  { label: "Workshop Wide", category: "Detail/macro", w: 175, h: 120 },
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

export function GalleryV1b5() {
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const hero = heroRef.current;
    const film = filmRef.current;
    if (!section || !hero || !film) return;

    const ctx = gsap.context(() => {
      const heroScroll = hero.scrollWidth - window.innerWidth;
      const filmScroll = film.scrollWidth - window.innerWidth;
      const scrollDistance = Math.max(heroScroll, filmScroll) + window.innerWidth * 0.4;

      // Hero row — slower, big cards
      gsap.to(hero, {
        x: -heroScroll,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });

      // Filmstrip — faster, small cards
      gsap.to(film, {
        x: -filmScroll,
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
    <section ref={sectionRef} id="gallery-v1b5" className="bg-forest/10 h-screen overflow-hidden relative">
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
          V1b-5 — Hero + filmstrip
        </motion.p>
      </div>

      <div className="flex flex-col justify-center h-full gap-5" style={{ paddingTop: "6rem" }}>
        {/* Large hero cards */}
        <div ref={heroRef} className="flex items-end gap-10 w-max pl-[6vw]">
          {heroRow.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[i % gradients.length]} />
          ))}
        </div>

        {/* Small filmstrip thumbnails */}
        <div ref={filmRef} className="flex items-start gap-3 w-max pl-[12vw]">
          {filmstrip.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} gradient={gradients[(i + 2) % gradients.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
