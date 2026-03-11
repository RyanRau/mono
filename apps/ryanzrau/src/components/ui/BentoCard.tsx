import { motion } from "framer-motion";
import type { LifeCard } from "../../data/life";

const iconMap: Record<string, string> = {
  run: "\u{1F3C3}",
  motorcycle: "\u{1F3CD}\uFE0F",
  palette: "\u{1FA9F}",
  hammer: "\u{1FA9A}",
  controller: "\u{1F3AE}",
  dog: "\u{1F436}",
};

const sizeClasses: Record<string, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-1 row-span-1 md:col-span-1 md:row-span-2",
  large: "col-span-1 md:col-span-2 row-span-1",
};

const colorMap: Record<string, string> = {
  run: "from-rust/10 to-rust/5",
  motorcycle: "from-forest/10 to-forest/5",
  palette: "from-rust/15 to-stone/10",
  hammer: "from-stone/20 to-stone/10",
  controller: "from-forest/10 to-ink/5",
  dog: "from-stone/15 to-parchment",
};

interface BentoCardProps {
  card: LifeCard;
  index: number;
}

export function BentoCard({ card, index }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.08 }}
      className={`${sizeClasses[card.size]} bg-gradient-to-br ${colorMap[card.emoji]} border border-stone/20 rounded-sm p-6 flex flex-col justify-between min-h-[160px]`}
    >
      <span className="text-4xl">{iconMap[card.emoji] || "\u2728"}</span>
      <div>
        <h3 className="font-display text-xl text-ink mb-1">{card.title}</h3>
        <p className="font-mono text-sm text-ink/50 leading-relaxed">{card.subtitle}</p>
      </div>
    </motion.div>
  );
}
