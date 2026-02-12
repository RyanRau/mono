# Bluestar Component Library

A modern React component library with comprehensive theming support using goober for CSS-in-JS.

## 🎨 Features

- **Theme System**: Comprehensive design tokens for colors, typography, spacing, shadows, and more
- **ThemeProvider**: React context for easy theme access across your application
- **Type-Safe**: Full TypeScript support with exported types
- **Goober CSS-in-JS**: Lightweight and performant styling
- **Storybook Documentation**: Interactive component showcase and documentation

## 📦 Components

### Layout

- **Flexbox**: Flexible layout container with configurable direction, gap, alignment

### Typography

- **Text**: Body text with variants (body, bodyLarge, bodySmall, caption, overline)
- **Header**: Semantic headings (H1-H6) with theme-based sizing
- **H1, H2, H3, H4, H5, H6**: Convenience components for each heading level

### Interactive

- **Button**: Primary and secondary variants with hover/active/disabled states

### Containers

- **Card**: Content container with configurable padding, elevation, and hover effects

## 🚀 Installation

```bash
npm install bluestar
```

Peer dependencies:

- react >= 18.0.0
- react-dom >= 18.0.0
- goober >= 2.1.18

## 💻 Usage

### Basic Setup

Wrap your application with the `ThemeProvider`:

```tsx
import { ThemeProvider, defaultTheme } from "bluestar";

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using Components

```tsx
import { Button, Card, H2, Text } from "bluestar";

function MyComponent() {
  return (
    <Card padding="lg" elevation="md">
      <H2>Welcome to Bluestar</H2>
      <Text variant="body">This is a modern component library with comprehensive theming.</Text>
      <Button label="Get Started" variant="primary" onClick={() => console.log("clicked")} />
    </Card>
  );
}
```

### Accessing the Theme

Use the `useTheme` hook to access theme values in your components:

```tsx
import { useTheme } from "bluestar";
import { css } from "goober";

function CustomComponent() {
  const { theme } = useTheme();

  const customClass = css`
    background: ${theme.colors.primary};
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
  `;

  return <div className={customClass}>Custom styled component</div>;
}
```

### Custom Theme

Create and provide a custom theme:

```tsx
import { ThemeProvider, defaultTheme, Theme } from "bluestar";

const customTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: "#ff6b6b",
    primaryHover: "#ee5a52",
    primaryActive: "#dc4c3f",
  },
};

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

## 🎭 Storybook

View the interactive component documentation:

**Production**: [ui.ryanzrau.dev](https://ui.ryanzrau.dev)

**Local Development**:

```bash
npm run storybook
```

Opens Storybook at http://localhost:6006

## 🏗️ Development

### Build the Library

```bash
npm run build
```

Outputs ESM and CommonJS bundles to `dist/` with TypeScript declarations.

### Build Storybook

```bash
npm run build-storybook
```

Outputs static Storybook site to `storybook-static/`

## 🧪 Test Deployment

This project is set up for test deployments on feature branches:

1. The `test-deploy.yml` file is already configured for bluestar
2. Push your branch to GitHub
3. Go to **Actions > Test Deploy > Run workflow**
4. Select your branch and run the workflow
5. Access your test deployment at: `test-ui.ryanzrau.dev`

This allows you to preview your changes in a production-like environment before merging to main.

## 📖 Theme Tokens

### Colors

- Primary colors: `primary`, `primaryHover`, `primaryActive`
- Secondary colors: `secondary`, `secondaryHover`
- Semantic: `success`, `warning`, `error`, `info`
- Neutral: `background`, `surface`, `surfaceHover`, `border`
- Text: `textPrimary`, `textSecondary`, `textDisabled`, `textInverse`

### Typography

- Font sizes: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`
- Font weights: `light`, `normal`, `medium`, `semibold`, `bold`
- Line heights: `tight`, `normal`, `relaxed`

### Spacing

`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`

### Border Radius

`none`, `sm`, `md`, `lg`, `full`

### Shadows

`sm`, `md`, `lg`, `xl`

### Transitions

`fast`, `normal`, `slow`

## 📝 License

MIT
