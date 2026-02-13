import { createContext, useContext, useMemo, ReactNode, FC } from "react";
import { Theme, defaultTheme } from "./theme";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme;
}

/**
 * ThemeProvider component that provides theme context to all child components.
 *
 * @example
 * ```tsx
 * import { ThemeProvider, defaultTheme } from 'bluestar';
 *
 * function App() {
 *   return (
 *     <ThemeProvider theme={defaultTheme}>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export const ThemeProvider: FC<ThemeProviderProps> = ({ children, theme = defaultTheme }) => {
  const value = useMemo(() => ({ theme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access the current theme from the ThemeProvider.
 *
 * @throws {Error} If used outside of a ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme } = useTheme();
 *   return <div style={{ color: theme.colors.primary }}>Hello</div>;
 * }
 * ```
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
