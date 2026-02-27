# Local Packages

All packages live in `packages/` and are consumed by apps via `file:` references in `package.json`.

> **Keep this file up to date** whenever a package's exports, API, or purpose changes.

---

## `bluestar` — React Component Library

**Location:** `packages/bluestar/`
**Reference in app:** `"bluestar": "file:../../packages/bluestar"`
**Styling engine:** [goober](https://github.com/cristianbote/goober) (CSS-in-JS, peer dependency — must be installed by the consuming app)

### Setup

The library calls `setup(React.createElement)` internally on import, so no additional configuration is needed in the consuming app.

Wrap your app in `ThemeProvider` to apply a custom theme. Without it, all components use the default theme automatically.

```tsx
import { ThemeProvider } from "bluestar";

<ThemeProvider theme={{ colors: { primary: "#ff6b6b" } }}>
  <App />
</ThemeProvider>
```

### Exports

```ts
import {
  ThemeProvider, useTheme, defaultTheme,
  Button, AsyncButton, Spinner,
  Header, Text, Card,
  Flexbox,
  NavBar, SideNav,
} from "bluestar";
```

---

#### `ThemeProvider`

Provides theme values to all bluestar components. All fields are optional — unspecified fields fall back to `defaultTheme`.

```tsx
<ThemeProvider theme={{ colors: { primary: "#ff6b6b" }, radius: { md: "8px" } }}>
  {children}
</ThemeProvider>
```

| Prop | Type | Default |
|------|------|---------|
| `theme` | `DeepPartial<Theme>` | `defaultTheme` |
| `children` | `React.ReactNode` | — |

#### `useTheme`

Hook to access the current theme inside custom components.

```tsx
const theme = useTheme();
```

#### `Theme` type / `defaultTheme`

```ts
type Theme = {
  colors: {
    primary, primaryHover, secondary,
    background, surface,
    text, textMuted, border,
    error, success, warning
  };
  fonts: { body, heading, mono };
  fontSizes: { xs, sm, md, lg, xl, "2xl", "3xl", "4xl" };
  radius: { none, sm, md, lg, full };
  spacing: { xs, sm, md, lg, xl, "2xl" };
  shadows: { none, sm, md, lg };
};
```

---

#### `Button`

A styled clickable button.

```tsx
<Button label="Click me" onClick={() => {}} />
```

| Prop | Type | Required |
|------|------|----------|
| `label` | `string` | yes |
| `onClick` | `() => void` | yes |

---

#### `AsyncButton`

Button that accepts an async `onClick`. Shows a spinner and disables itself while the promise is pending.

```tsx
<AsyncButton label="Submit" onClick={async () => { await submitForm(); }} />
```

| Prop | Type | Required |
|------|------|----------|
| `label` | `string` | yes |
| `onClick` | `() => Promise<void>` | yes |

---

#### `Spinner`

A circular loading indicator.

```tsx
<Spinner />
<Spinner size={32} color="#e53e3e" />
```

| Prop | Type | Default |
|------|------|---------|
| `size` | `number` | `20` |
| `color` | `string` | `theme.colors.primary` |

---

#### `Header`

Heading text with h1–h6 variants.

```tsx
<Header variant="h2">Section Title</Header>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `variant` | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6"` | `"h1"` |

---

#### `Text`

Body text with style variants.

```tsx
<Text bold italic muted size="sm">Small muted bold italic</Text>
<Text as="span">Inline text</Text>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `bold` | `boolean` | `false` |
| `italic` | `boolean` | `false` |
| `muted` | `boolean` | `false` |
| `size` | `keyof Theme["fontSizes"]` | `"md"` |
| `as` | `"p" \| "span" \| "label"` | `"p"` |

---

#### `Card`

A surface container with border, background, and shadow.

```tsx
<Card padding="xl" shadow="lg">
  <Header variant="h4">Title</Header>
  <Text muted>Description</Text>
</Card>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `padding` | `keyof Theme["spacing"]` | `"lg"` |
| `shadow` | `keyof Theme["shadows"]` | `"md"` |

---

#### `Flexbox`

A layout wrapper that maps props directly to CSS flexbox properties.

```tsx
<Flexbox direction="row" gap={16} alignItems="center" justifyContent="space-between">
  {children}
</Flexbox>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `direction` | `"row" \| "column"` | `"row"` |
| `gap` | `8 \| 12 \| 16 \| 20 \| 24` | — |
| `grow` | `number` | — |
| `shrink` | `number` | — |
| `flexWrap` | `"wrap" \| "nowrap"` | — |
| `justifyContent` | `"flex-start" \| "flex-end" \| "center" \| "space-between" \| "space-around" \| "space-evenly"` | — |
| `alignContent` | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "space-between" \| "space-around"` | — |
| `alignItems` | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "baseline"` | — |
| `width` | `number \| string` | — |
| `height` | `number \| string` | — |
| `style` | `object` | — |

---

#### `AppShell`

Full-page layout shell that fills `100vh`. Composes a sticky top nav, an optional sidebar, and a scrollable `<main>` content area.

```tsx
<AppShell
  topNav={<NavBar brand="MyApp" items={items} />}
  sideNav={<SideNav items={sideItems} />}
>
  <PageContainer>
    {/* page content */}
  </PageContainer>
</AppShell>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `topNav` | `React.ReactNode` | — |
| `sideNav` | `React.ReactNode` | — |

---

#### `PageContainer`

A centered, max-width constrained content wrapper. Use inside `AppShell` or any scrollable area.

```tsx
<PageContainer maxWidth={800} padding={32}>
  {/* page content */}
</PageContainer>
```

| Prop | Type | Default |
|------|------|---------|
| `children` | `React.ReactNode` | — |
| `maxWidth` | `number \| "full"` | `1200` |
| `padding` | `Spacing` | `24` |

---

#### `NavBar`

A horizontal top navigation bar with optional brand, items, and trailing content. Items with `children` render as a click-triggered dropdown.

```tsx
<NavBar
  brand={<strong>MyApp</strong>}
  items={[
    { label: "Home", href: "/", isActive: true },
    { label: "Products", children: [
      { label: "Overview", href: "/products" },
      { label: "Pricing", href: "/pricing" },
    ]},
  ]}
  trailing={<Button label="Sign in" />}
/>
```

| Prop | Type | Default |
|------|------|---------|
| `items` | `NavItem[]` | — |
| `brand` | `React.ReactNode` | — |
| `trailing` | `React.ReactNode` | — |

---

#### `SideNav`

A vertical sidebar navigation with optional brand at the top. Items with `children` expand/collapse inline with indentation.

```tsx
<SideNav
  brand={<strong>MyApp</strong>}
  width={260}
  items={[
    { label: "Dashboard", href: "/", isActive: true },
    { label: "Settings", children: [
      { label: "Profile", href: "/settings/profile" },
      { label: "Security", href: "/settings/security" },
    ]},
  ]}
/>
```

| Prop | Type | Default |
|------|------|---------|
| `items` | `NavItem[]` | — |
| `brand` | `React.ReactNode` | — |
| `width` | `number` | `240` |

---

#### `NavItem` type

```ts
type NavItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  children?: NavItem[];
};
```

---

### Development

```bash
cd packages/bluestar
npm install
npm run storybook        # Live component dev on http://localhost:6006
npm run build            # Compile to dist/ (required before consuming app can use it)
npm run build-storybook  # Build static Storybook site (deployed to ui.ryanzrau.dev)
```

After making changes to the library, run `npm run build` in `packages/bluestar` before running the consuming app, or rely on `prepare` which runs automatically on `npm install`.
