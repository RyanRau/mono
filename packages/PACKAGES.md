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

### Exports

```ts
import { Button, Flexbox } from "bluestar";
```

#### `Button`

A styled clickable button.

```tsx
<Button label="Click me" onClick={() => {}} />
```

| Prop | Type | Required |
|------|------|----------|
| `label` | `string` | yes |
| `onClick` | `() => void` | yes |

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

### Development

```bash
cd packages/bluestar
npm install
npm run storybook        # Live component dev on http://localhost:6006
npm run build            # Compile to dist/ (required before consuming app can use it)
npm run build-storybook  # Build static Storybook site (deployed to ui.ryanzrau.dev)
```

After making changes to the library, run `npm run build` in `packages/bluestar` before running the consuming app, or rely on `prepare` which runs automatically on `npm install`.
