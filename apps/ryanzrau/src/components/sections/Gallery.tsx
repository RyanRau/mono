import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Photo {
  label: string;
  category: string;
  orientation: "landscape" | "portrait";
  /** Horizontal offset from center: -1 (far left) to 1 (far right) */
  x: number;
  /** Small rotation in degrees for organic feel */
  rotate: number;
}

const photos: Photo[] = [
  { label: "Ozark Trail", category: "Ozark trails", orientation: "landscape", x: -0.3, rotate: -2 },
  { label: "Devils Den", category: "NWA", orientation: "portrait", x: 0.35, rotate: 3 },
  { label: "Hawksbill Crag", category: "Ozark trails", orientation: "landscape", x: -0.15, rotate: 1 },
  { label: "Gravel Road", category: "Motorcycle journeys", orientation: "portrait", x: 0.4, rotate: -1.5 },
  { label: "Workshop Detail", category: "Detail/macro", orientation: "landscape", x: -0.35, rotate: 2 },
  { label: "Golden Hour", category: "NWA", orientation: "portrait", x: 0.2, rotate: -2.5 },
  { label: "Hill Country", category: "Motorcycle journeys", orientation: "landscape", x: -0.4, rotate: 1.5 },
  { label: "Macro Flower", category: "Detail/macro", orientation: "portrait", x: 0.3, rotate: -1 },
  { label: "Buffalo River", category: "Ozark trails", orientation: "landscape", x: -0.1, rotate: 2.5 },
  { label: "Trail Fern", category: "Detail/macro", orientation: "portrait", x: 0.25, rotate: -3 },
];

const gradients = [
  "from-forest/30 to-ink-light",
  "from-stone/30 to-forest/20",
  "from-rust/20 to-ink-light",
  "from-forest/20 to-stone/20",
  "from-ink-light to-forest/30",
  "from-stone/20 to-rust/15",
  "from-forest/25 to-ink-light",
  "from-rust/15 to-forest/20",
  "from-stone/25 to-ink-light",
  "from-forest/20 to-stone/15",
];

// Generate the winding trail SVG path that photos float along
function buildTrailPath(count: number, sectionHeight: number): string {
  const segmentH = sectionHeight / (count + 1);
  const points: [number, number][] = [];

  for (let i = 0; i <= count + 1; i++) {
    // Meander left/right with sine-ish offsets
    const xOff = Math.sin(i * 1.1) * 120 + Math.cos(i * 0.7) * 60;
    points.push([500 + xOff, i * segmentH]);
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpY = (prev[1] + cur[1]) / 2;
    d += ` C ${prev[0]} ${cpY}, ${cur[0]} ${cpY}, ${cur[0]} ${cur[1]}`;
  }
  return d;
}

export function Gallery() {
  const trailRef = useRef<SVGPathElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Total vertical space: header ~200px + photos * 360px spacing + padding
  const sectionHeight = photos.length * 360 + 200;
  const trailD = buildTrailPath(photos.length, sectionHeight);

  useEffect(() => {
    const trail = trailRef.current;
    const section = sectionRef.current;
    if (!trail || !section) return;

    const length = trail.getTotalLength();
    trail.style.strokeDasharray = `${length}`;
    trail.style.strokeDashoffset = `${length}`;

    const ctx = gsap.context(() => {
      gsap.to(trail, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          end: "bottom 20%",
          scrub: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="gallery" className="bg-ink relative overflow-hidden">
      <div className="pt-24 md:pt-32 pb-8 px-6 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-parchment mb-4 text-center"
        >
          Through the Lens
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-mono text-xs text-parchment/30 text-center"
        >
          Shot on Sony a6400
        </motion.p>
      </div>

      {/* Winding trail + floating photos */}
      <div className="relative max-w-5xl mx-auto" style={{ height: sectionHeight }}>
        {/* SVG trail path */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 1000 ${sectionHeight}`}
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Faint background trail */}
          <path d={trailD} stroke="rgba(240,232,216,0.04)" strokeWidth="40" strokeLinecap="round" />
          {/* Animated drawn trail */}
          <path
            ref={trailRef}
            d={trailD}
            stroke="rgba(240,232,216,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
          />
          {/* Trail dots at photo positions */}
          {photos.map((_, i) => {
            const segmentH = sectionHeight / (photos.length + 1);
            const y = (i + 1) * segmentH;
            const xOff = Math.sin((i + 1) * 1.1) * 120 + Math.cos((i + 1) * 0.7) * 60;
            return (
              <circle
                key={i}
                cx={500 + xOff}
                cy={y}
                r="4"
                fill="rgba(168,92,56,0.4)"
              />
            );
          })}
        </svg>

        {/* Photos floating along the trail */}
        {photos.map((photo, i) => {
          const segmentH = sectionHeight / (photos.length + 1);
          const top = (i + 1) * segmentH;
          const isLandscape = photo.orientation === "landscape";
          // Photo card sizes
          const w = isLandscape ? 320 : 220;
          const h = isLandscape ? 240 : 293;

          return (
            <motion.div
              key={photo.label}
              initial={{ opacity: 0, y: 40, rotate: photo.rotate * 2 }}
              whileInView={{ opacity: 1, y: 0, rotate: photo.rotate }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute"
              style={{
                top: top - h / 2,
                left: `calc(50% + ${photo.x * 300}px - ${w / 2}px)`,
                width: w,
                zIndex: 10 + i,
              }}
            >
              <div
                className={`relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-sm border border-parchment/10 overflow-hidden group shadow-xl shadow-black/20`}
                style={{ height: h }}
              >
                {/* Placeholder content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-parchment/15"
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
                    <span className="font-mono text-xs text-parchment/20">{photo.label}</span>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/50 transition-colors duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
                  <div>
                    <p className="font-mono text-sm text-parchment">{photo.label}</p>
                    <p className="font-mono text-xs text-parchment/50">{photo.category}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pb-24 md:pb-32" />
    </section>
  );
}
