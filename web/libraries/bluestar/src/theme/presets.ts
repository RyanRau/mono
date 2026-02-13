import { Theme, defaultTheme } from "./theme";

/**
 * Dark theme preset
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    // Primary colors - brighter for dark mode
    primary: "#90c5f5",
    primaryHover: "#a5d2f7",
    primaryActive: "#7db8e8",

    // Secondary colors
    secondary: "#94a3b8",
    secondaryHover: "#cbd5e1",

    // Semantic colors
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    info: "#60a5fa",

    // Neutral colors - inverted
    background: "#0f172a",
    surface: "#1e293b",
    surfaceHover: "#334155",
    border: "#475569",

    // Text colors - inverted
    textPrimary: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textDisabled: "#64748b",
    textInverse: "#0f172a",
  },
};

/**
 * Purple theme preset
 */
export const purpleTheme: Theme = {
  ...defaultTheme,
  colors: {
    // Primary colors - purple palette
    primary: "#a78bfa",
    primaryHover: "#8b5cf6",
    primaryActive: "#7c3aed",

    // Secondary colors
    secondary: "#64748b",
    secondaryHover: "#475569",

    // Semantic colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // Neutral colors
    background: "#ffffff",
    surface: "#faf5ff",
    surfaceHover: "#f3e8ff",
    border: "#e9d5ff",

    // Text colors
    textPrimary: "#1e293b",
    textSecondary: "#64748b",
    textDisabled: "#94a3b8",
    textInverse: "#ffffff",
  },
};

/**
 * Green theme preset
 */
export const greenTheme: Theme = {
  ...defaultTheme,
  colors: {
    // Primary colors - green palette
    primary: "#34d399",
    primaryHover: "#10b981",
    primaryActive: "#059669",

    // Secondary colors
    secondary: "#64748b",
    secondaryHover: "#475569",

    // Semantic colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // Neutral colors
    background: "#ffffff",
    surface: "#f0fdf4",
    surfaceHover: "#dcfce7",
    border: "#bbf7d0",

    // Text colors
    textPrimary: "#1e293b",
    textSecondary: "#64748b",
    textDisabled: "#94a3b8",
    textInverse: "#ffffff",
  },
};

/**
 * Warm theme preset
 */
export const warmTheme: Theme = {
  ...defaultTheme,
  colors: {
    // Primary colors - warm orange palette
    primary: "#fb923c",
    primaryHover: "#f97316",
    primaryActive: "#ea580c",

    // Secondary colors
    secondary: "#78716c",
    secondaryHover: "#57534e",

    // Semantic colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // Neutral colors
    background: "#ffffff",
    surface: "#fff7ed",
    surfaceHover: "#ffedd5",
    border: "#fed7aa",

    // Text colors
    textPrimary: "#1c1917",
    textSecondary: "#78716c",
    textDisabled: "#a8a29e",
    textInverse: "#ffffff",
  },
};

export const themePresets = {
  default: defaultTheme,
  dark: darkTheme,
  purple: purpleTheme,
  green: greenTheme,
  warm: warmTheme,
} as const;

export type ThemePresetName = keyof typeof themePresets;
