import { css } from "goober";
import { useTheme } from "../../theme";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button contents */
  label: string;
  /** Button variant */
  variant?: "primary" | "secondary";
}

/**
 * Button component with theme-aware styling.
 *
 * @example
 * ```tsx
 * <Button label="Click me" onClick={() => console.log('clicked')} />
 * <Button label="Secondary" variant="secondary" onClick={() => {}} />
 * ```
 */
export default function Button({ label, variant = "primary", ...props }: ButtonProps) {
  const { theme } = useTheme();

  const isPrimary = variant === "primary";

  return (
    <button
      className={css`
        border-radius: ${theme.borderRadius.sm};
        border: none;
        font-size: ${theme.typography.fontSize.sm};
        font-family: ${theme.typography.fontFamily};
        font-weight: ${theme.typography.fontWeight.medium};
        color: ${isPrimary ? theme.colors.textInverse : theme.colors.textPrimary};
        padding: ${theme.spacing.sm} ${theme.spacing.lg};
        display: inline-block;
        background-color: ${isPrimary ? theme.colors.primary : theme.colors.secondary};
        cursor: pointer;
        transition: all ${theme.transitions.fast};

        &:hover {
          background-color: ${isPrimary ? theme.colors.primaryHover : theme.colors.secondaryHover};
          box-shadow: ${theme.shadows.md};
        }

        &:active {
          background-color: ${isPrimary ? theme.colors.primaryActive : theme.colors.secondaryHover};
          box-shadow: ${theme.shadows.sm};
        }

        &:disabled {
          background-color: ${theme.colors.surfaceHover};
          color: ${theme.colors.textDisabled};
          cursor: not-allowed;
          box-shadow: none;
        }
      `}
      {...props}
    >
      {label}
    </button>
  );
}
