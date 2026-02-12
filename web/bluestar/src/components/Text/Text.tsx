import * as React from 'react';
import { css } from 'goober';
import { useTheme } from '../../theme';

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Text content */
  children: React.ReactNode;
  /** Text variant */
  variant?: 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'overline';
  /** Text color */
  color?: 'primary' | 'secondary' | 'disabled' | 'inverse';
  /** Font weight */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Render as a different element */
  as?: 'span' | 'p' | 'div';
}

/**
 * Text component for body text with theme-aware styling.
 *
 * @example
 * ```tsx
 * <Text>Default body text</Text>
 * <Text variant="bodyLarge" weight="semibold">Large semibold text</Text>
 * <Text variant="caption" color="secondary">Caption text</Text>
 * ```
 */
export default function Text({
  children,
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  as: Component = 'span',
  className,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  const textColor = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    disabled: theme.colors.textDisabled,
    inverse: theme.colors.textInverse,
  }[color];

  const variantStyles = {
    body: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.normal,
    },
    bodyLarge: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.lineHeight.normal,
    },
    bodySmall: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.normal,
    },
    caption: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.tight,
    },
    overline: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.tight,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
    },
  }[variant];

  const textClass = css`
    font-family: ${theme.typography.fontFamily};
    color: ${textColor};
    font-size: ${variantStyles.fontSize};
    line-height: ${variantStyles.lineHeight};
    font-weight: ${theme.typography.fontWeight[weight]};
    text-align: ${align};
    margin: 0;
    ${variantStyles.textTransform ? `text-transform: ${variantStyles.textTransform};` : ''}
    ${variantStyles.letterSpacing ? `letter-spacing: ${variantStyles.letterSpacing};` : ''}
  `;

  return (
    <Component className={`${textClass} ${className || ''}`} {...props}>
      {children}
    </Component>
  );
}
