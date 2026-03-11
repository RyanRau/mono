import { motion } from "framer-motion";
import { lifeCards } from "../../data/life";
import { BentoCard } from "../ui/BentoCard";

export function Life() {
  return (
    <section id="life" className="py-24 md:py-32 bg-parchment">
      <div className="max-w-5xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-display-section text-ink mb-16 text-center"
        >
          Off the <span className="text-rust">Clock</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[160px]">
          {lifeCards.map((card, i) => (
            <BentoCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
