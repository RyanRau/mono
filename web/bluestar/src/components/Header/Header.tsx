import * as React from "react";
import { css } from "goober";
import { useTheme } from "../../theme";

export interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading content */
  children: React.ReactNode;
  /** Heading level (h1-h6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Text color */
  color?: "primary" | "secondary" | "disabled" | "inverse";
  /** Font weight */
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Margin bottom spacing */
  marginBottom?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Header component for headings (h1-h6) with theme-aware styling.
 *
 * @example
 * ```tsx
 * <Header level={1}>Main Page Title</Header>
 * <Header level={2} color="secondary">Section Title</Header>
 * <Header level={3} weight="semibold">Subsection</Header>
 * ```
 */
export default function Header({
  children,
  level,
  color = "primary",
  weight = "bold",
  align = "left",
  marginBottom = "md",
  className,
  ...props
}: HeaderProps) {
  const { theme } = useTheme();

  const textColor = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    disabled: theme.colors.textDisabled,
    inverse: theme.colors.textInverse,
  }[color];

  const levelStyles = {
    1: {
      fontSize: theme.typography.fontSize["5xl"],
      lineHeight: theme.typography.lineHeight.tight,
      defaultWeight: "bold" as const,
    },
    2: {
      fontSize: theme.typography.fontSize["4xl"],
      lineHeight: theme.typography.lineHeight.tight,
      defaultWeight: "bold" as const,
    },
    3: {
      fontSize: theme.typography.fontSize["3xl"],
      lineHeight: theme.typography.lineHeight.tight,
      defaultWeight: "semibold" as const,
    },
    4: {
      fontSize: theme.typography.fontSize["2xl"],
      lineHeight: theme.typography.lineHeight.normal,
      defaultWeight: "semibold" as const,
    },
    5: {
      fontSize: theme.typography.fontSize.xl,
      lineHeight: theme.typography.lineHeight.normal,
      defaultWeight: "medium" as const,
    },
    6: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.lineHeight.normal,
      defaultWeight: "medium" as const,
    },
  }[level];

  const marginBottomValue = marginBottom === "none" ? "0" : theme.spacing[marginBottom];

  const headerClass = css`
    font-family: ${theme.typography.fontFamily};
    color: ${textColor};
    font-size: ${levelStyles.fontSize};
    line-height: ${levelStyles.lineHeight};
    font-weight: ${theme.typography.fontWeight[weight]};
    text-align: ${align};
    margin: 0 0 ${marginBottomValue} 0;
  `;

  const Element = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return React.createElement(
    Element,
    { className: `${headerClass} ${className || ""}`, ...props },
    children
  );
}

// Convenience components for each heading level
export const H1: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={1} {...props} />;
export const H2: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={2} {...props} />;
export const H3: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={3} {...props} />;
export const H4: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={4} {...props} />;
export const H5: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={5} {...props} />;
export const H6: React.FC<Omit<HeaderProps, "level">> = (props) => <Header level={6} {...props} />;
