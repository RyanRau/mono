import { motion } from "framer-motion";
import type { Project } from "../../data/projects";
import { Tag } from "./Tag";

const iconMap: Record<string, string> = {
  brain: "\u{1F9E0}",
  newspaper: "\u{1F4F0}",
  camera: "\u{1F4F7}",
  message: "\u{1F4AC}",
  gamepad: "\u{1F3AE}",
  cocktail: "\u{1F378}",
  server: "\u{1F5A5}\uFE0F",
  keyboard: "\u2328\uFE0F",
};

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative bg-parchment border border-stone/30 rounded-sm p-6 hover:border-rust/40 transition-colors duration-300"
    >
      <div className="text-3xl mb-3">{iconMap[project.icon] || "\u{1F4E6}"}</div>
      <h3 className="font-display text-xl text-ink mb-2">{project.title}</h3>
      <p className="font-mono text-sm text-ink/60 mb-4 leading-relaxed">{project.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </div>
      {project.github && (
        <a
          href={project.github}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 right-4 text-ink/30 hover:text-rust transition-colors"
          aria-label={`${project.title} on GitHub`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      )}
    </motion.div>
  );
}
