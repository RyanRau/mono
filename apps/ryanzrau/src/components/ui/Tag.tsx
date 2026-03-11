interface TagProps {
  label: string;
  variant?: "default" | "accent";
}

export function Tag({ label, variant = "default" }: TagProps) {
  const base = "inline-block px-2.5 py-0.5 text-xs font-mono rounded-sm";
  const styles = {
    default: "bg-stone/20 text-ink/70",
    accent: "bg-rust/15 text-rust",
  };

  return <span className={`${base} ${styles[variant]}`}>{label}</span>;
}
