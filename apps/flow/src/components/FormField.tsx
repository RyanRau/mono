import type { ReactNode } from "react";
import { colors } from "../styles";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.textMuted,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          style={{ fontSize: 11, color: colors.textFaint, marginTop: 3 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
