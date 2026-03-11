import { motion } from "framer-motion";
import type { WorkEntry } from "../../data/work";
import { Tag } from "./Tag";

interface TimelineEntryProps {
  entry: WorkEntry;
  index: number;
}

export function TimelineEntry({ entry, index }: TimelineEntryProps) {
  const isLeft = index % 2 === 0;

  return (
    <div className="relative flex md:items-center mb-12 last:mb-0">
      {/* Desktop layout - alternating sides */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] w-full gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={isLeft ? "" : "col-start-3"}
          style={{ gridColumn: isLeft ? 1 : 3, gridRow: 1 }}
        >
          <div className="bg-parchment border border-stone/30 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Tag label={entry.company} variant="accent" />
              <span className="font-mono text-xs text-ink/50">{entry.date}</span>
            </div>
            <h3 className="font-display text-lg text-ink mb-3">{entry.role}</h3>
            <ul className="space-y-1.5">
              {entry.points.map((point, i) => (
                <li key={i} className="font-mono text-sm text-ink/60 leading-relaxed pl-3 relative">
                  <span className="absolute left-0 text-rust/60">&mdash;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Center dot */}
        <div
          className="flex items-center justify-center"
          style={{ gridColumn: 2, gridRow: 1 }}
        >
          <div className="w-3 h-3 rounded-full bg-rust border-2 border-parchment ring-2 ring-stone/40" />
        </div>

        {/* Empty space on opposite side */}
        <div style={{ gridColumn: isLeft ? 3 : 1, gridRow: 1 }} />
      </div>

      {/* Mobile layout - single column */}
      <div className="md:hidden flex gap-4 w-full">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-rust border-2 border-parchment ring-2 ring-stone/40 mt-5 shrink-0" />
          <div className="w-px flex-1 bg-stone/40 mt-2" />
        </div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex-1 pb-4"
        >
          <div className="bg-parchment border border-stone/30 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Tag label={entry.company} variant="accent" />
              <span className="font-mono text-xs text-ink/50">{entry.date}</span>
            </div>
            <h3 className="font-display text-lg text-ink mb-2">{entry.role}</h3>
            <ul className="space-y-1.5">
              {entry.points.map((point, i) => (
                <li key={i} className="font-mono text-sm text-ink/60 leading-relaxed pl-3 relative">
                  <span className="absolute left-0 text-rust/60">&mdash;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
