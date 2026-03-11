import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Photo {
  label: string;
  category: string;
  orientation: "landscape" | "portrait";
  /** Vertical offset from trail center line, negative = above, positive = below */
  y: number;
  rotate: number;
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", orientation: "landscape", y: -0.6, rotate: -2 },
  { label: "Devils Den", category: "NWA", orientation: "portrait", y: 0.5, rotate: 3 },
  { label: "Hawksbill Crag", category: "Ozark trails", orientation: "landscape", y: -0.35, rotate: 1 },
  { label: "Gravel Road", category: "Motorcycle journeys", orientation: "portrait", y: 0.65, rotate: -1.5 },
  { label: "Workshop Detail", category: "Detail/macro", orientation: "landscape", y: -0.55, rotate: 2 },
  { label: "Golden Hour", category: "NWA", orientation: "portrait", y: 0.4, rotate: -2.5 },
  { label: "Hill Country", category: "Motorcycle journeys", orientation: "landscape", y: -0.45, rotate: 1.5 },
  { label: "Macro Flower", category: "Detail/macro", orientation: "portrait", y: 0.55, rotate: -1 },
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

// Photo card dimensions
const CARD_W_L = 280;
const CARD_H_L = 210;
const CARD_W_P = 190;
const CARD_H_P = 253;
const GAP = 60;

// Build a horizontal winding trail path
function buildHorizontalTrail(totalWidth: number, centerY: number): string {
  const segments = 12;
  const segW = totalWidth / segments;
  const points: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const yOff = Math.sin(i * 0.9) * 60 + Math.cos(i * 1.4) * 30;
    points.push([i * segW, centerY + yOff]);
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpX = (prev[0] + cur[0]) / 2;
    d += ` C ${cpX} ${prev[1]}, ${cpX} ${cur[1]}, ${cur[0]} ${cur[1]}`;
  }
  return d;
}

export function Gallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGPathElement>(null);

  // Total strip width: photos + gaps + final CTA card + end padding
  const totalWidth =
    photos.reduce((sum, p) => sum + (p.orientation === "landscape" ? CARD_W_L : CARD_W_P) + GAP, 0) +
    400; // extra for CTA card + breathing room at end

  // Vertical center for the trail (accounting for header space at top)
  const trailCenterY = 380;
  const trailD = buildHorizontalTrail(totalWidth, trailCenterY);

  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    const trail = trailRef.current;
    if (!section || !strip || !trail) return;

    const length = trail.getTotalLength();
    trail.style.strokeDasharray = `${length}`;
    trail.style.strokeDashoffset = `${length}`;

    const ctx = gsap.context(() => {
      const totalScroll = strip.scrollWidth - window.innerWidth;
      // Add extra scroll distance for a slower, more gradual exit
      const scrollDistance = totalScroll + window.innerWidth * 0.5;

      // Horizontal scroll — pin the whole section
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

      // Trail draw synced to same scroll
      gsap.to(trail, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance}`,
          scrub: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Compute each photo's horizontal position
  let runningX = 120;
  const positions = photos.map((photo) => {
    const w = photo.orientation === "landscape" ? CARD_W_L : CARD_W_P;
    const x = runningX;
    runningX += w + GAP;
    return x;
  });

  return (
    <section ref={sectionRef} id="gallery" className="bg-forest/10 h-screen overflow-hidden">
      {/* Header — part of the pinned section so it's visible at start */}
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
          Shot on Sony a6400
        </motion.p>
      </div>

      {/* Horizontal scrolling strip */}
      <div ref={stripRef} className="relative h-full" style={{ width: totalWidth }}>
        {/* SVG trail behind photos */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalWidth}
          height="100%"
          fill="none"
        >
          {/* Faint wide trail */}
          <path d={trailD} stroke="rgba(44,59,45,0.06)" strokeWidth="50" strokeLinecap="round" />
          {/* Animated drawn trail */}
          <path
            ref={trailRef}
            d={trailD}
            stroke="rgba(44,59,45,0.15)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
          />
          {/* Trail dots at photo positions */}
          {positions.map((x, i) => {
            const w = photos[i].orientation === "landscape" ? CARD_W_L : CARD_W_P;
            const dotX = x + w / 2;
            const dotY =
              trailCenterY + Math.sin((i + 1) * 0.9) * 60 + Math.cos((i + 1) * 1.4) * 30;
            return <circle key={i} cx={dotX} cy={dotY} r="4" fill="rgba(168,92,56,0.35)" />;
          })}
        </svg>

        {/* Floating photo cards */}
        {photos.map((photo, i) => {
          const isLandscape = photo.orientation === "landscape";
          const w = isLandscape ? CARD_W_L : CARD_W_P;
          const h = isLandscape ? CARD_H_L : CARD_H_P;
          // Center vertically around the trail, offset by photo.y
          const top = trailCenterY + photo.y * 180 - h / 2;

          return (
            <motion.div
              key={photo.label}
              initial={{ opacity: 0, y: 30, rotate: photo.rotate * 2 }}
              whileInView={{ opacity: 1, y: 0, rotate: photo.rotate }}
              viewport={{ once: true, margin: "0px 200px 0px 0px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute"
              style={{
                top,
                left: positions[i],
                width: w,
                zIndex: 10 + i,
              }}
            >
              <div
                className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-ink/10 overflow-hidden group shadow-lg shadow-black/10`}
                style={{ height: h }}
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
          );
        })}

        {/* "View Full Gallery" CTA at the end of the trail */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "0px 200px 0px 0px" }}
          transition={{ duration: 0.5 }}
          className="absolute flex items-center justify-center"
          style={{
            top: trailCenterY - 70,
            left: runningX,
            width: 140,
            height: 140,
            zIndex: 20,
          }}
        >
          <a
            href="/gallery"
            className="w-full h-full rounded-sm border border-ink/15 bg-gradient-to-br from-rust/10 to-forest/10 flex flex-col items-center justify-center gap-3 group hover:border-rust/40 transition-colors"
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
        </motion.div>
      </div>
    </section>
  );
}
