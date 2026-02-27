export const colors = {
  bg: "#111827",
  surface: "#1f2937",
  surface2: "#374151",
  border: "#4b5563",
  text: "#f9fafb",
  textMuted: "#9ca3af",
  textFaint: "#6b7280",
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  danger: "#ef4444",
  dangerHover: "#dc2626",
  success: "#10b981",
  warning: "#f59e0b",
  scriptColor: "#8b5cf6",
  httpColor: "#f59e0b",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: colors.surface2,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  color: colors.text,
  padding: "6px 8px",
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  fontFamily: "monospace",
  minHeight: 64,
};

export const btnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  textAlign: "left",
  transition: "background 0.15s",
};

export const dangerBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: colors.danger,
  color: colors.text,
};

export const DARK_THEME = {
  colors: {
    primary: colors.primary,
    primaryHover: colors.primaryHover,
    secondary: colors.surface,
    background: colors.bg,
    surface: colors.surface,
    text: colors.text,
    textMuted: colors.textMuted,
    border: colors.border,
    error: colors.danger,
    success: colors.success,
    warning: colors.warning,
  },
};
