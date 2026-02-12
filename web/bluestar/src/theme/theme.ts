/**
 * Bluestar Theme Definition
 *
 * This theme provides design tokens for colors, typography, spacing, and other
 * design values used throughout the component library.
 */

export interface Theme {
  colors: {
    // Primary colors
    primary: string;
    primaryHover: string;
    primaryActive: string;

    // Secondary colors
    secondary: string;
    secondaryHover: string;

    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Neutral colors
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textInverse: string;
  };

  typography: {
    fontFamily: string;
    fontFamilyMono: string;

    // Font sizes
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
      '6xl': string;
    };

    // Font weights
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };

    // Line heights
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };

  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

export const defaultTheme: Theme = {
  colors: {
    // Primary colors (blue theme)
    primary: '#7da7d9',
    primaryHover: '#6b95c7',
    primaryActive: '#5983b5',

    // Secondary colors
    secondary: '#64748b',
    secondaryHover: '#475569',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Neutral colors
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',

    // Text colors
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textDisabled: '#94a3b8',
    textInverse: '#ffffff',
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',

    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
    },

    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
};
