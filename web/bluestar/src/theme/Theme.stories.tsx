import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTheme } from "./ThemeProvider";
import { css } from "goober";

function ThemeShowcase() {
  const { theme } = useTheme();

  const containerClass = css`
    font-family: ${theme.typography.fontFamily};
    color: ${theme.colors.textPrimary};
  `;

  const sectionClass = css`
    margin-bottom: ${theme.spacing["2xl"]};
  `;

  const headingClass = css`
    font-size: ${theme.typography.fontSize["2xl"]};
    font-weight: ${theme.typography.fontWeight.bold};
    margin-bottom: ${theme.spacing.lg};
    color: ${theme.colors.textPrimary};
  `;

  const colorGridClass = css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: ${theme.spacing.md};
    margin-top: ${theme.spacing.md};
  `;

  const colorBoxClass = css`
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    border: 1px solid ${theme.colors.border};
  `;

  const colorSwatchClass = (color: string) => css`
    width: 100%;
    height: 60px;
    background-color: ${color};
    border-radius: ${theme.borderRadius.sm};
    margin-bottom: ${theme.spacing.sm};
    border: 1px solid ${theme.colors.border};
  `;

  const labelClass = css`
    font-size: ${theme.typography.fontSize.sm};
    font-weight: ${theme.typography.fontWeight.semibold};
    margin-bottom: ${theme.spacing.xs};
    color: ${theme.colors.textPrimary};
  `;

  const valueClass = css`
    font-size: ${theme.typography.fontSize.xs};
    font-family: ${theme.typography.fontFamilyMono};
    color: ${theme.colors.textSecondary};
  `;

  const typographyExampleClass = (fontSize: string, weight: number, lineHeight: number) => css`
    font-size: ${fontSize};
    font-weight: ${weight};
    line-height: ${lineHeight};
    margin: ${theme.spacing.sm} 0;
    color: ${theme.colors.textPrimary};
  `;

  const spacingBoxClass = (size: string) => css`
    width: ${size};
    height: ${size};
    background-color: ${theme.colors.primary};
    border-radius: ${theme.borderRadius.sm};
    display: inline-block;
  `;

  const shadowBoxClass = (shadow: string) => css`
    padding: ${theme.spacing.lg};
    background-color: ${theme.colors.surface};
    border-radius: ${theme.borderRadius.md};
    box-shadow: ${shadow};
    text-align: center;
    color: ${theme.colors.textPrimary};
  `;

  return (
    <div className={containerClass}>
      {/* Colors */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Colors</h2>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Primary
        </h3>
        <div className={colorGridClass}>
          {Object.entries({
            primary: theme.colors.primary,
            primaryHover: theme.colors.primaryHover,
            primaryActive: theme.colors.primaryActive,
          }).map(([name, color]) => (
            <div key={name} className={colorBoxClass}>
              <div className={colorSwatchClass(color)} />
              <div className={labelClass}>{name}</div>
              <div className={valueClass}>{color}</div>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Secondary
        </h3>
        <div className={colorGridClass}>
          {Object.entries({
            secondary: theme.colors.secondary,
            secondaryHover: theme.colors.secondaryHover,
          }).map(([name, color]) => (
            <div key={name} className={colorBoxClass}>
              <div className={colorSwatchClass(color)} />
              <div className={labelClass}>{name}</div>
              <div className={valueClass}>{color}</div>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Semantic
        </h3>
        <div className={colorGridClass}>
          {Object.entries({
            success: theme.colors.success,
            warning: theme.colors.warning,
            error: theme.colors.error,
            info: theme.colors.info,
          }).map(([name, color]) => (
            <div key={name} className={colorBoxClass}>
              <div className={colorSwatchClass(color)} />
              <div className={labelClass}>{name}</div>
              <div className={valueClass}>{color}</div>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Neutral
        </h3>
        <div className={colorGridClass}>
          {Object.entries({
            background: theme.colors.background,
            surface: theme.colors.surface,
            surfaceHover: theme.colors.surfaceHover,
            border: theme.colors.border,
          }).map(([name, color]) => (
            <div key={name} className={colorBoxClass}>
              <div className={colorSwatchClass(color)} />
              <div className={labelClass}>{name}</div>
              <div className={valueClass}>{color}</div>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Text
        </h3>
        <div className={colorGridClass}>
          {Object.entries({
            textPrimary: theme.colors.textPrimary,
            textSecondary: theme.colors.textSecondary,
            textDisabled: theme.colors.textDisabled,
            textInverse: theme.colors.textInverse,
          }).map(([name, color]) => (
            <div key={name} className={colorBoxClass}>
              <div className={colorSwatchClass(color)} />
              <div className={labelClass}>{name}</div>
              <div className={valueClass}>{color}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Typography</h2>

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Font Sizes
        </h3>
        {Object.entries(theme.typography.fontSize).map(([name, size]) => (
          <div key={name} style={{ marginBottom: theme.spacing.sm }}>
            <span className={valueClass} style={{ marginRight: theme.spacing.md }}>
              {name}: {size}
            </span>
            <span style={{ fontSize: size }}>The quick brown fox jumps over the lazy dog</span>
          </div>
        ))}

        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.md,
          }}
        >
          Font Weights
        </h3>
        {Object.entries(theme.typography.fontWeight).map(([name, weight]) => (
          <div
            key={name}
            className={typographyExampleClass(
              theme.typography.fontSize.base,
              weight,
              theme.typography.lineHeight.normal
            )}
          >
            {name} ({weight}): The quick brown fox jumps over the lazy dog
          </div>
        ))}
      </section>

      {/* Spacing */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Spacing</h2>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: theme.spacing.lg,
            flexWrap: "wrap",
          }}
        >
          {Object.entries(theme.spacing).map(([name, size]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div className={spacingBoxClass(size)} />
              <div className={valueClass} style={{ marginTop: theme.spacing.xs }}>
                {name}
                <br />
                {size}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Shadows</h2>
        <div className={colorGridClass}>
          {Object.entries(theme.shadows).map(([name, shadow]) => (
            <div key={name} className={shadowBoxClass(shadow)}>
              <div className={labelClass}>{name}</div>
              <div
                className={valueClass}
                style={{ marginTop: theme.spacing.sm, wordBreak: "break-all" }}
              >
                {shadow}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Border Radius */}
      <section className={sectionClass}>
        <h2 className={headingClass}>Border Radius</h2>
        <div className={colorGridClass}>
          {Object.entries(theme.borderRadius).map(([name, radius]) => (
            <div
              key={name}
              style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.primary,
                borderRadius: radius,
                textAlign: "center",
                color: theme.colors.textInverse,
              }}
            >
              <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>{name}</div>
              <div style={{ fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing.xs }}>
                {radius}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "Theme/Theme Tokens",
  component: ThemeShowcase,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllTokens: Story = {
  render: () => <ThemeShowcase />,
};
