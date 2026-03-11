import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial entrance animations
      gsap.from(nameRef.current, {
        y: 60,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
      });
      gsap.from(subtitleRef.current, {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.4,
        ease: "power3.out",
      });
      gsap.from(scrollIndicatorRef.current, {
        opacity: 0,
        duration: 0.8,
        delay: 1.2,
      });

      // Scroll-triggered pin and scale
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        pin: false,
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          if (nameRef.current) {
            gsap.set(nameRef.current, {
              scale: 1 - progress * 0.3,
              opacity: 1 - progress * 1.5,
              y: progress * -80,
            });
          }
          if (subtitleRef.current) {
            gsap.set(subtitleRef.current, {
              opacity: 1 - progress * 2,
              y: progress * -40,
            });
          }
          if (scrollIndicatorRef.current) {
            gsap.set(scrollIndicatorRef.current, {
              opacity: 1 - progress * 3,
            });
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center bg-forest overflow-hidden topo-bg"
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-forest/80 to-forest" />

      <div className="relative z-10 text-center px-6">
        <h1
          ref={nameRef}
          className="font-display text-display-hero text-parchment tracking-tight"
        >
          RYAN
          <br />
          <span className="text-stone">Z. RAU</span>
        </h1>
        <p
          ref={subtitleRef}
          className="font-mono text-sm md:text-base text-parchment/60 mt-6 tracking-widest uppercase"
        >
          Senior Software Engineer &middot; Builder &middot; Explorer
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-xs text-parchment/30 tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-parchment/30 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
