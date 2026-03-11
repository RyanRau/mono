import { motion } from "framer-motion";
import { workHistory } from "../../data/work";
import { TimelineEntry } from "../ui/TimelineEntry";

export function Work() {
  return (
    <section id="work" className="py-24 md:py-32 bg-parchment">
      <div className="max-w-5xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-ink mb-16 text-center"
        >
          What I <span className="text-rust">Build</span>
        </motion.h2>

        <div className="relative">
          {/* Vertical connector line - desktop */}
          <div className="hidden md:block timeline-line" />

          {workHistory.map((entry, i) => (
            <TimelineEntry key={`${entry.company}-${entry.role}`} entry={entry} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
