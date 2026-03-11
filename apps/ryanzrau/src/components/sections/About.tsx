import { motion } from "framer-motion";

const facts = [
  { icon: "\u{1F4CD}", text: "Fayetteville, AR" },
  { icon: "\u{1F436}", text: "Golden Retriever" },
  { icon: "\u{1F3CD}\uFE0F", text: "KLR 650" },
  { icon: "\u{1F3C3}", text: "Marathon Runner" },
  { icon: "\u{1F4F7}", text: "Sony a6400" },
];

const photoPlaceholders = [
  "Ozark Trail",
  "Workshop",
  "Motorcycle",
  "Stained Glass",
  "Trail Run",
  "Golden Hour",
];

export function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-parchment">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Portrait placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="aspect-[3/4] bg-gradient-to-br from-stone/30 to-forest/10 rounded-sm border border-stone/30 flex items-center justify-center"
          >
            <span className="font-mono text-sm text-ink/30">portrait</span>
          </motion.div>

          {/* Bio */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <h2 className="font-display text-display-section text-ink mb-6">
              The Human Behind
              <br />
              <span className="text-rust">the Code</span>
            </h2>
            <p className="font-mono text-sm text-ink/70 leading-relaxed mb-6">
              I&apos;m a senior software engineer based in Northwest Arkansas who
              believes the best software comes from people who build things outside
              of screens too. I split my time between architecting systems at scale
              and working with my hands &mdash; whether that&apos;s soldering stained
              glass, turning wood on a lathe, or wrenching on a dual-sport motorcycle.
              I&apos;m driven by craft, curiosity, and the quiet satisfaction of making
              something work.
            </p>

            {/* Quick facts */}
            <div className="flex flex-wrap gap-3">
              {facts.map((fact) => (
                <span
                  key={fact.text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone/15 rounded-sm font-mono text-xs text-ink/60"
                >
                  <span>{fact.icon}</span>
                  {fact.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Horizontal photo strip */}
        <div className="mt-16 -mx-6 overflow-hidden">
          <div className="flex gap-4 px-6 no-scrollbar overflow-x-auto">
            {photoPlaceholders.map((label) => (
              <div
                key={label}
                className="flex-shrink-0 w-64 h-40 bg-gradient-to-br from-stone/20 to-forest/10 rounded-sm border border-stone/20 flex items-center justify-center"
              >
                <span className="font-mono text-xs text-ink/25">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
