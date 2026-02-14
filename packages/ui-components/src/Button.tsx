import type { ButtonHTMLAttributes, CSSProperties } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  variant = "primary",
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyles: CSSProperties = {
    padding: "8px 16px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    ...style,
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      backgroundColor: "#0070f3",
      color: "#fff",
    },
    secondary: {
      backgroundColor: "#eaeaea",
      color: "#333",
    },
  };

  return (
    <button style={{ ...baseStyles, ...variantStyles[variant] }} {...props}>
      {children}
    </button>
  );
}
