# Bluestar Component Library — AI Instructions

## Non-Negotiable Rules

1. **Every new component must have a Storybook story file** (`ComponentName.stories.tsx`) in the same directory.
2. **Always build on existing primitives** — do not reach for raw `div`/`span`/`p` when a bluestar component already does the job.
3. **When adding a new `textType` variant to `theme.ts`**, you must also add it to the `ThemeProvider` merge block in `ThemeContext.tsx` or it will be `undefined` at runtime for any app that uses `ThemeProvider`.

---

## Existing Primitives — Use These First

Before writing any markup, check whether an existing component covers the need:

| Need | Use |
|------|-----|
| Flex layout container | `Flexbox` |
| Body / label / caption text | `Text` (variants: `caption`, `body`, `subtitle`, `display`, `label`, `navItem`) |
| Section heading | `Header` (variants: `h1`, `h2`, `h3`) |
| Surface container | `Card` |
| Horizontal rule | `Divider` |
| Spinner / loading state | `Spinner` |
| Clickable action | `Button` / `AsyncButton` |
| Full-page shell | `AppShell` |
| Centered max-width wrapper | `PageContainer` |
| Top navigation bar | `NavBar` |
| Sidebar navigation | `SideNav` |

### Key rules

- **Layout `div`s that use `display: flex` must use `Flexbox` instead.** Only use a raw `div` when the element carries non-flex styles (e.g. `position: relative`, `overflow: hidden`, `border-bottom`) that would require goober alongside it anyway.
- **All visible text must use `Text` or `Header`.** Never render a bare string inside a styled element.
- **Never hardcode colors, fonts, radius, or shadow.** Always pull from `useTheme()`.

---

## File & Folder Conventions

```
src/components/<category>/<ComponentName>/
├── ComponentName.tsx          # Component + exported Props type
├── ComponentName.stories.tsx  # Storybook stories (required)
└── index.ts                   # Re-exports component and types
```

Categories: `buttons`, `feedback`, `form`, `layout`, `nav`, `text`

After creating the files, add the export to `src/index.ts`:
```ts
export * from "./components/<category>/<ComponentName>";
```

---

## Styling Pattern

```tsx
import { css } from "goober";
import { useTheme } from "../../../theme";

export default function MyComponent() {
  const theme = useTheme();

  return (
    <div
      className={css`
        background-color: ${theme.colors.surface};
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius};
        box-shadow: ${theme.shadow};
      `}
    >
      ...
    </div>
  );
}
```

- Use `css` tagged template literals from `goober` — never inline `style=` for theme values.
- Use inline `style=` only for dynamic values that change per-render (e.g. computed widths, depths).
- Pseudo-selectors (`&:hover`, `&:disabled`) work inside `css` template literals.

---

## Props Type Pattern

```tsx
export type MyComponentProps = {
  /** JSDoc comment describing the prop. */
  label: string;
  /** Optional description. Defaults to `"primary"`. */
  variant?: "primary" | "secondary";
};

export default function MyComponent({ label, variant = "primary" }: MyComponentProps) { ... }
```

- Export the props type from both the component file and `index.ts`.
- Use JSDoc on every prop.
- Provide sensible defaults in the destructure signature.

---

## Story File Pattern

Every story file must:
- Include a `component` description in `meta.parameters.docs.description.component`
- Include at least a `Default` story
- Cover the main prop variants (active states, sizes, sub-items, etc.)
- Include a `parameters.docs.description.story` string on each story

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import MyComponent from "./MyComponent";

const meta = {
  title: "Category/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "One sentence describing what this component does.",
      },
    },
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Hello" },
  parameters: {
    docs: { description: { story: "Default usage." } },
  },
};
```

For components that need a layout wrapper (e.g. fixed height, background), use `decorators`:
```tsx
decorators: [
  (Story) => (
    <div style={{ height: "400px" }}>
      <Story />
    </div>
  ),
],
```

---

## Theme Reference

```ts
theme.colors.primary / primaryHover
theme.colors.secondary / secondaryButton / secondaryButtonHover
theme.colors.background / surface
theme.colors.text / textMuted
theme.colors.border
theme.colors.error / errorHover
theme.colors.success / successHover
theme.colors.warning
theme.colors.light / dark

theme.fonts.body / heading / mono
theme.radius       // border-radius string
theme.shadow       // box-shadow string

theme.textTypes.caption   // 10px, muted
theme.textTypes.body      // 12px
theme.textTypes.subtitle  // 14px
theme.textTypes.label     // 14px
theme.textTypes.navItem   // 13px
theme.textTypes.display   // 18px, bold

theme.headings.h1  // 28px, 800
theme.headings.h2  // 20px, 700
theme.headings.h3  // 16px, 700
```

`Spacing` type (used for padding/gap props): `4 | 8 | 12 | 16 | 20 | 24 | 32`
