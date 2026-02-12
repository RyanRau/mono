# Bluestar

A lightweight React component library built with [goober](https://github.com/cristianbote/goober) for CSS-in-JS styling and a flexible theming system.

**Live Storybook:** [ui.ryanzrau.dev](https://ui.ryanzrau.dev)

## Features

- 🎨 **Flexible Theming System** - Comprehensive theme tokens with multiple presets (default, dark, purple, green, warm)
- 🪶 **Lightweight** - Built on goober (<1kb) for minimal bundle impact
- 🎯 **Type-Safe** - Full TypeScript support with exported types
- 📦 **Tree-Shakeable** - Only bundle what you use
- 🔌 **Framework-Agnostic Styling** - goober works with React, Preact, and more

## Installation

```bash
npm install bluestar goober react
```

**Note:** `goober` and `react` are peer dependencies

## Quick Start

```tsx
import { ThemeProvider, Button, Card, defaultTheme } from "bluestar";

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <Card>
        <Button variant="primary">Click me</Button>
      </Card>
    </ThemeProvider>
  );
}
```

## Theming

### Using Theme Presets

Bluestar includes 5 built-in theme presets:

```tsx
import {
  ThemeProvider,
  defaultTheme, // Blue theme
  darkTheme, // Dark mode
  purpleTheme, // Purple accent
  greenTheme, // Green/nature
  warmTheme, // Orange/warm
} from "bluestar";

function App() {
  return <ThemeProvider theme={darkTheme}>{/* Your app */}</ThemeProvider>;
}
```

### Custom Themes

Create your own theme by extending or overriding the default:

```tsx
import { ThemeProvider, defaultTheme, type Theme } from "bluestar";

const customTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: "#ff6b6b",
    primaryHover: "#ff5252",
    primaryActive: "#ff3838",
  },
};

function App() {
  return <ThemeProvider theme={customTheme}>{/* Your app */}</ThemeProvider>;
}
```

### Using Theme in Components

Access theme values in your own components using the `useTheme` hook:

```tsx
import { useTheme } from "bluestar";
import { css } from "goober";

function MyComponent() {
  const { theme } = useTheme();

  const styles = css`
    color: ${theme.colors.primary};
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.typography.fontSize.base};
  `;

  return <div className={styles}>Themed content</div>;
}
```

## Theme Structure

```typescript
interface Theme {
  colors: {
    // Primary
    primary: string;
    primaryHover: string;
    primaryActive: string;

    // Secondary
    secondary: string;
    secondaryHover: string;

    // Semantic
    success: string;
    warning: string;
    error: string;
    info: string;

    // Neutral
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textInverse: string;
  };

  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSize: { xs: string; sm: string; base: string; lg: string; xl: string; "2xl": string };
    fontWeight: { normal: number; medium: number; semibold: number; bold: number };
    lineHeight: { tight: number; normal: number; relaxed: number };
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };

  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
}
```

## Components

### Button

```tsx
import { Button } from "bluestar";

<Button variant="primary" size="md">
  Click me
</Button>;
```

**Props:**

- `variant`: `'primary' | 'secondary' | 'outline' | 'ghost'`
- `size`: `'sm' | 'md' | 'lg'`
- Standard button HTML attributes

### Card

```tsx
import { Card } from "bluestar";

<Card>Card content goes here</Card>;
```

**Props:**

- `children`: React.ReactNode
- `className`: string (optional)
- Standard div HTML attributes

### Header

```tsx
import { Header } from 'bluestar';

<Header level={1}>Page Title</Header>
<Header level={2}>Section Title</Header>
```

**Props:**

- `level`: `1 | 2 | 3 | 4 | 5 | 6`
- `children`: React.ReactNode
- `className`: string (optional)

### Text

```tsx
import { Text } from 'bluestar';

<Text variant="body">Regular text</Text>
<Text variant="caption" color="secondary">Small secondary text</Text>
```

**Props:**

- `variant`: `'body' | 'caption' | 'small'`
- `color`: `'primary' | 'secondary' | 'disabled'`
- `className`: string (optional)

### Flexbox

```tsx
import { Flexbox } from "bluestar";

<Flexbox direction="row" gap="md" justify="center" align="center">
  <div>Item 1</div>
  <div>Item 2</div>
</Flexbox>;
```

**Props:**

- `direction`: `'row' | 'column'`
- `gap`: Theme spacing key
- `justify`: CSS justify-content value
- `align`: CSS align-items value
- `wrap`: CSS flex-wrap value
- Standard div HTML attributes

## Development

```bash
# Install dependencies
npm install

# Run Storybook
npm run storybook

# Build library
npm run build

# Build Storybook for deployment
npm run build-storybook
```

## Tech Stack

- **React 19** - Component framework
- **goober** - Lightweight CSS-in-JS (<1kb)
- **TypeScript** - Type safety
- **Storybook** - Component documentation and development
- **tsup** - Fast TypeScript bundler

## License

ISC
