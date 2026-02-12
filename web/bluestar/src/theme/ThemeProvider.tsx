import * as React from 'react';
import { Theme, defaultTheme } from './theme';

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
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
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  theme = defaultTheme,
}) => {
  const value = React.useMemo(() => ({ theme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
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
  const context = React.useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
