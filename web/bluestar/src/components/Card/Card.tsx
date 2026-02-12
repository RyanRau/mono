import * as React from 'react';
import { css } from 'goober';
import { useTheme } from '../../theme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: React.ReactNode;
  /** Card padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Card elevation (shadow depth) */
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Card variant */
  variant?: 'default' | 'outlined';
  /** Hover effect */
  hoverable?: boolean;
  /** Border radius */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card component for containing content with theme-aware styling.
 *
 * @example
 * ```tsx
 * <Card>
 *   <h2>Card Title</h2>
 *   <p>Card content goes here.</p>
 * </Card>
 *
 * <Card variant="outlined" padding="lg" elevation="md">
 *   <h3>Outlined Card</h3>
 * </Card>
 * ```
 */
export default function Card({
  children,
  padding = 'md',
  elevation = 'sm',
  variant = 'default',
  hoverable = false,
  borderRadius = 'md',
  className,
  ...props
}: CardProps) {
  const { theme } = useTheme();

  const paddingValue = padding === 'none' ? '0' : theme.spacing[padding];
  const shadowValue = elevation === 'none' ? 'none' : theme.shadows[elevation];
  const radiusValue = theme.borderRadius[borderRadius];

  const cardClass = css`
    background-color: ${variant === 'outlined' ? 'transparent' : theme.colors.background};
    border: ${variant === 'outlined' ? `1px solid ${theme.colors.border}` : 'none'};
    border-radius: ${radiusValue};
    padding: ${paddingValue};
    box-shadow: ${variant === 'outlined' ? 'none' : shadowValue};
    transition: all ${theme.transitions.normal};
    display: block;
    box-sizing: border-box;

    ${hoverable ? `
      cursor: pointer;

      &:hover {
        box-shadow: ${variant === 'outlined' ? theme.shadows.sm : theme.shadows.lg};
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }
    ` : ''}
  `;

  return (
    <div className={`${cardClass} ${className || ''}`} {...props}>
      {children}
    </div>
  );
}
